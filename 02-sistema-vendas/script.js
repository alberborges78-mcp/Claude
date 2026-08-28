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
    grade: {P: 10, M: 20, G: 20, GG: 10},
    quantidade: 60,
    precoUnitario: 28.50,
    descontoReais: 0,
    descontoPercent: 0,
    valorEntrada: 1710.00,
    formaPagamento: "pix",
    subtotal: 1710.00,
    valorTotal: 1710.00,
    valorFaltante: 0,
    fotoBase64: "",
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
    grade: {M: 15, G: 15, GG: 5},
    quantidade: 35,
    precoUnitario: 75.00,
    descontoReais: 262.50,
    descontoPercent: 10,
    valorEntrada: 1000.00,
    formaPagamento: "faturado",
    subtotal: 2625.00,
    valorTotal: 2362.50,
    valorFaltante: 1362.50,
    observacoes: "Zíper tratorado preto, punho elástico de alta pressão.",
    status: "em-producao",
    fotoBase64: "",
  },
  {
    id: 1724842800000,
    data: "26/08/2026",
    cliente: "Uniformes Corporativos Silva",
    telefone: "(31) 99123-4567",
    modelo: "Camisa Polo Piquet",
    cor: "Verde Musgo",
    grade: {P: 10, M: 15, G: 15},
    quantidade: 40,
    precoUnitario: 39.90,
    descontoReais: 0,
    descontoPercent: 5,
    valorEntrada: 798.00,
    formaPagamento: "debito-credito",
    subtotal: 1596.00,
    valorTotal: 1516.20,
    valorFaltante: 718.20,
    fotoBase64: "",
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
let activeTab = "relatorios";
let activeStatusFilter = "todos";

// Helper para escapar HTML
function esc(str) {
  if (!str) return "";
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

// Salvar no localStorage
// Retorna true se o salvamento foi concluido com sucesso, false em caso de falha.
function saveState() {
  try {
    localStorage.setItem("malharia_vendas", JSON.stringify(orders));
    localStorage.setItem("malharia_estoque", JSON.stringify(stock));
    localStorage.setItem("malharia_user_role", userRole);
    return true;
  } catch (erro) {
    // Cota do localStorage esgotada (foto muito grande, muitos pedidos, etc.)
    if (erro && (erro.name === "QuotaExceededError" || erro.code === 22 || erro.code === 1014)) {
      alert("Erro: Foto muito grande ou memória cheia. Tente uma foto menor.");
    } else {
      alert("Erro ao salvar os dados. Tente novamente.");
    }
    console.error("Falha ao salvar no localStorage:", erro);
    return false;
  }
}

// ============================================================
// COMPRESSAO DE IMAGEM (Canvas)
// Redimensiona a imagem para no maximo "maxWidth" pixels de largura,
// mantendo a proporcao, e retorna um Base64 (JPEG) bem mais leve.
// ============================================================
function resizeImageParaBase64(dataUrlOriginal, maxWidth, callback) {
  var img = new Image();
  img.onload = function () {
    var largura = img.width;
    var altura = img.height;

    if (largura > maxWidth) {
      var escala = maxWidth / largura;
      largura = maxWidth;
      altura = Math.round(altura * escala);
    }

    var canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, largura, altura);

    // Qualidade 0.7 reduz bastante o tamanho final do arquivo salvo
    var dataUrlComprimido = canvas.toDataURL("image/jpeg", 0.7);
    callback(dataUrlComprimido);
  };
  img.onerror = function () {
    // Se falhar ao processar a imagem, usa a original como fallback
    callback(dataUrlOriginal);
  };
  img.src = dataUrlOriginal;
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
  switchTab("relatorios");
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
    relatorios: "Painel Principal"
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
  var savedTheme = localStorage.getItem("malharia_theme") || "dark";
  if (savedTheme === "light") {
    document.body.classList.add("light-mode");
    if (themeBtn) themeBtn.innerText = "☀️";
  } else {
    if (themeBtn) themeBtn.innerText = "🌙";
  }
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      document.body.classList.toggle("light-mode");
      var isLight = document.body.classList.contains("light-mode");
      localStorage.setItem("malharia_theme", isLight ? "light" : "dark");
      themeBtn.innerText = isLight ? "☀️" : "🌙";
      // Reconstroi gráfico com as novas cores
      renderFaturamentoChart();
    });
  }
}
// Carrinho global de itens do pedido (multi-materiais)
window.itensDoPedido = [];

// Controle de estado de edição: -1 = criando pedido novo; >= 0 = índice do
// pedido (no array "orders") que está sendo editado e deve ser atualizado.
window.editandoIndice = -1;

// Função para remover item do carrinho pelo índice
function removerItemCarrinho(indice) {
  window.itensDoPedido.splice(indice, 1);
  // Re-renderiza carrinho e recalcula
  if (typeof renderCartTableGlobal === "function") renderCartTableGlobal();
  if (typeof recalcularTotaisGlobal === "function") recalcularTotaisGlobal();
}

// ============================================================
// Prepara o formulário de vendas para EDITAR um pedido já salvo.
// "index" é a posição do pedido no array "orders" (mesmo array
// persistido no localStorage via saveState()).
// ============================================================
function prepararEdicao(index) {
  var pedido = orders[index];
  if (!pedido) return;

  // Ativa o modo de edição
  window.editandoIndice = index;

  var entryPanel = document.getElementById("entry-form");
  if (entryPanel) {
    entryPanel.removeAttribute("hidden");
    entryPanel.classList.add("editing-mode");
  }

  // --- Preenche os campos gerais do pedido ---
  var clienteEl = document.getElementById("cliente");
  var telefoneEl = document.getElementById("telefone");
  var dataEntregaEl = document.getElementById("dataEntrega");
  var descREl = document.getElementById("descontoReais");
  var descPEl = document.getElementById("descontoPercent");
  var entradaEl = document.getElementById("valorEntrada");
  var fpEl = document.getElementById("formaPagamento");
  var obsEl = document.getElementById("observacoes");

  if (clienteEl) clienteEl.value = pedido.cliente || "";
  if (telefoneEl) telefoneEl.value = pedido.telefone || "";
  if (dataEntregaEl) dataEntregaEl.value = pedido.dataEntrega || "";
  if (descREl) descREl.value = pedido.descontoReais ? pedido.descontoReais.toFixed(2) : "";
  if (descPEl) descPEl.value = pedido.descontoPercent ? pedido.descontoPercent : "";
  if (entradaEl) entradaEl.value = pedido.valorEntrada ? pedido.valorEntrada.toFixed(2) : "";
  if (fpEl && pedido.formaPagamento) fpEl.value = pedido.formaPagamento;
  if (obsEl) obsEl.value = pedido.observacoes || "";

  // Limpa os campos do "material atual" para evitar itens residuais
  var modeloEl = document.getElementById("modelo");
  var corEl = document.getElementById("cor");
  var precoEl = document.getElementById("precoUnitario");
  var fotoEl = document.getElementById("fotoPeca");
  var previewContainerEl = document.getElementById("preview-container");
  var thumbnailPreviewEl = document.getElementById("thumbnail-preview");
  if (modeloEl) modeloEl.value = "";
  if (corEl) corEl.value = "";
  if (precoEl) precoEl.value = "";
  if (fotoEl) fotoEl.value = "";
  if (previewContainerEl) previewContainerEl.style.display = "none";
  if (thumbnailPreviewEl) thumbnailPreviewEl.src = "";
  var gradeQtyEls = document.querySelectorAll(".grade-qty");
  for (var gq = 0; gq < gradeQtyEls.length; gq++) { gradeQtyEls[gq].value = ""; }
  var qtdInputEl = document.getElementById("quantidade");
  var qtdDisplayEl = document.getElementById("quantidadeTotalDisplay");
  if (qtdInputEl) qtdInputEl.value = 0;
  if (qtdDisplayEl) qtdDisplayEl.innerText = "0";

  // --- Carrega a lista de materiais para a tabela temporária do carrinho ---
  // Suporta tanto o formato novo (multi-materiais) quanto o legado (1 material por pedido).
  var materiaisOrigem = (pedido.materiais && pedido.materiais.length > 0)
    ? pedido.materiais
    : [{
        modelo: pedido.modelo || "", cor: pedido.cor || "", grade: pedido.grade || {},
        quantidade: pedido.quantidade || 0, precoUnitario: pedido.precoUnitario || 0,
        subtotal: pedido.subtotal || pedido.valorTotal || 0, fotoBase64: pedido.fotoBase64 || ""
      }];
  window.itensDoPedido = JSON.parse(JSON.stringify(materiaisOrigem));

  if (typeof window.renderCartTableGlobal === "function") window.renderCartTableGlobal();
  if (typeof window.recalcularTotaisGlobal === "function") window.recalcularTotaisGlobal();

  // --- Indicador visual "Editando Pedido #X" ---
  var indicator = document.getElementById("editingIndicator");
  var orderNumberEl = document.getElementById("editingOrderNumber");
  if (orderNumberEl) orderNumberEl.innerText = index + 1;
  if (indicator) indicator.removeAttribute("hidden");

  var btnLabel = document.getElementById("btnFinalizarLabel");
  if (btnLabel) btnLabel.innerText = "✓ Atualizar Pedido";

  var stEl = document.getElementById("formStatus");
  if (stEl) { stEl.innerText = "Editando pedido de " + (pedido.cliente || "cliente") + "."; stEl.style.color = "var(--orange)"; }

  // --- Rola a tela suavemente de volta para o topo do formulário ---
  if (entryPanel) entryPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}
window.prepararEdicao = prepararEdicao;

// ============================================================
// FORMULARIO DE VENDAS
// ============================================================
function setupSalesForm() {
  var form = document.getElementById("saleForm");
  var newBtn = document.getElementById("newSaleButton");
  var entryPanel = document.getElementById("entry-form");

  if (newBtn && entryPanel) {
    newBtn.addEventListener("click", function () {
      // Garante que iniciar um "Novo pedido" sempre saia do modo de edição
      window.editandoIndice = -1;
      entryPanel.classList.remove("editing-mode");
      var indicatorEl = document.getElementById("editingIndicator");
      if (indicatorEl) indicatorEl.setAttribute("hidden", "");
      var btnLabelEl = document.getElementById("btnFinalizarLabel");
      if (btnLabelEl) btnLabelEl.innerText = "✓ Finalizar e Salvar Venda";
      if (form) form.reset();
      window.itensDoPedido = [];
      if (typeof window.renderCartTableGlobal === "function") window.renderCartTableGlobal();
      if (typeof window.recalcularTotaisGlobal === "function") window.recalcularTotaisGlobal();

      entryPanel.removeAttribute("hidden");
      entryPanel.scrollIntoView({ behavior: "smooth" });
    });
  }

  if (!form) return;

  // Elementos do formulário
  var qtdInput = document.getElementById("quantidade");
  var qtdDisplay = document.getElementById("quantidadeTotalDisplay");
  var gradeInputs = document.getElementById("gradeInputs");
  var gradeHidden = document.getElementById("gradeTamanhos");
  var novoTamanhoInput = document.getElementById("novoTamanhoNome");
  var addTamanhoBtn = document.getElementById("adicionarTamanhoBtn");
  var precoInput = document.getElementById("precoUnitario");
  var previewEl = document.getElementById("valorTotalPreview");
  var descRInput = document.getElementById("descontoReais");
  var descPInput = document.getElementById("descontoPercent");
  var entradaInput = document.getElementById("valorEntrada");
  var addItemBtn = document.getElementById("btn-adicionar-item");
  var finalizarBtn = document.getElementById("btn-finalizar-venda");
  var cartWrapper = document.getElementById("cartItemsWrapper");
  var cartBody = document.getElementById("cartBody");
  var cartCount = document.getElementById("cartCount");
  var cartEmpty = document.getElementById("cartEmptyState");

  // Elementos do resumo financeiro
  var elSubtotal = document.getElementById("calcSubtotal");
  var elDesconto = document.getElementById("calcDesconto");
  var elTotalFinal = document.getElementById("calcTotalFinal");
  var elEntrada = document.getElementById("calcEntrada");
  var elFaltante = document.getElementById("calcFaltante");
  var elStatus = document.getElementById("calcStatus");

  // Foto
  var fotoInput = document.getElementById("fotoPeca");
  var fotoBase64 = "";
  var fileWrapper = null;
  var previewContainer = document.getElementById("preview-container");
  var thumbnailPreview = document.getElementById("thumbnail-preview");

  // Elementos do resumo financeiro
  var elSubtotal = document.getElementById("calcSubtotal");
  var elDesconto = document.getElementById("calcDesconto");
  var elTotalFinal = document.getElementById("calcTotalFinal");
  var elEntrada = document.getElementById("calcEntrada");
  var elFaltante = document.getElementById("calcFaltante");
  var elStatus = document.getElementById("calcStatus");

  function fmtBR(val) {
    return "R$ " + val.toFixed(2).replace(".", ",");
  }

  // ============================================================
  // PASSO A: Soma Bruta dos Itens no Carrinho + material sendo digitado
  // ============================================================
  function calcularValorBrutoInicial() {
    var total = 0;
    // Soma subtotais dos itens já adicionados ao carrinho
    for (var ci = 0; ci < window.itensDoPedido.length; ci++) {
      total += window.itensDoPedido[ci].subtotal;
    }
    // Soma o material que está sendo digitado agora (grade atual)
    var qtdAtual = 0;
    var inputsGr = document.querySelectorAll(".grade-qty");
    for (var gi = 0; gi < inputsGr.length; gi++) {
      var v = parseInt(inputsGr[gi].value, 10);
      if (!isNaN(v) && v > 0) qtdAtual += v;
    }
    var p = parseFloat(precoInput.value) || 0;
    total += parseFloat((qtdAtual * p).toFixed(2));
    return parseFloat(total.toFixed(2));
  }

  // ============================================================
  // PASSO B + C: Aplicar descontos e calcular faltante
  // Retorna objeto { valorBruto, desconto, valorFinal, entrada, faltante }
  // ============================================================
  function calcularTotaisPedido() {
    var valorBruto = calcularValorBrutoInicial();
    var descR = parseFloat(descRInput.value) || 0;
    var descP = parseFloat(descPInput.value) || 0;

    // Limita descontos
    if (descR > valorBruto) { descR = valorBruto; descRInput.value = descR.toFixed(2); }
    if (descP > 100) { descP = 100; descPInput.value = "100"; }

    // Aplica desconto: se digitou em R$ usa esse; senão se digitou em % calcula
    var desconto = descR;
    if (descP > 0 && descR <= 0) {
      desconto = parseFloat((valorBruto * (descP / 100)).toFixed(2));
    }

    // PASSO B: VALOR FINAL DEFINITIVO = Valor Bruto - Desconto
    var valorFinal = parseFloat(Math.max(0, valorBruto - desconto).toFixed(2));

    // PASSO C: FALTANTE = Valor Final - Entrada (mínimo 0)
    var entrada = parseFloat(entradaInput.value) || 0;
    if (entrada > valorFinal) { entrada = valorFinal; entradaInput.value = entrada.toFixed(2); }
    var faltante = parseFloat(Math.max(0, valorFinal - entrada).toFixed(2));

    return {
      valorBruto: valorBruto,
      desconto: desconto,
      valorFinal: valorFinal,
      entrada: entrada,
      faltante: faltante
    };
  }

  // ============================================================
  // Atualiza toda a interface de preview ao vivo
  // ============================================================
  function recalcularTotais() {
    var totais = calcularTotaisPedido();

    if (previewEl) {
      previewEl.value = totais.valorFinal > 0 ? fmtBR(totais.valorFinal) : "R$ 0,00";
    }
    if (elSubtotal) elSubtotal.innerText = fmtBR(totais.valorBruto);
    if (elDesconto) elDesconto.innerText = fmtBR(totais.desconto);
    if (elTotalFinal) elTotalFinal.innerText = fmtBR(totais.valorFinal);
    if (elEntrada) elEntrada.innerText = fmtBR(totais.entrada);
    if (elFaltante) elFaltante.innerText = fmtBR(totais.faltante);
    if (elStatus) {
      if (totais.valorFinal === 0) {
        elStatus.innerText = "—";
      } else if (totais.entrada >= totais.valorFinal) {
        elStatus.innerText = "✅ Liquidado";
      } else {
        var fpS = document.getElementById("formaPagamento");
        var fpL = fpS ? fpS.options[fpS.selectedIndex].text : "";
        elStatus.innerText = "⏳ " + fmtBR(totais.faltante) + " (" + fpL + ")";
      }
    }
  }

  function setupGradeInputListener(inputEl) {
    if (!inputEl) return;
    inputEl.addEventListener("input", function () {
      var inputs = document.querySelectorAll(".grade-qty");
      var total = 0;
      for (var i = 0; i < inputs.length; i++) {
        var v = parseInt(inputs[i].value, 10);
        if (!isNaN(v) && v > 0) total += v;
      }
      if (qtdInput) qtdInput.value = total;
      if (qtdDisplay) qtdDisplay.innerText = total;
      if (descRInput) descRInput.value = "";
      if (descPInput) descPInput.value = "";
      recalcularTotais();
    });
  }

  var fixedInputs = document.querySelectorAll("#gradeInputs .grade-qty");
  for (var gi = 0; gi < fixedInputs.length; gi++) { setupGradeInputListener(fixedInputs[gi]); }

  if (addTamanhoBtn && novoTamanhoInput && gradeInputs) {
    addTamanhoBtn.addEventListener("click", function () {
      var nome = novoTamanhoInput.value.trim().toUpperCase();
      if (!nome) return;
      var existentes = document.querySelectorAll("#gradeInputs .grade-label");
      for (var ei = 0; ei < existentes.length; ei++) { if (existentes[ei].innerText === nome) return; }
      var item = document.createElement("div");
      item.className = "grade-item";
      item.innerHTML = '<label class="grade-label">' + nome + '</label><input type="number" class="grade-qty" data-tamanho="' + nome + '" min="0" step="1" value="" placeholder="0">';
      gradeInputs.appendChild(item);
      setupGradeInputListener(item.querySelector(".grade-qty"));
      novoTamanhoInput.value = "";
    });
  }

  if (precoInput) precoInput.addEventListener("input", function () {
    if (descRInput) descRInput.value = ""; if (descPInput) descPInput.value = ""; recalcularTotais();
  });

  if (descRInput) descRInput.addEventListener("input", function () {
    var st = calcularValorBrutoInicial();
    var dr = parseFloat(descRInput.value) || 0;
    if (dr > st) { dr = st; descRInput.value = dr.toFixed(2); }
    if (st > 0 && dr > 0) { descPInput.value = ((dr / st) * 100).toFixed(2); }
    else if (dr === 0) { descPInput.value = ""; }
    recalcularTotais();
  });

  if (descPInput) descPInput.addEventListener("input", function () {
    var st = calcularValorBrutoInicial();
    var dp = parseFloat(descPInput.value) || 0;
    if (dp > 100) { dp = 100; descPInput.value = "100"; }
    if (st > 0 && dp > 0) { descRInput.value = (st * (dp / 100)).toFixed(2); }
    else if (dp === 0) { descRInput.value = ""; }
    recalcularTotais();
  });

  if (entradaInput) entradaInput.addEventListener("input", recalcularTotais);
  var fpSelect = document.getElementById("formaPagamento");
  if (fpSelect) fpSelect.addEventListener("change", recalcularTotais);

  recalcularTotais();

  // Foto listener
  if (fotoInput) {
    fileWrapper = fotoInput.closest(".file-wrapper");
    fotoInput.addEventListener("change", function () {
      var file = fotoInput.files[0];
      if (!file) {
        fotoBase64 = ""; if (fileWrapper) fileWrapper.classList.remove("has-file");
        if (previewContainer) previewContainer.style.display = "none";
        if (thumbnailPreview) thumbnailPreview.src = ""; return;
      }
      var reader = new FileReader();
      reader.onload = function (e) {
        // Redimensiona a imagem no navegador (max. 800px de largura) antes de
        // guardar o Base64, reduzindo drasticamente o tamanho salvo.
        resizeImageParaBase64(e.target.result, 800, function (dataUrlComprimido) {
          fotoBase64 = dataUrlComprimido;
          if (fileWrapper) fileWrapper.classList.add("has-file");
          if (thumbnailPreview) thumbnailPreview.src = dataUrlComprimido;
          if (previewContainer) previewContainer.style.display = "block";
        });
      };
      reader.readAsDataURL(file);
    });
  }

  // Renderiza tabela do carrinho
  function renderCartTable() {
    if (!cartBody) return;
    if (window.itensDoPedido.length === 0) {
      cartBody.innerHTML = ""; if (cartWrapper) cartWrapper.setAttribute("hidden", "");
      if (cartCount) cartCount.innerText = "0 itens"; return;
    }
    if (cartWrapper) cartWrapper.removeAttribute("hidden");
    if (cartCount) cartCount.innerText = window.itensDoPedido.length + " item" + (window.itensDoPedido.length > 1 ? "s" : "");
    var html = "";
    for (var i = 0; i < window.itensDoPedido.length; i++) {
      var item = window.itensDoPedido[i];
      var gStr = "";
      if (typeof item.grade === "object" && item.grade !== null) {
        var parts = []; for (var gk in item.grade) { if (item.grade.hasOwnProperty(gk)) parts.push(gk + ":" + item.grade[gk]); }
        gStr = parts.join(", ");
      }
      html += "<tr><td>" + esc(item.modelo) + "</td><td>" + esc(item.cor) + "</td><td>" + esc(gStr) + "</td><td>" + item.quantidade + "</td>";
      html += "<td>R$ " + item.precoUnitario.toFixed(2).replace(".", ",") + "</td>";
      html += "<td><strong>R$ " + item.subtotal.toFixed(2).replace(".", ",") + "</strong></td><td>";
      if (item.fotoBase64 && item.fotoBase64.length > 50) { html += '<img class="thumb-preview" src="' + item.fotoBase64 + '" alt="Foto">'; }
      else { html += '<span class="thumb-empty" style="width:40px;height:40px;font-size:14px;">📷</span>'; }
      html += '</td><td><button class="cart-remove-btn" onclick="removerItemCarrinho(' + i + ')" title="Remover">✕</button></td></tr>';
    }
    cartBody.innerHTML = html;
  }

  window.renderCartTableGlobal = renderCartTable;
  window.recalcularTotaisGlobal = recalcularTotais;

  // Botão "Adicionar Material ao Pedido"
  if (addItemBtn) {
    addItemBtn.addEventListener("click", function () {
      var modelo = document.getElementById("modelo").value.trim();
      var cor = document.getElementById("cor").value.trim();
      if (!modelo || !cor) {
        var stEl = document.getElementById("formStatus");
        if (stEl) { stEl.innerText = "Preencha Descrição e Cor do material."; stEl.style.color = "var(--red)"; }
        return;
      }
      var qtyInputs = document.querySelectorAll(".grade-qty");
      var gradeDet = {}; var qtd = 0;
      for (var gi = 0; gi < qtyInputs.length; gi++) {
        var inp = qtyInputs[gi]; var tam = inp.getAttribute("data-tamanho"); var q = parseInt(inp.value, 10);
        if (tam && !isNaN(q) && q > 0) { gradeDet[tam] = q; qtd += q; }
      }
      if (qtd <= 0) {
        var stEl = document.getElementById("formStatus");
        if (stEl) { stEl.innerText = "Informe a quantidade na Grade."; stEl.style.color = "var(--red)"; }
        return;
      }
      var pU = parseFloat(precoInput.value) || 0;
      if (pU <= 0) {
        var stEl = document.getElementById("formStatus");
        if (stEl) { stEl.innerText = "Informe o Preço unitário."; stEl.style.color = "var(--red)"; }
        return;
      }
      var subItem = parseFloat((qtd * pU).toFixed(2));
      window.itensDoPedido.push({ modelo: modelo, cor: cor, grade: gradeDet, quantidade: qtd, precoUnitario: pU, subtotal: subItem, fotoBase64: fotoBase64 || "" });
      renderCartTable(); recalcularTotais();
      document.getElementById("modelo").value = ""; document.getElementById("cor").value = "";
      var allGQ = document.querySelectorAll(".grade-qty");
      for (var rgi = 0; rgi < allGQ.length; rgi++) { allGQ[rgi].value = ""; }
      if (gradeInputs) {
        var gItems = gradeInputs.querySelectorAll(".grade-item"); var fixos = ["PP","P","M","G","GG","XG","XXG","XXXG"];
        for (var ri = gItems.length - 1; ri >= 0; ri--) {
          var lb = gItems[ri].querySelector(".grade-label");
          if (lb && fixos.indexOf(lb.innerText) === -1) { gItems[ri].parentNode.removeChild(gItems[ri]); }
        }
      }
      if (gradeHidden) gradeHidden.value = "";
      if (qtdInput) qtdInput.value = 0; if (qtdDisplay) qtdDisplay.innerText = "0";
      precoInput.value = ""; fotoBase64 = "";
      if (fileWrapper) fileWrapper.classList.remove("has-file");
      if (previewContainer) previewContainer.style.display = "none";
      if (thumbnailPreview) thumbnailPreview.src = "";
      var stEl = document.getElementById("formStatus");
      if (stEl) { stEl.innerText = "Material adicionado ao carrinho!"; stEl.style.color = "var(--green)"; setTimeout(function () { if (stEl) stEl.innerText = ""; }, 2000); }
    });
  }

  if (finalizarBtn) {
    finalizarBtn.addEventListener("click", function () {
      var cliente = document.getElementById("cliente").value.trim();
var telefone = document.getElementById("telefone").value.trim();
      var dataEntrega = document.getElementById("dataEntrega").value;
      var observacoes = document.getElementById("observacoes").value.trim();
      var erros = [];
      if (!cliente) erros.push("Cliente");
      if (!dataEntrega) erros.push("Data de Entrega");
      if (window.itensDoPedido.length === 0) erros.push("Adicione ao menos um material");
      if (erros.length > 0) {
        var stEl = document.getElementById("formStatus");
        if (stEl) { stEl.innerText = "Campos obrigatórios: " + erros.join(", ") + "."; stEl.style.color = "var(--red)"; }
        return;
      }
      var fp = fpSelect ? fpSelect.value : "pix";
      var fpLabel = fpSelect ? fpSelect.options[fpSelect.selectedIndex].text : "";

      // ============================================================
      // PASSO A: Soma apenas os itens do carrinho (sem material sendo digitado)
      var subTotal = 0;
      var qtdGeral = 0;
      for (var ci = 0; ci < window.itensDoPedido.length; ci++) {
        subTotal += window.itensDoPedido[ci].subtotal;
        qtdGeral += window.itensDoPedido[ci].quantidade;
      }
      subTotal = parseFloat(subTotal.toFixed(2));

      // PASSO B: Aplica desconto sobre o Valor Bruto
      var descR = parseFloat(descRInput.value) || 0;
      var descP = parseFloat(descPInput.value) || 0;
      var descRVal = descR;
      if (descP > 0 && descR <= 0) {
        descRVal = parseFloat((subTotal * (descP / 100)).toFixed(2));
      }
      var valorFinal = parseFloat(Math.max(0, subTotal - descRVal).toFixed(2));

      // PASSO C: Faltante = Valor Final - Entrada (mínimo 0)
      var entrada = parseFloat(entradaInput.value) || 0;
      if (entrada > valorFinal) entrada = valorFinal;
      entrada = parseFloat(entrada.toFixed(2));
      var faltante = parseFloat(Math.max(0, valorFinal - entrada).toFixed(2));
      var estaEditando = window.editandoIndice !== -1 && window.editandoIndice !== undefined;
      var pedidoExistente = estaEditando ? orders[window.editandoIndice] : null;

      var novoPedido = {
        id: pedidoExistente ? pedidoExistente.id : Date.now(),
        data: pedidoExistente ? pedidoExistente.data : new Date().toLocaleDateString("pt-BR"),
        cliente: cliente, telefone: telefone, dataEntrega: dataEntrega,
        materiais: JSON.parse(JSON.stringify(window.itensDoPedido)),
        descontoReais: descRVal, descontoPercent: descP,
        valorEntrada: entrada, formaPagamento: fp, formaPagamentoLabel: fpLabel,
        subtotal: subTotal, valorTotal: valorFinal, valorFaltante: faltante,
        quantidade: qtdGeral,
        observacoes: observacoes, status: pedidoExistente ? pedidoExistente.status : "pendente"
      };

      // Guarda backup para reverter em caso de falha ao salvar
      var backupPedidoAnterior = pedidoExistente ? JSON.parse(JSON.stringify(pedidoExistente)) : null;

      if (estaEditando && pedidoExistente) {
        // ATUALIZA o pedido já existente naquele índice em vez de criar um novo
        orders[window.editandoIndice] = novoPedido;
      } else {
        orders.unshift(novoPedido);
      }

      var salvouComSucesso = saveState();

      if (!salvouComSucesso) {
        // Reverte a alteração para não deixar o estado em memória divergente
        // do que está persistido no localStorage.
        if (estaEditando && backupPedidoAnterior) {
          orders[window.editandoIndice] = backupPedidoAnterior;
        } else {
          orders.shift();
        }
        var stElErro = document.getElementById("formStatus");
        if (stElErro) { stElErro.innerText = "Não foi possível salvar o pedido. Tente novamente."; stElErro.style.color = "var(--red)"; }
        return;
      }

      console.log("Pedido salvo com sucesso!");

      // Reseta o modo de edição após salvar com sucesso
      window.editandoIndice = -1;
      var indicatorEl = document.getElementById("editingIndicator");
      if (indicatorEl) indicatorEl.setAttribute("hidden", "");
      var btnLabelEl = document.getElementById("btnFinalizarLabel");
      if (btnLabelEl) btnLabelEl.innerText = "✓ Finalizar e Salvar Venda";
      if (entryPanel) entryPanel.classList.remove("editing-mode");

      // Limpeza completa pós-venda (reseta carrinho e tabela temporária apenas
      // apos confirmar que o salvamento no localStorage foi concluido)
      form.reset();
      window.itensDoPedido = [];

      // Limpa grade de tamanhos
      var allGradeQty = document.querySelectorAll(".grade-qty");
      for (var rgi = 0; rgi < allGradeQty.length; rgi++) { allGradeQty[rgi].value = ""; }
      if (gradeInputs) {
        var gradeItems = gradeInputs.querySelectorAll(".grade-item");
        var fixos = ["PP","P","M","G","GG","XG","XXG","XXXG"];
        for (var ri = gradeItems.length - 1; ri >= 0; ri--) {
          var lb = gradeItems[ri].querySelector(".grade-label");
          if (lb && fixos.indexOf(lb.innerText) === -1) { gradeItems[ri].parentNode.removeChild(gradeItems[ri]); }
        }
      }
      if (gradeHidden) gradeHidden.value = "";
      if (qtdInput) qtdInput.value = 0;
      if (qtdDisplay) qtdDisplay.innerText = "0";
      if (precoInput) precoInput.value = "";
      if (descRInput) descRInput.value = "";
      if (descPInput) descPInput.value = "";
      if (entradaInput) entradaInput.value = "";
      if (fotoInput) { fotoInput.value = ""; }
      fotoBase64 = "";
      if (fileWrapper) fileWrapper.classList.remove("has-file");
      if (previewContainer) previewContainer.style.display = "none";
      if (thumbnailPreview) thumbnailPreview.src = "";

      // Limpa visualmente a tabela temporária do carrinho
      renderCartTable();

      // Esconde formulário e mostra a tabela de pedidos
      if (entryPanel && !entryPanel.hasAttribute("hidden")) {
        entryPanel.setAttribute("hidden", "");
      }

      recalcularTotais(); renderAll();
      var stEl = document.getElementById("formStatus");
      if (stEl) { stEl.innerText = "Pedido registrado com sucesso!"; stEl.style.color = "var(--green)"; setTimeout(function () { if (stEl) stEl.innerText = ""; }, 3000); }
    });
  }
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

  var sLabel = { "pendente": "Aguardando Aprovacao", "aprovado": "Aprovado", "em-producao": "Em producao", "concluida": "Concluida" };
  var sClass = { "pendente": "status-pendente", "aprovado": "status-pendente", "em-producao": "status-producao", "concluida": "status-concluido" };

  // Mapa de labels para forma de pagamento
  var pagLabels = {
    "pix": "PIX",
    "avista": "À Vista",
    "debito-credito": "Débito/Crédito",
    "faturado": "Faturado 15/30 dias"
  };

  var html = "";
  for (var i = 0; i < orders.length; i++) {
    var o = orders[i];
    // Suporta formato multi-materiais (novo) e legado (antigo)
    var primeiroMaterial = (o.materiais && o.materiais.length > 0) ? o.materiais[0] : null;
    var modeloExibir = primeiroMaterial ? primeiroMaterial.modelo : (o.modelo || "—");
    var corExibir = primeiroMaterial ? primeiroMaterial.cor : (o.cor || "—");
    var gradeObj = primeiroMaterial ? primeiroMaterial.grade : (o.grade || {});
    var fotoExibir = primeiroMaterial ? (primeiroMaterial.fotoBase64 || "") : (o.fotoBase64 || "");
    var qtdTotal = o.quantidade || 0;
    if (o.materiais) {
      qtdTotal = 0;
      for (var mi = 0; mi < o.materiais.length; mi++) { qtdTotal += o.materiais[mi].quantidade; }
    }

    // Grade string
    var gradeStr = "";
    if (typeof gradeObj === "object" && gradeObj !== null) {
      var parts = [];
      for (var gk in gradeObj) { if (gradeObj.hasOwnProperty(gk)) parts.push(gk + ":" + gradeObj[gk]); }
      gradeStr = parts.join(", ");
    } else { gradeStr = gradeObj || "—"; }

    var descValor = o.descontoReais || 0;
    var descExibir = descValor > 0 ? "R$ " + descValor.toFixed(2).replace(".", ",") : "—";
    var fpExibir = o.formaPagamentoLabel || o.formaPagamento || "—";
    var faltaExibir = o.valorFaltante !== undefined && o.valorFaltante > 0
      ? "R$ " + o.valorFaltante.toFixed(2).replace(".", ",")
      : (o.valorEntrada > 0 && o.valorEntrada >= o.valorTotal ? "✅ Liquidado" : "—");
    html += "<tr>";
    html += "<td><strong>" + esc(o.cliente) + "</strong></td>";
    html += "<td>" + esc(modeloExibir) + "</td>";
    html += "<td>" + esc(corExibir) + "</td>";
    html += "<td>" + esc(gradeStr) + "</td>";
    html += "<td>" + qtdTotal + "</td>";
    html += "<td>R$ " + (primeiroMaterial ? primeiroMaterial.precoUnitario.toFixed(2).replace(".", ",") : o.precoUnitario.toFixed(2).replace(".", ",")) + "</td>";
    html += "<td>" + descExibir + "</td>";
    html += '<td class="align-right"><strong>R$ ' + o.valorTotal.toFixed(2).replace(".", ",") + "</strong></td>";
    html += "<td>" + esc(fpExibir) + "</td>";
    html += "<td>" + faltaExibir + "</td>";
    html += "<td>";
    if (fotoExibir && fotoExibir.length > 50) {
      html += '<img class="thumb-preview" src="' + fotoExibir + '" alt="Foto do pedido">';
    } else {
      html += '<span class="thumb-empty">📷</span>';
    }
    html += "</td>";
    html += '<td><span class="status-badge ' + (sClass[o.status] || "status-pendente") + '">' + (sLabel[o.status] || o.status) + "</span></td>";
    html += '<td class="action-buttons">';
    html += '<button class="stock-adjust-btn" onclick="prepararEdicao(' + i + ')" title="Editar pedido">✎</button>';
    html += '<button class="stock-adjust-btn" onclick="imprimirViaCliente(' + o.id + ')" title="Imprimir Via do Cliente">🖨️</button>';
    html += '<button class="stock-adjust-btn" onclick="deleteOrder(' + o.id + ')" title="Excluir">✕</button>';
    html += "</td></tr>";
  }
  tbody.innerHTML = html;
}

// Variável global para o gráfico Chart.js
var faturamentoChart = null;

// ============================================================
// Alterar status de um pedido (usado na tabela de produção)
// ============================================================
function changeOrderStatus(orderId, novoStatus) {
  for (var i = 0; i < orders.length; i++) {
    if (orders[i].id === orderId) {
      orders[i].status = novoStatus;
      saveState();
      renderAll();
      break;
    }
  }
}

// ============================================================
// Gráfico de Faturamento Diário (Chart.js)
// ============================================================
function renderFaturamentoChart() {
  var canvas = document.getElementById("graficoFaturamentoDiario");
  var empty = document.getElementById("dailyRevenueEmpty");
  if (!canvas) return;

  var agora = new Date();
  var mesAtual = agora.getMonth();
  var anoAtual = agora.getFullYear();
  var diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
  var nomeMes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][mesAtual];
  var monthLabel = document.getElementById("dailyRevenueMonthLabel");
  if (monthLabel) monthLabel.innerText = nomeMes + " de " + anoAtual;

  // Agrupa vendas por dia
  var faturamentoPorDia = {};
  for (var i = 0; i < orders.length; i++) {
    var o = orders[i];
    var partes = o.data.split("/");
    if (partes.length !== 3) continue;
    var dia = parseInt(partes[0], 10);
    var mes = parseInt(partes[1], 10) - 1;
    var ano = parseInt(partes[2], 10);
    if (mes === mesAtual && ano === anoAtual) {
      if (!faturamentoPorDia[dia]) faturamentoPorDia[dia] = 0;
      faturamentoPorDia[dia] += o.valorTotal;
    }
  }

  var temVendas = Object.keys(faturamentoPorDia).length > 0;
  if (empty) {
    if (temVendas) empty.setAttribute("hidden", "");
    else empty.removeAttribute("hidden");
  }
  if (!temVendas) {
    if (faturamentoChart) { faturamentoChart.destroy(); faturamentoChart = null; }
    return;
  }

  // Monta arrays para o chart
  var labels = [];
  var valores = [];
  for (var d = 1; d <= diasNoMes; d++) {
    labels.push(d);
    valores.push(faturamentoPorDia[d] || 0);
  }

  // Destrói chart anterior
  if (faturamentoChart) { faturamentoChart.destroy(); faturamentoChart = null; }

  var isLight = document.body.classList.contains("light-mode");
  var corLinha = isLight ? "#0d9488" : "#5eead4";
  var corPonto = isLight ? "#0f766e" : "#ccfbf1";
  var corGrid = isLight ? "#e2e8f0" : "#334155";
  var corTexto = isLight ? "#64748b" : "#94a3b8";

  var ctx = canvas.getContext("2d");
  faturamentoChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Faturamento (R$)",
        data: valores,
        borderColor: corLinha,
        backgroundColor: corLinha + "20",
        borderWidth: 3,
        pointBackgroundColor: corPonto,
        pointBorderColor: corLinha,
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 7,
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isLight ? "#ffffff" : "#1e293b",
          titleColor: isLight ? "#1e293b" : "#f8fafc",
          bodyColor: isLight ? "#1e293b" : "#f8fafc",
          borderColor: corGrid,
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: function(context) {
              return "R$ " + context.parsed.y.toFixed(2).replace(".", ",");
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: "Dia do mês", color: corTexto, font: { size: 11 } },
          ticks: { color: corTexto, font: { size: 10 }, stepSize: 1 },
          grid: { color: corGrid }
        },
        y: {
          title: { display: true, text: "Valor (R$)", color: corTexto, font: { size: 11 } },
          ticks: { color: corTexto, font: { size: 10 }, callback: function(v) { return "R$ " + v.toFixed(0); } },
          grid: { color: corGrid },
          beginAtZero: true
        }
      }
    }
  });
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

  var sOpts = ["pendente", "aprovado", "em-producao", "concluida"];

  var html = "";
  for (var i = 0; i < filtered.length; i++) {
    var o = filtered[i];
    var obs = o.observacoes || "—";
    var classeStatus = o.status === "concluida" ? ' class="status-row-concluido"' : "";
    html += "<tr" + classeStatus + ">";
    html += "<td><strong>" + esc(o.cliente) + "</strong></td>";
    var modeloP = (o.materiais && o.materiais.length > 0) ? o.materiais[0].modelo : (o.modelo || "—");
    var corP = (o.materiais && o.materiais.length > 0) ? o.materiais[0].cor : (o.cor || "—");
    html += "<td>" + esc(modeloP) + "</td>";
    html += "<td>" + esc(corP) + "</td>";
    html += "<td>" + esc(obs) + "</td>";
    // Soma quantidade de todos os materiais (compatível com multi-materiais e legado)
    var qtdTotalProd = 0;
    if (o.materiais && o.materiais.length > 0) {
      for (var mi = 0; mi < o.materiais.length; mi++) { qtdTotalProd += o.materiais[mi].quantidade; }
    } else {
      qtdTotalProd = o.quantidade || 0;
    }
    html += "<td>" + qtdTotalProd + "</td>";
    html += "<td>";
    html += '<select class="status-select" onchange="changeOrderStatus(' + o.id + ',this.value)">';
    for (var si = 0; si < sOpts.length; si++) {
      var label = { "pendente":"Aguardando Aprovacao", "aprovado":"Aprovado", "em-producao":"Em Producao", "concluida":"Concluido" };
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
  var aprovados = 0, recusados = 0, emProducao = 0, concluidos = 0, aguardando = 0;
  var pecasAguardando = 0, pecasAprovados = 0, pecasEmProducao = 0;

  for (var i = 0; i < orders.length; i++) {
    var o = orders[i];
    totalFaturamento += o.valorTotal;
    var qtdPecas = 0;
    if (o.materiais && o.materiais.length > 0) {
      for (var mi = 0; mi < o.materiais.length; mi++) { qtdPecas += o.materiais[mi].quantidade; }
    } else {
      qtdPecas = o.quantidade || 0;
    }
    totalPecas += qtdPecas;
    if (o.status === "pendente") { aguardando++; pecasAguardando += qtdPecas; }
    else if (o.status === "aprovado") { aprovados++; pecasAprovados += qtdPecas; }
    else if (o.status === "recusado") recusados++;
    else if (o.status === "em-producao") { emProducao++; pecasEmProducao += qtdPecas; }
    else if (o.status === "concluida") { concluidos++; concluidasPecas += qtdPecas; }
  }

  // ============================================================
  // Cards destacados do Dashboard - Produção
  // ============================================================
  var el = document.getElementById("dashAguardando");
  if (el) el.innerText = "" + pecasAguardando;
  el = document.getElementById("dashAprovados");
  if (el) el.innerText = "" + pecasAprovados;
  el = document.getElementById("dashEmProducao");
  if (el) el.innerText = "" + pecasEmProducao;
  el = document.getElementById("dashConcluidos");
  if (el) el.innerText = "" + concluidasPecas;
  el = document.getElementById("dashFaturamentoTotal");
  if (el) el.innerText = "R$ " + totalFaturamento.toFixed(2).replace(".", ",");

  // Progresso de Produção
  var total = orders.length;
  var pctAprov = total > 0 ? (aprovados / total * 100) : 0;
  var pctProd = total > 0 ? (emProducao / total * 100) : 0;
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

  // Faturamento Diário do Mês (gráfico Chart.js)
  renderFaturamentoChart();
}

// ============================================================
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
// ============================================================
// Helper robusto de impressão em janela temporária (pop-up).
// Garante que:
//  1) window.print() só é chamado depois que o HTML e as imagens
//     (fotos em Base64) estiverem 100% carregados na janela (onload).
//  2) a janela só se fecha depois que o usuário concluir ou cancelar
//     o diálogo de impressão (evento "afterprint"), com um timeout de
//     segurança para não deixar a janela aberta indefinidamente caso
//     o navegador não dispare o evento.
// ============================================================
function imprimirEmJanela(htmlCompleto, mensagemSemPopup) {
  var pw = window.open("", "_blank", "width=800,height=600");
  if (!pw) { alert(mensagemSemPopup); return null; }

  var d = pw.document;
  d.open();
  d.write(htmlCompleto);
  d.close();

  // Dispara window.print() somente após o "load" da janela (HTML + imagens
  // Base64 100% renderizados). Alguns navegadores já disparam "load" antes
  // das <img> decodificarem; por isso tambem aguardamos todas as imagens
  // via img.decode()/onload como reforço.
  function dispararImpressao() {
    var imgs = pw.document.images;
    var pendentes = 0;
    var jaImprimiu = false;

    function tentarImprimir() {
      if (jaImprimiu || pw.closed) return;
      jaImprimiu = true;
      pw.focus();
      pw.print();
    }

    for (var i = 0; i < imgs.length; i++) {
      if (!imgs[i].complete) pendentes++;
    }

    if (pendentes === 0) {
      tentarImprimir();
    } else {
      var restantes = pendentes;
      for (var j = 0; j < imgs.length; j++) {
        if (!imgs[j].complete) {
          imgs[j].addEventListener("load", function () { restantes--; if (restantes <= 0) tentarImprimir(); });
          imgs[j].addEventListener("error", function () { restantes--; if (restantes <= 0) tentarImprimir(); });
        }
      }
      // Timeout de segurança: se alguma imagem nunca carregar/disparar
      // evento, imprime mesmo assim apos 3s para nao travar o usuario.
      setTimeout(tentarImprimir, 3000);
    }
  }

  if (pw.document.readyState === "complete") {
    dispararImpressao();
  } else {
    pw.addEventListener("load", dispararImpressao);
  }

  // Fecha a janela somente apos a conclusao (ou cancelamento) do dialogo
  // de impressao, disparado pelo evento nativo "afterprint". Um timeout
  // de seguranca fecha a janela mesmo se o evento nao disparar.
  pw.addEventListener("afterprint", function () { if (!pw.closed) pw.close(); });
  setTimeout(function () { if (!pw.closed) pw.close(); }, 60000);

  return pw;
}

function imprimirFicha(orderId) {
  var order = null;
  for (var i = 0; i < orders.length; i++) {
    if (orders[i].id === orderId) { order = orders[i]; break; }
  }
  if (!order) return;

  var materiais = (order.materiais && order.materiais.length > 0) ? order.materiais : null;

  if (!materiais) {
    materiais = [{
      modelo: order.modelo || "—",
      cor: order.cor || "—",
      grade: order.grade || {},
      fotoBase64: order.fotoBase64 || "",
      quantidade: order.quantidade || 0,
      precoUnitario: order.precoUnitario || 0
    }];
  }

  function buildGradeRows(gradeObj) {
    var rows = "";
    if (typeof gradeObj === "object" && gradeObj !== null) {
      var chaves = Object.keys(gradeObj);
      if (chaves.length > 0) {
        for (var gk = 0; gk < chaves.length; gk++) {
          var tam = chaves[gk];
          var qtd = gradeObj[tam];
          if (qtd > 0) {
            rows += "<tr><td>" + esc(tam) + "</td><td class=\"qtd\">" + qtd + "</td></tr>";
          }
        }
      } else {
        rows = "<tr><td colspan=\"2\">Nenhum cadastrado</td></tr>";
      }
    } else {
      var grades = String(gradeObj).split(",");
      for (var g = 0; g < grades.length; g++) {
        var parts = grades[g].trim().split(":");
        rows += "<tr><td>" + esc(parts[0] || "—") + "</td><td class=\"qtd\">" + (parts[1] || "0") + "</td></tr>";
      }
    }
    return rows;
  }

  function buildFotoHtml(fotoBase64) {
    if (fotoBase64 && fotoBase64.length > 50) {
      return '<div class="container-foto"><img src="' + fotoBase64 + '" alt="Foto da peça"></div>';
    }
    return '<div class="container-foto vazio"><span>📷 Sem foto anexada</span></div>';
  }

  var obsHtml = "";
  if (order.observacoes) {
    obsHtml = '<div class="obs-box"><strong>📝 Observações Técnicas</strong><p>' + esc(order.observacoes) + "</p></div>";
  }

  var dataEntrega = order.dataEntrega || "—";
  if (dataEntrega !== "—") {
    var partes = dataEntrega.split("-");
    if (partes.length === 3) dataEntrega = partes[2] + "/" + partes[1] + "/" + partes[0];
  }
var d = pw.document;
  d.write("<!DOCTYPE html><html lang=\"pt-BR\"><head><meta charset=\"UTF-8\">");
  d.write("<title>Ficha - " + esc(order.cliente) + "</title><style>");
  d.write("@page{size:A4;margin:15mm;}");
  d.write("*{margin:0;padding:0;box-sizing:border-box;}");
  d.write("body{font-family:Arial,Helvetica,sans-serif;font-size:14px;padding:0;color:#000;background:#fff;}");
  d.write(".no-print{text-align:right;margin-bottom:8px;}");
  d.write(".no-print button{padding:8px 20px;border:none;border-radius:6px;cursor:pointer;font-size:13px;margin-left:8px;}");
  d.write(".btn-print{background:#0d9488;color:#fff;}");
  d.write(".btn-close{background:#e2e8f0;color:#1e293b;}");
  d.write(".ficha-container{display:flex;flex-direction:column;height:100vh;justify-content:space-between;page-break-inside:avoid;}");
  d.write(".header{text-align:center;border-bottom:3px solid #0d9488;padding-bottom:10px;margin-bottom:10px;}");
  d.write(".header h1{font-size:20px;color:#0d9488;letter-spacing:1px;text-transform:uppercase;}");
  d.write(".header .sub{font-size:11px;color:#64748b;margin-top:2px;}");
  d.write(".info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;margin-bottom:6px;}");
  d.write(".info-item{padding:4px 0;border-bottom:1px solid #e2e8f0;}");
  d.write(".info-item .label{font-size:10px;text-transform:uppercase;color:#64748b;font-weight:700;letter-spacing:0.5px;}");
  d.write(".info-item .value{font-size:15px;font-weight:700;margin-top:1px;color:#000;}");
  d.write(".container-foto{width:100%;display:flex;justify-content:center;align-items:center;overflow:hidden;border:1px solid #e2e8f0;border-radius:6px;background:#fafafa;margin:12px 0;padding:12px;}");
  d.write(".container-foto img{max-width:100%;height:auto;object-fit:contain;display:block;margin:0 auto;}");
  d.write(".container-foto.vazio{padding:20px;font-size:13px;color:#94a3b8;border:2px dashed #e2e8f0;}");
  d.write(".material-block{page-break-inside:avoid;break-inside:avoid;margin-bottom:16px;}");
d.write(".grade-table{width:100%;border-collapse:collapse;margin:6px 0 4px;}");
  d.write(".grade-table th{background:#f1f5f9;padding:6px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#475569;border:1px solid #cbd5e1;}");
  d.write(".grade-table td{padding:6px 10px;border:1px solid #cbd5e1;font-size:14px;page-break-inside:avoid;}");
  d.write(".grade-table td.qtd{font-weight:700;text-align:center;font-size:16px;}");
  d.write(".grade-title{font-size:12px;text-transform:uppercase;color:#475569;font-weight:700;margin-top:6px;margin-bottom:2px;}");
  d.write(".grade-table th{background:#f1f5f9;padding:6px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#475569;border:1px solid #cbd5e1;}");
  d.write(".grade-table td{padding:6px 10px;border:1px solid #cbd5e1;font-size:14px;page-break-inside:avoid;}");
  d.write(".material-divider{border-top:2px dashed #cbd5e1;margin:16px 0;page-break-after:always;}");
  d.write(".grade-title{font-size:12px;text-transform:uppercase;color:#475569;font-weight:700;margin-top:6px;margin-bottom:2px;}");
  d.write(".obs-box{margin-top:6px;padding:8px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;overflow:hidden;}");
  d.write(".obs-box strong{font-size:11px;text-transform:uppercase;color:#475569;}");
  d.write(".obs-box p{margin-top:2px;font-size:13px;color:#000;}");
  d.write("@media print{");
  d.write("body{color:#000!important;background:#fff!important;}");
  d.write(".no-print{display:none!important;}");
  d.write(".ficha-container{height:auto;min-height:100vh;}");
  d.write(".material-block{page-break-inside:avoid!important;break-inside:avoid!important;}");
  d.write(".material-divider{page-break-after:always!important;}");
  d.write(".container-foto img{max-height:180px!important;max-width:100%!important;height:auto!important;object-fit:contain!important;}");
  d.write(".info-item .value{color:#000!important;}");
  d.write(".grade-table td{color:#000!important;}");
  d.write(".header h1{color:#0d9488!important;}");
  d.write(".obs-box p{color:#000!important;}");
  d.write("}");
  d.write("</style></head>" + "<body>");
  d.write("<div class=\"no-print\"><button class=\"btn-print\" onclick=\"window.print()\">🖨️ Imprimir</button><button class=\"btn-close\" onclick=\"window.close()\">✕ Fechar</button></div>");
  d.write("<div class=\"ficha-container\">");
  d.write("<div class=\"header\"><h1>🧵 FICHA DE PRODUÇÃO — MALHARIA</h1><p class=\"sub\">Pedido #" + order.id + " — Cadastrado em " + order.data + " — Entrega: " + esc(dataEntrega) + "</p></div>");
  d.write("<div class=\"info-grid\">");
  d.write("<div class=\"info-item\"><div class=\"label\">Cliente</div><div class=\"value\">" + esc(order.cliente) + "</div></div>");
  d.write("<div class=\"info-item\"><div class=\"label\">Telefone</div><div class=\"value\">" + esc(order.telefone || "—") + "</div></div>");
  d.write("<div class=\"info-item\"><div class=\"label\">Status</div><div class=\"value\">" + (order.status === "pendente" ? "Aguardando Aprovacao" : order.status === "aprovado" ? "Aprovado" : order.status === "em-producao" ? "Em Producao" : order.status === "concluida" ? "Concluido" : order.status) + "</div></div>");
  d.write("</div>");
  for (var mi = 0; mi < materiais.length; mi++) {
    var mat = materiais[mi];
    if (mi > 0) { d.write("<div class=\"material-divider\"></div>"); }
    d.write("<div class=\"material-block\">");
    d.write("<div class=\"info-grid\" style=\"margin-bottom:4px;\">");
    d.write("<div class=\"info-item\"><div class=\"label\">Descricao do Material</div><div class=\"value\">" + esc(mat.modelo || "—") + "</div></div>");
    d.write("<div class=\"info-item\"><div class=\"label\">Cor da Malha</div><div class=\"value\">" + esc(mat.cor || "—") + "</div></div>");
    d.write("</div>");
    d.write(buildFotoHtml(mat.fotoBase64));
    d.write("<div class=\"grade-title\">📐 Grade de Tamanhos</div>");
    d.write("<table class=\"grade-table\"><thead><tr><th>Tamanho</th><th>Pecas</th></tr></thead><tbody>" + buildGradeRows(mat.grade) + "</tbody></table>");
    d.write("</div>");
  }
  d.write(obsHtml);
  d.write("<div class=\"rodape\">Ficha de Producao — Gestao da Malharia<br>Gerada em " + new Date().toLocaleString("pt-BR") + "</div>");
  d.write("</div></body></html>");
  d.close();

  var ficou = setInterval(function () {
    if (pw.closed) { clearInterval(ficou); return; }
    try {
      pw.document.addEventListener("afterprint", function () { pw.close(); });
      setTimeout(function () { if (!pw.closed) pw.close(); }, 30000);
// ============================================================
// VIA DO CLIENTE
// ============================================================
function imprimirViaCliente(orderId) {
  var order = null;
  for (var i = 0; i < orders.length; i++) {
    if (orders[i].id === orderId) { order = orders[i]; break; }
  }
  if (!order) return;

  var pw = window.open("", "_blank", "width=800,height=600");
  if (!pw) { alert("Permita pop-ups para imprimir a via."); return; }

  var primeiro = (order.materiais && order.materiais.length > 0) ? order.materiais[0] : null;
  var modelo = primeiro ? primeiro.modelo : (order.modelo || "—");
  var cor = primeiro ? primeiro.cor : (order.cor || "—");
  var foto = primeiro ? (primeiro.fotoBase64 || "") : (order.fotoBase64 || "");
  var preco = primeiro ? primeiro.precoUnitario : (order.precoUnitario || 0);

  var gradeObj = primeiro ? primeiro.grade : (order.grade || {});
  var gradeRows = "";
  if (typeof gradeObj === "object" && gradeObj !== null) {
    var chaves = Object.keys(gradeObj);
    if (chaves.length > 0) {
      for (var gk = 0; gk < chaves.length; gk++) {
        var tam = chaves[gk];
        var qtd = gradeObj[tam];
        if (qtd > 0) gradeRows += "<tr><td>" + esc(tam) + "</td><td class=\"qtd\">" + qtd + "</td></tr>";
      }
    }
  } else {
    var grades = String(gradeObj).split(",");
var d = pw.document;
  d.write("<!DOCTYPE html><html lang=\"pt-BR\"><head><meta charset=\"UTF-8\">");
  d.write("<title>Via do Cliente - " + esc(order.cliente) + "</title><style>");
  d.write("*{margin:0;padding:0;box-sizing:border-box;}");
  d.write("body{font-family:Arial,Helvetica,sans-serif;font-size:14px;padding:32px;color:#000;background:#fff;}");
  d.write(".no-print{text-align:right;margin-bottom:16px;}");
  d.write(".no-print button{padding:8px 20px;border:none;border-radius:6px;cursor:pointer;font-size:13px;margin-left:8px;}");
  d.write(".btn-print{background:#0d9488;color:#fff;}");
  d.write(".btn-close{background:#e2e8f0;color:#1e293b;}");
  d.write(".header{text-align:center;border-bottom:3px solid #0d9488;padding-bottom:14px;margin-bottom:20px;}");
  d.write(".header h1{font-size:22px;color:#0d9488;letter-spacing:1px;text-transform:uppercase;}");
  d.write(".header .sub{font-size:12px;color:#64748b;margin-top:4px;}");
  d.write(".info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 20px;margin-bottom:8px;}");
  d.write(".info-item{padding:6px 0;border-bottom:1px solid #e2e8f0;}");
  d.write(".info-item .label{font-size:10px;text-transform:uppercase;color:#64748b;font-weight:700;letter-spacing:0.5px;}");
  d.write(".info-item .value{font-size:16px;font-weight:700;margin-top:1px;color:#000;}");
  d.write(".foto-wrapper{text-align:center;margin:16px 0;padding:8px;}");
  d.write(".foto-wrapper img{max-width:300px;height:auto;border-radius:4px;border:1px solid #e2e8f0;}");
  d.write(".foto-wrapper.vazio{padding:30px;font-size:13px;color:#94a3b8;border:2px dashed #e2e8f0;}");
  d.write(".grade-table{width:100%;border-collapse:collapse;margin:12px 0 8px;}");
  d.write(".grade-table th{background:#f1f5f9;padding:10px 14px;text-align:left;font-size:12px;text-transform:uppercase;color:#475569;border:1px solid #cbd5e1;}");
  d.write(".grade-table td{padding:10px 14px;border:1px solid #cbd5e1;font-size:16px;}");
  d.write(".grade-table td.qtd{font-weight:700;text-align:center;font-size:18px;}");
  d.write(".grade-title{font-size:14px;text-transform:uppercase;color:#475569;font-weight:700;margin-top:16px;margin-bottom:4px;}");
  d.write(".fin-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:15px;}");
  d.write(".fin-row .fin-label{color:#64748b;}");
  d.write(".fin-row .fin-value{font-weight:700;color:#000;}");
  d.write(".fin-row.total{background:#f0fdfa;padding:14px 12px;border:2px solid #0d9488;border-radius:6px;margin-top:8px;}");
  d.write(".fin-row.total .fin-value{font-size:20px;color:#0f766e;}");
  d.write(".fin-section{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px;margin:16px 0;}");
  d.write(".fin-section h3{font-size:13px;text-transform:uppercase;color:#475569;margin-bottom:10px;}");
  d.write(".obs-box{margin-top:16px;padding:16px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;}");
  d.write(".obs-box strong{font-size:12px;text-transform:uppercase;color:#475569;}");
  d.write(".obs-box p{margin-top:6px;font-size:15px;color:#000;}");
  d.write(".assinatura{text-align:center;margin-top:32px;padding-top:20px;border-top:2px solid #000;font-size:11px;color:#000;}");
  d.write("@media print{");
  d.write("@page{margin:15mm;}");
  d.write("body{padding:0;color:#000!important;background:#fff!important;}");
  d.write(".no-print{display:none!important;}");
  d.write(".fin-row .fin-value{color:#000!important;}");
  d.write(".fin-row.total .fin-value{color:#0f766e!important;}");
  d.write(".fin-row.total{background:#f0fdfa!important;border:2px solid #0d9488!important;}");
  d.write(".header h1{color:#0d9488!important;}");
  d.write(".info-item .value{color:#000!important;}");
  d.write(".grade-table td{color:#000!important;}");
  d.write(".obs-box p{color:#000!important;}");
  d.write(".assinatura{color:#000!important;}");
  d.write("}");
  d.write("</style></head><body>");
d.write('<div class="no-print"><button class="btn-print" onclick="window.print()">🖨️ Imprimir</button><button class="btn-close" onclick="window.close()">✕ Fechar</button></div>');
  d.write('<div class="header"><h1>🧵 VIA DO CLIENTE — APROVAÇÃO COMERCIAL</h1><p class="sub">Pedido #' + order.id + ' — ' + order.data + ' — Entrega: ' + esc(dataEntrega) + '</p></div>');
  d.write('<div class="info-grid">');
  d.write('<div class="info-item"><div class="label">Cliente</div><div class="value">' + esc(order.cliente) + "</div></div>");
  d.write('<div class="info-item"><div class="label">Telefone</div><div class="value">' + esc(order.telefone || "—") + "</div></div>");
  d.write('<div class="info-item"><div class="label">Descrição do Material</div><div class="value">' + esc(modelo) + "</div></div>");
  d.write('<div class="info-item"><div class="label">Cor</div><div class="value">' + esc(cor) + "</div></div>");
  d.write("</div>");
  d.write(fotoHtml);
  d.write('<div class="grade-title">📐 Grade de Tamanhos</div>');
  d.write('<table class="grade-table"><thead><tr><th>Tamanho</th><th>Peças</th></tr></thead><tbody>' + gradeRows + "</tbody></table>");
  d.write('<div class="fin-section"><h3>💰 Resumo Financeiro</h3>');
  d.write('<div class="fin-row"><span class="fin-label">Preço Unitário</span><span class="fin-value">R$ ' + preco.toFixed(2).replace(".", ",") + '</span></div>');
  d.write('<div class="fin-row"><span class="fin-label">Subtotal (itens)</span><span class="fin-value">R$ ' + order.subtotal.toFixed(2).replace(".", ",") + '</span></div>');
  if (order.descontoReais && order.descontoReais > 0) { d.write('<div class="fin-row"><span class="fin-label">Desconto</span><span class="fin-value">- R$ ' + order.descontoReais.toFixed(2).replace(".", ",") + '</span></div>'); }
  if (order.descontoPercent && order.descontoPercent > 0) { d.write('<div class="fin-row"><span class="fin-label">Desconto (%)</span><span class="fin-value">' + order.descontoPercent + '%</span></div>'); }
  d.write('<div class="fin-row total"><span class="fin-label">Valor Total Final</span><span class="fin-value">R$ ' + order.valorTotal.toFixed(2).replace(".", ",") + '</span></div>');
  d.write('<div class="fin-row"><span class="fin-label">Valor da Entrada</span><span class="fin-value">R$ ' + (order.valorEntrada || 0).toFixed(2).replace(".", ",") + '</span></div>');
  d.write('<div class="fin-row"><span class="fin-label">Forma de Pagamento</span><span class="fin-value">' + esc(fpLabel) + '</span></div>');
  d.write('<div class="fin-row"><span class="fin-label">Valor Faltante</span><span class="fin-value">R$ ' + (order.valorFaltante || 0).toFixed(2).replace(".", ",") + '</span></div>');
  d.write("</div>");
  d.write(obsHtml);
  d.write('<div class="assinatura">_________________________________<br><strong>Assinatura do Cliente</strong><br><br><em>Documento gerado em ' + new Date().toLocaleString("pt-BR") + '</em></div>');
  d.write("</body></html>");
  d.close();

  var ficou = setInterval(function () {
    if (pw.closed) { clearInterval(ficou); return; }
    try { pw.document.addEventListener("afterprint", function () { pw.close(); }); setTimeout(function () { if (!pw.closed) pw.close(); }, 30000); } catch (e) {}
  }, 200);
}
    for (var g = 0; g < grades.length; g++) {
      var parts = grades[g].trim().split(":");
      gradeRows += "<tr><td>" + esc(parts[0] || "—") + "</td><td class=\"qtd\">" + (parts[1] || "0") + "</td></tr>";
    }
  }

  var obsHtml = "";
  if (order.observacoes) { obsHtml = '<div class="obs-box"><strong>📝 Observações</strong><p>' + esc(order.observacoes) + "</p></div>"; }

  var fotoHtml = "";
  if (foto && foto.length > 50) { fotoHtml = '<div class="foto-wrapper"><img src="' + foto + '" alt="Foto"></div>'; }
  else { fotoHtml = '<div class="foto-wrapper vazio"><span>📷 Sem foto</span></div>'; }

  var dataEntrega = order.dataEntrega || "—";
  if (dataEntrega !== "—") { var partes = dataEntrega.split("-"); if (partes.length === 3) dataEntrega = partes[2] + "/" + partes[1] + "/" + partes[0]; }

  var pagLabels = { "pix":"PIX","avista":"À Vista","debito-credito":"Débito/Crédito","faturado":"Faturado 15/30 dias" };
  var fpLabel = pagLabels[order.formaPagamento] || order.formaPagamento || "—";
    } catch (e) {}
  }, 200);
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