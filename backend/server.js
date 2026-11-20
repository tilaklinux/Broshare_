import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import authRoutes from './routes/auth.js';
import itemRoutes from './routes/items.js';
import messageRoutes from './routes/messages.js';
import proposals from "./routes/proposals.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images statically
app.use("/uploads", express.static(join(__dirname, "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/proposals", proposals);
app.use("/api/items", itemRoutes);
app.use('/api/messages', messageRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "HostelBarter API is running!" });
});

// Start server
app.listen(PORT, () => {
  console.log(`HostelBarter server running on http://localhost:${PORT}`);
});
