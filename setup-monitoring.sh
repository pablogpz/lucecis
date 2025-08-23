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

# Set permissions
sudo chown prometheus:prometheus /etc/prometheus/prometheus.yml

# Enable and start services
print_status "🔄 Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable prometheus
sudo systemctl enable node_exporter
sudo systemctl enable grafana-server

sudo systemctl start node_exporter
sudo systemctl start prometheus
sudo systemctl start grafana-server

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
