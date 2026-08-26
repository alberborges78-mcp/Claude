const storageKey = 'finsight-launches';
let transactions = JSON.parse(localStorage.getItem(storageKey) || '[]');
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const body = document.querySelector('#transactionsBody');
function formatCurrency(value) { return currency.format(value); }
function updateDashboard() {
  const income = transactions.filter((item) => item.type === 'income').reduce((total, item) => total + item.amount, 0);
  const expense = transactions.filter((item) => item.type === 'expense').reduce((total, item) => total + item.amount, 0);
  const moved = income + expense;
  const incomePercent = moved ? Math.round((income / moved) * 100) : 0;
  document.querySelector('#totalIncome').textContent = formatCurrency(income);
  document.querySelector('#totalExpense').textContent = formatCurrency(expense);
  document.querySelector('#netBalance').textContent = formatCurrency(income - expense);
  document.querySelector('#donutTotal').textContent = formatCurrency(moved);
  document.querySelector('#incomePercent').textContent = `${incomePercent}%`;
  document.querySelector('#expensePercent').textContent = `${100 - incomePercent}%`;
  document.querySelector('#balanceDonut').style.background = `conic-gradient(var(--green) 0 ${incomePercent}%, var(--orange) ${incomePercent}% 100%)`;
  document.querySelector('#entryCount').textContent = `${transactions.length} lançamento${transactions.length === 1 ? '' : 's'}`;
  renderTransactions();
}
function renderTransactions() {
  document.querySelector('#emptyState').hidden = transactions.length > 0;
  body.innerHTML = transactions.slice().reverse().map((item) => `<tr><td><div class="transaction-name"><span class="transaction-icon ${item.type === 'income' ? '' : 'orange'}">${item.type === 'income' ? '↗' : '↘'}</span>${item.description}</div></td><td class="category">${item.category}</td><td class="category">${item.date}</td><td><span class="status ${item.type === 'income' ? 'completed' : 'pending'}">${item.type === 'income' ? 'Ganho' : 'Gasto'}</span></td><td class="align-right ${item.type === 'income' ? 'positive' : 'negative'}">${item.type === 'income' ? '+' : '-'} ${formatCurrency(item.amount)}</td><td class="align-right"><button class="delete-button" data-id="${item.id}" aria-label="Excluir ${item.description}">Excluir</button></td></tr>`).join('');
}
document.querySelector('#entryForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  transactions.push({ id: Date.now(), description: form.get('description').trim(), amount: Number(form.get('amount')), type: form.get('type'), category: form.get('category'), date: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date()) });
  localStorage.setItem(storageKey, JSON.stringify(transactions));
  event.currentTarget.reset();
  document.querySelector('#formStatus').textContent = 'Lançamento salvo';
  setTimeout(() => { document.querySelector('#formStatus').textContent = ''; }, 2200);
  updateDashboard();
});
body.addEventListener('click', (event) => {
  const button = event.target.closest('.delete-button');
  if (!button) return;
  transactions = transactions.filter((item) => String(item.id) !== button.dataset.id);
  localStorage.setItem(storageKey, JSON.stringify(transactions));
  updateDashboard();
});

// Draw small trend lines as lightweight inline SVGs, keeping the cards data-driven.
document.querySelectorAll('.mini-chart').forEach((chart) => {
  if (!chart.dataset.values) return;
  const values = chart.dataset.values.split(',').map(Number);
  const max = Math.max(...values);
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 100},${31 - (value / max) * 27}`).join(' ');
  chart.style.clipPath = 'none';
  chart.innerHTML = `<svg viewBox="0 0 100 31" preserveAspectRatio="none" aria-hidden="true"><polyline points="${points}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
});

document.querySelector('#mobileMenu').addEventListener('click', () => document.querySelector('#sidebar').classList.toggle('open'));
document.querySelectorAll('.nav-item').forEach((item) => item.addEventListener('click', () => document.querySelector('#sidebar').classList.remove('open')));

document.querySelector('#exportButton').addEventListener('click', (event) => {
  const button = event.currentTarget;
  const original = button.innerHTML;
  button.innerHTML = '<span>✓</span> Exportado';
  setTimeout(() => { button.innerHTML = original; }, 1800);
});

document.querySelector('#newTransaction').addEventListener('click', () => document.querySelector('#entry-form').scrollIntoView({ behavior: 'smooth', block: 'center' }));

document.querySelector('#periodSelect').addEventListener('change', (event) => {
  const chart = document.querySelector('#lineChart');
  chart.style.opacity = '0.45';
  setTimeout(() => { chart.style.opacity = '1'; }, 220);
});

const themeButton = document.createElement('button');
themeButton.className = 'icon-button theme-button';
themeButton.setAttribute('aria-label', 'Alternar modo escuro');
themeButton.textContent = '◐';
document.querySelector('.topbar-actions').prepend(themeButton);
themeButton.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  themeButton.textContent = document.body.classList.contains('dark') ? '○' : '◐';
});

updateDashboard();
