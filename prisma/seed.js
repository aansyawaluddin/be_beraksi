import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    const defaultPassword = await bcrypt.hash("admin123", 10);

    await prisma.user.upsert({
        where: { email: "admin@sulteng.go.id" },
        update: {},
        create: {
            nama: "Admin BERAKSI",
            email: "admin@sulteng.go.id",
            password: defaultPassword,
            role: "ADMIN",
        },
    });

    console.log("Akun admin demo berhasil di-seed (admin@sulteng.go.id / admin123)");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });