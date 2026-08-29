import { WILAYAH_SULTENG } from "../constants/wilayahSulteng.js";

function normalisasi(raw) {
    return String(raw || "")
        .toUpperCase()
        .replace(/-/g, " ")
        .replace(/\bKABUPATEN\b/g, "")
        .replace(/\bKAB\.?\b/g, "")
        .replace(/\bKOTA\b/g, "")
        .replace(/[.]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

const ALIAS_INDEX = WILAYAH_SULTENG
    .flatMap((w) => w.aliases.map((alias) => ({ alias, wilayah: w })))
    .sort((a, b) => b.alias.length - a.alias.length);

export function cocokkanWilayah(rawKabupaten) {
    const norm = normalisasi(rawKabupaten);
    if (!norm) return null;

    for (const { alias, wilayah } of ALIAS_INDEX) {
        if (norm === alias || norm.includes(alias)) {
            return wilayah;
        }
    }
    return null;
}