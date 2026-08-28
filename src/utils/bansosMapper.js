function normalizeHeader(header) {
    return String(header || "")
        .trim()
        .toLowerCase()
        .replace(/[_\-/]/g, " ")
        .replace(/\s+/g, " ");
}

const HEADER_TO_FIELD = {
    "nama penerima": "nama",
    nama: "nama",
    kabupaten: "kabupaten",
    "kelurahan desa": "desaKelurahan",
    "desa kelurahan": "desaKelurahan",
    kelurahan: "desaKelurahan",
    desa: "desaKelurahan",
    nik: "nik",
    "tahun bantuan": "tahunBantuanRaw",
    tahun: "tahunBantuanRaw",
};

function cleanString(value) {
    if (value === null || value === undefined) return null;
    const str = String(value).trim();
    return str === "" ? null : str;
}

function parseTahun(value) {
    if (value === null || value === undefined || value === "") return null;
    const n = parseInt(value, 10);
    return Number.isNaN(n) ? null : n;
}

export function mapExcelRowToBansos(row) {
    const mapped = {};

    for (const [rawHeader, rawValue] of Object.entries(row)) {
        const key = normalizeHeader(rawHeader);
        const field = HEADER_TO_FIELD[key];
        if (!field) continue;
        mapped[field] = rawValue;
    }

    const nik = cleanString(mapped.nik);

    return {
        valid: Boolean(nik && /^\d{16}$/.test(nik)),
        data: {
            nik,
            nama: cleanString(mapped.nama),
            kabupaten: cleanString(mapped.kabupaten),
            desaKelurahan: cleanString(mapped.desaKelurahan),
            tahunBantuan: parseTahun(mapped.tahunBantuanRaw),
        },
    };
}