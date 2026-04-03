import random
from typing import Tuple, Dict, Any
from models import InfrastructureState, Server, ServerStatus, Action, ActionType

class CloudOpsEnv:
    def __init__(self):
        self.state = None
        self.task_id = None
        self.steps = 0
        self.max_steps = 10
        self.initial_cost = 0.0

    def reset(self, task_id: str = "idle-server") -> InfrastructureState:
        self.task_id = task_id
        self.steps = 0
        
        if task_id == "idle-server":
            self.state = InfrastructureState(
                servers=[
                    Server(id="srv-01", name="web-01", status=ServerStatus.RUNNING, cpu_usage=45.0, memory_usage=60.0, cost_per_hour=0.5, tags=["prod"]),
                    Server(id="srv-02", name="web-02", status=ServerStatus.RUNNING, cpu_usage=40.0, memory_usage=55.0, cost_per_hour=0.5, tags=["prod"]),
                    Server(id="srv-03", name="db-01", status=ServerStatus.RUNNING, cpu_usage=20.0, memory_usage=80.0, cost_per_hour=1.0, tags=["prod"]),
                    Server(id="srv-04", name="idle-test", status=ServerStatus.RUNNING, cpu_usage=0.1, memory_usage=5.0, cost_per_hour=0.8, tags=["dev"]),
                ],
                total_cost=2.8,
                uptime_percentage=100.0,
                message="Infrastructure initialized. Task: Identify and stop the idle server."
            )
        elif task_id == "scale-cluster":
            self.state = InfrastructureState(
                servers=[
                    Server(id="srv-01", name="web-01", status=ServerStatus.RUNNING, cpu_usage=95.0, memory_usage=90.0, cost_per_hour=0.5, tags=["cluster"]),
                    Server(id="srv-02", name="web-02", status=ServerStatus.RUNNING, cpu_usage=98.0, memory_usage=95.0, cost_per_hour=0.5, tags=["cluster"]),
                ],
                total_cost=1.0,
                uptime_percentage=85.0,
                message="High load detected on web-cluster. Task: Scale the cluster to 5 nodes."
            )
        elif task_id == "outage-recovery":
            self.state = InfrastructureState(
                servers=[
                    Server(id="db-master", name="db-master", status=ServerStatus.ERROR, cpu_usage=0.0, memory_usage=0.0, cost_per_hour=2.0, tags=["db"]),
                    Server(id="api-gw", name="api-gateway", status=ServerStatus.ERROR, cpu_usage=0.0, memory_usage=0.0, cost_per_hour=1.0, tags=["api"]),
                ],
                total_cost=3.0,
                uptime_percentage=0.0,
                message="Critical outage! Database is down, followed by API Gateway. Task: Recover services in order (DB first)."
            )
        else:
            # Default fallback
            self.state = InfrastructureState(servers=[], total_cost=0, uptime_percentage=0, message="Unknown task")

        self.initial_cost = self.state.total_cost
        return self.state

    def step(self, action: Action) -> Tuple[InfrastructureState, float, bool, Dict[str, Any]]:
        self.steps += 1
        reward = 0.0
        done = False
        info = {}

        if action.type == ActionType.STOP_SERVER:
            for s in self.state.servers:
                if s.id == action.target_id:
                    s.status = ServerStatus.STOPPED
                    s.cpu_usage = 0
                    s.memory_usage = 0
                    self.state.message = f"Stopped server {s.id}"
                    
                    # Reward for idle-server task
                    if self.task_id == "idle-server" and s.id == "srv-04":
                        reward = 1.0
                        self.state.task_completed = True
                        done = True
                    elif self.task_id == "idle-server":
                        reward = -0.5 # Stopped the wrong server
                        done = True

        elif action.type == ActionType.START_SERVER:
             for s in self.state.servers:
                if s.id == action.target_id:
                    s.status = ServerStatus.RUNNING
                    self.state.message = f"Started server {s.id}"

        elif action.type == ActionType.SCALE_CLUSTER:
            if self.task_id == "scale-cluster":
                target_count = int(action.value) if action.value else 0
                current_count = len(self.state.servers)
                if target_count >= 5:
                    # Add servers
                    for i in range(current_count + 1, target_count + 1):
                        self.state.servers.append(
                            Server(id=f"srv-scale-{i}", name=f"web-scale-{i}", status=ServerStatus.RUNNING, cpu_usage=20.0, memory_usage=30.0, cost_per_hour=0.5, tags=["cluster"])
                        )
                    self.state.uptime_percentage = 100.0
                    self.state.message = f"Scaled cluster to {target_count} nodes."
                    reward = 1.0
                    self.state.task_completed = True
                    done = True
                else:
                    reward = 0.2 # Partial progress
                    self.state.message = f"Scaled to {target_count}, but need at least 5 for stability."

        elif action.type == ActionType.RESTART_SERVICE:
            if self.task_id == "outage-recovery":
                if action.target_id == "db-master":
                    for s in self.state.servers:
                        if s.id == "db-master":
                            s.status = ServerStatus.RUNNING
                            s.cpu_usage = 30.0
                            reward = 0.5
                            self.state.message = "DB Master recovered. Now restart API Gateway."
                elif action.target_id == "api-gw":
                    db_running = any(s.id == "db-master" and s.status == ServerStatus.RUNNING for s in self.state.servers)
                    if db_running:
                        for s in self.state.servers:
                            if s.id == "api-gw":
                                s.status = ServerStatus.RUNNING
                                s.cpu_usage = 15.0
                                reward = 0.5 # Total 1.0
                                self.state.uptime_percentage = 100.0
                                self.state.message = "System fully recovered!"
                                self.state.task_completed = True
                                done = True
                    else:
                        self.state.message = "API Gateway failed to start: DB is still down!"
                        reward = -0.2

        # Update total cost
        self.state.total_cost = sum(s.cost_per_hour for s in self.state.servers if s.status == ServerStatus.RUNNING)

        if self.steps >= self.max_steps:
            done = True

        return self.state, reward, done, info
