export const BANSOS_PROGRAMS = [
    {
        slug: "uep-sajuta",
        model: "bansosUepSajuta",
        nama: "Usaha Ekonomi Produktif (UEP) Sajuta",
        bidang: "Fakir Miskin",
    },
    {
        slug: "uep-potende-lima",
        model: "bansosUepPotendeLima",
        nama: "Usaha Ekonomi Produktif (UEP) Potende Lima",
        bidang: "Fakir Miskin",
    },
    {
        slug: "uep-potende-sapuluh",
        model: "bansosUepPotendeSapuluh",
        nama: "Usaha Ekonomi Produktif (UEP) Potende Sapuluh",
        bidang: "Fakir Miskin",
    },
    {
        slug: "kube",
        model: "bansosKube",
        nama: "Kelompok Usaha Bersama (KUBE)",
        bidang: "Fakir Miskin",
    },
    {
        slug: "bantuan-tunai",
        model: "bansosBantuanTunai",
        nama: "Bantuan Tunai (BANTU)",
        bidang: "Fakir Miskin",
    },
    {
        slug: "pangan-stunting",
        model: "bansosPanganStunting",
        nama: "Pemberian Bantuan Pangan Bergizi Keluarga Beresiko Stunting",
        bidang: "Linjamsos",
    },
    {
        slug: "rst",
        model: "bansosRst",
        nama: "Rumah Sejahtera Terpadu (RST)",
        bidang: "Linjamsos",
    },
    {
        slug: "bantalan-lansia",
        model: "bansosBantalanLansia",
        nama: "Bantuan Stimulan (Bantalan) Lanjut Usia Dalam Panti",
        bidang: "Rehsos",
    },
    {
        slug: "alat-bantu-lansia",
        model: "bansosAlatBantuLansia",
        nama: "Alat Bantu Lanjut Usia",
        bidang: "Rehsos",
    },
    {
        slug: "alat-bantu-disabilitas",
        model: "bansosAlatBantuDisabilitas",
        nama: "Alat Bantu Penyandang Disabilitas",
        bidang: "Rehsos",
    },
    {
        slug: "panada-lansia",
        model: "bansosPanadaLansia",
        nama: "Bantuan Pangan Daerah (PANADA) Lanjut Usia dalam Panti",
        bidang: "Rehsos",
    },
    {
        slug: "panada-disabilitas",
        model: "bansosPanadaDisabilitas",
        nama: "Bantuan Pangan Daerah (PANADA) Penyandang Disabilitas dalam Panti",
        bidang: "Rehsos",
    },
    {
        slug: "uep-bwblp",
        model: "bansosUepBwblp",
        nama: "Usaha Ekonomi Produktif (UEP) BWBLP",
        bidang: "Rehsos",
    },
    {
        slug: "uep-keluarga-plasma",
        model: "bansosUepKeluargaPlasma",
        nama: "Usaha Ekonomi Produktif (UEP) Keluarga Plasma",
        bidang: "Dayasos",
    },
];

const BY_SLUG = new Map(BANSOS_PROGRAMS.map((p) => [p.slug, p]));

export function getBansosProgramBySlug(slug) {
    return BY_SLUG.get(String(slug || "").toLowerCase()) || null;
}