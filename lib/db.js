const { PrismaClient } = require("./generated/prisma");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const { getEnv } = require("./env");

let prisma;
let pool;

function isPrismaConfigured() {
  return Boolean(getEnv("DATABASE_URL", ["URL_DO_BANCO_DE_DADOS"]));
}

function getPrisma() {
  if (prisma) return prisma;

  const connectionString = getEnv("DATABASE_URL", ["URL_DO_BANCO_DE_DADOS"]);
  if (!connectionString) {
    throw new Error("DATABASE_URL não configurada no .env");
  }

  pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });

  return prisma;
}

async function disconnectPrisma() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = undefined;
  }

  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

module.exports = { getPrisma, isPrismaConfigured, disconnectPrisma };
