import { Router } from "express";
import { cekStatusByNik } from "../controllers/publicController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post("/cek-status", asyncHandler(cekStatusByNik));

export default router;