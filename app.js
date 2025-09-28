// --- INÍCIO DA CONFIGURAÇÃO DO FIREBASE ---
// Suas credenciais foram inseridas aqui
const firebaseConfig = {
  apiKey: "AIzaSyCNRPBXsZKe9EGWYA5S0zoXQtYsyAIs3NA",
  authDomain: "bd-cadastro-f43a1.firebaseapp.com",
  projectId: "bd-cadastro-f43a1",
  storageBucket: "bd-cadastro-f43a1.firebasestorage.app",
  messagingSenderId: "798258380781",
  appId: "1:798258380781:web:294bca7733ce029981b1e4",
  measurementId: "G-J7GH724JS2",
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
// --- FIM DA CONFIGURAÇÃO DO FIREBASE ---

// Sistema de Gestão de Beneficiários - Nas Ramas da Esperança
let beneficiarios = [];
let donations = [];

// --- Carrega os dados do Firestore ao iniciar ---
const loadDataFromFirestore = async () => {
  try {
    // Escuta por atualizações em tempo real na coleção de beneficiários
    db.collection("beneficiarios").onSnapshot((snapshot) => {
      beneficiarios = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      // Se o usuário estiver logado, atualiza a tela com os novos dados
      if (currentUser) {
        updateDashboard();
      }
    });

    // Escuta por atualizações em tempo real na coleção de doações
    db.collection("donations").onSnapshot((snapshot) => {
      donations = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      if (currentUser && currentScreen === "donations") {
        updateRecentDonations();
      }
    });
  } catch (error) {
    console.error("Erro ao carregar dados do Firestore: ", error);
    showToast("Erro ao carregar dados. Verifique o console.", "error");
  }
};

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
let filteredBeneficiarios = [];
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
  if (!dateString) return "N/A";
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
  if (!endereco) return "N/A";
  const estados = endereco.match(/, ([A-Z]{2})$/);
  return estados ? estados[1] : "N/A";
};
const getCidadeFromAddress = (endereco) => {
  if (!endereco) return "N/A";
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
  loginForm.addEventListener("submit", async (e) => {
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
    if (window.culturesChart instanceof Chart) {
      window.culturesChart.destroy();
    }
    if (window.producersChart instanceof Chart) {
      window.producersChart.destroy();
    }
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
  window.culturesChart = new Chart(ctx, {
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
  window.producersChart = new Chart(ctx, {
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
        <div style="display: flex; align-items: center; gap: 12px;">
          ${
            beneficiario.foto
              ? `<img src="${beneficiario.foto}" alt="Foto" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--color-border);">`
              : `<div style="width: 40px; height: 40px; border-radius: 50%; background: var(--color-bg-1); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">👤</div>`
          }
          <div>
            <strong>${beneficiario.nome}</strong><br>
            <small style="color: var(--color-text-secondary);">${maskData(
              beneficiario.cpf,
              "cpf"
            )}</small>
          </div>
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
      <td>${beneficiario.pessoas_familia || "N/A"}</td>
      <td>${formatDate(beneficiario.data_cadastro)}</td>
      <td><button class="action-btn" onclick="showBeneficiaryDetails('${
        beneficiario.id
      }')">👁️ Ver</button></td>
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
    // Lógica para exportar CSV
  });
};

// Modal de Detalhes
const showBeneficiaryDetails = (id) => {
  const beneficiario = beneficiarios.find((b) => b.id === id);
  if (!beneficiario) return;

  const modal = document.getElementById("details-modal");
  const modalTitle = document.getElementById("modal-title");
  const modalBody = document.getElementById("modal-body");

  modalTitle.textContent = `Detalhes - ${beneficiario.nome}`;

  modalBody.innerHTML = `
        ${
          beneficiario.foto
            ? `
        <div class="detail-row">
          <span class="detail-label">Foto:</span>
          <div class="detail-value">
            <img src="${beneficiario.foto}" alt="Foto do beneficiário" style="max-width: 200px; max-height: 200px; border-radius: 8px; object-fit: cover;">
          </div>
        </div>
        `
            : ""
        }
        <div class="detail-row"><span class="detail-label">ID:</span><span class="detail-value">${
          beneficiario.id
        }</span></div>
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
        <div class="detail-row"><span class="detail-label">Endereço:</span><span class="detail-value">${
          beneficiario.endereco
        }</span></div>
        <div class="detail-row"><span class="detail-label">Área Cultivada (ha):</span><span class="detail-value">${maskData(
          beneficiario.area_cultivada,
          "area_cultivada"
        )}</span></div>
        <div class="detail-row"><span class="detail-label">Famílias:</span><span class="detail-value">${
          beneficiario.pessoas_familia
        }</span></div>
        <div class="detail-row"><span class="detail-label">Culturas:</span><span class="detail-value">${(
          beneficiario.culturas || []
        ).join(", ")}</span></div>
        <div class="detail-row"><span class="detail-label">Cadastrado por:</span><span class="detail-value">${
          beneficiario.cadastrado_por
        }</span></div>
        <div class="detail-row"><span class="detail-label">Data Cadastro:</span><span class="detail-value">${formatDate(
          beneficiario.data_cadastro
        )}</span></div>
    `;

  modal.classList.remove("hidden");
};

const initModal = () => {
  const modal = document.getElementById("details-modal");
  const closeBtn = document.getElementById("close-modal");
  closeBtn.addEventListener("click", () => modal.classList.add("hidden"));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.add("hidden");
  });
};

// Validações
const validateCPF = (cpf) => {
  cpf = cpf.replace(/[^\d]/g, "");
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(10))) return false;

  return true;
};

const validateCNPJ = (cnpj) => {
  cnpj = cnpj.replace(/[^\d]/g, "");
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  let sum = 0;
  let weight = 2;
  for (let i = 11; i >= 0; i--) {
    sum += parseInt(cnpj.charAt(i)) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  let remainder = sum % 11;
  let digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(cnpj.charAt(12))) return false;

  sum = 0;
  weight = 2;
  for (let i = 12; i >= 0; i--) {
    sum += parseInt(cnpj.charAt(i)) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  remainder = sum % 11;
  let digit2 = remainder < 2 ? 0 : 11 - remainder;
  if (digit2 !== parseInt(cnpj.charAt(13))) return false;

  return true;
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  const phoneRegex = /^[\d\s\(\)\-\+]+$/;
  const cleanPhone = phone.replace(/[^\d]/g, "");
  return phoneRegex.test(phone) && cleanPhone.length >= 10;
};

const showFieldError = (fieldId, message) => {
  const field = document.getElementById(fieldId);
  const errorDiv = document.getElementById(`${fieldId}-error`);

  field.classList.add("form-error");

  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = "block";
  } else {
    const error = document.createElement("div");
    error.id = `${fieldId}-error`;
    error.className = "error-message";
    error.textContent = message;
    field.parentNode.appendChild(error);
  }
};

const clearFieldError = (fieldId) => {
  const field = document.getElementById(fieldId);
  const errorDiv = document.getElementById(`${fieldId}-error`);

  field.classList.remove("form-error");
  if (errorDiv) {
    errorDiv.style.display = "none";
  }
};

const validateForm = (form) => {
  // Limpar erros anteriores
  document.querySelectorAll(".error-message").forEach((el) => el.remove());
  document
    .querySelectorAll(".form-error")
    .forEach((el) => el.classList.remove("form-error"));

  // Validações opcionais apenas para formatação (não bloqueiam o cadastro)

  // Validar documento (CPF/CNPJ) - apenas se preenchido
  const documento = form.documento.value.replace(/[^\d]/g, "");
  if (documento && documento.length === 11) {
    if (!validateCPF(form.documento.value)) {
      showFieldError("documento", "CPF inválido (opcional)");
    }
  } else if (documento && documento.length === 14) {
    if (!validateCNPJ(form.documento.value)) {
      showFieldError("documento", "CNPJ inválido (opcional)");
    }
  }

  // Validar telefone - apenas se preenchido
  if (form.telefone.value && !validatePhone(form.telefone.value)) {
    showFieldError("telefone", "Telefone inválido (opcional)");
  }

  // Validar email - apenas se preenchido
  if (form.email.value && !validateEmail(form.email.value)) {
    showFieldError("email", "Email inválido (opcional)");
  }

  // Validar área cultivada - apenas se preenchido
  const area = parseFloat(form.area_cultivada.value);
  if (form.area_cultivada.value && (isNaN(area) || area < 0)) {
    showFieldError(
      "area_cultivada",
      "Área cultivada deve ser um número válido (opcional)"
    );
  }

  // Validar pessoas na família - apenas se preenchido
  const pessoas = parseInt(form.pessoas_familia.value);
  if (form.pessoas_familia.value && (isNaN(pessoas) || pessoas < 0)) {
    showFieldError(
      "pessoas_familia",
      "Número de pessoas deve ser um número válido (opcional)"
    );
  }

  // Sempre permitir o cadastro, mesmo com erros de formatação
  return true;
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

  // Inicializar funcionalidade de foto
  initPhotoCapture();

  document.querySelectorAll('input[name="culturas"]').forEach((cb) => {
    cb.addEventListener("change", () => {
      const fieldId = `variedades-${cb.value
        .toLowerCase()
        .replace(/ |-/g, "")}`;
      document.getElementById(fieldId).classList.toggle("hidden", !cb.checked);

      // Limpar erro de culturas se alguma for selecionada
      const culturasError = document.querySelector(".cultures-error");
      if (culturasError) {
        culturasError.remove();
      }
    });
  });

  // Adicionar apenas máscaras (sem validação bloqueante)
  document.getElementById("documento").addEventListener("input", function () {
    let value = this.value.replace(/[^\d]/g, "");

    if (value.length <= 11) {
      // Máscara CPF
      value = value.replace(/(\d{3})(\d)/, "$1.$2");
      value = value.replace(/(\d{3})(\d)/, "$1.$2");
      value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else {
      // Máscara CNPJ
      value = value.replace(/(\d{2})(\d)/, "$1.$2");
      value = value.replace(/(\d{3})(\d)/, "$1.$2");
      value = value.replace(/(\d{3})(\d)/, "$1/$2");
      value = value.replace(/(\d{4})(\d{1,2})$/, "$1-$2");
    }

    this.value = value;
  });

  // Máscara para telefone
  document.getElementById("telefone").addEventListener("input", function () {
    let value = this.value.replace(/[^\d]/g, "");

    if (value.length <= 10) {
      // Telefone fixo
      value = value.replace(/(\d{2})(\d)/, "($1) $2");
      value = value.replace(/(\d{4})(\d)/, "$1-$2");
    } else {
      // Celular
      value = value.replace(/(\d{2})(\d)/, "($1) $2");
      value = value.replace(/(\d{5})(\d)/, "$1-$2");
    }

    this.value = value;
  });

  document
    .getElementById("cadastro-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;

      // Apenas validar formatação (não bloqueia o cadastro)
      validateForm(form);

      // Mostrar loading
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = "Salvando...";
      submitBtn.disabled = true;

      try {
        const newBeneficiarioData = {
          nome: form.nome.value.trim() || "Não informado",
          cpf: form.documento.value.replace(/[^\d]/g, "") || "",
          telefone: form.telefone.value.trim() || "",
          email: form.email.value.trim() || "",
          tipo: form.tipo.value || "Não informado",
          renda: form.renda.value || "",
          endereco: form.endereco.value.trim() || "Não informado",
          latitude: form.latitude.value || "",
          longitude: form.longitude.value || "",
          area_cultivada: parseFloat(form.area_cultivada.value) || 0,
          pessoas_familia: parseInt(form.pessoas_familia.value) || 0,
          culturas: [
            ...form.querySelectorAll('input[name="culturas"]:checked'),
          ].map((cb) => cb.value),
          variedades: {},
          acesso_agua: form.acesso_agua.value.trim() || "",
          outros_programas: form.outros_programas.value.trim() || "",
          observacoes: form.observacoes.value.trim() || "",
          foto: form.photo_data.value || "",
          data_cadastro: new Date().toISOString().split("T")[0],
          cadastrado_por: currentUser.username,
        };

        // Processar variedades
        newBeneficiarioData.culturas.forEach((cultura) => {
          const inputId = `variedades-input-${cultura
            .toLowerCase()
            .replace(/ |-/g, "")}`;
          const variedadesInput = document.getElementById(inputId);
          if (variedadesInput) {
            newBeneficiarioData.variedades[cultura] =
              variedadesInput.value.trim();
          }
        });

        await db.collection("beneficiarios").add(newBeneficiarioData);
        logAction("Novo cadastro", `Beneficiário: ${newBeneficiarioData.nome}`);
        showToast("Cadastro salvo com sucesso na nuvem!");

        // Limpar formulário
        form.reset();
        document
          .querySelectorAll(".variety-field")
          .forEach((el) => el.classList.add("hidden"));
        document
          .querySelectorAll(".error-message")
          .forEach((el) => el.remove());
        document
          .querySelectorAll(".form-error")
          .forEach((el) => el.classList.remove("form-error"));

        updateRecentCadastros();
      } catch (error) {
        console.error("Erro ao adicionar documento: ", error);
        showToast("Falha ao salvar o cadastro. Tente novamente.", "error");
      } finally {
        // Restaurar botão
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
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
    item.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        ${
          beneficiario.foto
            ? `<img src="${beneficiario.foto}" alt="Foto" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover; border: 2px solid var(--color-border);">`
            : `<div style="width: 50px; height: 50px; border-radius: 8px; background: var(--color-bg-1); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">👤</div>`
        }
        <div>
          <h4>${beneficiario.nome}</h4>
          <p>${beneficiario.tipo}</p>
          <div class="recent-date">${formatDate(
            beneficiario.data_cadastro
          )}</div>
        </div>
      </div>
    `;
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

  document
    .getElementById("donation-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const beneficiaryId = form["beneficiary-select"].value;
      const beneficiaryName =
        form["beneficiary-select"].options[
          form["beneficiary-select"].selectedIndex
        ].text;

      const newDonationData = {
        beneficiaryId: beneficiaryId,
        beneficiaryName: beneficiaryName,
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

      try {
        await db.collection("donations").add(newDonationData);
        logAction(
          "Nova doação",
          `Beneficiário: ${newDonationData.beneficiaryName}`
        );
        showToast("Doação registrada com sucesso na nuvem!");
        form.reset();
        document.getElementById("donation-items").classList.add("hidden");
      } catch (error) {
        console.error("Erro ao adicionar doação: ", error);
        showToast("Falha ao registrar a doação. Tente novamente.", "error");
      }
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
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10)
    .forEach((d) => {
      const row = tableBody.insertRow();
      row.innerHTML = `
      <td>${d.beneficiaryName || "N/A"}</td>
      <td>${d.items.join(", ")}</td>
      <td>${d.quantity}</td>
      <td>${formatDate(d.date)}</td>
    `;
    });
};

// Relatórios
const updateReports = () => {
  if (window.stateChart instanceof Chart) window.stateChart.destroy();
  if (window.incomeChart instanceof Chart) window.incomeChart.destroy();
  if (window.varietiesChart instanceof Chart) window.varietiesChart.destroy();

  createStateChart();
  if (currentUser.role === "administrador") createIncomeChart();
  createVarietiesChart();
  updateStatsSummary();
};

const createStateChart = () => {
  const ctx = document.getElementById("stateChart")?.getContext("2d");
  if (!ctx) return;
  const stateCounts = {};
  beneficiarios.forEach((b) => {
    const estado = getEstadoFromAddress(b.endereco);
    stateCounts[estado] = (stateCounts[estado] || 0) + 1;
  });
  window.stateChart = new Chart(ctx, {
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
    const renda = b.renda || "N/A";
    incomeCounts[renda] = (incomeCounts[renda] || 0) + 1;
  });
  window.incomeChart = new Chart(ctx, {
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
        if (variedades && typeof variedades === "string") {
          const count = variedades.split(",").length;
          varietiesCounts[cultura] = (varietiesCounts[cultura] || 0) + count;
        }
      });
    }
  });
  window.varietiesChart = new Chart(ctx, {
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

const updateStatsSummary = () => {
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
        if (variedades && typeof variedades === "string") {
          variedades
            .split(",")
            .forEach((variety) => allVarieties.add(variety.trim()));
        }
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
  // Lógica de gestão de usuários aqui
};

// Funcionalidade de Captura de Foto
let currentStream = null;

const initPhotoCapture = () => {
  const takePhotoBtn = document.getElementById("take-photo-btn");
  const removePhotoBtn = document.getElementById("remove-photo-btn");
  const photoModal = document.getElementById("photo-modal");
  const cancelPhotoBtn = document.getElementById("cancel-photo-btn");
  const capturePhotoBtn = document.getElementById("capture-photo-btn");
  const photoCamera = document.getElementById("photo-camera");
  const photoCanvas = document.getElementById("photo-canvas");
  const photoData = document.getElementById("photo-data");
  const photoPreview = document.getElementById("photo-preview");

  // Abrir modal de captura
  takePhotoBtn.addEventListener("click", async () => {
    try {
      photoModal.classList.add("show");
      await startCamera();
    } catch (error) {
      console.error("Erro ao acessar câmera:", error);
      showToast("Erro ao acessar câmera. Verifique as permissões.", "error");
    }
  });

  // Cancelar captura
  cancelPhotoBtn.addEventListener("click", () => {
    closePhotoModal();
  });

  // Capturar foto
  capturePhotoBtn.addEventListener("click", () => {
    capturePhoto();
  });

  // Remover foto
  removePhotoBtn.addEventListener("click", () => {
    removePhoto();
  });

  // Fechar modal clicando fora
  photoModal.addEventListener("click", (e) => {
    if (e.target === photoModal) {
      closePhotoModal();
    }
  });
};

const startCamera = async () => {
  try {
    const constraints = {
      video: {
        facingMode: "user", // Câmera frontal
        width: { ideal: 400 },
        height: { ideal: 300 },
      },
    };

    currentStream = await navigator.mediaDevices.getUserMedia(constraints);
    const video = document.getElementById("photo-camera");
    video.srcObject = currentStream;

    showToast(
      "Câmera ativada. Posicione-se na tela e clique para capturar.",
      "info"
    );
  } catch (error) {
    console.error("Erro ao acessar câmera:", error);
    throw error;
  }
};

const capturePhoto = () => {
  const video = document.getElementById("photo-camera");
  const canvas = document.getElementById("photo-canvas");
  const ctx = canvas.getContext("2d");

  // Definir dimensões do canvas
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // Desenhar frame do vídeo no canvas
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Converter para base64
  const photoDataUrl = canvas.toDataURL("image/jpeg", 0.8);

  // Salvar dados da foto
  document.getElementById("photo-data").value = photoDataUrl;

  // Mostrar preview
  showPhotoPreview(photoDataUrl);

  // Fechar modal
  closePhotoModal();

  showToast("Foto capturada com sucesso!", "success");
};

const showPhotoPreview = (photoDataUrl) => {
  const photoPreview = document.getElementById("photo-preview");
  const removePhotoBtn = document.getElementById("remove-photo-btn");

  photoPreview.innerHTML = `<img src="${photoDataUrl}" alt="Foto capturada">`;
  removePhotoBtn.style.display = "block";
};

const removePhoto = () => {
  const photoPreview = document.getElementById("photo-preview");
  const removePhotoBtn = document.getElementById("remove-photo-btn");
  const photoData = document.getElementById("photo-data");

  photoPreview.innerHTML = `
    <div class="photo-placeholder">
      <span>📷</span>
      <p>Nenhuma foto selecionada</p>
    </div>
  `;
  removePhotoBtn.style.display = "none";
  photoData.value = "";

  showToast("Foto removida", "info");
};

const closePhotoModal = () => {
  const photoModal = document.getElementById("photo-modal");
  photoModal.classList.remove("show");

  // Parar stream da câmera
  if (currentStream) {
    currentStream.getTracks().forEach((track) => track.stop());
    currentStream = null;
  }
};

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  initLogin();
  initNavigation();
  initModal();
  initTableFilters();
  loadDataFromFirestore(); // Carrega os dados e começa a escutar por mudanças
  showScreen("login");
});

window.showBeneficiaryDetails = showBeneficiaryDetails;
