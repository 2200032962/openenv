# CloudOps OpenEnv Environment

A real-world cloud infrastructure management simulator for AI agents.

## Environment Description

The agent acts as a Cloud Operations Engineer managing a set of virtual servers. The environment simulates common tasks such as cost optimization, scaling, and disaster recovery.

## Action Space

The agent can perform the following actions:
- `stop_server(target_id)`: Stops a specific server.
- `start_server(target_id)`: Starts a specific server.
- `scale_cluster(value)`: Scales a cluster to a specific number of nodes.
- `restart_service(target_id)`: Restarts a critical service (e.g., database, gateway).

## Observation Space

The observation is a JSON object containing:
- `servers`: A list of server objects with ID, name, status, CPU/Memory usage, and cost.
- `total_cost`: Current hourly cost of the infrastructure.
- `uptime_percentage`: Current system uptime.
- `message`: Status message from the environment.

## Tasks

1. **idle-server (Easy)**: Identify a server with near-zero CPU usage and stop it to save costs.
2. **scale-cluster (Medium)**: Detect high load on a cluster and scale it to at least 5 nodes.
3. **outage-recovery (Hard)**: Recover from a multi-service outage by restarting the database master before the API gateway.

## Setup Instructions

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Run the environment server:
   ```bash
   python app.py
   ```
3. Run the baseline inference:
   ```bash
   export HF_TOKEN="your_token"
   python inference.py
   ```
