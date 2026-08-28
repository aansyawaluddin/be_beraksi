import { Router } from "express";
import {
    getDashboardStats,
    getListWarga,
    uploadWargaExcel,
    updateAccountSettings,
    getListPengusulan,
    getDetailPengusulan,
    updateStatusPengusulan,
} from "../controllers/adminController.js";
import { authenticate } from "../middleware/authenticate.js";
import upload from "../middleware/uploadExcel.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(authenticate);

// Dashboard
router.get("/dashboard/stats", asyncHandler(getDashboardStats));

// Data warga (read-only)
router.get("/warga", asyncHandler(getListWarga));

// Upload excel data warga
router.post("/warga/upload", upload.single("file"), asyncHandler(uploadWargaExcel));

// Pengusulan bantuan sosial
router.get("/pengusulan", asyncHandler(getListPengusulan));
router.get("/pengusulan/:id", asyncHandler(getDetailPengusulan));
router.patch("/pengusulan/:id/status", asyncHandler(updateStatusPengusulan));

// Pengaturan akun
router.patch("/account", asyncHandler(updateAccountSettings));

export default router;