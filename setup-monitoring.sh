#!/bin/bash

# Lucecis Monitoring Setup Script
# This script installs and configures Grafana + Prometheus monitoring stack

set -e

# Configuration
APP_FOLDER=/home/pi/lucecis

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_status "🚀 Setting up monitoring stack for Lucecis..."

# Update system
print_status "📦 Updating system packages..."
sudo apt update

# Install required packages
print_status "📦 Installing required packages..."
sudo apt install -y wget curl

# Create users
print_status "👤 Creating system users..."
sudo useradd --system --no-create-home --shell /bin/false prometheus || true
sudo useradd --system --no-create-home --shell /bin/false node_exporter || true
sudo useradd --system --no-create-home --shell /bin/false blackbox_exporter || true
sudo useradd --system --no-create-home --shell /bin/false loki || true
sudo useradd --system --no-create-home --shell /bin/false promtail || true
# Add promtail to adm group for log access
sudo usermod -aG adm promtail || true

# Install Prometheus
if ! command -v prometheus &> /dev/null; then
    print_status "📊 Installing Prometheus..."
    cd /tmp
    wget -q https://github.com/prometheus/prometheus/releases/download/v3.5.0/prometheus-3.5.0.linux-arm64.tar.gz
    tar xzf prometheus-3.5.0.linux-arm64.tar.gz

    sudo mv prometheus-3.5.0.linux-arm64/prometheus /usr/local/bin/
    sudo mv prometheus-3.5.0.linux-arm64/promtool /usr/local/bin/
    sudo chown prometheus:prometheus /usr/local/bin/prometheus
    sudo chown prometheus:prometheus /usr/local/bin/promtool

    # Create Prometheus directories
    sudo mkdir -p /etc/prometheus /var/lib/prometheus
    sudo chown -R prometheus:prometheus /etc/prometheus /var/lib/prometheus
else
    print_status "📊 Prometheus already installed, skipping..."
fi

# Install Node Exporter
if ! command -v node_exporter &> /dev/null; then
  print_status "🖥️ Installing Node Exporter..."
  wget -q https://github.com/prometheus/node_exporter/releases/download/v1.9.1/node_exporter-1.9.1.linux-arm64.tar.gz
  tar xzf node_exporter-1.9.1.linux-arm64.tar.gz
  sudo mv node_exporter-1.9.1.linux-arm64/node_exporter /usr/local/bin/
  sudo chown node_exporter:node_exporter /usr/local/bin/node_exporter
else
  print_status "🖥️ Node Exporter already installed, skipping..."
fi

# Install Loki
if ! command -v loki &> /dev/null; then
    print_status "📦 Installing Loki..."
    cd /tmp
    wget -q https://github.com/grafana/loki/releases/download/v3.5.3/loki-linux-arm64.zip
    unzip -q loki-linux-arm64.zip
    sudo mv loki-linux-arm64 /usr/local/bin/loki
    sudo chown loki:loki /usr/local/bin/loki

    # Create Loki directories
    sudo mkdir -p /etc/loki /var/lib/loki
    sudo chown -R loki:loki /etc/loki /var/lib/loki
else
    print_status "📦 Loki already installed, skipping..."
fi

# Install Promtail
if ! command -v promtail &> /dev/null; then
    print_status "📦 Installing Promtail..."
    wget -q https://github.com/grafana/loki/releases/download/v3.5.3/promtail-linux-arm64.zip
    unzip -q promtail-linux-arm64.zip
    sudo mv promtail-linux-arm64 /usr/local/bin/promtail
    sudo chown promtail:promtail /usr/local/bin/promtail

    # Create Promtail directories
    sudo mkdir -p /etc/promtail /var/lib/promtail
    sudo chown -R promtail:promtail /etc/promtail /var/lib/promtail
else
    print_status "📦 Promtail already installed, skipping..."
fi

# Install Blackbox Exporter
if ! command -v blackbox_exporter &> /dev/null; then
    print_status "🔍 Installing Blackbox Exporter..."
    cd /tmp
    wget -q https://github.com/prometheus/blackbox_exporter/releases/download/v0.27.0/blackbox_exporter-0.27.0.linux-arm64.tar.gz
    tar xzf blackbox_exporter-0.27.0.linux-arm64.tar.gz
    sudo mv blackbox_exporter-0.27.0.linux-arm64/blackbox_exporter /usr/local/bin/
    sudo chown blackbox_exporter:blackbox_exporter /usr/local/bin/blackbox_exporter

    # Create Blackbox Exporter directories
    sudo mkdir -p /etc/blackbox_exporter /var/lib/blackbox_exporter
    sudo chown -R blackbox_exporter:blackbox_exporter /etc/blackbox_exporter /var/lib/blackbox_exporter
else
    print_status "🔍 Blackbox Exporter already installed, skipping..."
fi

# Install Grafana
print_status "📈 Installing Grafana..."
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -
echo "deb https://packages.grafana.com/oss/deb stable main" | sudo tee /etc/apt/sources.list.d/grafana.list
sudo apt update
sudo apt install -y grafana

# Copy configuration files
print_status "⚙️ Setting up configuration files..."
cd $APP_FOLDER
sudo cp prometheus.yml /etc/prometheus/
sudo cp prometheus.service /etc/systemd/system/
sudo cp node_exporter.service /etc/systemd/system/
sudo cp grafana.ini /etc/grafana/
sudo cp loki.yml /etc/loki/
sudo cp loki.service /etc/systemd/system/
sudo cp promtail.yml /etc/promtail/
sudo cp promtail.service /etc/systemd/system/
sudo cp blackbox.yml /etc/blackbox_exporter/
sudo cp blackbox_exporter.service /etc/systemd/system/

# Set permissions
sudo chown prometheus:prometheus /etc/prometheus/prometheus.yml
sudo chown loki:loki /etc/loki/loki.yml
sudo chown promtail:promtail /etc/promtail/promtail.yml
sudo chown blackbox_exporter:blackbox_exporter /etc/blackbox_exporter/blackbox.yml

# Enable and start services
print_status "🔄 Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable prometheus
sudo systemctl enable node_exporter
sudo systemctl enable grafana-server
sudo systemctl enable loki
sudo systemctl enable promtail
sudo systemctl enable blackbox_exporter

sudo systemctl start node_exporter
sudo systemctl start prometheus
sudo systemctl start grafana-server
sudo systemctl start loki
sudo systemctl start promtail
sudo systemctl start blackbox_exporter

# Wait for services to start
print_status "⏳ Waiting for services to start..."
sleep 10

# Import Grafana dashboards
print_status "📊 Setting up Grafana dashboards..."
# Wait for Grafana to be ready
while ! curl -s http://localhost:9000 > /dev/null; do
    print_status "Waiting for Grafana to start..."
    sleep 5
done

# Configure Grafana data source and dashboards
python3 setup-grafana.py

# Add firewall rules
print_status "🛡️ Configuring firewall..."
sudo ufw allow 9000/tcp # Grafana Web UI
sudo ufw allow 9090/tcp # Prometheus Web UI
sudo ufw --force enable

echo ""
print_status "✅ Monitoring stack setup complete!"
echo ""
echo "🌐 Access URLs:"
echo "   Grafana: http://localhost:9000/grafana"
echo ""
echo "🔐 Grafana default login:"
echo "   Username: admin"
echo "   Password: admin"
echo "   (You'll be prompted to change this on first login)"
echo ""
echo "📊 Pre-configured dashboards:"
echo "   - System Overview"
echo "   - Lucecis App Metrics"
echo "   - Home Assistant Integration"
echo ""
echo "🔧 Service management:"
echo "   sudo systemctl status prometheus"
echo "   sudo systemctl status node_exporter"
echo "   sudo systemctl status grafana-server"
echo "   sudo systemctl status loki"
echo "   sudo systemctl status promtail"
echo "   sudo systemctl status blackbox_exporter"
