# Smart Emergency Response System (SERS)

SERS is a production-grade intelligent platform designed to optimize urban traffic accident responses using advanced Design and Analysis of Algorithms (DAA) concepts.

## 🚀 Features

- **Live Emergency Dashboard**: Real-time tracking of accidents and responder status.
- **Intelligent Dispatching**: Automated ambulance assignment using Greedy Assignment algorithms.
- **Optimized Routing**: Precision pathfinding using Dijkstra's Algorithm for the fastest emergency routes.
- **Accident Analytics**: Hotspot detection using K-Means Clustering on historical accident data.
- **Resource Management**: Real-time management of hospital beds and ambulance availability.

## 🛠 Tech Stack

- **Frontend**: React, Tailwind CSS, Framer Motion, Recharts
- **Mapping**: Leaflet + OpenStreetMap
- **Backend**: Node.js, Express
- **Database**: Supabase (PostgreSQL)
- **State Management**: Zustand
- **Algorithms**: Custom Dijkstra, K-Means, and Greedy Assignment implementations

## 🧠 DAA Concepts Applied

1. **Shortest Path (Dijkstra)**: Used in the route optimization engine to calculate the weighted shortest path between ambulances, accident sites, and hospitals.
2. **Clustering (K-Means)**: Applied in the analytics module to group accident data into geographical hotspots for proactive resource placement.
3. **Assignment Problem (Greedy)**: Implemented for the emergency assignment engine to pair available ambulances with incidents based on real-time distance.

## 📦 Setup & Deployment

1. **Database Setup**: Run the provided `schema.sql` in your Supabase SQL Editor.
2. **Environment Variables**: Update `.env` with your `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
3. **Installation**: `npm install`
4. **Development**: `npm run dev`
5. **Production**: `npm run build && npm start`

## ☁️ Vercel Deployment

1. **GitHub Import**: Push your code to a GitHub repository.
2. **Vercel Project**: Import the repository into Vercel.
3. **Environment Variables**: Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Vercel project settings.
4. **Build Settings**: Vercel will automatically detect the Vite project. Use the default build command and output directory (`dist`).
5. **API Support**: The project includes an `api/` directory which Vercel will automatically deploy as Serverless Functions to handle the algorithm logic.

---
Built by Wamiq Abdullah as a DAA University Project.
