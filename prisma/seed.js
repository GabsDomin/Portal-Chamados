require("dotenv").config();

const crypto = require("crypto");
const { getPrisma } = require("../lib/db");

const DEMO_PASSWORD = process.env.SEED_USER_PASSWORD || "troque-esta-senha";
const DEMO_SALT = "keep-demo-salt";

function hashPassword(password) {
  const hash = crypto.scryptSync(password, DEMO_SALT, 32).toString("hex");
  return `${DEMO_SALT}:${hash}`;
}

const users = [
  {
    email: "cliente.demo@example.com",
    name: "Cliente Demo",
    company: "Empresa Demo",
    role: "Cliente",
  },
  {
    email: "cliente.financeiro@example.com",
    name: "Cliente Financeiro",
    company: "Empresa Demo",
    role: "Cliente",
  },
  {
    email: "cliente.operacao@example.com",
    name: "Cliente Operação",
    company: "Empresa Demo",
    role: "Cliente",
  },
];

const services = [
  {
    icon: "cloud",
    title: "Salesforce",
    subtitle: "Mudanças e solicitações",
    sla: "SLA at? 4h",
    description: "Solicite alterações, melhorias ou suporte relacionado ao Salesforce.",
    sortOrder: 1,
  },
  {
    icon: "send",
    title: "Marketing Cloud",
    subtitle: "Campanhas, jornadas e automações",
    sla: "SLA at? 4h",
    description: "Peça suporte para campanhas, jornadas, automações e configurações.",
    sortOrder: 2,
  },
  {
    icon: "headphones",
    title: "Solicitações",
    subtitle: "Chamados com SLA de at? 4 horas",
    sla: "Fila padr?o",
    description: "Abra chamados para suporte técnico, acessos, erros e outras solicitações.",
    sortOrder: 3,
  },
  {
    icon: "history",
    title: "Acompanhar chamados",
    subtitle: "Consulte seus chamados e hist?rico",
    sla: "Consulta",
    description: "Acompanhe o status, responda e adicione informações às suas solicitações.",
    sortOrder: 4,
  },
  {
    icon: "key-round",
    title: "Acessos e permissões",
    subtitle: "Criação, alteração e liberação de acesso",
    sla: "Validação obrigatória",
    description: "Solicite criação, alteração ou ajuste de acessos e permissões.",
    sortOrder: 5,
  },
  {
    icon: "triangle-alert",
    title: "Problemas técnicos",
    subtitle: "Erros, falhas e instabilidades",
    sla: "Priorização por impacto",
    description: "Informe erros, lentid?o, indisponibilidade ou comportamento inesperado do sistema.",
    sortOrder: 6,
  },
  {
    icon: "life-buoy",
    title: "Suporte geral",
    subtitle: "D?vidas e apoio funcional",
    sla: "Triagem inicial",
    description: "Abra solicitações gerais de suporte e esclarecimento.",
    sortOrder: 7,
  },
];

const articles = [
  {
    icon: "workflow",
    title: "Como solicitar uma mudan?a no Salesforce",
    description: "Veja quais informações ajudam o time a avaliar impacto, escopo e prioridade.",
    category: "Salesforce",
    sortOrder: 1,
  },
  {
    icon: "mail-plus",
    title: "Criar nova campanha no Marketing Cloud",
    description: "Passo a passo para enviar dados, objetivo, p?blico e per?odo da campanha.",
    category: "Marketing Cloud",
    sortOrder: 2,
  },
  {
    icon: "unlock-keyhole",
    title: "Recuperação de acesso",
    description: "Oriente a validação de usuário, empresa, perfil e evidências necessárias.",
    category: "Acessos",
    sortOrder: 3,
  },
  {
    icon: "clipboard-check",
    title: "Como abrir um chamado corretamente",
    description: "Saiba como escrever um assunto claro e anexar evidências úteis.",
    category: "Geral",
    sortOrder: 4,
  },
  {
    icon: "paperclip",
    title: "Como anexar evidências no chamado",
    description: "Entenda quais prints, logs e arquivos agilizam o atendimento.",
    category: "Geral",
    sortOrder: 5,
  },
];

const announcements = [
  {
    title: "Atualização programada",
    eventDate: new Date("2026-06-25"),
    status: "Agendado",
    category: "Atualização",
    description: "Janela de atualização do portal entre 20h e 21h, sem impacto esperado para chamados abertos.",
    sortOrder: 1,
  },
  {
    title: "Manutenção em Marketing Cloud",
    eventDate: new Date("2026-06-27"),
    status: "Em manutenção",
    category: "Manutenção",
    description: "Algumas automações podem apresentar atraso durante a manutenção planejada.",
    sortOrder: 2,
  },
  {
    title: "Comunicação geral",
    eventDate: new Date("2026-06-24"),
    status: "Publicado",
    category: "Aviso geral",
    description: "Aberturas com evidências completas recebem triagem mais rápida pelo grupo operador.",
    sortOrder: 3,
  },
];

const serviceStatuses = [
  { name: "Salesforce", status: "Operacional", tone: "ok", sortOrder: 1 },
  { name: "Marketing Cloud", status: "Inst?vel", tone: "warning", sortOrder: 2 },
  { name: "Portal de Chamados", status: "Operacional", tone: "ok", sortOrder: 3 },
];

async function main() {
  const prisma = getPrisma();
  const passwordHash = hashPassword(DEMO_PASSWORD);

  for (const user of users) {
    await prisma.portalUser.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        company: user.company,
        role: user.role,
        passwordHash,
        active: true,
      },
      create: {
        ...user,
        passwordHash,
      },
    });
  }

  await prisma.serviceCatalog.deleteMany();
  await prisma.knowledgeArticle.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.serviceStatus.deleteMany();

  await prisma.serviceCatalog.createMany({ data: services });
  await prisma.knowledgeArticle.createMany({ data: articles });
  await prisma.announcement.createMany({ data: announcements });
  await prisma.serviceStatus.createMany({ data: serviceStatuses });

  console.log("Seed conclu?do:");
  console.log(`- ${users.length} usuários (senha: ${DEMO_PASSWORD})`);
  console.log(`- ${services.length} servi?os`);
  console.log(`- ${articles.length} artigos`);
  console.log(`- ${announcements.length} avisos`);
  console.log(`- ${serviceStatuses.length} status de servi?o`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    const prisma = getPrisma();
    await prisma.$disconnect();
  });
