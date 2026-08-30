import { Router } from "express";
import express from "express";
import {
    getDashboardStats,
    getListWarga,
    getDetailWarga,
    uploadWargaExcel,
    getDaftarProgramBansos,
    uploadBansosExcel,
    getListBansosPenerima,
    updateAccountSettings,
    getListPengusulan,
    getDetailPengusulan,
    updateStatusPengusulan,
    getGisPeta,
} from "../controllers/adminController.js";
import { authenticate } from "../middleware/authenticate.js";
import upload from "../middleware/uploadExcel.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { UPLOAD_ROOT_PENGUSULAN } from "../utils/uploadPaths.js";

const router = Router();

router.use(authenticate);

router.use("/pengusulan-files", express.static(UPLOAD_ROOT_PENGUSULAN));

// Dashboard
router.get("/dashboard/stats", asyncHandler(getDashboardStats));

// Data warga (read-only)
router.get("/warga", asyncHandler(getListWarga));
router.get("/warga/:id", asyncHandler(getDetailWarga));

// Upload excel data warga (BNBA)
router.post("/warga/upload", upload.single("file"), asyncHandler(uploadWargaExcel));

// Data bansos per program
router.get("/bansos/programs", asyncHandler(getDaftarProgramBansos));
router.get("/bansos/:slug", asyncHandler(getListBansosPenerima));
router.post("/bansos/:slug/upload", upload.single("file"), asyncHandler(uploadBansosExcel));

// Pengusulan bantuan sosial
router.get("/pengusulan", asyncHandler(getListPengusulan));
router.get("/pengusulan/:id", asyncHandler(getDetailPengusulan));
router.patch("/pengusulan/:id/status", asyncHandler(updateStatusPengusulan));

router.get("/gis", asyncHandler(getGisPeta));

// Pengaturan akun
router.patch("/account", asyncHandler(updateAccountSettings));

export default router;