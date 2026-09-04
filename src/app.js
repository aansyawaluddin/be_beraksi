import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import { error } from "./utils/response.js";
import { requestLogger } from "./middleware/requestLogger.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/public", publicRoutes);

// 404 handler
app.use((req, res) => {
    return error(res, "Endpoint tidak ditemukan", 404);
});

// Error handler global
app.use((err, req, res, next) => {
    console.error(err);
    return error(res, err.message || "Terjadi kesalahan pada server", 500);
});

export default app;