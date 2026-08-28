import multer from "multer";

const ALLOWED_MIME = ["image/jpeg", "image/jpg", "image/png"];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, 
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Dokumen harus berformat JPG atau PNG"));
        }
    },
});

export const uploadDokumenPengusulan = upload.fields([
    { name: "fotoKtp", maxCount: 1 },
    { name: "fotoKk", maxCount: 1 },
    { name: "fotoRumah", maxCount: 1 },
]);

export default uploadDokumenPengusulan;