const { getPrisma, isPrismaConfigured } = require("./db");

const fallbackServices = [
  {
    icon: "cloud",
    title: "Salesforce",
    subtitle: "Mudanças e solicitações",
    sla: "SLA até 4h",
    description: "Solicite alterações, melhorias ou suporte relacionado ao Salesforce.",
  },
  {
    icon: "send",
    title: "Marketing Cloud",
    subtitle: "Campanhas, jornadas e automações",
    sla: "SLA até 4h",
    description: "Peça suporte para campanhas, jornadas, automações e configurações.",
  },
  {
    icon: "headphones",
    title: "Solicitações",
    subtitle: "Chamados com SLA de até 4 horas",
    sla: "Fila padrão",
    description: "Abra chamados para suporte técnico, acessos, erros e outras solicitações.",
  },
];

const fallbackArticles = [
  {
    icon: "clipboard-check",
    title: "Como abrir um chamado corretamente",
    description: "Saiba como escrever um assunto claro e anexar evidências úteis.",
    category: "Geral",
  },
];

const fallbackAnnouncements = [
  {
    title: "Comunicação geral",
    date: "24/06/2026",
    status: "Publicado",
    category: "Aviso geral",
    description: "Aberturas com evidências completas recebem triagem mais rápida pelo grupo operador.",
  },
];

const fallbackServiceStatuses = [
  { name: "Portal de Chamados", status: "Operacional", tone: "ok" },
];

const fallbackRequestTypes = [];

function formatPortalDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

async function getPortalContent() {
  if (!isPrismaConfigured()) {
    return {
      services: fallbackServices,
      articles: fallbackArticles,
      announcements: fallbackAnnouncements,
      serviceStatuses: fallbackServiceStatuses,
      requestTypes: fallbackRequestTypes,
      source: "fallback",
    };
  }

  try {
    const prisma = getPrisma();
    const [services, requestTypes, articles, announcements, serviceStatuses] = await Promise.all([
      prisma.serviceCatalog.findMany({
        where: { active: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.serviceRequestType.findMany({
        where: { active: true },
        include: { service: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.knowledgeArticle.findMany({
        where: { published: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.announcement.findMany({
        where: { published: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.serviceStatus.findMany({
        where: { active: true },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    return {
      services: services.map((item) => ({
        id: item.id,
        icon: item.icon,
        title: item.title,
        subtitle: item.subtitle,
        sla: item.sla,
        description: item.description,
      })),
      requestTypes: requestTypes.map((item) => ({
        id: item.id,
        serviceId: item.serviceId,
        serviceTitle: item.service.title,
        title: item.title,
        originalName: item.originalName,
        description: item.description,
        category: item.category,
        keywords: item.keywords,
      })),
      articles: articles.map((item) => ({
        icon: item.icon,
        title: item.title,
        description: item.description,
        category: item.category,
      })),
      announcements: announcements.map((item) => ({
        title: item.title,
        date: formatPortalDate(item.eventDate),
        status: item.status,
        category: item.category,
        description: item.description,
      })),
      serviceStatuses: serviceStatuses.map((item) => ({
        name: item.name,
        status: item.status,
        tone: item.tone,
      })),
      source: "database",
    };
  } catch (_error) {
    return {
      services: fallbackServices,
      articles: fallbackArticles,
      announcements: fallbackAnnouncements,
      serviceStatuses: fallbackServiceStatuses,
      requestTypes: fallbackRequestTypes,
      source: "fallback",
    };
  }
}

module.exports = { getPortalContent };
