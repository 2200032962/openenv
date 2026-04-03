from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum

class ServerStatus(str, Enum):
    RUNNING = "running"
    STOPPED = "stopped"
    ERROR = "error"

class Server(BaseModel):
    id: str
    name: str
    status: ServerStatus
    cpu_usage: float
    memory_usage: float
    cost_per_hour: float
    tags: List[str]

class InfrastructureState(BaseModel):
    servers: List[Server]
    total_cost: float
    uptime_percentage: float
    message: str
    task_completed: bool = False

class ActionType(str, Enum):
    STOP_SERVER = "stop_server"
    START_SERVER = "start_server"
    SCALE_CLUSTER = "scale_cluster"
    RESTART_SERVICE = "restart_service"
    NOOP = "noop"

class Action(BaseModel):
    type: ActionType
    target_id: Optional[str] = None
    value: Optional[Any] = None

class StepResponse(BaseModel):
    observation: InfrastructureState
    reward: float
    done: bool
    info: Dict[str, Any]
