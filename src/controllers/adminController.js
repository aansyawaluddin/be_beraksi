import bcrypt from "bcryptjs";
import fs from "fs";
import XLSX from "xlsx";
import prisma from "../lib/prisma.js";
import { success, error } from "../utils/response.js";
import { mapExcelRowToWarga } from "../utils/wargaMapper.js";
import { isAktifWhere, buildSebaranPerDesil } from "../utils/wargaStats.js";
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
        pbiJkCount,
        pkhCount,
        sembakoCount,
        penerimaAktifCount,
        lansiaCount,
        desilGroups,
    ] = await Promise.all([
        prisma.warga.count(),
        prisma.warga.count({ where: isAktifWhere("disabilitas") }),
        prisma.warga.count({ where: isAktifWhere("pbiJk") }),
        prisma.warga.count({ where: isAktifWhere("bansosPkh") }),
        prisma.warga.count({ where: isAktifWhere("bansosSembako") }),
        prisma.warga.count({
            where: {
                OR: [
                    isAktifWhere("pbiJk"),
                    isAktifWhere("bansosPkh"),
                    isAktifWhere("bansosSembako"),
                ],
            },
        }),
        prisma.warga.count({
            where: { tanggalLahir: { lte: usia60TahunLalu } },
        }),
        prisma.warga.groupBy({
            by: ["desilTerbaru"],
            _count: { _all: true },
        }),
    ]);

    const sebaranPerDesil = buildSebaranPerDesil(desilGroups);

    return success(res, {
        totalWarga,
        penerimaBantuanAktif: penerimaAktifCount,
        jumlahLansia: lansiaCount,
        penyandangDisabilitas: disabilitasCount,
        sebaranPerDesil,
        statusBantuanSosial: [
            { program: "PBI-JK", jumlah: pbiJkCount },
            { program: "PKH", jumlah: pkhCount },
            { program: "Sembako", jumlah: sembakoCount },
        ],
    });
}


export async function getListWarga(req, res) {
    const { search = "", page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
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
            orderBy: { updatedAt: "desc" },
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
                pbiJk: true,
                bansosPkh: true,
                bansosSembako: true,
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

    let inserted = 0;
    let updated = 0;
    const gagal = [];

    for (let i = 0; i < rows.length; i++) {
        const nomorBaris = i + 2;
        const { valid, data } = mapExcelRowToWarga(rows[i]);

        if (!valid) {
            gagal.push({
                baris: nomorBaris,
                alasan: "NIK, Nomor KK, atau Nama kosong/tidak valid",
            });
            continue;
        }

        try {
            const existing = await prisma.warga.findUnique({
                where: { nik: data.nik },
                select: { id: true },
            });

            if (existing) {
                await prisma.warga.update({
                    where: { nik: data.nik },
                    data: { ...data, createdById: req.user.id },
                });
                updated += 1;
            } else {
                await prisma.warga.create({
                    data: { ...data, createdById: req.user.id },
                });
                inserted += 1;
            }
        } catch (err) {
            gagal.push({ baris: nomorBaris, alasan: "Gagal menyimpan ke database" });
        }
    }

    return success(res, {
        fileTersimpan: req.file.filename,
        totalBaris: rows.length,
        berhasilDitambahkan: inserted,
        berhasilDiperbarui: updated,
        gagal,
    }, "Upload data warga selesai diproses");
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
    const { status, page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
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