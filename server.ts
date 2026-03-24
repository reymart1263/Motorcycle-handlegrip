import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DB_DIR, "app-state.json");

type AppState = {
  user: {
    name: string;
    email: string;
    password?: string;
  };
  usersList: Array<{ id: string; name: string; email: string }>;
  fingerprints: Array<{ id: string; name: string; userId: string; slot: number }>;
};

const DEFAULT_STATE: AppState = {
  user: { name: "John Doe", email: "john@example.com" },
  usersList: [
    { id: "user1", name: "John Doe", email: "john@example.com" },
    { id: "user2", name: "Jane Smith", email: "jane@example.com" },
    { id: "user3", name: "Mike Johnson", email: "mike@example.com" },
  ],
  fingerprints: [
    { id: "fp1", name: "Thumb", userId: "user1", slot: 1 },
    { id: "fp2", name: "Index", userId: "user1", slot: 2 },
    { id: "fp3", name: "Thumb", userId: "user2", slot: 1 },
  ],
};

async function ensureDbFile() {
  await fs.mkdir(DB_DIR, { recursive: true });
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.writeFile(DB_FILE, JSON.stringify(DEFAULT_STATE, null, 2), "utf-8");
  }
}

async function readState(): Promise<AppState> {
  await ensureDbFile();
  const content = await fs.readFile(DB_FILE, "utf-8");
  try {
    const parsed = JSON.parse(content);
    return {
      user: parsed.user ?? DEFAULT_STATE.user,
      usersList: Array.isArray(parsed.usersList) ? parsed.usersList : DEFAULT_STATE.usersList,
      fingerprints: Array.isArray(parsed.fingerprints) ? parsed.fingerprints : DEFAULT_STATE.fingerprints,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

async function writeState(state: AppState): Promise<void> {
  await ensureDbFile();
  await fs.writeFile(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.post("/api/exit", (req, res) => {
    console.log("Exit routine triggered. Terminating session...");
    // In a real app, you might clear session cookies or tokens here.
    res.json({ status: "success", message: "Session terminated. You can now close this window." });
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/state", async (_req, res) => {
    try {
      const state = await readState();
      res.json(state);
    } catch (error) {
      console.error("Failed to read app state:", error);
      res.status(500).json({ error: "Failed to read app state" });
    }
  });

  app.put("/api/state", async (req, res) => {
    try {
      const payload = req.body as AppState;
      if (!payload || !payload.user || !Array.isArray(payload.usersList) || !Array.isArray(payload.fingerprints)) {
        res.status(400).json({ error: "Invalid payload" });
        return;
      }

      await writeState(payload);
      res.json({ status: "saved" });
    } catch (error) {
      console.error("Failed to write app state:", error);
      res.status(500).json({ error: "Failed to write app state" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
