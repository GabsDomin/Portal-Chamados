require("dotenv").config();

const crypto = require("crypto");
const { getPrisma } = require("../lib/db");

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

function nameFromEmail(email) {
  return String(email)
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

async function main() {
  const password = process.env.UPSERT_USER_PASSWORD;
  const emails = process.argv.slice(2).map((email) => email.trim().toLowerCase()).filter(Boolean);

  if (!password) {
    throw new Error("Defina UPSERT_USER_PASSWORD antes de rodar o script.");
  }

  if (!emails.length) {
    throw new Error("Informe ao menos um e-mail.");
  }

  const prisma = getPrisma();
  const passwordHash = hashPassword(password);

  for (const email of emails) {
    const user = await prisma.portalUser.upsert({
      where: { email },
      update: {
        passwordHash,
        active: true,
      },
      create: {
        email,
        name: nameFromEmail(email),
        company: "Sottelli",
        role: "Cliente",
        active: true,
        passwordHash,
      },
    });

    console.log(`OK ${user.email}`);
  }
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  })
  .finally(async () => {
    const prisma = getPrisma();
    await prisma.$disconnect();
  });
