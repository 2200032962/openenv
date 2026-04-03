export enum ServerStatus {
  RUNNING = "running",
  STOPPED = "stopped",
  ERROR = "error",
}

export interface Server {
  id: string;
  name: string;
  status: ServerStatus;
  cpu_usage: number;
  memory_usage: number;
  cost_per_hour: number;
  tags: string[];
}

export interface InfrastructureState {
  servers: Server[];
  total_cost: number;
  uptime_percentage: number;
  message: string;
  task_completed: boolean;
}

export enum ActionType {
  STOP_SERVER = "stop_server",
  START_SERVER = "start_server",
  SCALE_CLUSTER = "scale_cluster",
  RESTART_SERVICE = "restart_service",
  NOOP = "noop",
}

export interface Action {
  type: ActionType;
  target_id?: string;
  value?: any;
}

export class CloudOpsEnv {
  private state: InfrastructureState | null = null;
  private taskId: string | null = null;
  private steps: number = 0;
  private maxSteps: number = 10;

  constructor() {}

  public reset(taskId: string = "idle-server"): InfrastructureState {
    this.taskId = taskId;
    this.steps = 0;

    if (taskId === "idle-server") {
      this.state = {
        servers: [
          { id: "srv-01", name: "web-01", status: ServerStatus.RUNNING, cpu_usage: 45.0, memory_usage: 60.0, cost_per_hour: 40.0, tags: ["prod"] },
          { id: "srv-02", name: "web-02", status: ServerStatus.RUNNING, cpu_usage: 40.0, memory_usage: 55.0, cost_per_hour: 40.0, tags: ["prod"] },
          { id: "srv-03", name: "db-01", status: ServerStatus.RUNNING, cpu_usage: 20.0, memory_usage: 80.0, cost_per_hour: 80.0, tags: ["prod"] },
          { id: "srv-04", name: "idle-test", status: ServerStatus.RUNNING, cpu_usage: 0.1, memory_usage: 5.0, cost_per_hour: 65.0, tags: ["dev"] },
        ],
        total_cost: 225.0,
        uptime_percentage: 100.0,
        message: "Infrastructure initialized. Task: Identify and stop the idle server.",
        task_completed: false,
      };
    } else if (taskId === "scale-cluster") {
      this.state = {
        servers: [
          { id: "srv-01", name: "web-01", status: ServerStatus.RUNNING, cpu_usage: 95.0, memory_usage: 90.0, cost_per_hour: 40.0, tags: ["cluster"] },
          { id: "srv-02", name: "web-02", status: ServerStatus.RUNNING, cpu_usage: 98.0, memory_usage: 95.0, cost_per_hour: 40.0, tags: ["cluster"] },
        ],
        total_cost: 80.0,
        uptime_percentage: 85.0,
        message: "High load detected on web-cluster. Task: Scale the cluster to 5 nodes.",
        task_completed: false,
      };
    } else if (taskId === "outage-recovery") {
      this.state = {
        servers: [
          { id: "db-master", name: "db-master", status: ServerStatus.ERROR, cpu_usage: 0.0, memory_usage: 0.0, cost_per_hour: 160.0, tags: ["db"] },
          { id: "api-gw", name: "api-gateway", status: ServerStatus.ERROR, cpu_usage: 0.0, memory_usage: 0.0, cost_per_hour: 80.0, tags: ["api"] },
        ],
        total_cost: 240.0,
        uptime_percentage: 0.0,
        message: "Critical outage! Database is down, followed by API Gateway. Task: Recover services in order (DB first).",
        task_completed: false,
      };
    } else {
      this.state = { servers: [], total_cost: 0, uptime_percentage: 0, message: "Unknown task", task_completed: false };
    }

    return this.state;
  }

  public step(action: Action): { observation: InfrastructureState; reward: number; done: boolean; info: any } {
    this.steps++;
    let reward = 0.0;
    let done = false;
    const info = {};

    if (!this.state) throw new Error("Environment not initialized. Call reset() first.");

    if (action.type === ActionType.STOP_SERVER) {
      for (const s of this.state.servers) {
        if (s.id === action.target_id) {
          s.status = ServerStatus.STOPPED;
          s.cpu_usage = 0;
          s.memory_usage = 0;
          this.state.message = `Stopped server ${s.id}`;

          if (this.taskId === "idle-server" && s.id === "srv-04") {
            reward = 1.0;
            this.state.task_completed = true;
            done = true;
          } else if (this.taskId === "idle-server") {
            reward = -0.5;
            done = true;
          }
        }
      }
    } else if (action.type === ActionType.START_SERVER) {
      for (const s of this.state.servers) {
        if (s.id === action.target_id) {
          s.status = ServerStatus.RUNNING;
          this.state.message = `Started server ${s.id}`;
        }
      }
    } else if (action.type === ActionType.SCALE_CLUSTER) {
      if (this.taskId === "scale-cluster") {
        const targetCount = parseInt(action.value) || 0;
        const currentCount = this.state.servers.length;
        if (targetCount >= 5) {
          for (let i = currentCount + 1; i <= targetCount; i++) {
            this.state.servers.push({
              id: `srv-scale-${i}`,
              name: `web-scale-${i}`,
              status: ServerStatus.RUNNING,
              cpu_usage: 20.0,
              memory_usage: 30.0,
              cost_per_hour: 40.0,
              tags: ["cluster"],
            });
          }
          this.state.uptime_percentage = 100.0;
          this.state.message = `Scaled cluster to ${targetCount} nodes.`;
          reward = 1.0;
          this.state.task_completed = true;
          done = true;
        } else {
          reward = 0.2;
          this.state.message = `Scaled to ${targetCount}, but need at least 5 for stability.`;
        }
      }
    } else if (action.type === ActionType.RESTART_SERVICE) {
      if (this.taskId === "outage-recovery") {
        if (action.target_id === "db-master") {
          for (const s of this.state.servers) {
            if (s.id === "db-master") {
              s.status = ServerStatus.RUNNING;
              s.cpu_usage = 30.0;
              reward = 0.5;
              this.state.message = "DB Master recovered. Now restart API Gateway.";
            }
          }
        } else if (action.target_id === "api-gw") {
          const dbRunning = this.state.servers.some((s) => s.id === "db-master" && s.status === ServerStatus.RUNNING);
          if (dbRunning) {
            for (const s of this.state.servers) {
              if (s.id === "api-gw") {
                s.status = ServerStatus.RUNNING;
                s.cpu_usage = 15.0;
                reward = 0.5;
                this.state.uptime_percentage = 100.0;
                this.state.message = "System fully recovered!";
                this.state.task_completed = true;
                done = true;
              }
            }
          } else {
            this.state.message = "API Gateway failed to start: DB is still down!";
            reward = -0.2;
          }
        }
      }
    }

    this.state.total_cost = this.state.servers
      .filter((s) => s.status === ServerStatus.RUNNING)
      .reduce((sum, s) => sum + s.cost_per_hour, 0);

    if (this.steps >= this.maxSteps) {
      done = true;
    }

    return { observation: this.state, reward, done, info };
  }

  public getState(): InfrastructureState | null {
    return this.state;
  }
}
