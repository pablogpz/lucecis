import { WebSocket, WebSocketServer } from 'ws';
import {
    callService,
    Connection,
    createConnection,
    createLongLivedTokenAuth,
    getStates,
    HassEntity
} from 'home-assistant-js-websocket';
import dotenv from 'dotenv';
import { incrementMetric, updateMetric } from './metrics';
import { metricsServer } from './metrics-server'

// Disable SSL verification for self-signed certificates
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

// Load environment variables from .env file
dotenv.config({ path: `.env${process.env.NODE_ENV === 'production' ? '.production' : '.development'}` });

// Configuration
const HA_URL = process.env.HA_URL || 'http://localhost:8123';
const ACCESS_TOKEN = process.env.HA_ACCESS_TOKEN || '';
const WS_HOST = process.env.NEXT_PUBLIC_WS_HOST ? process.env.WS_HOST : '::';
const WS_PORT = process.env.NEXT_PUBLIC_WS_PORT ? parseInt(process.env.NEXT_PUBLIC_WS_PORT) : 3010;
const METRICS_PORT = process.env.METRICS_PORT ? parseInt(process.env.METRICS_PORT) : 3020;
// Do Not Disturb configuration (quiet hours: 1:00 AM to 9:00 AM)
const DND_START_HOUR = 1;  // 1:00 AM
const DND_END_HOUR = 9;    // 9:00 AM

// Entity IDs
const LIGHT_ENTITIES = [
    'light.hue_play_left',
    'light.hue_play_right',
    'light.hue_go'
];
const PRESENCE_ENTITY = 'binary_sensor.pablo_in_bedroom';
const LIGHT_GROUP = 'light.better_dormitorio_group';
const LIGHT_EFFECT_SCRIPT = 'script.light_effect_activator';

interface LightState {
    entity_id: string;
    state: string;
    attributes: {
        brightness?: number;
        rgb_color?: [number, number, number];
        [key: string]: any;
    };
}

interface PresenceState {
    entity_id: string;
    state: string;
    attributes: {
        [key: string]: any;
    };
}

interface ScriptState {
    entity_id: string;
    state: string;
    attributes: {
        [key: string]: any;
    };
}

interface ServerMessage {
    type: 'light_update' | 'presence_update' | 'connection_status' | 'activator_status' | 'error';
    data?: any;
    error?: string;
}

interface ClientMessage {
    type: 'action' | 'subscribe';
    action?: 'toggle' | 'color' | 'strobe' | 'effect';
    data?: {
        isIndividualMode?: boolean;
        rgb_color?: [number, number, number];
        brightness?: number;
        individualLights?: {
            entity_id: string;
            rgb_color: [number, number, number];
            brightness: number;
        }[];
        effect_name?: string;
        duration?: number; // in seconds
    };
}

class LightControlServer {
    private readonly wss: WebSocketServer;
    private haConnection: Connection | null = null;
    private clients: Set<WebSocket> = new Set();
    private currentLightStates: Map<string, LightState> = new Map();
    private presenceState: PresenceState | null = null;
    private activatorScriptState: ScriptState | null = null;
    private actualPresenceState: boolean = false; // Store the real presence state

    constructor() {
        this.wss = new WebSocketServer({ host: WS_HOST, port: WS_PORT, path: '/lucecis/ws' });
        this.setupWebSocketServer();
        this.connectToHomeAssistant();
    }

    public async shutdown() {
        console.log('Shutting down WebSocket server...');

        // Close all client connections
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.close(1000, 'Server shutting down');
            }
        });
        this.clients.clear();

        // Close WebSocket server
        if (this.wss) {
            this.wss.close();
        }

        // Close Home Assistant connection
        if (this.haConnection) {
            try {
                this.haConnection.close();
            } catch (error) {
                console.error('Error closing Home Assistant connection:', error);
            }
        }

        console.log('WebSocket server shut down complete');
    }

    private setupWebSocketServer() {
        this.wss.on('connection', (ws: WebSocket) => {
            console.log('Client connected');
            this.clients.add(ws);

            // Send current states to new client
            this.sendCurrentStates(ws);

            ws.on('message', (message: string) => {
                let data: ClientMessage | undefined = undefined;
                try {
                    data = JSON.parse(message);
                } catch (error) {
                    console.error('Error parsing message:', error);
                    this.sendError(ws, 'Invalid message format');
                    return;
                }

                if (data) {
                    this.handleClientMessage(ws, data!);
                }

                incrementMetric('websocket_messages_received');
            });

            ws.on('close', () => {
                console.log('Client disconnected');
                this.clients.delete(ws);
                updateMetric('websocket_connections', this.clients.size);
            });

            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.clients.delete(ws);
                updateMetric('websocket_connections', this.clients.size);
            });

            updateMetric('websocket_connections', this.clients.size);
        });

        console.log(`WebSocket server listening on ${WS_HOST}:${WS_PORT}`);
    }

    private async connectToHomeAssistant() {
        try {
            if (!ACCESS_TOKEN) {
                throw new Error('HA_ACCESS_TOKEN environment variable is required');
            }

            const auth = createLongLivedTokenAuth(HA_URL, ACCESS_TOKEN);
            this.haConnection = await createConnection({ auth });
            this.broadcastConnectionStatus(true);

            console.log('Connected to Home Assistant');
            updateMetric('homeassistant_connection_status', 1);

            // Get initial states
            await this.getInitialStates();

            // Subscribe to entity changes
            await this.subscribeToEntityChanges();

            this.haConnection.addEventListener('ready', () => {
                this.broadcastConnectionStatus(true);
                console.log('Reconnected to Home Assistant');
                updateMetric('homeassistant_connection_status', 1);
            });

            this.haConnection.addEventListener('disconnected', () => {
                this.broadcastConnectionStatus(false);
                console.log('Disconnected from Home Assistant');
                updateMetric('homeassistant_connection_status', 0);
            });

        } catch (error) {
            this.broadcastConnectionStatus(false);
            console.error('Failed to connect to Home Assistant:', error);
            updateMetric('homeassistant_connection_status', 0);
        }
    }

    private async getInitialStates() {
        if (!this.haConnection) {
            throw new Error('Not connected to Home Assistant');
        }

        try {
            const states = await getStates(this.haConnection);

            // Get light entity states
            for (const entityId of LIGHT_ENTITIES) {
                const state = states.find(s => s.entity_id === entityId);
                if (state) {
                    this.updateLightState(state);
                }
            }

            // Get presence entity state
            const presenceState = states.find(s => s.entity_id === PRESENCE_ENTITY);
            if (presenceState) {
                this.updatePresenceState(presenceState);
            }

            // Get script entity state
            const scriptState = states.find(s => s.entity_id === LIGHT_EFFECT_SCRIPT);
            if (scriptState) {
                this.updateActivatorScriptState(scriptState);
            }
        } catch (error) {
            console.error('Error getting initial states:', error);
        }
    }

    private async subscribeToEntityChanges() {
        if (!this.haConnection) {
            throw new Error('Not connected to Home Assistant');
        }

        // Subscribe to light entities
        for (const entityId of LIGHT_ENTITIES) {
            try {
                this.haConnection.addEventListener("disconnected",
                    await this.haConnection.subscribeMessage((message: any) => {
                        if (message.variables && message.variables.trigger && message.variables.trigger.to_state) {
                            this.updateLightState(message.variables.trigger.to_state);
                        }
                    }, {
                        type: "subscribe_trigger",
                        trigger: {
                            platform: "state",
                            entity_id: entityId,
                        }
                    }));
            } catch (error) {
                console.error(`Error subscribing to ${entityId}:`, error);
            }
        }

        // Subscribe to presence entity
        try {
            this.haConnection.addEventListener("disconnected",
                await this.haConnection.subscribeMessage((message: any) => {
                    if (message.variables && message.variables.trigger && message.variables.trigger.to_state) {
                        this.updatePresenceState(message.variables.trigger.to_state);
                    }
                }, {
                    type: "subscribe_trigger",
                    trigger: {
                        platform: "state",
                        entity_id: PRESENCE_ENTITY,
                    }
                }));
        } catch (error) {
            console.error(`Error subscribing to ${PRESENCE_ENTITY}:`, error);
        }

        // Subscribe to script state changes
        try {
            this.haConnection.addEventListener("disconnected",
                await this.haConnection.subscribeMessage((message: any) => {
                    if (message.variables && message.variables.trigger && message.variables.trigger.to_state) {
                        this.updateActivatorScriptState(message.variables.trigger.to_state);
                    }
                }, {
                    type: "subscribe_trigger",
                    trigger: {
                        platform: "state",
                        entity_id: LIGHT_EFFECT_SCRIPT,
                    }
                }));
        } catch (error) {
            console.error(`Error subscribing to ${LIGHT_EFFECT_SCRIPT}:`, error);
        }
    }

    private updateLightState(hassEntity: HassEntity) {
        const lightState: LightState = {
            entity_id: hassEntity.entity_id,
            state: hassEntity.state,
            attributes: hassEntity.attributes
        };

        this.currentLightStates.set(hassEntity.entity_id, lightState);
        this.broadcastLightState(lightState);
    }

    private updatePresenceState(hassEntity: HassEntity) {
        const presenceState: PresenceState = {
            entity_id: hassEntity.entity_id,
            state: hassEntity.state,
            attributes: hassEntity.attributes
        };

        this.presenceState = presenceState;
        this.actualPresenceState = presenceState.state === 'on';

        // Update metrics
        updateMetric('presence_status', this.actualPresenceState ? 1 : 0);

        // Use effective presence state that considers DND
        const effectivePresence = this.getEffectivePresenceState();
        this.broadcastPresence(effectivePresence);
    }

    private updateActivatorScriptState(hassEntity: HassEntity) {
        const scriptState: ScriptState = {
            entity_id: hassEntity.entity_id,
            state: hassEntity.state,
            attributes: hassEntity.attributes
        };

        this.activatorScriptState = scriptState;
        this.broadcastActivatorScriptState(scriptState);
    }

    private async handleClientMessage(ws: WebSocket, message: ClientMessage) {
        try {
            switch (message.type) {
                case 'action':
                    // Block light actions during Do Not Disturb hours
                    if (this.isDoNotDisturbTime()) {
                        console.log(`Blocking light action during Do Not Disturb hours (${DND_START_HOUR}:00-${DND_END_HOUR}:00)`);
                        this.sendError(ws, 'Actions are not allowed during quiet hours (1:00 AM - 9:00 AM)');
                        return;
                    }
                    await this.handleLightAction(message);
                    break;
                case 'subscribe':
                    // Client wants to subscribe - send current states (always allowed)
                    this.sendCurrentStates(ws);
                    break;
                default:
                    this.sendError(ws, 'Unknown message type');
            }
        } catch (error) {
            console.error('Error handling client message:', error);
            this.sendError(ws, 'Failed to process action');
        }
    }

    private async handleLightAction(message: ClientMessage) {
        if (!this.haConnection) {
            throw new Error('Not connected to Home Assistant');
        }

        // Track light commands and update timestamp
        incrementMetric('light_commands_sent');
        updateMetric('last_light_command_timestamp', Date.now());
        incrementMetric('homeassistant_api_calls');

        switch (message.action) {
            case 'toggle':
                await callService(
                    this.haConnection,
                    'light',
                    'toggle',
                    undefined,
                    { entity_id: LIGHT_GROUP },
                    false
                );
                break;

            case 'color':
                if (message.data?.isIndividualMode && message.data?.individualLights) {
                    // Individual light control mode - send commands to each light separately
                    for (const lightConfig of message.data.individualLights) {
                        await callService(
                            this.haConnection,
                            'light',
                            'turn_on',
                            {
                                rgb_color: lightConfig.rgb_color,
                                brightness: lightConfig.brightness
                            },
                            { entity_id: lightConfig.entity_id },
                            false
                        );
                    }
                } else if (message.data?.rgb_color) {
                    // Group control mode (existing behavior)
                    await callService(
                        this.haConnection,
                        'light',
                        'turn_on',
                        {
                            rgb_color: message.data.rgb_color,
                            brightness: message.data.brightness || 255
                        },
                        { entity_id: LIGHT_GROUP },
                        false
                    );
                }
                break;

            case 'strobe':
                await callService(
                    this.haConnection,
                    'script',
                    'turn_on',
                    {
                        variables: {
                            effect_name: 'strobe',
                            duration: {
                                hours: 0,
                                minutes: 0,
                                seconds: message.data?.duration || 15,
                                milliseconds: 0
                            }
                        }
                    },
                    { entity_id: LIGHT_EFFECT_SCRIPT },
                    false
                );
                break;

            case 'effect':
                if (message.data?.effect_name) {
                    await callService(
                        this.haConnection,
                        'script',
                        'turn_on',
                        {
                            variables: {
                                effect_name: message.data.effect_name,
                                duration: {
                                    hours: 0,
                                    minutes: 0,
                                    seconds: message.data?.duration || 15,
                                    milliseconds: 0
                                }
                            }
                        },
                        { entity_id: LIGHT_EFFECT_SCRIPT },
                        false
                    );
                }
                break;

            default:
                throw new Error('Unknown action type');
        }
    }

    private sendCurrentStates(ws: WebSocket) {
        const states = Array.from(this.currentLightStates.values());
        this.sendMessage(ws, {
            type: 'light_update',
            data: states
        });

        // Also send effective presence state (considering DND)
        if (this.presenceState) {
            const effectivePresence = this.getEffectivePresenceState();
            this.sendMessage(ws, {
                type: 'presence_update',
                data: { isPresent: effectivePresence }
            });
        }

        // Also send connection status
        this.sendMessage(ws, {
            type: 'connection_status',
            data: { connected: this.haConnection?.socket?.readyState === WebSocket.OPEN }
        });

        // Also send script state if available
        if (this.activatorScriptState) {
            this.sendMessage(ws, {
                type: 'activator_status',
                data: this.activatorScriptState.state === 'on' ? { isActive: true } : { isActive: false }
            });
        }
    }

    private broadcastLightState(lightState: LightState) {
        this.broadcast({
            type: 'light_update',
            data: [lightState]
        });
    }

    private broadcastPresence(isPresent: boolean) {
        this.broadcast({
            type: 'presence_update',
            data: { isPresent }
        });
    }

    private broadcastConnectionStatus(connected: boolean) {
        this.broadcast({
            type: 'connection_status',
            data: { connected }
        });
    }

    private broadcastActivatorScriptState(scriptState: ScriptState) {
        this.broadcast({
            type: 'activator_status',
            data: scriptState.state === 'on' ? { isActive: true } : { isActive: false }
        });
    }

    private sendError(ws: WebSocket, error: string) {
        this.sendMessage(ws, {
            type: 'error',
            error
        });
    }

    private sendMessage(ws: WebSocket, message: ServerMessage) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
            incrementMetric('websocket_messages_sent');
        }
    }

    private broadcast(message: ServerMessage) {
        const messageStr = JSON.stringify(message);
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageStr);
                incrementMetric('websocket_messages_sent');
            }
        });
    }

    /**
     * Check if current time is within Do Not Disturb hours (1:00 AM to 9:00 AM)
     */
    private isDoNotDisturbTime(): boolean {
        const now = new Date();
        const currentHour = now.getHours();

        // If DND_START_HOUR > DND_END_HOUR, it spans midnight (e.g., 1 AM to 9 AM)
        if (DND_START_HOUR > DND_END_HOUR) {
            return currentHour >= DND_START_HOUR || currentHour < DND_END_HOUR;
        } else {
            // If DND_START_HOUR <= DND_END_HOUR, it's within the same day
            return currentHour >= DND_START_HOUR && currentHour < DND_END_HOUR;
        }
    }

    /**
     * Get the effective presence state (considers Do Not Disturb)
     */
    private getEffectivePresenceState(): boolean {
        const isDNDActive = this.isDoNotDisturbTime();

        // Update DND metrics
        updateMetric('do_not_disturb_active', isDNDActive ? 1 : 0);

        if (isDNDActive) {
            console.log(`Do Not Disturb active (${DND_START_HOUR}:00-${DND_END_HOUR}:00), reporting absence`);
            return false; // Always report as absent during DND hours
        }
        return this.actualPresenceState;
    }
}

// Start the WebSocket server
const server = new LightControlServer();
// Start the metrics HTTP server
metricsServer.listen(METRICS_PORT, () => {
    console.log(`Metrics HTTP server listening on port ${METRICS_PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Received SIGINT signal, shutting down gracefully...');
    metricsServer.close();
    await server.shutdown();
    process.exit(0);
});
