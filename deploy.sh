#!/bin/bash

# Lucecis Deployment Script for Raspberry Pi 5
# This script automates the deployment process

set -e

echo "🚀 Starting Lucecis deployment..."

# Configuration
APP_NAME="lucecis"
SERVICE_USER="pi"
APP_DIR="/home/$SERVICE_USER/$APP_NAME"
NGINX_CONF="/etc/nginx/sites-available/$APP_NAME"

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

# Check if running as pi user
if [ "$USER" != "$SERVICE_USER" ]; then
    print_error "This script should be run as the '$SERVICE_USER' user"
    exit 1
fi

# Update system packages
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 22.x LTS (if not already installed)
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" -lt "22" ]; then
    print_status "Installing Node.js 22.x LTS..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PM2 globally (if not already installed)
if ! command -v pm2 &> /dev/null; then
    print_status "Installing PM2..."
    sudo npm install -g pm2
fi

# Install Nginx (if not already installed)
if ! command -v nginx &> /dev/null; then
    print_status "Installing Nginx..."
    sudo apt install -y nginx
fi

# Create application directory
print_status "Setting up application directory..."
sudo mkdir -p $APP_DIR
sudo chown $SERVICE_USER:$SERVICE_USER $APP_DIR

# Navigate to app directory
cd $APP_DIR

# Install dependencies
print_status "Installing Node.js dependencies..."
npm install

# Build the application
print_status "Building Next.js application..."
npm run build

# Create .env.production file if it doesn't exist
if [ ! -f ".env.production" ]; then
    print_warning ".env.production file not found. Creating template..."
    cat > .env.production << EOF
# Home Assistant Configuration
HA_URL=home_assistant_url_here
HA_ACCESS_TOKEN=your_access_token_here

# WebSocket Server Configuration
WS_PORT=port_number_here
EOF
    print_warning "Please fill .env.production file"
fi

# Create log directory for PM2
sudo mkdir -p /var/log/pm2
sudo chown $SERVICE_USER:$SERVICE_USER /var/log/pm2

# Setup PM2 startup script
print_status "Setting up PM2 startup..."
# It prints the next command for you to run manually and exits with code 1, so we ignore errors here
pm2 startup systemd -u $SERVICE_USER --hp /home/$SERVICE_USER || true
sudo env PATH="$PATH":/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $SERVICE_USER --hp /home/$SERVICE_USER

# Copy and configure Nginx
print_status "Configuring Nginx..."
if [ -f "$NGINX_CONF" ]; then
    print_warning "nginx.conf already exists at $NGINX_CONF. Please review and update it manually if needed."
else
    sudo cp nginx.conf $NGINX_CONF
    print_status "Edit $NGINX_CONF to change placeholder values"
fi

# Enable the site
sudo ln -sf $NGINX_CONF /etc/nginx/sites-enabled/$APP_NAME

# Remove default Nginx site if it exists
sudo rm -f /etc/nginx/sites-enabled/default

# Setup firewall rules
print_status "Configuring firewall..."
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
#sudo ufw allow 3000/tcp (internal; optional)
#sudo ufw allow 8080/tcp (internal; optional)
sudo ufw --force enable

print_status "Deployment completed successfully!"
print_warning "Next steps:"
echo "1. Fill .env.production file"
echo "2. Update nginx.conf with your DDNS domain and girlfriend's IP"
echo "3. Configure port forwarding on your router (port 80 and 443)"
echo "4. Set up SSL certificates (recommended)"
echo "5. Start the application with: npm run pm2:start"
echo "6. Start Nginx with: sudo systemctl start nginx"
