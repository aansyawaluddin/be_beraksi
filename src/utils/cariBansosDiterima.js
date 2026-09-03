import prisma from "../lib/prisma.js";
import { BANSOS_PROGRAMS } from "../constants/bansosPrograms.js";

export async function cariBansosDiterima(nik) {
    const hasil = await Promise.all(
        BANSOS_PROGRAMS.map(async (program) => {
            try {
                const rows = await prisma[program.model].findMany({
                    where: { nik },
                    select: { tahunBantuan: true },
                    orderBy: { tahunBantuan: "desc" },
                });
                return rows.map((row) => ({
                    program: program.nama,
                    bidang: program.bidang,
                    tahunBantuan: row.tahunBantuan,
                }));
            } catch (err) {
                console.error(`GAGAL CEK BANSOS (${program.slug}):`, err);
                return [];
            }
        })
    );

    return hasil.flat();
}

export async function cariDataPenerimaBansos(nik) {
    const hasilPerProgram = await Promise.all(
        BANSOS_PROGRAMS.map(async (program) => {
            try {
                return await prisma[program.model].findMany({
                    where: { nik },
                    select: {
                        nama: true,
                        kabupaten: true,
                        desaKelurahan: true,
                        tahunBantuan: true,
                        updatedAt: true,
                    },
                    orderBy: { tahunBantuan: "desc" },
                });
            } catch (err) {
                console.error(`GAGAL CEK BANSOS (${program.slug}):`, err);
                return [];
            }
        })
    );

    const semuaBaris = BANSOS_PROGRAMS.flatMap((program, idx) =>
        hasilPerProgram[idx].map((row) => ({
            ...row,
            program: program.nama,
            bidang: program.bidang,
        }))
    );

    const bansosDiterima = semuaBaris.map(({ program, bidang, tahunBantuan }) => ({
        program,
        bidang,
        tahunBantuan,
    }));

    let profil = null;
    for (const baris of semuaBaris) {
        if (!profil || new Date(baris.updatedAt) > new Date(profil.updatedAt)) {
            profil = baris;
        }
    }

    return {
        bansosDiterima,
        profil: profil
            ? { nama: profil.nama, kabupaten: profil.kabupaten, desaKelurahan: profil.desaKelurahan }
            : null,
    };
}