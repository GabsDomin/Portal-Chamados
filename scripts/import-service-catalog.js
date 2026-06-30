require("dotenv").config();

const fs = require("fs");
const path = require("path");

const { disconnectPrisma, getPrisma } = require("../lib/db");

const catalogPath = path.join(__dirname, "..", "data", "catalogo_servicos.json");
const categoriesByOrder = [
  "Seguran\u00e7a",
  "Configura\u00e7\u00e3o",
  "Dados",
  "Vendas",
  "Atendimento",
  "Portais",
  "Receita",
  "Opera\u00e7\u00e3o de Campo",
  "Integra\u00e7\u00f5es",
  "Analytics",
  "Administra\u00e7\u00e3o",
];

async function main() {
  const prisma = getPrisma();
  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

  await prisma.serviceRequestType.deleteMany();
  await prisma.serviceCatalog.deleteMany();

  const serviceByTitle = new Map();
  const requestTypeCountByService = catalog.requestTypes.reduce((totals, item) => {
    totals.set(item.serviceTitle, (totals.get(item.serviceTitle) || 0) + 1);
    return totals;
  }, new Map());

  for (const [index, service] of catalog.services.entries()) {
    const requestTypeCount = requestTypeCountByService.get(service.title) || 0;
    const created = await prisma.serviceCatalog.create({
      data: {
        icon: service.icon,
        title: service.title,
        subtitle: formatRequestTypeCount(requestTypeCount),
        sla: service.sla,
        description: service.description,
        sortOrder: service.sortOrder,
        active: true,
      },
    });

    serviceByTitle.set(service.title, {
      record: created,
      category: categoriesByOrder[index] || "Atendimento",
    });
  }

  for (const item of catalog.requestTypes) {
    const serviceEntry = serviceByTitle.get(item.serviceTitle);
    if (!serviceEntry) {
      throw new Error(`Grupo de serviço não encontrado: ${item.serviceTitle}`);
    }

    await prisma.serviceRequestType.create({
      data: {
        serviceId: serviceEntry.record.id,
        originalName: item.originalName,
        title: item.title,
        description: item.description,
        category: serviceEntry.category,
        keywords: item.keywords,
        sortOrder: item.sortOrder,
        active: true,
      },
    });
  }

  console.log("Catálogo importado:");
  console.log(`- ${catalog.services.length} grupos de serviço`);
  console.log(`- ${catalog.requestTypes.length} serviços solicitáveis`);
}

function formatRequestTypeCount(count) {
  const label = count === 1 ? "op\u00e7\u00e3o" : "op\u00e7\u00f5es";
  return `${count} ${label} de solicita\u00e7\u00e3o`;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectPrisma();
  });
