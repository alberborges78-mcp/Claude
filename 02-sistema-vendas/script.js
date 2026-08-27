// Controle do Sistema de Gestao de Malharia

// Dados iniciais para seed caso o localStorage esteja vazio
const defaultSales = [
  {
    id: 1724670000000,
    data: "24/08/2026",
    cliente: "Confecções Bella Vest",
    telefone: "(11) 98765-4321",
    modelo: "Camiseta Algodão Fio 30 Penteado",
    cor: "Preto Absoluto",
    grade: "P:10, M:20, G:20, GG:10",
    quantidade: 60,
    precoUnitario: 28.50,
    valorTotal: 1710.00,
    observacoes: "Estampa silk screen centralizada no peito, etiqueta na gola.",
    status: "concluida"
  },
  {
    id: 1724756400000,
    data: "25/08/2026",
    cliente: "Esportes Radicais Ltda",
    telefone: "(21) 99988-7766",
    modelo: "Corta Vento Impermeável",
    cor: "Azul Cobalto",
    grade: "M:15, G:15, GG:5",
    quantidade: 35,
    precoUnitario: 75.00,
    valorTotal: 2625.00,
    observacoes: "Zíper tratorado preto, punho elástico de alta pressão.",
    status: "em-producao"
  },
  {
    id: 1724842800000,
    data: "26/08/2026",
    cliente: "Uniformes Corporativos Silva",
    telefone: "(31) 99123-4567",
    modelo: "Camisa Polo Piquet",
    cor: "Verde Musgo",
    grade: "P:10, M:15, G:15",
    quantidade: 40,
    precoUnitario: 39.90,
    valorTotal: 1596.00,
    observacoes: "Bordado computadorizado com logo no bolso esquerdo.",
    status: "aprovado"
  }
];

const defaultStock = [
  { id: 1, tipo: "Fio", nome: "Fio de Algodão Cru 30/1", quantidade: 85.5, unidade: "kg", minimo: 30.0 },
  { id: 2, tipo: "Linha", nome: "Linha Costura Reta Poliéster Vermelha", quantidade: 12.0, unidade: "m", minimo: 25.0 },
  { id: 3, tipo: "Botão", nome: "Botão Camisaria Poliéster Cristal 2 Furos", quantidade: 800.0, unidade: "un", minimo: 150.0 },
  { id: 4, tipo: "Fio", nome: "Fio Elastano 70/17 Preto", quantidade: 4.5, unidade: "kg", minimo: 10.0 }
];

// Estado global da aplicacao
let orders = JSON.parse(localStorage.getItem("malharia_vendas")) || defaultSales;
let stock = JSON.parse(localStorage.getItem("malharia_estoque")) || defaultStock;
let userRole = localStorage.getItem("malharia_user_role") || "admin";
let activeTab = "vendas";
let activeStatusFilter = "todos";

// Helper para escapar HTML
function esc(str) {
  if (!str) return "";
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

// Salvar no localStorage
function saveState() {
  localStorage.setItem("malharia_vendas", JSON.stringify(orders));
  localStorage.setItem("malharia_estoque", JSON.stringify(stock));
  localStorage.setItem("malharia_user_role", userRole);
}
// Inicializar a aplicacao
window.addEventListener("DOMContentLoaded", function () {
  setupNavigation();
  setupRoleToggle();
  setupThemeToggle();
  setupSalesForm();
  setupStockForm();
  setupProductionFilters();
  setupMobileMenu();
  applyRoleMode();
  renderAll();
});

// Mobile Menu Toggle
function setupMobileMenu() {
  var btn = document.getElementById("mobileMenu");
  var sidebar = document.getElementById("sidebar");
  if (btn && sidebar) {
    btn.addEventListener("click", function () {
      sidebar.classList.toggle("open");
    });
  }
}

// Configuracao de abas
function setupNavigation() {
  var navItems = document.querySelectorAll(".nav-item");
  for (var i = 0; i < navItems.length; i++) {
    navItems[i].addEventListener("click", function (e) {
      e.preventDefault();
      var tabId = this.getAttribute("data-tab");
      if (userRole === "fabrica" && (tabId === "vendas" || tabId === "relatorios")) {
        alert("Acesso restrito a Administracao.");
        return;
      }
      switchTab(tabId);
    });
  }
}

function switchTab(tabId) {
  activeTab = tabId;
  var navItems = document.querySelectorAll(".nav-item");
  for (var i = 0; i < navItems.length; i++) {
    if (navItems[i].getAttribute("data-tab") === tabId) {
      navItems[i].classList.add("active");
    } else {
      navItems[i].classList.remove("active");
    }
  }
  var panels = document.querySelectorAll(".tab-panel");
  for (var j = 0; j < panels.length; j++) {
    if (panels[j].id === "tab-" + tabId) {
      panels[j].removeAttribute("hidden");
    } else {
      panels[j].setAttribute("hidden", "");
    }
  }
  var labels = {
    vendas: "Vendas e Clientes",
    producao: "Ordens de Producao",
    estoque: "Estoque de Insumos",
    relatorios: "Relatorios"
  };
  var bcEl = document.getElementById("breadcrumbCurrent");
  if (bcEl) bcEl.innerText = labels[tabId] || "";
  var sidebar = document.getElementById("sidebar");
  if (sidebar) sidebar.classList.remove("open");
  renderAll();
}

// Configuracao de Perfis (Role Toggle)
function setupRoleToggle() {
  var buttons = document.querySelectorAll("#roleToggle .role-btn");
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener("click", function () {
      var btns = document.querySelectorAll("#roleToggle .role-btn");
      for (var j = 0; j < btns.length; j++) {
        btns[j].classList.remove("active");
      }
      this.classList.add("active");
      userRole = this.getAttribute("data-role");
      applyRoleMode();
      saveState();
    });
  }
}

function applyRoleMode() {
  var btns = document.querySelectorAll("#roleToggle .role-btn");
  for (var i = 0; i < btns.length; i++) {
    btns[i].classList.remove("active");
  }
  var activeBtn = document.querySelector("#roleToggle .role-btn[data-role=\"" + userRole + "\"]");
  if (activeBtn) activeBtn.classList.add("active");

  var adminTag = document.getElementById("adminTag");
  var vTab = document.querySelector(".nav-item[data-tab=\"vendas\"]");
  var rTab = document.querySelector(".nav-item[data-tab=\"relatorios\"]");
  var roleLabel = document.getElementById("roleLabel");
  var profileAvatar = document.getElementById("profileAvatar");
  var topAvatar = document.getElementById("topAvatar");

  if (userRole === "fabrica") {
    if (vTab) vTab.style.display = "none";
    if (rTab) rTab.style.display = "none";
    if (adminTag) adminTag.style.display = "none";
    if (roleLabel) roleLabel.innerText = "Fabrica / Producao";
    if (profileAvatar) profileAvatar.innerText = "FAB";
    if (topAvatar) topAvatar.innerText = "FAB";
    if (activeTab === "vendas" || activeTab === "relatorios") {
      switchTab("producao");
    }
  } else {
    if (vTab) vTab.style.display = "flex";
    if (rTab) rTab.style.display = "flex";
    if (adminTag) adminTag.style.display = "inline-block";
    if (roleLabel) roleLabel.innerText = "Administracao";
    if (profileAvatar) profileAvatar.innerText = "ADM";
    if (topAvatar) topAvatar.innerText = "ADM";
  }
  renderAll();
}

// Modo Escuro
function setupThemeToggle() {
  var themeBtn = document.getElementById("themeButton");
  var savedTheme = localStorage.getItem("malharia_theme") || "light";
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
  }
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      document.body.classList.toggle("dark");
      var isDark = document.body.classList.contains("dark");
      localStorage.setItem("malharia_theme", isDark ? "dark" : "light");
    });
  }
}
// ============================================================
// FORMULARIO DE VENDAS
// ============================================================
function setupSalesForm() {
  var form = document.getElementById("saleForm");
  var newBtn = document.getElementById("newSaleButton");
  var entryPanel = document.getElementById("entry-form");

  if (newBtn && entryPanel) {
    newBtn.addEventListener("click", function () {
      entryPanel.removeAttribute("hidden");
      entryPanel.scrollIntoView({ behavior: "smooth" });
    });
  }

  if (!form) return;

  var qtdInput = document.getElementById("quantidade");
  var precoInput = document.getElementById("precoUnitario");
  var previewEl = document.getElementById("valorTotalPreview");

  function updatePreview() {
    var q = parseFloat(qtdInput.value) || 0;
    var p = parseFloat(precoInput.value) || 0;
    var total = q * p;
    if (previewEl) {
      previewEl.value = total > 0 ? "R$ " + total.toFixed(2).replace(".", ",") : "R$ 0,00";
    }
  }

  if (qtdInput) qtdInput.addEventListener("input", updatePreview);
  if (precoInput) precoInput.addEventListener("input", updatePreview);

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var cliente = document.getElementById("cliente").value.trim();
    var telefone = document.getElementById("telefone").value.trim();
    var modelo = document.getElementById("modelo").value.trim();
    var cor = document.getElementById("cor").value.trim();
    var grade = document.getElementById("grade").value.trim();
    var quantidade = parseInt(document.getElementById("quantidade").value, 10);
    var precoUnitario = parseFloat(document.getElementById("precoUnitario").value);
    var observacoes = document.getElementById("observacoes").value.trim();

    if (!cliente || !modelo || !cor || !grade || !quantidade || !precoUnitario) {
      var statusEl = document.getElementById("formStatus");
      if (statusEl) {
        statusEl.innerText = "Preencha todos os campos obrigatorios.";
        statusEl.style.color = "var(--red)";
      }
      return;
    }

    var newOrder = {
      id: Date.now(),
      data: new Date().toLocaleDateString("pt-BR"),
      cliente: cliente,
      telefone: telefone,
      modelo: modelo,
      cor: cor,
      grade: grade,
      quantidade: quantidade,
      precoUnitario: precoUnitario,
      valorTotal: parseFloat((quantidade * precoUnitario).toFixed(2)),
      observacoes: observacoes,
      status: "pendente"
    };

    orders.unshift(newOrder);
    saveState();
    form.reset();
    if (previewEl) previewEl.value = "R$ 0,00";
    renderAll();

    var statusEl = document.getElementById("formStatus");
    if (statusEl) {
      statusEl.innerText = "Pedido registrado!";
      statusEl.style.color = "var(--green)";
      setTimeout(function () { statusEl.innerText = ""; }, 3000);
    }
  });
}

// ============================================================
// FORMULARIO DE ESTOQUE
// ============================================================
function setupStockForm() {
  var form = document.getElementById("stockForm");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var tipo = document.getElementById("tipoInsumo").value;
    var nome = document.getElementById("nomeInsumo").value.trim();
    var quantidade = parseFloat(document.getElementById("quantidadeInsumo").value);
    var unidade = document.getElementById("unidadeInsumo").value;
    var minimo = parseFloat(document.getElementById("minimoInsumo").value);

    if (!nome || !quantidade || !minimo) {
      var statusEl = document.getElementById("stockFormStatus");
      if (statusEl) {
        statusEl.innerText = "Preencha todos os campos obrigatorios.";
        statusEl.style.color = "var(--red)";
      }
      return;
    }

    var maxId = 0;
    for (var i = 0; i < stock.length; i++) {
      if (stock[i].id > maxId) maxId = stock[i].id;
    }

    var newItem = {
      id: maxId + 1,
      tipo: tipo,
      nome: nome,
      quantidade: quantidade,
      unidade: unidade,
      minimo: minimo
    };

    stock.push(newItem);
    saveState();
    form.reset();
    renderAll();

    var statusEl = document.getElementById("stockFormStatus");
    if (statusEl) {
      statusEl.innerText = "Insumo adicionado!";
      statusEl.style.color = "var(--green)";
      setTimeout(function () { statusEl.innerText = ""; }, 3000);
    }
  });
}

// ============================================================
// FILTROS DE PRODUCAO
// ============================================================
function setupProductionFilters() {
  var filterGroup = document.getElementById("statusFilter");
  if (!filterGroup) return;

  var buttons = filterGroup.querySelectorAll(".filter-btn");
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener("click", function () {
      var btns = document.getElementById("statusFilter").querySelectorAll(".filter-btn");
      for (var j = 0; j < btns.length; j++) {
        btns[j].classList.remove("active");
      }
      this.classList.add("active");
      activeStatusFilter = this.getAttribute("data-status");
      renderProductionTable();
    });
  }
}
// ============================================================
// FUNCOES DE RENDERIZACAO
// ============================================================
function renderAll() {
  renderMetrics();
  renderSalesTable();
  renderProductionTable();
  renderStockTable();
  renderReports();
  renderAlerts();
  updateBadge();
}

// Metricas principais
function renderMetrics() {
  var totalFaturamento = 0;
  for (var i = 0; i < orders.length; i++) {
    totalFaturamento += orders[i].valorTotal;
  }
  var el = document.getElementById("metricFaturamento");
  if (el) el.innerText = "R$ " + totalFaturamento.toFixed(2).replace(".", ",");
  el = document.getElementById("metricPedidos");
  if (el) el.innerText = "" + orders.length;

  var ticket = orders.length > 0 ? totalFaturamento / orders.length : 0;
  el = document.getElementById("metricTicket");
  if (el) el.innerText = "R$ " + ticket.toFixed(2).replace(".", ",");

  var aprovados = 0, recusados = 0, emProducao = 0, concluidas = 0;
  for (var j = 0; j < orders.length; j++) {
    if (orders[j].status === "aprovado") aprovados++;
    else if (orders[j].status === "recusado") recusados++;
    else if (orders[j].status === "em-producao") emProducao++;
    else if (orders[j].status === "concluida") concluidas++;
  }

  el = document.getElementById("metricPendentes");
  if (el) el.innerText = "" + aprovados;
  el = document.getElementById("metricEmProducao");
  if (el) el.innerText = "" + emProducao;
  el = document.getElementById("metricConcluidas");
  if (el) el.innerText = "" + concluidas;
}

// Tabela de Vendas
function renderSalesTable() {
  var tbody = document.getElementById("salesBody");
  var empty = document.getElementById("salesEmptyState");
  var count = document.getElementById("salesCount");
  if (!tbody) return;

  if (orders.length === 0) {
    tbody.innerHTML = "";
    if (empty) empty.removeAttribute("hidden");
    if (count) count.innerText = "0 vendas";
    return;
  }

  if (empty) empty.setAttribute("hidden", "");
  if (count) count.innerText = orders.length + " venda" + (orders.length > 1 ? "s" : "");

  var sLabel = { "aprovado": "Aprovado", "recusado": "Recusado", "em-producao": "Em producao", "concluida": "Concluida" };
  var sClass = { "aprovado": "status-pendente", "recusado": "status-recusado", "em-producao": "status-producao", "concluida": "status-concluido" };

  var html = "";
  for (var i = 0; i < orders.length; i++) {
    var o = orders[i];
    html += "<tr>";
    html += "<td><strong>" + esc(o.cliente) + "</strong></td>";
    html += "<td>" + esc(o.modelo) + "</td>";
    html += "<td>" + esc(o.cor) + "</td>";
    html += "<td>" + esc(o.grade) + "</td>";
    html += "<td>" + o.quantidade + "</td>";
    html += "<td>R$ " + o.precoUnitario.toFixed(2).replace(".", ",") + "</td>";
    html += '<td class="align-right"><strong>R$ ' + o.valorTotal.toFixed(2).replace(".", ",") + "</strong></td>";
    html += '<td><span class="status-badge ' + (sClass[o.status] || "status-pendente") + '">' + (sLabel[o.status] || o.status) + "</span></td>";
    html += '<td class="action-buttons">';
    html += '<button class="stock-adjust-btn" onclick="deleteOrder(' + o.id + ')" title="Excluir">✕</button>';
    html += "</td></tr>";
  }
  tbody.innerHTML = html;
}

// Tabela de Producao (com drop-down de status)
function renderProductionTable() {
  var tbody = document.getElementById("productionBody");
  var empty = document.getElementById("productionEmptyState");
  if (!tbody) return;

  var filtered = [];
  if (activeStatusFilter === "todos") {
    for (var p = 0; p < orders.length; p++) filtered.push(orders[p]);
  } else {
    for (var p = 0; p < orders.length; p++) {
      if (orders[p].status === activeStatusFilter) filtered.push(orders[p]);
    }
  }

  if (filtered.length === 0) {
    tbody.innerHTML = "";
    if (empty) empty.removeAttribute("hidden");
    return;
  }

  if (empty) empty.setAttribute("hidden", "");

  var sOpts = ["aprovado", "recusado", "em-producao", "concluida"];

  var html = "";
  for (var i = 0; i < filtered.length; i++) {
    var o = filtered[i];
    var obs = o.observacoes || "—";
    html += "<tr>";
    html += "<td><strong>" + esc(o.cliente) + "</strong></td>";
    html += "<td>" + esc(o.modelo) + "</td>";
    html += "<td>" + esc(o.cor) + "</td>";
    html += "<td>" + esc(obs) + "</td>";
    html += "<td>" + o.quantidade + "</td>";
    html += "<td>";
    html += '<select class="status-select" onchange="changeOrderStatus(' + o.id + ',this.value)">';
    for (var si = 0; si < sOpts.length; si++) {
      var label = { "aprovado":"Aprovado", "recusado":"Recusado", "em-producao":"Em Producao", "concluida":"Concluida" };
      html += '<option value="' + sOpts[si] + '"' + (o.status === sOpts[si] ? " selected" : "") + ">" + label[sOpts[si]] + "</option>";
    }
    html += "</select>";
    html += "</td>";
    html += '<td class="action-buttons">';
    html += '<button class="primary-button-sm" onclick="imprimirFicha(' + o.id + ')">🖨️ Imprimir Ficha</button>';
    html += '<button class="stock-adjust-btn" onclick="deleteOrder(' + o.id + ')" title="Excluir">✕</button>';
    html += "</td></tr>";
  }
  tbody.innerHTML = html;
}
// Tabela de Estoque
function renderStockTable() {
  var tbody = document.getElementById("stockBody");
  var empty = document.getElementById("stockEmptyState");
  var count = document.getElementById("stockCount");
  if (!tbody) return;

  if (stock.length === 0) {
    tbody.innerHTML = "";
    if (empty) empty.removeAttribute("hidden");
    if (count) count.innerText = "0 itens";
    return;
  }

  if (empty) empty.setAttribute("hidden", "");
  if (count) count.innerText = stock.length + " itens";

  var html = "";
  for (var i = 0; i < stock.length; i++) {
    var s = stock[i];
    var st = s.quantidade <= s.minimo
      ? '<span class="status-badge status-pendente">⚠️ Repor</span>'
      : '<span class="status-badge status-concluido">OK</span>';

    html += "<tr>";
    html += "<td>" + esc(s.tipo) + "</td>";
    html += "<td><strong>" + esc(s.nome) + "</strong></td>";
    html += "<td>" + s.quantidade.toFixed(1) + " " + s.unidade + "</td>";
    html += "<td>" + s.minimo.toFixed(1) + " " + s.unidade + "</td>";
    html += "<td>" + st + "</td>";
    html += '<td><div class="adjust-cell">';
    html += '<button class="stock-adjust-btn" onclick="adjustStock(' + s.id + ",-1)\" title=\"Saida\">−</button>";
    html += '<input class="stock-qty-input" type="number" value="' + s.quantidade + '" id="stockQty_' + s.id + '" min="0" step="0.1">';
    html += '<button class="stock-adjust-btn" onclick="adjustStock(' + s.id + ',1)" title="Entrada">+</button>';
    html += "</div></td>";
    html += '<td><button class="stock-adjust-btn" onclick="deleteStock(' + s.id + ')" title="Excluir">✕</button></td>';
    html += "</tr>";
  }
  tbody.innerHTML = html;
}

// Relatorios
function renderReports() {
  var totalFaturamento = 0, totalPecas = 0, concluidasPecas = 0;
  var aprovados = 0, recusados = 0, emProducao = 0, concluidos = 0;

  for (var i = 0; i < orders.length; i++) {
    var o = orders[i];
    totalFaturamento += o.valorTotal;
    totalPecas += o.quantidade;
    if (o.status === "aprovado") aprovados++;
    else if (o.status === "recusado") recusados++;
    else if (o.status === "em-producao") emProducao++;
    else if (o.status === "concluida") { concluidos++; concluidasPecas += o.quantidade; }
  }

  var el = document.getElementById("repFaturamento");
  if (el) el.innerText = "R$ " + totalFaturamento.toFixed(2).replace(".", ",");
  el = document.getElementById("repPecasFila");
  if (el) el.innerText = "" + totalPecas;
  el = document.getElementById("repPecasConcluidas");
  if (el) el.innerText = "" + concluidasPecas;

  var total = orders.length;
  var pctAprov = total > 0 ? (aprovados / total * 100) : 0;
  var pctProd = total > 0 ? (emProducao / total * 100) : 0;
  var pctRec = total > 0 ? (recusados / total * 100) : 0;
  var pctConc = total > 0 ? (concluidos / total * 100) : 0;

  el = document.getElementById("pctPendenteVal");
  if (el) el.innerText = Math.round(pctAprov) + "% (" + aprovados + " pecas)";
  el = document.getElementById("pctPendenteBar");
  if (el) el.style.width = pctAprov + "%";
  el = document.getElementById("pctProducaoVal");
  if (el) el.innerText = Math.round(pctProd) + "% (" + emProducao + " pecas)";
  el = document.getElementById("pctProducaoBar");
  if (el) el.style.width = pctProd + "%";
  el = document.getElementById("pctConcluidoVal");
  if (el) el.innerText = Math.round(pctConc) + "% (" + concluidos + " pecas)";
  el = document.getElementById("pctConcluidoBar");
  if (el) el.style.width = pctConc + "%";
}

// Alertas de estoque baixo
function renderAlerts() {
  var listEl = document.getElementById("alertsStockList");
  var emptyEl = document.getElementById("alertsStockEmpty");
  if (!listEl) return;

  var baixos = [];
  for (var i = 0; i < stock.length; i++) {
    if (stock[i].quantidade <= stock[i].minimo) baixos.push(stock[i]);
  }

  if (baixos.length === 0) {
    listEl.innerHTML = "";
    if (emptyEl) emptyEl.removeAttribute("hidden");
    return;
  }

  if (emptyEl) emptyEl.setAttribute("hidden", "");
  var html = "";
  for (var j = 0; j < baixos.length; j++) {
    var s = baixos[j];
    var deficit = (s.minimo - s.quantidade).toFixed(1);
    html += '<div class="alert-stock-item"><div>';
    html += '<div class="alert-title">' + esc(s.nome) + "</div>";
    html += '<div class="alert-meta">' + esc(s.tipo) + " — " + s.quantidade.toFixed(1) + " " + s.unidade + " (min " + s.minimo.toFixed(1) + " " + s.unidade + ")</div>";
    html += "</div><span>Faltam " + deficit + " " + s.unidade + "</span></div>";
  }
  listEl.innerHTML = html;
}

// Badge de pendentes no menu
function updateBadge() {
  var badge = document.getElementById("pendingBadge");
  if (badge) {
    var pendentes = 0;
    for (var i = 0; i < orders.length; i++) {
      if (orders[i].status !== "concluida") pendentes++;
    }
    badge.innerText = "" + pendentes;
    badge.style.display = pendentes > 0 ? "inline-block" : "none";
  }
}
// ============================================================
// IMPRIMIR FICHA DE PRODUCAO (tela limpa, sem valores)
// ============================================================
function imprimirFicha(orderId) {
  var order = null;
  for (var i = 0; i < orders.length; i++) {
    if (orders[i].id === orderId) { order = orders[i]; break; }
  }
  if (!order) return;

  var pw = window.open("", "_blank", "width=800,height=600");
  if (!pw) { alert("Permita pop-ups para imprimir a ficha."); return; }

  var sLabel = { "aprovado": "Aprovado", "recusado": "Recusado", "em-producao": "Em Producao", "concluida": "Concluida" };

  var gradeRows = "";
  var grades = order.grade.split(",");
  for (var g = 0; g < grades.length; g++) {
    var parts = grades[g].trim().split(":");
    gradeRows += "<tr><td>" + (parts[0] || "—") + "</td><td>" + (parts[1] || "0") + "</td></tr>";
  }

  var obsHtml = "";
  if (order.observacoes) {
    obsHtml = '<div class="observacoes"><div class="label">📝 Observacoes</div><div class="value">' + esc(order.observacoes) + "</div></div>";
  }

  var d = pw.document;
  d.write("<!DOCTYPE html><html lang=\"pt-BR\"><head><meta charset=\"UTF-8\">");
  d.write("<title>Ficha de Producao - " + esc(order.cliente) + "</title>");
  d.write("<style>");
  d.write("*{margin:0;padding:0;box-sizing:border-box;}");
  d.write("body{font-family:'Courier New',monospace;font-size:14px;padding:40px 32px;color:#1e293b;background:#fff;}");
  d.write(".header{text-align:center;border-bottom:2px solid #0d9488;padding-bottom:16px;margin-bottom:24px;}");
  d.write(".header h1{font-size:22px;color:#0d9488;letter-spacing:2px;text-transform:uppercase;}");
  d.write(".header p{font-size:12px;color:#64748b;margin-top:4px;}");
  d.write(".info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 24px;margin-bottom:24px;}");
  d.write(".info-item{padding:8px 0;border-bottom:1px dashed #e2e8f0;}");
  d.write(".info-item .label{font-size:11px;text-transform:uppercase;color:#64748b;font-weight:700;letter-spacing:0.5px;}");
  d.write(".info-item .value{font-size:16px;font-weight:700;margin-top:2px;}");
  d.write(".observacoes{margin-top:16px;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;}");
  d.write(".grade-table{width:100%;border-collapse:collapse;margin-top:20px;}");
  d.write(".grade-table th{background:#f1f5f9;padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;border:1px solid #e2e8f0;}");
  d.write(".grade-table td{padding:8px 12px;border:1px solid #e2e8f0;font-size:14px;}");
  d.write(".footer{margin-top:32px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:16px;}");
  d.write(".badge-status{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;background:#f1f5f9;}");
  d.write("@media print{body{padding:20px}.no-print{display:none}}");
  d.write("</style></head><body>");
  d.write('<div class="no-print" style="text-align:right;margin-bottom:16px;">');
  d.write('<button onclick="window.print()" style="padding:8px 20px;background:#0d9488;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;">🖨️ Imprimir</button> ');
  d.write('<button onclick="window.close()" style="padding:8px 20px;background:#e2e8f0;color:#1e293b;border:none;border-radius:6px;cursor:pointer;font-size:14px;">✕ Fechar</button>');
  d.write("</div>");
  d.write('<div class="header"><h1>🧵 Ficha de Producao</h1><p>Ordem #' + order.id + " — " + order.data + "</p></div>");
  d.write('<div class="info-grid">');
  d.write('<div class="info-item"><div class="label">Cliente</div><div class="value">' + esc(order.cliente) + "</div></div>");
  d.write('<div class="info-item"><div class="label">Status</div><div class="value"><span class="badge-status">' + (sLabel[order.status] || order.status) + "</span></div></div>");
  d.write('<div class="info-item"><div class="label">Modelo / Peca</div><div class="value">' + esc(order.modelo) + "</div></div>");
  d.write('<div class="info-item"><div class="label">Cor</div><div class="value">' + esc(order.cor) + "</div></div>");
  d.write('<div class="info-item"><div class="label">Quantidade Total</div><div class="value">' + order.quantidade + " pecas</div></div>");
  d.write('<div class="info-item"><div class="label">Telefone</div><div class="value">' + esc(order.telefone || "—") + "</div></div>");
  d.write("</div>");
  d.write('<h3 style="font-size:13px;text-transform:uppercase;color:#64748b;margin-bottom:8px;">📐 Grade de Tamanhos</h3>');
  d.write('<table class="grade-table"><thead><tr><th>Tamanho</th><th>Quantidade</th></tr></thead><tbody>' + gradeRows + "</tbody></table>");
  d.write(obsHtml);
  d.write('<div class="footer">Ficha de Producao — Gestao da Malharia<br>Gerada em ' + new Date().toLocaleString("pt-BR") + "</div></body></html>");
  d.close();
}
// ============================================================
// ACOES AUXILIARES
// ============================================================
function changeOrderStatus(id, newStatus) {
  for (var i = 0; i < orders.length; i++) {
    if (orders[i].id === id) { orders[i].status = newStatus; saveState(); renderAll(); return; }
  }
}

function deleteOrder(id) {
  if (!confirm("Tem certeza que deseja excluir este pedido?")) return;
  var t = [];
  for (var i = 0; i < orders.length; i++) { if (orders[i].id !== id) t.push(orders[i]); }
  orders = t;
  saveState();
  renderAll();
}

function deleteStock(id) {
  if (!confirm("Remover este insumo do estoque?")) return;
  var t = [];
  for (var i = 0; i < stock.length; i++) { if (stock[i].id !== id) t.push(stock[i]); }
  stock = t;
  saveState();
  renderAll();
}

function adjustStock(id, direction) {
  var input = document.getElementById("stockQty_" + id);
  var item = null;
  for (var i = 0; i < stock.length; i++) { if (stock[i].id === id) { item = stock[i]; break; } }
  if (!input || !item) return;
  var v = parseFloat(input.value) || 0;
  v = direction > 0 ? v + 0.1 : Math.max(0, v - 0.1);
  input.value = v.toFixed(1);
  item.quantidade = parseFloat(v.toFixed(1));
  saveState();
  renderAll();
}