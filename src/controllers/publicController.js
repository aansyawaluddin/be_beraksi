import fs from "fs";
import path from "path";
import prisma from "../lib/prisma.js";
import { success, error } from "../utils/response.js";
import { UPLOAD_ROOT_PENGUSULAN } from "../utils/uploadPaths.js";
import {
    isNilaiAktif,
    getDesilDeskripsi,
    parseDesil,
    maskNik,
} from "../utils/statusBantuan.js";

const JENIS_PENGUSULAN_VALID = ["DIRI_SENDIRI", "ORANG_LAIN"];
const JENIS_USULAN_VALID = ["INDIVIDU", "KELUARGA"];

export async function cekStatusByNik(req, res) {
    const { nik } = req.body;

    if (!nik || String(nik).trim() === "") {
        return error(res, "NIK wajib diisi", 400);
    }

    const nikBersih = String(nik).trim();

    if (!/^\d{16}$/.test(nikBersih)) {
        return error(res, "NIK harus terdiri dari 16 digit angka", 400);
    }

    const warga = await prisma.warga.findUnique({
        where: { nik: nikBersih },
        select: {
            nama: true,
            nik: true,
            kabupaten: true,
            kecamatan: true,
            desilTerbaru: true,
            pbiJk: true,
            bansosPkh: true,
            bansosSembako: true,
        },
    });

    if (!warga) {
        return error(res, "Data dengan NIK tersebut tidak ditemukan", 404);
    }

    const desil = parseDesil(warga.desilTerbaru);

    const programAktif = [];
    if (isNilaiAktif(warga.pbiJk)) programAktif.push("PBI-JK");
    if (isNilaiAktif(warga.bansosPkh)) programAktif.push("PKH");
    if (isNilaiAktif(warga.bansosSembako)) programAktif.push("Sembako");

    return success(res, {
        nik: maskNik(warga.nik),
        nama: warga.nama,
        lokasi: [warga.kecamatan, warga.kabupaten].filter(Boolean).join(", "),
        desil,
        desilDeskripsi: desil ? getDesilDeskripsi(desil) : null,
        programAktif,
    }, "Data ditemukan");
}

export async function getProgramBantuan(req, res) {
    const programBantuan = await prisma.programBantuan.findMany({
        where: { aktif: true },
        orderBy: { urutan: "asc" },
        select: { id: true, nama: true },
    });

    return success(res, programBantuan);
}

function simpanFileKeFolder(file, prefix, folderPenerima, nikPenerima) {
    const ext = path.extname(file.originalname) || "";
    const namaFile = `${prefix}_${Date.now()}${ext}`;
    fs.writeFileSync(path.join(folderPenerima, namaFile), file.buffer);
    return `${nikPenerima}/${namaFile}`;
}

function hapusFileJikaAda(relPath) {
    if (!relPath) return;
    const fullPath = path.join(UPLOAD_ROOT_PENGUSULAN, relPath);
    if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
    }
}

export async function createPengusulan(req, res) {
    const files = req.files || {};
    const fotoKtp = files.fotoKtp?.[0];
    const fotoKk = files.fotoKk?.[0];
    const fotoRumah = files.fotoRumah?.[0];

    const {
        jenisPengusulan,
        jenisUsulan,
        programId,
        namaPengusul,
        nikPengusul,
        namaCalonPenerima,
        nikCalonPenerima,
        kabupaten,
        nomorWhatsapp,
        keterangan,
    } = req.body;

    if (!JENIS_PENGUSULAN_VALID.includes(jenisPengusulan)) {
        return error(res, "Jenis pengusulan tidak valid", 400);
    }

    if (!JENIS_USULAN_VALID.includes(jenisUsulan)) {
        return error(res, "Jenis usulan (individu/keluarga) tidak valid", 400);
    }

    if (!namaPengusul || !nikPengusul || !kabupaten || !nomorWhatsapp) {
        return error(res, "Nama pengusul, NIK pengusul, kabupaten/kota, dan nomor WhatsApp wajib diisi", 400);
    }

    if (!programId) {
        return error(res, "Program bantuan wajib dipilih", 400);
    }

    if (!fotoKtp || !fotoKk || !fotoRumah) {
        return error(res, "KTP, KK, dan foto diri depan rumah wajib diupload", 400);
    }

    const nikPengusulBersih = String(nikPengusul).trim();
    if (!/^\d{16}$/.test(nikPengusulBersih)) {
        return error(res, "NIK pengusul harus terdiri dari 16 digit angka", 400);
    }

    if (!/^0\d{9,14}$/.test(String(nomorWhatsapp).trim())) {
        return error(res, "Nomor WhatsApp tidak valid", 400);
    }

    const isOrangLain = jenisPengusulan === "ORANG_LAIN";

    const namaCalonPenerimaFinal = isOrangLain ? namaCalonPenerima : namaPengusul;
    const nikCalonPenerimaRaw = isOrangLain ? nikCalonPenerima : nikPengusulBersih;

    if (isOrangLain && (!namaCalonPenerimaFinal || !nikCalonPenerimaRaw)) {
        return error(res, "Nama dan NIK calon penerima wajib diisi", 400);
    }

    const nikCalonPenerimaBersih = String(nikCalonPenerimaRaw).trim();
    if (!/^\d{16}$/.test(nikCalonPenerimaBersih)) {
        return error(res, "NIK calon penerima harus terdiri dari 16 digit angka", 400);
    }

    const program = await prisma.programBantuan.findFirst({
        where: { id: programId, aktif: true },
    });

    if (!program) {
        return error(res, "Program bantuan yang dipilih tidak ditemukan atau tidak aktif", 400);
    }

    const wargaCalonPenerima = await prisma.warga.findUnique({
        where: { nik: nikCalonPenerimaBersih },
        select: { desilTerbaru: true },
    });

    if (!wargaCalonPenerima) {
        return error(res, "NIK calon penerima tidak ditemukan dalam basis data DTKS", 404);
    }

    const desil = parseDesil(wargaCalonPenerima.desilTerbaru);
    if (!desil || desil < 1 || desil > 5) {
        return error(res, "Hanya warga dengan posisi Desil 1-5 yang berhak diusulkan", 403);
    }

    // Baru sampai sini semua valid -> tulis file ke folder per-NIK penerima
    const folderPenerima = path.join(UPLOAD_ROOT_PENGUSULAN, nikCalonPenerimaBersih);
    fs.mkdirSync(folderPenerima, { recursive: true });

    let relFotoKtp, relFotoKk, relFotoRumah;

    try {
        relFotoKtp = simpanFileKeFolder(fotoKtp, "ktp", folderPenerima, nikCalonPenerimaBersih);
        relFotoKk = simpanFileKeFolder(fotoKk, "kk", folderPenerima, nikCalonPenerimaBersih);
        relFotoRumah = simpanFileKeFolder(fotoRumah, "rumah", folderPenerima, nikCalonPenerimaBersih);
    } catch (err) {
        hapusFileJikaAda(relFotoKtp);
        hapusFileJikaAda(relFotoKk);
        hapusFileJikaAda(relFotoRumah);
        console.error("SIMPAN DOKUMEN PENGUSULAN ERROR:", err);
        return error(res, "Gagal menyimpan dokumen pengusulan", 500);
    }

    try {
        const pengusulan = await prisma.pengusulan.create({
            data: {
                jenisPengusulan,
                jenisUsulan,
                namaPengusul: String(namaPengusul).trim(),
                nikPengusul: nikPengusulBersih,
                namaCalonPenerima: String(namaCalonPenerimaFinal).trim(),
                nikCalonPenerima: nikCalonPenerimaBersih,
                programId: program.id,
                kabupaten: String(kabupaten).trim(),
                nomorWhatsapp: String(nomorWhatsapp).trim(),
                keterangan: keterangan ? String(keterangan).trim() : null,
                fotoKtp: relFotoKtp,
                fotoKk: relFotoKk,
                fotoRumah: relFotoRumah,
            },
        });

        return success(res, {
            id: pengusulan.id,
            status: pengusulan.status,
        }, "Pengusulan berhasil dikirim dan akan direview oleh admin", 201);
    } catch (err) {
        hapusFileJikaAda(relFotoKtp);
        hapusFileJikaAda(relFotoKk);
        hapusFileJikaAda(relFotoRumah);
        console.error("SIMPAN PENGUSULAN ERROR:", err);
        return error(res, "Gagal menyimpan data pengusulan", 500);
    }
}