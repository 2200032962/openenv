import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { CloudOpsEnv } from "./src/cloudOpsEnv.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const env = new CloudOpsEnv();

  app.use(express.json());

  // API routes
  app.post("/reset", (req, res) => {
    const { task_id } = req.body;
    const state = env.reset(task_id);
    res.json(state);
  });

  app.post("/step", (req, res) => {
    const action = req.body;
    const result = env.step(action);
    res.json(result);
  });

  app.get("/state", (req, res) => {
    let state = env.getState();
    if (!state) {
      // Auto-initialize for a better beginner experience
      state = env.reset("idle-server");
    }
    res.json(state);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
