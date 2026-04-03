import os
import json
import textwrap
from typing import List, Optional
from openai import OpenAI
import requests

# Configuration
API_BASE_URL = os.getenv("API_BASE_URL", "https://router.huggingface.co/v1")
MODEL_NAME = os.getenv("MODEL_NAME", "Qwen/Qwen2.5-72B-Instruct")
API_KEY = os.getenv("HF_TOKEN") or os.getenv("API_KEY")
ENV_URL = os.getenv("PING_URL", "http://localhost:3000")

client = OpenAI(base_url=API_BASE_URL, api_key=API_KEY)

def log_start(task: str, env: str, model: str) -> None:
    print(f"[START] task={task} env={env} model={model}", flush=True)

def log_step(step: int, action: str, reward: float, done: bool, error: Optional[str]) -> None:
    done_str = "true" if done else "false"
    error_str = error if error else "null"
    print(f"[STEP] step={step} action={action} reward={reward:.2f} done={done_str} error={error_str}", flush=True)

def log_end(success: bool, steps: int, rewards: List[float]) -> None:
    success_str = "true" if success else "false"
    rewards_str = ",".join([f"{r:.2f}" for r in rewards])
    print(f"[END] success={success_str} steps={steps} rewards={rewards_str}", flush=True)

SYSTEM_PROMPT = textwrap.dedent("""
    You are an expert Cloud Operations Engineer managing a virtual infrastructure.
    Your goal is to complete specific tasks efficiently while maintaining system stability and cost-effectiveness.

    Environment Rules:
    1. 'idle-server': Identify servers with near-zero CPU usage and stop them using 'stop_server'.
    2. 'scale-cluster': When CPU load is high on cluster nodes, use 'scale_cluster' to increase the node count to at least 5.
    3. 'outage-recovery': Critical services are down. You MUST restart them in the correct dependency order. Restart the database ('db-master') before the API gateway ('api-gw').

    Action Format:
    You must output a JSON object with the following structure:
    {
      "type": "action_type",
      "target_id": "server_id_or_null",
      "value": "numeric_value_or_null"
    }
    Valid types: stop_server, start_server, scale_cluster, restart_service, noop.
""").strip()

async def run_inference():
    task_id = os.getenv("TASK_ID", "idle-server")
    log_start(task=task_id, env="cloudops-v1", model=MODEL_NAME)
    
    # Reset environment
    try:
        resp = requests.post(f"{ENV_URL}/reset", json={"task_id": task_id})
        obs = resp.json()
    except Exception as e:
        log_end(success=False, steps=0, rewards=[])
        return

    steps = 0
    total_rewards = []
    done = False
    success = False

    while not done and steps < 10:
        steps += 1
        
        prompt = textwrap.dedent(f"""
            Current Task: {task_id}
            Infrastructure State:
            {json.dumps(obs, indent=2)}
            
            Analyze the state and provide the next best action to achieve the task goal.
        """).strip()

        try:
            completion = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                response_format={ "type": "json_object" }
            )
            action_data = json.loads(completion.choices[0].message.content)
            
            # Step environment
            step_resp = requests.post(f"{ENV_URL}/step", json=action_data)
            step_data = step_resp.json()
            
            obs = step_data["observation"]
            reward = step_data["reward"]
            done = step_data["done"]
            
            total_rewards.append(reward)
            log_step(step=steps, action=json.dumps(action_data), reward=reward, done=done, error=None)
            
            if obs.get("task_completed"):
                success = True

        except Exception as e:
            log_step(step=steps, action="error", reward=0.0, done=True, error=str(e))
            break

    log_end(success=success, steps=steps, rewards=total_rewards)

if __name__ == "__main__":
    import asyncio
    asyncio.run(run_inference())
