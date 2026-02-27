#!/bin/bash

# Spawn the actual setup as a detached process and exit immediately
# This prevents KillerCoda from timing out on long-running background scripts

nohup bash -c '
exec > /var/log/setup.log 2>&1
set +e

echo "=== Background setup started at $(date) ==="

# Install nginx (so CrowdSec auto-detects it)
echo "Installing nginx..."
apt-get update -qq
apt-get install -y nginx

# Add CrowdSec repo and install
echo "Installing CrowdSec..."
curl -s https://install.crowdsec.net | bash
apt-get install -y crowdsec

# Ensure collections are installed
echo "Installing collections..."
cscli collections install crowdsecurity/linux
cscli collections install crowdsecurity/nginx

# Install Node.js 20.x
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node --version
npm --version

# Clone and build the GUI
echo "Setting up Log Replay GUI..."
mkdir -p /root/cs-log-replay-gui
cd /root/cs-log-replay-gui
git clone https://github.com/crowdsecurity/cs-log-replay-gui.git ./
npm install
npm run build

# Start the server
echo "Starting server..."
NODE_ENV=production nohup npm start > /var/log/log-replay-gui.log 2>&1 &

# Wait for server
for i in {1..30}; do
    curl -s http://localhost:3000/api/health > /dev/null 2>&1 && break
    sleep 1
done

touch /tmp/.setup-complete
echo "=== Setup Complete ==="
' &

# Exit immediately so KillerCoda sees success
exit 0
