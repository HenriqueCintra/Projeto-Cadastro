// Sistema de Gestão de Beneficiários - Nas Ramas da Esperança
// Com Hierarquia de Acesso e Controle de Permissões
// Atualizado com Campos de Culturas e Variedades

// CORREÇÃO: A lista de beneficiários foi esvaziada para começar do zero.
let beneficiarios = [];
let donations = [];

// Sistema de Usuários e Permissões
const users = {
  admin: {
    username: "admin",
    password: "admin123",
    role: "administrador",
    name: "Administrador",
    permissions: [
      "dashboard",
      "cadastro",
      "relatorios",
      "usuarios",
      "all_data",
      "export",
      "donations",
    ],
  },
  supervisor1: {
    username: "supervisor1",
    password: "sup123",
    role: "supervisor",
    name: "Supervisor",
    permissions: [
      "dashboard",
      "cadastro",
      "relatorios",
      "partial_data",
      "donations",
    ],
  },
  cadastrador1: {
    username: "cadastrador1",
    password: "cad123",
    role: "cadastrador",
    name: "Cadastrador",
    permissions: ["cadastro", "basic_list", "donations"],
  },
};

// Variáveis globais
let currentUser = null;
let currentScreen = "login";
let filteredBeneficiarios = [...beneficiarios];
let auditLog = [];

// Sistema de Auditoria
const logAction = (action, details = "") => {
  if (!currentUser) return;
  const logEntry = {
    user: currentUser.username,
    role: currentUser.role,
    action: action,
    details: details,
    timestamp: new Date().toLocaleString("pt-BR"),
  };
  auditLog.unshift(logEntry);
  if (auditLog.length > 50) {
    auditLog = auditLog.slice(0, 50);
  }
};

// Controle de Permissões
const hasPermission = (permission) => {
  return currentUser && currentUser.permissions.includes(permission);
};

const canAccessScreen = (screenName) => {
  const screenPermissions = {
    dashboard: true,
    cadastro: true,
    donations: true,
    relatorios: ["administrador", "supervisor"].includes(currentUser?.role),
    usuarios: currentUser?.role === "administrador",
  };
  return screenPermissions[screenName] !== false;
};

// Utilitários
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR");
};
const formatCPF = (cpf) => {
  if (!cpf) return "N/A";
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};
const maskCPF = (cpf) => {
  if (!cpf) return "N/A";
  return "***.***.***-**";
};
const maskPhone = (phone) => {
  if (!phone) return "N/A";
  return "(XX) XXXXX-XXXX";
};
const maskData = (data, field) => {
  if (!currentUser) return "[RESTRITO]";
  switch (currentUser.role) {
    case "administrador":
      return data || "N/A";
    case "supervisor":
      if (field === "cpf") return maskCPF(data);
      if (field === "renda") return "[PARCIAL]";
      if (field === "telefone") return data || "N/A";
      if (field === "latitude" || field === "longitude") return "[PARCIAL]";
      return data || "N/A";
    case "cadastrador":
      if (
        field === "cpf" ||
        field === "telefone" ||
        field === "renda" ||
        field === "area_cultivada" ||
        field === "latitude" ||
        field === "longitude"
      )
        return "[RESTRITO]";
      return data || "N/A";
    default:
      return "[RESTRITO]";
  }
};
const getEstadoFromAddress = (endereco) => {
  const estados = endereco.match(/, ([A-Z]{2})$/);
  return estados ? estados[1] : "N/A";
};
const getCidadeFromAddress = (endereco) => {
  const parts = endereco.split(", ");
  return parts.length >= 2 ? parts[parts.length - 2] : "N/A";
};
const getTypeBadgeClass = (tipo) => {
  const typeMap = {
    "Agricultor Individual": "type-badge--agricultor",
    "Associação Rural": "type-badge--associacao",
    "Família Beneficiada": "type-badge--familia",
    "Comunidade Quilombola": "type-badge--quilombola",
    "Comunidade Indígena": "type-badge--indigena",
    Cooperativa: "type-badge--cooperativa",
  };
  return typeMap[tipo] || "type-badge--agricultor";
};
const getCultureBadgeClass = (cultura) => {
  const cultureMap = {
    "Batata-doce": "culture-badge--batata-doce",
    Macaxeira: "culture-badge--macaxeira",
    Milho: "culture-badge--milho",
    "Feijão caupi": "culture-badge--feijao-caupi",
    Abóbora: "culture-badge--abobora",
  };
  return cultureMap[cultura] || "culture-badge";
};

// Toast de notificações
const showToast = (message, type = "success") => {
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toast-message");
  toastMessage.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => {
    toast.className = "toast hidden";
  }, 3000);
};

// Sistema de Autenticação
const initLogin = () => {
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const user = users[username];
    if (user && user.password === password) {
      currentUser = user;
      document.body.className = `user-${currentUser.role}`;
      logAction("Login realizado", `Usuário ${username} logou no sistema`);
      showScreen("dashboard");
      const welcomeMessages = {
        administrador: "Bem-vindo! Você tem acesso completo ao sistema.",
        supervisor:
          "Bem-vindo! Você pode acessar dashboard e relatórios básicos.",
        cadastrador: "Bem-vindo! Você pode cadastrar novos beneficiários.",
      };
      showToast(
        welcomeMessages[currentUser.role] || "Login realizado com sucesso!"
      );
      loginError.classList.add("hidden");
    } else {
      loginError.classList.remove("hidden");
      showToast("Credenciais inválidas!", "error");
    }
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
  });
};

// Sistema de Navegação
const showScreen = (screenName) => {
  if (!canAccessScreen(screenName)) {
    showToast("Você não tem permissão para acessar esta tela.", "error");
    return;
  }
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("active");
    screen.classList.add("hidden");
  });
  const targetScreen = document.getElementById(`${screenName}-screen`);
  if (targetScreen) {
    targetScreen.classList.remove("hidden");
    targetScreen.classList.add("active");
    currentScreen = screenName;
    updateUserInfo();
    updateNavigation();
    applyFormPermissions();
    switch (screenName) {
      case "dashboard":
        updateDashboard();
        break;
      case "cadastro":
        updateRecentCadastros();
        initCultureForm();
        break;
      case "donations":
        initDonationForm();
        break;
      case "relatorios":
        updateReports();
        break;
      case "usuarios":
        updateUserManagement();
        break;
    }
  }
};
const applyFormPermissions = () => {
  if (!currentUser || currentScreen !== "cadastro") return;
  if (currentUser.role === "cadastrador") {
    const sensitiveFields = ["documento", "latitude", "longitude", "renda"];
    sensitiveFields.forEach((fieldId) => {
      const field = document.getElementById(fieldId);
      const fieldGroup = field?.closest(".form-group");
      if (fieldGroup) fieldGroup.style.display = "none";
    });
  } else {
    const allFields = ["documento", "latitude", "longitude", "renda"];
    allFields.forEach((fieldId) => {
      const field = document.getElementById(fieldId);
      const fieldGroup = field?.closest(".form-group");
      if (fieldGroup) fieldGroup.style.display = "block";
    });
  }
};
const updateUserInfo = () => {
  if (!currentUser) return;
  const badges = document.querySelectorAll('[id^="user-badge"]');
  const names = document.querySelectorAll('[id^="user-name"]');
  badges.forEach((badge) => {
    badge.textContent =
      currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
    badge.className = `user-badge ${currentUser.role}`;
  });
  names.forEach((name) => {
    name.textContent = currentUser.name;
  });
};
const updateNavigation = () => {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.dataset.screen === currentScreen) btn.classList.add("active");
  });
  const usuariosButtons = document.querySelectorAll('[id^="nav-usuarios"]');
  const relatoriosButtons = document.querySelectorAll('[id^="nav-relatorios"]');
  usuariosButtons.forEach((btn) => {
    btn.style.display =
      currentUser.role !== "administrador" ? "none" : "inline-flex";
  });
  relatoriosButtons.forEach((btn) => {
    btn.style.display =
      currentUser.role === "cadastrador" ? "none" : "inline-flex";
  });
};
const initNavigation = () => {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const screen = btn.dataset.screen;
      if (screen) showScreen(screen);
    });
  });
  document.querySelectorAll(".logout-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      logAction(
        "Logout realizado",
        `Usuário ${currentUser.username} saiu do sistema`
      );
      currentUser = null;
      document.body.className = "";
      showScreen("login");
      showToast("Logout realizado com sucesso!");
    });
  });
};

// Dashboard
const updateDashboard = () => {
  updateMetrics();
  updateCharts();
  updateBeneficiariesTable();
  const accessWarning = document.getElementById("access-warning");
  const metricsSection = document.getElementById("metrics-section");
  const chartsSection = document.getElementById("charts-section");
  if (currentUser.role === "cadastrador") {
    accessWarning.classList.remove("hidden");
    metricsSection.style.display = "none";
    chartsSection.style.display = "none";
  } else {
    accessWarning.classList.add("hidden");
    metricsSection.style.display = "grid";
    chartsSection.style.display = "grid";
  }
};
const updateMetrics = () => {
  const totalCadastros = beneficiarios.length;
  const totalFamilias = beneficiarios.reduce(
    (sum, b) => sum + b.pessoas_familia,
    0
  );
  let totalArea = 0;
  if (currentUser.role !== "cadastrador") {
    totalArea = beneficiarios.reduce((sum, b) => sum + b.area_cultivada, 0);
  }
  const culturasUnicas = new Set();
  beneficiarios.forEach((b) => {
    if (b.culturas && Array.isArray(b.culturas)) {
      b.culturas.forEach((cultura) => culturasUnicas.add(cultura));
    }
  });
  document.getElementById("total-cadastros").textContent = totalCadastros;
  document.getElementById("total-familias").textContent =
    totalFamilias.toLocaleString("pt-BR");
  document.getElementById("total-culturas").textContent = culturasUnicas.size;
  const areaElement = document.getElementById("total-area");
  const areaMetric = document.getElementById("area-metric");
  if (currentUser.role === "cadastrador") {
    areaElement.textContent = "[RESTRITO]";
    areaMetric.style.opacity = "0.5";
  } else if (currentUser.role === "supervisor") {
    areaElement.textContent = `~${Math.round(totalArea)}`;
    areaMetric.style.opacity = "0.8";
  } else {
    areaElement.textContent = totalArea.toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
    });
    areaMetric.style.opacity = "1";
  }
};
const updateCharts = () => {
  if (currentUser.role !== "cadastrador") {
    createCulturesChart();
    createProducersChart();
  }
};
const createCulturesChart = () => {
  const ctx = document.getElementById("culturesChart")?.getContext("2d");
  if (!ctx) return;
  const cultureCounts = {};
  beneficiarios.forEach((b) => {
    if (b.culturas && Array.isArray(b.culturas)) {
      b.culturas.forEach((cultura) => {
        cultureCounts[cultura] = (cultureCounts[cultura] || 0) + 1;
      });
    }
  });
  new Chart(ctx, {
    type: "pie",
    data: {
      labels: Object.keys(cultureCounts),
      datasets: [
        {
          data: Object.values(cultureCounts),
          backgroundColor: [
            "#1FB8CD",
            "#FFC185",
            "#B4413C",
            "#ECEBD5",
            "#5D878F",
          ],
          borderWidth: 2,
          borderColor: "#fff",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: { padding: 15, usePointStyle: true },
        },
      },
    },
  });
};
const createProducersChart = () => {
  const ctx = document.getElementById("producersChart")?.getContext("2d");
  if (!ctx) return;
  const cultureCounts = {};
  beneficiarios.forEach((b) => {
    if (b.culturas && Array.isArray(b.culturas)) {
      b.culturas.forEach((cultura) => {
        cultureCounts[cultura] = (cultureCounts[cultura] || 0) + 1;
      });
    }
  });
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(cultureCounts),
      datasets: [
        {
          label: "Produtores",
          data: Object.values(cultureCounts),
          backgroundColor: "#1FB8CD",
          borderColor: "#5D878F",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
    },
  });
};

// Tabela de Beneficiários
const updateBeneficiariesTable = () => {
  const tableBody = document.getElementById("table-body");
  applyFilters();
  tableBody.innerHTML = "";
  filteredBeneficiarios.forEach((beneficiario) => {
    const row = document.createElement("tr");
    const cidade = getCidadeFromAddress(beneficiario.endereco);
    const estado = getEstadoFromAddress(beneficiario.endereco);
    let cpfCell = "";
    let telefoneCell = "";
    let areaCell = "";
    if (currentUser.role === "administrador") {
      cpfCell = `<td class="admin-only">${formatCPF(beneficiario.cpf)}</td>`;
      telefoneCell = `<td class="supervisor-admin">${beneficiario.telefone}</td>`;
      areaCell = `<td class="admin-only">${beneficiario.area_cultivada} ha</td>`;
    } else if (currentUser.role === "supervisor") {
      cpfCell = `<td class="admin-only"><span class="masked-data">${maskCPF(
        beneficiario.cpf
      )}</span></td>`;
      telefoneCell = `<td class="supervisor-admin">${beneficiario.telefone.substring(
        0,
        6
      )}****</td>`;
      areaCell = `<td class="admin-only"><span class="masked-data">[PARCIAL]</span></td>`;
    } else {
      cpfCell = `<td class="admin-only"><span class="masked-data">[RESTRITO]</span></td>`;
      telefoneCell = `<td class="supervisor-admin"><span class="masked-data">[RESTRITO]</span></td>`;
      areaCell = `<td class="admin-only"><span class="masked-data">[RESTRITO]</span></td>`;
    }
    const cultureBadges =
      beneficiario.culturas
        ?.map(
          (cultura) =>
            `<span class="culture-badge ${getCultureBadgeClass(
              cultura
            )}">${cultura}</span>`
        )
        .join("") || '<span class="culture-badge">N/A</span>';
    row.innerHTML = `
      <td>
        <div>
          <strong>${beneficiario.nome}</strong><br>
          <small style="color: var(--color-text-secondary);">${
            currentUser.role === "administrador"
              ? beneficiario.cpf || "N/A"
              : "[RESTRITO]"
          }</small>
        </div>
      </td>
      <td><span class="type-badge ${getTypeBadgeClass(beneficiario.tipo)}">${
      beneficiario.tipo
    }</span></td>
      <td>${cidade}, ${estado}</td>
      ${cpfCell}
      ${telefoneCell}
      <td><div class="culture-badges">${cultureBadges}</div></td>
      ${areaCell}
      <td>${beneficiario.pessoas_familia}</td>
      <td>${formatDate(beneficiario.data_cadastro)}</td>
      <td><button class="action-btn" onclick="showBeneficiaryDetails(${
        beneficiario.id
      })">👁️ Ver</button></td>
    `;
    tableBody.appendChild(row);
  });
  logAction(
    "Visualizou lista de beneficiários",
    `${filteredBeneficiarios.length} registros`
  );
};

const applyFilters = () => {
  const searchTerm =
    document.getElementById("search-input")?.value?.toLowerCase() || "";
  const typeFilter = document.getElementById("filter-tipo")?.value || "";
  const cultureFilter = document.getElementById("filter-cultura")?.value || "";
  filteredBeneficiarios = beneficiarios.filter((b) => {
    const matchesSearch =
      !searchTerm ||
      b.nome.toLowerCase().includes(searchTerm) ||
      (currentUser.role === "administrador" &&
        b.cpf &&
        b.cpf.toLowerCase().includes(searchTerm));
    const matchesType = !typeFilter || b.tipo === typeFilter;
    const matchesCulture =
      !cultureFilter || (b.culturas && b.culturas.includes(cultureFilter));
    return matchesSearch && matchesType && matchesCulture;
  });
};
const initTableFilters = () => {
  const searchInput = document.getElementById("search-input");
  const filterTipo = document.getElementById("filter-tipo");
  const filterCultura = document.getElementById("filter-cultura");
  const exportBtn = document.getElementById("export-btn");
  if (searchInput) {
    searchInput.addEventListener("input", updateBeneficiariesTable);
    if (currentUser && currentUser.role === "cadastrador") {
      searchInput.placeholder = "Buscar por nome...";
    }
  }
  if (filterTipo)
    filterTipo.addEventListener("change", updateBeneficiariesTable);
  if (filterCultura)
    filterCultura.addEventListener("change", updateBeneficiariesTable);
  if (exportBtn) {
    exportBtn.style.display =
      currentUser && hasPermission("export") ? "inline-flex" : "none";
  }
};

// Modal de Detalhes
const showBeneficiaryDetails = (id) => {
  const beneficiario = beneficiarios.find((b) => b.id === id);
  if (!beneficiario) return;
  const modal = document.getElementById("details-modal");
  const modalTitle = document.getElementById("modal-title");
  const modalBody = document.getElementById("modal-body");
  modalTitle.textContent = `Detalhes - ${beneficiario.nome}`;
  const culturasHtml =
    beneficiario.culturas
      ?.map(
        (cultura) =>
          `<span class="culture-badge ${getCultureBadgeClass(
            cultura
          )}">${cultura}</span>`
      )
      .join("") || "N/A";
  let variedadesHtml = "N/A";
  if (
    beneficiario.variedades &&
    Object.keys(beneficiario.variedades).length > 0
  ) {
    variedadesHtml = Object.entries(beneficiario.variedades)
      .map(
        ([cultura, variedades]) =>
          `<div style="margin-bottom: 8px;"><strong>${cultura}:</strong><div class="variety-list">${variedades
            .split(",")
            .map((v) => `<span class="variety-item">${v.trim()}</span>`)
            .join("")}</div></div>`
      )
      .join("");
  }
  modalBody.innerHTML = `
    <div class="detail-row"><span class="detail-label">Nome:</span><span class="detail-value">${
      beneficiario.nome
    }</span></div>
    <div class="detail-row"><span class="detail-label">CPF/CNPJ:</span><span class="detail-value">${maskData(
      beneficiario.cpf,
      "cpf"
    )}</span></div>
    <div class="detail-row"><span class="detail-label">Telefone:</span><span class="detail-value">${maskData(
      beneficiario.telefone,
      "telefone"
    )}</span></div>
    <div class="detail-row"><span class="detail-label">Email:</span><span class="detail-value">${
      beneficiario.email || "N/A"
    }</span></div>
    <div class="detail-row"><span class="detail-label">Tipo:</span><span class="detail-value">${
      beneficiario.tipo
    }</span></div>
    <div class="detail-row"><span class="detail-label">Endereço:</span><span class="detail-value">${
      beneficiario.endereco
    }</span></div>
    <div class="detail-row"><span class="detail-label">Coordenadas:</span><span class="detail-value">${
      beneficiario.latitude && beneficiario.longitude
        ? `${maskData(beneficiario.latitude, "latitude")}, ${maskData(
            beneficiario.longitude,
            "longitude"
          )}`
        : "N/A"
    }</span></div>
    <div class="detail-row"><span class="detail-label">Área Cultivada:</span><span class="detail-value">${maskData(
      beneficiario.area_cultivada,
      "area_cultivada"
    )} ${currentUser.role === "administrador" ? "hectares" : ""}</span></div>
    <div class="detail-row"><span class="detail-label">Culturas:</span><div class="detail-value"><div class="culture-badges">${culturasHtml}</div></div></div>
    <div class="detail-row"><span class="detail-label">Variedades:</span><div class="detail-value">${variedadesHtml}</div></div>
    <div class="detail-row"><span class="detail-label">Pessoas na Família:</span><span class="detail-value">${
      beneficiario.pessoas_familia
    }</span></div>
    <div class="detail-row"><span class="detail-label">Renda:</span><span class="detail-value">${maskData(
      beneficiario.renda,
      "renda"
    )}</span></div>
    <div class="detail-row"><span class="detail-label">Acesso à Água:</span><span class="detail-value">${
      beneficiario.acesso_agua
    }</span></div>
    <div class="detail-row"><span class="detail-label">Outros Programas:</span><span class="detail-value">${
      beneficiario.outros_programas || "Nenhum"
    }</span></div>
    <div class="detail-row"><span class="detail-label">Data de Cadastro:</span><span class="detail-value">${formatDate(
      beneficiario.data_cadastro
    )}</span></div>
    <div class="detail-row"><span class="detail-label">Cadastrado por:</span><span class="detail-value">${
      currentUser.role === "administrador"
        ? beneficiario.cadastrado_por || "N/A"
        : "[RESTRITO]"
    }</span></div>
    <div class="detail-row"><span class="detail-label">Observações:</span><span class="detail-value">${
      beneficiario.observacoes || "Nenhuma"
    }</span></div>
  `;
  modal.classList.remove("hidden");
  logAction("Visualizou detalhes", `Beneficiário: ${beneficiario.nome}`);
};

const initModal = () => {
  const modal = document.getElementById("details-modal");
  const closeBtn = document.getElementById("close-modal");
  closeBtn.addEventListener("click", () => modal.classList.add("hidden"));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.add("hidden");
  });
};

// Sistema de Culturas do Formulário
const initCultureForm = () => {
  const cultureCheckboxes = document.querySelectorAll('input[name="culturas"]');
  cultureCheckboxes.forEach((checkbox) =>
    checkbox.addEventListener("change", updateVarietyFields)
  );
  updateVarietyFields();
};

const updateVarietyFields = () => {
  const cultureCheckboxes = document.querySelectorAll('input[name="culturas"]');
  const varietyFields = document.querySelectorAll(".variety-field");
  varietyFields.forEach((field) => {
    field.classList.add("hidden");
    field.classList.remove("show");
  });
  cultureCheckboxes.forEach((checkbox) => {
    if (checkbox.checked) {
      const cultura = checkbox.value;
      const fieldId = `variedades-${cultura
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace("ã", "a")}`;
      const field = document.getElementById(fieldId);
      if (field) {
        field.classList.remove("hidden");
        field.classList.add("show");
        const input = field.querySelector("input");
        if (input) input.required = true;
      }
    } else {
      const cultura = checkbox.value;
      const fieldId = `variedades-${cultura
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace("ã", "a")}`;
      const field = document.getElementById(fieldId);
      if (field) {
        const input = field.querySelector("input");
        if (input) {
          input.required = false;
          input.value = "";
        }
      }
    }
  });
};

// Formulário de Cadastro
const initCadastroForm = () => {
  const form = document.getElementById("cadastro-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const selectedCultures = Array.from(
      document.querySelectorAll('input[name="culturas"]:checked')
    ).map((cb) => cb.value);
    if (selectedCultures.length === 0) {
      showToast("Você deve selecionar pelo menos uma cultura!", "error");
      const culturesSection = document.querySelector(".cultures-section");
      culturesSection.classList.add("form-error");
      setTimeout(() => culturesSection.classList.remove("form-error"), 3000);
      return;
    }
    const variedades = {};
    selectedCultures.forEach((cultura) => {
      const fieldId = `variedades-input-${cultura
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace("ã", "a")}`;
      const input = document.getElementById(fieldId);
      if (input && input.value.trim()) variedades[cultura] = input.value.trim();
    });
    const missingVarieties = selectedCultures.filter(
      (cultura) => !variedades[cultura]
    );
    if (missingVarieties.length > 0) {
      showToast(
        `Informe as variedades para: ${missingVarieties.join(", ")}`,
        "error"
      );
      return;
    }
    const newBeneficiario = {
      id:
        beneficiarios.length > 0
          ? Math.max(...beneficiarios.map((b) => b.id)) + 1
          : 1,
      nome: document.getElementById("nome").value,
      cpf: document.getElementById("documento")?.value || "",
      telefone: document.getElementById("telefone").value,
      email: document.getElementById("email").value || "",
      tipo: document.getElementById("tipo").value,
      endereco: document.getElementById("endereco").value,
      cidade: getCidadeFromAddress(document.getElementById("endereco").value),
      estado: getEstadoFromAddress(document.getElementById("endereco").value),
      latitude: parseFloat(document.getElementById("latitude")?.value) || null,
      longitude:
        parseFloat(document.getElementById("longitude")?.value) || null,
      area_cultivada: parseFloat(
        document.getElementById("area_cultivada").value
      ),
      culturas: selectedCultures,
      variedades: variedades,
      pessoas_familia: parseInt(
        document.getElementById("pessoas_familia").value
      ),
      renda: document.getElementById("renda")?.value || "Não informado",
      acesso_agua: document.getElementById("acesso_agua").value,
      outros_programas: document.getElementById("outros_programas").value || "",
      observacoes: document.getElementById("observacoes").value || "",
      data_cadastro: new Date().toISOString().substring(0, 10),
      cadastrado_por: currentUser.username,
    };
    beneficiarios.push(newBeneficiario);
    form.reset();
    updateVarietyFields();
    updateRecentCadastros();
    logAction(
      "Novo cadastro realizado",
      `Beneficiário: ${
        newBeneficiario.nome
      } - Culturas: ${selectedCultures.join(", ")}`
    );
    showToast("Beneficiário cadastrado com sucesso!");
  });
};

const updateRecentCadastros = () => {
  const recentList = document.getElementById("ultimos-cadastros");
  if (!recentList) return;
  const recent = [...beneficiarios]
    .sort((a, b) => new Date(b.data_cadastro) - new Date(a.data_cadastro))
    .slice(0, 5);
  recentList.innerHTML = "";
  recent.forEach((beneficiario) => {
    const cultureBadges =
      beneficiario.culturas
        ?.map(
          (cultura) =>
            `<span class="culture-badge ${getCultureBadgeClass(
              cultura
            )}">${cultura}</span>`
        )
        .join("") || "";
    const item = document.createElement("div");
    item.className = "recent-item";
    item.innerHTML = `<h4>${beneficiario.nome}</h4><p>${
      beneficiario.tipo
    }</p><div class="recent-cultures">${cultureBadges}</div><div class="recent-date">${formatDate(
      beneficiario.data_cadastro
    )}</div>`;
    recentList.appendChild(item);
  });
};

// Doações
const initDonationForm = () => {
  populateBeneficiarySelect();
  const donationTypeRadios = document.querySelectorAll(
    'input[name="donation-type"]'
  );
  donationTypeRadios.forEach((radio) =>
    radio.addEventListener("change", updateDonationItems)
  );
  const getLocationBtn = document.getElementById("get-location-btn");
  getLocationBtn.addEventListener("click", getLocation);
  const donationForm = document.getElementById("donation-form");
  donationForm.addEventListener("submit", handleDonationSubmit);
  updateRecentDonations();
};

const populateBeneficiarySelect = () => {
  const select = document.getElementById("beneficiary-select");
  select.innerHTML = '<option value="">Selecione um beneficiário</option>';
  beneficiarios.forEach((b) => {
    const option = document.createElement("option");
    option.value = b.id;
    option.textContent = b.nome;
    select.appendChild(option);
  });
};

const updateDonationItems = (e) => {
  const donationItemsDiv = document.getElementById("donation-items");
  const type = e.target.value;
  let itemsHtml = "";

  const items = {
    muda: ["Batata-doce"],
    semente: ["Macaxeira", "Feijão"],
    maniva: ["Macaxeira"],
    alimento: ["Batata-doce", "Macaxeira", "Feijão", "Abóbora"],
  };

  if (items[type]) {
    itemsHtml = `<div class="form-group">
                   <label class="form-label">Item *</label>
                   <div class="d-flex" style="gap: 1rem;">`;
    items[type].forEach((item) => {
      itemsHtml += `<label><input type="radio" name="donation-item" value="${item}" required> ${item}</label>`;
    });
    itemsHtml += `</div></div>`;
    donationItemsDiv.classList.remove("hidden");
  } else {
    donationItemsDiv.classList.add("hidden");
  }
  donationItemsDiv.innerHTML = itemsHtml;
};

const getLocation = () => {
  const locationStatus = document.getElementById("location-status");
  if (navigator.geolocation) {
    locationStatus.textContent = "Obtendo localização...";
    navigator.geolocation.getCurrentPosition(
      (position) => {
        document.getElementById("donation-latitude").value =
          position.coords.latitude;
        document.getElementById("donation-longitude").value =
          position.coords.longitude;
        locationStatus.textContent = `Localização obtida: ${position.coords.latitude.toFixed(
          4
        )}, ${position.coords.longitude.toFixed(4)}`;
        showToast("Localização capturada com sucesso!");
      },
      () => {
        locationStatus.textContent = "Não foi possível obter a localização.";
        showToast("Erro ao obter localização.", "error");
      }
    );
  } else {
    locationStatus.textContent =
      "Geolocalização não é suportada por este navegador.";
    showToast("Geolocalização não suportada.", "error");
  }
};

const handleDonationSubmit = (e) => {
  e.preventDefault();
  const form = e.target;
  const beneficiaryId = form.querySelector("#beneficiary-select").value;
  const donationType = form.querySelector(
    'input[name="donation-type"]:checked'
  ).value;
  const donationItem = form.querySelector(
    'input[name="donation-item"]:checked'
  ).value;
  const quantity = form.querySelector("#quantity").value;
  const latitude = form.querySelector("#donation-latitude").value;
  const longitude = form.querySelector("#donation-longitude").value;

  const newDonation = {
    id: donations.length > 0 ? Math.max(...donations.map((d) => d.id)) + 1 : 1,
    beneficiaryId: parseInt(beneficiaryId),
    type: donationType,
    item: donationItem,
    quantity: parseFloat(quantity),
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    date: new Date().toISOString().substring(0, 10),
    registeredBy: currentUser.username,
  };

  donations.push(newDonation);
  logAction(
    "Nova doação registrada",
    `Item: ${newDonation.item}, Qtd: ${newDonation.quantity}kg`
  );
  showToast("Doação registrada com sucesso!");
  form.reset();
  document.getElementById("donation-items").innerHTML = "";
  document.getElementById("location-status").textContent = "";
  updateRecentDonations();
};

const updateRecentDonations = () => {
  const recentDonationsBody = document.getElementById("recent-donations-body");
  if (!recentDonationsBody) return;

  const recent = [...donations]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  recentDonationsBody.innerHTML = "";

  recent.forEach((donation) => {
    const beneficiary = beneficiarios.find(
      (b) => b.id === donation.beneficiaryId
    );
    const row = document.createElement("tr");
    row.innerHTML = `
        <td>${beneficiary ? beneficiary.nome : "N/A"}</td>
        <td>${donation.item}</td>
        <td>${donation.quantity}</td>
        <td>${formatDate(donation.date)}</td>
      `;
    recentDonationsBody.appendChild(row);
  });
};

// Relatórios
const updateReports = () => {
  createStateChart();
  if (currentUser.role === "administrador") createIncomeChart();
  createVarietiesChart();
  updateStatsRummary();
  logAction("Visualizou relatórios", "Tela de relatórios acessada");
};

const createStateChart = () => {
  const ctx = document.getElementById("stateChart")?.getContext("2d");
  if (!ctx) return;
  const stateCounts = {};
  beneficiarios.forEach((b) => {
    const estado = getEstadoFromAddress(b.endereco);
    stateCounts[estado] = (stateCounts[estado] || 0) + 1;
  });
  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(stateCounts),
      datasets: [
        {
          data: Object.values(stateCounts),
          backgroundColor: [
            "#1FB8CD",
            "#FFC185",
            "#B4413C",
            "#ECEBD5",
            "#5D878F",
            "#DB4545",
            "#D2BA4C",
            "#964325",
          ],
          borderWidth: 2,
          borderColor: "#fff",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "right" } },
    },
  });
};
const createIncomeChart = () => {
  const ctx = document.getElementById("incomeChart")?.getContext("2d");
  if (!ctx) return;
  const incomeCounts = {};
  beneficiarios.forEach((b) => {
    incomeCounts[b.renda] = (incomeCounts[b.renda] || 0) + 1;
  });
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(incomeCounts),
      datasets: [
        {
          label: "Beneficiários",
          data: Object.values(incomeCounts),
          backgroundColor: "#FFC185",
          borderColor: "#B4413C",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
    },
  });
};
const createVarietiesChart = () => {
  const ctx = document.getElementById("varietiesChart")?.getContext("2d");
  if (!ctx) return;
  const varietiesCounts = {};
  beneficiarios.forEach((b) => {
    if (b.variedades) {
      Object.entries(b.variedades).forEach(([cultura, variedades]) => {
        const count = variedades.split(",").length;
        varietiesCounts[cultura] = (varietiesCounts[cultura] || 0) + count;
      });
    }
  });
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(varietiesCounts),
      datasets: [
        {
          label: "Variedades",
          data: Object.values(varietiesCounts),
          backgroundColor: "#5D878F",
          borderColor: "#1FB8CD",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
    },
  });
};
const updateStatsRummary = () => {
  const statsContainer = document.getElementById("stats-summary");
  if (!statsContainer) return;
  const totalArea = beneficiarios.reduce((sum, b) => sum + b.area_cultivada, 0);
  const mediaArea =
    beneficiarios.length > 0 ? totalArea / beneficiarios.length : 0;
  const totalPessoas = beneficiarios.reduce(
    (sum, b) => sum + b.pessoas_familia,
    0
  );
  const allVarieties = new Set();
  beneficiarios.forEach((b) => {
    if (b.variedades) {
      Object.values(b.variedades).forEach((varieties) => {
        varieties
          .split(",")
          .forEach((variety) => allVarieties.add(variety.trim()));
      });
    }
  });
  let displayTotalArea, displayMediaArea;
  if (currentUser.role === "administrador") {
    displayTotalArea = totalArea.toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
    });
    displayMediaArea = mediaArea.toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
    });
  } else {
    displayTotalArea = "[LIMITADO]";
    displayMediaArea = "[LIMITADO]";
  }
  statsContainer.innerHTML = `
      <div class="stat-item"><h4>${displayTotalArea}</h4><p>Área Total (ha)</p></div>
      <div class="stat-item"><h4>${displayMediaArea}</h4><p>Média por Beneficiário (ha)</p></div>
      <div class="stat-item"><h4>${totalPessoas.toLocaleString(
        "pt-BR"
      )}</h4><p>Total de Pessoas</p></div>
      <div class="stat-item"><h4>${
        allVarieties.size
      }</h4><p>Variedades Únicas</p></div>
    `;
};

// Gestão de Usuários
const updateUserManagement = () => {
  if (currentUser.role !== "administrador") return;
  const cadastrosPorUsuario = {};
  beneficiarios.forEach((b) => {
    const user = b.cadastrado_por || "desconhecido";
    cadastrosPorUsuario[user] = (cadastrosPorUsuario[user] || 0) + 1;
  });
  document.getElementById("admin-cadastros").textContent =
    cadastrosPorUsuario["admin"] || 0;
  document.getElementById("supervisor-cadastros").textContent =
    cadastrosPorUsuario["supervisor1"] || 0;
  document.getElementById("cadastrador-cadastros").textContent =
    cadastrosPorUsuario["cadastrador1"] || 0;
  const auditLogContainer = document.getElementById("audit-log");
  if (auditLogContainer) {
    auditLogContainer.innerHTML = "";
    auditLog.slice(0, 10).forEach((entry) => {
      const item = document.createElement("div");
      item.className = "audit-item";
      item.innerHTML = `<div><span class="audit-user">${
        entry.user
      }</span> <span class="audit-action">${entry.action}</span>${
        entry.details ? `- ${entry.details}` : ""
      }</div><div class="audit-time">${entry.timestamp}</div>`;
      auditLogContainer.appendChild(item);
    });
  }
  logAction("Visualizou gestão de usuários", "Tela de gestão acessada");
};

// Exportação de Dados
const initExport = () => {
  const exportBtn = document.getElementById("export-btn");
  exportBtn?.addEventListener("click", () => {
    if (!hasPermission("export")) {
      showToast("Você não tem permissão para exportar dados.", "error");
      return;
    }
    const csvContent = generateCSV();
    downloadCSV(csvContent, "beneficiarios.csv");
    logAction(
      "Exportou dados",
      `${filteredBeneficiarios.length} registros exportados`
    );
    showToast("Dados exportados com sucesso!");
  });
};

const generateCSV = () => {
  const headers = [
    "ID",
    "Nome",
    "CPF/CNPJ",
    "Telefone",
    "Email",
    "Tipo",
    "Endereço",
    "Latitude",
    "Longitude",
    "Área Cultivada",
    "Culturas",
    "Variedades",
    "Pessoas Família",
    "Renda",
    "Acesso Água",
    "Outros Programas",
    "Observações",
    "Data Cadastro",
    "Cadastrado Por",
  ];
  const csvRows = [headers.join(",")];
  filteredBeneficiarios.forEach((b) => {
    const culturas = b.culturas?.join("; ") || "";
    const variedades = b.variedades
      ? Object.entries(b.variedades)
          .map(([cultura, vars]) => `${cultura}: ${vars}`)
          .join("; ")
      : "";
    const row = [
      b.id,
      `"${b.nome}"`,
      `"${maskData(b.cpf, "cpf")}"`,
      `"${maskData(b.telefone, "telefone")}"`,
      `"${b.email || ""}"`,
      `"${b.tipo}"`,
      `"${b.endereco}"`,
      maskData(b.latitude, "latitude") || "",
      maskData(b.longitude, "longitude") || "",
      maskData(b.area_cultivada, "area_cultivada"),
      `"${culturas}"`,
      `"${variedades}"`,
      b.pessoas_familia,
      `"${maskData(b.renda, "renda")}"`,
      `"${b.acesso_agua}"`,
      `"${b.outros_programas || ""}"`,
      `"${b.observacoes || ""}"`,
      b.data_cadastro,
      `"${b.cadastrado_por || "N/A"}"`,
    ];
    csvRows.push(row.join(","));
  });
  return csvRows.join("\n");
};

const downloadCSV = (content, filename) => {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  initLogin();
  initNavigation();
  initModal();
  initCadastroForm();
  initTableFilters();
  initExport();
  showScreen("login");
  auditLog.push({
    user: "SYSTEM",
    role: "system",
    action: "Sistema iniciado",
    details: "Aplicação carregada com novo sistema de culturas e variedades",
    timestamp: new Date().toLocaleString("pt-BR"),
  });
});

// Funções globais para eventos inline
window.showBeneficiaryDetails = showBeneficiaryDetails;
