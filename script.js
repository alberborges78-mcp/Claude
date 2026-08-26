const transactions = [
  { name: 'Pagamento recebido', category: 'Vendas', date: '26 ago, 2026', status: 'Concluído', value: '+ R$ 12.450,00', icon: '↗', tone: '' },
  { name: 'Google Workspace', category: 'Assinaturas', date: '25 ago, 2026', status: 'Concluído', value: '- R$ 540,00', icon: 'G', tone: 'orange' },
  { name: 'Transferência recebida', category: 'Serviços', date: '24 ago, 2026', status: 'Concluído', value: '+ R$ 8.200,00', icon: '↙', tone: 'blue' },
  { name: 'Adobe Creative Cloud', category: 'Ferramentas', date: '23 ago, 2026', status: 'Pendente', value: '- R$ 289,90', icon: 'A', tone: 'purple' }
];

const body = document.querySelector('#transactionsBody');
body.innerHTML = transactions.map((transaction) => `
  <tr><td><div class="transaction-name"><span class="transaction-icon ${transaction.tone}">${transaction.icon}</span>${transaction.name}</div></td>
  <td class="category">${transaction.category}</td><td class="category">${transaction.date}</td>
  <td><span class="status ${transaction.status === 'Concluído' ? 'completed' : 'pending'}">${transaction.status}</span></td>
  <td class="align-right ${transaction.value.startsWith('+') ? 'positive' : ''}">${transaction.value}</td></tr>
`).join('');

// Draw small trend lines as lightweight inline SVGs, keeping the cards data-driven.
document.querySelectorAll('.mini-chart').forEach((chart) => {
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

document.querySelector('#newTransaction').addEventListener('click', () => {
  window.alert('Formulário de nova transação disponível na versão completa.');
});

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
