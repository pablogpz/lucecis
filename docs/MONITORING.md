# Lucecis - Monitoring and Grafana Setup

## Overview

- **Grafana** - Beautiful dashboards and visualization
- **Prometheus** - Time-series database and metrics collection
- **Node Exporter** - System metrics (CPU, RAM, disk, network)
- **Loki** - Log aggregation system
- **Promtail** - Log collection agent
- **Custom App Metrics** - WebSocket connections, Home Assistant status

## Architecture

```
Raspberry Pi 5
├── Grafana (port 9000) - Dashboards and visualization
├── Prometheus (port 9090) - Metrics database
├── Node Exporter (port 9100) - System metrics
├── Loki (port 9095) - Log aggregation
├── Promtail (port 9105) - Log collection
└── Lucecis Metrics Server (port 3020) - App metrics
     └── /metrics - Exposes custom metrics
```

## Quick Setup

1. **Run monitoring setup script:**
   ```bash
   chmod +x setup-monitoring.sh
   ./setup-monitoring.sh
   ```

2. **Access Grafana:**
    - URL: `http://localhost:9000/grafana/`
    - Default login: admin/admin (change on first login)

3. **Pre-configured dashboards and data sources are imported automatically**

## Available Dashboards

### 1. System Overview

- CPU, Memory, Disk usage
- Network traffic
- System temperature
- Real-time system health

### 2. Lucecis App Metrics

- WebSocket connections count
- Message rates (sent/received)
- Home Assistant connection status
- Presence detection status
- Do Not Disturb status
- Light command rates
- App uptime

### 3. Home Assistant Integration

- Connection status over time
- API call rates
- Presence and DND correlation

### 4. Logs Overview

- PM2 logs
- Application logs (PM2 managed)
- NGINX access and error logs
- Log rates and error rates
- Real-time log streaming

## Data Sources

- **Prometheus** (http://localhost:9090) - Metrics
- **Loki** (http://localhost:9095) - Logs

## Log Collection

Promtail collects logs from:

- `/home/pi/.pm2/pm2.log` - PM2 logs
- `/home/pi/.pm2/logs/lucecis-*.log` - Application logs
- `/var/log/nginx/access.log` - NGINX access logs
- `/var/log/nginx/error.log` - NGINX error logs

All configuration files are automatically created by the setup script:

- `/etc/prometheus/prometheus.yml` - Prometheus configuration
- `/etc/systemd/system/prometheus.service` - Prometheus service
- `/etc/systemd/system/node_exporter.service` - Node Exporter service
- `/etc/loki/loki.yml` - Loki configuration
- `/etc/systemd/system/loki.service` - Loki service
- `/etc/systemd/system/promtail.service` - Promtail service
- `/etc/grafana/grafana.ini` - Grafana configuration

```bash
# Check service status
sudo systemctl status prometheus
sudo systemctl status node_exporter
sudo systemctl status grafana-server
sudo systemctl status loki
sudo systemctl status promtail

# View logs
sudo journalctl -u prometheus -f
sudo journalctl -u node_exporter -f
sudo journalctl -u grafana-server -f
sudo journalctl -u loki -f
sudo journalctl -u promtail -f

# Restart services
sudo systemctl restart prometheus
sudo systemctl restart node_exporter
sudo systemctl restart grafana-server
sudo systemctl restart loki
sudo systemctl restart promtail
```

## Troubleshooting

### Grafana not accessible

1. Check if Grafana service is running: `sudo systemctl status grafana-server`
2. Verify Nginx configuration includes `/grafana/` location
3. Check Grafana logs: `sudo journalctl -u grafana-server -f`

### No metrics data

1. Verify Prometheus is scraping: `http://localhost:9090/targets`
2. Check if metrics endpoint is working: `curl http://localhost:3020/metrics`
3. Restart Prometheus: `sudo systemctl restart prometheus`

### Dashboard not loading

1. Check if data source is configured correctly in Grafana
2. Verify Prometheus URL in Grafana: `http://localhost:9090`
3. Import dashboards manually if needed

## Manual Dashboard Import

If dashboards don't import automatically:

1. Go to Grafana → Dashboards → Import
2. Upload the JSON files from `dashboards/` directory:
    - `system-overview.json`
    - `lucecis-app.json`
    - `homeassistant.json`