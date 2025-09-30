# Lucecis - Monitoring and Grafana Setup

## Overview

- **Grafana** - Beautiful dashboards and visualization
- **Prometheus** - Time-series database and metrics collection
- **Node Exporter** - System metrics (CPU, RAM, disk, network)
- **Loki** - Log aggregation system
- **Promtail** - Log collection agent
- **Blackbox Exporter** - HTTP/HTTPS endpoint monitoring for health checks
- **Custom App Metrics** - WebSocket connections, Home Assistant status
- **Alert Rules** - Automated monitoring and notifications

## Architecture

```
Raspberry Pi 5
├── Grafana (port 9000) - Dashboards, visualization, and alerting
├── Prometheus (port 9090) - Metrics database
├── Node Exporter (port 9100) - System metrics
├── Loki (port 9095) - Log aggregation
├── Promtail (port 9105) - Log collection
├── Blackbox Exporter (port 9110) - Health check monitoring
└── Lucecis Metrics Server (port 3020) - App metrics
     ├── /metrics - Exposes custom metrics
     └── /health - Health check endpoint
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

3. **Pre-configured dashboards, data sources, and alert rules are imported automatically**

## Lucecis Overview Dashboard

### ROW 1. System Overview

- CPU, Memory, Disk usage
- Network traffic
- System temperature

### ROW 2. Lucecis App Metrics

- App uptime
- WebSocket connections count
- Light command rates
- Message rates (sent/received)
- Real-time system health
- App logs
- PM2 logs

### ROW 3. Home Assistant Integration

- Home Assistant connection status
- Presence detection status
- Do Not Disturb status
- API call rates

### ROW 4. Logs Overview

- NGINX access and error logs
- Error rates
- Suspicious activity detection

## Alert Rules

The system includes automated alert rules for monitoring critical aspects of Lucecis:

### Connectivity Alerts

- **HA Connection Status**: Monitors the WebSocket connection to Home Assistant
    - Triggers when connection is lost for more than 3 minutes
    - Indicates potential issues with HA API or network connectivity

- **Lucecis WSS Health**: Monitors the WebSocket server health endpoint
    - Triggers when health checks fail for more than 3 minutes
    - Indicates server or application issues

- **Lucecis App Health**: Monitors the Next.js application health endpoint
    - Triggers when app health checks fail for more than 3 minutes
    - Indicates frontend application issues

### Security Alerts

- **Lucecis Intrusion Detection**: Monitors NGINX access logs for foreign IP addresses
    - Triggers when non-local IP addresses access the system
    - Excludes local network ranges (192.168.5.x, 192.168.6.x) and known safe IPs
    - Fires for 12 hours to ensure immediate attention

All alert rules are stored in the `alerts/` directory and automatically imported during setup.

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
- `/etc/blackbox_exporter/blackbox.yml` - Blackbox Exporter configuration
- `/etc/systemd/system/blackbox_exporter.service` - Blackbox Exporter service
- `/etc/loki/loki.yml` - Loki configuration
- `/etc/systemd/system/loki.service` - Loki service
- `/etc/systemd/system/promtail.service` - Promtail service
- `/etc/grafana/grafana.ini` - Grafana configuration

```bash
# Check service status
sudo systemctl status prometheus
sudo systemctl status node_exporter
sudo systemctl status loki
sudo systemctl status promtail
sudo systemctl status blackbox_exporter
sudo systemctl status grafana-server

# View logs
sudo journalctl -u prometheus -f
sudo journalctl -u node_exporter -f
sudo journalctl -u loki -f
sudo journalctl -u promtail -f
sudo journalctl -u blackbox_exporter -f
sudo journalctl -u grafana-server -f

# Restart services
sudo systemctl restart prometheus
sudo systemctl restart node_exporter
sudo systemctl restart loki
sudo systemctl restart promtail
sudo systemctl restart blackbox_exporter
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
    - `lucecis-overview.json`

## Manual Alert Rules Import

If alert rules don't import automatically:

1. Go to Grafana → Alerting → Alert Rules
2. Click "Import" or "New Rule"
3. Upload the JSON files from `alerts/` directory:
    - `lucecis-connectivity.json` - Health and connectivity monitoring
    - `lucecis-security.json` - Security and intrusion detection

## Alert Configuration

To receive notifications:

1. Go to Grafana → Alerting → Contact Points
2. Configure your preferred notification method (email, Slack, webhook, etc.)
3. Create a notification policy to route alerts to your contact point
4. The alert rules reference a receiver named "pablogpz" - update this to match your contact point name

## File Structure

```
lucecis/
├── alerts/                     # Alert rule definitions
│   ├── lucecis-connectivity.json
│   └── lucecis-security.json
├── dashboards/                 # Dashboard definitions
│   └── lucecis-overview.json
├── setup-grafana.py           # Automated Grafana setup script
└── setup-monitoring.sh        # Monitoring stack setup script
```
