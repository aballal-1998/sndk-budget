'use strict';

// ===== CONSTANTS =====
const INTERNSHIP_START = new Date('2026-06-02');
const INTERNSHIP_END   = new Date('2026-08-19');
const INTERNSHIP_WEEKS = 11.25;
const SAVINGS_GOAL     = 4400;
const MONTHLY_TAKEHOME = 4978;
const HOUSING_MONTHLY  = 2863;

const BUDGETS = { Food: 550, Transport: 25, Misc: 290 };

const CAT_ICON = { Food: '🍔', Transport: '🚗', Misc: '📦' };

// ===== STATE =====
let currentCategory = 'Food';
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

  // Savings: estimated take-home accrued minus total expenses
  const weeksElapsed = elapsedMs / (7 * 24 * 60 * 60 * 1000);
  const takehomeAccrued = (MONTHLY_TAKEHOME / 4.33) * weeksElapsed;
  const housingAccrued = (HOUSING_MONTHLY / 4.33) * weeksElapsed;
  const expenses = getExpenses();
  const totalVariableSpend = expenses.reduce((s, e) => s + e.amount, 0);
  const estimatedSavings = Math.max(0, takehomeAccrued - housingAccrued - totalVariableSpend);
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
  const totals = { Food: 0, Transport: 0, Misc: 0 };
  monthExpenses.forEach(e => { totals[e.category] = (totals[e.category] || 0) + e.amount; });

  ['Food', 'Transport', 'Misc'].forEach(cat => {
    const spent = totals[cat];
    const budget = BUDGETS[cat];
    const pct = Math.min(spent / budget, 1);
    const bar = document.getElementById('bar-' + cat.toLowerCase());
    bar.style.width = (pct * 100).toFixed(1) + '%';
    bar.classList.toggle('over', spent > budget);
    document.getElementById('spent-' + cat.toLowerCase()).textContent = '$' + spent.toFixed(0);
  });

  const totalSpend = totals.Food + totals.Transport + totals.Misc;
  document.getElementById('dash-total-spend').textContent =
    `$${totalSpend.toFixed(0)} / $865`;
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
      <button class="history-delete-btn" onclick="deleteExpense(${e.id})" title="Delete">×</button>
    </div>
  `).join('');
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
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('expense-date').value = new Date().toISOString().slice(0, 10);

  initPin();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
