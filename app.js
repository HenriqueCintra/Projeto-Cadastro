// Sistema de Gestão de Beneficiários - Nas Ramas da Esperança
// Com Hierarquia de Acesso e Controle de Permissões
// Atualizado com Campos de Culturas e Variedades

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
      "donations",
      "relatorios",
      "usuarios",
      "all_data",
      "export",
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
      "donations",
      "relatorios",
      "partial_data",
    ],
  },
  cadastrador1: {
    username: "cadastrador1",
    password: "cad123",
    role: "cadastrador",
    name: "Cadastrador",
    permissions: ["cadastro", "donations", "basic_list"],
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

    switch (screenName) {
      case "dashboard":
        updateDashboard();
        break;
      case "cadastro":
        initCadastroForm();
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
  document
    .querySelectorAll('[id$="relatorios"]')
    .forEach(
      (btn) => (btn.style.display = hasPermission("relatorios") ? "" : "none")
    );
  document
    .querySelectorAll('[id$="usuarios"]')
    .forEach(
      (btn) => (btn.style.display = hasPermission("usuarios") ? "" : "none")
    );
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
    (sum, b) => sum + (b.pessoas_familia || 0),
    0
  );
  let totalArea = 0;
  if (currentUser.role !== "cadastrador") {
    totalArea = beneficiarios.reduce(
      (sum, b) => sum + (b.area_cultivada || 0),
      0
    );
  }
  const culturasUnicas = new Set(
    beneficiarios.flatMap((b) => b.culturas || [])
  );

  document.getElementById("total-cadastros").textContent = totalCadastros;
  document.getElementById("total-familias").textContent =
    totalFamilias.toLocaleString("pt-BR");
  document.getElementById("total-culturas").textContent = culturasUnicas.size;
  const areaElement = document.getElementById("total-area");

  areaElement.textContent = maskData(totalArea.toFixed(1), "area_cultivada");
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

    row.innerHTML = `
      <td>
        <div>
          <strong>${beneficiario.nome}</strong><br>
          <small style="color: var(--color-text-secondary);">${maskData(
            beneficiario.cpf,
            "cpf"
          )}</small>
        </div>
      </td>
      <td><span class="type-badge ${getTypeBadgeClass(beneficiario.tipo)}">${
      beneficiario.tipo
    }</span></td>
      <td>${cidade}, ${estado}</td>
      <td class="admin-only">${formatCPF(beneficiario.cpf)}</td>
      <td class="supervisor-admin">${maskData(
        beneficiario.telefone,
        "telefone"
      )}</td>
      <td><div class="culture-badges">${(beneficiario.culturas || [])
        .map(
          (c) =>
            `<span class="culture-badge ${getCultureBadgeClass(c)}">${c}</span>`
        )
        .join("")}</div></td>
      <td class="admin-only">${maskData(
        beneficiario.area_cultivada,
        "area_cultivada"
      )} ha</td>
      <td>${beneficiario.pessoas_familia}</td>
      <td>${formatDate(beneficiario.data_cadastro)}</td>
      <td><button class="action-btn" onclick="showBeneficiaryDetails(${
        beneficiario.id
      })">👁️ Ver</button></td>
    `;
    tableBody.appendChild(row);
  });
};

const applyFilters = () => {
  const searchTerm =
    document.getElementById("search-input")?.value?.toLowerCase() || "";
  const typeFilter = document.getElementById("filter-tipo")?.value || "";
  const cultureFilter = document.getElementById("filter-cultura")?.value || "";
  filteredBeneficiarios = beneficiarios.filter(
    (b) =>
      (!searchTerm || b.nome.toLowerCase().includes(searchTerm)) &&
      (!typeFilter || b.tipo === typeFilter) &&
      (!cultureFilter || b.culturas?.includes(cultureFilter))
  );
};

const initTableFilters = () => {
  document
    .getElementById("search-input")
    ?.addEventListener("input", updateBeneficiariesTable);
  document
    .getElementById("filter-tipo")
    ?.addEventListener("change", updateBeneficiariesTable);
  document
    .getElementById("filter-cultura")
    ?.addEventListener("change", updateBeneficiariesTable);
  document.getElementById("export-btn")?.addEventListener("click", () => {
    if (!hasPermission("export")) {
      showToast("Você não tem permissão para exportar dados.", "error");
      return;
    }
    // CSV Generation logic here
  });
};

// Modal de Detalhes
const showBeneficiaryDetails = (id) => {
  const beneficiario = beneficiarios.find((b) => b.id === id);
  if (!beneficiario) return;
  // Modal display logic remains the same as your original full code
};

const initModal = () => {
  const modal = document.getElementById("details-modal");
  const closeBtn = document.getElementById("close-modal");
  closeBtn.addEventListener("click", () => modal.classList.add("hidden"));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.add("hidden");
  });
};

// Formulário de Cadastro
const initCadastroForm = () => {
  document
    .getElementById("get-location-btn-cadastro")
    .addEventListener("click", () => {
      const statusEl = document.getElementById("location-status-cadastro");
      if (navigator.geolocation) {
        statusEl.textContent = "Obtendo localização...";
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            document.getElementById("latitude").value = pos.coords.latitude;
            document.getElementById("longitude").value = pos.coords.longitude;
            statusEl.textContent = `Localização obtida: ${pos.coords.latitude.toFixed(
              4
            )}, ${pos.coords.longitude.toFixed(4)}`;
            showToast("Localização capturada com sucesso!");
          },
          () => {
            statusEl.textContent = "Não foi possível obter a localização.";
            showToast("Erro ao obter localização.", "error");
          }
        );
      } else {
        statusEl.textContent = "Geolocalização não suportada.";
        showToast("Geolocalização não suportada.", "error");
      }
    });

  document.querySelectorAll('input[name="culturas"]').forEach((cb) => {
    cb.addEventListener("change", () => {
      const fieldId = `variedades-${cb.value.toLowerCase().replace(/ /g, "-")}`;
      document.getElementById(fieldId).classList.toggle("hidden", !cb.checked);
    });
  });

  document.getElementById("cadastro-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target;
    const newBeneficiario = {
      id: (beneficiarios[beneficiarios.length - 1]?.id || 0) + 1,
      nome: form.nome.value,
      cpf: form.documento.value,
      telefone: form.telefone.value,
      email: form.email.value,
      tipo: form.tipo.value,
      endereco: form.endereco.value,
      latitude: form.latitude.value,
      longitude: form.longitude.value,
      area_cultivada: parseFloat(form.area_cultivada.value) || 0,
      pessoas_familia: parseInt(form.pessoas_familia.value) || 0,
      culturas: [
        ...form.querySelectorAll('input[name="culturas"]:checked'),
      ].map((cb) => cb.value),
      variedades: {},
      acesso_agua: form.acesso_agua.value,
      outros_programas: form.outros_programas.value,
      observacoes: form.observacoes.value,
      data_cadastro: new Date().toISOString().split("T")[0],
      cadastrado_por: currentUser.username,
    };

    newBeneficiario.culturas.forEach((cultura) => {
      const inputId = `variedades-input-${cultura
        .toLowerCase()
        .replace(/ /g, "-")}`;
      newBeneficiario.variedades[cultura] =
        document.getElementById(inputId).value;
    });

    beneficiarios.push(newBeneficiario);
    logAction("Novo cadastro", `Beneficiário: ${newBeneficiario.nome}`);
    showToast("Cadastro salvo com sucesso!");
    form.reset();
    document
      .querySelectorAll(".variety-field")
      .forEach((el) => el.classList.add("hidden"));
    updateRecentCadastros();
  });
  updateRecentCadastros();
};

const updateRecentCadastros = () => {
  const recentList = document.getElementById("ultimos-cadastros");
  if (!recentList) return;
  const recent = [...beneficiarios]
    .sort((a, b) => new Date(b.data_cadastro) - new Date(a.data_cadastro))
    .slice(0, 5);
  recentList.innerHTML = "";
  recent.forEach((beneficiario) => {
    const item = document.createElement("div");
    item.className = "recent-item";
    item.innerHTML = `<h4>${beneficiario.nome}</h4><p>${
      beneficiario.tipo
    }</p><div class="recent-date">${formatDate(
      beneficiario.data_cadastro
    )}</div>`;
    recentList.appendChild(item);
  });
};

// Doações
const initDonationForm = () => {
  const beneficiarySelect = document.getElementById("beneficiary-select");
  beneficiarySelect.innerHTML =
    '<option value="">Selecione um beneficiário</option>';
  beneficiarios.forEach((b) => {
    beneficiarySelect.innerHTML += `<option value="${b.id}">${b.nome}</option>`;
  });

  document.querySelectorAll('input[name="donation-type"]').forEach((cb) => {
    cb.addEventListener("change", updateDonationItems);
  });

  document.getElementById("donation-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target;
    const newDonation = {
      id: (donations[donations.length - 1]?.id || 0) + 1,
      beneficiaryId: parseInt(form["beneficiary-select"].value),
      types: [
        ...form.querySelectorAll('input[name="donation-type"]:checked'),
      ].map((el) => el.value),
      items: [
        ...form.querySelectorAll('input[name="donation-item"]:checked'),
      ].map((el) => el.value),
      quantity: parseFloat(form.quantity.value),
      date: new Date().toISOString().split("T")[0],
      registeredBy: currentUser.username,
    };
    donations.push(newDonation);
    logAction(
      "Nova doação",
      `Beneficiário ID: ${
        newDonation.beneficiaryId
      }, Itens: ${newDonation.items.join(", ")}`
    );
    showToast("Doação registrada com sucesso!");
    form.reset();
    document.getElementById("donation-items").classList.add("hidden");
    updateRecentDonations();
  });
  updateRecentDonations();
};

const updateDonationItems = () => {
  const items = {
    muda: ["Batata-doce"],
    semente: ["Macaxeira", "Feijão"],
    maniva: ["Macaxeira"],
    alimento: ["Batata-doce", "Macaxeira", "Feijão", "Abóbora"],
  };

  const selectedTypes = [
    ...document.querySelectorAll('input[name="donation-type"]:checked'),
  ].map((cb) => cb.value);
  const availableItems = [
    ...new Set(selectedTypes.flatMap((type) => items[type] || [])),
  ];

  const itemsContainer = document.getElementById("donation-item-grid");
  itemsContainer.innerHTML = "";

  if (availableItems.length > 0) {
    document.getElementById("donation-items").classList.remove("hidden");
    availableItems.forEach((item) => {
      itemsContainer.innerHTML += `
                <label class="choice-label">
                    <input type="checkbox" name="donation-item" value="${item}"> ${item}
                </label>
            `;
    });
  } else {
    document.getElementById("donation-items").classList.add("hidden");
  }
};

const updateRecentDonations = () => {
  const tableBody = document.getElementById("recent-donations-body");
  if (!tableBody) return;
  tableBody.innerHTML = "";
  [...donations]
    .reverse()
    .slice(0, 5)
    .forEach((d) => {
      const beneficiary = beneficiarios.find((b) => b.id === d.beneficiaryId);
      const row = tableBody.insertRow();
      row.innerHTML = `
      <td>${beneficiary ? beneficiary.nome : "N/A"}</td>
      <td>${d.items.join(", ")}</td>
      <td>${d.quantity}</td>
      <td>${formatDate(d.date)}</td>
    `;
    });
};

// Relatórios
const updateReports = () => {
  // Placeholder for reports logic, using the original full functions
  createStateChart();
  if (currentUser.role === "administrador") createIncomeChart();
  createVarietiesChart();
  updateStatsRummary();
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
  const totalArea = beneficiarios.reduce(
    (sum, b) => sum + (b.area_cultivada || 0),
    0
  );
  const mediaArea =
    beneficiarios.length > 0 ? totalArea / beneficiarios.length : 0;
  const totalPessoas = beneficiarios.reduce(
    (sum, b) => sum + (b.pessoas_familia || 0),
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

  statsContainer.innerHTML = `
      <div class="stat-item"><h4>${maskData(
        totalArea.toFixed(1),
        "area_cultivada"
      )}</h4><p>Área Total (ha)</p></div>
      <div class="stat-item"><h4>${maskData(
        mediaArea.toFixed(1),
        "area_cultivada"
      )}</h4><p>Média por Beneficiário (ha)</p></div>
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
  // User management logic from original full code
};

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  initLogin();
  initNavigation();
  initModal();
  initTableFilters();
  // initExport(); // This would require the generateCSV and downloadCSV functions from your full code
  showScreen("login");
});

window.showBeneficiaryDetails = showBeneficiaryDetails;
