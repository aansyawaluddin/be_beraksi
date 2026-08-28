function normalizeHeader(header) {
    return String(header || "")
        .trim()
        .toLowerCase()
        .replace(/[_-]/g, " ")
        .replace(/\s+/g, " ");
}

const HEADER_TO_FIELD = {
    provinsi: "provinsi",
    "provinsi ktp": "provinsi",
    kabupaten: "kabupaten",
    "kabupaten ktp": "kabupaten",
    "kabupaten kota ktp": "kabupaten",
    kecamatan: "kecamatan",
    "kecamatan ktp": "kecamatan",
    "desa kelurahan": "desaKelurahan",
    "kelurahan desa": "desaKelurahan",
    "kelurahan desa ktp": "desaKelurahan",
    alamat: "alamat",
    "alamat ktp": "alamat",
    dusun: "dusun",
    "dusun ktp": "dusun",
    rw: "rw",
    "rw ktp": "rw",
    rt: "rt",
    "rt ktp": "rt",
    desil: "desilTerbaru",
    "desil terbaru": "desilTerbaru",
    "nomor kartu keluarga": "nomorKK",
    "nomor induk kependudukan": "nik",
    nama: "nama",
    "jenis kelamin": "jenisKelaminRaw",
    "tanggal lahir": "tanggalLahirRaw",
    umur: "umurRaw",
    "status perkawinan": "statusPerkawinan",
    "status kawin": "statusPerkawinan",
    "hubungan keluarga": "hubunganKeluarga",
    "status hubungan keluarga": "hubunganKeluarga",
    "lanjut usia": "lanjutUsia",
    disabilitas: "disabilitas",
    "jenis disabilitas": "disabilitas",
    "keterangan disabilitas": "keteranganDisabilitas",
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

function parseUmur(value) {
    if (value === null || value === undefined || value === "") return null;
    const n = parseInt(value, 10);
    return Number.isNaN(n) ? null : n;
}

function fieldOrUndefined(mapped, key, transform = cleanString) {
    if (!(key in mapped)) return undefined;
    return transform(mapped[key]);
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
            provinsi: fieldOrUndefined(mapped, "provinsi"),
            kabupaten: cleanString(mapped.kabupaten),
            kecamatan: cleanString(mapped.kecamatan),
            desaKelurahan: cleanString(mapped.desaKelurahan),
            alamat: fieldOrUndefined(mapped, "alamat"),
            dusun: fieldOrUndefined(mapped, "dusun"),
            rw: fieldOrUndefined(mapped, "rw"),
            rt: fieldOrUndefined(mapped, "rt"),
            desilTerbaru: fieldOrUndefined(mapped, "desilTerbaru"),
            nomorKK,
            nik,
            nama,
            jenisKelamin: fieldOrUndefined(mapped, "jenisKelaminRaw", normalizeJenisKelamin),
            tanggalLahir: fieldOrUndefined(mapped, "tanggalLahirRaw", parseTanggalLahir),
            umur: fieldOrUndefined(mapped, "umurRaw", parseUmur),
            statusPerkawinan: fieldOrUndefined(mapped, "statusPerkawinan"),
            hubunganKeluarga: fieldOrUndefined(mapped, "hubunganKeluarga"),
            lanjutUsia: fieldOrUndefined(mapped, "lanjutUsia"),
            disabilitas: fieldOrUndefined(mapped, "disabilitas"),
            keteranganDisabilitas: fieldOrUndefined(mapped, "keteranganDisabilitas"),
        },
    };
}