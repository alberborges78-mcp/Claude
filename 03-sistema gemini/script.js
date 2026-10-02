// Base de Clientes (com endereço de cadastro)
let clientsDatabase = [
  {
    id: 1,
    name: "Silva Uniformes LTDA",
    phone: "(96) 98111-2233",
    doc: "12.345.678/0001-90",
    address: "Av. FAB, 1200 - Centro, Macapá - AP"
  },
  {
    id: 2,
    name: "Atlética Caótica - Engenharia",
    phone: "(96) 99122-3344",
    doc: "987.654.321-00",
    address: "Campus UNIFAP, Bloco de Exatas - Macapá - AP"
  }
];

// Banco em memória de Pedidos
let ordersDatabase = {};

let currentOrderNumber = "1042";
let selectedClient = null;
let discountType = "perc";

// Estado de Transporte
let transportState = {
  type: "balcao", // 'balcao' ou 'externo'
  carrier: "",
  tracking: "",
  cost: 0.0,
  address: "",
  isCustomAddress: false // Se está usando endereço manual diferente
};

// Estrutura de Produtos
let productsList = [
  {
    id: 1,
    desc: "Camiseta Meia Malha 30.1 Penteada",
    color: "Azul Marinho",
    sizes: [
      { name: "PP", qty: 0 },
      { name: "P", qty: 10 },
      { name: "M", qty: 25 },
      { name: "G", qty: 15 },
      { name: "GG", qty: 5 },
      { name: "XGG", qty: 2 }
    ],
    unitPrice: 38.0
  }
];

// Layouts de Estampa
let layoutsList = [
  {
    id: 1,
    title: "Estampa 1: Peito",
    notes: "Silk frente peito (10x8cm) em 2 cores",
    previewSrc: ""
  }
];

// Itens Avulsos
let extraItems = [
  { id: 1, desc: "Criação de Matriz de Silk Screen", qty: 2, price: 35.0 },
  { id: 2, desc: "Aplicação de bolso frontal", qty: 10, price: 5.0 }
];

// Formas de Pagamento
let paymentEntries = [
  { id: 1, method: "PIX", customMethod: "", amount: 600.0 },
  { id: 2, method: "Dinheiro", customMethod: "", amount: 400.0 }
];

document.addEventListener("DOMContentLoaded", () => {
  setupInitialDates();
  bindOrderSearchAndNew();
  bindStatusSelect();
  bindClientSearch();
  bindTransportRules();
  bindLayouts();
  bindProducts();
  bindExtraItems();
  bindPayments();
  bindDiscountToggles();
  bindDepositShortcuts();
  bindModalEvents();
  bindOrderActions();
  
  selectClient(clientsDatabase[0]);
  recalculateAll();
});

// 1. Datas Iniciais
function setupInitialDates() {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("orderDate").value = today;

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 18);
  document.getElementById("deliveryDate").value = targetDate.toISOString().split("T")[0];
}

// 2. Busca e Criação de Pedido
function bindOrderSearchAndNew() {
  const searchInput = document.getElementById("orderSearchInput");
  const btnSearch = document.getElementById("btnSearchOrder");
  const btnNew = document.getElementById("btnNewOrder");

  btnSearch.addEventListener("click", () => {
    const term = searchInput.value.trim().replace("#", "").replace("ORC-", "").replace("PED-", "");
    if (!term) {
      alert("Digite o número do pedido ou orçamento.");
      return;
    }

    if (ordersDatabase[term]) {
      loadOrder(ordersDatabase[term]);
      alert(`Pedido #${term} carregado com sucesso!`);
    } else {
      alert(`Pedido #${term} não encontrado na base local.`);
    }
  });

  btnNew.addEventListener("click", () => {
    if (confirm("Deseja limpar a tela e abrir um novo orçamento?")) {
      createNewOrder();
    }
  });
}

function loadOrder(orderData) {
  currentOrderNumber = orderData.orderNumber;
  document.getElementById("orderNumberDisplay").textContent = `#${orderData.status === "orcamento" ? "ORC" : "PED"}-${currentOrderNumber}`;
  document.getElementById("orderDate").value = orderData.orderDate;
  document.getElementById("deliveryDate").value = orderData.deliveryDate;
  
  const statusSelect = document.getElementById("statusSelect");
  statusSelect.value = orderData.status;
  updateStatusStyle(orderData.status);

  if (orderData.client) selectClient(orderData.client);

  transportState = Object.assign({ type: "balcao", carrier: "", tracking: "", cost: 0.0, address: "", isCustomAddress: false }, orderData.transport || {});
  applyTransportToUI();

  productsList = JSON.parse(JSON.stringify(orderData.products));
  layoutsList = JSON.parse(JSON.stringify(orderData.layouts));
  extraItems = JSON.parse(JSON.stringify(orderData.extras));
  paymentEntries = JSON.parse(JSON.stringify(orderData.payments || []));

  renderProducts();
  renderLayouts();
  renderExtraItems();
  renderPayments();

  discountType = orderData.discountType;
  document.getElementById("discountInput").value = orderData.discountVal;

  recalculateAll();
}

function createNewOrder() {
  const newNum = Math.floor(1000 + Math.random() * 9000).toString();
  currentOrderNumber = newNum;
  document.getElementById("orderNumberDisplay").textContent = `#ORC-${newNum}`;
  document.getElementById("orderSearchInput").value = "";

  setupInitialDates();

  const statusSelect = document.getElementById("statusSelect");
  statusSelect.value = "orcamento";
  updateStatusStyle("orcamento");

  selectedClient = null;
  document.getElementById("selectedClientCard").classList.add("hidden");
  document.getElementById("clientSearchInput").value = "";

  transportState = { type: "balcao", carrier: "", tracking: "", cost: 0.0, address: "", isCustomAddress: false };
  applyTransportToUI();

  productsList = [{
    id: Date.now(),
    desc: "Novo Modelo / Tecido",
    color: "Branco",
    sizes: [
      { name: "P", qty: 0 },
      { name: "M", qty: 0 },
      { name: "G", qty: 0 }
    ],
    unitPrice: 0.0
  }];

  layoutsList = [{
    id: Date.now(),
    title: "Estampa 1: Peito",
    notes: "",
    previewSrc: ""
  }];

  extraItems = [];
  paymentEntries = [{ id: Date.now(), method: "PIX", customMethod: "", amount: 0.0 }];

  renderProducts();
  renderLayouts();
  renderExtraItems();
  renderPayments();

  document.getElementById("discountInput").value = "0";
  recalculateAll();
}

// 3. Status
function bindStatusSelect() {
  const select = document.getElementById("statusSelect");
  select.addEventListener("change", (e) => {
    updateStatusStyle(e.target.value);
    handleStatusChange(e.target.value);
  });
}

function updateStatusStyle(val) {
  const select = document.getElementById("statusSelect");
  select.className = `status-dropdown status-${val}`;

  const numDisplay = document.getElementById("orderNumberDisplay");
  const prefix = val === "orcamento" ? "ORC" : "PED";
  numDisplay.textContent = `#${prefix}-${currentOrderNumber}`;
}

function handleStatusChange(status) {
  const tabArte = document.getElementById("tabArte");
  if (status === "pedido" || status === "arte") {
    tabArte.classList.remove("disabled");
    tabArte.title = "Acessar Módulo de Arte & Prova";
  } else {
    tabArte.classList.add("disabled");
  }
}

// 4. REGRAS DE TRANSPORTE & LOGÍSTICA (COM ENDEREÇO DO CLIENTE E CHECKBOX DIFERENTE)
function bindTransportRules() {
  const radios = document.querySelectorAll('input[name="transportType"]');
  const externalBlock = document.getElementById("externalShippingBlock");
  const costInput = document.getElementById("shippingCostInput");
  const carrierInput = document.getElementById("shippingCarrier");
  const trackingInput = document.getElementById("shippingTracking");
  const addressInput = document.getElementById("shippingAddress");
  const chkCustom = document.getElementById("chkCustomAddress");
  const addressHint = document.getElementById("shippingAddressHint");

  radios.forEach(radio => {
    radio.addEventListener("change", (e) => {
      transportState.type = e.target.value;
      if (e.target.value === "balcao") {
        externalBlock.classList.add("hidden");
        transportState.cost = 0.0;
        costInput.value = "0.00";
      } else {
        externalBlock.classList.remove("hidden");
        syncAddressWithClient();
      }
      recalculateAll();
    });
  });

  costInput.addEventListener("input", (e) => {
    transportState.cost = Number(e.target.value || 0);
    recalculateAll();
  });

  carrierInput.addEventListener("input", (e) => transportState.carrier = e.target.value);
  trackingInput.addEventListener("input", (e) => transportState.tracking = e.target.value);

  // Checkbox: Endereço Diferente
  chkCustom.addEventListener("change", (e) => {
    transportState.isCustomAddress = e.target.checked;
    if (e.target.checked) {
      addressInput.readOnly = false;
      addressInput.className = "input-editable";
      addressHint.textContent = "✏️ Digitação manual liberada para este pedido (não altera o cadastro).";
      addressInput.focus();
    } else {
      addressInput.readOnly = true;
      addressInput.className = "input-readonly";
      addressHint.textContent = "🔒 Puxado automaticamente do cadastro do cliente.";
      syncAddressWithClient();
    }
  });

  addressInput.addEventListener("input", (e) => {
    if (transportState.isCustomAddress) {
      transportState.address = e.target.value;
    }
  });
}

function syncAddressWithClient() {
  const addressInput = document.getElementById("shippingAddress");
  const chkCustom = document.getElementById("chkCustomAddress");

  if (!transportState.isCustomAddress) {
    if (selectedClient && selectedClient.address) {
      addressInput.value = selectedClient.address;
      transportState.address = selectedClient.address;
    } else {
      addressInput.value = "";
      transportState.address = "";
    }
    addressInput.readOnly = true;
    addressInput.className = "input-readonly";
    chkCustom.checked = false;
  }
}

function applyTransportToUI() {
  const radio = document.querySelector(`input[name="transportType"][value="${transportState.type}"]`);
  if (radio) radio.checked = true;

  const externalBlock = document.getElementById("externalShippingBlock");
  const costInput = document.getElementById("shippingCostInput");
  const chkCustom = document.getElementById("chkCustomAddress");
  const addressInput = document.getElementById("shippingAddress");
  const addressHint = document.getElementById("shippingAddressHint");

  if (transportState.type === "externo") {
    externalBlock.classList.remove("hidden");
    costInput.value = Number(transportState.cost || 0).toFixed(2);
    document.getElementById("shippingCarrier").value = transportState.carrier || "";
    document.getElementById("shippingTracking").value = transportState.tracking || "";
    
    chkCustom.checked = !!transportState.isCustomAddress;
    if (transportState.isCustomAddress) {
      addressInput.value = transportState.address || "";
      addressInput.readOnly = false;
      addressInput.className = "input-editable";
      addressHint.textContent = "✏️ Digitação manual liberada para este pedido (não altera o cadastro).";
    } else {
      addressInput.readOnly = true;
      addressInput.className = "input-readonly";
      addressHint.textContent = "🔒 Puxado automaticamente do cadastro do cliente.";
      syncAddressWithClient();
    }
  } else {
    externalBlock.classList.add("hidden");
    costInput.value = "0.00";
  }
}

// 5. Layouts
function bindLayouts() {
  renderLayouts();
  document.getElementById("btnAddLayoutItem").addEventListener("click", () => {
    layoutsList.push({
      id: Date.now(),
      title: `Estampa ${layoutsList.length + 1}: Nova Aplicação`,
      notes: "",
      previewSrc: ""
    });
    renderLayouts();
  });
}

function renderLayouts() {
  const container = document.getElementById("layoutsContainer");
  container.innerHTML = "";

  layoutsList.forEach((layout, index) => {
    const card = document.createElement("div");
    card.className = "layout-card";
    card.innerHTML = `
      <div class="layout-card-header">
        <input type="text" class="table-input font-bold" style="width: 260px;" value="${layout.title}" onchange="updateLayoutTitle(${index}, this.value)" />
        ${layoutsList.length > 1 ? `<button class="btn-link text-danger" onclick="removeLayoutItem(${index})">✕ Excluir Estampa</button>` : ""}
      </div>
      <div class="layout-grid">
        <div class="layout-upload">
          <label class="drop-zone" for="artFileInput_${index}">
            <span id="uploadText_${index}" class="${layout.previewSrc ? 'hidden' : ''}">📁 Selecionar Imagem</span>
            <input type="file" id="artFileInput_${index}" accept="image/*" class="hidden" onchange="handleLayoutFile(${index}, this)" />
            <img id="artPreview_${index}" src="${layout.previewSrc || ''}" class="art-preview-img ${layout.previewSrc ? '' : 'hidden'}" />
          </label>
        </div>
        <div class="layout-details">
          <div class="form-group">
            <label>Posição, Cores e Dimensões da Aplicação</label>
            <textarea rows="3" placeholder="Ex: Silk peito (10x8cm) em 2 cores" onchange="updateLayoutNotes(${index}, this.value)">${layout.notes}</textarea>
          </div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

window.updateLayoutTitle = (i, val) => layoutsList[i].title = val;
window.updateLayoutNotes = (i, val) => layoutsList[i].notes = val;
window.removeLayoutItem = (i) => {
  layoutsList.splice(i, 1);
  renderLayouts();
};
window.handleLayoutFile = (index, input) => {
  const file = input.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      layoutsList[index].previewSrc = e.target.result;
      renderLayouts();
    };
    reader.readAsDataURL(file);
  }
};

// 6. Produtos & Tamanhos Dinâmicos
function bindProducts() {
  renderProducts();
  document.getElementById("btnAddProduct").addEventListener("click", () => {
    productsList.push({
      id: Date.now(),
      desc: "Novo Produto / Modelo",
      color: "Preto",
      sizes: [
        { name: "P", qty: 0 },
        { name: "M", qty: 0 },
        { name: "G", qty: 0 }
      ],
      unitPrice: 0.0
    });
    renderProducts();
    recalculateAll();
  });
}

function renderProducts() {
  const container = document.getElementById("productsContainer");
  container.innerHTML = "";

  productsList.forEach((prod, pIdx) => {
    const totalPecas = prod.sizes.reduce((acc, s) => acc + (Number(s.qty) || 0), 0);
    const subtotal = totalPecas * (Number(prod.unitPrice) || 0);

    const box = document.createElement("div");
    box.className = "product-box";

    let sizeHeadersHTML = "";
    let sizeInputsHTML = "";

    prod.sizes.forEach((s, sIdx) => {
      sizeHeadersHTML += `
        <th class="size-header-cell">
          <input type="text" class="size-name-input" value="${s.name}" title="Editar nome do tamanho" onchange="updateSizeName(${pIdx}, ${sIdx}, this.value)" />
          ${prod.sizes.length > 1 ? `<span class="btn-remove-size" title="Remover tamanho" onclick="removeProductSize(${pIdx}, ${sIdx})">✕</span>` : ""}
        </th>
      `;

      sizeInputsHTML += `
        <td class="text-center">
          <input type="number" min="0" class="grade-qty" value="${s.qty}" oninput="updateSizeQty(${pIdx}, ${sIdx}, this.value)" />
        </td>
      `;
    });

    box.innerHTML = `
      <div class="product-box-header">
        <span>Item ${pIdx + 1}: Produto & Grade de Tamanhos</span>
        ${productsList.length > 1 ? `<button class="btn-link text-danger" onclick="removeProduct(${pIdx})">✕ Remover Produto</button>` : ""}
      </div>
      <div class="grade-table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th style="min-width: 180px;">Produto / Descrição Base</th>
              <th style="min-width: 120px;">Cor Tecido</th>
              ${sizeHeadersHTML}
              <th class="text-center" style="width: 70px;">
                <button type="button" class="btn-add-size" onclick="addProductSize(${pIdx})">+ Tam</button>
              </th>
              <th class="text-center" style="min-width: 70px;">Total Peças</th>
              <th style="min-width: 110px;">Preço Unit. (R$)</th>
              <th class="text-right" style="min-width: 110px;">Subtotal (R$)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><input type="text" class="table-input" value="${prod.desc}" onchange="updateProductField(${pIdx}, 'desc', this.value)" /></td>
              <td><input type="text" class="table-input" value="${prod.color}" onchange="updateProductField(${pIdx}, 'color', this.value)" /></td>
              ${sizeInputsHTML}
              <td class="text-center text-muted" style="font-size: 11px;">—</td>
              <td class="text-center font-bold" id="prodTotal_${pIdx}">${totalPecas}</td>
              <td><input type="number" step="0.01" min="0" class="table-input" value="${Number(prod.unitPrice).toFixed(2)}" oninput="updateUnitPrice(${pIdx}, this.value)" /></td>
              <td class="font-bold text-right" id="prodSubtotal_${pIdx}">R$ ${subtotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
    container.appendChild(box);
  });
}

window.addProductSize = (pIdx) => {
  const currentSizes = productsList[pIdx].sizes;
  const lastSize = currentSizes[currentSizes.length - 1];
  let nextName = "NOVO";
  
  const sizeMap = { "PP": "P", "P": "M", "M": "G", "G": "GG", "GG": "XGG", "XGG": "G1", "G1": "G2" };
  if (lastSize && sizeMap[lastSize.name.toUpperCase()]) {
    nextName = sizeMap[lastSize.name.toUpperCase()];
  }

  currentSizes.push({ name: nextName, qty: 0 });
  renderProducts();
  recalculateAll();
};

window.removeProductSize = (pIdx, sIdx) => {
  productsList[pIdx].sizes.splice(sIdx, 1);
  renderProducts();
  recalculateAll();
};

window.updateSizeName = (pIdx, sIdx, val) => {
  productsList[pIdx].sizes[sIdx].name = val.trim().toUpperCase() || "TAM";
};

window.updateSizeQty = (pIdx, sIdx, val) => {
  productsList[pIdx].sizes[sIdx].qty = Number(val || 0);
  recalculateAll();
};

window.updateProductField = (pIdx, field, val) => productsList[pIdx][field] = val;
window.updateUnitPrice = (pIdx, val) => {
  productsList[pIdx].unitPrice = Number(val || 0);
  recalculateAll();
};
window.removeProduct = (pIdx) => {
  productsList.splice(pIdx, 1);
  renderProducts();
  recalculateAll();
};

// 7. Itens Avulsos
function bindExtraItems() {
  renderExtraItems();
  document.getElementById("btnAddExtraItem").addEventListener("click", () => {
    extraItems.push({ id: Date.now(), desc: "Novo serviço / insumo avulso", qty: 1, price: 0.0 });
    renderExtraItems();
    recalculateAll();
  });
}

function renderExtraItems() {
  const tbody = document.getElementById("extraItemsBody");
  tbody.innerHTML = "";

  extraItems.forEach((item, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="text" class="table-input" value="${item.desc}" onchange="updateExtraDesc(${index}, this.value)" /></td>
      <td><input type="number" min="1" class="table-input text-center" value="${item.qty}" onchange="updateExtraQty(${index}, this.value)" /></td>
      <td><input type="number" step="0.01" min="0" class="table-input" value="${item.price.toFixed(2)}" onchange="updateExtraPrice(${index}, this.value)" /></td>
      <td class="text-right font-bold">R$ ${(item.qty * item.price).toFixed(2)}</td>
      <td class="text-center"><button class="btn-link text-danger" onclick="removeExtraItem(${index})">✕</button></td>
    `;
    tbody.appendChild(tr);
  });
}

window.updateExtraDesc = (i, val) => extraItems[i].desc = val;
window.updateExtraQty = (i, val) => { extraItems[i].qty = Number(val); renderExtraItems(); recalculateAll(); };
window.updateExtraPrice = (i, val) => { extraItems[i].price = Number(val); renderExtraItems(); recalculateAll(); };
window.removeExtraItem = (i) => { extraItems.splice(i, 1); renderExtraItems(); recalculateAll(); };

// 8. Formas de Pagamento
function bindPayments() {
  renderPayments();
  document.getElementById("btnAddPaymentRow").addEventListener("click", () => {
    paymentEntries.push({
      id: Date.now(),
      method: "PIX",
      customMethod: "",
      amount: 0.0
    });
    renderPayments();
    recalculateAll();
  });
}

function renderPayments() {
  const container = document.getElementById("paymentsListContainer");
  container.innerHTML = "";

  const standardOptions = ["PIX", "Dinheiro", "Cartão de Débito", "Cartão de Crédito", "Outro"];

  paymentEntries.forEach((entry, idx) => {
    const row = document.createElement("div");
    row.className = "payment-row";

    const isCustom = entry.method === "Outro";

    let optionsHTML = "";
    standardOptions.forEach(opt => {
      const label = opt === "Outro" ? "Outro (Digitar...)" : opt;
      optionsHTML += `<option value="${opt}" ${entry.method === opt ? "selected" : ""}>${label}</option>`;
    });

    row.innerHTML = `
      <select class="payment-select" onchange="updatePaymentMethod(${idx}, this.value)">
        ${optionsHTML}
      </select>

      ${isCustom ? `
        <input type="text" class="custom-method-input" placeholder="Digite a forma (ex: Cheque)" value="${entry.customMethod || ''}" oninput="updateCustomMethodName(${idx}, this.value)" />
      ` : ""}

      <input type="number" step="0.01" min="0" class="payment-amount-input" value="${entry.amount > 0 ? entry.amount.toFixed(2) : ''}" placeholder="0,00" oninput="updatePaymentAmount(${idx}, this.value)" />

      ${paymentEntries.length > 1 ? `<button type="button" class="btn-remove-pay" onclick="removePaymentRow(${idx})" title="Remover">✕</button>` : `<span></span>`}
    `;
    container.appendChild(row);
  });
}

window.updatePaymentMethod = (idx, val) => {
  paymentEntries[idx].method = val;
  if (val !== "Outro") {
    paymentEntries[idx].customMethod = "";
  }
  renderPayments();
  recalculateAll();
};

window.updateCustomMethodName = (idx, val) => {
  paymentEntries[idx].customMethod = val;
};

window.updatePaymentAmount = (idx, val) => {
  paymentEntries[idx].amount = Number(val || 0);
  recalculateAll();
};

window.removePaymentRow = (idx) => {
  paymentEntries.splice(idx, 1);
  renderPayments();
  recalculateAll();
};

// 9. Motor de Recálculo Financeiro Global
function recalculateAll() {
  let grandTotalPieces = 0;
  let productsTotalValue = 0;

  productsList.forEach((prod, pIdx) => {
    const pieces = prod.sizes.reduce((acc, s) => acc + (Number(s.qty) || 0), 0);
    const sub = pieces * (Number(prod.unitPrice) || 0);
    grandTotalPieces += pieces;
    productsTotalValue += sub;

    const lblTotal = document.getElementById(`prodTotal_${pIdx}`);
    const lblSub = document.getElementById(`prodSubtotal_${pIdx}`);
    if (lblTotal) lblTotal.textContent = pieces;
    if (lblSub) lblSub.textContent = formatBRL(sub);
  });

  document.getElementById("totalAllPiecesDisplay").textContent = grandTotalPieces;
  document.getElementById("finSubtotalProducts").textContent = formatBRL(productsTotalValue);

  const extrasSubtotal = extraItems.reduce((acc, curr) => acc + (curr.qty * curr.price), 0);
  document.getElementById("finSubtotalExtras").textContent = formatBRL(extrasSubtotal);

  const grossSubtotal = productsTotalValue + extrasSubtotal;
  document.getElementById("finSubtotalGross").textContent = formatBRL(grossSubtotal);

  const discRaw = Number(document.getElementById("discountInput").value || 0);
  let discVal = 0;
  if (discountType === "perc") {
    discVal = (grossSubtotal * (discRaw / 100));
    document.getElementById("discountEquivLabel").textContent = `(- ${formatBRL(discVal)})`;
  } else {
    discVal = Math.min(discRaw, grossSubtotal);
    const equivPerc = grossSubtotal > 0 ? (discVal / grossSubtotal) * 100 : 0;
    document.getElementById("discountEquivLabel").textContent = `(${equivPerc.toFixed(1)}%)`;
  }

  const shippingCost = transportState.type === "externo" ? Number(transportState.cost || 0) : 0;
  document.getElementById("finShippingCostDisplay").textContent = formatBRL(shippingCost);

  const totalLiquid = Math.max(0, grossSubtotal - discVal + shippingCost);
  document.getElementById("finTotalLiquid").textContent = formatBRL(totalLiquid);

  const totalDepositPaid = paymentEntries.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  document.getElementById("finTotalDepositPaid").textContent = formatBRL(totalDepositPaid);

  const remaining = Math.max(0, totalLiquid - totalDepositPaid);
  document.getElementById("finRemainingBalance").textContent = formatBRL(remaining);
}

// 10. Toggles de Desconto e Atalhos
function bindDiscountToggles() {
  const btnPerc = document.getElementById("btnDiscPerc");
  const btnVal = document.getElementById("btnDiscVal");
  const discInp = document.getElementById("discountInput");

  btnPerc.addEventListener("click", () => {
    discountType = "perc";
    btnPerc.classList.add("active");
    btnVal.classList.remove("active");
    discInp.value = "5";
    recalculateAll();
  });

  btnVal.addEventListener("click", () => {
    discountType = "val";
    btnVal.classList.add("active");
    btnPerc.classList.remove("active");
    discInp.value = "100";
    recalculateAll();
  });

  discInp.addEventListener("input", recalculateAll);
}

function bindDepositShortcuts() {
  document.getElementById("btnQuick50").addEventListener("click", () => {
    const total = parseBRL(document.getElementById("finTotalLiquid").textContent);
    if (paymentEntries.length === 0) {
      paymentEntries.push({ id: Date.now(), method: "PIX", customMethod: "", amount: 0 });
    }
    paymentEntries[0].amount = Number((total * 0.5).toFixed(2));
    renderPayments();
    recalculateAll();
  });

  document.getElementById("btnQuick100").addEventListener("click", () => {
    const total = parseBRL(document.getElementById("finTotalLiquid").textContent);
    if (paymentEntries.length === 0) {
      paymentEntries.push({ id: Date.now(), method: "PIX", customMethod: "", amount: 0 });
    }
    paymentEntries[0].amount = Number(total.toFixed(2));
    renderPayments();
    recalculateAll();
  });
}

// 11. Clientes e Busca
function bindClientSearch() {
  const input = document.getElementById("clientSearchInput");
  const list = document.getElementById("autocompleteList");

  input.addEventListener("input", (e) => {
    const val = e.target.value.toLowerCase().trim();
    list.innerHTML = "";
    if (val.length < 2) {
      list.classList.add("hidden");
      return;
    }

    const matches = clientsDatabase.filter(c => 
      c.name.toLowerCase().includes(val) || 
      c.phone.includes(val) || 
      c.doc.includes(val)
    );

    if (matches.length > 0) {
      list.classList.remove("hidden");
      matches.forEach(c => {
        const item = document.createElement("div");
        item.className = "autocomplete-item";
        item.innerHTML = `<strong>${c.name}</strong> <span>${c.phone}</span>`;
        item.addEventListener("click", () => selectClient(c));
        list.appendChild(item);
      });
    } else {
      list.classList.remove("hidden");
      const empty = document.createElement("div");
      empty.className = "autocomplete-item";
      empty.textContent = "Nenhum cliente encontrado. Clique em '+ Novo Cliente'";
      list.appendChild(empty);
    }
  });

  document.getElementById("btnClearClient").addEventListener("click", () => {
    selectedClient = null;
    document.getElementById("selectedClientCard").classList.add("hidden");
    document.getElementById("clientSearchInput").value = "";
    syncAddressWithClient();
  });
}

function selectClient(client) {
  selectedClient = client;
  document.getElementById("clientCardName").textContent = client.name;
  document.getElementById("clientCardDoc").textContent = client.doc;
  document.getElementById("clientCardPhone").textContent = client.phone;
  document.getElementById("clientCardAddress").textContent = client.address || "Não informado";
  document.getElementById("selectedClientCard").classList.remove("hidden");
  document.getElementById("autocompleteList").classList.add("hidden");
  document.getElementById("clientSearchInput").value = "";

  // Sincroniza imediatamente o endereço com a seção de transporte
  syncAddressWithClient();
}

// 12. Modal de Cliente
function bindModalEvents() {
  const modal = document.getElementById("clientModal");
  document.getElementById("btnOpenNewClient").addEventListener("click", () => modal.classList.remove("hidden"));
  document.getElementById("btnCloseModal").addEventListener("click", () => modal.classList.add("hidden"));
  document.getElementById("btnCancelModal").addEventListener("click", () => modal.classList.add("hidden"));

  document.getElementById("btnSaveClient").addEventListener("click", () => {
    const name = document.getElementById("newClientName").value.trim();
    const phone = document.getElementById("newClientPhone").value.trim();
    const doc = document.getElementById("newClientDoc").value.trim() || "Não informado";
    const address = document.getElementById("newClientAddress").value.trim() || "Não informado";

    if (!name || !phone) {
      alert("Preencha pelo menos Nome e WhatsApp.");
      return;
    }

    const newC = { id: Date.now(), name, phone, doc, address };
    clientsDatabase.push(newC);
    selectClient(newC);
    modal.classList.add("hidden");

    document.getElementById("newClientName").value = "";
    document.getElementById("newClientPhone").value = "";
    document.getElementById("newClientDoc").value = "";
    document.getElementById("newClientAddress").value = "";
  });
}

// 13. Ações: Converter em Pedido, Imprimir e Salvar
function bindOrderActions() {
  document.getElementById("btnToggleEditTerms").addEventListener("click", () => {
    const area = document.getElementById("termsTextArea");
    area.readOnly = !area.readOnly;
    if (!area.readOnly) area.focus();
  });

  document.getElementById("btnPrintBtn").addEventListener("click", () => {
    window.print();
  });

  // CONVERTER EM PEDIDO
  document.getElementById("btnConvertToOrder").addEventListener("click", () => {
    if (!selectedClient) {
      alert("Por favor, selecione ou cadastre um cliente antes de converter em Pedido.");
      return;
    }

    if (transportState.type === "externo" && !document.getElementById("shippingAddress").value.trim()) {
      alert("Atenção: Para Envio Externo, preencha o endereço de destino na seção de Transporte.");
      return;
    }

    const totalDeposit = paymentEntries.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    if (totalDeposit <= 0) {
      if (!confirm("A soma das entradas pagas é R$ 0,00. Deseja aprovar e converter para PEDIDO sem sinal?")) {
        return;
      }
    }

    const statusSelect = document.getElementById("statusSelect");
    statusSelect.value = "pedido";
    updateStatusStyle("pedido");
    handleStatusChange("pedido");

    saveCurrentOrderInMemory("pedido");

    alert(`Sucesso! O orçamento foi convertido para o PEDIDO #${currentOrderNumber}!\nO pedido agora está liberado para o Módulo de Arte & Prova.`);
  });

  // SALVAR / ATUALIZAR
  document.getElementById("btnApproveOrder").addEventListener("click", () => {
    const currentStatus = document.getElementById("statusSelect");
    saveCurrentOrderInMemory(currentStatus.value);
    alert(`Dados do documento #${currentOrderNumber} salvos com sucesso!`);
  });

  document.getElementById("tabArte").addEventListener("click", () => {
    const status = document.getElementById("statusSelect").value;
    if (status === "pedido" || status === "arte") {
      alert(`Módulo de Arte & Prova para o Pedido #${currentOrderNumber} pronto para produção!`);
    } else {
      alert("Este pedido ainda é um orçamento. Converta-o para 'PEDIDO' para liberar a etapa de Arte.");
    }
  });
}

function saveCurrentOrderInMemory(status) {
  ordersDatabase[currentOrderNumber] = {
    orderNumber: currentOrderNumber,
    status: status,
    orderDate: document.getElementById("orderDate").value,
    deliveryDate: document.getElementById("deliveryDate").value,
    client: selectedClient,
    transport: Object.assign({}, transportState),
    products: JSON.parse(JSON.stringify(productsList)),
    layouts: JSON.parse(JSON.stringify(layoutsList)),
    extras: JSON.parse(JSON.stringify(extraItems)),
    payments: JSON.parse(JSON.stringify(paymentEntries)),
    discountType: discountType,
    discountVal: Number(document.getElementById("discountInput").value || 0)
  };
}

// Utilitários
function formatBRL(val) {
  return (Number(val) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseBRL(formattedVal) {
  return Number(formattedVal.replace(/[^0-9,-]+/g, "").replace(",", ".")) || 0;
}