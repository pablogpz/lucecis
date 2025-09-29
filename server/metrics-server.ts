import http from 'node:http'
import { getPrometheusMetrics, updateMetric } from './metrics'

const startTime = Date.now();

export const metricsServer = http.createServer((req, res) => {
    const METRICS_ENDPOINT = 'metrics'
    const HEALTH_CHECK_ENDPOINT = 'health'

    if (req.method === 'GET' && req.url === `/${METRICS_ENDPOINT}`) {
        // Update uptime
        updateMetric('uptime_seconds', Math.floor((Date.now() - startTime) / 1000));

        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(getPrometheusMetrics());
    } else if (req.method === 'GET' && req.url === `/${HEALTH_CHECK_ENDPOINT}`) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});