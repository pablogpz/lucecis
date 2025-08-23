#!/usr/bin/env python3
import requests
import json
import time

# Grafana configuration
GRAFANA_URL = "http://localhost:9000"
GRAFANA_USER = "admin"
GRAFANA_PASSWORD = "admin"

def wait_for_grafana():
    """Wait for Grafana to be ready"""
    for i in range(30):
        try:
            response = requests.get(f"{GRAFANA_URL}/api/health")
            if response.status_code == 200:
                print("Grafana is ready!")
                return True
        except requests.exceptions.ConnectionError:
            pass
        print(f"Waiting for Grafana... ({i+1}/30)")
        time.sleep(5)
    return False

def create_datasource():
    """Create Prometheus data source"""
    datasource = {
        "name": "Prometheus",
        "type": "prometheus",
        "url": "http://localhost:9090",
        "access": "proxy",
        "isDefault": True
    }

    response = requests.post(
        f"{GRAFANA_URL}/api/datasources",
        auth=(GRAFANA_USER, GRAFANA_PASSWORD),
        headers={"Content-Type": "application/json"},
        data=json.dumps(datasource)
    )

    if response.status_code in [200, 409]:  # 409 = already exists
        print("✅ Prometheus datasource configured")
    else:
        print(f"❌ Failed to create datasource: {response.text}")

def import_dashboard(dashboard_file, title):
    """Import a dashboard"""
    try:
        with open(dashboard_file, 'r') as f:
            dashboard = json.load(f)

        dashboard_data = {
            "dashboard": dashboard,
            "overwrite": True
        }

        response = requests.post(
            f"{GRAFANA_URL}/api/dashboards/db",
            auth=(GRAFANA_USER, GRAFANA_PASSWORD),
            headers={"Content-Type": "application/json"},
            data=json.dumps(dashboard_data)
        )

        if response.status_code == 200:
            print(f"✅ {title} dashboard imported")
        else:
            print(f"❌ Failed to import {title}: {response.text}")
    except FileNotFoundError:
        print(f"⚠️ Dashboard file {dashboard_file} not found, skipping")

if __name__ == "__main__":
    if wait_for_grafana():
        print("🔧 Configuring Grafana...")
        create_datasource()
        time.sleep(2)

        # Import dashboards
        import_dashboard("dashboards/system-overview.json", "System Overview")
        import_dashboard("dashboards/lucecis-app.json", "Lucecis App Metrics")
        import_dashboard("dashboards/homeassistant.json", "Home Assistant")

        print("✅ Grafana setup complete!")
    else:
        print("❌ Grafana failed to start")
        exit(1)
