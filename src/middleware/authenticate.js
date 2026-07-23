import jwt from "jsonwebtoken";
import { error } from "../utils/response.js";

export function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return error(res, "Token tidak ditemukan, silakan login", 401);
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return error(res, "Sesi habis, silakan login kembali", 401);
        }
        return error(res, "Token tidak valid", 401);
    }
}