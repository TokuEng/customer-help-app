#!/bin/bash
# Fix MeiliSearch Service on DigitalOcean Droplet
# Run this script on the MeiliSearch droplet: ssh root@147.182.245.91

echo "=== MeiliSearch Service Fix Script ==="
echo "Run this on the MeiliSearch droplet (147.182.245.91)"
echo

# Check current status
echo "1. Checking current MeiliSearch status..."
systemctl status meilisearch || echo "MeiliSearch service not found"
echo

# Check if MeiliSearch is installed
echo "2. Checking MeiliSearch installation..."
which meilisearch || echo "MeiliSearch binary not found"
echo

# Check if port 7700 is in use
echo "3. Checking port 7700..."
netstat -tlnp | grep 7700 || echo "Port 7700 not in use"
echo

# Check processes
echo "4. Checking MeiliSearch processes..."
ps aux | grep meilisearch | grep -v grep || echo "No MeiliSearch processes running"
echo

echo "=== FIX COMMANDS ==="
echo "Run these commands on the MeiliSearch droplet:"
echo

echo "# 1. Install MeiliSearch if not installed"
echo "curl -L https://install.meilisearch.com | sh"
echo "sudo mv meilisearch /usr/local/bin/"
echo "sudo chmod +x /usr/local/bin/meilisearch"
echo

echo "# 2. Create MeiliSearch user and directories"
echo "sudo useradd -r -s /bin/false meilisearch || true"
echo "sudo mkdir -p /var/lib/meilisearch"
echo "sudo mkdir -p /etc/meilisearch"
echo "sudo chown meilisearch:meilisearch /var/lib/meilisearch"
echo

echo "# 3. Create configuration file"
echo "sudo tee /etc/meilisearch/meilisearch.toml > /dev/null <<EOF"
echo "# MeiliSearch Configuration"
echo "db_path = \"/var/lib/meilisearch\""
echo "http_addr = \"0.0.0.0:7700\""
echo "master_key = \"NzEzYTdkNjQ0N2FiYjFkODg0NzdjNzNk\""
echo "no_analytics = true"
echo "log_level = \"INFO\""
echo "EOF"
echo

echo "# 4. Create systemd service"
echo "sudo tee /etc/systemd/system/meilisearch.service > /dev/null <<EOF"
echo "[Unit]"
echo "Description=MeiliSearch"
echo "After=network.target"
echo "StartLimitIntervalSec=60"
echo "StartLimitBurst=3"
echo ""
echo "[Service]"
echo "Type=simple"
echo "User=meilisearch"
echo "Group=meilisearch"
echo "ExecStart=/usr/local/bin/meilisearch --config-file-path /etc/meilisearch/meilisearch.toml"
echo "Restart=on-failure"
echo "RestartSec=1"
echo "StandardOutput=syslog"
echo "StandardError=syslog"
echo "SyslogIdentifier=meilisearch"
echo ""
echo "[Install]"
echo "WantedBy=multi-user.target"
echo "EOF"
echo

echo "# 5. Start and enable the service"
echo "sudo systemctl daemon-reload"
echo "sudo systemctl enable meilisearch"
echo "sudo systemctl start meilisearch"
echo

echo "# 6. Check status and logs"
echo "sudo systemctl status meilisearch"
echo "sudo journalctl -u meilisearch -f --no-pager"
echo

echo "# 7. Test locally on the droplet"
echo "curl http://localhost:7700/health"
echo "curl http://0.0.0.0:7700/health"
echo

echo "# 8. Configure firewall (if needed)"
echo "sudo ufw allow 7700/tcp"
echo "sudo ufw status"
echo

echo "# 9. Test from external"
echo "curl http://147.182.245.91:7700/health"
echo

echo "=== TROUBLESHOOTING ==="
echo "If service fails to start:"
echo "- Check logs: sudo journalctl -u meilisearch -n 50"
echo "- Check permissions: ls -la /var/lib/meilisearch"
echo "- Check config: sudo cat /etc/meilisearch/meilisearch.toml"
echo "- Test binary: sudo -u meilisearch /usr/local/bin/meilisearch --help"
