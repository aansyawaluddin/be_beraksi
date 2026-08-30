import { Router } from "express";
import {
    cekStatusByNik,
    getProgramBantuan,
    cekKelayakanNik,
    createPengusulan,
} from "../controllers/publicController.js";
import { uploadDokumenPengusulan } from "../middleware/uploadDokumenPengusulan.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post("/cek-status", asyncHandler(cekStatusByNik));

router.get("/program-bantuan", asyncHandler(getProgramBantuan));
router.post("/pengusulan/cek-nik", asyncHandler(cekKelayakanNik));
router.post("/pengusulan", uploadDokumenPengusulan, asyncHandler(createPengusulan));

export default router;