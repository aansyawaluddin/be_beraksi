import { Router } from "express";
import {
    getDashboardStats,
    getListWarga,
    uploadWargaExcel,
    updateAccountSettings,
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

// Pengaturan akun
router.patch("/account", asyncHandler(updateAccountSettings));

export default router;