export const NILAI_TIDAK_AKTIF = ["", "tidak", "tidak ada", "-", "0", "belum"];

export function isNilaiAktif(value) {
    if (value === null || value === undefined) return false;
    const v = String(value).trim().toLowerCase();
    return v !== "" && !NILAI_TIDAK_AKTIF.includes(v);
}

export function getDesilDeskripsi(desil) {
    if (desil >= 1 && desil <= 4) {
        return "Termasuk dalam 40% keluarga dengan tingkat kesejahteraan terbawah.";
    }
    if (desil >= 5 && desil <= 7) {
        return "Termasuk dalam 30% keluarga dengan tingkat kesejahteraan menengah.";
    }
    if (desil >= 8 && desil <= 10) {
        return "Termasuk dalam 30% keluarga dengan tingkat kesejahteraan teratas.";
    }
    return null;
}

export function parseDesil(value) {
    const match = String(value || "").match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
}

export function maskNik(nik) {
    if (!nik || nik.length < 8) return nik;
    return `${nik.slice(0, 4)}${"•".repeat(7)}${nik.slice(-4)}`;
}