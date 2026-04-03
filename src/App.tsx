import { useState, useEffect } from 'react';
import { Server, Activity, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';

interface ServerData {
  id: string;
  name: string;
  status: string;
  cpu_usage: number;
  memory_usage: number;
  cost_per_hour: number;
}

interface State {
  servers: ServerData[];
  total_cost: number;
  uptime_percentage: number;
  message: string;
  task_completed: boolean;
}

export default function App() {
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch('/state');
        if (res.ok) {
          const data = await res.json();
          setState(data);
        }
      } catch (e) {
        console.error("Failed to fetch state", e);
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!state) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <h2 className="text-xl font-bold text-slate-700">Initializing Cloud Environment...</h2>
        <p className="text-slate-500">Setting up virtual servers for the agent.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CloudOps Simulator</h1>
          <p className="text-slate-500">OpenEnv Agent Environment</p>
        </div>
        <div className="flex gap-4">
          <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200 flex items-center gap-3">
            <div className="text-emerald-500 font-bold text-xl">₹</div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold">Hourly Cost</p>
              <p className="text-xl font-bold">₹{state.total_cost.toFixed(2)}</p>
            </div>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200 flex items-center gap-3">
            <Activity className="text-blue-500" />
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold">Uptime</p>
              <p className="text-xl font-bold">{state.uptime_percentage}%</p>
            </div>
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Server className="w-5 h-5" /> Infrastructure
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {state.servers.map(server => (
              <div key={server.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg">{server.name}</h3>
                    <p className="text-xs text-slate-400 font-mono">{server.id}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                    server.status === 'running' ? 'bg-emerald-100 text-emerald-700' : 
                    server.status === 'stopped' ? 'bg-slate-100 text-slate-600' : 'bg-red-100 text-red-700'
                  }`}>
                    {server.status}
                  </span>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>CPU Usage</span>
                      <span>{server.cpu_usage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${server.cpu_usage}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Memory</span>
                      <span>{server.memory_usage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-purple-500 h-full transition-all duration-500" style={{ width: `${server.memory_usage}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              Status Log
            </h2>
            <div className={`p-4 rounded-xl border flex gap-3 ${
              state.task_completed ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              {state.task_completed ? <CheckCircle className="shrink-0" /> : <AlertCircle className="shrink-0" />}
              <p className="text-sm font-medium">{state.message}</p>
            </div>
          </div>

          <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl shadow-xl">
            <h2 className="text-lg font-bold mb-4 text-slate-400 uppercase tracking-wider text-xs">Agent Console</h2>
            <div className="font-mono text-sm space-y-2 opacity-80">
              <p className="text-emerald-400">$ agent --task {state.task_completed ? 'completed' : 'running'}</p>
              <p className="text-slate-500">Waiting for next step...</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
