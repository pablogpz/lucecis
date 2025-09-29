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
    const PROMETHEUS_KEY = 'lucecis';

    const prometheusMetrics = Object.entries(metrics)
        .map(([key, value]) => `${PROMETHEUS_KEY}_${key} ${value}`)
        .join('\n');

    return `# HELP lucecis metrics for the Lucecis home automation app
# TYPE ${PROMETHEUS_KEY}_websocket_connections gauge
# TYPE ${PROMETHEUS_KEY}_websocket_messages_sent counter
# TYPE ${PROMETHEUS_KEY}_websocket_messages_received counter
# TYPE ${PROMETHEUS_KEY}_homeassistant_api_calls counter
# TYPE ${PROMETHEUS_KEY}_homeassistant_connection_status gauge
# TYPE ${PROMETHEUS_KEY}_presence_status gauge
# TYPE ${PROMETHEUS_KEY}_light_commands_sent counter
# TYPE ${PROMETHEUS_KEY}_uptime_seconds counter
# TYPE ${PROMETHEUS_KEY}_last_light_command_timestamp gauge
# TYPE ${PROMETHEUS_KEY}_do_not_disturb_active gauge
${prometheusMetrics}`;
}
