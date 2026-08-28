import fs from "fs";
import path from "path";
import { UPLOAD_ROOT_PENGUSULAN } from "./uploadPaths.js";

export const STATUS_PENGUSULAN_UPDATE_VALID = ["DISETUJUI", "DITOLAK"];

export const STATUS_LABEL = {
    MENUNGGU_REVIEW: "Menunggu Review",
    DISETUJUI: "Disetujui",
    DITOLAK: "Ditolak",
};

export const JENIS_USULAN_LABEL = {
    INDIVIDU: "Individu",
    KELUARGA: "Keluarga",
};

export const JENIS_PENGUSULAN_LABEL = {
    DIRI_SENDIRI: "Diri Sendiri",
    ORANG_LAIN: "Orang Lain",
};

export const DOKUMEN_LABEL = {
    ktp: "KTP",
    kk: "Kartu Keluarga (KK)",
    rumah: "Foto Diri di Depan Rumah",
};

export function formatNomorPengusulan(nomorUrut) {
    return `PG-${String(nomorUrut).padStart(4, "0")}`;
}

export function bacaDokumenSebagaiDataUrl(relPath) {
    if (!relPath) return null;

    const fullPath = path.join(UPLOAD_ROOT_PENGUSULAN, relPath);

    if (!fullPath.startsWith(UPLOAD_ROOT_PENGUSULAN) || !fs.existsSync(fullPath)) {
        return null;
    }

    const ext = path.extname(fullPath).toLowerCase();
    const mime = ext === ".png" ? "image/png" : "image/jpeg";
    const base64 = fs.readFileSync(fullPath).toString("base64");

    return `data:${mime};base64,${base64}`;
}

export function buildDokumenChecklist(pengusulan) {
    const dataUrlDokumen = {
        ktp: bacaDokumenSebagaiDataUrl(pengusulan.fotoKtp),
        kk: bacaDokumenSebagaiDataUrl(pengusulan.fotoKk),
        rumah: bacaDokumenSebagaiDataUrl(pengusulan.fotoRumah),
    };

    const dokumen = Object.entries(dataUrlDokumen).map(([jenis, dataUrl]) => ({
        jenis,
        label: DOKUMEN_LABEL[jenis],
        sudahDiunggah: Boolean(dataUrl),
        dataUrl,
    }));

    const jumlahDokumenLengkap = dokumen.filter((d) => d.sudahDiunggah).length;

    return {
        dokumen,
        kelengkapanDokumen: {
            lengkap: jumlahDokumenLengkap,
            total: dokumen.length,
        },
    };
}

export function formatRingkasanPengusulan(pengusulan) {
    return {
        ...pengusulan,
        nomorPengusulan: formatNomorPengusulan(pengusulan.nomorUrut),
        statusLabel: STATUS_LABEL[pengusulan.status] || pengusulan.status,
    };
}

export function formatDetailPengusulan(pengusulan) {
    const { fotoKtp, fotoKk, fotoRumah, ...pengusulanTanpaPathFoto } = pengusulan;
    const { dokumen, kelengkapanDokumen } = buildDokumenChecklist(pengusulan);

    return {
        ...pengusulanTanpaPathFoto,
        nomorPengusulan: formatNomorPengusulan(pengusulan.nomorUrut),
        statusLabel: STATUS_LABEL[pengusulan.status] || pengusulan.status,
        jenisUsulanLabel: JENIS_USULAN_LABEL[pengusulan.jenisUsulan] || pengusulan.jenisUsulan,
        jenisPengusulanLabel: JENIS_PENGUSULAN_LABEL[pengusulan.jenisPengusulan] || pengusulan.jenisPengusulan,
        diajukanFormatted: new Intl.DateTimeFormat("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
        }).format(pengusulan.createdAt),
        dokumen,
        kelengkapanDokumen,
    };
}