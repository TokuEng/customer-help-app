#!/usr/bin/env python3
"""
Debug Production MeiliSearch Connection Issues

This script helps diagnose why MeiliSearch is not accessible in production.
Run this from the DigitalOcean App Platform environment to test internal connectivity.
"""

import os
import sys
import requests
import socket
import time
from datetime import datetime

def log(message):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")

def test_meilisearch_connectivity():
    """Test MeiliSearch connectivity from production environment"""
    
    # Get environment variables
    meili_host = os.getenv('MEILI_HOST', 'http://147.182.245.91:7700')
    meili_key = os.getenv('MEILI_MASTER_KEY', '')
    
    log("=== Production MeiliSearch Debug ===")
    log(f"Host: {meili_host}")
    log(f"Key: {'*' * 10}... (length: {len(meili_key)})")
    log(f"Environment: {os.getenv('NODE_ENV', 'unknown')}")
    
    # Parse host for connection test
    if meili_host.startswith('http://'):
        host_ip = meili_host.replace('http://', '').split(':')[0]
        port = int(meili_host.split(':')[-1]) if ':' in meili_host.replace('http://', '') else 80
    else:
        host_ip = meili_host.split(':')[0]
        port = int(meili_host.split(':')[1]) if ':' in meili_host else 7700
    
    log(f"Parsed - IP: {host_ip}, Port: {port}")
    
    # Test 1: TCP Connection
    log("\n1. Testing TCP connection...")
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        result = sock.connect_ex((host_ip, port))
        sock.close()
        
        if result == 0:
            log("✅ TCP connection successful")
        else:
            log(f"❌ TCP connection failed (error code: {result})")
            if result == 61:
                log("   → Connection refused - service not running or firewalled")
            elif result == 60:
                log("   → Connection timeout - network issue or firewall")
    except Exception as e:
        log(f"❌ TCP test error: {e}")
    
    # Test 2: HTTP Health Check
    log("\n2. Testing HTTP health endpoint...")
    try:
        response = requests.get(f"{meili_host}/health", timeout=15)
        log(f"✅ Health check: {response.status_code}")
        log(f"   Response: {response.text}")
    except requests.exceptions.ConnectTimeout:
        log("❌ HTTP timeout - server not responding")
    except requests.exceptions.ConnectionError as e:
        log(f"❌ HTTP connection error: {e}")
        if "Connection refused" in str(e):
            log("   → MeiliSearch service is not running on the target server")
        elif "timeout" in str(e).lower():
            log("   → Network timeout - check firewall rules")
    except Exception as e:
        log(f"❌ HTTP error: {e}")
    
    # Test 3: Authenticated Endpoint
    log("\n3. Testing authenticated endpoint...")
    if meili_key:
        try:
            headers = {'Authorization': f'Bearer {meili_key}'}
            response = requests.get(f"{meili_host}/version", headers=headers, timeout=15)
            log(f"✅ Version endpoint: {response.status_code}")
            if response.status_code == 200:
                log(f"   Version: {response.json()}")
        except Exception as e:
            log(f"❌ Auth endpoint error: {e}")
    else:
        log("❌ No master key provided")
    
    # Test 4: Network Environment Info
    log("\n4. Network environment info...")
    try:
        # Get our external IP
        response = requests.get('https://httpbin.org/ip', timeout=10)
        our_ip = response.json().get('origin', 'unknown')
        log(f"Our external IP: {our_ip}")
    except:
        log("Could not determine external IP")
    
    # Test 5: Alternative Connection Methods
    log("\n5. Testing alternative connection methods...")
    
    # Try internal IP if this is a DigitalOcean environment
    internal_hosts = [
        'http://10.124.0.39:7700',  # From the README
        'http://meilisearch:7700',   # Docker service name
        'http://localhost:7700'      # Local fallback
    ]
    
    for alt_host in internal_hosts:
        try:
            log(f"   Trying {alt_host}...")
            response = requests.get(f"{alt_host}/health", timeout=5)
            log(f"   ✅ {alt_host} - Status: {response.status_code}")
            if response.status_code == 200:
                log(f"   🎉 Found working endpoint: {alt_host}")
                break
        except Exception as e:
            log(f"   ❌ {alt_host} failed: {type(e).__name__}")
    
    # Recommendations
    log("\n=== Recommendations ===")
    log("If all tests failed:")
    log("1. Check if MeiliSearch droplet is running in DigitalOcean console")
    log("2. Verify firewall rules allow traffic on port 7700")
    log("3. Ensure MeiliSearch is configured to bind to 0.0.0.0:7700 (not localhost)")
    log("4. Check if the droplet has the correct private/public IP")
    log("5. Consider using DigitalOcean's internal networking (10.x.x.x addresses)")
    
    log("\nTo fix MeiliSearch configuration:")
    log("SSH into the droplet and run:")
    log("sudo systemctl status meilisearch")
    log("sudo journalctl -u meilisearch -f")
    log("Check /etc/meilisearch/meilisearch.toml for http_addr setting")

if __name__ == "__main__":
    test_meilisearch_connectivity()
