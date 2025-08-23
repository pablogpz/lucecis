const PROMETHEUS_KEY = 'lucecis';

// Simple in-memory metrics store
export const metrics = {
    websocket_connections: 0,
    websocket_messages_sent: 0,
    websocket_messages_received: 0,
    homeassistant_api_calls: 0,
    homeassistant_connection_status: 0, // 0 = disconnected, 1 = connected
    presence_status: 0,                 // 0 = away, 1 = present
    light_commands_sent: 0,
    uptime_seconds: 0,
    last_light_command_timestamp: 0,
    do_not_disturb_active: 0,           // 0 = inactive, 1 = active
}

export function updateMetric(key: keyof typeof metrics, value: number) {
    metrics[key] = value;
}

export function incrementMetric(key: keyof typeof metrics) {
    metrics[key]++;
}

export function getPrometheusMetrics(): string {
    const prometheusMetrics = Object.entries(metrics)
        .map(([key, value]) => `${PROMETHEUS_KEY}_${key} ${value}`)
        .join('\n');

    return `# HELP lucecis metrics for the Lucecis home automation app
# TYPE lucecis_websocket_connections gauge
# TYPE lucecis_websocket_messages_sent counter
# TYPE lucecis_websocket_messages_received counter
# TYPE lucecis_homeassistant_api_calls counter
# TYPE lucecis_homeassistant_connection_status gauge
# TYPE lucecis_presence_status gauge
# TYPE lucecis_light_commands_sent counter
# TYPE lucecis_uptime_seconds counter
# TYPE lucecis_last_light_command_timestamp gauge
# TYPE lucecis_do_not_disturb_active gauge
${prometheusMetrics}`;
}
