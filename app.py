from fastapi import FastAPI, Body
from models import Action, InfrastructureState, StepResponse
from env import CloudOpsEnv
import os

app = FastAPI(title="CloudOps OpenEnv")
env = CloudOpsEnv()

@app.post("/reset")
async def reset(task_id: str = Body(..., embed=True)):
    """Reset the environment to a specific task."""
    state = env.reset(task_id)
    return state

@app.post("/step")
async def step(action: Action):
    """Execute an action in the environment."""
    observation, reward, done, info = env.step(action)
    return StepResponse(
        observation=observation,
        reward=reward,
        done=done,
        info=info
    )

@app.get("/state")
async def get_state():
    """Get the current state of the environment."""
    return env.state

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 3001))
    uvicorn.run(app, host="0.0.0.0", port=port)
