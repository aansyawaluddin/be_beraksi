import { NILAI_TIDAK_AKTIF } from "./statusBantuan.js";

export function isAktifWhere(field) {
    return {
        AND: [
            { [field]: { not: null } },
            { NOT: { [field]: { in: NILAI_TIDAK_AKTIF } } },
        ],
    };
}

export function buildSebaranPerDesil(groups) {
    const sebaranMap = {};

    groups.forEach((g) => {
        const jumlah = g._count._all;
        const match = String(g.desilTerbaru || "").match(/\d+/);
        const angka = match ? parseInt(match[0], 10) : NaN;
        if (!isNaN(angka) && angka >= 1 && angka <= 10) {
            sebaranMap[String(angka)] = (sebaranMap[String(angka)] || 0) + jumlah;
        }
    });

    const sebaran = Array.from({ length: 5 }, (_, i) => {
        const desil = String(i + 1);
        return { desil, jumlah: sebaranMap[desil] || 0 };
    });

    const jumlahDesil6Sampai10 = [6, 7, 8, 9, 10].reduce(
        (total, d) => total + (sebaranMap[String(d)] || 0),
        0
    );
    sebaran.push({ desil: "6-10", jumlah: jumlahDesil6Sampai10 });

    return sebaran;
}