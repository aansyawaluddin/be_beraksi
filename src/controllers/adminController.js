import bcrypt from "bcryptjs";
import fs from "fs";
import XLSX from "xlsx";
import prisma from "../lib/prisma.js";
import { success, error } from "../utils/response.js";
import { mapExcelRowToWarga } from "../utils/wargaMapper.js";
import { mapExcelRowToBansos } from "../utils/bansosMapper.js";
import { cariBansosDiterima } from "../utils/cariBansosDiterima.js";
import { WILAYAH_SULTENG } from "../constants/wilayahSulteng.js";
import { cocokkanWilayah } from "../utils/wilayahMatcher.js";
import { parseDesil } from "../utils/statusBantuan.js";
import { isAktifWhere, buildSebaranPerDesil } from "../utils/wargaStats.js";
import { BANSOS_PROGRAMS, getBansosProgramBySlug } from "../constants/bansosPrograms.js";
import {
    STATUS_PENGUSULAN_UPDATE_VALID,
    formatRingkasanPengusulan,
    formatDetailPengusulan,
} from "../utils/pengusulanMapper.js";

export async function getDashboardStats(req, res) {
    const usia60TahunLalu = new Date();
    usia60TahunLalu.setFullYear(usia60TahunLalu.getFullYear() - 60);

    const [
        totalWarga,
        disabilitasCount,
        lansiaCount,
        desilGroups,
        bansosCounts,
    ] = await Promise.all([
        prisma.warga.count(),
        prisma.warga.count({ where: isAktifWhere("disabilitas") }),
        prisma.warga.count({
            where: { tanggalLahir: { lte: usia60TahunLalu } },
        }),
        prisma.warga.groupBy({
            by: ["desilTerbaru"],
            _count: { _all: true },
        }),
        Promise.all(
            BANSOS_PROGRAMS.map(async (program) => ({
                bidang: program.bidang,
                jumlah: await prisma[program.model].count(),
            }))
        ),
    ]);

    const sebaranPerDesil = buildSebaranPerDesil(desilGroups);

    const bansosPerBidang = {};
    let totalPenyaluranBansos = 0;
    for (const { bidang, jumlah } of bansosCounts) {
        bansosPerBidang[bidang] = (bansosPerBidang[bidang] || 0) + jumlah;
        totalPenyaluranBansos += jumlah;
    }

    return success(res, {
        totalWarga,
        jumlahLansia: lansiaCount,
        penyandangDisabilitas: disabilitasCount,
        sebaranPerDesil,
        totalPenyaluranBansos,
        bansosPerBidang: Object.entries(bansosPerBidang).map(([bidang, jumlah]) => ({ bidang, jumlah })),
    });
}


export async function getListWarga(req, res) {
    const { search = "", page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (pageNum - 1) * limitNum;

    const keyword = String(search).trim();

    const where = keyword
        ? {
            OR: [
                { nama: { contains: keyword } },
                { nik: { contains: keyword } },
                { kabupaten: { contains: keyword } },
                { kecamatan: { contains: keyword } },
                { desaKelurahan: { contains: keyword } },
            ],
        }
        : {};

    const [total, data] = await Promise.all([
        prisma.warga.count({ where }),
        prisma.warga.findMany({
            where,
            orderBy: { nama: "asc" },
            skip,
            take: limitNum,
            select: {
                id: true,
                nama: true,
                nik: true,
                kabupaten: true,
                kecamatan: true,
                desaKelurahan: true,
                desilTerbaru: true,
                updatedAt: true,
            },
        }),
    ]);

    return success(res, {
        data,
        pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.max(Math.ceil(total / limitNum), 1),
        },
    });
}

export async function getDetailWarga(req, res) {
    const { id } = req.params;
    const idNum = parseInt(id, 10);

    if (Number.isNaN(idNum)) {
        return error(res, "ID warga tidak valid", 400);
    }

    const warga = await prisma.warga.findUnique({
        where: { id: idNum },
        select: {
            id: true,
            nama: true,
            nik: true,
            nomorKK: true,
            provinsi: true,
            kabupaten: true,
            kecamatan: true,
            desaKelurahan: true,
            alamat: true,
            dusun: true,
            rw: true,
            rt: true,
            desilTerbaru: true,
            jenisKelamin: true,
            tanggalLahir: true,
            umur: true,
            statusPerkawinan: true,
            hubunganKeluarga: true,
            lanjutUsia: true,
            disabilitas: true,
            keteranganDisabilitas: true,
        },
    });

    if (!warga) {
        return error(res, "Data warga tidak ditemukan", 404);
    }

    const bansosDiterima = await cariBansosDiterima(warga.nik);

    return success(res, {
        ...warga,
        bansosDiterima,
    });
}


export async function uploadWargaExcel(req, res) {
    if (!req.file) {
        return error(res, "File Excel wajib diupload", 400);
    }

    let rows;
    try {
        const fileBuffer = fs.readFileSync(req.file.path);
        const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
    } catch (err) {
        console.error("XLSX READ ERROR:", err);
        return error(res, "Gagal membaca file Excel, pastikan formatnya benar", 400, err.message);
    }

    if (!rows || rows.length === 0) {
        return error(res, "File Excel kosong atau tidak ada baris data", 400);
    }

    res.status(200);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const heartbeat = setInterval(() => {
        console.log("[upload-warga] heartbeat...");
        res.write(" ");
    }, 10000);

    const t0 = Date.now();

    try {
        const gagal = [];

        const validRows = [];
        const nikTerlihat = new Set();

        for (let i = 0; i < rows.length; i++) {
            const nomorBaris = i + 2;
            const { valid, alasan, data } = mapExcelRowToWarga(rows[i]);

            if (!valid) {
                gagal.push({ baris: nomorBaris, alasan });
                continue;
            }
            if (nikTerlihat.has(data.nik)) {
                gagal.push({ baris: nomorBaris, alasan: `NIK ${data.nik} duplikat di dalam file ini` });
                continue;
            }
            nikTerlihat.add(data.nik);
            validRows.push({ nomorBaris, data });
        }

        console.log(`[upload-warga] validasi selesai: ${validRows.length} valid, ${gagal.length} gagal (${Date.now() - t0}ms)`);

        const CHUNK_CEK = 2000;
        const nikSudahAda = new Set();
        for (let i = 0; i < validRows.length; i += CHUNK_CEK) {
            const batchNik = validRows.slice(i, i + CHUNK_CEK).map((v) => v.data.nik);
            const existing = await prisma.warga.findMany({
                where: { nik: { in: batchNik } },
                select: { nik: true },
            });
            existing.forEach((w) => nikSudahAda.add(w.nik));
        }

        console.log(`[upload-warga] cek existing selesai: ${nikSudahAda.size} sudah ada (${Date.now() - t0}ms)`);

        const toCreate = validRows.filter((v) => !nikSudahAda.has(v.data.nik));
        const toUpdate = validRows.filter((v) => nikSudahAda.has(v.data.nik));

        let inserted = 0;
        const CHUNK_INSERT = 1000;
        for (let i = 0; i < toCreate.length; i += CHUNK_INSERT) {
            const batch = toCreate.slice(i, i + CHUNK_INSERT);
            try {
                const result = await prisma.warga.createMany({
                    data: batch.map((v) => ({ ...v.data, createdById: req.user.id })),
                    skipDuplicates: true,
                });
                inserted += result.count;
            } catch (err) {
                console.error("BULK INSERT WARGA ERROR:", err);
                batch.forEach((v) => gagal.push({ baris: v.nomorBaris, alasan: "Gagal menyimpan (batch insert)" }));
            }
        }

        console.log(`[upload-warga] insert selesai: ${inserted} baris (${Date.now() - t0}ms)`);

        let updated = 0;
        for (const v of toUpdate) {
            try {
                await prisma.warga.update({
                    where: { nik: v.data.nik },
                    data: { ...v.data, createdById: req.user.id },
                });
                updated += 1;
            } catch (err) {
                gagal.push({ baris: v.nomorBaris, alasan: "Gagal menyimpan ke database" });
            }
        }

        console.log(`[upload-warga] SELESAI: +${inserted} update${updated} (${Date.now() - t0}ms)`);

        clearInterval(heartbeat);
        res.end(JSON.stringify({
            success: true,
            message: "Upload data warga selesai diproses",
            data: {
                fileTersimpan: req.file.filename,
                totalBaris: rows.length,
                berhasilDitambahkan: inserted,
                berhasilDiperbarui: updated,
                gagal,
            },
        }));
    } catch (err) {
        console.error("UPLOAD WARGA FATAL ERROR:", err);
        clearInterval(heartbeat);
        res.end(JSON.stringify({
            success: false,
            message: err.message || "Terjadi kesalahan tak terduga saat memproses file",
        }));
    }
}

export async function getDaftarProgramBansos(req, res) {
    return success(res, BANSOS_PROGRAMS.map(({ slug, nama, bidang }) => ({ slug, nama, bidang })));
}

export async function uploadBansosExcel(req, res) {
    const program = getBansosProgramBySlug(req.params.slug);

    if (!program) {
        return error(res, "Program bansos tidak dikenali", 404);
    }

    if (!req.file) {
        return error(res, "File Excel wajib diupload", 400);
    }

    const delegate = prisma[program.model];

    let rows;
    try {
        const fileBuffer = fs.readFileSync(req.file.path);
        const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
    } catch (err) {
        console.error("XLSX READ ERROR:", err);
        return error(res, "Gagal membaca file Excel, pastikan formatnya benar", 400, err.message);
    }

    if (!rows || rows.length === 0) {
        return error(res, "File Excel kosong atau tidak ada baris data", 400);
    }

    res.status(200);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const heartbeat = setInterval(() => {
        res.write(" ");
    }, 10000);

    const t0 = Date.now();
    const kunci = (nik, tahun) => `${nik}|${tahun ?? ""}`;

    try {
        const gagal = [];

        const validRows = [];
        const kunciTerlihat = new Set();

        for (let i = 0; i < rows.length; i++) {
            const nomorBaris = i + 2;
            const { valid, alasan, data } = mapExcelRowToBansos(rows[i]);

            if (!valid) {
                gagal.push({ baris: nomorBaris, alasan });
                continue;
            }
            const k = kunci(data.nik, data.tahunBantuan);
            if (kunciTerlihat.has(k)) {
                gagal.push({ baris: nomorBaris, alasan: `NIK ${data.nik} (tahun ${data.tahunBantuan ?? "-"}) duplikat di dalam file ini` });
                continue;
            }
            kunciTerlihat.add(k);
            validRows.push({ nomorBaris, data });
        }

        console.log(`[upload-bansos:${program.slug}] validasi selesai: ${validRows.length} valid, ${gagal.length} gagal (${Date.now() - t0}ms)`);

        const CHUNK_CEK = 2000;
        const existingMap = new Map();
        for (let i = 0; i < validRows.length; i += CHUNK_CEK) {
            const batchNik = [...new Set(validRows.slice(i, i + CHUNK_CEK).map((v) => v.data.nik))];
            const existing = await delegate.findMany({
                where: { nik: { in: batchNik } },
                select: { id: true, nik: true, tahunBantuan: true },
            });
            existing.forEach((row) => existingMap.set(kunci(row.nik, row.tahunBantuan), row.id));
        }

        console.log(`[upload-bansos:${program.slug}] cek existing selesai: ${existingMap.size} sudah ada (${Date.now() - t0}ms)`);

        const toCreate = [];
        const toUpdate = [];
        for (const v of validRows) {
            const existingId = existingMap.get(kunci(v.data.nik, v.data.tahunBantuan));
            if (existingId) {
                toUpdate.push({ ...v, existingId });
            } else {
                toCreate.push(v);
            }
        }

        let inserted = 0;
        const CHUNK_INSERT = 1000;
        for (let i = 0; i < toCreate.length; i += CHUNK_INSERT) {
            const batch = toCreate.slice(i, i + CHUNK_INSERT);
            try {
                const result = await delegate.createMany({
                    data: batch.map((v) => ({ ...v.data, createdById: req.user.id })),
                    skipDuplicates: true,
                });
                inserted += result.count;
            } catch (err) {
                console.error("BULK INSERT BANSOS ERROR:", err);
                batch.forEach((v) => gagal.push({ baris: v.nomorBaris, alasan: "Gagal menyimpan (batch insert)" }));
            }
        }

        console.log(`[upload-bansos:${program.slug}] insert selesai: ${inserted} baris (${Date.now() - t0}ms)`);

        let updated = 0;
        for (const v of toUpdate) {
            try {
                await delegate.update({
                    where: { id: v.existingId },
                    data: { ...v.data, createdById: req.user.id },
                });
                updated += 1;
            } catch (err) {
                gagal.push({ baris: v.nomorBaris, alasan: "Gagal menyimpan ke database" });
            }
        }

        console.log(`[upload-bansos:${program.slug}] SELESAI: +${inserted} update${updated} (${Date.now() - t0}ms)`);

        clearInterval(heartbeat);
        res.end(JSON.stringify({
            success: true,
            message: `Upload data ${program.nama} selesai diproses`,
            data: {
                program: program.nama,
                fileTersimpan: req.file.filename,
                totalBaris: rows.length,
                berhasilDitambahkan: inserted,
                berhasilDiperbarui: updated,
                gagal,
            },
        }));
    } catch (err) {
        console.error(`[upload-bansos:${program.slug}] FATAL:`, err);
        clearInterval(heartbeat);
        res.end(JSON.stringify({
            success: false,
            message: err.message || "Terjadi kesalahan tak terduga saat memproses file",
        }));
    }
}

export async function getListBansosPenerima(req, res) {
    const program = getBansosProgramBySlug(req.params.slug);

    if (!program) {
        return error(res, "Program bansos tidak dikenali", 404);
    }

    const delegate = prisma[program.model];
    const { search = "", page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (pageNum - 1) * limitNum;

    const keyword = String(search).trim();

    const where = keyword
        ? {
            OR: [
                { nama: { contains: keyword } },
                { nik: { contains: keyword } },
                { kabupaten: { contains: keyword } },
                { desaKelurahan: { contains: keyword } },
            ],
        }
        : {};

    const [total, data] = await Promise.all([
        delegate.count({ where }),
        delegate.findMany({
            where,
            orderBy: { updatedAt: "desc" },
            skip,
            take: limitNum,
        }),
    ]);

    return success(res, {
        program: program.nama,
        data,
        pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.max(Math.ceil(total / limitNum), 1),
        },
    });
}

export async function updateAccountSettings(req, res) {
    const { email, currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword) {
        return error(res, "Kata sandi saat ini wajib diisi untuk menyimpan perubahan", 400);
    }

    const admin = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (!admin) {
        return error(res, "Akun tidak ditemukan", 404);
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, admin.password);
    if (!isPasswordValid) {
        return error(res, "Kata sandi saat ini salah", 401);
    }

    const dataToUpdate = {};

    if (email && email.trim() !== "" && email.trim() !== admin.email) {
        const emailTaken = await prisma.user.findUnique({ where: { email: email.trim() } });
        if (emailTaken) {
            return error(res, "Email sudah digunakan akun lain", 409);
        }
        dataToUpdate.email = email.trim();
    }

    if (newPassword || confirmNewPassword) {
        if (!newPassword || !confirmNewPassword) {
            return error(res, "Kata sandi baru dan konfirmasinya wajib diisi bersamaan", 400);
        }
        if (newPassword !== confirmNewPassword) {
            return error(res, "Konfirmasi kata sandi baru tidak cocok", 400);
        }
        if (newPassword.length < 6) {
            return error(res, "Kata sandi baru minimal 6 karakter", 400);
        }
        dataToUpdate.password = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(dataToUpdate).length === 0) {
        return error(res, "Tidak ada perubahan yang dikirim", 400);
    }

    const updated = await prisma.user.update({
        where: { id: admin.id },
        data: dataToUpdate,
        select: { id: true, nama: true, email: true, role: true },
    });

    return success(res, updated, "Pengaturan akun berhasil diperbarui");
}

export async function getDashboardPengusulan(req, res) {
    const [totalMasuk, menungguReview, disetujui, ditolak] = await Promise.all([
        prisma.pengusulan.count(),
        prisma.pengusulan.count({ where: { status: "MENUNGGU_REVIEW" } }),
        prisma.pengusulan.count({ where: { status: "DISETUJUI" } }),
        prisma.pengusulan.count({ where: { status: "DITOLAK" } }),
    ]);

    return success(res, {
        totalMasuk,
        menungguReview,
        disetujui,
        ditolak,
    });
}

export async function getListPengusulan(req, res) {
    const { status, page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (pageNum - 1) * limitNum;

    const where = status ? { status } : {};

    const [total, data] = await Promise.all([
        prisma.pengusulan.count({ where }),
        prisma.pengusulan.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip,
            take: limitNum,
            include: {
                program: { select: { nama: true } },
            },
        }),
    ]);

    return success(res, {
        data: data.map(formatRingkasanPengusulan),
        pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.max(Math.ceil(total / limitNum), 1),
        },
    });
}

export async function getDetailPengusulan(req, res) {
    const { id } = req.params;

    const pengusulan = await prisma.pengusulan.findUnique({
        where: { id },
        include: {
            program: { select: { id: true, nama: true } },
        },
    });

    if (!pengusulan) {
        return error(res, "Data pengusulan tidak ditemukan", 404);
    }

    return success(res, formatDetailPengusulan(pengusulan));
}

export async function updateStatusPengusulan(req, res) {
    const { id } = req.params;
    const { status, catatanAdmin } = req.body;

    if (!STATUS_PENGUSULAN_UPDATE_VALID.includes(status)) {
        return error(res, "Status harus DISETUJUI atau DITOLAK", 400);
    }

    const pengusulan = await prisma.pengusulan.findUnique({ where: { id } });

    if (!pengusulan) {
        return error(res, "Data pengusulan tidak ditemukan", 404);
    }

    const updated = await prisma.pengusulan.update({
        where: { id },
        data: {
            status,
            catatanAdmin: catatanAdmin ? String(catatanAdmin).trim() : null,
            diprosesAt: new Date(),
        },
    });

    const pesan = status === "DISETUJUI"
        ? "Pengusulan berhasil disetujui"
        : "Pengusulan berhasil ditolak";

    return success(res, updated, pesan);
}

const CHUNK_CEK_GIS = 2000;

async function hitungRingkasanGisPerWilayah() {
    const hasilPerProgram = await Promise.all(
        BANSOS_PROGRAMS.map((program) =>
            prisma[program.model].findMany({
                select: { nik: true, kabupaten: true },
                distinct: ["nik"],
                orderBy: { updatedAt: "desc" },
            })
        )
    );

    const nikPerWilayah = new Map();
    const nikTanpaWilayah = new Set();

    for (const rows of hasilPerProgram) {
        for (const { nik, kabupaten } of rows) {
            if (!nik) continue;
            const wilayah = cocokkanWilayah(kabupaten);
            if (!wilayah) {
                nikTanpaWilayah.add(nik);
                continue;
            }
            if (!nikPerWilayah.has(wilayah.key)) nikPerWilayah.set(wilayah.key, new Set());
            nikPerWilayah.get(wilayah.key).add(nik);
        }
    }

    const semuaNik = Array.from(
        new Set(Array.from(nikPerWilayah.values()).flatMap((set) => Array.from(set)))
    );

    const desilPerNik = new Map();
    for (let i = 0; i < semuaNik.length; i += CHUNK_CEK_GIS) {
        const batch = semuaNik.slice(i, i + CHUNK_CEK_GIS);
        const wargaBatch = await prisma.warga.findMany({
            where: { nik: { in: batch } },
            select: { nik: true, desilTerbaru: true },
        });
        wargaBatch.forEach((w) => desilPerNik.set(w.nik, parseDesil(w.desilTerbaru)));
    }

    const wilayah = WILAYAH_SULTENG.map((w) => {
        const nikSet = nikPerWilayah.get(w.key) || new Set();
        const jumlahPenerima = nikSet.size;

        const nilaiDesil = Array.from(nikSet)
            .map((nik) => desilPerNik.get(nik))
            .filter((d) => d !== null && d !== undefined && d >= 1 && d <= 10);

        const rataRataDesil = nilaiDesil.length > 0
            ? Math.round((nilaiDesil.reduce((a, b) => a + b, 0) / nilaiDesil.length) * 10) / 10
            : null;

        return {
            kabupaten: w.nama,
            jumlahPenerima,
            rataRataDesil,
        };
    });

    return { wilayah, tidakDikenali: nikTanpaWilayah.size };
}

export async function getGisPeta(req, res) {
    const { wilayah, tidakDikenali } = await hitungRingkasanGisPerWilayah();

    const peta = wilayah.map(({ kabupaten, jumlahPenerima }) => ({
        kabupaten,
        jumlahPenerima,
    }));

    const rataRataDesilPerWilayah = wilayah.map(({ kabupaten, rataRataDesil }) => ({
        kabupaten,
        rataRataDesil,
    }));

    const tabel = wilayah.map(({ kabupaten, jumlahPenerima, rataRataDesil }) => ({
        kabupaten,
        jumlahPenerima,
        rataRataDesil,
    }));

    const totalPenerima = wilayah.reduce((total, w) => total + w.jumlahPenerima, 0);

    return success(res, {
        totalPenerima,
        peta,
        rataRataDesilPerWilayah,
        tabel,
        ...(tidakDikenali > 0 ? { dataTanpaWilayahDikenali: tidakDikenali } : {}),
    });
}