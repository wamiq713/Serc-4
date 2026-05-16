import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { Graph } from "./algorithms/dijkstra";
import { KMeans } from "./algorithms/clustering";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Standard Node error handling for unhandled promises/exceptions
process.on("uncaughtException", (err) => {
  console.error("FATAL: Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("FATAL: Unhandled Rejection at:", promise, "reason:", reason);
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Lazy-initialize Gemini to avoid crashing if key is missing at startup
  let genAI: any = null;
  const getGenAI = () => {
    if (!genAI) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured on the server.");
      }
      genAI = new GoogleGenAI({ apiKey });
    }
    return genAI;
  };

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
  });

  // AI Analysis Endpoint (Securely uses GEMINI_API_KEY on server only)
  app.post("/api/ai/analyze-accident", async (req, res) => {
    try {
      const { description } = req.body;
      if (!description) return res.status(400).json({ error: "Description required" });

      const ai = getGenAI();
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `Analyze this emergency incident report and provide a 1-sentence priority level (High, Medium, Low) and a 1-sentence recommended action: "${description}"`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      res.json({ analysis: text });
    } catch (error: any) {
      console.error("AI Error:", error.message);
      res.status(500).json({ error: "Failed to analyze incident. Ensure GEMINI_API_KEY is set in environment." });
    }
  });

  // Mock data and algorithm endpoints...
  let mockAccidents = [
    { id: '1', lat: 33.6844, lng: 73.0479, severity: 'High', status: 'reported', description: 'Multi-vehicle collision' },
    { id: '2', lat: 33.7297, lng: 73.0740, severity: 'Medium', status: 'dispatching', description: 'Minor fender bender' }
  ];

  app.get("/api/accidents", (req, res) => {
    res.json(mockAccidents);
  });

  app.post("/api/accidents", (req, res) => {
    const newAccident = {
      id: Math.random().toString(36).substring(2, 11),
      ...req.body,
      status: 'reported',
      createdAt: new Date()
    };
    mockAccidents.push(newAccident);
    res.status(201).json(newAccident);
  });

  app.post("/api/optimize-route", (req, res) => {
    try {
      const { start, end, grid } = req.body;
      const graph = new Graph();
      if (grid && grid.nodes && grid.edges) {
        grid.nodes.forEach((n: any) => graph.addNode(n));
        grid.edges.forEach((e: any) => graph.addEdge(e.from, e.to, e.weight));
        const result = graph.dijkstra(start, end);
        return res.json(result);
      }
      res.json({ path: [], distance: 0, note: "Invalid grid configuration" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/hotspots", (req, res) => {
    try {
      const points = mockAccidents.map(a => ({ lat: a.lat, lng: a.lng }));
      if (points.length >= 2) {
        const clusters = KMeans.cluster(points, 2);
        return res.json(clusters);
      }
      res.json([]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite integration
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    console.log("Starting in DEVELOPMENT mode with Vite middleware");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in PRODUCTION mode");
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`>>> Emergency system operational on port ${PORT}`);
    console.log(`>>> Health check: http://0.0.0.0:${PORT}/api/health`);
  });
}

startServer().catch((err) => {
  console.error("FAILED TO START SERVER:", err);
  process.exit(1);
});
