require("dotenv").config();
const { getPrisma } = require("../lib/db");

async function main() {
  const prisma = getPrisma();
  const users = await prisma.portalUser.findMany({
    select: { email: true, name: true, company: true },
    orderBy: { name: "asc" },
  });

  console.log("Usuarios:", users.length);
  users.forEach((user) => console.log(`- ${user.name} <${user.email}>`));
  await prisma.$disconnect();
}

main();
