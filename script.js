/* ============================================================================
   CARBONLEDGER — Daily Carbon Footprint Tracker
   Vanilla JS. Sections: Factors, Storage, State, Utils, Calculation,
   Dashboard, Charts, Log Form, Quick Add, History, Target, Factors View,
   Sample Data, Events, Init.
   ============================================================================ */

(function () {
  "use strict";

  /* ==========================================================================
     1. EMISSION FACTORS  (fixed, as specified)
     ========================================================================== */
  const FACTORS = {
    car:          { label: "Car travel",          category: "Travel", factor: 0.20, unit: "km",   icon: "🚗", example: "10 km → 2.00 kg" },
    bus:          { label: "Bus travel",          category: "Travel", factor: 0.08, unit: "km",   icon: "🚌", example: "10 km → 0.80 kg" },
    flight:       { label: "Flight",              category: "Travel", factor: 0.25, unit: "km",   icon: "✈️", example: "500 km → 125.00 kg" },
    electricity:  { label: "Electricity use",     category: "Home",   factor: 0.80, unit: "kWh",  icon: "⚡", example: "5 kWh → 4.00 kg" },
    veg_meal:     { label: "Vegetarian meal",     category: "Food",   factor: 0.50, unit: "meal", icon: "🥗", example: "2 meals → 1.00 kg" },
    nonveg_meal:  { label: "Non-vegetarian meal", category: "Food",   factor: 2.00, unit: "meal", icon: "🍖", example: "2 meals → 4.00 kg" }
  };

  const CATEGORY_COLORS = { Travel: "#38bdf8", Home: "#fbbf24", Food: "#4ade80" };

  // Suggested quantity chips per activity type
  const QUICK_QUANTITIES = {
    car: [5, 10, 20, 50],
    bus: [5, 10, 20, 40],
    flight: [500, 1000, 2000],
    electricity: [1, 5, 10, 20],
    veg_meal: [1, 2, 3],
    nonveg_meal: [1, 2, 3]
  };

  // One-tap common activities
  const QUICK_ADD = [
    { type: "car",         quantity: 10, title: "Car commute",       note: "Daily commute" },
    { type: "bus",         quantity: 10, title: "Bus commute",       note: "Daily commute" },
    { type: "electricity", quantity: 5,  title: "Home electricity",  note: "Daily household use" },
    { type: "veg_meal",    quantity: 1,  title: "Veg meal",          note: "" },
    { type: "nonveg_meal", quantity: 1,  title: "Non-veg meal",      note: "" },
    { type: "car",         quantity: 2,  title: "Short car trip",    note: "Errand" }
  ];

  const TARGET_PRESETS = [
    { label: "Ambitious · 15 kg", value: 15 },
    { label: "Moderate · 25 kg",  value: 25 },
    { label: "Relaxed · 40 kg",   value: 40 },
    { label: "Starter · 60 kg",   value: 60 }
  ];

  // Storage key intentionally keeps its original name so that data saved
  // before the rename to Planet Pulse is not orphaned.
  const STORAGE_KEY = "carbonledger.data.v1";

  // Annual per-capita CO₂ benchmarks (tonnes → kg), widely published approximations
  const BENCHMARKS = [
    { label: "Paris target (2030)", kg: 2300 },
    { label: "India average",       kg: 2000 },
    { label: "World average",       kg: 4700 },
    { label: "EU average",          kg: 6200 },
    { label: "USA average",         kg: 14900 }
  ];

  // Achievement definitions — each test() receives a computed stats object
  const ACHIEVEMENTS = [
    { id: "first_log",   icon: "🌱", name: "First Step",       desc: "Log your very first activity",              test: s => s.totalEntries >= 1 },
    { id: "ten_logs",    icon: "📒", name: "Record Keeper",    desc: "Log 10 activities",                         test: s => s.totalEntries >= 10 },
    { id: "fifty_logs",  icon: "📚", name: "Dedicated Tracker",desc: "Log 50 activities",                         test: s => s.totalEntries >= 50 },
    { id: "streak_3",    icon: "🔥", name: "On a Roll",        desc: "Log on 3 consecutive days",                 test: s => s.loggingStreak >= 3 },
    { id: "streak_7",    icon: "⚡", name: "Week Warrior",     desc: "Log on 7 consecutive days",                 test: s => s.loggingStreak >= 7 },
    { id: "under_week",  icon: "🎯", name: "Target Hit",       desc: "Finish a full week under your target",      test: s => s.weeksUnderTarget >= 1 },
    { id: "green_3",     icon: "🍃", name: "Light Footprint",  desc: "3 days in a row under your daily budget",   test: s => s.greenStreak >= 3 },
    { id: "veg_day",     icon: "🥗", name: "Plant Powered",    desc: "Log a day with only vegetarian meals",      test: s => s.hasVegOnlyDay },
    { id: "bus_over_car",icon: "🚌", name: "Transit Champion", desc: "Log more bus km than car km overall",       test: s => s.busKm > s.carKm && s.busKm > 0 },
    { id: "all_types",   icon: "🧭", name: "Full Picture",     desc: "Log at least one of every activity type",   test: s => s.distinctTypes >= 6 },
    { id: "low_day",     icon: "💎", name: "Near Zero",        desc: "Finish a logged day under 2 kg CO₂e",       test: s => s.hasSubTwoDay },
    { id: "score_80",    icon: "🏆", name: "Eco Master",       desc: "Reach an Eco Score of 80 or above",         test: s => s.ecoScore >= 80 }
  ];

  /* ==========================================================================
     2. STORAGE  (localStorage with in-memory fallback)
     ========================================================================== */
  let storageAvailable = true;

  function saveData() {
    if (!storageAvailable) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        entries: state.entries,
        weeklyTarget: state.weeklyTarget,
        theme: document.body.getAttribute("data-theme"),
        nextId: state.nextId,
        account: state.account
      }));
    } catch (err) {
      storageAvailable = false;
      updateStorageNote();
    }
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.entries)) state.entries = parsed.entries;
      if (typeof parsed.weeklyTarget === "number") state.weeklyTarget = parsed.weeklyTarget;
      if (typeof parsed.nextId === "number") state.nextId = parsed.nextId;
      if (parsed.theme) document.body.setAttribute("data-theme", parsed.theme);
      if (parsed.account && typeof parsed.account === "object") {
        state.account.name = typeof parsed.account.name === "string" ? parsed.account.name : "";
        state.account.hasChosen = !!parsed.account.hasChosen;
      }
    } catch (err) {
      storageAvailable = false;
    }
  }

  function updateStorageNote() {
    const el = byId("storage-note");
    if (!el) return;
    el.textContent = storageAvailable
      ? "Your entries are saved in this browser's local storage — they persist when you reload the page."
      : "Local storage is unavailable here, so entries will reset when you reload the page.";
  }

  /* ==========================================================================
     3. STATE
     ========================================================================== */
  const state = {
    entries: [],          // { id, type, quantity, date (YYYY-MM-DD), note, co2 }
    weeklyTarget: 25,
    nextId: 1,
    breakdownScope: "week",
    historyFilters: { search: "", type: "", category: "", range: "all", from: "", to: "" },
    historySort: { key: "date", dir: "desc" },
    historyPage: 1,
    rowsPerPage: 12,
    compareBudget: 5,
    sim: { carToBus: 0, meatSwap: 0, electricity: 0, flights: 0 },
    account: { name: "", hasChosen: false } // hasChosen = welcome prompt has been answered (named or skipped)
  };

  const charts = {};

  /* ==========================================================================
     4. UTILITIES
     ========================================================================== */
  function byId(id) { return document.getElementById(id); }

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = String(str == null ? "" : str);
    return d.innerHTML;
  }

  function fmt(n, places) {
    const p = places == null ? 2 : places;
    return Number(n).toFixed(p);
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#4ade80";
  }

  function todayISO() {
    const d = new Date();
    return isoFromDate(d);
  }

  function isoFromDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function dateFromISO(iso) {
    const parts = String(iso).split("-");
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  function prettyDate(iso) {
    return dateFromISO(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function shortDate(iso) {
    return dateFromISO(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  // Week starts Monday
  function startOfWeek(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
    d.setDate(d.getDate() - day);
    return d;
  }

  function daysBetween(aIso, bIso) {
    return Math.round((dateFromISO(bIso) - dateFromISO(aIso)) / 86400000);
  }

  function addDays(date, n) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setDate(d.getDate() + n);
    return d;
  }

  function showToast(message, type) {
    const container = byId("toast-container");
    const el = document.createElement("div");
    el.className = "toast" + (type ? " " + type : "");
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  function categoryPill(category) {
    const cls = { Travel: "pill-travel", Home: "pill-home", Food: "pill-food" }[category] || "pill-travel";
    return `<span class="pill ${cls}">${category}</span>`;
  }

  /* ==========================================================================
     5. CO₂ CALCULATION  — the core of the app
     ========================================================================== */
  function calculateCO2(type, quantity) {
    const f = FACTORS[type];
    if (!f) return 0;
    const q = Number(quantity);
    if (!isFinite(q) || q < 0) return 0;
    return Math.round(q * f.factor * 1000) / 1000;
  }

  function addEntry(type, quantity, date, note) {
    const entry = {
      id: state.nextId++,
      type,
      quantity: Number(quantity),
      date,
      note: note || "",
      co2: calculateCO2(type, quantity)
    };
    state.entries.push(entry);
    saveData();
    return entry;
  }

  function updateEntry(id, type, quantity, date, note) {
    const e = state.entries.find(x => x.id === id);
    if (!e) return null;
    e.type = type;
    e.quantity = Number(quantity);
    e.date = date;
    e.note = note || "";
    e.co2 = calculateCO2(type, quantity);
    saveData();
    return e;
  }

  function deleteEntry(id) {
    const idx = state.entries.findIndex(x => x.id === id);
    if (idx === -1) return false;
    state.entries.splice(idx, 1);
    saveData();
    return true;
  }

  /* ==========================================================================
     6. AGGREGATION HELPERS
     ========================================================================== */
  function entriesInRange(fromIso, toIso) {
    return state.entries.filter(e => e.date >= fromIso && e.date <= toIso);
  }

  function sumCO2(list) {
    return list.reduce((sum, e) => sum + e.co2, 0);
  }

  function currentWeekRange() {
    const start = startOfWeek(new Date());
    const end = addDays(start, 6);
    return { fromIso: isoFromDate(start), toIso: isoFromDate(end), start, end };
  }

  function getScopeEntries(scope) {
    const today = todayISO();
    if (scope === "week") {
      const r = currentWeekRange();
      return entriesInRange(r.fromIso, r.toIso);
    }
    if (scope === "month") {
      const from = isoFromDate(addDays(new Date(), -29));
      return entriesInRange(from, today);
    }
    return state.entries.slice();
  }

  function groupByType(list) {
    const map = {};
    Object.keys(FACTORS).forEach(t => { map[t] = { count: 0, quantity: 0, co2: 0 }; });
    list.forEach(e => {
      if (!map[e.type]) map[e.type] = { count: 0, quantity: 0, co2: 0 };
      map[e.type].count++;
      map[e.type].quantity += e.quantity;
      map[e.type].co2 += e.co2;
    });
    return map;
  }

  function groupByCategory(list) {
    const map = { Travel: 0, Home: 0, Food: 0 };
    list.forEach(e => {
      const cat = FACTORS[e.type] ? FACTORS[e.type].category : "Travel";
      map[cat] = (map[cat] || 0) + e.co2;
    });
    return map;
  }

  /* ==========================================================================
     7. DASHBOARD
     ========================================================================== */
  function renderDashboard() {
    const stats = computeStats();

    renderTargetBanner();
    renderEcoScore(stats);
    renderStreaks(stats);
    renderKPIs();
    renderCategoryChart();
    renderDailyChart();
    renderBreakdownTable();
    renderHeatmap(stats);
    renderAchievements(stats);
    renderEquivalents();
    renderTips();
    renderRecentTable();

    return stats;
  }

  function renderTargetBanner() {
    const r = currentWeekRange();
    const weekEntries = entriesInRange(r.fromIso, r.toIso);
    const weekTotal = sumCO2(weekEntries);
    const target = state.weeklyTarget;

    byId("tb-current").textContent = fmt(weekTotal);
    byId("tb-target").textContent = fmt(target);

    const pct = target > 0 ? (weekTotal / target) * 100 : 0;
    const fill = byId("progress-fill");
    fill.style.width = Math.min(100, pct) + "%";
    fill.className = "progress-fill" + (pct >= 100 ? " exceeded" : pct >= 80 ? " warning" : "");

    const banner = byId("target-banner");
    banner.className = "target-banner" + (pct >= 100 ? " exceeded" : pct >= 80 ? " warning" : "");

    const statusEl = byId("tb-status");
    if (pct >= 100) {
      statusEl.textContent = `⚠ Target exceeded by ${fmt(weekTotal - target)} kg CO₂e (${fmt(pct, 0)}% of target).`;
      statusEl.className = "tb-status over";
    } else if (pct >= 80) {
      statusEl.textContent = `Approaching your limit — ${fmt(target - weekTotal)} kg CO₂e remaining (${fmt(pct, 0)}% used).`;
      statusEl.className = "tb-status warn";
    } else {
      statusEl.textContent = `On track — ${fmt(target - weekTotal)} kg CO₂e remaining (${fmt(pct, 0)}% used).`;
      statusEl.className = "tb-status ok";
    }

    // Pace marker: where you "should" be by today if spending evenly
    const dayIndex = Math.min(6, Math.max(0, daysBetween(r.fromIso, todayISO())));
    const expectedPct = ((dayIndex + 1) / 7) * 100;
    const marker = byId("progress-marker");
    marker.classList.add("show");
    marker.style.left = Math.min(100, expectedPct) + "%";

    const expected = target * ((dayIndex + 1) / 7);
    const diff = weekTotal - expected;
    byId("tb-pace").textContent =
      `Day ${dayIndex + 1}/7 · even pace would be ${fmt(expected)} kg · you are ${diff >= 0 ? "+" : ""}${fmt(diff)} kg vs pace`;
  }

  function renderKPIs() {
    const today = todayISO();
    const r = currentWeekRange();

    const todayTotal = sumCO2(state.entries.filter(e => e.date === today));
    const weekTotal = sumCO2(entriesInRange(r.fromIso, r.toIso));
    const allTotal = sumCO2(state.entries);

    byId("kpi-today").textContent = fmt(todayTotal);
    byId("kpi-week").textContent = fmt(weekTotal);
    byId("kpi-total").textContent = fmt(allTotal);
    byId("kpi-entries").textContent = state.entries.length;

    // Daily average across the span of days actually logged
    let avg = 0;
    if (state.entries.length) {
      const dates = state.entries.map(e => e.date).sort();
      const span = Math.max(1, daysBetween(dates[0], dates[dates.length - 1]) + 1);
      avg = allTotal / span;
    }
    byId("kpi-avg").textContent = fmt(avg);

    // Biggest category this week (falls back to all time when the week is empty)
    const source = weekTotal > 0 ? entriesInRange(r.fromIso, r.toIso) : state.entries;
    const byType = groupByType(source);
    let topType = null, topValue = 0;
    Object.keys(byType).forEach(t => {
      if (byType[t].co2 > topValue) { topValue = byType[t].co2; topType = t; }
    });
    byId("kpi-top-cat").textContent = topType ? FACTORS[topType].label : "—";
    byId("kpi-top-cat-value").textContent = topType ? fmt(topValue) + " kg CO₂e" : "No entries yet";
  }

  function baseChartOptions(extra) {
    return Object.assign({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: cssVar("--text-dim"), font: { family: "Inter", size: 11 }, boxWidth: 12 } }
      }
    }, extra || {});
  }

  function renderCategoryChart() {
    const list = getScopeEntries(state.breakdownScope);
    const byType = groupByType(list);
    const types = Object.keys(FACTORS).filter(t => byType[t] && byType[t].co2 > 0);

    const hasData = types.length > 0;
    const data = {
      labels: hasData ? types.map(t => FACTORS[t].label) : ["No data yet"],
      datasets: [{
        data: hasData ? types.map(t => Math.round(byType[t].co2 * 100) / 100) : [1],
        backgroundColor: hasData
          ? types.map(t => CATEGORY_COLORS[FACTORS[t].category])
          : [cssVar("--bg-elevated")],
        borderWidth: 0
      }]
    };

    const opts = baseChartOptions({
      cutout: "58%",
      plugins: {
        legend: { position: "bottom", labels: { color: cssVar("--text-dim"), font: { size: 10 }, boxWidth: 10 } },
        tooltip: {
          callbacks: {
            label: ctx => hasData ? `${ctx.label}: ${fmt(ctx.parsed)} kg CO₂e` : "No entries logged"
          }
        }
      }
    });

    if (charts.category) {
      charts.category.data = data;
      charts.category.options = opts;
      charts.category.update();
    } else {
      charts.category = new Chart(byId("chart-category").getContext("2d"), { type: "doughnut", data, options: opts });
    }
  }

  function renderDailyChart() {
    const labels = [], values = [];
    for (let i = 6; i >= 0; i--) {
      const d = addDays(new Date(), -i);
      const iso = isoFromDate(d);
      labels.push(shortDate(iso));
      values.push(Math.round(sumCO2(state.entries.filter(e => e.date === iso)) * 100) / 100);
    }

    const dailyTarget = state.weeklyTarget / 7;

    const data = {
      labels,
      datasets: [
        {
          label: "Daily CO₂e (kg)",
          data: values,
          backgroundColor: values.map(v => v > dailyTarget ? cssVar("--red") : cssVar("--green")),
          borderRadius: 5,
          order: 2
        },
        {
          label: "Daily target",
          data: labels.map(() => Math.round(dailyTarget * 100) / 100),
          type: "line",
          borderColor: cssVar("--amber"),
          borderDash: [6, 4],
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          order: 1
        }
      ]
    };

    const opts = baseChartOptions({
      scales: {
        x: { ticks: { color: cssVar("--text-faint"), font: { size: 10 } }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: cssVar("--text-faint") }, grid: { color: "rgba(128,128,128,0.10)" } }
      }
    });

    if (charts.daily) {
      charts.daily.data = data;
      charts.daily.options = opts;
      charts.daily.update();
    } else {
      charts.daily = new Chart(byId("chart-daily").getContext("2d"), { type: "bar", data, options: opts });
    }
  }

  function renderBreakdownTable() {
    const list = getScopeEntries(state.breakdownScope);
    const byType = groupByType(list);
    const total = sumCO2(list);

    const scopeLabel = { week: "This week", month: "Last 30 days", all: "All time" }[state.breakdownScope];
    byId("breakdown-scope-label").textContent = scopeLabel;

    const rows = Object.keys(FACTORS)
      .map(t => ({ type: t, ...byType[t] }))
      .filter(r => r.count > 0)
      .sort((a, b) => b.co2 - a.co2);

    const tbody = byId("breakdown-table").querySelector("tbody");
    const tfoot = byId("breakdown-table").querySelector("tfoot");

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-row">No activities logged for this period yet.</td></tr>`;
      tfoot.innerHTML = "";
      return;
    }

    tbody.innerHTML = rows.map(r => {
      const f = FACTORS[r.type];
      const share = total > 0 ? (r.co2 / total) * 100 : 0;
      return `
        <tr>
          <td>${f.icon} ${escapeHtml(f.label)} ${categoryPill(f.category)}</td>
          <td class="num">${r.count}</td>
          <td class="num">${fmt(r.quantity, r.quantity % 1 === 0 ? 0 : 2)} ${f.unit}${r.quantity !== 1 && f.unit === "meal" ? "s" : ""}</td>
          <td class="num">${fmt(r.co2)}</td>
          <td>
            <div class="share-bar">
              <div class="share-track"><div class="share-fill" style="width:${share}%;background:${CATEGORY_COLORS[f.category]}"></div></div>
              <span class="share-pct">${fmt(share, 1)}%</span>
            </div>
          </td>
        </tr>`;
    }).join("");

    tfoot.innerHTML = `<tr><td>Total</td><td>${list.length}</td><td>—</td><td>${fmt(total)} kg</td><td>100%</td></tr>`;
  }

  function renderEquivalents() {
    const r = currentWeekRange();
    const total = sumCO2(entriesInRange(r.fromIso, r.toIso));

    // Rough, commonly cited equivalence factors
    const equivalents = [
      { icon: "🌳", value: (total / 21).toFixed(2), label: "tree-years to absorb" },
      { icon: "🚗", value: (total / 0.20).toFixed(0), label: "km of car travel" },
      { icon: "📱", value: (total / 0.0084).toFixed(0), label: "smartphone charges" },
      { icon: "💡", value: (total / 0.80).toFixed(1), label: "kWh of electricity" }
    ];

    byId("equiv-grid").innerHTML = equivalents.map(e => `
      <div class="equiv-card">
        <span class="equiv-icon">${e.icon}</span>
        <span class="equiv-value">${e.value}</span>
        <span class="equiv-label">${e.label}</span>
      </div>
    `).join("");
  }

  function renderTips() {
    const tips = [];
    const r = currentWeekRange();
    const weekEntries = entriesInRange(r.fromIso, r.toIso);
    const weekTotal = sumCO2(weekEntries);
    const byType = groupByType(weekEntries);

    if (!state.entries.length) {
      tips.push({ type: "", icon: "👋", text: "Log your first activity to start seeing personalised suggestions here." });
    } else {
      // Car vs bus
      if (byType.car.co2 > 0) {
        const busEquivalent = byType.car.quantity * FACTORS.bus.factor;
        const saving = byType.car.co2 - busEquivalent;
        if (saving > 0.1) {
          tips.push({
            type: "warn",
            icon: "🚌",
            text: `You logged ${fmt(byType.car.quantity, 1)} km by car this week. The same distance by bus would emit ${fmt(busEquivalent)} kg instead of ${fmt(byType.car.co2)} kg — a saving of ${fmt(saving)} kg CO₂e.`
          });
        }
      }

      // Meals
      if (byType.nonveg_meal.count > 0) {
        const swapSaving = byType.nonveg_meal.count * (FACTORS.nonveg_meal.factor - FACTORS.veg_meal.factor);
        tips.push({
          type: "warn",
          icon: "🥗",
          text: `${byType.nonveg_meal.count} non-veg meal${byType.nonveg_meal.count === 1 ? "" : "s"} logged this week (${fmt(byType.nonveg_meal.co2)} kg). Swapping them all for vegetarian meals would save ${fmt(swapSaving)} kg CO₂e.`
        });
      }

      // Electricity
      if (byType.electricity.co2 > weekTotal * 0.3 && byType.electricity.co2 > 0) {
        tips.push({
          type: "warn",
          icon: "⚡",
          text: `Electricity accounts for ${fmt((byType.electricity.co2 / weekTotal) * 100, 0)}% of this week's footprint (${fmt(byType.electricity.co2)} kg). Cutting 20% of your usage would save ${fmt(byType.electricity.co2 * 0.2)} kg CO₂e.`
        });
      }

      // Flight
      if (byType.flight.co2 > 0) {
        tips.push({
          type: "alert",
          icon: "✈️",
          text: `A single flight of ${fmt(byType.flight.quantity, 0)} km contributed ${fmt(byType.flight.co2)} kg CO₂e — that's ${fmt(byType.flight.co2 / (state.weeklyTarget || 1), 1)}× your entire weekly target.`
        });
      }

      // Target status
      if (weekTotal > state.weeklyTarget) {
        tips.push({
          type: "alert",
          icon: "🚨",
          text: `You're ${fmt(weekTotal - state.weeklyTarget)} kg over your weekly target. Focus on your largest category to bring it back down.`
        });
      } else if (weekTotal > 0 && weekTotal < state.weeklyTarget * 0.6) {
        tips.push({
          type: "good",
          icon: "✅",
          text: `Strong week — you're using only ${fmt((weekTotal / state.weeklyTarget) * 100, 0)}% of your target with ${fmt(state.weeklyTarget - weekTotal)} kg to spare.`
        });
      }

      // Best day
      if (weekEntries.length) {
        const byDay = {};
        weekEntries.forEach(e => { byDay[e.date] = (byDay[e.date] || 0) + e.co2; });
        const sortedDays = Object.keys(byDay).sort((a, b) => byDay[b] - byDay[a]);
        const worst = sortedDays[0];
        tips.push({
          type: "",
          icon: "📅",
          text: `Your highest-emission day this week was ${prettyDate(worst)} at ${fmt(byDay[worst])} kg CO₂e.`
        });
      }
    }

    byId("tips-list").innerHTML = tips.map(t => `
      <div class="tip-card ${t.type}">
        <span class="tip-icon">${t.icon}</span>
        <span>${t.text}</span>
      </div>
    `).join("");
  }

  function renderRecentTable() {
    const recent = state.entries
      .slice()
      .sort((a, b) => (b.date === a.date ? b.id - a.id : b.date.localeCompare(a.date)))
      .slice(0, 8);

    const tbody = byId("recent-table").querySelector("tbody");
    if (!recent.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-row">No activities logged yet — head to "Log Activity" to add your first.</td></tr>`;
      return;
    }

    tbody.innerHTML = recent.map(e => {
      const f = FACTORS[e.type];
      return `
        <tr>
          <td class="num">${shortDate(e.date)}</td>
          <td>${f.icon} ${escapeHtml(f.label)}</td>
          <td class="num">${fmt(e.quantity, e.quantity % 1 === 0 ? 0 : 2)} ${f.unit}</td>
          <td class="num">${fmt(e.co2)} kg</td>
          <td>${categoryPill(f.category)}</td>
        </tr>`;
    }).join("");
  }

  /* ==========================================================================
     8. LOG FORM
     ========================================================================== */
  function updateUnitDisplay() {
    const type = byId("activity-type").value;
    const f = FACTORS[type];
    byId("qty-unit").textContent = f.unit;
    byId("unit-hint").textContent = `(${f.unit})`;

    byId("quick-chips").innerHTML = (QUICK_QUANTITIES[type] || []).map(q =>
      `<button type="button" class="chip" data-quick-qty="${q}">${q} ${f.unit}</button>`
    ).join("");

    updateLivePreview();
  }

  function updateLivePreview() {
    const type = byId("activity-type").value;
    const qty = parseFloat(byId("quantity").value);
    const f = FACTORS[type];

    if (!isFinite(qty) || qty <= 0) {
      byId("lp-value").textContent = "0.00";
      byId("lp-formula").textContent = `${f.factor} kg CO₂e per ${f.unit}`;
      return;
    }

    const co2 = calculateCO2(type, qty);
    byId("lp-value").textContent = fmt(co2);
    byId("lp-formula").textContent = `${fmt(qty, qty % 1 === 0 ? 0 : 2)} ${f.unit} × ${f.factor} kg/${f.unit} = ${fmt(co2)} kg CO₂e`;
  }

  function resetLogForm() {
    byId("edit-id").value = "";
    byId("log-form").reset();
    byId("entry-date").value = todayISO();
    byId("log-form-title").textContent = "Log an Activity";
    byId("log-form-tag").textContent = "New entry";
    byId("log-submit-btn").textContent = "Add Entry";
    byId("cancel-edit-btn").hidden = true;
    byId("quantity-error").classList.remove("visible");
    updateUnitDisplay();
  }

  function startEdit(id) {
    const e = state.entries.find(x => x.id === id);
    if (!e) return;
    switchTab("log");
    byId("edit-id").value = e.id;
    byId("activity-type").value = e.type;
    byId("quantity").value = e.quantity;
    byId("entry-date").value = e.date;
    byId("entry-note").value = e.note;
    byId("log-form-title").textContent = "Edit Activity";
    byId("log-form-tag").textContent = "Editing entry #" + e.id;
    byId("log-submit-btn").textContent = "Save Changes";
    byId("cancel-edit-btn").hidden = false;
    updateUnitDisplay();
  }

  function handleLogSubmit(ev) {
    ev.preventDefault();

    const type = byId("activity-type").value;
    const qty = parseFloat(byId("quantity").value);
    const date = byId("entry-date").value;
    const note = byId("entry-note").value.trim();
    const editId = byId("edit-id").value;

    if (!isFinite(qty) || qty <= 0) {
      byId("quantity-error").classList.add("visible");
      byId("quantity").focus();
      return;
    }
    byId("quantity-error").classList.remove("visible");

    if (!date) {
      showToast("Please choose a date for this activity.", "error");
      return;
    }

    if (editId) {
      updateEntry(Number(editId), type, qty, date, note);
      showToast("Entry updated.", "");
    } else {
      const e = addEntry(type, qty, date, note);
      showToast(`Logged ${FACTORS[type].label.toLowerCase()} — ${fmt(e.co2)} kg CO₂e.`, "");
      checkTargetAlert();
    }

    resetLogForm();
    refreshAll();
  }

  function checkTargetAlert() {
    const r = currentWeekRange();
    const weekTotal = sumCO2(entriesInRange(r.fromIso, r.toIso));
    if (weekTotal > state.weeklyTarget) {
      showToast(`⚠ You've exceeded your weekly target by ${fmt(weekTotal - state.weeklyTarget)} kg CO₂e.`, "error");
    } else if (weekTotal > state.weeklyTarget * 0.8) {
      showToast(`You're at ${fmt((weekTotal / state.weeklyTarget) * 100, 0)}% of your weekly target.`, "warn");
    }
  }

  /* ==========================================================================
     9. QUICK ADD & TODAY'S ENTRIES
     ========================================================================== */
  function renderQuickAdd() {
    byId("quickadd-grid").innerHTML = QUICK_ADD.map((q, i) => {
      const f = FACTORS[q.type];
      const co2 = calculateCO2(q.type, q.quantity);
      return `
        <button type="button" class="quickadd-btn" data-quickadd="${i}">
          <span class="qa-title">${f.icon} ${escapeHtml(q.title)}</span>
          <span class="qa-meta">${q.quantity} ${f.unit} → ${fmt(co2)} kg CO₂e</span>
        </button>`;
    }).join("");
  }

  function renderTodayEntries() {
    const today = todayISO();
    const list = state.entries.filter(e => e.date === today).sort((a, b) => b.id - a.id);
    const container = byId("today-entries");

    if (!list.length) {
      container.innerHTML = `<p class="today-empty">Nothing logged today yet.</p>`;
      return;
    }

    container.innerHTML = list.map(e => {
      const f = FACTORS[e.type];
      return `
        <div class="today-entry">
          <span>${f.icon} ${escapeHtml(f.label)} · ${fmt(e.quantity, e.quantity % 1 === 0 ? 0 : 2)} ${f.unit}</span>
          <span>
            <span class="te-co2">${fmt(e.co2)} kg</span>
            <button class="row-btn delete" data-delete="${e.id}" title="Delete">✕</button>
          </span>
        </div>`;
    }).join("");
  }

  /* ==========================================================================
     10. HISTORY  (filter + sort + paginate)
     ========================================================================== */
  function getFilteredEntries() {
    const f = state.historyFilters;
    const today = todayISO();

    return state.entries.filter(e => {
      const meta = FACTORS[e.type];

      if (f.type && e.type !== f.type) return false;
      if (f.category && meta.category !== f.category) return false;

      if (f.search) {
        const q = f.search.toLowerCase();
        if (!meta.label.toLowerCase().includes(q) && !(e.note || "").toLowerCase().includes(q)) return false;
      }

      if (f.range === "today" && e.date !== today) return false;

      if (f.range === "week") {
        const r = currentWeekRange();
        if (e.date < r.fromIso || e.date > r.toIso) return false;
      }

      if (f.range === "month") {
        const from = isoFromDate(addDays(new Date(), -29));
        if (e.date < from || e.date > today) return false;
      }

      if (f.range === "custom") {
        if (f.from && e.date < f.from) return false;
        if (f.to && e.date > f.to) return false;
      }

      return true;
    });
  }

  function getSortedEntries(list) {
    const { key, dir } = state.historySort;
    return list.slice().sort((a, b) => {
      let av, bv;
      if (key === "typeLabel") { av = FACTORS[a.type].label; bv = FACTORS[b.type].label; }
      else if (key === "category") { av = FACTORS[a.type].category; bv = FACTORS[b.type].category; }
      else { av = a[key]; bv = b[key]; }

      if (typeof av === "string") { av = av.toLowerCase(); bv = bv.toLowerCase(); }
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
      return b.id - a.id;
    });
  }

  function renderHistory() {
    const filtered = getFilteredEntries();
    const sorted = getSortedEntries(filtered);

    const total = sumCO2(filtered);
    const avg = filtered.length ? total / filtered.length : 0;
    const biggest = filtered.reduce((max, e) => (e.co2 > (max ? max.co2 : 0) ? e : max), null);

    byId("history-summary").innerHTML = `
      <span class="hs-item">Entries: <strong>${filtered.length}</strong></span>
      <span class="hs-item">Total: <strong>${fmt(total)} kg CO₂e</strong></span>
      <span class="hs-item">Average per entry: <strong>${fmt(avg)} kg</strong></span>
      <span class="hs-item">Largest single entry: <strong>${biggest ? fmt(biggest.co2) + " kg" : "—"}</strong></span>
    `;

    const totalPages = Math.max(1, Math.ceil(sorted.length / state.rowsPerPage));
    state.historyPage = Math.min(state.historyPage, totalPages);
    const start = (state.historyPage - 1) * state.rowsPerPage;
    const pageItems = sorted.slice(start, start + state.rowsPerPage);

    const tbody = byId("history-body");
    if (!pageItems.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-row">No activities match these filters.</td></tr>`;
    } else {
      tbody.innerHTML = pageItems.map(e => {
        const f = FACTORS[e.type];
        return `
          <tr>
            <td class="num">${prettyDate(e.date)}</td>
            <td>${f.icon} ${escapeHtml(f.label)}</td>
            <td>${categoryPill(f.category)}</td>
            <td class="num">${fmt(e.quantity, e.quantity % 1 === 0 ? 0 : 2)} ${f.unit}</td>
            <td class="num">${fmt(e.co2)}</td>
            <td class="note-cell">${escapeHtml(e.note) || "—"}</td>
            <td>
              <button class="row-btn" data-edit="${e.id}">Edit</button>
              <button class="row-btn delete" data-delete="${e.id}">Delete</button>
            </td>
          </tr>`;
      }).join("");
    }

    document.querySelectorAll("#history-table th[data-sort]").forEach(th => {
      th.classList.remove("sorted-asc", "sorted-desc");
      if (th.dataset.sort === state.historySort.key) {
        th.classList.add(state.historySort.dir === "asc" ? "sorted-asc" : "sorted-desc");
      }
    });

    renderHistoryPagination(totalPages);
  }

  function renderHistoryPagination(totalPages) {
    const container = byId("history-pagination");
    if (totalPages <= 1) { container.innerHTML = ""; return; }

    let html = `<button class="page-btn" data-page="prev" ${state.historyPage === 1 ? "disabled" : ""}>‹</button>`;
    const windowSize = 5;
    let startP = Math.max(1, state.historyPage - Math.floor(windowSize / 2));
    let endP = Math.min(totalPages, startP + windowSize - 1);
    startP = Math.max(1, endP - windowSize + 1);

    for (let p = startP; p <= endP; p++) {
      html += `<button class="page-btn ${p === state.historyPage ? "active" : ""}" data-page="${p}">${p}</button>`;
    }
    html += `<button class="page-btn" data-page="next" ${state.historyPage === totalPages ? "disabled" : ""}>›</button>`;
    container.innerHTML = html;
  }

  function exportCSV() {
    const list = getSortedEntries(getFilteredEntries());
    if (!list.length) { showToast("Nothing to export with the current filters.", "error"); return; }

    const headers = ["Date", "Activity", "Category", "Quantity", "Unit", "Factor (kg/unit)", "CO2e (kg)", "Note"];
    const rows = list.map(e => {
      const f = FACTORS[e.type];
      return [e.date, f.label, f.category, e.quantity, f.unit, f.factor, fmt(e.co2), e.note]
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "planet-pulse-export.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Exported ${list.length} entries to CSV.`, "");
  }

  /* ==========================================================================
     11. TARGET VIEW
     ========================================================================== */
  function renderTargetPresets() {
    byId("target-presets").innerHTML = TARGET_PRESETS.map(p =>
      `<button type="button" class="preset-btn" data-preset="${p.value}">${p.label}</button>`
    ).join("");
  }

  function getWeeklyBuckets(count) {
    const buckets = [];
    const thisWeekStart = startOfWeek(new Date());

    for (let i = count - 1; i >= 0; i--) {
      const start = addDays(thisWeekStart, -7 * i);
      const end = addDays(start, 6);
      const fromIso = isoFromDate(start);
      const toIso = isoFromDate(end);
      const list = entriesInRange(fromIso, toIso);
      buckets.push({
        startIso: fromIso,
        label: shortDate(fromIso),
        entries: list.length,
        total: sumCO2(list),
        isCurrent: i === 0
      });
    }
    return buckets;
  }

  function renderTargetView() {
    byId("target-input").value = state.weeklyTarget;

    const r = currentWeekRange();
    const weekTotal = sumCO2(entriesInRange(r.fromIso, r.toIso));
    const pct = state.weeklyTarget > 0 ? (weekTotal / state.weeklyTarget) * 100 : 0;

    byId("target-readout").innerHTML = `
      Current week (${shortDate(r.fromIso)} – ${shortDate(r.toIso)}):
      <strong>${fmt(weekTotal)} kg</strong> of <strong>${fmt(state.weeklyTarget)} kg</strong>
      (${fmt(pct, 0)}%). Daily allowance at this target is <strong>${fmt(state.weeklyTarget / 7)} kg/day</strong>.
      ${weekTotal > state.weeklyTarget
        ? `<br><span class="result-badge result-over">Exceeded by ${fmt(weekTotal - state.weeklyTarget)} kg</span>`
        : `<br><span class="result-badge result-under">${fmt(state.weeklyTarget - weekTotal)} kg remaining</span>`}
    `;

    renderWeeklyChart();
    renderWeeklyTable();
  }

  function renderWeeklyChart() {
    const buckets = getWeeklyBuckets(6);

    const data = {
      labels: buckets.map(b => "Wk " + b.label),
      datasets: [
        {
          label: "Weekly CO₂e (kg)",
          data: buckets.map(b => Math.round(b.total * 100) / 100),
          backgroundColor: buckets.map(b => b.total > state.weeklyTarget ? cssVar("--red") : cssVar("--green")),
          borderRadius: 5,
          order: 2
        },
        {
          label: "Target",
          data: buckets.map(() => state.weeklyTarget),
          type: "line",
          borderColor: cssVar("--amber"),
          borderDash: [6, 4],
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          order: 1
        }
      ]
    };

    const opts = baseChartOptions({
      scales: {
        x: { ticks: { color: cssVar("--text-faint"), font: { size: 10 } }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: cssVar("--text-faint") }, grid: { color: "rgba(128,128,128,0.10)" } }
      }
    });

    if (charts.weekly) {
      charts.weekly.data = data;
      charts.weekly.options = opts;
      charts.weekly.update();
    } else {
      charts.weekly = new Chart(byId("chart-weekly").getContext("2d"), { type: "bar", data, options: opts });
    }
  }

  function renderWeeklyTable() {
    const buckets = getWeeklyBuckets(6).slice().reverse();
    const tbody = byId("weekly-table").querySelector("tbody");

    tbody.innerHTML = buckets.map(b => {
      const diff = b.total - state.weeklyTarget;
      const over = diff > 0;
      return `
        <tr>
          <td>${prettyDate(b.startIso)}${b.isCurrent ? " <span class=\"panel-tag\">current</span>" : ""}</td>
          <td class="num">${b.entries}</td>
          <td class="num">${fmt(b.total)} kg</td>
          <td class="num">${fmt(state.weeklyTarget)} kg</td>
          <td class="num">${over ? "+" : ""}${fmt(diff)} kg</td>
          <td><span class="result-badge ${over ? "result-over" : "result-under"}">${over ? "Exceeded" : "Under target"}</span></td>
        </tr>`;
    }).join("");
  }

  /* ==========================================================================
     12. FACTORS VIEW
     ========================================================================== */
  function renderFactorsTable() {
    byId("factors-table").querySelector("tbody").innerHTML = Object.keys(FACTORS).map(t => {
      const f = FACTORS[t];
      return `
        <tr>
          <td>${f.icon} ${escapeHtml(f.label)}</td>
          <td>${categoryPill(f.category)}</td>
          <td class="num">${f.factor.toFixed(2)}</td>
          <td class="num">kg CO₂e / ${f.unit}</td>
          <td class="num">${f.example}</td>
        </tr>`;
    }).join("");
  }

  function renderCompare() {
    const budget = state.compareBudget;
    byId("compare-budget-value").textContent = fmt(budget, 1) + " kg CO₂e";

    byId("compare-grid").innerHTML = Object.keys(FACTORS).map(t => {
      const f = FACTORS[t];
      const amount = budget / f.factor;
      return `
        <div class="compare-card">
          <span class="cc-name">${f.icon} ${escapeHtml(f.label)}</span>
          <span class="cc-value">${fmt(amount, amount >= 100 ? 0 : 1)}</span>
          <span class="cc-unit">${f.unit}${amount !== 1 ? "s" : ""} for ${fmt(budget, 1)} kg CO₂e</span>
        </div>`;
    }).join("");
  }

  /* ==========================================================================
     13. SAMPLE DATA
     ========================================================================== */
  function loadSampleData() {
    const templates = [
      { type: "car", qty: [4, 25], note: "Commute" },
      { type: "bus", qty: [5, 20], note: "Commute" },
      { type: "electricity", qty: [2, 9], note: "Household" },
      { type: "veg_meal", qty: [1, 2], note: "" },
      { type: "nonveg_meal", qty: [1, 2], note: "" }
    ];

    let added = 0;
    for (let d = 13; d >= 0; d--) {
      const iso = isoFromDate(addDays(new Date(), -d));
      const perDay = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < perDay; i++) {
        const t = templates[Math.floor(Math.random() * templates.length)];
        const min = t.qty[0], max = t.qty[1];
        const qty = Math.round((min + Math.random() * (max - min)) * 10) / 10;
        addEntry(t.type, qty, iso, t.note);
        added++;
      }
    }

    // One flight for demonstration
    addEntry("flight", 850, isoFromDate(addDays(new Date(), -9)), "Trip home");
    added++;

    refreshAll();
    showToast(`Loaded ${added} sample entries across the last two weeks.`, "");
  }

  /* ==========================================================================
     13b. STATS ENGINE — powers eco score, streaks and achievements
     ========================================================================== */
  function dailyTotals() {
    const map = {};
    state.entries.forEach(e => { map[e.date] = (map[e.date] || 0) + e.co2; });
    return map;
  }

  function computeLoggingStreak(byDay) {
    let streak = 0;
    for (let i = 0; i < 400; i++) {
      const iso = isoFromDate(addDays(new Date(), -i));
      if (byDay[iso] != null) streak++;
      else if (i === 0) continue;   // today may not be logged yet — don't break the streak
      else break;
    }
    return streak;
  }

  function computeGreenStreak(byDay) {
    const dailyBudget = state.weeklyTarget / 7;
    let streak = 0;
    for (let i = 0; i < 400; i++) {
      const iso = isoFromDate(addDays(new Date(), -i));
      const total = byDay[iso];
      if (total == null) { if (i === 0) continue; break; }
      if (total <= dailyBudget) streak++;
      else break;
    }
    return streak;
  }

  function computeStats() {
    const byDay = dailyTotals();
    const byType = groupByType(state.entries);
    const r = currentWeekRange();
    const weekTotal = sumCO2(entriesInRange(r.fromIso, r.toIso));

    // Weeks fully completed under target
    const buckets = getWeeklyBuckets(12);
    const weeksUnderTarget = buckets.filter(b => !b.isCurrent && b.entries > 0 && b.total <= state.weeklyTarget).length;

    // Days where every meal logged was vegetarian (and at least one meal existed)
    const mealsByDay = {};
    state.entries.forEach(e => {
      if (e.type !== "veg_meal" && e.type !== "nonveg_meal") return;
      if (!mealsByDay[e.date]) mealsByDay[e.date] = { veg: 0, nonveg: 0 };
      if (e.type === "veg_meal") mealsByDay[e.date].veg++;
      else mealsByDay[e.date].nonveg++;
    });
    const hasVegOnlyDay = Object.keys(mealsByDay).some(d => mealsByDay[d].veg > 0 && mealsByDay[d].nonveg === 0);
    const hasSubTwoDay = Object.keys(byDay).some(d => byDay[d] > 0 && byDay[d] < 2);

    const distinctTypes = Object.keys(byType).filter(t => byType[t].count > 0).length;
    const loggedDays = Object.keys(byDay).length;

    const stats = {
      totalEntries: state.entries.length,
      totalCO2: sumCO2(state.entries),
      loggedDays,
      weekTotal,
      loggingStreak: computeLoggingStreak(byDay),
      greenStreak: computeGreenStreak(byDay),
      weeksUnderTarget,
      hasVegOnlyDay,
      hasSubTwoDay,
      distinctTypes,
      carKm: byType.car.quantity,
      busKm: byType.bus.quantity,
      byDay,
      byType
    };

    Object.assign(stats, computeEcoScore(stats));
    return stats;
  }

  /* --------------------------------------------------------------------------
     ECO SCORE — three weighted sub-scores, 0–100 overall
     -------------------------------------------------------------------------- */
  function computeEcoScore(stats) {
    // 1. Target adherence — measured against the pro-rated pace for days elapsed
    //    so a mid-week score isn't flattered and a full week isn't punished.
    let adherence = 50;
    if (state.weeklyTarget > 0) {
      const r = currentWeekRange();
      const daysElapsed = Math.min(7, Math.max(1, daysBetween(r.fromIso, todayISO()) + 1));
      const expected = state.weeklyTarget * (daysElapsed / 7);
      const ratio = expected > 0 ? stats.weekTotal / expected : 0;
      // on pace (ratio 1) → 70 · half pace → 100 · double pace → 0
      adherence = Math.round(clamp((2 - ratio) * 70, 0, 100));
    }

    // 2. Consistency — logging days out of the last 14
    let logged14 = 0;
    for (let i = 0; i < 14; i++) {
      if (stats.byDay[isoFromDate(addDays(new Date(), -i))] != null) logged14++;
    }
    const consistency = Math.round((logged14 / 14) * 100);

    // 3. Activity mix — share of emissions from lower-carbon choices
    const bt = stats.byType;
    const cleanCO2 = bt.bus.co2 + bt.veg_meal.co2;
    const dirtyCO2 = bt.car.co2 + bt.flight.co2 + bt.nonveg_meal.co2 + bt.electricity.co2;
    const totalMix = cleanCO2 + dirtyCO2;
    const mix = totalMix > 0 ? Math.round(clamp((cleanCO2 / totalMix) * 240, 0, 100)) : 50;

    const ecoScore = state.entries.length
      ? Math.round(adherence * 0.5 + consistency * 0.25 + mix * 0.25)
      : 0;

    let grade = "—";
    if (state.entries.length) {
      if (ecoScore >= 90) grade = "A+";
      else if (ecoScore >= 80) grade = "A";
      else if (ecoScore >= 70) grade = "B";
      else if (ecoScore >= 60) grade = "C";
      else if (ecoScore >= 45) grade = "D";
      else grade = "E";
    }

    return { ecoScore, grade, subScores: { adherence, consistency, mix } };
  }

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

  function renderEcoScore(stats) {
    const CIRC = 527.79;
    const pct = stats.ecoScore / 100;
    const fill = byId("score-ring-fill");
    fill.style.strokeDashoffset = CIRC * (1 - pct);

    const color = stats.ecoScore >= 80 ? cssVar("--green")
      : stats.ecoScore >= 60 ? cssVar("--cyan")
      : stats.ecoScore >= 45 ? cssVar("--amber")
      : cssVar("--red");
    fill.style.stroke = color;

    byId("score-grade").textContent = stats.grade;
    byId("score-grade").style.color = color;
    byId("score-value").textContent = stats.ecoScore;

    const titles = {
      "A+": "Outstanding", "A": "Excellent", "B": "Doing well",
      "C": "Room to improve", "D": "Needs attention", "E": "High impact", "—": "Start logging"
    };
    byId("score-title").textContent = titles[stats.grade];

    byId("score-desc").textContent = state.entries.length
      ? `Weighted from target adherence (50%), logging consistency (25%) and the share of your emissions coming from lower-carbon choices (25%).`
      : `Your score blends how close you stay to target, how consistently you log, and how clean your activity mix is.`;

    const bars = [
      { name: "Adherence", value: stats.subScores.adherence },
      { name: "Consistency", value: stats.subScores.consistency },
      { name: "Activity mix", value: stats.subScores.mix }
    ];
    byId("score-bars").innerHTML = bars.map(b => `
      <div class="score-bar-row">
        <span class="sb-name">${b.name}</span>
        <span class="sb-track"><span class="sb-fill" style="width:${b.value}%;background:${
          b.value >= 70 ? cssVar("--green") : b.value >= 45 ? cssVar("--amber") : cssVar("--red")
        }"></span></span>
        <span class="sb-pct">${b.value}</span>
      </div>
    `).join("");
  }

  function renderStreaks(stats) {
    byId("streak-logging").textContent = stats.loggingStreak;
    byId("streak-green").textContent = stats.greenStreak;

    // Forecast: project the current week's total from the pace so far
    const r = currentWeekRange();
    const dayIndex = Math.min(6, Math.max(0, daysBetween(r.fromIso, todayISO())));
    const daysElapsed = dayIndex + 1;
    const projected = daysElapsed > 0 ? (stats.weekTotal / daysElapsed) * 7 : 0;

    byId("forecast-value").textContent = fmt(projected, 1);

    const over = projected > state.weeklyTarget;
    byId("forecast-note").textContent = state.entries.length
      ? `At your current pace this week lands around ${fmt(projected)} kg — ${over
          ? `${fmt(projected - state.weeklyTarget)} kg over target.`
          : `${fmt(state.weeklyTarget - projected)} kg under target.`}`
      : "Log an activity to see a projection for this week.";
  }

  /* --------------------------------------------------------------------------
     HEATMAP CALENDAR
     -------------------------------------------------------------------------- */
  function renderHeatmap(stats) {
    const WEEKS = 12;
    const dailyBudget = state.weeklyTarget / 7;
    const start = addDays(startOfWeek(new Date()), -7 * (WEEKS - 1));

    let html = "";
    for (let w = 0; w < WEEKS; w++) {
      for (let d = 0; d < 7; d++) {
        const day = addDays(start, w * 7 + d);
        const iso = isoFromDate(day);

        if (iso > todayISO()) {
          html += `<span class="heat-cell heat-empty"></span>`;
          continue;
        }

        const total = stats.byDay[iso] || 0;
        let level = 0;
        if (total > 0) {
          const ratio = dailyBudget > 0 ? total / dailyBudget : 0;
          level = ratio <= 0.5 ? 1 : ratio <= 1 ? 2 : ratio <= 1.5 ? 3 : 4;
        }
        html += `<span class="heat-cell heat-${level}" title="${prettyDate(iso)} — ${fmt(total)} kg CO₂e"></span>`;
      }
    }
    byId("heatmap").innerHTML = html;
  }

  /* --------------------------------------------------------------------------
     ACHIEVEMENTS
     -------------------------------------------------------------------------- */
  function renderAchievements(stats) {
    let unlocked = 0;
    const html = ACHIEVEMENTS.map(a => {
      let isUnlocked = false;
      try { isUnlocked = !!a.test(stats); } catch (err) { isUnlocked = false; }
      if (isUnlocked) unlocked++;
      return `
        <div class="badge-card ${isUnlocked ? "unlocked" : ""}">
          <span class="badge-icon">${a.icon}</span>
          <span class="badge-name">${escapeHtml(a.name)}</span>
          <span class="badge-desc">${escapeHtml(a.desc)}</span>
        </div>`;
    }).join("");

    byId("badge-grid").innerHTML = html;
    byId("achievement-progress").textContent = `${unlocked} / ${ACHIEVEMENTS.length} unlocked`;
    byId("badge-count").textContent = unlocked;
    return unlocked;
  }

  /* ==========================================================================
     13c. SIMULATOR
     ========================================================================== */
  function simulate() {
    const from = isoFromDate(addDays(new Date(), -29));
    const list = entriesInRange(from, todayISO());
    const s = state.sim;

    let before = 0, after = 0;
    const beforeByCat = { Travel: 0, Home: 0, Food: 0 };
    const afterByCat = { Travel: 0, Home: 0, Food: 0 };

    list.forEach(e => {
      const f = FACTORS[e.type];
      before += e.co2;
      beforeByCat[f.category] += e.co2;

      let adjusted = e.co2;

      if (e.type === "car" && s.carToBus > 0) {
        const shifted = e.quantity * (s.carToBus / 100);
        const kept = e.quantity - shifted;
        adjusted = kept * FACTORS.car.factor + shifted * FACTORS.bus.factor;
      } else if (e.type === "nonveg_meal" && s.meatSwap > 0) {
        const swapped = e.quantity * (s.meatSwap / 100);
        const kept = e.quantity - swapped;
        adjusted = kept * FACTORS.nonveg_meal.factor + swapped * FACTORS.veg_meal.factor;
      } else if (e.type === "electricity" && s.electricity > 0) {
        adjusted = e.co2 * (1 - s.electricity / 100);
      } else if (e.type === "flight" && s.flights > 0) {
        adjusted = e.co2 * (1 - s.flights / 100);
      }

      after += adjusted;
      afterByCat[f.category] += adjusted;
    });

    return { before, after, beforeByCat, afterByCat, entryCount: list.length };
  }

  function renderSimulator() {
    const s = state.sim;
    byId("sim-car-to-bus-val").textContent = s.carToBus + "%";
    byId("sim-meat-swap-val").textContent = s.meatSwap + "%";
    byId("sim-electricity-val").textContent = s.electricity + "%";
    byId("sim-flights-val").textContent = s.flights + "%";

    const result = simulate();
    byId("sim-before").textContent = fmt(result.before);
    byId("sim-after").textContent = fmt(result.after);

    const saved = result.before - result.after;
    const savingEl = byId("sim-saving");

    if (!result.entryCount) {
      savingEl.textContent = "No activities logged in the last 30 days — log some data or load the sample set to simulate.";
      savingEl.className = "sim-saving";
    } else if (saved <= 0.001) {
      savingEl.textContent = "No change yet — move a slider to model a habit change.";
      savingEl.className = "sim-saving";
    } else {
      const pct = result.before > 0 ? (saved / result.before) * 100 : 0;
      const annual = saved * (365 / 30);
      savingEl.innerHTML = `You would save <strong>${fmt(saved)} kg CO₂e</strong> over 30 days — a <strong>${fmt(pct, 1)}%</strong> cut, or roughly <strong>${fmt(annual, 0)} kg</strong> across a year (${fmt(annual / 21, 1)} tree-years of absorption).`;
      savingEl.className = "sim-saving positive";
    }

    renderSimChart(result);
  }

  function renderSimChart(result) {
    const cats = ["Travel", "Home", "Food"];
    const data = {
      labels: cats,
      datasets: [
        {
          label: "Current",
          data: cats.map(c => Math.round(result.beforeByCat[c] * 100) / 100),
          backgroundColor: cssVar("--text-faint"),
          borderRadius: 5
        },
        {
          label: "Simulated",
          data: cats.map(c => Math.round(result.afterByCat[c] * 100) / 100),
          backgroundColor: cssVar("--green"),
          borderRadius: 5
        }
      ]
    };

    const opts = baseChartOptions({
      scales: {
        x: { ticks: { color: cssVar("--text-faint") }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: cssVar("--text-faint") }, grid: { color: "rgba(128,128,128,0.10)" } }
      }
    });

    if (charts.sim) {
      charts.sim.data = data;
      charts.sim.options = opts;
      charts.sim.update();
    } else {
      charts.sim = new Chart(byId("chart-sim").getContext("2d"), { type: "bar", data, options: opts });
    }
  }

  /* --------------------------------------------------------------------------
     OFFSET CALCULATOR + BENCHMARKS
     -------------------------------------------------------------------------- */
  function renderOffset() {
    const total = sumCO2(state.entries);
    const tonnes = total / 1000;

    const cards = [
      { icon: "🌳", value: fmt(total / 21, 1),                 label: "tree-years to absorb" },
      { icon: "🌲", value: fmt(total / 21 / 10, 1),            label: "trees grown for 10 years" },
      { icon: "₹",  value: "₹" + fmt(tonnes * 1275, 0),        label: "approx. offset cost" },
      { icon: "♻️", value: fmt(tonnes, 3),                     label: "tonnes CO₂e total" }
    ];

    byId("offset-grid").innerHTML = cards.map(c => `
      <div class="offset-card">
        <span class="of-icon">${c.icon}</span>
        <span class="of-value">${c.value}</span>
        <span class="of-label">${c.label}</span>
      </div>
    `).join("");
  }

  function renderBenchmarkChart() {
    // Annualise the user's daily average
    let avg = 0;
    if (state.entries.length) {
      const dates = state.entries.map(e => e.date).sort();
      const span = Math.max(1, daysBetween(dates[0], dates[dates.length - 1]) + 1);
      avg = sumCO2(state.entries) / span;
    }
    const annualised = avg * 365;

    const rows = BENCHMARKS.concat([{ label: "You (projected)", kg: Math.round(annualised) }])
      .sort((a, b) => a.kg - b.kg);

    const data = {
      labels: rows.map(r => r.label),
      datasets: [{
        label: "kg CO₂e per year",
        data: rows.map(r => r.kg),
        backgroundColor: rows.map(r => r.label.startsWith("You") ? cssVar("--cyan") : cssVar("--text-faint")),
        borderRadius: 5
      }]
    };

    const opts = baseChartOptions({
      indexAxis: "y",
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, ticks: { color: cssVar("--text-faint") }, grid: { color: "rgba(128,128,128,0.10)" } },
        y: { ticks: { color: cssVar("--text-dim"), font: { size: 10 } }, grid: { display: false } }
      }
    });

    if (charts.benchmark) {
      charts.benchmark.data = data;
      charts.benchmark.options = opts;
      charts.benchmark.update();
    } else {
      charts.benchmark = new Chart(byId("chart-benchmark").getContext("2d"), { type: "bar", data, options: opts });
    }

    byId("benchmark-note").textContent = state.entries.length
      ? `Your logged activities project to about ${fmt(annualised, 0)} kg CO₂e per year. Note this only counts what you log here — a full personal footprint also includes goods, services and shared infrastructure.`
      : "Log activities to see how your footprint compares against per-capita benchmarks.";
  }

  /* ==========================================================================
     13d. ACCOUNT — name prompt on entry, shown in header, used in exports
     ========================================================================== */
  function displayName() {
    return (state.account.name || "").trim();
  }

  function renderUserChip() {
    const name = displayName();
    const label = name || "Guest";
    byId("user-chip-name").textContent = label;
    byId("user-avatar").textContent = name ? name.trim().charAt(0).toUpperCase() : "?";
    byId("user-chip").title = name ? `Signed in as ${name} — click to edit` : "Click to add your name";
  }

  function renderDashboardGreeting() {
    const name = displayName();
    const el = byId("dashboard-greeting");
    const hour = new Date().getHours();
    const part = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
    el.innerHTML = name
      ? `Good ${part}, <strong>${escapeHtml(name)}</strong> — here's where your footprint stands.`
      : `Good ${part} — here's where your footprint stands. <button type="button" class="link-btn" id="greeting-add-name">Add your name</button> to personalise this.`;

    const addBtn = byId("greeting-add-name");
    if (addBtn) addBtn.addEventListener("click", openWelcomeModal);
  }

  function openWelcomeModal(forceEditMode) {
    const overlay = byId("welcome-overlay");
    const isFirstVisit = !state.account.hasChosen;
    const input = byId("welcome-name-input");

    input.value = state.account.name || "";
    byId("welcome-close").hidden = isFirstVisit && !forceEditMode ? true : false;
    byId("welcome-forget").hidden = !state.account.name;

    if (isFirstVisit && !forceEditMode) {
      byId("welcome-title").textContent = "Welcome to Planet Pulse";
      byId("welcome-copy").textContent =
        "Tell us your name and we'll personalise your dashboard and reports. This stays on your device only — nothing is sent anywhere. You can skip this and add it later from the chip in the header.";
      byId("welcome-skip").hidden = false;
    } else {
      byId("welcome-title").textContent = state.account.name ? "Edit your name" : "Add your name";
      byId("welcome-copy").textContent =
        "This name appears in the header and on your exported reports. It's stored only in this browser.";
      byId("welcome-skip").hidden = true;
    }

    overlay.classList.add("open");
    setTimeout(() => input.focus(), 30);
  }

  function closeWelcomeModal() {
    byId("welcome-overlay").classList.remove("open");
  }

  function wireAccountEvents() {
    byId("user-chip").addEventListener("click", () => openWelcomeModal(true));
    byId("welcome-close").addEventListener("click", closeWelcomeModal);
    byId("welcome-overlay").addEventListener("click", (e) => {
      if (e.target.id === "welcome-overlay" && state.account.hasChosen) closeWelcomeModal();
    });

    byId("welcome-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = byId("welcome-name-input").value.trim().slice(0, 40);
      state.account.name = name;
      state.account.hasChosen = true;
      saveData();
      renderUserChip();
      renderDashboardGreeting();
      closeWelcomeModal();
      showToast(name ? `Welcome, ${name}!` : "Name saved.", "");
    });

    byId("welcome-skip").addEventListener("click", () => {
      state.account.name = "";
      state.account.hasChosen = true;
      saveData();
      renderUserChip();
      renderDashboardGreeting();
      closeWelcomeModal();
      showToast("No problem — you can add your name anytime from the header.", "");
    });

    byId("welcome-forget").addEventListener("click", () => {
      state.account.name = "";
      saveData();
      renderUserChip();
      renderDashboardGreeting();
      byId("welcome-name-input").value = "";
      byId("welcome-forget").hidden = true;
      showToast("Name cleared.", "");
    });
  }

  /* ==========================================================================
     13e. PDF EXPORT
     ========================================================================== */
  function exportPDF() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      showToast("PDF library failed to load — check your internet connection and try again.", "error");
      return;
    }

    const list = getSortedEntries(getFilteredEntries());
    const stats = computeStats();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 44;
    let y = margin;

    const GREEN = [34, 166, 108];
    const DARK = [13, 32, 26];
    const GREY = [110, 125, 118];
    const LIGHT = [235, 242, 238];

    function ensureSpace(needed) {
      if (y + needed > pageH - margin) {
        doc.addPage();
        y = margin;
        drawPageHeader();
      }
    }

    function drawPageHeader() {
      doc.setFillColor(...DARK);
      doc.rect(0, 0, pageW, 6, "F");
    }

    // --- Cover header -------------------------------------------------------
    drawPageHeader();

    doc.setFillColor(...GREEN);
    doc.circle(margin + 12, y + 6, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("P", margin + 12, y + 10, { align: "center" });

    doc.setTextColor(...DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Planet Pulse", margin + 32, y + 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...GREY);
    doc.text("Carbon Footprint Report", margin + 32, y + 27);

    y += 46;

    const name = displayName();
    doc.setDrawColor(...LIGHT);
    doc.setLineWidth(1);
    doc.line(margin, y, pageW - margin, y);
    y += 20;

    doc.setFontSize(10);
    doc.setTextColor(...GREY);
    doc.text("Prepared for", margin, y);
    doc.text("Generated", pageW - margin, y, { align: "right" });
    y += 15;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...DARK);
    doc.text(name || "Guest User", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(new Date().toLocaleString(), pageW - margin, y, { align: "right" });
    y += 26;

    // --- Summary KPIs ---------------------------------------------------------
    const r = currentWeekRange();
    const weekTotal = sumCO2(entriesInRange(r.fromIso, r.toIso));
    const kpis = [
      ["This Week", fmt(weekTotal) + " kg"],
      ["Weekly Target", fmt(state.weeklyTarget) + " kg"],
      ["All-Time Total", fmt(stats.totalCO2) + " kg"],
      ["Eco Score", stats.ecoScore + " (" + stats.grade + ")"]
    ];
    const kpiW = (pageW - margin * 2 - 3 * 10) / 4;
    kpis.forEach((k, i) => {
      const x = margin + i * (kpiW + 10);
      doc.setFillColor(...LIGHT);
      doc.roundedRect(x, y, kpiW, 46, 5, 5, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...GREY);
      doc.text(k[0].toUpperCase(), x + 10, y + 16);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...DARK);
      doc.text(k[1], x + 10, y + 34);
    });
    y += 66;

    // --- Category breakdown table (all-time) ---------------------------------
    const byType = groupByType(state.entries);
    const totalAll = sumCO2(state.entries);
    const rows = Object.keys(FACTORS)
      .map(t => ({ type: t, ...byType[t] }))
      .filter(rr => rr.count > 0)
      .sort((a, b) => b.co2 - a.co2);

    ensureSpace(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...DARK);
    doc.text("Category Breakdown (All Time)", margin, y);
    y += 16;

    y = drawTable(doc, {
      x: margin, width: pageW - margin * 2,
      colWidths: [0.34, 0.14, 0.18, 0.16, 0.18],
      headers: ["Activity", "Entries", "Quantity", "CO2e (kg)", "Share"],
      rows: rows.map(rr => {
        const f = FACTORS[rr.type];
        const share = totalAll > 0 ? (rr.co2 / totalAll) * 100 : 0;
        return [f.label, String(rr.count), fmt(rr.quantity, 1) + " " + f.unit, fmt(rr.co2), fmt(share, 1) + "%"];
      }),
      ensureSpace, getY: () => y, setY: (v) => { y = v; }, colors: { GREEN, DARK, GREY, LIGHT }
    });
    y += 22;

    // --- Activity log (respects current History filters) ---------------------
    ensureSpace(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...DARK);
    doc.text(`Activity Log (${list.length} ${list.length === 1 ? "entry" : "entries"}${hasActiveFilters() ? ", filtered" : ""})`, margin, y);
    y += 16;

    if (!list.length) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...GREY);
      doc.text("No activities match the current filters.", margin, y);
      y += 16;
    } else {
      y = drawTable(doc, {
        x: margin, width: pageW - margin * 2,
        colWidths: [0.16, 0.24, 0.14, 0.14, 0.32],
        headers: ["Date", "Activity", "Quantity", "CO2e", "Note"],
        rows: list.map(e => {
          const f = FACTORS[e.type];
          return [prettyDate(e.date), f.label, fmt(e.quantity, e.quantity % 1 === 0 ? 0 : 1) + " " + f.unit, fmt(e.co2) + " kg", e.note || "—"];
        }),
        ensureSpace, getY: () => y, setY: (v) => { y = v; }, colors: { GREEN, DARK, GREY, LIGHT }
      });
    }

    // --- Footer on every page --------------------------------------------------
    const pageCount = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...GREY);
      doc.text("Planet Pulse — emission factors are fixed approximations for estimation, not certified accounting.", margin, pageH - 22);
      doc.text(`Page ${p} of ${pageCount}`, pageW - margin, pageH - 22, { align: "right" });
    }

    const fileSafeName = (name || "guest").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    doc.save(`planet-pulse-report-${fileSafeName}-${todayISO()}.pdf`);
    showToast("PDF report downloaded.", "");
  }

  function hasActiveFilters() {
    const f = state.historyFilters;
    return !!(f.search || f.type || f.category || (f.range && f.range !== "all"));
  }

  // Minimal table renderer shared by both PDF tables — wraps text, paginates
  // via the caller's ensureSpace/getY/setY (so it stays in sync with the
  // caller's own cursor position rather than tracking a disconnected copy),
  // and re-draws column headers at the top of every new page.
  function drawTable(doc, opts) {
    const { x, width, colWidths, headers, rows, ensureSpace, getY, setY, colors } = opts;
    const rowH = 20;
    const padX = 6;
    const cols = colWidths.map(w => w * width);

    function drawHeader() {
      const y = getY();
      doc.setFillColor(...colors.DARK);
      doc.rect(x, y, width, rowH, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      let cx = x;
      headers.forEach((h, i) => {
        doc.text(h, cx + padX, y + 13.5);
        cx += cols[i];
      });
      setY(y + rowH);
    }

    drawHeader();
    let rowsOnThisPage = 0;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    rows.forEach((row) => {
      const pageBefore = doc.internal.getCurrentPageInfo().pageNumber;
      ensureSpace(rowH);
      const pageAfter = doc.internal.getCurrentPageInfo().pageNumber;
      if (pageAfter !== pageBefore) {
        drawHeader();      // re-print column headers at the top of the new page
        rowsOnThisPage = 0;
      }

      const y = getY();
      if (rowsOnThisPage % 2 === 1) {
        doc.setFillColor(...colors.LIGHT);
        doc.rect(x, y, width, rowH, "F");
      }

      doc.setTextColor(...colors.DARK);
      let cx = x;
      row.forEach((cell, ci) => {
        const maxChars = Math.floor(cols[ci] / 4.6);
        const text = String(cell).length > maxChars ? String(cell).slice(0, maxChars - 1) + "…" : String(cell);
        doc.text(text, cx + padX, y + 13.5);
        cx += cols[ci];
      });
      setY(y + rowH);
      rowsOnThisPage++;
    });

    return getY();
  }

  /* --------------------------------------------------------------------------
     ABOUT PAGE STATS
     -------------------------------------------------------------------------- */
  function renderAboutStats(stats) {
    const cards = [
      { value: stats.totalEntries,                 label: "activities logged" },
      { value: fmt(stats.totalCO2, 1),             label: "kg CO₂e tracked" },
      { value: stats.loggedDays,                   label: "days with data" },
      { value: stats.ecoScore,                     label: "current Eco Score" },
      { value: stats.loggingStreak,                label: "day logging streak" },
      { value: Object.keys(FACTORS).length,        label: "emission factors" }
    ];

    byId("about-stats").innerHTML = cards.map(c => `
      <div class="about-stat">
        <span class="as-value">${c.value}</span>
        <span class="as-label">${c.label}</span>
      </div>
    `).join("");
  }

  /* ==========================================================================
     14. NAVIGATION & THEME
     ========================================================================== */
  function switchTab(tab) {
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    byId("view-" + tab).classList.add("active");
    document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));

    if (tab === "target") renderTargetView();
    if (tab === "history") renderHistory();
    if (tab === "log") { renderQuickAdd(); renderTodayEntries(); }
    if (tab === "simulator") { renderSimulator(); renderOffset(); renderBenchmarkChart(); }
    if (tab === "about") renderAboutStats(computeStats());
    window.scrollTo({ top: 0 });
  }

  function setTheme(theme) {
    document.body.setAttribute("data-theme", theme);
    byId("theme-switch").setAttribute("data-active", theme);
    document.querySelectorAll(".theme-opt").forEach(b => {
      b.classList.toggle("active", b.dataset.themeSet === theme);
    });
    saveData();

    // Charts read computed CSS variables, so rebuild them for the new palette
    Object.keys(charts).forEach(k => { if (charts[k]) { charts[k].destroy(); delete charts[k]; } });
    renderCategoryChart();
    renderDailyChart();
    renderEcoScore(computeStats());
    if (byId("view-target").classList.contains("active")) renderWeeklyChart();
    if (byId("view-simulator").classList.contains("active")) { renderSimulator(); renderBenchmarkChart(); }
  }

  function toggleTheme() {
    setTheme(document.body.getAttribute("data-theme") === "dark" ? "light" : "dark");
  }

  /* ==========================================================================
     15. REFRESH EVERYTHING
     ========================================================================== */
  function refreshAll() {
    const stats = renderDashboard();
    renderTodayEntries();
    renderHistory();
    if (byId("view-target").classList.contains("active")) renderTargetView();
    if (byId("view-simulator").classList.contains("active")) { renderSimulator(); renderOffset(); renderBenchmarkChart(); }
    if (byId("view-about").classList.contains("active")) renderAboutStats(stats);
  }

  /* ==========================================================================
     16. EVENT WIRING
     ========================================================================== */
  function wireEvents() {
    // Tabs
    document.querySelectorAll(".tab").forEach(btn => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });
    byId("goto-history").addEventListener("click", () => switchTab("history"));

    // Theme switch (segmented dark / light)
    byId("theme-switch").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-theme-set]");
      if (!btn) return;
      setTheme(btn.dataset.themeSet);
    });

    // Keyboard shortcut: Shift+D toggles the theme
    document.addEventListener("keydown", (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.shiftKey && e.key.toLowerCase() === "d") { e.preventDefault(); toggleTheme(); }
    });

    // --- Simulator sliders ---
    const simMap = {
      "sim-car-to-bus": "carToBus",
      "sim-meat-swap": "meatSwap",
      "sim-electricity": "electricity",
      "sim-flights": "flights"
    };
    Object.keys(simMap).forEach(id => {
      byId(id).addEventListener("input", (e) => {
        state.sim[simMap[id]] = Number(e.target.value);
        renderSimulator();
      });
    });
    byId("sim-reset").addEventListener("click", () => {
      state.sim = { carToBus: 0, meatSwap: 0, electricity: 0, flights: 0 };
      Object.keys(simMap).forEach(id => { byId(id).value = 0; });
      renderSimulator();
      showToast("Simulation reset.", "");
    });

    // --- About: fall back to initials if the LinkedIn photo URL expires ---
    const photo = byId("about-photo");
    photo.addEventListener("error", () => {
      photo.hidden = true;
      byId("about-photo-fallback").hidden = false;
    });

    // --- Log form ---
    byId("activity-type").addEventListener("change", updateUnitDisplay);
    byId("quantity").addEventListener("input", () => {
      byId("quantity-error").classList.remove("visible");
      updateLivePreview();
    });
    byId("log-form").addEventListener("submit", handleLogSubmit);
    byId("cancel-edit-btn").addEventListener("click", resetLogForm);

    byId("quick-chips").addEventListener("click", (e) => {
      const chip = e.target.closest("[data-quick-qty]");
      if (!chip) return;
      byId("quantity").value = chip.dataset.quickQty;
      updateLivePreview();
    });

    byId("quickadd-grid").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-quickadd]");
      if (!btn) return;
      const q = QUICK_ADD[Number(btn.dataset.quickadd)];
      const entry = addEntry(q.type, q.quantity, todayISO(), q.note);
      showToast(`Logged ${q.title} — ${fmt(entry.co2)} kg CO₂e.`, "");
      checkTargetAlert();
      refreshAll();
    });

    // --- Delete / edit (delegated across the document) ---
    document.addEventListener("click", (e) => {
      const del = e.target.closest("[data-delete]");
      if (del) {
        const id = Number(del.dataset.delete);
        if (deleteEntry(id)) {
          showToast("Entry deleted.", "");
          refreshAll();
        }
        return;
      }
      const edit = e.target.closest("[data-edit]");
      if (edit) startEdit(Number(edit.dataset.edit));
    });

    // --- Dashboard scope switch ---
    byId("scope-switch").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-scope]");
      if (!btn) return;
      state.breakdownScope = btn.dataset.scope;
      document.querySelectorAll(".scope-btn").forEach(b => b.classList.toggle("active", b === btn));
      renderCategoryChart();
      renderBreakdownTable();
    });

    // --- History filters ---
    byId("history-search").addEventListener("input", (e) => {
      state.historyFilters.search = e.target.value;
      state.historyPage = 1;
      renderHistory();
    });
    byId("filter-type").addEventListener("change", (e) => {
      state.historyFilters.type = e.target.value;
      state.historyPage = 1;
      renderHistory();
    });
    byId("filter-category").addEventListener("change", (e) => {
      state.historyFilters.category = e.target.value;
      state.historyPage = 1;
      renderHistory();
    });
    byId("filter-range").addEventListener("change", (e) => {
      state.historyFilters.range = e.target.value;
      byId("custom-range").hidden = e.target.value !== "custom";
      state.historyPage = 1;
      renderHistory();
    });
    byId("filter-from").addEventListener("change", (e) => {
      state.historyFilters.from = e.target.value;
      state.historyPage = 1;
      renderHistory();
    });
    byId("filter-to").addEventListener("change", (e) => {
      state.historyFilters.to = e.target.value;
      state.historyPage = 1;
      renderHistory();
    });
    byId("clear-filters").addEventListener("click", () => {
      state.historyFilters = { search: "", type: "", category: "", range: "all", from: "", to: "" };
      byId("history-search").value = "";
      byId("filter-type").value = "";
      byId("filter-category").value = "";
      byId("filter-range").value = "all";
      byId("filter-from").value = "";
      byId("filter-to").value = "";
      byId("custom-range").hidden = true;
      state.historyPage = 1;
      renderHistory();
      showToast("Filters reset.", "");
    });
    byId("export-csv").addEventListener("click", exportCSV);
    byId("export-pdf").addEventListener("click", exportPDF);

    // History sorting
    document.querySelectorAll("#history-table th[data-sort]").forEach(th => {
      th.addEventListener("click", () => {
        const key = th.dataset.sort;
        if (state.historySort.key === key) {
          state.historySort.dir = state.historySort.dir === "asc" ? "desc" : "asc";
        } else {
          state.historySort.key = key;
          state.historySort.dir = key === "date" ? "desc" : "asc";
        }
        renderHistory();
      });
    });

    // History pagination
    byId("history-pagination").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-page]");
      if (!btn || btn.disabled) return;
      const val = btn.dataset.page;
      if (val === "prev") state.historyPage--;
      else if (val === "next") state.historyPage++;
      else state.historyPage = Number(val);
      renderHistory();
      window.scrollTo({ top: 0 });
    });

    // --- Target ---
    byId("target-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const val = parseFloat(byId("target-input").value);
      if (!isFinite(val) || val <= 0) {
        showToast("Enter a target above zero.", "error");
        return;
      }
      state.weeklyTarget = Math.round(val * 100) / 100;
      saveData();
      renderTargetView();
      renderDashboard();
      showToast(`Weekly target set to ${fmt(state.weeklyTarget)} kg CO₂e.`, "");
    });

    byId("target-presets").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-preset]");
      if (!btn) return;
      byId("target-input").value = btn.dataset.preset;
      state.weeklyTarget = Number(btn.dataset.preset);
      saveData();
      renderTargetView();
      renderDashboard();
      showToast(`Weekly target set to ${fmt(state.weeklyTarget)} kg CO₂e.`, "");
    });

    // --- Factors / compare ---
    byId("compare-budget").addEventListener("input", (e) => {
      state.compareBudget = Number(e.target.value);
      renderCompare();
    });

    byId("load-sample").addEventListener("click", loadSampleData);

    byId("clear-all").addEventListener("click", () => {
      if (!state.entries.length) { showToast("There's nothing to clear.", "error"); return; }
      const ok = window.confirm(`Delete all ${state.entries.length} logged activities? This cannot be undone.`);
      if (!ok) return;
      state.entries = [];
      state.nextId = 1;
      saveData();
      refreshAll();
      showToast("All entries cleared.", "");
    });
  }

  /* ==========================================================================
     17. INIT
     ========================================================================== */
  function init() {
    loadData();

    const theme = document.body.getAttribute("data-theme") || "dark";
    byId("theme-switch").setAttribute("data-active", theme);
    document.querySelectorAll(".theme-opt").forEach(b => {
      b.classList.toggle("active", b.dataset.themeSet === theme);
    });

    byId("today-chip").textContent = new Date().toLocaleDateString(undefined, {
      weekday: "short", month: "short", day: "numeric"
    });

    byId("entry-date").value = todayISO();
    byId("entry-date").max = todayISO();
    byId("target-input").value = state.weeklyTarget;

    wireEvents();
    wireAccountEvents();
    updateUnitDisplay();
    renderQuickAdd();
    renderTargetPresets();
    renderFactorsTable();
    renderCompare();
    renderOffset();
    updateStorageNote();
    renderUserChip();
    refreshAll();
    renderDashboardGreeting();

    if (!state.account.hasChosen) openWelcomeModal();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
/* ============================================================================
   PLANET PULSE — ADDITIONS (load AFTER script.js)
   Reload animation · guided tour · count-up numbers · scroll reveal · tilt ·
   ripple · particle background · confetti on new badges · daily tip ·
   keyboard shortcuts · About-photo fallback fix
   Everything here works through the DOM, so script.js needs no changes.
   ============================================================================ */
(function () {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TOUR_KEY = "planetpulse.tour.v1";
  const getFlag = () => { try { return localStorage.getItem(TOUR_KEY); } catch (e) { return null; } };
  const setFlag = (v) => { try { localStorage.setItem(TOUR_KEY, v); } catch (e) {} };

  function toast(msg) {
    const box = $("#toast-container"); if (!box) return;
    const el = document.createElement("div");
    el.className = "toast"; el.textContent = msg;
    box.appendChild(el); setTimeout(() => el.remove(), 4000);
  }

  /* ==========================================================================
     1. RELOAD / INTRO ANIMATION
     ========================================================================== */
  const t0 = performance.now();
  document.body.classList.add("pp-loading");
  const msgs = ["Warming up the planet…", "Loading emission factors…", "Counting your carbon…", "Almost there…"];
  let mi = 0;
  const msgTimer = setInterval(() => { const m = $("#pp-pre-msg"); if (m) m.textContent = msgs[++mi % msgs.length]; }, 420);

  function hidePreloader() {
    const p = $("#pp-preloader"); if (!p) return;
    clearInterval(msgTimer);
    p.classList.add("done");
    document.body.classList.remove("pp-loading");
    setTimeout(() => { p.remove(); maybePromptTour(); }, 750);
  }
  const finish = () => setTimeout(hidePreloader, Math.max(0, 1500 - (performance.now() - t0)));
  if (document.readyState === "complete") finish(); else window.addEventListener("load", finish);

  /* ==========================================================================
     2. HEADER BUTTONS (tour + shortcuts)
     ========================================================================== */
  const actions = $(".header-actions");
  if (actions) {
    actions.insertAdjacentHTML("afterbegin",
      '<button class="icon-btn pp-hdr-btn" id="pp-tour-btn" title="Website tour (T)" aria-label="Start website tour">🧭<span class="pp-lbl"> Tour</span></button>' +
      '<button class="icon-btn pp-hdr-btn" id="pp-help-btn" title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts">⌨<span class="pp-lbl"> Keyboard shortcuts</span></button>');
    if (!getFlag()) $("#pp-tour-btn").classList.add("pulse");
  }

  /* ==========================================================================
     3. GUIDED TOUR
     ========================================================================== */
  const STEPS = [
    { tab: "dashboard", title: "Welcome to Planet Pulse 🌍", text: "This quick tour shows every feature. Use Next / Back, the arrow keys, or skip at any time." },
    { tab: "dashboard", sel: "#tabs", title: "Navigation", text: "Seven sections: Dashboard, Log Activity, History, Target, Simulator, Factors and About. Keys 1–7 jump between them." },
    { tab: "dashboard", sel: "#target-banner", title: "Weekly target banner", text: "Your week so far against your CO₂ target. It turns amber near the limit and red when exceeded; the marker shows an even daily pace." },
    { tab: "dashboard", sel: ".score-panel", title: "Eco Score", text: "A 0–100 grade blending target adherence, logging consistency and how clean your activity mix is." },
    { tab: "dashboard", sel: ".streak-panel", title: "Streaks & forecast", text: "Track logging streaks, days under your daily budget, a projected week total and your unlocked badges." },
    { tab: "dashboard", sel: ".kpi-grid", title: "Key numbers", text: "Today, this week, all-time, daily average, entry count and your biggest emitting category — all animated live." },
    { tab: "dashboard", sel: "#view-dashboard .panel-grid", title: "Charts & breakdown", text: "A category doughnut, a 7-day bar chart versus your daily target, and a table you can switch between week, 30 days and all time." },
    { tab: "dashboard", sel: ".heatmap-scroll", title: "Emission calendar", text: "12 weeks at a glance — darker squares are heavier days. Hover any square for the exact total." },
    { tab: "dashboard", sel: "#badge-grid", title: "Achievements", text: "Unlock badges as you build good habits. New unlocks trigger a confetti burst 🎉" },
    { tab: "log", sel: "#log-form", title: "Log an activity", text: "Pick a type, enter a quantity and see the CO₂e calculated live before you save. You can also add a date and note." },
    { tab: "log", sel: "#quickadd-grid", title: "Quick add", text: "One tap logs a common activity (commute, meal, electricity) against today's date." },
    { tab: "history", sel: ".toolbar", title: "History & filters", text: "Search, filter by type, category or date range, sort any column, edit or delete entries, and export to CSV or PDF." },
    { tab: "target", sel: "#target-form", title: "Set your target", text: "Choose a weekly ceiling or pick a preset. Charts and the dashboard update instantly." },
    { tab: "simulator", sel: ".sim-layout", title: "What-if simulator", text: "Slide to shift car trips to bus, swap meals, cut electricity or fly less — and see the real impact on your last 30 days." },
    { tab: "learn", sel: "#factors-table", title: "Emission factors", text: "Every entry uses these fixed factors. You'll also find a compare tool and data controls (sample data, clear all)." },
    { tab: "dashboard", sel: "#user-chip", title: "Your profile", text: "Click to set or change your name — it personalises the dashboard greeting and PDF reports." },
    { tab: "dashboard", sel: "#theme-switch", title: "Light & dark mode", text: "Switch themes here, or press Shift + D." },
    { tab: "dashboard", title: "You're all set! ✅", text: "Restart this tour any time with the 🧭 button or the T key. Press ? to see all keyboard shortcuts." }
  ];

  let idx = 0, active = false;
  const spot = () => $("#pp-spot"), card = () => $("#pp-card");

  function switchTo(tab) {
    const b = $('.tab[data-tab="' + tab + '"]');
    if (b && !b.classList.contains("active")) b.click();
  }

  function startTour() {
    $("#pp-prompt").classList.remove("open");
    $("#pp-tour-btn") && $("#pp-tour-btn").classList.remove("pulse");
    setFlag("done"); active = true; $("#pp-tour").classList.add("open"); show(0);
  }
  function endTour() {
    active = false; $("#pp-tour").classList.remove("open"); switchTo("dashboard");
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  function show(i) {
    idx = i; const s = STEPS[i], c = card();
    switchTo(s.tab);
    c.innerHTML =
      '<div class="pp-step-count">Step ' + (i + 1) + " of " + STEPS.length + "</div>" +
      "<h3>" + s.title + "</h3><p>" + s.text + "</p>" +
      '<div class="pp-dots">' + STEPS.map((_, k) => "<i" + (k === i ? ' class="on"' : "") + "></i>").join("") + "</div>" +
      '<div class="pp-card-actions"><button class="btn-outline small" data-a="skip">Skip tour</button><span>' +
      '<button class="btn-outline small" data-a="prev"' + (i ? "" : " disabled") + ">Back</button> " +
      '<button class="btn-primary small" data-a="next">' + (i === STEPS.length - 1 ? "Finish" : "Next") + "</button></span></div>";
    c.classList.remove("in"); void c.offsetWidth; c.classList.add("in");
    setTimeout(() => {
      const el = s.sel && $(s.sel);
      if (el) el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
      setTimeout(place, el ? 480 : 0);
    }, 180);
  }

  function place() {
    if (!active) return;
    const s = STEPS[idx], el = s.sel && $(s.sel), sp = spot(), c = card();
    const vw = window.innerWidth, vh = window.innerHeight;
    const cw = Math.min(360, vw - 24); c.style.width = cw + "px";
    const ch = c.offsetHeight;
    if (!el || !el.offsetParent) {
      sp.classList.add("center"); sp.style.cssText = "";
      c.style.left = (vw - cw) / 2 + "px"; c.style.top = Math.max(12, (vh - ch) / 2) + "px";
      return;
    }
    sp.classList.remove("center");
    const r = el.getBoundingClientRect(), p = 8;
    Object.assign(sp.style, { left: r.left - p + "px", top: r.top - p + "px", width: r.width + p * 2 + "px", height: r.height + p * 2 + "px" });
    let top;
    if (r.bottom + ch + 28 < vh) top = r.bottom + p + 12;
    else if (r.top - ch - 28 > 0) top = r.top - p - 12 - ch;
    else top = vh - ch - 16;
    c.style.top = top + "px";
    c.style.left = Math.min(Math.max(12, r.left), vw - cw - 12) + "px";
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("#pp-card [data-a]");
    if (!b) return;
    const a = b.dataset.a;
    if (a === "skip") endTour();
    else if (a === "prev" && idx > 0) show(idx - 1);
    else if (a === "next") { if (idx >= STEPS.length - 1) endTour(); else show(idx + 1); }
  });
  let placeRaf;
  const rePlace = () => { cancelAnimationFrame(placeRaf); placeRaf = requestAnimationFrame(place); };
  window.addEventListener("resize", rePlace);
  window.addEventListener("scroll", rePlace, { passive: true });

  // Invitation prompt (first visit only; waits for the name modal to close)
  function maybePromptTour() {
    if (getFlag()) return;
    const w = $("#welcome-overlay");
    if (w && w.classList.contains("open")) {
      const mo = new MutationObserver(() => {
        if (!w.classList.contains("open")) { mo.disconnect(); setTimeout(maybePromptTour, 500); }
      });
      mo.observe(w, { attributes: true, attributeFilter: ["class"] });
      return;
    }
    $("#pp-prompt").classList.add("open");
  }
  $("#pp-prompt-start").addEventListener("click", startTour);
  $("#pp-prompt-skip").addEventListener("click", () => {
    setFlag("skipped"); $("#pp-prompt").classList.remove("open");
    toast("No problem — use the Tour button in the header whenever you want it.");
  });
  $("#pp-tour-btn") && $("#pp-tour-btn").addEventListener("click", startTour);

  /* ==========================================================================
     4. SHORTCUTS
     ========================================================================== */
  const help = $("#pp-help");
  $("#pp-help-btn") && $("#pp-help-btn").addEventListener("click", () => help.classList.add("open"));
  $("#pp-help-close").addEventListener("click", () => help.classList.remove("open"));
  help.addEventListener("click", (e) => { if (e.target === help) help.classList.remove("open"); });

  document.addEventListener("keydown", (e) => {
    if (active) {
      if (e.key === "Escape") endTour();
      else if (e.key === "ArrowRight") { e.preventDefault(); idx >= STEPS.length - 1 ? endTour() : show(idx + 1); }
      else if (e.key === "ArrowLeft" && idx > 0) { e.preventDefault(); show(idx - 1); }
      return;
    }
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Escape") { help.classList.remove("open"); $("#pp-prompt").classList.remove("open"); return; }
    if (e.key === "?") { help.classList.toggle("open"); return; }
    if (e.shiftKey) return;
    const k = e.key.toLowerCase();
    if (k === "t") startTour();
    else if (k === "n") { switchTo("log"); setTimeout(() => $("#quantity") && $("#quantity").focus(), 120); }
    else if (/^[1-7]$/.test(k)) { const tabs = $$(".tab"); tabs[Number(k) - 1] && tabs[Number(k) - 1].click(); }
  });

  /* ==========================================================================
     5. COUNT-UP NUMBERS (watches the numbers script.js writes)
     ========================================================================== */
  const COUNT_IDS = ["kpi-today", "kpi-week", "kpi-total", "kpi-avg", "kpi-entries", "tb-current", "tb-target",
    "score-value", "forecast-value", "streak-logging", "streak-green"];
  function countUp(el) {
    const txt = el.textContent.trim();
    if (txt === el.__w || !/^-?\d+(\.\d+)?$/.test(txt)) return;
    const to = parseFloat(txt), from = el.__shown || 0, dec = (txt.split(".")[1] || "").length;
    cancelAnimationFrame(el.__raf);
    el.__shown = to;
    if (reduce || from === to) { el.__w = txt; return; }
    const start = performance.now(), dur = 900;
    (function step(now) {
      const t = Math.min(1, (now - start) / dur), eased = 1 - Math.pow(1 - t, 3);
      el.__w = (from + (to - from) * eased).toFixed(dec);
      el.textContent = el.__w;
      if (t < 1) el.__raf = requestAnimationFrame(step);
    })(start);
  }
  const countObs = new MutationObserver((list) => list.forEach((m) => countUp(m.target.nodeType === 3 ? m.target.parentNode : m.target)));
  COUNT_IDS.forEach((id) => { const el = document.getElementById(id); if (el) countObs.observe(el, { childList: true, characterData: true, subtree: true }); });

  /* ==========================================================================
     6. CONFETTI ON NEW ACHIEVEMENT
     ========================================================================== */
  const cv = $("#pp-confetti"), cx = cv.getContext("2d");
  let parts = [], raf = 0;
  function confetti() {
    if (reduce) return;
    cv.width = window.innerWidth; cv.height = window.innerHeight;
    const cols = ["#4ade80", "#38bdf8", "#fbbf24", "#a78bfa", "#f87171"];
    for (let i = 0; i < 150; i++) parts.push({ x: cv.width / 2, y: cv.height * 0.4, vx: (Math.random() - 0.5) * 18, vy: Math.random() * -14 - 4, s: Math.random() * 7 + 4, c: cols[i % 5], r: Math.random() * 6, l: 90 + Math.random() * 70 });
    if (!raf) raf = requestAnimationFrame(loop);
  }
  function loop() {
    cx.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter((p) => p.l > 0);
    parts.forEach((p) => {
      p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.r += 0.2; p.l--;
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r);
      cx.fillStyle = p.c; cx.globalAlpha = Math.min(1, p.l / 30);
      cx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); cx.restore();
    });
    if (parts.length) raf = requestAnimationFrame(loop); else { cx.clearRect(0, 0, cv.width, cv.height); raf = 0; }
  }
  const badge = document.getElementById("badge-count");
  if (badge) {
    let prev = null;
    new MutationObserver(() => {
      const n = parseInt(badge.textContent, 10) || 0;
      if (prev !== null && n > prev) { confetti(); toast("🏅 New achievement unlocked!"); }
      prev = n;
    }).observe(badge, { childList: true, characterData: true, subtree: true });
  }

  /* ==========================================================================
     7. SCROLL REVEAL, TILT, RIPPLE, SCROLL PROGRESS
     ========================================================================== */
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { threshold: 0.08 });
  $$(".panel, .kpi-card, .target-banner, .badge-card, .streak-card").forEach((el, i) => {
    el.classList.add("pp-reveal"); el.style.setProperty("--d", (i % 6) * 60 + "ms"); io.observe(el);
  });

  const TILT = ".kpi-card, .streak-card, .equiv-card, .stack-item, .about-stat, .offset-card";
  document.addEventListener("mousemove", (e) => {
    if (reduce || !e.target.closest) return;
    const c = e.target.closest(TILT); if (!c) return;
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    c.style.transform = "perspective(600px) rotateX(" + -y * 9 + "deg) rotateY(" + x * 9 + "deg) translateY(-3px)";
  });
  document.addEventListener("mouseout", (e) => {
    const c = e.target.closest && e.target.closest(TILT);
    if (c && !c.contains(e.relatedTarget)) c.style.transform = "";
  });

  document.addEventListener("click", (e) => {
    const b = e.target.closest(".btn-primary, .btn-outline, .tab, .chip, .preset-btn, .quickadd-btn, .scope-btn");
    if (!b || b.disabled) return;
    const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2, s = document.createElement("span");
    s.className = "pp-ripple";
    s.style.cssText = "width:" + d + "px;height:" + d + "px;left:" + (e.clientX - r.left - d / 2) + "px;top:" + (e.clientY - r.top - d / 2) + "px";
    b.appendChild(s); setTimeout(() => s.remove(), 600);
  });

  const bar = $("#pp-scroll-progress"), top = $("#pp-top");
  function onScroll() {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + "%";
    top.classList.toggle("show", window.scrollY > 500);
  }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  top.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }));

  /* ==========================================================================
     8. PARTICLE BACKGROUND
     ========================================================================== */
  if (!reduce) {
    const bg = $("#pp-bg"), bx = bg.getContext("2d");
    let W, H, dots = [];
    const size = () => {
      W = bg.width = window.innerWidth; H = bg.height = window.innerHeight;
      dots = Array.from({ length: Math.min(55, Math.floor(W / 24)) }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3 }));
    };
    size(); window.addEventListener("resize", size);
    (function draw() {
      if (!document.hidden) {
        bx.clearRect(0, 0, W, H);
        dots.forEach((a, i) => {
          a.x = (a.x + a.vx + W) % W; a.y = (a.y + a.vy + H) % H;
          bx.fillStyle = "rgba(74,222,128,.7)"; bx.beginPath(); bx.arc(a.x, a.y, 1.6, 0, 7); bx.fill();
          for (let j = i + 1; j < dots.length; j++) {
            const b = dots[j], d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d < 120) { bx.strokeStyle = "rgba(56,189,248," + 0.2 * (1 - d / 120) + ")"; bx.beginPath(); bx.moveTo(a.x, a.y); bx.lineTo(b.x, b.y); bx.stroke(); }
          }
        });
      }
      requestAnimationFrame(draw);
    })();
  }

  /* ==========================================================================
     9. DAILY ECO TIP
     ========================================================================== */
  const TIPS = [
    "A single non-veg meal swapped for a veg one saves about 1.5 kg CO₂e.",
    "Unplug chargers and idle devices — standby power adds up across a month.",
    "Taking the bus instead of the car cuts travel emissions by roughly 60%.",
    "Set your AC 1–2 °C higher; every kWh saved avoids 0.8 kg CO₂e.",
    "Combine errands into one trip — short cold-start car journeys are the least efficient.",
    "Air-dry laundry when you can; dryers are among the hungriest home appliances.",
    "Trains beat flights for most trips under 800 km.",
    "LED bulbs use about 80% less electricity than incandescent ones.",
    "Plan meals to cut food waste — wasted food carries wasted carbon.",
    "Carpool two days a week and halve those commute emissions."
  ];
  const greet = $("#dashboard-greeting");
  if (greet) {
    greet.insertAdjacentHTML("afterend", '<div class="pp-tip" id="pp-tip"><span><b>Tip of the day</b><em id="pp-tip-text"></em></span><button class="btn-outline small" id="pp-tip-next">Another tip</button></div>');
    let ti = Math.floor(Date.now() / 86400000) % TIPS.length;
    const setTip = () => { $("#pp-tip-text").textContent = TIPS[ti]; };
    setTip();
    $("#pp-tip-next").addEventListener("click", () => { ti = (ti + 1) % TIPS.length; setTip(); });
  }

  /* ==========================================================================
     10. FIX: About photo fallback (element was missing from the HTML)
     ========================================================================== */
  const photo = $("#about-photo");
  if (photo) photo.addEventListener("error", () => {
    if (document.getElementById("about-photo-fallback")) return;
    const f = document.createElement("div");
    f.className = "pp-photo-fallback"; f.id = "about-photo-fallback"; f.textContent = "AD";
    photo.parentNode.appendChild(f);
  });

  /* ==========================================================================
     11. ADVANCED FEATURES  (v2)
     Command palette · Living Planet · weekly challenges · voice logging ·
     shareable eco card · backup/restore · cursor spotlight
     ========================================================================== */
  const DATA_KEY = "carbonledger.data.v1";
  const txt = (id) => (document.getElementById(id) || {}).textContent || "";

  /* ---------- Cursor spotlight on panels ---------- */
  document.addEventListener("mousemove", (e) => {
    const p = e.target.closest && e.target.closest(".panel"); if (!p) return;
    const r = p.getBoundingClientRect();
    p.style.setProperty("--mx", e.clientX - r.left + "px"); p.style.setProperty("--my", e.clientY - r.top + "px");
  });

  /* ---------- Voice logging (Web Speech API) ---------- */
  function voiceLog() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast("Voice input isn't supported in this browser — try Chrome or Edge."); return; }
    $$(".tab")[1].click();
    const r = new SR(); r.lang = "en-IN"; r.interimResults = false;
    toast("🎙 Listening… try “12 kilometres by car” or “two veg meals”");
    r.onresult = (e) => applyVoice(e.results[0][0].transcript);
    r.onerror = () => toast("Couldn't hear that — please try again.");
    r.start();
  }
  function applyVoice(s) {
    s = s.toLowerCase();
    const W = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twenty: 20, thirty: 30, fifty: 50, hundred: 100 };
    let n = (s.match(/\d+(\.\d+)?/) || [])[0];
    if (!n) { const w = Object.keys(W).find((k) => new RegExp("\\b" + k + "\\b").test(s)); n = w ? W[w] : 1; }
    const t = /non[- ]?veg|meat|chicken|mutton|fish|egg/.test(s) ? "nonveg_meal" : /veg|salad|dal|paneer/.test(s) ? "veg_meal"
      : /flight|flew|fly|plane/.test(s) ? "flight" : /bus/.test(s) ? "bus" : /electric|kwh|power|unit/.test(s) ? "electricity"
      : /car|drive|drove|taxi|auto/.test(s) ? "car" : null;
    if (!t) { toast("Heard “" + s + "” but couldn't match an activity."); return; }
    const sel = $("#activity-type"); sel.value = t; sel.dispatchEvent(new Event("change"));
    const q = $("#quantity"); q.value = n; q.dispatchEvent(new Event("input"));
    toast("🎙 Heard “" + s + "” — review it, then press Add Entry.");
  }

  /* ---------- Shareable eco card (PNG) ---------- */
  function shareCard() {
    const c = document.createElement("canvas"); c.width = c.height = 1080; const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 1080, 1080); g.addColorStop(0, "#07100d"); g.addColorStop(1, "#0f3a2c");
    x.fillStyle = g; x.fillRect(0, 0, 1080, 1080);
    x.fillStyle = "rgba(74,222,128,.12)"; x.beginPath(); x.arc(880, 200, 320, 0, 7); x.fill();
    x.fillStyle = "#e8f2ee"; x.font = "700 44px sans-serif"; x.fillText("PLANET", 80, 120);
    x.fillStyle = "#4ade80"; x.fillText("PULSE", 285, 120);
    const nm = txt("user-chip-name").trim();
    x.fillStyle = "#8fa6a0"; x.font = "32px sans-serif"; x.fillText((!nm || nm === "Guest" ? "My" : nm + "'s") + " eco card", 80, 190);
    x.fillStyle = "#4ade80"; x.font = "700 300px sans-serif"; x.fillText(txt("score-grade") || "—", 80, 560);
    x.fillStyle = "#e8f2ee"; x.font = "700 60px sans-serif"; x.fillText("Eco Score " + txt("score-value") + "/100", 80, 650);
    [["This week", txt("tb-current") + " kg CO₂e"], ["Weekly target", txt("tb-target") + " kg"], ["Logging streak", txt("streak-logging") + " days"]].forEach((r, i) => {
      const y = 770 + i * 78; x.fillStyle = "#8fa6a0"; x.font = "34px sans-serif"; x.textAlign = "left"; x.fillText(r[0], 80, y);
      x.fillStyle = "#e8f2ee"; x.font = "700 40px sans-serif"; x.textAlign = "right"; x.fillText(r[1], 1000, y);
    });
    x.textAlign = "left"; x.fillStyle = "#566b66"; x.font = "26px sans-serif"; x.fillText("Track your footprint with Planet Pulse", 80, 1020);
    c.toBlob(async (b) => {
      const f = new File([b], "planet-pulse-eco-card.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f], title: "My Planet Pulse eco card" }); return; } catch (e) {} }
      const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = f.name; document.body.appendChild(a); a.click(); a.remove();
      toast("📸 Eco card downloaded.");
    });
  }

  /* ---------- Backup / restore ---------- */
  function backup() {
    let raw = "{}"; try { raw = localStorage.getItem(DATA_KEY) || "{}"; } catch (e) {}
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
    a.download = "planet-pulse-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a); a.click(); a.remove(); toast("💾 Backup downloaded.");
  }
  const rf = document.createElement("input"); rf.type = "file"; rf.accept = "application/json,.json"; rf.hidden = true; document.body.appendChild(rf);
  rf.addEventListener("change", () => {
    const f = rf.files[0]; if (!f) return;
    f.text().then((t) => {
      if (!Array.isArray(JSON.parse(t).entries)) throw 0;
      localStorage.setItem(DATA_KEY, t); toast("Restored — reloading…"); setTimeout(() => location.reload(), 700);
    }).catch(() => toast("That file isn't a valid Planet Pulse backup."));
    rf.value = "";
  });
  const sn = $("#storage-note");
  if (sn) sn.insertAdjacentHTML("beforebegin", '<div class="settings-row"><div><strong>Backup &amp; restore</strong><p class="panel-copy">Download all your data as a JSON file, or restore from a backup.</p></div><div class="pp-btn-row"><button class="btn-outline" data-pp="backup">Backup</button><button class="btn-outline" data-pp="restore">Restore</button></div></div>');

  /* ---------- Command palette (Ctrl/⌘ + K) ---------- */
  const cmdBox = $("#pp-cmd"), cmdIn = $("#pp-cmd-input"), cmdList = $("#pp-cmd-list");
  const CMDS = [].concat(
    ["Dashboard", "Log Activity", "History", "Target", "Simulator", "Factors", "About"].map((n, i) => ({ i: ["📊", "➕", "🗂️", "🎯", "🧪", "📐", "ℹ️"][i], t: "Go to " + n, run: () => $$(".tab")[i].click() })),
    [["🚗", "Quick add: car commute (10 km)", 0], ["🚌", "Quick add: bus commute (10 km)", 1], ["⚡", "Quick add: home electricity (5 kWh)", 2], ["🥗", "Quick add: vegetarian meal", 3], ["🍖", "Quick add: non-veg meal", 4]]
      .map((a) => ({ i: a[0], t: a[1], run: () => { const b = $('[data-quickadd="' + a[2] + '"]'); if (b) b.click(); } })),
    [
      { i: "🎙️", t: "Voice log an activity", run: voiceLog },
      { i: "📸", t: "Download my eco card", run: shareCard },
      { i: "💾", t: "Backup my data (JSON)", run: backup },
      { i: "📥", t: "Restore data from backup", run: () => rf.click() },
      { i: "🧭", t: "Start website tour", run: startTour },
      { i: "🌗", t: "Toggle light / dark theme", run: () => { const b = $(".theme-opt:not(.active)"); if (b) b.click(); } },
      { i: "🧪", t: "Load sample data", run: () => $("#load-sample").click() },
      { i: "📄", t: "Export history as PDF", run: () => $("#export-pdf").click() },
      { i: "📊", t: "Export history as CSV", run: () => $("#export-csv").click() },
      { i: "🎉", t: "Celebrate!", run: confetti },
      { i: "⌨️", t: "Keyboard shortcuts", run: () => help.classList.add("open") }
    ]);
  let sel = 0, shown = CMDS;
  const match = (q, t) => { q = q.toLowerCase(); t = t.toLowerCase(); if (!q) return 1; if (t.includes(q)) return 2; let k = 0; for (const ch of t) if (ch === q[k]) k++; return k === q.length ? 1 : 0; };
  function renderCmd() {
    const q = cmdIn.value.trim();
    shown = CMDS.map((c) => ({ c, s: match(q, c.t) })).filter((x) => x.s).sort((a, b) => b.s - a.s).map((x) => x.c);
    sel = Math.min(sel, Math.max(0, shown.length - 1));
    cmdList.innerHTML = shown.length ? shown.map((c, i) => '<li data-i="' + i + '"' + (i === sel ? ' class="on"' : "") + "><span>" + c.i + "</span>" + c.t + "</li>").join("") : '<li class="none">No matching command</li>';
    const on = cmdList.querySelector(".on"); if (on) on.scrollIntoView({ block: "nearest" });
  }
  const openCmd = () => { cmdBox.classList.add("open"); cmdIn.value = ""; sel = 0; renderCmd(); setTimeout(() => cmdIn.focus(), 30); };
  const closeCmd = () => cmdBox.classList.remove("open");
  const runCmd = (i) => { const c = shown[i]; if (c) { closeCmd(); setTimeout(c.run, 90); } };
  cmdIn.addEventListener("input", () => { sel = 0; renderCmd(); });
  cmdIn.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); sel = (sel + 1) % Math.max(1, shown.length); renderCmd(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); sel = (sel - 1 + shown.length) % Math.max(1, shown.length); renderCmd(); }
    else if (e.key === "Enter") runCmd(sel);
    else if (e.key === "Escape") closeCmd();
  });
  cmdList.addEventListener("click", (e) => { const li = e.target.closest("[data-i]"); if (li) runCmd(Number(li.dataset.i)); });
  cmdBox.addEventListener("click", (e) => { if (e.target === cmdBox) closeCmd(); });
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); if (active) return; cmdBox.classList.contains("open") ? closeCmd() : openCmd(); }
  });
  const tb = $("#pp-tour-btn");
  if (tb) tb.insertAdjacentHTML("beforebegin", '<button class="icon-btn" id="pp-cmd-btn" title="Command palette (Ctrl/⌘ + K)" aria-label="Command palette">⌘</button>');
  const kl = $(".pp-keys"); if (kl) kl.insertAdjacentHTML("afterbegin", "<li><span><kbd>Ctrl</kbd>+<kbd>K</kbd></span> Command palette</li>");

  /* ---------- One delegated handler for all data-pp buttons ---------- */
  document.addEventListener("click", (e) => {
    if (e.target.closest("#pp-cmd-btn")) { openCmd(); return; }
    const b = e.target.closest("[data-pp]"); if (!b) return;
    ({ voice: voiceLog, share: shareCard, cmd: openCmd, backup: backup, restore: () => rf.click() })[b.dataset.pp]();
  });

  /* ---------- Add the new features to the guided tour ---------- */
  STEPS.splice(STEPS.length - 1, 0, { tab: "dashboard", title: "Command palette ⌘K", text: "Press Ctrl/⌘ + K to jump anywhere, quick-add activities, back up your data or export reports — all from the keyboard." });
})();