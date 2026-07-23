import prisma from "../lib/prisma.js";
import { success, error } from "../utils/response.js";
import {
    isNilaiAktif,
    getDesilDeskripsi,
    parseDesil,
    maskNik,
} from "../utils/statusBantuan.js";

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