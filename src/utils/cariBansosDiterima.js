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