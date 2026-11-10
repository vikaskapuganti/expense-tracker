// Expense Tracker
// Data lives in localStorage on this device only.
// state = { budget: number|null, expenses: [{ id, amount, date: "YYYY-MM-DD", cat, note }] }

const STORAGE_KEY = "expense-tracker-v1";
const CATS = [
  { id: "food", name: "Food", color: "#ea580c" },
  { id: "travel", name: "Travel", color: "#2563eb" },
  { id: "shopping", name: "Shopping", color: "#db2777" },
  { id: "bills", name: "Bills", color: "#0891b2" },
  { id: "fun", name: "Fun", color: "#9333ea" },
  { id: "other", name: "Other", color: "#64748b" }
];
const catById = id => CATS.find(c => c.id === id) || CATS[CATS.length - 1];

let state = load();
let editingId = null;
let pickedCat = "food";
const now = new Date();
let viewYear = now.getFullYear(), viewMonth = now.getMonth(); // month shown

// ---------- Helpers ----------
const rupee = n => "₹" + Math.round(n).toLocaleString("en-IN");
const pad = n => String(n).padStart(2, "0");
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const monthKey = (y, m) => `${y}-${pad(m + 1)}`;
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (s && Array.isArray(s.expenses)) return s;
  } catch (e) {}
  return { budget: null, expenses: [] };
}
function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {} }

function monthExpenses() {
  const mk = monthKey(viewYear, viewMonth);
  return state.expenses.filter(e => e.date.startsWith(mk));
}

// ---------- Rendering ----------
function render() {
  const list = monthExpenses();
  const total = list.reduce((s, e) => s + e.amount, 0);
  const isCurrent = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  document.getElementById("monthTitle").textContent = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  document.getElementById("nextMonth").disabled = isCurrent;
  document.getElementById("monthTotal").textContent = rupee(total);
  document.getElementById("monthCount").textContent = list.length
    ? `${list.length} ${list.length === 1 ? "expense" : "expenses"}`
    : "No expenses yet";

  renderBudget(total, isCurrent);
  renderCharts(list, total);
  renderList(list);
}

function renderBudget(total, isCurrent) {
  const bar = document.getElementById("budgetBar");
  const adv = document.getElementById("budgetAdvice");
  const b = state.budget;
  bar.className = "bar-fill";
  adv.className = "advice";
  if (!b) { bar.style.width = "0"; adv.textContent = "Set a monthly budget to track how much is left."; return; }
  const ratio = total / b;
  bar.style.width = Math.min(ratio, 1) * 100 + "%";
  if (ratio > 1) { bar.classList.add("bad"); adv.classList.add("bad"); adv.textContent = `Over budget by ${rupee(total - b)}.`; return; }
  if (ratio >= 0.8) { bar.classList.add("warn"); adv.classList.add("warn"); }
  else adv.classList.add("good");
  const left = b - total;
  if (isCurrent) {
    const daysLeft = daysInMonth(viewYear, viewMonth) - now.getDate() + 1; // including today
    adv.textContent = `${rupee(left)} left. That’s about ${rupee(left / daysLeft)} a day for the next ${daysLeft} ${daysLeft === 1 ? "day" : "days"}.`;
  } else {
    adv.textContent = `Finished ${rupee(left)} under budget.`;
  }
}

function renderCharts(list, total) {
  const card = document.getElementById("chartsCard");
  card.hidden = list.length === 0;
  if (!list.length) return;

  // Donut: one ring segment per category, using stroke-dasharray on a circle of circumference 100.
  const byCat = CATS.map(c => ({ ...c, amt: list.filter(e => e.cat === c.id).reduce((s, e) => s + e.amount, 0) }))
    .filter(c => c.amt > 0).sort((a, b) => b.amt - a.amt);
  const R = 15.915; // radius where circumference = 100
  let offset = 25;  // start at 12 o'clock
  let rings = `<circle cx="21" cy="21" r="${R}" fill="none" stroke="var(--border)" stroke-width="6"/>`;
  for (const c of byCat) {
    const pct = (c.amt / total) * 100;
    rings += `<circle cx="21" cy="21" r="${R}" fill="none" stroke="${c.color}" stroke-width="6" stroke-dasharray="${pct} ${100 - pct}" stroke-dashoffset="${offset}"/>`;
    offset -= pct;
  }
  document.getElementById("donut").innerHTML = rings;
  document.getElementById("catList").innerHTML = byCat.map(c =>
    `<div class="cat-row" style="--cc:${c.color}"><span class="dot"></span><span class="name">${c.name}</span><span class="muted">${Math.round((c.amt / total) * 100)}%</span><span class="amt">${rupee(c.amt)}</span></div>`
  ).join("");

  // Daily bars
  const n = daysInMonth(viewYear, viewMonth);
  const perDay = Array(n).fill(0);
  for (const e of list) perDay[Number(e.date.slice(8, 10)) - 1] += e.amount;
  const max = Math.max(...perDay, 1);
  const W = n * 10, H = 100;
  let svg = "";
  perDay.forEach((v, i) => {
    const h = (v / max) * (H - 16);
    if (v > 0) svg += `<rect class="bar-d" x="${i * 10 + 1.5}" y="${H - 12 - h}" width="7" height="${h}" rx="1.5"><title>${i + 1}: ${rupee(v)}</title></rect>`;
    if (i === 0 || (i + 1) % 5 === 0) svg += `<text class="axis" x="${i * 10 + 5}" y="${H - 1}" text-anchor="middle">${i + 1}</text>`;
  });
  const daily = document.getElementById("daily");
  daily.setAttribute("viewBox", `0 0 ${W} ${H}`);
  daily.innerHTML = svg;
}

function renderList(list) {
  document.getElementById("emptyMsg").hidden = list.length > 0;
  const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  let html = "", lastDay = "";
  for (const e of sorted) {
    if (e.date !== lastDay) {
      lastDay = e.date;
      const d = new Date(e.date + "T00:00:00");
      const dayTotal = sorted.filter(x => x.date === e.date).reduce((s, x) => s + x.amount, 0);
      html += `<p class="day-head">${d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} · ${rupee(dayTotal)}</p>`;
    }
    const c = catById(e.cat);
    html += `<div class="tx" style="--cc:${c.color}">
      <span class="dot"></span>
      <div class="tx-main"><p class="tx-cat">${c.name}</p>${e.note ? `<p class="tx-note">${esc(e.note)}</p>` : ""}</div>
      <span class="tx-amt">${rupee(e.amount)}</span>
      <span class="tx-actions">
        <button type="button" class="btn small" data-act="edit" data-id="${e.id}" aria-label="Edit">Edit</button>
        <button type="button" class="btn small" data-act="delete" data-id="${e.id}" aria-label="Delete">✕</button>
      </span>
    </div>`;
  }
  document.getElementById("txList").innerHTML = html;
}

function renderCats() {
  document.getElementById("cats").innerHTML = CATS.map(c =>
    `<button type="button" class="cat-btn" role="radio" aria-checked="${c.id === pickedCat}" data-cat="${c.id}" style="--cc:${c.color}">${c.name}</button>`
  ).join("");
}

// ---------- Form ----------
function resetForm() {
  editingId = null;
  document.getElementById("expenseForm").reset();
  document.getElementById("date").value = todayKey();
  document.getElementById("formTitle").textContent = "Add an expense";
  document.getElementById("saveBtn").textContent = "Add expense";
  document.getElementById("cancelBtn").hidden = true;
  document.getElementById("error").textContent = "";
  renderCats();
}

document.getElementById("expenseForm").addEventListener("submit", ev => {
  ev.preventDefault();
  const amount = parseFloat(document.getElementById("amount").value);
  const date = document.getElementById("date").value;
  const note = document.getElementById("note").value.trim();
  const err = document.getElementById("error");
  if (!(amount > 0)) { err.textContent = "Enter an amount more than 0."; return; }
  if (amount > 10000000) { err.textContent = "That amount looks too big. Check it once."; return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { err.textContent = "Pick a date."; return; }
  const item = { amount: Math.round(amount * 100) / 100, date, cat: pickedCat, note };
  if (editingId) Object.assign(state.expenses.find(e => e.id === editingId), item);
  else state.expenses.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ...item });
  // Jump to the month of the expense so the user sees it.
  viewYear = Number(date.slice(0, 4)); viewMonth = Number(date.slice(5, 7)) - 1;
  save(); resetForm(); render();
});

document.getElementById("cancelBtn").addEventListener("click", resetForm);

document.getElementById("cats").addEventListener("click", e => {
  const b = e.target.closest("[data-cat]");
  if (!b) return;
  pickedCat = b.dataset.cat; renderCats();
});

document.getElementById("txList").addEventListener("click", e => {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const ex = state.expenses.find(x => x.id === b.dataset.id);
  if (!ex) return;
  if (b.dataset.act === "edit") {
    editingId = ex.id; pickedCat = ex.cat;
    document.getElementById("amount").value = ex.amount;
    document.getElementById("date").value = ex.date;
    document.getElementById("note").value = ex.note || "";
    document.getElementById("formTitle").textContent = "Edit expense";
    document.getElementById("saveBtn").textContent = "Save changes";
    document.getElementById("cancelBtn").hidden = false;
    renderCats();
    document.getElementById("amount").focus();
  } else if (confirm(`Delete this ${rupee(ex.amount)} expense?`)) {
    state.expenses = state.expenses.filter(x => x.id !== ex.id);
    save(); render();
  }
});

// ---------- Budget and months ----------
const budgetInput = document.getElementById("budget");
budgetInput.value = state.budget || "";
budgetInput.addEventListener("input", () => {
  const v = parseFloat(budgetInput.value);
  state.budget = v > 0 ? v : null;
  save(); render();
});

document.getElementById("prevMonth").addEventListener("click", () => {
  viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  render();
});
document.getElementById("nextMonth").addEventListener("click", () => {
  viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  render();
});

// ---------- CSV export (all months) ----------
document.getElementById("exportBtn").addEventListener("click", () => {
  if (!state.expenses.length) { alert("No expenses to download yet."); return; }
  const q = s => `"${String(s).replace(/"/g, '""')}"`;
  const rows = [["Date", "Category", "Amount (INR)", "Note"]]
    .concat([...state.expenses].sort((a, b) => a.date.localeCompare(b.date)).map(e => [e.date, catById(e.cat).name, e.amount, e.note || ""]));
  const csv = "﻿" + rows.map(r => r.map(q).join(",")).join("\r\n"); // BOM so Excel reads ₹ and Telugu text correctly
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `expenses-${todayKey()}.csv` });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

resetForm();
render();
