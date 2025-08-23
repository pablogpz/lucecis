# Lucecis - Monitoring and Grafana Setup

## Overview

- **Grafana** - Beautiful dashboards and visualization
- **Prometheus** - Time-series database and metrics collection
- **Node Exporter** - System metrics (CPU, RAM, disk, network)
- **Custom App Metrics** - WebSocket connections, Home Assistant status

## Architecture

```
Raspberry Pi 5
├── Grafana (port 9000) - Dashboards
├── Prometheus (port 9090) - Metrics database
├── Node Exporter (port 9100) - System metrics
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

3. **Pre-configured dashboards are imported automatically**

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

All configuration files are automatically created by the setup script:

- `/etc/prometheus/prometheus.yml` - Prometheus configuration
- `/etc/systemd/system/prometheus.service` - Prometheus service
- `/etc/systemd/system/node_exporter.service` - Node Exporter service
- `/etc/grafana/grafana.ini` - Grafana configuration

```bash
# Check service status
sudo systemctl status prometheus
sudo systemctl status node_exporter
sudo systemctl status grafana-server

# View logs
sudo journalctl -u prometheus -f
sudo journalctl -u node_exporter -f
sudo journalctl -u grafana-server -f

# Restart services
sudo systemctl restart prometheus
sudo systemctl restart node_exporter
sudo systemctl restart grafana-server
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