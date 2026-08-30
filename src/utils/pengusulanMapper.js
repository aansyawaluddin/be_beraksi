import fs from "fs";
import path from "path";
import { UPLOAD_ROOT_PENGUSULAN } from "./uploadPaths.js";
import { getBansosProgramBySlug } from "../constants/bansosPrograms.js";

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

export function urlDokumen(relPath) {
    if (!relPath) return null;

    const fullPath = path.join(UPLOAD_ROOT_PENGUSULAN, relPath);
    if (!fullPath.startsWith(UPLOAD_ROOT_PENGUSULAN) || !fs.existsSync(fullPath)) {
        return null;
    }

    return `/admin/pengusulan-files/${relPath.replace(/\\/g, "/")}`;
}

export function buildDokumenChecklist(pengusulan) {
    const urlDokumenMap = {
        ktp: urlDokumen(pengusulan.fotoKtp),
        kk: urlDokumen(pengusulan.fotoKk),
        rumah: urlDokumen(pengusulan.fotoRumah),
    };

    const dokumen = Object.entries(urlDokumenMap).map(([jenis, url]) => ({
        jenis,
        label: DOKUMEN_LABEL[jenis],
        sudahDiunggah: Boolean(url),
        url,
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

function resolveProgram(programSlug) {
    const program = getBansosProgramBySlug(programSlug);

    return program
        ? { slug: program.slug, nama: program.nama, bidang: program.bidang }
        : { slug: programSlug, nama: programSlug, bidang: null };
}

export function formatTanggalSingkat(date) {
    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(date);
}

export function formatRingkasanPengusulan(pengusulan) {
    return {
        id: pengusulan.id,
        namaPenerima: pengusulan.namaCalonPenerima,
        nikPenerima: pengusulan.nikCalonPenerima,
        jenisUsulanLabel: JENIS_USULAN_LABEL[pengusulan.jenisUsulan] || pengusulan.jenisUsulan,
        program: resolveProgram(pengusulan.programSlug).nama,
        kabupaten: pengusulan.kabupaten,
        nomorWhatsapp: pengusulan.nomorWhatsapp,
        tanggalFormatted: formatTanggalSingkat(pengusulan.createdAt),
        status: pengusulan.status,
        statusLabel: STATUS_LABEL[pengusulan.status] || pengusulan.status,
    };
}

export function formatDetailPengusulan(pengusulan) {
    const { fotoKtp, fotoKk, fotoRumah, ...pengusulanTanpaPathFoto } = pengusulan;
    const { dokumen, kelengkapanDokumen } = buildDokumenChecklist(pengusulan);

    return {
        ...pengusulanTanpaPathFoto,
        program: resolveProgram(pengusulan.programSlug),
        nomorPengusulan: formatNomorPengusulan(pengusulan.id),
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