# Lucecis - Deployment Guide for Raspberry Pi 5

## Prerequisites

- Raspberry Pi 5 with Home Assistant OS running
- DDNS domain configured and pointing to your public IP
- Router with port forwarding capabilities
- Users' residential IP addresses for whitelisting

## Network Architecture

```
Internet → Router (NAT/Port Forwarding) → Raspberry Pi 5
├── Home Assistant (port 8123)
├── Nginx Reverse Proxy (ports 80/443)
├── Next.js App (port 3000)
└── WebSocket Server (port 3010)
```

## Quick Deployment

1. **Transfer files to Raspberry Pi:**
   ```bash
   # From your development machine
   scp -r lucecis/ user@raspberry-pi-ip:/app_folder
   ```

2. **Run deployment script:**
   ```bash
   chmod +x deploy.sh setup-ssl.sh
   ./deploy.sh
   ```

3. **Configure environment:**
   ```bash
   nano .env
   # Add your Home Assistant URL and Long-Lived Access Token
   ```

4. **Update Nginx configuration:**
   ```bash
   sudo nano /etc/nginx/sites-available/lucecis
   # Replace YOUR_DDNS_DOMAIN with your actual domain
   # Replace XXX.XXX.XXX.XXX with your users' IP addresses
   ```

5. **Start services:**
   ```bash
   npm run pm2:start
   sudo systemctl start nginx
   sudo systemctl enable nginx
   ```

6. **Setup SSL (recommended):**
   ```bash
   ./setup-ssl.sh your-ddns-domain
   ```

7. **Configure router port forwarding:**
    - Forward port 80 → Raspberry Pi IP:80
    - Forward port 443 → Raspberry Pi IP:443

## Security Features

### IP Whitelisting

- Only your target users' IPs can access the application
- Configured in Nginx at both HTTP and HTTPS levels
- Easy to update when users' IP changes

### SSL/TLS Encryption

- Let's Encrypt certificates for HTTPS
- Automatic renewal configured
- Modern TLS configuration

### Isolated WebSocket Server

- Backend acts as middleman to Home Assistant
- No direct exposure of Home Assistant tokens
- Unauthenticated but IP-restricted frontend connection

### Do Not Disturb Mode

- Presence detection disabled during 1:00 AM - 9:00 AM
- Message handling blocked during quiet hours
- Protects against accidental activation

## Application URLs

- Main App: `https://your-domain/lucecis`
- WebSocket: `wss://your-domain/lucecis/ws` (handled automatically)

## Management Commands

```bash
# Application management
npm run pm2:start    # Start all processes
npm run pm2:stop     # Stop all processes
npm run pm2:restart  # Restart all processes
pm2 logs             # View logs
pm2 status           # Check status

# Nginx management
sudo systemctl restart nginx
sudo systemctl reload nginx
sudo nginx -t        # Test configuration

# Certificate renewal
sudo certbot renew
```

## Monitoring

```bash
# Check application logs
pm2 logs lucecis-nextjs
pm2 logs lucecis-websocket

# Check Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Check system resources
htop
df -h
free -h
```

## Troubleshooting

### App won't start

```bash
# Check logs
pm2 logs

# Verify environment
cat .env.production

# Test WebSocket server separately
npm run server
```

### Nginx issues

```bash
# Test configuration
sudo nginx -t

# Check if ports are in use
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
```

### SSL certificate issues

```bash
# Check certificate status
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal
```

### IP access issues

```bash
# Check current visitor IP
tail -f /var/log/nginx/access.log

# Update IP whitelist
sudo nano /etc/nginx/sites-available/lucecis
sudo nginx -t && sudo systemctl reload nginx
```

## Client Certificate Authentication (Optional)

For enhanced security instead of IP whitelisting:

1. **Generate client certificates:**
   ```bash
   # Create CA
   openssl genrsa -out ca.key 4096
   openssl req -new -x509 -days 365 -key ca.key -out ca.crt
   
   # Create client certificate
   openssl genrsa -out client.key 4096
   openssl req -new -key client.key -out client.csr
   openssl x509 -req -days 365 -in client.csr -CA ca.crt -CAkey ca.key -out client.crt
   ```

2. **Update Nginx configuration:**
   ```nginx
   ssl_client_certificate /etc/ssl/certs/ca.crt;
   ssl_verify_client on;
   ```

3. **Install client certificate on girlfriend's device**

## Updates and Maintenance

```bash
# Update application
cd app_folder
git pull  # if using git
npm install
npm run build
npm run pm2:restart

# Update system
sudo apt update && sudo apt upgrade

# Backup configuration
tar -czf lucecis-backup-$(date +%Y%m%d).tar.gz /app_folder
```
