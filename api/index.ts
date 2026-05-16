import express from "express";
import { Graph } from "../algorithms/dijkstra";
import { KMeans } from "../algorithms/clustering";
import { GoogleGenAI } from "@google/genai";

const app = express();
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
  res.json({ status: "ok", uptime: process.uptime(), env: "vercel" });
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
    res.status(500).json({ error: "Failed to analyze incident. Ensure GEMINI_API_KEY is set in environment variables." });
  }
});

// Mock data
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

export default app;
