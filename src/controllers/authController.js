import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { success, error } from "../utils/response.js";

export async function login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return error(res, "Email dan kata sandi wajib diisi", 400);
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        return error(res, "Email atau kata sandi salah", 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
        return error(res, "Email atau kata sandi salah", 401);
    }

    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    return success(res, {
        token,
        user: {
            id: user.id,
            nama: user.nama,
            email: user.email,
            role: user.role,
        },
    }, "Login berhasil");
}