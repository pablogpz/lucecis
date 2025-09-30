'use client';

import { useEffect, useRef, useState } from 'react';

export interface LightState {
    id: string;
    color: string;
    brightness: number;
    isOn: boolean;
}

export interface AppState {
    lights: LightState[];
    isPresent: boolean;
    lastMessage?: string;
}

interface BackendLightState {
    entity_id: string;
    state: string;
    attributes: {
        brightness?: number;
        rgb_color?: [number, number, number];
        [key: string]: any;
    };
}

interface BackendMessage {
    type: 'light_update' | 'presence_update' | 'connection_status' | 'activator_status' | 'error';
    data?: BackendLightState[] | { isPresent: boolean } | { connected: boolean } | { isActive: boolean };
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
        }[];
        effect_name?: string;
        duration?: number;
    };
}

// Safety timeout for script state (generous 2 minutes)
const ACTIVATOR_TIMEOUT_MS = 90 * 1000; // 90 seconds

// Map Home Assistant entity IDs to our light IDs
const ENTITY_TO_LIGHT_ID = {
    'light.hue_go': 'center',
    'light.hue_play_left': 'left',
    'light.hue_play_right': 'right',
};
const LIGHT_ID_TO_ENTITY = {
    'left': 'light.hue_play_left',
    'center': 'light.hue_go',
    'right': 'light.hue_play_right'
};

// Messages for color effects
const COLOR_EFFECT_MESSAGES = [
    'Claro, por qué no?',
    'Sabia elección!',
    'Bonito color!',
    'En serio? ;-;'
]

export function useWebSocketConnection() {
    const [state, setState] = useState<AppState>({
        lights: [
            { id: 'center', color: '#000000', brightness: 0, isOn: false },
            { id: 'left', color: '#000000', brightness: 0, isOn: false },
            { id: 'right', color: '#000000', brightness: 0, isOn: false },
        ],
        isPresent: false,
    });

    const [isConnected, setIsConnected] = useState(false);
    const [message, setMessage] = useState<string>('');
    const [isActivatorActive, setIsActivatorActive] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const activatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const connect = () => {
        try {
            const wsPort = parseInt(process.env.NEXT_PUBLIC_WS_PORT || '3010');
            const wsUrl = `${process.env.NODE_ENV === 'production'
                ? `wss://${window.location.hostname}`
                : `ws://${process.env.NEXT_PUBLIC_WS_HOST || 'localhost'}:${wsPort}`}/lucecis/ws`;

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('Connected to backend WebSocket server');
                // Subscribe to state updates
                sendMessage({ type: 'subscribe' });
            };

            ws.onmessage = (event) => {
                try {
                    const message: BackendMessage = JSON.parse(event.data);
                    handleBackendMessage(message);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };

            ws.onclose = () => {
                setIsConnected(false);
                console.log('Disconnected from backend WebSocket server');
                // Attempt to reconnect after 3 seconds
                setTimeout(connect, 3000);
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                setIsConnected(false);
            };
        } catch (error) {
            console.error('Failed to connect to WebSocket:', error);
            setIsConnected(false);
        }
    };

    const handleBackendMessage = (message: BackendMessage) => {
        switch (message.type) {
            case 'light_update':
                if (Array.isArray(message.data)) {
                    updateLightStates(message.data as BackendLightState[]);
                }
                break;
            case 'presence_update':
                const presenceState = message.data as { isPresent: boolean };
                setState(prev => ({
                    ...prev,
                    isPresent: presenceState.isPresent,
                }));
                break;
            case 'connection_status':
                const statusState = message.data as { connected: boolean };
                setIsConnected(statusState.connected);
                break;
            case 'activator_status':
                const activatorState = message.data as { isActive: boolean };
                setIsActivatorActive(activatorState.isActive);

                // Reset timeout on script state change
                if (activatorTimeoutRef.current) {
                    clearTimeout(activatorTimeoutRef.current);
                }
                if (activatorState.isActive) {
                    // Set a timeout to deactivate the script state after a period
                    activatorTimeoutRef.current = setTimeout(() => {
                        setIsActivatorActive(false);
                    }, ACTIVATOR_TIMEOUT_MS);
                }
                break;
            case 'error':
                setMessage(`Error: ${message.error}`);
                console.error('Backend error:', message.error);
                break;
        }
    };

    const updateLightStates = (backendStates: BackendLightState[]) => {
        setState(prev => ({
            ...prev,
            lights: prev.lights.map(light => {
                const backendState = backendStates.find(
                    state =>
                        ENTITY_TO_LIGHT_ID[state.entity_id as keyof typeof ENTITY_TO_LIGHT_ID] === light.id
                );

                if (backendState) {
                    return {
                        ...light,
                        isOn: backendState.state === 'on',
                        brightness: backendState.attributes.brightness ?
                            backendState.attributes.brightness / 255 : light.brightness,
                        color: backendState.attributes.rgb_color ?
                            rgbToHex(backendState.attributes.rgb_color) : light.color
                    };
                }

                return light;
            })
        }));
    };

    const rgbToHex = (rgb: [number, number, number]): string => {
        const [r, g, b] = rgb;
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    };

    const hexToRgb = (hex: string): [number, number, number] => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : [255, 255, 255];
    };

    const sendMessage = (message: ClientMessage) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket not connected');
        }
    };

    const triggerEffect = (effectId: string, parameters: Record<string, any>) => {
        switch (effectId) {
            case 'interruptor':
                sendMessage({ type: 'action', action: 'toggle' });
                setMessage('Apagando las luses!');
                break;
            case 'color':
                if (parameters.isIndividualMode && parameters.individualColors) {
                    const individualLights = Object.entries(parameters.individualColors)
                        .map(([lightId, color]) => ({
                            entity_id: LIGHT_ID_TO_ENTITY[lightId as keyof typeof LIGHT_ID_TO_ENTITY],
                            rgb_color: hexToRgb(color as string),
                            brightness: Math.round(parameters.intensidad || 255)
                        }));

                    sendMessage({
                        type: 'action',
                        action: 'color',
                        data: {
                            isIndividualMode: true,
                            individualLights
                        }
                    });
                } else if (parameters.color && parameters.intensidad !== undefined) {
                    // Group control mode (existing behavior)
                    const rgb = hexToRgb(parameters.color);
                    const brightness = Math.round(parameters.intensidad);
                    sendMessage({
                        type: 'action',
                        action: 'color',
                        data: {
                            isIndividualMode: false,
                            rgb_color: rgb,
                            brightness
                        }
                    });
                }
                setMessage(COLOR_EFFECT_MESSAGES[Math.floor(Math.random() * 10) % COLOR_EFFECT_MESSAGES.length]);
                break;
            case 'parpadear':
                sendMessage({
                    type: 'action',
                    action: 'strobe',
                    data: { duration: parameters.duracion || 15 }
                });
                setMessage('😵‍💫'.repeat(parameters.duracion / 10 || 1));
                break;
            case 'efecto-luz':
                sendMessage({
                    type: 'action',
                    action: 'effect',
                    data: {
                        effect_name: parameters.efecto,
                        duration: parameters.duracion || 15
                    }
                });
                setMessage(COLOR_EFFECT_MESSAGES[Math.floor(Math.random() * 10) % COLOR_EFFECT_MESSAGES.length]);
                break;
        }
    };

    useEffect(() => {
        connect();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        state,
        isConnected,
        message,
        isActivatorActive,
        triggerEffect,
        clearMessage: () => setMessage(''),
    };
}
