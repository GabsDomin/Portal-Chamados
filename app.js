const topdeskSession = {
  callerId: "",
  name: "",
  email: "",
  company: "",
  phone: "",
  branch: "Cliente final",
};

let services = [];
let requestTypes = [];
let articles = [];
let announcements = [];
let currentTickets = [];
let activeServiceSlide = 0;
let serviceCarouselTimer;
let selectedAttachmentFiles = [];
const ignoredSearchTerms = new Set([
  "a",
  "ao",
  "as",
  "com",
  "da",
  "de",
  "do",
  "dos",
  "e",
  "em",
  "eu",
  "na",
  "não",
  "no",
  "o",
  "os",
  "para",
  "por",
  "que",
  "um",
  "uma",
]);

const searchAliases = [
  ["criação usuário", "criar usuário novo usuário cadastro usuário acesso"],
  ["criar usuário", "criação usuário novo usuário cadastro usuário acesso"],
  ["senha", "redefinicao reset password login acesso"],
  ["reset senha", "redefinicao senha login acesso"],
  ["mfa", "autenticador autenticação multifator token reset mfa"],
  ["sso", "single sign on login autenticação acesso"],
  ["bloqueio", "desbloqueio bloqueada conta usuário acesso"],
  ["permissão", "perfil conjunto permissões acesso papel hierarquia"],
  ["campo", "field objeto metadados layout picklist validacao"],
  ["relatorio", "dashboard painel analytics indicador kpi"],
  ["integracao", "api certificado autenticação webhook middleware"],
  ["dados", "importacao exportacao limpeza carga atualização deduplicacao"],
  ["portal", "experience cloud comunidade site usuário externo"],
  ["vendas", "sales cloud lead oportunidade produto preco forecast"],
  ["atendimento", "service cloud caso fila sla omni channel email to case"],
];

function icon(name) {
  return `<i data-lucide="${name}"></i>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderServices() {
  const grid = document.querySelector("#serviceGrid");
  const dots = document.querySelector("#serviceCarouselDots");
  const carousel = document.querySelector("#serviceCarousel");
  if (!services.length) {
    grid.innerHTML = `
      <article class="empty-state">
        ${icon("inbox")}
        <h2>Nenhum serviço disponível</h2>
        <p>O catálogo ainda não foi carregado ou está vazio.</p>
      </article>
    `;
    if (dots) dots.innerHTML = "";
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  const slides = chunkServices(services, getServiceCardsPerSlide());
  activeServiceSlide = Math.min(activeServiceSlide, slides.length - 1);

  grid.innerHTML = slides
    .map((slide, slideIndex) => `
      <div class="service-slide" aria-label="Página ${slideIndex + 1} de ${slides.length}">
        ${slide.map(renderServiceCard).join("")}
        ${renderSlidePlaceholders(slide.length)}
      </div>
    `)
    .join("");

  if (dots) {
    dots.innerHTML = slides
      .map((_, index) => `
        <button
          class="carousel-dot ${index === activeServiceSlide ? "active" : ""}"
          type="button"
          data-service-slide="${index}"
          aria-label="Mostrar página ${index + 1} do catálogo"
          aria-current="${index === activeServiceSlide ? "true" : "false"}"
        ></button>
      `)
      .join("");
  }

  setServiceSlide(activeServiceSlide);
  setupServiceCarouselEvents(carousel);
  startServiceCarousel();
  if (window.lucide) window.lucide.createIcons();
}

function renderServiceCard(service) {
  return `
    <article class="service-card">
      <div class="service-card-top">
        ${icon(service.icon)}
        <span class="badge badge-teal">${escapeHtml(service.sla)}</span>
      </div>
      <h3>${escapeHtml(service.title)}</h3>
      <small>${escapeHtml(service.subtitle)}</small>
      <p>${escapeHtml(service.description)}</p>
      <button class="ghost-button" type="button" data-route="open-ticket" data-service-title="${escapeHtml(service.title)}">Abrir chamado ${icon("arrow-right")}</button>
    </article>
  `;
}

function renderSlidePlaceholders(cardCount) {
  const missingCards = Math.max(getServiceCardsPerSlide() - cardCount, 0);
  return Array.from({ length: missingCards }, () => `<span class="service-slot-placeholder" aria-hidden="true"></span>`).join("");
}

function getServiceCardsPerSlide() {
  if (window.matchMedia("(max-width: 720px)").matches) return 1;
  if (window.matchMedia("(max-width: 1080px)").matches) return 2;
  return 3;
}

function chunkServices(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function setupServiceCarouselEvents(carousel) {
  if (!carousel || carousel.dataset.ready === "true") return;
  carousel.dataset.ready = "true";

  carousel.addEventListener("click", (event) => {
    const dot = event.target.closest("[data-service-slide]");
    if (!dot) return;
    setServiceSlide(Number(dot.dataset.serviceSlide));
    startServiceCarousel();
  });

  carousel.addEventListener("mouseenter", stopServiceCarousel);
  carousel.addEventListener("mouseleave", startServiceCarousel);
  carousel.addEventListener("focusin", stopServiceCarousel);
  carousel.addEventListener("focusout", startServiceCarousel);
}

function setServiceSlide(index) {
  const track = document.querySelector("#serviceGrid");
  const dots = document.querySelectorAll("[data-service-slide]");
  const slideCount = document.querySelectorAll(".service-slide").length;
  if (!track || !slideCount) return;

  activeServiceSlide = (index + slideCount) % slideCount;
  track.style.transform = `translateX(-${activeServiceSlide * 100}%)`;

  dots.forEach((dot) => {
    const isActive = Number(dot.dataset.serviceSlide) === activeServiceSlide;
    dot.classList.toggle("active", isActive);
    dot.setAttribute("aria-current", isActive ? "true" : "false");
  });
}

function startServiceCarousel() {
  stopServiceCarousel();
  const slideCount = document.querySelectorAll(".service-slide").length;
  if (slideCount <= 1) return;

  serviceCarouselTimer = window.setInterval(() => {
    setServiceSlide(activeServiceSlide + 1);
  }, 5200);
}

function stopServiceCarousel() {
  if (!serviceCarouselTimer) return;
  window.clearInterval(serviceCarouselTimer);
  serviceCarouselTimer = undefined;
}

function renderArticles() {
  const markup = articles.length
    ? articles
        .map(
          (article) => `
        <article class="article-card">
          ${icon(article.icon)}
          <h3>${escapeHtml(article.title)}</h3>
          <p>${escapeHtml(article.description)}</p>
          <button class="ghost-button" type="button">Ler artigo ${icon("arrow-right")}</button>
        </article>
      `,
        )
        .join("")
    : `
      <article class="empty-state">
        ${icon("book-open")}
        <h2>Nenhum artigo disponível</h2>
        <p>Os artigos da base de conhecimento aparecerão aqui quando forem publicados.</p>
      </article>
    `;

  document.querySelector("#featuredArticles").innerHTML = markup;
  document.querySelector("#knowledgeArticles").innerHTML = markup;
}

function renderAnnouncements() {
  const preview = document.querySelector("#announcementPreview");
  const list = document.querySelector("#announcementList");

  if (!announcements.length) {
    preview.innerHTML = `<li><span>Nenhum aviso publicado no momento.</span></li>`;
    list.innerHTML = `
      <article class="empty-state">
        ${icon("megaphone")}
        <h2>Nenhum aviso disponível</h2>
        <p>Comunicados e manutenções aparecerão aqui quando forem publicados.</p>
      </article>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  preview.innerHTML = announcements
    .slice(0, 2)
    .map(
      (item) => `
        <li>
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.date)} - ${escapeHtml(item.category)}</span>
          </div>
          <span class="badge status-progress">${escapeHtml(item.status)}</span>
        </li>
      `,
    )
    .join("");

  list.innerHTML = announcements
    .map(
      (item) => `
        <article class="announcement-card">
          <div>
            <div class="announcement-meta">
              <span>${escapeHtml(item.date)}</span>
              <span>${escapeHtml(item.category)}</span>
              <span>${escapeHtml(item.status)}</span>
            </div>
            <h2>${escapeHtml(item.title)}</h2>
            <p>${escapeHtml(item.description)}</p>
          </div>
          <button class="secondary-button" type="button">Ver detalhes</button>
        </article>
      `,
    )
    .join("");
}

function renderTickets(tickets = currentTickets) {
  const list = document.querySelector("#ticketList");

  if (!tickets.length) {
    list.innerHTML = `
      <article class="empty-state">
        ${icon("inbox")}
        <h2>Nenhum chamado encontrado</h2>
        <p>Quando você abrir ou tiver chamados associados ao seu cadastro, eles aparecerão aqui.</p>
        <button class="primary-button" type="button" data-route="open-ticket">Abrir chamado</button>
      </article>
    `;

    if (window.lucide) window.lucide.createIcons();
    return;
  }

  list.innerHTML = tickets
    .map(
      (ticket) => `
        <article class="ticket-card">
          <div><small>Número</small><strong>${escapeHtml(ticket.number)}</strong></div>
          <div><small>Assunto</small><strong>${escapeHtml(ticket.subject)}</strong></div>
          <div><small>Serviço</small><strong>${escapeHtml(ticket.service)}</strong></div>
          <span class="badge ${ticket.statusClass}">${escapeHtml(ticket.status)}</span>
          <div><small>Abertura</small><strong>${formatDate(ticket.opened)}</strong></div>
          <div><small>Prazo / SLA</small><strong>${ticket.sla || formatDate(ticket.targetDate) || "Em análise"}</strong></div>
          <button class="secondary-button" type="button" data-route="ticket-detail" data-ticket-id="${escapeHtml(ticket.id || "")}">Ver detalhes</button>
        </article>
      `,
    )
    .join("");

  if (window.lucide) window.lucide.createIcons();
}

function setRoute(route) {
  const selected = document.querySelector(`[data-view="${route}"]`);
  if (!selected) return;

  document.querySelectorAll("[data-view]").forEach((view) => view.classList.remove("active"));
  selected.classList.add("active");

  document.querySelectorAll(".nav-link").forEach((button) => {
    button.classList.toggle("active", button.dataset.route === route);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (route === "my-tickets") {
    loadTickets();
  }
}

function setupRouting() {
  document.addEventListener("click", (event) => {
    const routeTarget = event.target.closest("[data-route], [data-route-card]");
    if (!routeTarget) return;
    const route = routeTarget.dataset.route || routeTarget.dataset.routeCard;
    setRoute(route);
    if (route === "open-ticket" && routeTarget.dataset.serviceTitle) {
      applyServiceGroup(routeTarget.dataset.serviceTitle);
    }
  });
}

function setupTicketForm() {
  const form = document.querySelector("#ticketForm");
  const clearButton = document.querySelector("#clearForm");
  const submitButton = document.querySelector("#submitTicket");
  const formMessage = document.querySelector("#formMessage");
  const field = (name) => form.querySelector(`[name="${name}"]`);

  syncTicketIdentity();
  setupAttachmentPicker();

  clearButton.addEventListener("click", () => {
    form.reset();
    syncTicketIdentity();
    resetSelectedServiceSummary();
    clearAttachments();
    form.querySelectorAll(".invalid").forEach((input) => input.classList.remove("invalid"));
    setFormMessage("");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    let isValid = true;

    form.querySelectorAll("[required]").forEach((input) => {
      const label = input.closest("label");
      if (!label) return;
      const error = label.querySelector(".field-error");
      const missing = !input.value.trim();
      const invalidEmail = input.type === "email" && input.value && !input.checkValidity();

      label.classList.toggle("invalid", missing || invalidEmail);
      if (error) {
        error.textContent = invalidEmail ? "Informe um e-mail válido." : "Este campo é obrigatório.";
      }

      if (missing || invalidEmail) isValid = false;
    });

    if (!isValid) return;

    if (!field("serviceType").value || !field("category").value || !field("subcategory").value) {
      setFormMessage("Escolha uma opção no motor de busca para classificar o chamado.");
      document.querySelector("#serviceSearchInput")?.focus();
      return;
    }

    const topdeskPayload = {
      briefDescription: field("subject").value,
      request: field("description").value,
      subject: field("subject").value,
      description: field("description").value,
      category: field("category").value,
      subcategory: field("subcategory").value,
      serviceType: field("serviceType").value,
      priority: field("priority").value,
      attachments: selectedAttachmentFiles.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
      })),
    };

    submitButton.disabled = true;
    submitButton.textContent = "Enviando...";
    setFormMessage("");

    try {
      const response = await fetch("/api/chamados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(topdeskPayload),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.detail || data.message || "Não foi possível criar o chamado.");
      }

      document.querySelector("#createdTicketNumber").textContent = data.number || "Número retornado pelo atendimento";
      setRoute("success");
    } catch (error) {
      setFormMessage(`${error.message} Se o problema continuar, acione o suporte.`);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Enviar chamado";
    }
  });

  function setFormMessage(message, type = "error") {
    formMessage.textContent = message;
    formMessage.classList.toggle("visible", Boolean(message));
    formMessage.classList.toggle("success", type === "success");
  }
}

function setupServiceFinder() {
  const input = document.querySelector("#serviceSearchInput");
  const results = document.querySelector("#serviceSearchResults");
  const form = document.querySelector("#ticketForm");
  if (!input || !results || !form) return;

  refreshServiceFinder();

  input.addEventListener("focus", () => {
    refreshServiceFinder();
  });

  input.addEventListener("input", () => {
    if (input.dataset.selectedValue && normalizeSearch(input.value) !== normalizeSearch(input.dataset.selectedValue)) {
      clearServiceMetadata(form);
      resetSelectedServiceSummary();
      delete input.dataset.selectedValue;
    }
    refreshServiceFinder();
  });

  results.addEventListener("click", (event) => {
    const button = event.target.closest("[data-shortcut-index]");
    if (!button) return;

    const shortcut = buildServiceOptions(input.value)[Number(button.dataset.shortcutIndex)];
    if (!shortcut) return;

    applyServiceShortcut(shortcut);
    input.value = shortcut.title;
    input.dataset.selectedValue = shortcut.title;
    results.innerHTML = "";
    results.classList.remove("has-results");
  });
}

function refreshServiceFinder() {
  const input = document.querySelector("#serviceSearchInput");
  const results = document.querySelector("#serviceSearchResults");
  if (!input || !results) return;

  const query = input.value.trim();
  if (!query) {
    results.innerHTML = "";
    results.classList.remove("has-results");
    return;
  }

  const options = buildServiceOptions(query).slice(0, 3);
  if (!options.length) {
    results.innerHTML = `
      <article class="service-result-empty">
        <strong>Nenhum serviço encontrado</strong>
        <span>Tente buscar por sistema, acesso, erro ou tipo de solicitação.</span>
      </article>
    `;
    results.classList.add("has-results");
    return;
  }

  results.innerHTML = options
    .map(
      (item, index) => `
        <button class="service-result" type="button" data-shortcut-index="${index}">
          <span>
            <strong>${escapeHtml(item.title)}</strong>
            <small>${escapeHtml(item.subtitle)}</small>
            <em>${escapeHtml(item.description)}</em>
          </span>
          <span class="service-result-meta">
            <b>${escapeHtml(item.category)}</b>
            <small>${escapeHtml(item.priority)}</small>
          </span>
          ${icon("arrow-right")}
        </button>
      `,
    )
    .join("");

  results.classList.add("has-results");
  if (window.lucide) window.lucide.createIcons();
}

function applyServiceShortcut(shortcut) {
  const form = document.querySelector("#ticketForm");
  if (!form) return;

  setFieldValue(form.querySelector('[name="serviceType"]'), shortcut.serviceType);
  setFieldValue(form.querySelector('[name="category"]'), shortcut.category);
  setFieldValue(form.querySelector('[name="subcategory"]'), shortcut.subcategory);
  setFieldValue(form.querySelector('[name="priority"]'), shortcut.priority);
  renderSelectedServiceSummary(shortcut);

  const subject = form.querySelector('[name="subject"]');
  if (!shortcut.isOther && !subject.value.trim()) {
    subject.value = shortcut.title;
  }

  const description = form.querySelector('[name="description"]');
  if (!description.value.trim()) {
    description.placeholder = `Descreva os detalhes para ${shortcut.title.toLowerCase()}. Ex.: sistema, usuário impactado, prazo desejado e evidências.`;
  }
}

function applyServiceGroup(serviceTitle) {
  const form = document.querySelector("#ticketForm");
  const input = document.querySelector("#serviceSearchInput");
  if (!form) return;

  setFieldValue(form.querySelector('[name="serviceType"]'), serviceTitle);
  if (input) input.value = serviceTitle;
  refreshServiceFinder();
}

function buildServiceOptions(query) {
  const normalizedQuery = normalizeSearch(expandSearchText(query));
  const allOptions = requestTypes.map((item) => ({
    title: item.title,
    subtitle: item.serviceTitle,
    description: item.description,
    serviceType: item.serviceTitle,
    category: item.category,
    subcategory: item.title,
    priority: inferPriority(item),
    keywords: [item.serviceTitle, item.originalName, item.title, item.description, item.keywords],
  }));
  const otherOption = buildOtherServiceOption(query);

  if (!normalizedQuery) return [];

  const matches = allOptions
    .map((item) => ({
      ...item,
      score: scoreServiceOption(item, normalizedQuery),
    }))
    .filter((item) => item.score >= 8)
    .sort((a, b) => b.score - a.score);

  return [...matches.slice(0, 2), otherOption];
}

function buildOtherServiceOption(query = "") {
  const suffix = query.trim() ? ` para "${query.trim()}"` : "";
  return {
    title: "Outros",
    subtitle: "Solicitação não listada no catálogo",
    description: `Use esta opção quando nenhum serviço encontrado representar a necessidade${suffix}.`,
    serviceType: "Outros",
    category: "Outros",
    subcategory: "Outros",
    priority: "Media",
    keywords: ["outros", "outro", "não encontrei", "não listado", "solicitação geral"],
    isOther: true,
  };
}

function scoreServiceOption(item, normalizedQuery) {
  const title = normalizeSearch(item.title);
  const subtitle = normalizeSearch(item.subtitle);
  const searchable = normalizeSearch(expandSearchText([item.title, item.subtitle, item.description, ...(item.keywords || [])].join(" ")));
  const queryTerms = meaningfulSearchTerms(normalizedQuery);
  let score = 0;

  if (title === normalizedQuery) score += 60;
  if (title.startsWith(normalizedQuery)) score += 36;
  if (subtitle === normalizedQuery) score += 28;
  if (searchable.includes(normalizedQuery)) score += 20;
  queryTerms.forEach((term) => {
    if (hasSearchTerm(title, term)) score += 9;
    if (hasSearchTerm(subtitle, term)) score += 5;
    if (hasSearchTerm(searchable, term)) score += 4;
  });

  return score;
}

function hasSearchTerm(text, term) {
  return text.split(" ").includes(term);
}

function meaningfulSearchTerms(value) {
  return String(value)
    .split(" ")
    .map((term) => term.trim())
    .filter((term) => term.length > 2 && !ignoredSearchTerms.has(term));
}

function expandSearchText(value) {
  const normalized = normalizeSearch(value);
  const aliases = searchAliases
    .filter(([term]) => normalized.includes(term))
    .map(([, alias]) => alias)
    .join(" ");

  return `${value || ""} ${aliases}`;
}

function normalizeSearch(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function setFieldValue(field, value) {
  if (!field || !value) return;

  if (field.tagName === "SELECT") {
    const exists = Array.from(field.options).some((option) => option.value === value || option.textContent === value);
    if (!exists) {
      field.add(new Option(value, value));
    }
  }

  field.value = value;
}

function renderSelectedServiceSummary(shortcut) {
  const summary = document.querySelector("#selectedServiceSummary");
  if (!summary) return;

  summary.innerHTML = `
    <span class="selected-service-main">
      <strong>${escapeHtml(shortcut.title)}</strong>
      <small>Serviço selecionado</small>
    </span>
    <span class="selected-service-tags">
      <b>Grupo: ${escapeHtml(shortcut.serviceType)}</b>
      <b>Categoria: ${escapeHtml(shortcut.category)}</b>
      <b>Prioridade: ${escapeHtml(shortcut.priority)}</b>
    </span>
  `;
  summary.classList.add("selected");
}

function clearServiceMetadata(form) {
  ["serviceType", "category", "subcategory"].forEach((name) => {
    const field = form.querySelector(`[name="${name}"]`);
    if (field) field.value = "";
  });

  const priority = form.querySelector('[name="priority"]');
  if (priority) priority.value = "Media";
}

function resetSelectedServiceSummary() {
  const summary = document.querySelector("#selectedServiceSummary");
  if (!summary) return;

  summary.textContent = "Selecione uma opção da busca para classificar o chamado.";
  summary.classList.remove("selected");
}

function setupAttachmentPicker() {
  const input = document.querySelector("#attachmentInput");
  const list = document.querySelector("#attachmentList");
  if (!input || !list || list.dataset.ready === "true") return;

  list.dataset.ready = "true";

  input.addEventListener("change", () => {
    Array.from(input.files || []).forEach((file) => {
      const alreadyAdded = selectedAttachmentFiles.some(
        (item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified,
      );

      if (!alreadyAdded) {
        selectedAttachmentFiles.push(file);
      }
    });

    input.value = "";
    renderAttachmentList();
  });

  list.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-attachment]");
    if (!removeButton) return;

    selectedAttachmentFiles.splice(Number(removeButton.dataset.removeAttachment), 1);
    renderAttachmentList();
  });

  renderAttachmentList();
}

function renderAttachmentList() {
  const list = document.querySelector("#attachmentList");
  const count = document.querySelector("#attachmentCount");
  if (!list || !count) return;

  count.textContent = selectedAttachmentFiles.length
    ? `${selectedAttachmentFiles.length} arquivo${selectedAttachmentFiles.length === 1 ? "" : "s"} selecionado${selectedAttachmentFiles.length === 1 ? "" : "s"}`
    : "Nenhum arquivo escolhido";

  list.innerHTML = selectedAttachmentFiles
    .map(
      (file, index) => `
        <li>
          <span>
            ${icon("file")}
            <strong>${escapeHtml(file.name)}</strong>
            <small>${formatFileSize(file.size)}</small>
          </span>
          <button class="icon-button compact-icon" type="button" data-remove-attachment="${index}" aria-label="Remover ${escapeHtml(file.name)}" title="Remover arquivo">
            ${icon("x")}
          </button>
        </li>
      `,
    )
    .join("");

  if (window.lucide) window.lucide.createIcons();
}

function clearAttachments() {
  selectedAttachmentFiles = [];
  renderAttachmentList();
}

function formatFileSize(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function hydrateTicketCatalogControls() {
  const form = document.querySelector("#ticketForm");
  if (!form || !requestTypes.length || form.querySelector('[name="serviceType"]')?.type === "hidden") return;

  setSelectOptions(
    form.querySelector('[name="serviceType"]'),
    uniqueValues(requestTypes.map((item) => item.serviceTitle)),
    "Selecione um grupo",
  );
  setSelectOptions(
    form.querySelector('[name="category"]'),
    uniqueValues(requestTypes.map((item) => item.category)),
    "Selecione uma catégoria",
  );
  setSelectOptions(
    form.querySelector('[name="subcategory"]'),
    requestTypes.map((item) => item.title),
    "Selecione um serviço",
  );
}

function setSelectOptions(select, values, placeholder) {
  if (!select) return;

  const currentValue = select.value;
  select.innerHTML = "";
  select.add(new Option(placeholder, ""));

  values.filter(Boolean).forEach((value) => {
    select.add(new Option(value, value));
  });

  if (values.includes(currentValue)) {
    select.value = currentValue;
  }
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function inferPriority(item) {
  const text = normalizeSearch(`${item.title} ${item.description}`);
  if (text.includes("indispon") || text.includes("erro de login") || text.includes("bloqueio")) return "Alta";
  return "Media";
}

function setupSearch() {
  document.querySelector("[data-search-form]").addEventListener("submit", (event) => {
    event.preventDefault();
    setRoute("knowledge");
  });
}

async function loadPortalContent() {
  const response = await fetch("/api/conteudo-portal");
  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.message || "Não foi possível carregar o conteúdo do portal.");
  }

  services = data.services || [];
  requestTypes = data.requestTypes || [];
  articles = data.articles || [];
  announcements = data.announcements || [];
}

async function loadTickets() {
  const list = document.querySelector("#ticketList");
  list.innerHTML = `
    <article class="empty-state">
      ${icon("loader-circle")}
      <h2>Carregando chamados</h2>
      <p>Buscando seus chamados mais recentes.</p>
    </article>
  `;
  if (window.lucide) window.lucide.createIcons();

  try {
    const response = await fetch("/api/chamados");
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.message || "Não foi possível carregar seus chamados.");
    }

    currentTickets = data.incidents.map((ticket) => ({
      number: ticket.number || ticket.id,
      subject: ticket.subject,
      service: ticket.service,
      status: ticket.status,
      statusClass: statusClassFor(ticket.status),
      opened: ticket.opened,
      sla: "",
      targetDate: ticket.targetDate,
      id: ticket.id,
    }));
    renderTickets(currentTickets);
  } catch (error) {
    list.innerHTML = `
      <article class="empty-state error-state">
        ${icon("circle-alert")}
        <h2>Não foi possível carregar chamados</h2>
        <p>${escapeHtml(error.message)}</p>
      </article>
    `;
    if (window.lucide) window.lucide.createIcons();
  }
}

function statusClassFor(status = "") {
  const normalized = status.toLowerCase();
  if (normalized.includes("aguard")) return "status-waiting";
  if (normalized.includes("alter")) return "status-changed";
  if (normalized.includes("fechado") || normalized.includes("concl")) return "status-closed";
  return "status-progress";
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatBrazilPhone(value) {
  const digits = digitsOnly(value).slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatInternationalPhone(value) {
  const digits = digitsOnly(value).slice(0, 14);
  return digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}

function formatPhoneByCountry(value, countryCode = "55") {
  return countryCode === "55" ? formatBrazilPhone(value) : formatInternationalPhone(value);
}

function splitInternationalPhone(value, fallbackCountryCode = "55") {
  const raw = String(value || "").trim();
  const match = raw.match(/^\+(\d{1,3})\s*(.*)$/);
  if (!match) {
    return {
      countryCode: fallbackCountryCode,
      localNumber: formatPhoneByCountry(raw, fallbackCountryCode),
    };
  }

  return {
    countryCode: match[1],
    localNumber: formatPhoneByCountry(match[2], match[1]),
  };
}

function buildInternationalPhone(countryCode, localNumber) {
  const formattedLocalNumber = formatPhoneByCountry(localNumber, countryCode);
  return formattedLocalNumber ? `+${countryCode} ${formattedLocalNumber}` : "";
}

function setupPhoneMasks(form) {
  const phoneInput = form.elements.phoneNumber;
  const mobileInput = form.elements.mobileNumber;
  const mobileCountry = form.elements.mobileCountryCode;

  phoneInput?.addEventListener("input", () => {
    phoneInput.value = formatBrazilPhone(phoneInput.value);
  });

  mobileInput?.addEventListener("input", () => {
    mobileInput.value = formatPhoneByCountry(mobileInput.value, mobileCountry?.value || "55");
  });

  mobileCountry?.addEventListener("change", () => {
    mobileInput.value = formatPhoneByCountry(mobileInput.value, mobileCountry.value);
  });
}

async function setupAuth() {
  const loginForm = document.querySelector("#loginForm");
  const loginButton = document.querySelector("#loginButton");
  const loginMessage = document.querySelector("#loginMessage");
  const logoutButton = document.querySelector("#logoutButton");
  const togglePassword = document.querySelector("#togglePassword");
  const passwordInput = loginForm.querySelector('[name="password"]');
  setupProfileSettings();

  togglePassword.addEventListener("click", () => {
    const shouldShow = passwordInput.type === "password";
    passwordInput.type = shouldShow ? "text" : "password";
    togglePassword.setAttribute("aria-label", shouldShow ? "Ocultar senha" : "Mostrar senha");
    togglePassword.setAttribute("title", shouldShow ? "Ocultar senha" : "Mostrar senha");
    togglePassword.innerHTML = icon(shouldShow ? "eye-off" : "eye");
    if (window.lucide) window.lucide.createIcons();
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginMessage.textContent = "";
    loginMessage.classList.remove("visible");

    const email = loginForm.querySelector('[name="email"]').value.trim().toLowerCase();
    const password = loginForm.querySelector('[name="password"]').value;

    if (!email || !password) {
      showLoginMessage("Informe e-mail e senha.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showLoginMessage("Informe um e-mail válido.");
      return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "Entrando...";

    try {
      const { response, data } = await requestJson("/api/login", {
        method: "POST",
        body: { email, password },
      });

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Não foi possível autenticar.");
      }

      applyAuthenticatedUser(data.user);
      loadRequesterProfile();
      loginForm.reset();
    } catch (error) {
      showLoginMessage(await formatLoginError(error));
    } finally {
      loginButton.disabled = false;
      loginButton.textContent = "Entrar";
    }
  });

  logoutButton.addEventListener("click", async () => {
    await fetch("/api/logout", { method: "POST" });
    document.body.classList.remove("authenticated");
    setRoute("home");
  });

  try {
    const response = await fetch("/api/me");
    const data = await response.json();

    if (response.ok && data.authenticated) {
      applyAuthenticatedUser(data.user);
      loadRequesterProfile();
    }
  } catch (_error) {
    document.body.classList.remove("authenticated");
  }

  function showLoginMessage(message) {
    loginMessage.textContent = message;
    loginMessage.classList.add("visible");
  }
}

function setupProfileSettings() {
  const menuButton = document.querySelector("#profileMenuButton");
  const menuPanel = document.querySelector("#profileMenuPanel");
  const openButton = document.querySelector("#openProfileSettings");
  const modal = document.querySelector("#profileModal");
  const closeButton = document.querySelector("#closeProfileModal");
  const cancelButton = document.querySelector("#cancelProfileSettings");
  const form = document.querySelector("#profileForm");
  const message = document.querySelector("#profileMessage");
  const saveButton = document.querySelector("#saveProfileButton");
  if (!menuButton || !menuPanel || !openButton || !modal || !form) return;
  setupPhoneMasks(form);

  menuButton.addEventListener("click", () => {
    const shouldOpen = menuPanel.hidden;
    menuPanel.hidden = !shouldOpen;
    menuButton.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
  });

  document.addEventListener("click", (event) => {
    if (menuPanel.hidden || event.target.closest(".user-menu")) return;
    closeProfileMenu();
  });

  openButton.addEventListener("click", async () => {
    closeProfileMenu();
    await openProfileModal();
  });

  closeButton?.addEventListener("click", closeProfileModal);
  cancelButton?.addEventListener("click", closeProfileModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeProfileModal();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setProfileMessage("");
    saveButton.disabled = true;
    saveButton.textContent = "Salvando...";

    try {
      const payload = {
        firstName: form.elements.firstName.value,
        surName: form.elements.surName.value,
        phoneNumber: formatBrazilPhone(form.elements.phoneNumber.value),
        mobileNumber: buildInternationalPhone(form.elements.mobileCountryCode.value, form.elements.mobileNumber.value),
      };

      const response = await fetch("/api/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Não foi possível salvar seu perfil.");
      }

      applyProfileData(data.profile);
      setProfileMessage("Perfil atualizado no atendimento.", "success");
    } catch (error) {
      setProfileMessage(error.message || "Não foi possível salvar seu perfil.");
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = "Salvar alterações";
    }
  });

  async function openProfileModal() {
    modal.hidden = false;
    setProfileMessage("Carregando dados do atendimento...", "success");
    fillProfileForm({
      email: topdeskSession.email,
      firstName: "",
      surName: "",
      phoneNumber: "",
      mobileNumber: "",
    });

    try {
      const response = await fetch("/api/perfil");
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Não foi possível carregar seu perfil.");
      }

      fillProfileForm(data.profile);
      setProfileMessage("");
    } catch (error) {
      setProfileMessage(error.message || "Não foi possível carregar seu perfil.");
    }

    form.elements.firstName.focus();
  }

  function closeProfileModal() {
    modal.hidden = true;
    setProfileMessage("");
  }

  function closeProfileMenu() {
    menuPanel.hidden = true;
    menuButton.setAttribute("aria-expanded", "false");
  }

  function fillProfileForm(profile) {
    const phoneNumber = splitInternationalPhone(profile.phoneNumber || "", "55");
    const mobileNumber = splitInternationalPhone(profile.mobileNumber || "", "55");

    form.elements.firstName.value = profile.firstName || "";
    form.elements.surName.value = profile.surName || "";
    form.elements.email.value = profile.email || topdeskSession.email || "";
    form.elements.phoneNumber.value = phoneNumber.localNumber;
    form.elements.mobileCountryCode.value = form.elements.mobileCountryCode.querySelector(`option[value="${mobileNumber.countryCode}"]`)
      ? mobileNumber.countryCode
      : "55";
    form.elements.mobileNumber.value = formatPhoneByCountry(mobileNumber.localNumber, form.elements.mobileCountryCode.value);
  }

  function setProfileMessage(text, type = "error") {
    message.textContent = text;
    message.classList.toggle("visible", Boolean(text));
    message.classList.toggle("success", type === "success");
  }
}

function applyProfileData(profile) {
  const displayName = profile.name || `${profile.firstName || ""} ${profile.surName || ""}`.trim() || topdeskSession.name;

  topdeskSession.name = displayName;
  topdeskSession.phone = profile.mobileNumber || profile.phoneNumber || topdeskSession.phone || "";
  topdeskSession.email = profile.email || topdeskSession.email;

  document.querySelector("#profileName").textContent = displayName;
  document.querySelector(".avatar").textContent = getInitials(displayName);
  syncTicketIdentity();
}

async function formatLoginError(error) {
  if (error instanceof TypeError || error.message === "Failed to fetch") {
    try {
      const { response } = await requestJson("/api/health", { method: "GET" });
      if (response.ok) {
        return "O portal está online, mas o navegador não conseguiu enviar o login. Recarregue a página e tente novamente.";
      }
    } catch (_healthError) {
      return "Não foi possível conectar ao portal. Verifique se o servidor local está rodando e recarregue a página.";
    }

    return "Não foi possível conectar ao portal. Recarregue a página e tente novamente.";
  }

  return error.message || "Não foi possível entrar.";
}

function requestJson(path, options = {}) {
  const method = options.method || "GET";
  const url = path.startsWith("http") ? path : `${window.location.origin}${path}`;
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const body = options.body ? JSON.stringify(options.body) : undefined;

  if (typeof window.fetch === "function") {
    return window.fetch(url, {
      method,
      credentials: "same-origin",
      headers,
      body,
      cache: method === "GET" ? "no-store" : undefined,
    }).then(async (response) => ({
      response,
      data: await response.json().catch(() => ({})),
    }));
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.withCredentials = true;
    Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));
    xhr.onload = () => {
      const response = {
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
      };
      let data = {};
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
      } catch (_error) {
        data = {};
      }
      resolve({ response, data });
    };
    xhr.onerror = () => reject(new TypeError("Failed to fetch"));
    xhr.send(body);
  });
}

async function loadRequesterProfile() {
  try {
    const response = await fetch("/api/solicitante");
    const data = await response.json();
    if (!response.ok || !data.ok) return;

    topdeskSession.company = data.caller.branch || topdeskSession.company;
    topdeskSession.phone = data.caller.phone || "";
    syncTicketIdentity();
  } catch (_error) {
    // Dados complementares do atendimento são opcionais para o preenchimento inicial.
  }
}

function applyAuthenticatedUser(user) {
  topdeskSession.name = user.displayName || user.email || "Usuário";
  topdeskSession.email = user.email || "";
  topdeskSession.company = user.company || "";
  topdeskSession.phone = "";
  topdeskSession.callerId = user.callerId || "";

  document.body.classList.add("authenticated");
  document.querySelector("#profileName").textContent = user.displayName || user.email || "Usuário";
  document.querySelector(".avatar").textContent = getInitials(user.displayName || user.email || "Usuário");
  syncTicketIdentity();
}

function getInitials(name) {
  return name
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function syncTicketIdentity() {
  const form = document.querySelector("#ticketForm");
  if (!form) return;

  form.querySelector('[name="name"]').value = topdeskSession.name;
  form.querySelector('[name="email"]').value = topdeskSession.email;
  form.querySelector('[name="company"]').value = topdeskSession.company;
  form.querySelector('[name="phone"]').value = topdeskSession.phone || "Não informado";
}

function renderFallbackIcons() {
  document.querySelectorAll("i[data-lucide]").forEach((iconElement) => {
    const name = iconElement.dataset.lucide || "circle";
    const label = name
      .split("-")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    iconElement.setAttribute("aria-hidden", "true");
    iconElement.classList.add("fallback-icon");
    iconElement.textContent = label || "I";
  });
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  } else {
    renderFallbackIcons();
  }
}

function setupResponsiveCarousel() {
  let previousCardsPerSlide = getServiceCardsPerSlide();
  let resizeTimer;

  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const nextCardsPerSlide = getServiceCardsPerSlide();
      if (nextCardsPerSlide === previousCardsPerSlide) return;
      previousCardsPerSlide = nextCardsPerSlide;
      activeServiceSlide = 0;
      renderServices();
    }, 160);
  });
}

async function init() {
  setupRouting();
  setupTicketForm();
  setupServiceFinder();
  setupSearch();
  setupAuth();
  setupResponsiveCarousel();
  renderTickets([]);

  try {
    await loadPortalContent();
  } catch (_error) {
    services = [];
    requestTypes = [];
    articles = [];
    announcements = [];
  }

  renderServices();
  hydrateTicketCatalogControls();
  refreshServiceFinder();
  renderArticles();
  renderAnnouncements();
  refreshIcons();
}

document.addEventListener("DOMContentLoaded", init);
