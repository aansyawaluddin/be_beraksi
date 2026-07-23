function normalizeHeader(header) {
    return String(header || "")
        .trim()
        .toLowerCase()
        .replace(/[_-]/g, " ")
        .replace(/\s+/g, " ");
}

const HEADER_TO_FIELD = {
    kabupaten: "kabupaten",
    kecamatan: "kecamatan",
    "desa kelurahan": "desaKelurahan",
    alamat: "alamat",
    rw: "rw",
    rt: "rt",
    "desil terbaru": "desilTerbaru",
    "nomor kartu keluarga": "nomorKK",
    "nomor induk kependudukan": "nik",
    nama: "nama",
    "jenis kelamin": "jenisKelaminRaw",
    "tanggal lahir": "tanggalLahirRaw",
    "tempat lahir": "tempatLahir",
    "status perkawinan": "statusPerkawinan",
    "hubungan keluarga": "hubunganKeluarga",
    "keberadaan anggota keluarga": "keberadaanAnggotaKeluarga",
    disabilitas: "disabilitas",
    "keterangan disabilitas": "keteranganDisabilitas",
    "pbi jk": "pbiJk",
    "bansos pkh": "bansosPkh",
    "bansos sembako": "bansosSembako",
};

function normalizeJenisKelamin(value) {
    if (!value) return null;
    const v = String(value).trim().toLowerCase();
    if (["l", "laki laki", "laki-laki", "pria"].includes(v)) return "LAKI_LAKI";
    if (["p", "perempuan", "wanita"].includes(v)) return "PEREMPUAN";
    return null;
}

function parseTanggalLahir(value) {
    if (!value) return null;
    if (value instanceof Date && !isNaN(value)) return value;

    const str = String(value).trim();
    const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
        const [, dd, mm, yyyy] = match;
        const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
        if (!isNaN(date)) return date;
    }

    const fallback = new Date(str);
    return isNaN(fallback) ? null : fallback;
}

function cleanString(value) {
    if (value === null || value === undefined) return null;
    const str = String(value).trim();
    return str === "" ? null : str;
}

export function mapExcelRowToWarga(row) {
    const mapped = {};

    for (const [rawHeader, rawValue] of Object.entries(row)) {
        const key = normalizeHeader(rawHeader);
        const field = HEADER_TO_FIELD[key];
        if (!field) continue; 
        mapped[field] = rawValue;
    }

    const nik = cleanString(mapped.nik);
    const nomorKK = cleanString(mapped.nomorKK);
    const nama = cleanString(mapped.nama);

    return {
        valid: Boolean(nik && nomorKK && nama),
        data: {
            kabupaten: cleanString(mapped.kabupaten),
            kecamatan: cleanString(mapped.kecamatan),
            desaKelurahan: cleanString(mapped.desaKelurahan),
            alamat: cleanString(mapped.alamat),
            rw: cleanString(mapped.rw),
            rt: cleanString(mapped.rt),
            desilTerbaru: cleanString(mapped.desilTerbaru),
            nomorKK,
            nik,
            nama,
            jenisKelamin: normalizeJenisKelamin(mapped.jenisKelaminRaw),
            tanggalLahir: parseTanggalLahir(mapped.tanggalLahirRaw),
            tempatLahir: cleanString(mapped.tempatLahir),
            statusPerkawinan: cleanString(mapped.statusPerkawinan),
            hubunganKeluarga: cleanString(mapped.hubunganKeluarga),
            keberadaanAnggotaKeluarga: cleanString(mapped.keberadaanAnggotaKeluarga),
            disabilitas: cleanString(mapped.disabilitas),
            keteranganDisabilitas: cleanString(mapped.keteranganDisabilitas),
            pbiJk: cleanString(mapped.pbiJk),
            bansosPkh: cleanString(mapped.bansosPkh),
            bansosSembako: cleanString(mapped.bansosSembako),
        },
    };
}