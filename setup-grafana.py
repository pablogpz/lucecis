#!/usr/bin/env python3
import requests
import json
import time
import os
import glob

# Grafana configuration
GRAFANA_URL = "http://localhost:9000"
GRAFANA_USER = "admin"
GRAFANA_PASSWORD = "admin"

# Store datasource UIDs for mapping
DATASOURCE_UIDS = {}


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


def create_folder(folder_name):
    """Create a folder for organizing dashboards and alerts"""
    folder_data = {
        "title": folder_name
    }

    response = requests.post(
        f"{GRAFANA_URL}/api/folders",
        auth=(GRAFANA_USER, GRAFANA_PASSWORD),
        headers={"Content-Type": "application/json"},
        data=json.dumps(folder_data)
    )

    if response.status_code in [200, 409]:  # 409 = already exists
        print(f"✅ Folder '{folder_name}' configured")
        return True
    else:
        print(f"❌ Failed to create folder '{folder_name}': {response.text}")
        return False


def get_datasource_uid(name):
    """Get the UID of a datasource by name"""
    response = requests.get(
        f"{GRAFANA_URL}/api/datasources/name/{name}",
        auth=(GRAFANA_USER, GRAFANA_PASSWORD)
    )
    if response.status_code == 200:
        return response.json()['uid']
    return None


def create_datasource():
    """Create Prometheus and Loki data sources"""
    global DATASOURCE_UIDS

    # Prometheus datasource
    prometheus_datasource = {
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
        data=json.dumps(prometheus_datasource)
    )

    if response.status_code in [200, 409]:  # 409 = already exists
        print("✅ Prometheus datasource configured")
        DATASOURCE_UIDS['prometheus'] = get_datasource_uid('Prometheus')
    else:
        print(f"❌ Failed to create Prometheus datasource: {response.text}")

    # Loki datasource
    loki_datasource = {
        "name": "Loki",
        "type": "loki",
        "url": "http://localhost:9095",
        "access": "proxy"
    }

    response = requests.post(
        f"{GRAFANA_URL}/api/datasources",
        auth=(GRAFANA_USER, GRAFANA_PASSWORD),
        headers={"Content-Type": "application/json"},
        data=json.dumps(loki_datasource)
    )

    if response.status_code in [200, 409]:  # 409 = already exists
        print("✅ Loki datasource configured")
        DATASOURCE_UIDS['loki'] = get_datasource_uid('Loki')
    else:
        print(f"❌ Failed to create Loki datasource: {response.text}")


def map_datasource_uids(alert_data):
    """Map generic datasource names to actual UIDs"""
    def replace_uid(obj):
        if isinstance(obj, dict):
            for key, value in obj.items():
                if key == "datasourceUid" and value in DATASOURCE_UIDS:
                    obj[key] = DATASOURCE_UIDS[value]
                elif isinstance(value, (dict, list)):
                    replace_uid(value)
        elif isinstance(obj, list):
            for item in obj:
                replace_uid(item)

    replace_uid(alert_data)
    return alert_data


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


def import_alert_rules(alert_file, rule_group_name):
    """Import alert rules from a JSON file"""
    try:
        with open(alert_file, 'r') as f:
            alert_data = json.load(f)

        # Map datasource UIDs
        alert_data = map_datasource_uids(alert_data)

        response = requests.post(
            f"{GRAFANA_URL}/api/v1/provisioning/alert-rules",
            auth=(GRAFANA_USER, GRAFANA_PASSWORD),
            headers={"Content-Type": "application/json"},
            data=json.dumps(alert_data)
        )

        if response.status_code in [200, 201, 202]:
            print(f"✅ {rule_group_name} alert rules imported")
        else:
            print(f"❌ Failed to import {rule_group_name} alert rules: {response.text}")
    except FileNotFoundError:
        print(f"⚠️ Alert file {alert_file} not found, skipping")
    except Exception as e:
        print(f"❌ Error importing {rule_group_name} alert rules: {str(e)}")


if __name__ == "__main__":
    if wait_for_grafana():
        print("🔧 Configuring Grafana...")
        create_datasource()
        time.sleep(2)

        # Create folder for organization
        create_folder("Lucecis")
        time.sleep(1)

        # Import dashboards
        import_dashboard("dashboards/lucecis-overview.json", "Lucecis Overview")

        # Import alert rules
        print("📋 Importing alert rules...")
        import_alert_rules("alerts/lucecis-connectivity.json", "Lucecis Connectivity")
        import_alert_rules("alerts/lucecis-security.json", "Lucecis Security")

        print("✅ Grafana setup complete!")
    else:
        print("❌ Grafana failed to start")
        exit(1)
