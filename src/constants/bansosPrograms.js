export const BANSOS_PROGRAMS = [
    {
        slug: "uep-sajuta",
        model: "bansosUepSajuta",
        tabel: "bansos_uep_sajuta",
        nama: "Usaha Ekonomi Produktif (UEP) Sajuta",
        bidang: "Fakir Miskin",
    },
    {
        slug: "uep-potende-lima",
        model: "bansosUepPotendeLima",
        tabel: "bansos_uep_potende_lima",
        nama: "Usaha Ekonomi Produktif (UEP) Potende Lima",
        bidang: "Fakir Miskin",
    },
    {
        slug: "uep-potende-sapuluh",
        model: "bansosUepPotendeSapuluh",
        tabel: "bansos_uep_potende_sapuluh",
        nama: "Usaha Ekonomi Produktif (UEP) Potende Sapuluh",
        bidang: "Fakir Miskin",
    },
    {
        slug: "kube",
        model: "bansosKube",
        tabel: "bansos_kube",
        nama: "Kelompok Usaha Bersama (KUBE)",
        bidang: "Fakir Miskin",
    },
    {
        slug: "bantuan-tunai",
        model: "bansosBantuanTunai",
        tabel: "bansos_bantuan_tunai",
        nama: "Bantuan Tunai (BANTU)",
        bidang: "Fakir Miskin",
    },
    {
        slug: "pangan-stunting",
        model: "bansosPanganStunting",
        tabel: "bansos_pangan_stunting",
        nama: "Pemberian Bantuan Pangan Bergizi Keluarga Beresiko Stunting",
        bidang: "Linjamsos",
    },
    {
        slug: "rst",
        model: "bansosRst",
        tabel: "bansos_rst",
        nama: "Rumah Sejahtera Terpadu (RST)",
        bidang: "Linjamsos",
    },
    {
        slug: "bantalan-lansia",
        model: "bansosBantalanLansia",
        tabel: "bansos_bantalan_lansia",
        nama: "Bantuan Stimulan (Bantalan) Lanjut Usia Dalam Panti",
        bidang: "Rehsos",
    },
    {
        slug: "alat-bantu-lansia",
        model: "bansosAlatBantuLansia",
        tabel: "bansos_alat_bantu_lansia",
        nama: "Alat Bantu Lanjut Usia",
        bidang: "Rehsos",
    },
    {
        slug: "alat-bantu-disabilitas",
        model: "bansosAlatBantuDisabilitas",
        tabel: "bansos_alat_bantu_disabilitas",
        nama: "Alat Bantu Penyandang Disabilitas",
        bidang: "Rehsos",
    },
    {
        slug: "panada-lansia",
        model: "bansosPanadaLansia",
        tabel: "bansos_panada_lansia",
        nama: "Bantuan Pangan Daerah (PANADA) Lanjut Usia dalam Panti",
        bidang: "Rehsos",
    },
    {
        slug: "panada-disabilitas",
        model: "bansosPanadaDisabilitas",
        tabel: "bansos_panada_disabilitas",
        nama: "Bantuan Pangan Daerah (PANADA) Penyandang Disabilitas dalam Panti",
        bidang: "Rehsos",
    },
    {
        slug: "uep-bwblp",
        model: "bansosUepBwblp",
        tabel: "bansos_uep_bwblp",
        nama: "Usaha Ekonomi Produktif (UEP) BWBLP",
        bidang: "Rehsos",
    },
    {
        slug: "uep-keluarga-plasma",
        model: "bansosUepKeluargaPlasma",
        tabel: "bansos_uep_keluarga_plasma",
        nama: "Usaha Ekonomi Produktif (UEP) Keluarga Plasma",
        bidang: "Dayasos",
    },
];

const BY_SLUG = new Map(BANSOS_PROGRAMS.map((p) => [p.slug, p]));

export function getBansosProgramBySlug(slug) {
    return BY_SLUG.get(String(slug || "").toLowerCase()) || null;
}