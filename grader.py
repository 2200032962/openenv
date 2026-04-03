import requests
import os
import json

ENV_URL = os.getenv("PING_URL", "http://localhost:3000")

def test_task(task_id: str, actions: list):
    print(f"\n--- Testing Task: {task_id} ---")
    
    # Reset
    resp = requests.post(f"{ENV_URL}/reset", json={"task_id": task_id})
    state = resp.json()
    print(f"Initial Message: {state['message']}")

    total_reward = 0
    for i, action in enumerate(actions):
        resp = requests.post(f"{ENV_URL}/step", json=action)
        data = resp.json()
        obs = data["observation"]
        reward = data["reward"]
        total_reward += reward
        print(f"Step {i+1}: Action={action['type']}, Reward={reward}, Completed={obs['task_completed']}")
        
        if obs['task_completed']:
            print(f"SUCCESS: Task {task_id} completed with total reward {total_reward}")
            return True
            
    print(f"FAILURE: Task {task_id} did not complete.")
    return False

if __name__ == "__main__":
    # Test Task 1: Idle Server
    test_task("idle-server", [{"type": "stop_server", "target_id": "srv-04"}])
    
    # Test Task 2: Scale Cluster
    test_task("scale-cluster", [{"type": "scale_cluster", "value": 5}])
    
    # Test Task 3: Outage Recovery
    test_task("outage-recovery", [
        {"type": "restart_service", "target_id": "db-master"},
        {"type": "restart_service", "target_id": "api-gw"}
    ])
