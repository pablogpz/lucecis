import http from 'node:http'
import { getPrometheusMetrics, updateMetric } from './metrics'

const startTime = Date.now();

export const metricsServer = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/metrics') {
        // Update uptime
        updateMetric('uptime_seconds', Math.floor((Date.now() - startTime) / 1000));

        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(getPrometheusMetrics());
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});