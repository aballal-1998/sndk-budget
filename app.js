'use strict';

// ===== CONSTANTS =====
const INTERNSHIP_START = new Date('2026-06-02');
const INTERNSHIP_END   = new Date('2026-08-21');
const INTERNSHIP_WEEKS = 11.25;
const SAVINGS_GOAL     = 4400;
const MONTHLY_TAKEHOME = 4978;
const HOUSING_MONTHLY  = 2863;

const CAT_ICON = { Housing: '🏨', Groceries: '🛒', Cafeteria: '🍽️', 'Dining Out': '🍔', Transport: '🚗', Misc: '📦' };

// Groups define dashboard bars — Cafeteria + Dining Out share one $150 budget
const BUDGET_GROUPS = [
  { label: 'Housing',    cats: ['Housing'],               budget: 2863, id: 'housing' },
  { label: 'Groceries',  cats: ['Groceries'],             budget: 400,  id: 'groceries' },
  { label: 'Dining',     cats: ['Cafeteria', 'Dining Out'], budget: 150, id: 'dining' },
  { label: 'Transport',  cats: ['Transport'],             budget: 25,   id: 'transport' },
  { label: 'Misc',       cats: ['Misc'],                  budget: 290,  id: 'misc' },
];

// ===== STATE =====
let currentCategory = 'Groceries';
let amountStr = '0';

// ===== PIN =====
let pinEntry = '';
let pinMode = 'unlock'; // 'unlock' | 'setup' | 'confirm'
let pinSetupFirst = '';

async function hashPin(pin) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function initPin() {
  const stored = localStorage.getItem('sndk_pin');
  if (!stored) {
    pinMode = 'setup';
    document.getElementById('pin-title').textContent = 'Set a PIN';
  } else {
    pinMode = 'unlock';
    document.getElementById('pin-title').textContent = 'Enter PIN';
  }
}

function pinInput(digit) {
  if (pinEntry.length >= 4) return;
  pinEntry += digit;
  updatePinDots();
  if (pinEntry.length === 4) {
    setTimeout(() => handlePinSubmit(), 120);
  }
}

function pinDelete() {
  pinEntry = pinEntry.slice(0, -1);
  updatePinDots();
}

function updatePinDots() {
  for (let i = 0; i < 4; i++) {
    document.getElementById('dot-' + i).classList.toggle('filled', i < pinEntry.length);
  }
}

async function handlePinSubmit() {
  if (pinMode === 'setup') {
    pinSetupFirst = pinEntry;
    pinEntry = '';
    updatePinDots();
    pinMode = 'confirm';
    document.getElementById('pin-title').textContent = 'Confirm PIN';
    document.getElementById('pin-error').textContent = '';
    return;
  }

  if (pinMode === 'confirm') {
    if (pinEntry === pinSetupFirst) {
      const hashed = await hashPin(pinEntry);
      localStorage.setItem('sndk_pin', hashed);
      unlockApp();
    } else {
      showPinError('PINs don\'t match. Try again.');
      pinMode = 'setup';
      pinSetupFirst = '';
      document.getElementById('pin-title').textContent = 'Set a PIN';
    }
    return;
  }

  if (pinMode === 'unlock') {
    const stored = localStorage.getItem('sndk_pin');
    const hashed = await hashPin(pinEntry);
    if (hashed === stored) {
      unlockApp();
    } else {
      showPinError('Incorrect PIN');
    }
  }
}

function showPinError(msg) {
  pinEntry = '';
  updatePinDots();
  const dots = document.getElementById('pin-dots');
  const err = document.getElementById('pin-error');
  err.textContent = msg;
  dots.classList.add('shake');
  setTimeout(() => { dots.classList.remove('shake'); }, 400);
  setTimeout(() => { err.textContent = ''; }, 2500);
}

function unlockApp() {
  pinEntry = '';
  document.getElementById('pin-screen').classList.add('hidden');
}

// ===== STORAGE =====
function getExpenses() {
  return JSON.parse(localStorage.getItem('sndk_expenses') || '[]');
}

function saveExpenses(expenses) {
  localStorage.setItem('sndk_expenses', JSON.stringify(expenses));
}

// ===== VIEW SWITCHING =====
function switchView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  document.querySelector(`[data-view="${view}"]`).classList.add('active');

  if (view === 'dashboard') renderDashboard();
  if (view === 'history') renderHistory();
  if (view === 'pay') renderPay();
}

// ===== LOG VIEW =====
function selectCategory(btn) {
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentCategory = btn.dataset.cat;
}

function numpadInput(key) {
  if (key === '.') {
    if (amountStr.includes('.')) return;
    amountStr = amountStr === '0' ? '0.' : amountStr + '.';
  } else {
    const parts = amountStr.split('.');
    if (parts[1] !== undefined && parts[1].length >= 2) return;
    if (amountStr === '0' && key !== '.') {
      amountStr = key;
    } else {
      if (amountStr.replace('.', '').length >= 7) return;
      amountStr += key;
    }
  }
  document.getElementById('amount-value').textContent = amountStr;
}

function numpadDelete() {
  if (amountStr.length <= 1) {
    amountStr = '0';
  } else {
    amountStr = amountStr.slice(0, -1);
  }
  document.getElementById('amount-value').textContent = amountStr;
}

function logExpense() {
  const amount = parseFloat(amountStr);
  if (!amount || amount <= 0) {
    showFeedback('Enter an amount first', 'error');
    return;
  }

  const note = document.getElementById('expense-note').value.trim();
  const dateInput = document.getElementById('expense-date').value;
  const date = dateInput || new Date().toISOString().slice(0, 10);

  const expense = {
    id: Date.now(),
    category: currentCategory,
    amount,
    note,
    date
  };

  const expenses = getExpenses();
  expenses.push(expense);
  saveExpenses(expenses);

  showFeedback(`$${amount.toFixed(2)} logged`, 'success');
  amountStr = '0';
  document.getElementById('amount-value').textContent = '0';
  document.getElementById('expense-note').value = '';
}

function showFeedback(msg, type) {
  const el = document.getElementById('log-feedback');
  el.textContent = msg;
  el.style.color = type === 'error' ? '#ef4444' : '#22c55e';
  setTimeout(() => { el.textContent = ''; }, 2500);
}

// ===== DASHBOARD =====
function renderDashboard() {
  const today = new Date();

  // Internship progress
  const totalMs = INTERNSHIP_END - INTERNSHIP_START;
  const elapsedMs = Math.max(0, Math.min(today - INTERNSHIP_START, totalMs));
  const pct = elapsedMs / totalMs;
  const weeksDone = (pct * INTERNSHIP_WEEKS).toFixed(1);

  document.getElementById('dash-weeks-done').textContent = weeksDone;
  document.getElementById('internship-bar').style.width = (pct * 100).toFixed(1) + '%';

  // Savings: take-home accrued minus all logged expenses (including housing)
  const weeksElapsed = elapsedMs / (7 * 24 * 60 * 60 * 1000);
  const takehomeAccrued = (MONTHLY_TAKEHOME / 4.33) * weeksElapsed;
  const expenses = getExpenses();
  const totalSpentAllTime = expenses.reduce((s, e) => s + e.amount, 0);
  const estimatedSavings = Math.max(0, takehomeAccrued - totalSpentAllTime);
  const savingsPct = Math.min(estimatedSavings / SAVINGS_GOAL, 1);

  document.getElementById('dash-savings').textContent = '$' + estimatedSavings.toFixed(0);
  document.getElementById('savings-bar').style.width = (savingsPct * 100).toFixed(1) + '%';
  const remaining = Math.max(0, SAVINGS_GOAL - estimatedSavings);
  document.getElementById('dash-savings-sub').textContent =
    remaining > 0 ? `$${remaining.toFixed(0)} to go` : 'Goal reached!';

  // Monthly spend
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  document.getElementById('month-label').textContent = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  const monthExpenses = expenses.filter(e => e.date.startsWith(monthKey));
  const catTotals = {};
  monthExpenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });

  BUDGET_GROUPS.forEach(group => {
    const spent = group.cats.reduce((s, c) => s + (catTotals[c] || 0), 0);
    const pct = Math.min(spent / group.budget, 1);
    const bar = document.getElementById('bar-' + group.id);
    bar.style.width = (pct * 100).toFixed(1) + '%';
    bar.classList.toggle('over', spent > group.budget);
    document.getElementById('spent-' + group.id).textContent = '$' + spent.toFixed(0);
  });

  const totalSpend = Object.values(catTotals).reduce((s, v) => s + v, 0);
  document.getElementById('dash-total-spend').textContent =
    `$${totalSpend.toFixed(0)} / $3,728`;
}

// ===== BANNER =====
function renderBanner() {
  const today = new Date();
  const totalMs = INTERNSHIP_END - INTERNSHIP_START;
  const elapsedMs = Math.max(0, Math.min(today - INTERNSHIP_START, totalMs));
  const totalDays = Math.round(totalMs / (1000 * 60 * 60 * 24));
  const daysDone = Math.min(Math.max(0, Math.floor(elapsedMs / (1000 * 60 * 60 * 24))) + 1, totalDays);
  const pct = (elapsedMs / totalMs * 100).toFixed(1);

  document.querySelectorAll('.banner-bar-fill').forEach(el => el.style.width = pct + '%');
  document.querySelectorAll('.progress-banner .banner-label').forEach(el => el.textContent = `Day ${daysDone} of ${totalDays}`);
}

// ===== PAYCHECKS =====
function getPaychecks() {
  return JSON.parse(localStorage.getItem('sndk_paychecks') || '[]');
}

function savePaychecks(p) {
  localStorage.setItem('sndk_paychecks', JSON.stringify(p));
}

function logPaycheck() {
  const amount = parseFloat(document.getElementById('paycheck-amount').value);
  const date = document.getElementById('paycheck-date').value || new Date().toISOString().slice(0, 10);
  if (!amount || amount <= 0) {
    document.getElementById('paycheck-feedback').textContent = 'Enter an amount';
    setTimeout(() => { document.getElementById('paycheck-feedback').textContent = ''; }, 2000);
    return;
  }
  const paychecks = getPaychecks();
  paychecks.push({ id: Date.now(), amount, date });
  savePaychecks(paychecks);
  document.getElementById('paycheck-amount').value = '';
  document.getElementById('paycheck-feedback').textContent = `$${amount.toFixed(2)} logged`;
  setTimeout(() => { document.getElementById('paycheck-feedback').textContent = ''; }, 2000);
  renderPay();
}

function deletePaycheck(id) {
  savePaychecks(getPaychecks().filter(p => p.id !== id));
  renderPay();
}

// ===== PAY =====
const PLAN_TAKEHOME_TOTAL = Math.round(MONTHLY_TAKEHOME * (80 / 30.44)); // ~$13,084
const PLAN_SPEND_TOTAL    = Math.round((3728) * (80 / 30.44));           // ~$9,800
const PLAN_GROSS_TOTAL    = 20495;
const TAX_REFUND_EST      = 1750;

function renderPay() {
  const expenses  = getExpenses();
  const paychecks = getPaychecks();

  const actualTakehome = paychecks.reduce((s, p) => s + p.amount, 0);
  const actualSpend    = expenses.reduce((s, e) => s + e.amount, 0);
  const actualSavings  = Math.max(0, actualTakehome - actualSpend);

  // Savings goal card
  document.getElementById('pay-savings-live').textContent = '$' + actualSavings.toFixed(0);
  document.getElementById('savings-bar').style.width = (Math.min(actualSavings / SAVINGS_GOAL, 1) * 100).toFixed(1) + '%';
  const remaining = Math.max(0, SAVINGS_GOAL - actualSavings);
  document.getElementById('pay-savings-sub').textContent = remaining > 0 ? `$${remaining.toFixed(0)} to go` : 'Goal reached!';

  // Plan vs Actual
  document.getElementById('pva-takehome-plan').textContent  = '$' + PLAN_TAKEHOME_TOTAL.toLocaleString();
  document.getElementById('pva-takehome-actual').textContent = actualTakehome > 0 ? '$' + actualTakehome.toFixed(0) : '—';
  document.getElementById('pva-spend-plan').textContent     = '$' + PLAN_SPEND_TOTAL.toLocaleString();
  document.getElementById('pva-spend-actual').textContent   = actualSpend > 0 ? '$' + actualSpend.toFixed(0) : '—';
  document.getElementById('pva-savings-plan').textContent   = '$' + SAVINGS_GOAL.toLocaleString();
  document.getElementById('pva-savings-actual').textContent = actualTakehome > 0 ? '$' + actualSavings.toFixed(0) : '—';
  document.getElementById('pva-refund-plan').textContent    = '~$' + TAX_REFUND_EST.toLocaleString();

  // variance highlights
  setVariance('pva-spend-actual',   actualSpend,    PLAN_SPEND_TOTAL,    true);
  setVariance('pva-savings-actual', actualSavings,  SAVINGS_GOAL,        false);

  // Paycheck list
  const list = paychecks.slice().sort((a, b) => b.date.localeCompare(a.date));
  const el = document.getElementById('paycheck-list');
  el.innerHTML = list.length === 0
    ? '<div class="history-empty">No paychecks logged yet</div>'
    : list.map(p => `
        <div class="history-item">
          <div class="history-item-body">
            <div class="history-item-cat" style="color:var(--green)">Paycheck</div>
            <div class="history-item-date">${formatDate(p.date)}</div>
          </div>
          <div class="history-item-amount" style="color:var(--green)">$${p.amount.toFixed(2)}</div>
          <button class="history-delete-btn" onclick="deletePaycheck(${p.id})">×</button>
        </div>`).join('');
}

function setVariance(id, actual, plan, higherIsBad) {
  if (!actual) return;
  const el = document.getElementById(id);
  const over = actual > plan;
  el.className = 'pva-actual ' + (over === higherIsBad ? 'pva-bad' : 'pva-good');
}

// ===== HISTORY =====
function renderHistory() {
  const expenses = getExpenses();
  const monthFilter = document.getElementById('history-month-filter').value;
  const catFilter = document.getElementById('history-cat-filter').value;

  let filtered = expenses;
  if (monthFilter !== 'all') filtered = filtered.filter(e => e.date.startsWith(monthFilter));
  if (catFilter !== 'all') filtered = filtered.filter(e => e.category === catFilter);

  filtered = filtered.slice().sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

  const list = document.getElementById('history-list');

  if (filtered.length === 0) {
    list.innerHTML = '<div class="history-empty">No expenses yet</div>';
    return;
  }

  list.innerHTML = filtered.map(e => `
    <div class="history-item" id="item-${e.id}">
      <div class="history-item-icon">${CAT_ICON[e.category]}</div>
      <div class="history-item-body">
        <div class="history-item-cat cat-${e.category.toLowerCase()}">${e.category}</div>
        ${e.note ? `<div class="history-item-note">${escHtml(e.note)}</div>` : ''}
        <div class="history-item-date">${formatDate(e.date)}</div>
      </div>
      <div class="history-item-amount">$${e.amount.toFixed(2)}</div>
      <button class="history-delete-btn" onclick="editExpense(${e.id})" title="Edit">✎</button>
      <button class="history-delete-btn" onclick="deleteExpense(${e.id})" title="Delete">×</button>
    </div>
  `).join('');
}

let editingId = null;

function editExpense(id) {
  const expense = getExpenses().find(e => e.id === id);
  if (!expense) return;
  editingId = id;

  document.querySelectorAll('#edit-cat-grid .cat-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.cat === expense.category);
  });
  document.getElementById('edit-amount').value = expense.amount.toFixed(2);
  document.getElementById('edit-note').value = expense.note || '';
  document.getElementById('edit-date').value = expense.date;

  document.getElementById('edit-overlay').classList.remove('hidden');
  document.getElementById('edit-sheet').classList.remove('hidden');
}

function editSelectCat(btn) {
  document.querySelectorAll('#edit-cat-grid .cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function saveEdit() {
  const cat = document.querySelector('#edit-cat-grid .cat-btn.active');
  const amount = parseFloat(document.getElementById('edit-amount').value);
  if (!cat || !amount || amount <= 0) return;

  const expenses = getExpenses().map(e => {
    if (e.id !== editingId) return e;
    return {
      ...e,
      category: cat.dataset.cat,
      amount,
      note: document.getElementById('edit-note').value.trim(),
      date: document.getElementById('edit-date').value || e.date,
    };
  });

  saveExpenses(expenses);
  closeEditModal();
  renderHistory();
}

function closeEditModal() {
  editingId = null;
  document.getElementById('edit-overlay').classList.add('hidden');
  document.getElementById('edit-sheet').classList.add('hidden');
}

function deleteExpense(id) {
  const expenses = getExpenses().filter(e => e.id !== id);
  saveExpenses(expenses);
  renderHistory();
}

function clearAllData() {
  if (!confirm('Delete all expense data? This cannot be undone.')) return;
  localStorage.removeItem('sndk_expenses');
  renderHistory();
}

function exportCSV() {
  const expenses = getExpenses();
  if (expenses.length === 0) { alert('No expenses to export.'); return; }

  const rows = [['Date', 'Category', 'Amount', 'Note']];
  expenses
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach(e => rows.push([e.date, e.category, e.amount.toFixed(2), e.note || '']));

  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sndk_budget_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ===== UTILS =====
function formatDate(iso) {
  const [y, m, d] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m,10)-1]} ${parseInt(d,10)}, ${y}`;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ===== INIT =====
function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

document.addEventListener('DOMContentLoaded', () => {
  if (!isMobile()) {
    document.getElementById('desktop-block').classList.remove('hidden');
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('expense-date').value = today;
  document.getElementById('paycheck-date').value = today;

  initPin();
  renderBanner();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
