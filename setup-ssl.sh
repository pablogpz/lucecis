#!/bin/bash

# SSL Certificate Setup Script using Let's Encrypt
# Run this after the main deployment

set -e

echo "🔒 Setting up SSL certificates..."

# Configuration
APP_NAME="lucecis"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if domain is provided
if [ -z "$1" ]; then
    print_error "Usage: ./setup-ssl.sh YOUR_DDNS_DOMAIN"
    exit 1
fi

DOMAIN=$1

# Install certbot
print_status "Installing Certbot..."
sudo apt install -y certbot python3-certbot-nginx

# Stop nginx temporarily
sudo systemctl stop nginx

# Obtain certificate
print_status "Obtaining SSL certificate for $DOMAIN..."
sudo certbot certonly --standalone -d "$DOMAIN"

# Update nginx configuration with real certificate paths
print_status "Updating Nginx configuration..."
sudo sed -i "s|YOUR_DDNS_DOMAIN|$DOMAIN|g" /etc/nginx/sites-available/"$APP_NAME"
sudo sed -i "s|/etc/ssl/certs/your_cert.pem|/etc/letsencrypt/live/$DOMAIN/fullchain.pem|g" /etc/nginx/sites-available/"$APP_NAME"
sudo sed -i "s|/etc/ssl/private/your_key.pem|/etc/letsencrypt/live/$DOMAIN/privkey.pem|g" /etc/nginx/sites-available/"$APP_NAME"

# Test nginx configuration
if sudo nginx -t; then
    print_status "Nginx configuration is valid"
    sudo systemctl start nginx
    sudo systemctl enable nginx
else
    print_error "Nginx configuration is invalid"
    exit 1
fi

# Setup auto-renewal
print_status "Setting up certificate auto-renewal..."
echo "0 12 * * * /usr/bin/certbot renew --quiet && systemctl reload nginx" | sudo crontab -

print_status "SSL setup completed!"
print_status "Your app will be available at: https://$DOMAIN/$APP_NAME"
