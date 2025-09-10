#!/usr/bin/env python3
"""
Fix MeiliSearch Production Issues

This script provides commands and checks to fix MeiliSearch connectivity issues
in DigitalOcean production environment.
"""

import os
import requests
import sys

def check_and_fix_meilisearch():
    """Check MeiliSearch issues and provide fix commands"""
    
    print("=== MeiliSearch Production Fix Guide ===\n")
    
    # Current configuration
    meili_host = os.getenv('MEILI_HOST', 'http://147.182.245.91:7700')
    print(f"Current MEILI_HOST: {meili_host}")
    print(f"Current IP: 147.182.245.91")
    print()
    
    print("🔍 Possible Issues and Solutions:\n")
    
    print("1. FIREWALL RULES")
    print("   The droplet firewall might be blocking port 7700")
    print("   DigitalOcean Console → Droplets → meilisearch-help-center → Firewalls")
    print("   Ensure these rules exist:")
    print("   - Inbound: Custom TCP 7700 from App Platform VPC")
    print("   - Inbound: HTTP 80 from anywhere (if needed)")
    print("   - Inbound: SSH 22 from your IP (for debugging)")
    print()
    
    print("2. MEILISEARCH SERVICE STATUS")
    print("   SSH into the droplet and check:")
    print("   ```")
    print("   sudo systemctl status meilisearch")
    print("   sudo journalctl -u meilisearch -f")
    print("   ```")
    print()
    
    print("3. MEILISEARCH CONFIGURATION")
    print("   Check if MeiliSearch is bound to the correct address:")
    print("   ```")
    print("   sudo cat /etc/meilisearch/meilisearch.toml")
    print("   ```")
    print("   It should contain:")
    print("   ```")
    print("   http_addr = \"0.0.0.0:7700\"  # Not 127.0.0.1:7700")
    print("   master_key = \"NzEzYTdkNjQ0N2FiYjFkODg0NzdjNzNk\"")
    print("   ```")
    print()
    
    print("4. NETWORK CONNECTIVITY")
    print("   The issue might be that App Platform can't reach the external IP.")
    print("   Try using the PRIVATE IP instead:")
    print("   In DigitalOcean Console → Droplets → meilisearch-help-center")
    print("   Look for 'Private IP' (usually 10.x.x.x)")
    print("   Update MEILI_HOST to: http://PRIVATE_IP:7700")
    print()
    
    print("5. RESTART MEILISEARCH SERVICE")
    print("   If configuration was changed:")
    print("   ```")
    print("   sudo systemctl restart meilisearch")
    print("   sudo systemctl enable meilisearch")
    print("   ```")
    print()
    
    print("6. TEST FROM DROPLET")
    print("   SSH into the MeiliSearch droplet and test locally:")
    print("   ```")
    print("   curl http://localhost:7700/health")
    print("   curl http://0.0.0.0:7700/health")
    print("   curl -H 'Authorization: Bearer NzEzYTdkNjQ0N2FiYjFkODg0NzdjNzNk' http://localhost:7700/version")
    print("   ```")
    print()
    
    print("7. QUICK FIX COMMANDS")
    print("   Complete setup commands for the MeiliSearch droplet:")
    print("   ```bash")
    print("   # Install MeiliSearch if not installed")
    print("   curl -L https://install.meilisearch.com | sh")
    print("   sudo mv meilisearch /usr/local/bin/")
    print("   ")
    print("   # Create systemd service")
    print("   sudo tee /etc/systemd/system/meilisearch.service > /dev/null <<EOF")
    print("   [Unit]")
    print("   Description=MeiliSearch")
    print("   After=network.target")
    print("   ")
    print("   [Service]")
    print("   Type=simple")
    print("   User=meilisearch")
    print("   ExecStart=/usr/local/bin/meilisearch --http-addr 0.0.0.0:7700 --master-key NzEzYTdkNjQ0N2FiYjFkODg0NzdjNzNk --db-path /var/lib/meilisearch")
    print("   Restart=on-failure")
    print("   ")
    print("   [Install]")
    print("   WantedBy=multi-user.target")
    print("   EOF")
    print("   ")
    print("   # Create user and directory")
    print("   sudo useradd -r -s /bin/false meilisearch")
    print("   sudo mkdir -p /var/lib/meilisearch")
    print("   sudo chown meilisearch:meilisearch /var/lib/meilisearch")
    print("   ")
    print("   # Start service")
    print("   sudo systemctl daemon-reload")
    print("   sudo systemctl enable meilisearch")
    print("   sudo systemctl start meilisearch")
    print("   ```")
    print()
    
    print("8. UPDATE ENVIRONMENT VARIABLES")
    print("   Once you find the working IP/configuration:")
    print("   - Go to DigitalOcean App Platform")
    print("   - Update MEILI_HOST environment variable")
    print("   - Redeploy the application")
    print()
    
    print("🔧 IMMEDIATE ACTION ITEMS:")
    print("1. SSH into droplet: ssh root@147.182.245.91")
    print("2. Check service: sudo systemctl status meilisearch")
    print("3. Check config: sudo cat /etc/meilisearch/meilisearch.toml")
    print("4. Test locally: curl http://localhost:7700/health")
    print("5. Fix binding: ensure http_addr = '0.0.0.0:7700'")
    print("6. Restart: sudo systemctl restart meilisearch")
    print("7. Update firewall rules in DO console")
    print("8. Try private IP in MEILI_HOST")

if __name__ == "__main__":
    check_and_fix_meilisearch()
