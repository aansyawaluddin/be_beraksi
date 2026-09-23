import prisma from "../lib/prisma.js";
import { getBansosProgramBySlug } from "../constants/bansosPrograms.js";

export async function catatBansosDiterima(pengusulan, adminId, client = prisma) {
    const program = getBansosProgramBySlug(pengusulan.programSlug);

    if (!program) {
        throw new Error(
            `Program bansos dengan slug "${pengusulan.programSlug}" tidak dikenali di BANSOS_PROGRAMS`
        );
    }

    const warga = await client.warga.findUnique({
        where: { nik: pengusulan.nikCalonPenerima },
        select: { desaKelurahan: true },
    });

    const tahunBantuan = new Date().getFullYear();

    return client[program.model].upsert({
        where: {
            nik_tahunBantuan: {
                nik: pengusulan.nikCalonPenerima,
                tahunBantuan,
            },
        },
        create: {
            nik: pengusulan.nikCalonPenerima,
            nama: pengusulan.namaCalonPenerima,
            kabupaten: pengusulan.kabupaten,
            desaKelurahan: warga?.desaKelurahan ?? null,
            tahunBantuan,
            createdById: adminId,
        },
        update: {
            nama: pengusulan.namaCalonPenerima,
            kabupaten: pengusulan.kabupaten,
            desaKelurahan: warga?.desaKelurahan ?? null,
            createdById: adminId,
        },
    });
}