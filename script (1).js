 // ========================================
// LOCKED IN. V8
// Daily Task + Construction (Natanggap/Hindi pa + Gas) + Vitamins
// + Money Manager + Attendance + All Records + Settings
// ========================================


// ========================================
// BASIC HELPERS
// ========================================

const panelsHost = document.getElementById("panels");
const menuBtn = document.getElementById("menuBtn");
const sectionTitle = document.getElementById("sectionTitle");

function getLocalDate(date = new Date()) {

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function parseDate(dateKey) {

    const [year, month, day] = dateKey.split("-").map(Number);

    return new Date(year, month - 1, day);
}

const today = getLocalDate();

function readJSON(key, fallback) {

    try {

        const value = JSON.parse(localStorage.getItem(key));

        return value === null || value === undefined
            ? fallback
            : value;

    } catch (error) {

        return fallback;

    }

}

function peso(amount) {

    return "₱" + Number(amount || 0).toLocaleString(
        "en-PH",
        { maximumFractionDigits: 2 }
    );

}

function shortDate(date) {

    return date.toLocaleDateString(
        "en-US",
        { month: "short", day: "numeric" }
    );

}

function makeEl(tag, className, text) {

    const el = document.createElement(tag);

    if (className) el.className = className;

    if (text !== undefined) el.textContent = text;

    return el;

}


// ========================================
// SETTINGS DATA
// ========================================

const STORAGE_KEYS = [
    "lockedInHabits",
    "lockedInHistory",
    "lockedInDate",
    "lockedInVitamins",
    "lockedInVitaminsHistory",
    "lockedInVitaminsDate",
    "lockedInWork",
    "lockedInWallets",
    "lockedInTransactions",
    "lockedInBudgets",
    "lockedInAttendance",
    "lockedInSettings"
];

// Mga key na plain na petsa ang laman (hindi JSON)
const DATE_KEYS = ["lockedInDate", "lockedInVitaminsDate"];

let settings = {
    name: "",
    weekMode: "rolling", // "rolling" o "fixed"
    workWallet: "",      // "" = unang wallet, "off" = huwag i-record
    workGas: true,       // i-record ang gas ng construction bilang gastos
    ...readJSON("lockedInSettings", {})
};

function saveSettings() {

    localStorage.setItem(
        "lockedInSettings",
        JSON.stringify(settings)
    );

}

// 7 araw para sa weekly stats ng habits/vitamins
function getWeekDates(anchor) {

    const dates = [];

    const y = anchor.getFullYear();
    const m = anchor.getMonth();
    const d = anchor.getDate();

    const startOffset = settings.weekMode === "fixed"
        ? -anchor.getDay()
        : -6;

    for (let i = 0; i < 7; i++) {

        dates.push(new Date(y, m, d + startOffset + i));

    }

    return dates;

}

// laging Sun–Sat (para sa sahod kada linggo)
function getSunSatDates(anchor) {

    const dates = [];

    const y = anchor.getFullYear();
    const m = anchor.getMonth();
    const d = anchor.getDate();

    for (let i = 0; i < 7; i++) {

        dates.push(new Date(y, m, d - anchor.getDay() + i));

    }

    return dates;

}


// ========================================
// TOAST
// ========================================

const toast = makeEl("div", "li-toast");

document.body.appendChild(toast);

let toastTimer;

function showToast(message) {

    toast.textContent = message;

    toast.style.display = "block";

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.style.display = "none";
    }, 2600);

}


// ========================================
// SHARED: BAR CHART
// items: [{ dateKey, date, name, pct }]
// ========================================

function renderBars(container, items, activeKey, onPick) {

    container.innerHTML = "";

    items.forEach(item => {

        const column = makeEl("div", "chart-column");

        if (item.dateKey === activeKey) {
            column.classList.add("active");
        }

        const track = makeEl("div", "chart-track");

        const fill = makeEl("div", "chart-fill");

        fill.style.height = item.pct + "%";

        track.appendChild(fill);

        column.appendChild(track);

        column.appendChild(makeEl("small", "", item.name));

        if (item.dateKey <= today) {

            column.style.cursor = "pointer";

            column.addEventListener("click", () => {
                onPick(item.dateKey, item.date);
            });

        } else {

            column.style.opacity = "0.45";

        }

        container.appendChild(column);

    });

}


// ========================================
// CHECKLIST TRACKER (Habits at Vitamins)
// ========================================

function checklistTemplate(c) {

    return `
        <section class="date-section">
            <div>
                <p class="eyebrow">TODAY</p>
                <h2 data-el="currentDate">Loading...</h2>
            </div>

            <div class="streak">
                <span>🔥</span>
                <div>
                    <strong data-el="streakCount">0</strong>
                    <small>DAY STREAK</small>
                </div>
            </div>
        </section>

        <section class="progress-card">
            <div class="progress-heading">
                <div>
                    <p class="eyebrow">DAILY PROGRESS</p>
                    <h2>${c.tagline}</h2>
                </div>
                <span class="progress-percent" data-el="progressPercent">0%</span>
            </div>

            <div class="progress-track">
                <div class="progress-fill" data-el="progressBar"></div>
            </div>

            <p class="progress-caption" data-el="progressText">
                0 of 0 ${c.noun} completed
            </p>
        </section>

        <section class="habits-section">
            <div class="section-heading">
                <div>
                    <p class="eyebrow">${c.eyebrow}</p>
                    <h2>${c.title}</h2>
                </div>
                <span class="item-count" data-el="itemCount">0 ${c.nounUpper}</span>
            </div>

            <form class="habit-form" data-el="form">
                <input type="text" data-el="input"
                    placeholder="${c.placeholder}"
                    maxlength="50" required>
                <button type="submit">+</button>
            </form>

            <div class="habit-list" data-el="list"></div>
        </section>

        <section class="calendar-section">
            <div class="section-heading">
                <div>
                    <p class="eyebrow">YOUR HISTORY</p>
                    <h2>Monthly Overview</h2>
                </div>
            </div>

            <div class="calendar-card">
                <div class="calendar-header">
                    <button type="button" data-el="prevMonth">‹</button>
                    <h3 data-el="monthLabel">Month Year</h3>
                    <button type="button" data-el="nextMonth">›</button>
                </div>

                <div class="calendar-grid" data-el="calendarGrid"></div>

                <div class="calendar-legend">
                    <span><i class="legend-complete"></i> Complete</span>
                    <span><i class="legend-partial"></i> Partial</span>
                    <span><i class="legend-empty"></i> No record</span>
                </div>

                <div class="selected-day" data-el="selectedDay">
                    Select a date to view its history.
                </div>
            </div>
        </section>

        <section class="stats-section">
            <div class="section-heading">
                <div>
                    <p class="eyebrow">YOUR PERFORMANCE</p>
                    <h2>Weekly Statistics</h2>
                </div>
            </div>

            <div class="stats-card">
                <div class="stats-top">
                    <div>
                        <small data-el="weeklyRange">LAST 7 DAYS</small>
                        <h3 data-el="weeklyPercent">0%</h3>
                        <p>Average completion</p>
                    </div>
                    <div class="stats-icon">↗</div>
                </div>

                <div class="weekly-chart" data-el="weeklyChart"></div>

                <div class="stats-bottom">
                    <span>Completed ${c.noun}</span>
                    <strong data-el="weeklyCompleted">0</strong>
                </div>
            </div>
        </section>
    `;

}

function createChecklist(cfg) {

    const root = makeEl("div", "panel");

    root.dataset.panel = cfg.id;

    root.innerHTML = checklistTemplate(cfg);

    panelsHost.appendChild(root);

    const el = name => root.querySelector(`[data-el="${name}"]`);

    let items = readJSON(cfg.itemsKey, []);

    if (!Array.isArray(items)) items = [];

    let history = readJSON(cfg.historyKey, {});

    if (
        typeof history !== "object" ||
        history === null ||
        Array.isArray(history)
    ) {
        history = {};
    }

    const lastDate = localStorage.getItem(cfg.dateKey);

    let selectedDate = today;
    let calendarDate = new Date();

    // ---------- New day reset ----------

    if (lastDate !== today) {

        items = items.map(item => ({
            ...item,
            completed: false
        }));

        localStorage.setItem(cfg.itemsKey, JSON.stringify(items));

        localStorage.setItem(cfg.dateKey, today);

    }

    el("currentDate").textContent = new Date().toLocaleDateString(
        "en-US",
        { weekday: "long", month: "long", day: "numeric" }
    );

    // ---------- Save ----------

    function saveToday() {

        const total = items.length;

        const completed = items.filter(
            item => item.completed
        ).length;

        history[today] = {
            total,
            completed,
            habits: items.map(item => ({
                name: item.name,
                completed: item.completed
            }))
        };

        localStorage.setItem(cfg.historyKey, JSON.stringify(history));

        localStorage.setItem(cfg.itemsKey, JSON.stringify(items));

        localStorage.setItem(cfg.dateKey, today);

    }

    function saveData() {

        saveToday();

        renderAll();

        if (cfg.onChange) cfg.onChange();

    }

    // ---------- Items ----------

    function renderItems() {

        const list = el("list");

        list.innerHTML = "";

        if (items.length === 0) {

            list.innerHTML = `
                <div class="empty-state">
                    <span>✦</span>
                    <p>${cfg.emptyTitle}</p>
                    <small>${cfg.emptySub}</small>
                </div>
            `;

            return;
        }

        items.forEach((item, index) => {

            const row = makeEl("div", "habit-item");

            if (item.completed) row.classList.add("completed");

            const checkbox = makeEl("input", "habit-check");

            checkbox.type = "checkbox";
            checkbox.checked = item.completed;

            checkbox.addEventListener("change", () => {

                items[index].completed = checkbox.checked;

                saveData();

            });

            const name = makeEl("span", "habit-name", item.name);

            const del = makeEl("button", "delete-btn", "×");

            del.type = "button";
            del.setAttribute("aria-label", "Delete");

            del.addEventListener("click", () => {

                items.splice(index, 1);

                saveData();

            });

            row.appendChild(checkbox);
            row.appendChild(name);
            row.appendChild(del);

            list.appendChild(row);

        });

    }

    el("form").addEventListener("submit", event => {

        event.preventDefault();

        const input = el("input");

        const name = input.value.trim();

        if (!name) return;

        items.push({ name, completed: false });

        input.value = "";

        saveData();

    });

    // ---------- Progress (today) ----------

    function updateProgress() {

        const total = items.length;

        const completed = items.filter(
            item => item.completed
        ).length;

        const percentage = total === 0
            ? 0
            : Math.round((completed / total) * 100);

        el("progressPercent").textContent = percentage + "%";

        el("progressBar").style.width = percentage + "%";

        el("progressText").textContent =
            `${completed} of ${total} ${cfg.noun} completed`;

        el("itemCount").textContent = `${total} ${cfg.nounUpper}`;

    }

    // ---------- Streak ----------

    function isComplete(record) {

        return Boolean(
            record &&
            record.total > 0 &&
            record.completed === record.total
        );

    }

    function updateStreak() {

        let streak = 0;

        const date = parseDate(selectedDate);

        const selectedRecord = history[selectedDate];

        if (selectedDate === today) {

            if (!isComplete(selectedRecord)) {
                date.setDate(date.getDate() - 1);
            }

        } else if (!isComplete(selectedRecord)) {

            el("streakCount").textContent = 0;

            return;

        }

        while (isComplete(history[getLocalDate(date)])) {

            streak++;

            date.setDate(date.getDate() - 1);

        }

        el("streakCount").textContent = streak;

    }

    // ---------- Selected day ----------

    function showSelectedDay(dateKey) {

        const box = el("selectedDay");

        box.replaceChildren();

        const record = history[dateKey];

        const readable = parseDate(dateKey).toLocaleDateString(
            "en-US",
            { month: "long", day: "numeric", year: "numeric" }
        );

        box.appendChild(makeEl("strong", "", readable));

        if (!record) {

            box.appendChild(makeEl("p", "", "No recorded " + cfg.noun + "."));

            return;
        }

        box.appendChild(makeEl(
            "p",
            "",
            `${record.completed} of ${record.total} completed`
        ));

        (record.habits || []).forEach(item => {

            box.appendChild(makeEl(
                "p",
                "",
                `${item.completed ? "✓" : "○"} ${item.name}`
            ));

        });

    }

    // ---------- Weekly stats ----------

    function renderWeekly() {

        const dates = getWeekDates(parseDate(selectedDate));

        let totalCompleted = 0;
        let totalItems = 0;

        const bars = dates.map(date => {

            const dateKey = getLocalDate(date);

            const record = history[dateKey];

            const completed = record ? record.completed : 0;

            const total = record ? record.total : 0;

            totalCompleted += completed;
            totalItems += total;

            return {
                dateKey,
                date,
                name: date.toLocaleDateString("en-US", { weekday: "short" }),
                pct: total > 0 ? Math.round((completed / total) * 100) : 0
            };

        });

        renderBars(el("weeklyChart"), bars, selectedDate, (key, date) => {

            calendarDate = new Date(date.getFullYear(), date.getMonth(), 1);

            selectDate(key);

        });

        const average = totalItems > 0
            ? Math.round((totalCompleted / totalItems) * 100)
            : 0;

        el("weeklyPercent").textContent = average + "%";

        el("weeklyCompleted").textContent = totalCompleted;

        el("weeklyRange").textContent =
            (shortDate(dates[0]) + " – " + shortDate(dates[6])).toUpperCase();

    }

    // ---------- Calendar ----------

    function renderCalendar() {

        const grid = el("calendarGrid");

        grid.innerHTML = "";

        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();

        el("monthLabel").textContent = calendarDate.toLocaleDateString(
            "en-US",
            { month: "long", year: "numeric" }
        );

        ["S", "M", "T", "W", "T", "F", "S"].forEach(letter => {

            grid.appendChild(makeEl("div", "calendar-day weekday", letter));

        });

        const firstDay = new Date(year, month, 1).getDay();

        const totalDays = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < firstDay; i++) {

            grid.appendChild(makeEl("div", "calendar-day empty"));

        }

        for (let day = 1; day <= totalDays; day++) {

            const dateKey = getLocalDate(new Date(year, month, day));

            const cell = makeEl("button", "calendar-day", String(day));

            cell.type = "button";

            const record = history[dateKey];

            if (dateKey === today) cell.classList.add("today");

            if (dateKey === selectedDate) cell.classList.add("selected");

            if (record && record.total > 0) {

                cell.classList.add(
                    record.completed === record.total ? "complete" : "partial"
                );

            }

            if (dateKey > today) {

                cell.disabled = true;

            } else {

                cell.addEventListener("click", () => selectDate(dateKey));

            }

            grid.appendChild(cell);

        }

    }

    function selectDate(dateKey) {

        selectedDate = dateKey;

        renderCalendar();

        showSelectedDay(selectedDate);

        updateStreak();

        renderWeekly();

    }

    el("prevMonth").addEventListener("click", () => {

        calendarDate.setDate(1);

        calendarDate.setMonth(calendarDate.getMonth() - 1);

        renderCalendar();

    });

    el("nextMonth").addEventListener("click", () => {

        calendarDate.setDate(1);

        calendarDate.setMonth(calendarDate.getMonth() + 1);

        renderCalendar();

    });

    // ---------- Render all ----------

    function renderAll() {

        renderItems();

        updateProgress();

        updateStreak();

        renderCalendar();

        showSelectedDay(selectedDate);

        renderWeekly();

    }

    saveToday();

    renderAll();

    return {
        getHistory: () => history,
        render: renderAll,
        resetHistory() {

            history = {};

            saveToday();

            selectedDate = today;

            calendarDate = new Date();

            renderAll();

        }
    };

}

const habitsTracker = createChecklist({
    id: "habits",
    itemsKey: "lockedInHabits",
    historyKey: "lockedInHistory",
    dateKey: "lockedInDate",
    noun: "habits",
    nounUpper: "HABITS",
    tagline: "Stay consistent.",
    eyebrow: "YOUR ROUTINE",
    title: "Daily Habits",
    placeholder: "Add a new habit...",
    emptyTitle: "No habits yet.",
    emptySub: "Start building your routine today.",
    onChange: () => renderRecords()
});


// ========================================
// CONSTRUCTION WORK LOG
// ========================================

function workTemplate() {

    return `
        <section class="work-stats">
            <div class="section-heading">
                <div>
                    <p class="eyebrow">YOUR WORK</p>
                    <h2>Construction Work</h2>
                </div>
            </div>

            <div class="stats-card">
                <div class="stats-top">
                    <div>
                        <small data-el="weekRange">THIS WEEK</small>
                        <h3 data-el="weekDays">0 days</h3>
                        <p data-el="weekPay">₱0 sahod</p>
                        <p class="work-detail" data-el="weekDetail"></p>
                    </div>
                    <div class="stats-icon">🛠</div>
                </div>

                <div class="weekly-chart" data-el="chart"></div>

                <div class="stats-bottom">
                    <span data-el="monthLabelStat">This month</span>
                    <strong data-el="monthSummary">0 days · ₱0</strong>
                </div>

                <p class="work-detail work-detail-month" data-el="monthDetail"></p>

                <div class="pending-box" data-el="pending"></div>
            </div>
        </section>

        <section class="calendar-section">
            <div class="section-heading">
                <div>
                    <p class="eyebrow">WORK LOG</p>
                    <h2>Pili ng araw</h2>
                </div>
            </div>

            <div class="calendar-card">
                <div class="calendar-header">
                    <button type="button" data-el="prevMonth">‹</button>
                    <h3 data-el="monthLabel">Month Year</h3>
                    <button type="button" data-el="nextMonth">›</button>
                </div>

                <div class="calendar-grid" data-el="calendarGrid"></div>

                <div class="calendar-legend">
                    <span><i class="legend-complete"></i> Worked</span>
                    <span><i class="legend-off"></i> Off</span>
                    <span><i class="legend-empty"></i> No record</span>
                    <span><i class="legend-unpaid"></i> Hindi pa bayad</span>
                </div>

                <div class="entry">
                    <p class="entry-date" data-el="entryDate"></p>

                    <div class="toggle-row">
                        <button type="button" class="toggle-btn" data-el="btnWorked">🛠 Nagtrabaho</button>
                        <button type="button" class="toggle-btn off-btn" data-el="btnOff">Off</button>
                    </div>

                    <div data-el="fields">
                        <input class="field" type="text" data-el="site"
                            placeholder="Site / trabaho (hal. Tile work)"
                            maxlength="60">

                        <input class="field" type="number" data-el="pay"
                            inputmode="decimal" min="0" step="any"
                            placeholder="Sahod (₱)">

                        <input class="field" type="number" data-el="gas"
                            inputmode="decimal" min="0" step="any"
                            placeholder="Gas ngayong araw (₱)">

                        <div class="toggle-row paid-row">
                            <button type="button" class="toggle-btn" data-el="btnPaid">✅ Natanggap na</button>
                            <button type="button" class="toggle-btn off-btn" data-el="btnUnpaid">⏳ Hindi pa</button>
                        </div>
                    </div>

                    <div class="entry-actions">
                        <button type="button" class="primary-btn" data-el="save">Save</button>
                        <button type="button" class="ghost-btn" data-el="clear">Clear</button>
                    </div>
                </div>
            </div>
        </section>

        <section class="calendar-section">
            <div class="section-heading">
                <div>
                    <p class="eyebrow">THIS MONTH</p>
                    <h2>Work Records</h2>
                </div>
            </div>

            <div class="work-list" data-el="recent"></div>
        </section>
    `;

}

const workPanel = makeEl("div", "panel");

workPanel.dataset.panel = "work";

workPanel.innerHTML = workTemplate();

panelsHost.appendChild(workPanel);

const wEl = name => workPanel.querySelector(`[data-el="${name}"]`);

let workLog = readJSON("lockedInWork", {});

if (
    typeof workLog !== "object" ||
    workLog === null ||
    Array.isArray(workLog)
) {
    workLog = {};
}

let workSelected = today;
let workCalendar = new Date();
let draftWorked = true;
let draftPaid = false;

function saveWork() {

    localStorage.setItem("lockedInWork", JSON.stringify(workLog));

}

function workSum(dateKeys) {

    let days = 0;
    let pay = 0;
    let gas = 0;
    let paid = 0;
    let unpaid = 0;

    dateKeys.forEach(key => {

        const record = workLog[key];

        if (record && record.worked) {

            days++;

            const amount = Number(record.pay) || 0;

            pay += amount;

            gas += Number(record.gas) || 0;

            if (record.paid === true) paid += amount;
            else unpaid += amount;

        }

    });

    return { days, pay, gas, paid, unpaid };

}

function workDetailText(sum) {

    if (sum.days === 0) return "";

    let text = `Natanggap ${peso(sum.paid)} · Hinihintay ${peso(sum.unpaid)}`;

    if (sum.gas > 0) {
        text += `\nGas ${peso(sum.gas)} · Net ${peso(sum.pay - sum.gas)}`;
    }

    return text;

}

function monthKeys(anchor) {

    const prefix = getLocalDate(anchor).slice(0, 7);

    return Object.keys(workLog).filter(key => key.startsWith(prefix));

}

function refreshToggle() {

    wEl("btnWorked").classList.toggle("on", draftWorked);

    wEl("btnOff").classList.toggle("on", !draftWorked);

    wEl("fields").style.display = draftWorked ? "" : "none";

    wEl("btnPaid").classList.toggle("on", draftPaid);

    wEl("btnUnpaid").classList.toggle("on", !draftPaid);

}

function loadDraft() {

    const record = workLog[workSelected];

    draftWorked = record ? Boolean(record.worked) : true;

    draftPaid = record ? record.paid === true : false;

    wEl("gas").value = record && record.gas ? record.gas : "";

    wEl("site").value = record && record.site ? record.site : "";

    wEl("pay").value = record && record.pay ? record.pay : "";

    wEl("entryDate").textContent = parseDate(workSelected).toLocaleDateString(
        "en-US",
        { weekday: "long", month: "long", day: "numeric" }
    ) + (record ? "  ✓ saved" : "");

    wEl("clear").disabled = !record;

    refreshToggle();

}

function renderWorkStats() {

    const anchor = parseDate(workSelected);

    const dates = getSunSatDates(anchor);

    const keys = dates.map(date => getLocalDate(date));

    const week = workSum(keys);

    let maxPay = 0;

    keys.forEach(key => {

        const record = workLog[key];

        if (record && record.worked) {
            maxPay = Math.max(maxPay, Number(record.pay) || 0);
        }

    });

    const bars = dates.map((date, index) => {

        const record = workLog[keys[index]];

        let pct = 0;

        if (record && record.worked) {

            pct = maxPay > 0
                ? Math.max(15, Math.round(((Number(record.pay) || 0) / maxPay) * 100))
                : 100;

        }

        return {
            dateKey: keys[index],
            date,
            name: date.toLocaleDateString("en-US", { weekday: "short" }),
            pct
        };

    });

    renderBars(wEl("chart"), bars, workSelected, (key, date) => {

        workCalendar = new Date(date.getFullYear(), date.getMonth(), 1);

        selectWorkDate(key);

    });

    wEl("weekRange").textContent =
        ("WEEK · " + shortDate(dates[0]) + " – " + shortDate(dates[6])).toUpperCase();

    wEl("weekDays").textContent =
        `${week.days} ${week.days === 1 ? "day" : "days"} worked`;

    wEl("weekPay").textContent = peso(week.pay) + " sahod";

    wEl("weekDetail").textContent = workDetailText(week);

    const month = workSum(monthKeys(anchor));

    wEl("monthLabelStat").textContent = anchor.toLocaleDateString(
        "en-US",
        { month: "long", year: "numeric" }
    );

    wEl("monthSummary").textContent =
        `${month.days} ${month.days === 1 ? "day" : "days"} · ${peso(month.pay)}`;

    wEl("monthDetail").textContent = workDetailText(month);

    renderWorkPending();

}

// Kabuuang sahod na hinihintay pa (lahat ng buwan)
function pendingWork() {

    let days = 0;
    let amount = 0;

    Object.keys(workLog).forEach(key => {

        const record = workLog[key];

        if (
            record &&
            record.worked &&
            record.paid !== true &&
            Number(record.pay) > 0
        ) {
            days++;
            amount += Number(record.pay) || 0;
        }

    });

    return { days, amount };

}

function renderWorkPending() {

    const box = wEl("pending");

    const pending = pendingWork();

    box.classList.toggle("clear", pending.days === 0);

    if (Object.keys(workLog).length === 0) {

        box.style.display = "none";

        return;
    }

    box.style.display = "";

    box.textContent = pending.days === 0
        ? "✅ Wala ka nang hinihintay na sahod"
        : `⏳ Hinihintay pa: ${peso(pending.amount)} (${pending.days} ${pending.days === 1 ? "araw" : "araw"})`;

}

function renderWorkCalendar() {

    const grid = wEl("calendarGrid");

    grid.innerHTML = "";

    const year = workCalendar.getFullYear();
    const month = workCalendar.getMonth();

    wEl("monthLabel").textContent = workCalendar.toLocaleDateString(
        "en-US",
        { month: "long", year: "numeric" }
    );

    ["S", "M", "T", "W", "T", "F", "S"].forEach(letter => {

        grid.appendChild(makeEl("div", "calendar-day weekday", letter));

    });

    const firstDay = new Date(year, month, 1).getDay();

    const totalDays = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {

        grid.appendChild(makeEl("div", "calendar-day empty"));

    }

    for (let day = 1; day <= totalDays; day++) {

        const dateKey = getLocalDate(new Date(year, month, day));

        const cell = makeEl("button", "calendar-day", String(day));

        cell.type = "button";

        const record = workLog[dateKey];

        if (dateKey === today) cell.classList.add("today");

        if (dateKey === workSelected) cell.classList.add("selected");

        if (record) {

            cell.classList.add(record.worked ? "complete" : "off");

            if (record.worked && record.paid !== true && Number(record.pay) > 0) {
                cell.classList.add("unpaid");
            }

        }

        if (dateKey > today) {

            cell.disabled = true;

        } else {

            cell.addEventListener("click", () => selectWorkDate(dateKey));

        }

        grid.appendChild(cell);

    }

}

function renderWorkRecent() {

    const list = wEl("recent");

    list.innerHTML = "";

    const keys = monthKeys(parseDate(workSelected)).sort().reverse();

    if (keys.length === 0) {

        list.appendChild(makeEl(
            "div",
            "work-empty",
            "Wala pang record ngayong buwan."
        ));

        return;
    }

    keys.forEach(key => {

        const record = workLog[key];

        const row = makeEl("button", "work-row");

        row.type = "button";

        const main = makeEl("div", "row-main");

        main.appendChild(makeEl(
            "span",
            "row-date",
            parseDate(key).toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric", weekday: "short" }
            )
        ));

        if (record.site) {

            main.appendChild(makeEl("span", "row-site", record.site));

        }

        row.appendChild(main);

        if (record.worked && Number(record.gas) > 0) {

            main.appendChild(makeEl(
                "span",
                "row-site",
                "Gas " + peso(record.gas)
            ));

        }

        const payText = record.worked
            ? peso(record.pay) + (record.paid === true ? " ✅" : " ⏳")
            : "Off";

        row.appendChild(makeEl(
            "span",
            record.worked ? "row-pay" : "row-pay is-off",
            payText
        ));

        row.addEventListener("click", () => {

            workCalendar = parseDate(key);

            workCalendar.setDate(1);

            selectWorkDate(key);

        });

        list.appendChild(row);

    });

}

function renderWorkAll() {

    renderWorkStats();

    renderWorkCalendar();

    renderWorkRecent();

}

function selectWorkDate(dateKey) {

    workSelected = dateKey;

    loadDraft();

    renderWorkAll();

}

wEl("btnWorked").addEventListener("click", () => {

    draftWorked = true;

    refreshToggle();

});

wEl("btnOff").addEventListener("click", () => {

    draftWorked = false;

    refreshToggle();

});

wEl("btnPaid").addEventListener("click", () => {

    draftPaid = true;

    refreshToggle();

});

wEl("btnUnpaid").addEventListener("click", () => {

    draftPaid = false;

    refreshToggle();

});

wEl("save").addEventListener("click", () => {

    let pay = Number(wEl("pay").value);

    if (!Number.isFinite(pay) || pay < 0) pay = 0;

    pay = Math.round(pay * 100) / 100;

    let gas = Number(wEl("gas").value);

    if (!Number.isFinite(gas) || gas < 0) gas = 0;

    gas = Math.round(gas * 100) / 100;

    workLog[workSelected] = {
        worked: draftWorked,
        site: draftWorked ? wEl("site").value.trim() : "",
        pay: draftWorked ? pay : 0,
        gas: draftWorked ? gas : 0,
        paid: draftWorked ? draftPaid : false
    };

    saveWork();

    loadDraft();

    renderWorkAll();

    const paidTo = syncWorkTransaction(workSelected);

    renderMoney();

    renderRecords();

    showToast(
        paidTo
            ? "Na-save ✓ · pumasok sa " + paidTo
            : (draftWorked && draftPaid ? "Na-save ✓" : "Na-save ✓ · hinihintay pa ang sahod")
    );

});

wEl("clear").addEventListener("click", () => {

    if (!workLog[workSelected]) return;

    if (!confirm("Burahin ang record ng araw na ito?")) return;

    delete workLog[workSelected];

    saveWork();

    loadDraft();

    renderWorkAll();

    syncWorkTransaction(workSelected);

    renderMoney();

    renderRecords();

    showToast("Na-clear ang record");

});

wEl("prevMonth").addEventListener("click", () => {

    workCalendar.setDate(1);

    workCalendar.setMonth(workCalendar.getMonth() - 1);

    renderWorkCalendar();

});

wEl("nextMonth").addEventListener("click", () => {

    workCalendar.setDate(1);

    workCalendar.setMonth(workCalendar.getMonth() + 1);

    renderWorkCalendar();

});

loadDraft();

renderWorkAll();


// ========================================
// DAILY VITAMINS
// ========================================

const vitaminsTracker = createChecklist({
    id: "vitamins",
    itemsKey: "lockedInVitamins",
    historyKey: "lockedInVitaminsHistory",
    dateKey: "lockedInVitaminsDate",
    noun: "vitamins",
    nounUpper: "VITAMINS",
    tagline: "Never skip.",
    eyebrow: "YOUR SUPPLEMENTS",
    title: "Daily Vitamins",
    placeholder: "Add a vitamin...",
    emptyTitle: "No vitamins yet.",
    emptySub: "Add the vitamins you take every day.",
    onChange: () => renderRecords()
});


// ========================================
// MONEY MANAGER (Transactions + Balance)
// ========================================

const EXPENSE_CATEGORIES = [
    "Pagkain", "Pamasahe", " gasoline", "Load", "Bills",
    "Kalusugan", "Gamit", "Libangan", "piso wifi cost", "Iba pa"
];

const INCOME_CATEGORIES = [
    "Sahod", "Allowance", "Negosyo", "Regalo", "Iba pa"
];

const CATEGORY_ICONS = {
    "Pagkain": "🍚",
    "Pamasahe": "🚌",
    "gasoline": "⛽",
    " gasoline": "⛽", 
    "Load": "📱",
    "Bills": "💡",
    "Kalusugan": "💊",
    "Gamit": "🛒",
    "Libangan": "🎮",
    "piso wifi cost": "🛜", 
    "Iba pa": "✦",
    "Sahod": "🛠",
    "Allowance": "💵",
    "Negosyo": "🏪",
    "Regalo": "🎁"
};

function genId() {

    return Date.now().toString(36) +
        Math.random().toString(36).slice(2, 8);

}

function round2(value) {

    return Math.round((Number(value) || 0) * 100) / 100;

}

function money(value) {

    const v = round2(value);

    return (v < 0 ? "−" : "") + "₱" +
        Math.abs(v).toLocaleString("en-PH", { maximumFractionDigits: 2 });

}

function moneySigned(value) {

    const v = round2(value);

    return (v > 0 ? "+" : "") + money(v);

}

function isDateKey(value) {

    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

}


// ---------- Data ----------

function saveWallets() {

    localStorage.setItem("lockedInWallets", JSON.stringify(wallets));

}

function saveTransactions() {

    localStorage.setItem(
        "lockedInTransactions",
        JSON.stringify(transactions)
    );

}

function saveBudgets() {

    localStorage.setItem("lockedInBudgets", JSON.stringify(budgets));

}

let wallets = readJSON("lockedInWallets", []);

if (!Array.isArray(wallets)) wallets = [];

wallets = wallets
    .filter(w => w && typeof w.id === "string" && typeof w.name === "string")
    .map(w => ({
        id: w.id,
        name: w.name,
        opening: Number(w.opening) || 0
    }));

if (wallets.length === 0) {

    wallets = [{ id: genId(), name: "Cash", opening: 0 }];

    saveWallets();

}

let transactions = readJSON("lockedInTransactions", []);

if (!Array.isArray(transactions)) transactions = [];

transactions = transactions
    .filter(t =>
        t &&
        typeof t.id === "string" &&
        isDateKey(t.date) &&
        Number(t.amount) > 0 &&
        ["income", "expense", "transfer"].includes(t.type)
    )
    .map(t => ({ ...t, amount: Number(t.amount) }));

// v8: ang mga lumang record na may income na sa Transactions ay
// ituturing na natanggap na; ang iba ay "hindi pa".
(function migrateWorkPaid() {

    let changed = false;

    Object.keys(workLog).forEach(key => {

        const record = workLog[key];

        if (!record || typeof record !== "object") return;

        if (typeof record.paid !== "boolean") {

            record.paid = Boolean(
                record.worked &&
                transactions.some(t => t.source === "work" && t.workDate === key)
            );

            changed = true;

        }

    });

    if (changed) saveWork();

})();

let budgets = readJSON("lockedInBudgets", {});

if (!budgets || typeof budgets !== "object" || Array.isArray(budgets)) {
    budgets = {};
}


// ---------- Calculations ----------

function walletById(id) {

    return wallets.find(w => w.id === id);

}

function walletName(id) {

    const w = walletById(id);

    return w ? w.name : "—";

}

function walletBalance(id) {

    const w = walletById(id);

    if (!w) return 0;

    let balance = Number(w.opening) || 0;

    transactions.forEach(t => {

        if (t.type === "income" && t.wallet === id) {

            balance += t.amount;

        } else if (t.type === "expense" && t.wallet === id) {

            balance -= t.amount;

        } else if (t.type === "transfer") {

            if (t.wallet === id) balance -= t.amount;

            if (t.toWallet === id) balance += t.amount;

        }

    });

    return round2(balance);

}

function totalBalance() {

    return round2(
        wallets.reduce((sum, w) => sum + walletBalance(w.id), 0)
    );

}

function monthKeyOf(date) {

    return getLocalDate(date).slice(0, 7);

}

function txOfMonth(key) {

    return transactions.filter(t => t.date.startsWith(key));

}

function sumTx(list) {

    let income = 0;
    let expense = 0;

    list.forEach(t => {

        if (t.type === "income") income += t.amount;

        else if (t.type === "expense") expense += t.amount;

    });

    return { income: round2(income), expense: round2(expense) };

}

function daySums(dateKey) {

    return sumTx(transactions.filter(t => t.date === dateKey));

}

function spentIn(category, key) {

    return round2(
        transactions
            .filter(t =>
                t.type === "expense" &&
                t.category === category &&
                t.date.startsWith(key)
            )
            .reduce((sum, t) => sum + t.amount, 0)
    );

}

function walletFlow(id, key) {

    let inflow = 0;
    let outflow = 0;

    transactions.forEach(t => {

        if (!t.date.startsWith(key)) return;

        if (t.type === "income" && t.wallet === id) inflow += t.amount;

        else if (t.type === "expense" && t.wallet === id) outflow += t.amount;

        else if (t.type === "transfer") {

            if (t.toWallet === id) inflow += t.amount;

            if (t.wallet === id) outflow += t.amount;

        }

    });

    return { inflow: round2(inflow), outflow: round2(outflow) };

}

function budgetWarning(category, key) {

    const limit = Number(budgets[category]);

    if (!(limit > 0)) return "";

    const spent = spentIn(category, key);

    if (spent > limit) {

        return `⚠ Lampas na sa budget ng ${category}: ` +
            `${money(spent)} / ${money(limit)}`;

    }

    if (spent >= limit * 0.8) {

        return `⚠ Malapit na sa budget ng ${category}: ` +
            `${money(spent)} / ${money(limit)}`;

    }

    return "";

}


// ---------- Auto-record ng sahod mula sa Construction Work ----------

function autoWorkWalletId() {

    if (settings.workWallet === "off") return null;

    if (walletById(settings.workWallet)) return settings.workWallet;

    return wallets[0] ? wallets[0].id : null;

}

// Gas ng araw na iyon → gastos (kategoryang gasoline). Hindi na kailangang
// hintayin ang sahod, kasi lumalabas na ang pera sa mismong araw.
function syncWorkGas(dateKey) {

    const record = workLog[dateKey];

    const idx = transactions.findIndex(
        t => t.source === "workgas" && t.workDate === dateKey
    );

    const gas = record ? round2(record.gas) : 0;

    if (
        !record ||
        !record.worked ||
        !(gas > 0) ||
        settings.workGas === false
    ) {

        if (idx >= 0) {

            transactions.splice(idx, 1);

            saveTransactions();

        }

        return;
    }

    const walletId = autoWorkWalletId();

    if (!walletId) return;

    const note = record.site ? "Gas · " + record.site : "Gas papunta sa trabaho";

    if (idx >= 0) {

        transactions[idx] = {
            ...transactions[idx],
            amount: gas,
            date: dateKey,
            note
        };

    } else {

        transactions.push({
            id: genId(),
            type: "expense",
            amount: gas,
            category: " gasoline",
            wallet: walletId,
            date: dateKey,
            note,
            source: "workgas",
            workDate: dateKey
        });

    }

    saveTransactions();

}

// Ibinabalik ang pangalan ng wallet kung may na-record/na-update na income.
function syncWorkTransaction(dateKey) {

    syncWorkGas(dateKey);

    const record = workLog[dateKey];

    const idx = transactions.findIndex(
        t => t.source === "work" && t.workDate === dateKey
    );

    const pay = record ? round2(record.pay) : 0;

    // Kapag Off / walang sahod / binura ang record, alisin ang income.
    if (!record || !record.worked || !(pay > 0) || record.paid !== true) {

        if (idx >= 0) {

            transactions.splice(idx, 1);

            saveTransactions();

        }

        return null;

    }

    const walletId = autoWorkWalletId();

    // Naka-off ang auto-record: huwag galawin.
    if (!walletId) return null;

    if (idx >= 0) {

        // Panatilihin ang wallet/category na binago mo mano-mano.
        transactions[idx] = {
            ...transactions[idx],
            amount: pay,
            date: dateKey,
            note: record.site || "Construction work"
        };

    } else {

        transactions.push({
            id: genId(),
            type: "income",
            amount: pay,
            category: "Sahod",
            wallet: walletId,
            date: dateKey,
            note: record.site || "Construction work",
            source: "work",
            workDate: dateKey
        });

    }

    saveTransactions();

    return walletName(transactions[idx >= 0 ? idx : transactions.length - 1].wallet);

}


// ---------- Bottom sheet (para sa wallet, transfer, budget) ----------

let activeSheet = null;

function closeSheet() {

    if (activeSheet) {

        activeSheet.remove();

        activeSheet = null;

    }

}

function openSheet(cfg) {

    closeSheet();

    const sheetBackdrop = makeEl("div", "li-backdrop open");

    const box = makeEl("div", "li-panel");

    sheetBackdrop.appendChild(box);

    const head = makeEl("div", "li-head");

    head.appendChild(makeEl("h2", "", cfg.title));

    const closeBtn = makeEl("button", "li-close", "✕");

    closeBtn.type = "button";

    closeBtn.addEventListener("click", closeSheet);

    head.appendChild(closeBtn);

    box.appendChild(head);

    const form = makeEl("form", "sheet-form");

    form.noValidate = true;

    const inputs = {};

    cfg.fields.forEach(f => {

        const wrap = makeEl("div", "sheet-field");

        wrap.appendChild(makeEl("label", "sheet-label", f.label));

        let input;

        if (f.type === "select") {

            input = makeEl("select", "field");

            f.options.forEach(o => {

                const option = makeEl("option", "", o.label);

                option.value = o.value;

                input.appendChild(option);

            });

            if (f.value !== undefined && f.value !== null) {
                input.value = f.value;
            }

        } else {

            input = makeEl("input", "field");

            input.type = f.type || "text";

            if (f.type === "number") {

                input.inputMode = "decimal";

                input.step = "any";

            }

            if (f.max) input.max = f.max;

            if (f.maxLength) input.maxLength = f.maxLength;

            input.placeholder = f.placeholder || "";

            input.value = f.value === undefined || f.value === null
                ? ""
                : f.value;

        }

        inputs[f.key] = input;

        wrap.appendChild(input);

        form.appendChild(wrap);

    });

    const actions = makeEl("div", "entry-actions");

    const submit = makeEl("button", "primary-btn", cfg.submitLabel || "Save");

    submit.type = "submit";

    actions.appendChild(submit);

    if (cfg.onDelete) {

        const del = makeEl("button", "ghost-btn danger-btn", "Burahin");

        del.type = "button";

        del.addEventListener("click", () => {

            if (cfg.onDelete() !== false) closeSheet();

        });

        actions.appendChild(del);

    }

    form.appendChild(actions);

    if (cfg.note) form.appendChild(makeEl("p", "li-note", cfg.note));

    form.addEventListener("submit", event => {

        event.preventDefault();

        const values = {};

        Object.keys(inputs).forEach(key => {
            values[key] = inputs[key].value;
        });

        if (cfg.onSubmit(values) !== false) closeSheet();

    });

    box.appendChild(form);

    sheetBackdrop.addEventListener("click", event => {

        if (event.target === sheetBackdrop) closeSheet();

    });

    document.body.appendChild(sheetBackdrop);

    activeSheet = sheetBackdrop;

}

document.addEventListener("keydown", event => {

    if (event.key === "Escape") closeSheet();

});


// ---------- Panels ----------

function txTemplate() {

    return `
        <section class="work-stats money-stats">
            <div class="section-heading">
                <div>
                    <p class="eyebrow">MONEY MANAGER</p>
                    <h2>Transactions</h2>
                </div>
            </div>

            <div class="stats-card">
                <div class="calendar-header">
                    <button type="button" data-el="prevMonth">‹</button>
                    <h3 data-el="monthLabel">Month Year</h3>
                    <button type="button" data-el="nextMonth">›</button>
                </div>

                <div class="stats-top">
                    <div>
                        <small>NET NGAYONG BUWAN</small>
                        <h3 data-el="net">₱0</h3>
                        <p data-el="netSub">Kita ₱0 · Gastos ₱0</p>
                    </div>
                    <div class="stats-icon">₱</div>
                </div>

                <p class="cat-title">SAAN NAPUPUNTA ANG PERA</p>

                <div class="cat-list" data-el="breakdown"></div>
            </div>
        </section>

        <section class="calendar-section">
            <div class="section-heading">
                <div>
                    <p class="eyebrow">TALA</p>
                    <h2 data-el="entryTitle">Add Transaction</h2>
                </div>
            </div>

            <div class="calendar-card">
                <div class="entry flush">
                    <div class="toggle-row">
                        <button type="button" class="toggle-btn exp-btn" data-el="btnExpense">− Gastos</button>
                        <button type="button" class="toggle-btn inc-btn" data-el="btnIncome">+ Kita</button>
                    </div>

                    <input class="field" type="number" data-el="amount"
                        inputmode="decimal" min="0" step="any"
                        placeholder="Halaga (₱)">

                    <select class="field" data-el="category"></select>

                    <select class="field" data-el="wallet"></select>

                    <input class="field" type="date" data-el="date">

                    <input class="field" type="text" data-el="note"
                        maxlength="60" placeholder="Note (optional)">

                    <div class="entry-actions">
                        <button type="button" class="primary-btn" data-el="save">Save</button>
                        <button type="button" class="ghost-btn" data-el="cancel">Clear</button>
                    </div>

                    <button type="button" class="ghost-btn danger-btn wide-btn"
                        data-el="remove" style="display:none">Burahin ang record</button>
                </div>
            </div>
        </section>

        <section class="stats-section">
            <div class="section-heading">
                <div>
                    <p class="eyebrow">BUWANANG LIMIT</p>
                    <h2>Budget</h2>
                </div>
                <button type="button" class="chip-btn" data-el="addBudget">＋ Budget</button>
            </div>

            <div class="stats-card">
                <div class="budget-list" data-el="budgets"></div>
            </div>
        </section>

        <section class="calendar-section">
            <div class="section-heading">
                <div>
                    <p class="eyebrow">THIS MONTH</p>
                    <h2>History</h2>
                </div>
                <span class="item-count" data-el="count">0 RECORDS</span>
            </div>

            <div class="chip-row" data-el="filters"></div>

            <div class="work-list" data-el="list"></div>
        </section>
    `;

}

function balanceTemplate() {

    return `
        <section class="work-stats money-stats">
            <div class="section-heading">
                <div>
                    <p class="eyebrow">MONEY MANAGER</p>
                    <h2>Balance</h2>
                </div>
            </div>

            <div class="stats-card">
                <div class="stats-top">
                    <div>
                        <small>KABUUANG BALANCE</small>
                        <h3 data-el="total">₱0</h3>
                        <p data-el="totalSub"></p>
                    </div>
                    <div class="stats-icon">₱</div>
                </div>

                <div class="weekly-chart" data-el="flow"></div>

                <div class="flow-legend">
                    <span><i class="lg-in"></i> Kita</span>
                    <span><i class="lg-out"></i> Gastos</span>
                </div>

                <div class="stats-bottom">
                    <span>Huling 7 araw</span>
                    <strong data-el="flowSum">₱0</strong>
                </div>
            </div>
        </section>

        <section class="calendar-section">
            <div class="section-heading">
                <div>
                    <p class="eyebrow">MGA WALLET</p>
                    <h2>Wallets</h2>
                </div>
            </div>

            <div class="action-row">
                <button type="button" class="primary-btn" data-el="addWallet">＋ Wallet</button>
                <button type="button" class="ghost-btn" data-el="transfer">⇄ Transfer</button>
            </div>

            <div class="work-list" data-el="wallets"></div>
        </section>
    `;

}

const txPanel = makeEl("div", "panel");

txPanel.dataset.panel = "transactions";

txPanel.innerHTML = txTemplate();

panelsHost.appendChild(txPanel);

const tEl = name => txPanel.querySelector(`[data-el="${name}"]`);

const balPanel = makeEl("div", "panel");

balPanel.dataset.panel = "balance";

balPanel.innerHTML = balanceTemplate();

panelsHost.appendChild(balPanel);

const bEl = name => balPanel.querySelector(`[data-el="${name}"]`);

let moneyMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let txFilter = "all";
let draftType = "expense";
let editingTx = null;


// ---------- Dual bar chart (kita vs gastos) ----------
// days: [{ key, name, inc, exp }]

function renderDualBars(container, days, activeKey, onPick) {

    container.innerHTML = "";

    const max = Math.max(0, ...days.map(d => Math.max(d.inc, d.exp)));

    days.forEach(day => {

        const column = makeEl("div", "chart-column");

        if (day.key === activeKey) column.classList.add("active");

        const dual = makeEl("div", "dual");

        [["inc", day.inc], ["exp", day.exp]].forEach(([kind, value]) => {

            const track = makeEl("div", "chart-track");

            const fill = makeEl("div", "chart-fill " + kind);

            fill.style.height = value > 0 && max > 0
                ? Math.max(8, Math.round((value / max) * 100)) + "%"
                : "0%";

            track.appendChild(fill);

            dual.appendChild(track);

        });

        column.appendChild(dual);

        column.appendChild(makeEl("small", "", day.name));

        if (onPick && day.key <= today) {

            column.style.cursor = "pointer";

            column.addEventListener("click", () => onPick(day.key));

        } else if (day.key > today) {

            column.style.opacity = "0.45";

        }

        container.appendChild(column);

    });

}

function lastDays(count) {

    const now = new Date();

    const days = [];

    for (let i = count - 1; i >= 0; i--) {

        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);

        const key = getLocalDate(d);

        const s = daySums(key);

        days.push({
            key,
            name: d.toLocaleDateString("en-US", { weekday: "short" }),
            inc: s.income,
            exp: s.expense
        });

    }

    return days;

}


// ---------- Transactions: summary ----------

function renderTxSummary() {

    const key = monthKeyOf(moneyMonth);

    tEl("monthLabel").textContent = moneyMonth.toLocaleDateString(
        "en-US",
        { month: "long", year: "numeric" }
    );

    const list = txOfMonth(key);

    const s = sumTx(list);

    const net = round2(s.income - s.expense);

    const netEl = tEl("net");

    netEl.textContent = moneySigned(net);

    netEl.className = net > 0 ? "pos" : net < 0 ? "neg" : "";

    tEl("netSub").textContent =
        `Kita ${money(s.income)} · Gastos ${money(s.expense)}`;

    const box = tEl("breakdown");

    box.innerHTML = "";

    const byCategory = {};

    list.forEach(t => {

        if (t.type === "expense") {
            byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
        }

    });

    const rows = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

    if (rows.length === 0) {

        box.appendChild(makeEl(
            "p",
            "cat-empty",
            "Wala pang gastos ngayong buwan."
        ));

        return;
    }

    rows.forEach(([category, amount]) => {

        const pct = s.expense > 0
            ? Math.round((amount / s.expense) * 100)
            : 0;

        const row = makeEl("div", "cat-row");

        const head = makeEl("div", "cat-head");

        head.appendChild(makeEl(
            "span",
            "cat-name",
            `${CATEGORY_ICONS[category] || "✦"} ${category}`
        ));

        head.appendChild(makeEl(
            "span",
            "cat-amt",
            `${money(amount)} · ${pct}%`
        ));

        const track = makeEl("div", "cat-track");

        const fill = makeEl("div", "cat-fill");

        fill.style.width = pct + "%";

        track.appendChild(fill);

        row.appendChild(head);

        row.appendChild(track);

        box.appendChild(row);

    });

}


// ---------- Transactions: form ----------

function fillSelect(select, options) {

    const previous = select.value;

    select.innerHTML = "";

    options.forEach(o => {

        const option = makeEl("option", "", o.label);

        option.value = o.value;

        select.appendChild(option);

    });

    if (options.some(o => o.value === previous)) select.value = previous;

}

function populateTxForm() {

    const categories = draftType === "income"
        ? INCOME_CATEGORIES
        : EXPENSE_CATEGORIES;

    fillSelect(
        tEl("category"),
        categories.map(c => ({
            value: c,
            label: `${CATEGORY_ICONS[c] || "✦"} ${c}`
        }))
    );

    fillSelect(
        tEl("wallet"),
        wallets.map(w => ({ value: w.id, label: "👛 " + w.name }))
    );

}

function setDraftType(type) {

    draftType = type;

    tEl("btnExpense").classList.toggle("on", type === "expense");

    tEl("btnIncome").classList.toggle("on", type === "income");

    populateTxForm();

}

function resetTxForm() {

    editingTx = null;

    tEl("amount").value = "";

    tEl("note").value = "";

    tEl("date").max = today;

    tEl("date").value = today;

    tEl("entryTitle").textContent = "Add Transaction";

    tEl("save").textContent = "Save";

    tEl("cancel").textContent = "Clear";

    tEl("remove").style.display = "none";

    setDraftType(draftType);

}

function loadTxIntoForm(t) {

    editingTx = t.id;

    setDraftType(t.type);

    tEl("amount").value = t.amount;

    tEl("category").value = t.category;

    tEl("wallet").value = t.wallet;

    tEl("date").max = today;

    tEl("date").value = t.date;

    tEl("note").value = t.note || "";

    tEl("entryTitle").textContent = "Edit Transaction";

    tEl("save").textContent = "Update";

    tEl("cancel").textContent = "Cancel";

    tEl("remove").style.display = "";

    tEl("amount").scrollIntoView({ behavior: "smooth", block: "center" });

}

function saveTx() {

    const amount = round2(Number(tEl("amount").value));

    if (!Number.isFinite(amount) || amount <= 0) {

        showToast("Ilagay ang halaga");

        return;
    }

    const date = tEl("date").value;

    if (!isDateKey(date)) {

        showToast("Pumili ng petsa");

        return;
    }

    if (date > today) {

        showToast("Hindi pwede ang petsang hindi pa dumarating");

        return;
    }

    const walletId = tEl("wallet").value;

    if (!walletById(walletId)) {

        showToast("Pumili ng wallet");

        return;
    }

    const record = {
        id: editingTx || genId(),
        type: draftType,
        amount,
        category: tEl("category").value,
        wallet: walletId,
        date,
        note: tEl("note").value.trim()
    };

    const idx = editingTx
        ? transactions.findIndex(t => t.id === editingTx)
        : -1;

    if (idx >= 0) {

        const old = transactions[idx];

        // Manatiling naka-link sa Construction Work kung galing doon.
        if (old.source) {
            record.source = old.source;
            record.workDate = old.workDate;
        }

        transactions[idx] = record;

    } else {

        transactions.push(record);

    }

    saveTransactions();

    const warning = record.type === "expense"
        ? budgetWarning(record.category, date.slice(0, 7))
        : "";

    const saved = parseDate(date);

    moneyMonth = new Date(saved.getFullYear(), saved.getMonth(), 1);

    resetTxForm();

    renderMoney();

    renderRecords();

    showToast(warning || "Na-save ✓");

}

function removeEditingTx() {

    if (!editingTx) return;

    if (!confirm("Burahin ang record na ito?")) return;

    transactions = transactions.filter(t => t.id !== editingTx);

    saveTransactions();

    resetTxForm();

    renderMoney();

    renderRecords();

    showToast("Na-burahin ang record");

}


// ---------- Transactions: budgets ----------

function renderBudgets() {

    const box = tEl("budgets");

    box.innerHTML = "";

    const key = monthKeyOf(moneyMonth);

    const items = Object.keys(budgets)
        .filter(category => Number(budgets[category]) > 0)
        .map(category => {

            const limit = Number(budgets[category]);

            const spent = spentIn(category, key);

            return { category, limit, spent, ratio: spent / limit };

        })
        .sort((a, b) => b.ratio - a.ratio);

    if (items.length === 0) {

        box.appendChild(makeEl(
            "p",
            "cat-empty",
            "Wala pang budget. Pindutin ang ＋ Budget para magtakda ng " +
            "buwanang limit sa isang category."
        ));

        return;
    }

    items.forEach(item => {

        const state = item.ratio > 1
            ? "over"
            : item.ratio >= 0.8
                ? "warn"
                : "ok";

        const row = makeEl("button", "budget-row " + state);

        row.type = "button";

        const head = makeEl("div", "cat-head");

        head.appendChild(makeEl(
            "span",
            "cat-name",
            `${CATEGORY_ICONS[item.category] || "✦"} ${item.category}`
        ));

        head.appendChild(makeEl(
            "span",
            "cat-amt",
            `${money(item.spent)} / ${money(item.limit)}`
        ));

        const track = makeEl("div", "cat-track");

        const fill = makeEl("div", "cat-fill");

        fill.style.width = Math.min(100, Math.round(item.ratio * 100)) + "%";

        track.appendChild(fill);

        row.appendChild(head);

        row.appendChild(track);

        row.appendChild(makeEl(
            "p",
            "budget-foot",
            item.ratio > 1
                ? `Lampas ng ${money(item.spent - item.limit)}`
                : `Natitira ${money(item.limit - item.spent)}`
        ));

        row.addEventListener("click", () => openBudgetSheet(item.category));

        box.appendChild(row);

    });

}

function openBudgetSheet(category) {

    const selected = category || EXPENSE_CATEGORIES[0];

    openSheet({
        title: "Budget",
        submitLabel: "Save",
        fields: [
            {
                key: "category",
                label: "Category",
                type: "select",
                options: EXPENSE_CATEGORIES.map(c => ({
                    value: c,
                    label: `${CATEGORY_ICONS[c] || "✦"} ${c}`
                })),
                value: selected
            },
            {
                key: "limit",
                label: "Limit kada buwan (₱)",
                type: "number",
                value: budgets[selected] || "",
                placeholder: "Hal. 3000"
            }
        ],
        note: "Blangko o 0 ang limit = tatanggalin ang budget ng category na iyon.",
        onSubmit(values) {

            const limit = round2(Number(values.limit));

            if (limit > 0) {

                budgets[values.category] = limit;

            } else {

                delete budgets[values.category];

            }

            saveBudgets();

            renderBudgets();

            showToast("Na-save ang budget ✓");

        },
        onDelete: category && budgets[category] > 0
            ? () => {

                delete budgets[category];

                saveBudgets();

                renderBudgets();

                showToast("Na-tanggal ang budget");

            }
            : null
    });

}


// ---------- Transactions: history list ----------

function buildTxRow(t) {

    const row = makeEl("button", "work-row tx-row");

    row.type = "button";

    row.appendChild(makeEl(
        "span",
        "tx-icon",
        t.type === "transfer" ? "⇄" : (CATEGORY_ICONS[t.category] || "✦")
    ));

    const main = makeEl("div", "row-main");

    main.appendChild(makeEl(
        "span",
        "row-date",
        t.type === "transfer" ? "Transfer" : t.category
    ));

    let sub = t.type === "transfer"
        ? `${walletName(t.wallet)} → ${walletName(t.toWallet)}`
        : walletName(t.wallet);

    if (t.note) sub += " · " + t.note;

    main.appendChild(makeEl("span", "row-site", sub));

    row.appendChild(main);

    const sign = t.type === "income" ? "+" : t.type === "expense" ? "−" : "";

    row.appendChild(makeEl(
        "span",
        "row-pay" +
            (t.type === "expense" ? " is-exp" : t.type === "transfer" ? " is-off" : ""),
        sign + money(t.amount)
    ));

    row.addEventListener("click", () => {

        if (t.type === "transfer") openTransferSheet(t);

        else loadTxIntoForm(t);

    });

    return row;

}

function renderTxList() {

    const key = monthKeyOf(moneyMonth);

    const list = tEl("list");

    list.innerHTML = "";

    const rows = transactions
        .map((t, i) => ({ t, i }))
        .filter(({ t }) =>
            t.date.startsWith(key) &&
            (txFilter === "all" || t.type === txFilter)
        )
        .sort((a, b) =>
            a.t.date < b.t.date ? 1 : a.t.date > b.t.date ? -1 : b.i - a.i
        );

    tEl("count").textContent =
        `${rows.length} ${rows.length === 1 ? "RECORD" : "RECORDS"}`;

    if (rows.length === 0) {

        list.appendChild(makeEl(
            "div",
            "work-empty",
            "Wala pang transactions sa buwan na ito."
        ));

        return;
    }

    let lastDate = "";

    rows.forEach(({ t }) => {

        if (t.date !== lastDate) {

            lastDate = t.date;

            list.appendChild(makeEl(
                "p",
                "tx-day",
                parseDate(t.date).toLocaleDateString(
                    "en-US",
                    { weekday: "short", month: "short", day: "numeric" }
                )
            ));

        }

        list.appendChild(buildTxRow(t));

    });

}

function buildFilters() {

    const box = tEl("filters");

    [
        ["all", "Lahat"],
        ["income", "Kita"],
        ["expense", "Gastos"],
        ["transfer", "Transfer"]
    ].forEach(([value, label]) => {

        const chip = makeEl("button", "chip", label);

        chip.type = "button";

        chip.dataset.filter = value;

        if (value === txFilter) chip.classList.add("active");

        chip.addEventListener("click", () => {

            txFilter = value;

            box.querySelectorAll(".chip").forEach(c => {
                c.classList.toggle("active", c.dataset.filter === value);
            });

            renderTxList();

        });

        box.appendChild(chip);

    });

}


// ---------- Balance ----------

function renderBalance() {

    const total = totalBalance();

    const totalEl = bEl("total");

    totalEl.textContent = money(total);

    totalEl.className = total < 0 ? "neg" : "";

    const s = sumTx(txOfMonth(monthKeyOf(new Date())));

    bEl("totalSub").textContent =
        `Ngayong buwan: Kita ${money(s.income)} · Gastos ${money(s.expense)}`;

    const days = lastDays(7);

    renderDualBars(bEl("flow"), days, null, null);

    const weekIn = round2(days.reduce((sum, d) => sum + d.inc, 0));

    const weekOut = round2(days.reduce((sum, d) => sum + d.exp, 0));

    bEl("flowSum").textContent = `+${money(weekIn)} · −${money(weekOut)}`;

    const box = bEl("wallets");

    box.innerHTML = "";

    const key = monthKeyOf(new Date());

    wallets.forEach(w => {

        const balance = walletBalance(w.id);

        const flow = walletFlow(w.id, key);

        const row = makeEl("button", "work-row wallet-row");

        row.type = "button";

        row.appendChild(makeEl("span", "tx-icon", "👛"));

        const main = makeEl("div", "row-main");

        main.appendChild(makeEl("span", "row-date", w.name));

        main.appendChild(makeEl(
            "span",
            "row-site",
            `Pumasok ${money(flow.inflow)} · Lumabas ${money(flow.outflow)}`
        ));

        row.appendChild(main);

        row.appendChild(makeEl(
            "span",
            "row-pay" + (balance < 0 ? " is-exp" : ""),
            money(balance)
        ));

        row.addEventListener("click", () => openWalletSheet(w));

        box.appendChild(row);

    });

}

function openWalletSheet(existing) {

    const w = existing || null;

    openSheet({
        title: w ? "Edit Wallet" : "Bagong Wallet",
        submitLabel: "Save",
        fields: [
            {
                key: "name",
                label: "Pangalan",
                type: "text",
                value: w ? w.name : "",
                placeholder: "Hal. GCash, Bank, Ipon",
                maxLength: 24
            },
            {
                key: "opening",
                label: "Panimulang balance (₱)",
                type: "number",
                value: w ? w.opening : "",
                placeholder: "0"
            }
        ],
        note: "Ang panimulang balance ay ang laman ng wallet bago ka " +
            "nagsimulang mag-record dito.",
        onSubmit(values) {

            const name = values.name.trim();

            if (!name) {

                showToast("Ilagay ang pangalan ng wallet");

                return false;
            }

            const duplicate = wallets.some(x =>
                x.id !== (w && w.id) &&
                x.name.toLowerCase() === name.toLowerCase()
            );

            if (duplicate) {

                showToast("May wallet na may ganyang pangalan");

                return false;
            }

            const opening = round2(Number(values.opening) || 0);

            if (w) {

                w.name = name;

                w.opening = opening;

            } else {

                wallets.push({ id: genId(), name, opening });

            }

            saveWallets();

            renderMoney();

            renderRecords();

            showToast("Na-save ang wallet ✓");

        },
        onDelete: w
            ? () => {

                if (wallets.length <= 1) {

                    showToast("Kailangan ng kahit isang wallet");

                    return false;
                }

                if (transactions.some(t => t.wallet === w.id || t.toWallet === w.id)) {

                    showToast("May transactions pa ang wallet na ito");

                    return false;
                }

                if (!confirm(`Burahin ang wallet na "${w.name}"?`)) return false;

                wallets = wallets.filter(x => x.id !== w.id);

                if (settings.workWallet === w.id) {

                    settings.workWallet = "";

                    saveSettings();

                }

                saveWallets();

                renderMoney();

                showToast("Na-burahin ang wallet");

            }
            : null
    });

}

function openTransferSheet(existing) {

    if (wallets.length < 2) {

        showToast("Kailangan ng dalawang wallet para mag-transfer");

        return;
    }

    const t = existing || null;

    const options = wallets.map(w => ({ value: w.id, label: w.name }));

    openSheet({
        title: t ? "Edit Transfer" : "Transfer",
        submitLabel: "Save",
        fields: [
            {
                key: "from",
                label: "Mula sa",
                type: "select",
                options,
                value: t ? t.wallet : options[0].value
            },
            {
                key: "to",
                label: "Papunta sa",
                type: "select",
                options,
                value: t ? t.toWallet : options[1].value
            },
            {
                key: "amount",
                label: "Halaga (₱)",
                type: "number",
                value: t ? t.amount : "",
                placeholder: "0"
            },
            {
                key: "date",
                label: "Petsa",
                type: "date",
                value: t ? t.date : today,
                max: today
            },
            {
                key: "note",
                label: "Note (optional)",
                type: "text",
                value: t ? (t.note || "") : "",
                maxLength: 60
            }
        ],
        onSubmit(values) {

            const amount = round2(Number(values.amount));

            if (!(amount > 0)) {

                showToast("Ilagay ang halaga");

                return false;
            }

            if (values.from === values.to) {

                showToast("Magkaibang wallet ang piliin");

                return false;
            }

            if (!isDateKey(values.date) || values.date > today) {

                showToast("Mali ang petsa");

                return false;
            }

            const record = {
                id: t ? t.id : genId(),
                type: "transfer",
                amount,
                category: "Transfer",
                wallet: values.from,
                toWallet: values.to,
                date: values.date,
                note: values.note.trim()
            };

            const idx = t
                ? transactions.findIndex(x => x.id === t.id)
                : -1;

            if (idx >= 0) transactions[idx] = record;

            else transactions.push(record);

            saveTransactions();

            renderMoney();

            renderRecords();

            showToast("Na-transfer ✓");

        },
        onDelete: t
            ? () => {

                if (!confirm("Burahin ang transfer na ito?")) return false;

                transactions = transactions.filter(x => x.id !== t.id);

                saveTransactions();

                renderMoney();

                renderRecords();

                showToast("Na-burahin ang transfer");

            }
            : null
    });

}


// ---------- Render + events ----------

function renderMoney() {

    renderTxSummary();

    populateTxForm();

    renderBudgets();

    renderTxList();

    renderBalance();

}

tEl("btnExpense").addEventListener("click", () => setDraftType("expense"));

tEl("btnIncome").addEventListener("click", () => setDraftType("income"));

tEl("save").addEventListener("click", saveTx);

tEl("cancel").addEventListener("click", resetTxForm);

tEl("remove").addEventListener("click", removeEditingTx);

["amount", "note"].forEach(name => {

    tEl(name).addEventListener("keydown", event => {

        if (event.key === "Enter") {

            event.preventDefault();

            saveTx();

        }

    });

});

tEl("addBudget").addEventListener("click", () => openBudgetSheet());

tEl("prevMonth").addEventListener("click", () => {

    moneyMonth = new Date(moneyMonth.getFullYear(), moneyMonth.getMonth() - 1, 1);

    renderTxSummary();

    renderBudgets();

    renderTxList();

});

tEl("nextMonth").addEventListener("click", () => {

    moneyMonth = new Date(moneyMonth.getFullYear(), moneyMonth.getMonth() + 1, 1);

    renderTxSummary();

    renderBudgets();

    renderTxList();

});

bEl("addWallet").addEventListener("click", () => openWalletSheet());

bEl("transfer").addEventListener("click", () => openTransferSheet());

buildFilters();

resetTxForm();

renderMoney();



// ========================================
// ALL RECORDS
// ========================================

function recordsTemplate() {

    return `
        <section class="calendar-section">
            <div class="section-heading">
                <div>
                    <p class="eyebrow">ALL IN ONE</p>
                    <h2>All Records</h2>
                </div>
            </div>

            <div class="calendar-card">
                <div class="calendar-header">
                    <button type="button" data-el="prevMonth">‹</button>
                    <h3 data-el="monthLabel">Month Year</h3>
                    <button type="button" data-el="nextMonth">›</button>
                </div>

                <div class="calendar-grid" data-el="calendarGrid"></div>

                <p class="rec-note">
                    Apat na tuldok bawat araw, kaliwa → kanan:
                    Habits · Vitamins · Work · Money.<br>
                    Green = complete · Pula = partial · Dilaw = nagtrabaho ·
                    Abo = off · Asul = may money record.
                </p>

                <div class="selected-day" data-el="detail"></div>
            </div>
        </section>

        <section class="stats-section">
            <div class="section-heading">
                <div>
                    <p class="eyebrow" data-el="range">THIS WEEK</p>
                    <h2>Weekly Overview</h2>
                </div>
            </div>

            <div class="stats-card rec-card">
                <div class="rec-top">
                    <div>
                        <small>HABITS</small>
                        <h3 data-el="hVal">0%</h3>
                    </div>
                    <span class="rec-sub" data-el="hSub"></span>
                </div>
                <div class="weekly-chart mini" data-el="hChart"></div>
            </div>

            <div class="stats-card rec-card rec-vit">
                <div class="rec-top">
                    <div>
                        <small>VITAMINS</small>
                        <h3 data-el="vVal">0%</h3>
                    </div>
                    <span class="rec-sub" data-el="vSub"></span>
                </div>
                <div class="weekly-chart mini" data-el="vChart"></div>
            </div>

            <div class="stats-card rec-card rec-work">
                <div class="rec-top">
                    <div>
                        <small>CONSTRUCTION WORK</small>
                        <h3 data-el="kVal">0 days</h3>
                    </div>
                    <span class="rec-sub" data-el="kSub"></span>
                </div>
                <div class="weekly-chart mini" data-el="kChart"></div>
            </div>

            <div class="stats-card rec-card rec-money">
                <div class="rec-top">
                    <div>
                        <small>MONEY</small>
                        <h3 data-el="mVal">₱0</h3>
                    </div>
                    <span class="rec-sub" data-el="mSub"></span>
                </div>
                <div class="weekly-chart mini" data-el="mChart"></div>
            </div>
        </section>
    `;

}

const recordsPanel = makeEl("div", "panel");

recordsPanel.dataset.panel = "records";

recordsPanel.innerHTML = recordsTemplate();

panelsHost.appendChild(recordsPanel);

const rEl = name => recordsPanel.querySelector(`[data-el="${name}"]`);

let recordsDate = today;
let recordsCalendar = new Date();

function checklistDot(record) {

    if (!record || !record.total) return "dim";

    return record.completed === record.total ? "good" : "part";

}

function workDot(record) {

    if (!record) return "dim";

    return record.worked ? "work" : "off";

}

function renderRecordsCalendar() {

    const grid = rEl("calendarGrid");

    grid.innerHTML = "";

    const year = recordsCalendar.getFullYear();
    const month = recordsCalendar.getMonth();

    rEl("monthLabel").textContent = recordsCalendar.toLocaleDateString(
        "en-US",
        { month: "long", year: "numeric" }
    );

    ["S", "M", "T", "W", "T", "F", "S"].forEach(letter => {

        grid.appendChild(makeEl("div", "calendar-day weekday", letter));

    });

    const firstDay = new Date(year, month, 1).getDay();

    const totalDays = new Date(year, month + 1, 0).getDate();

    const habitsHistory = habitsTracker.getHistory();
    const vitaminsHistory = vitaminsTracker.getHistory();

    const moneyDates = new Set(transactions.map(t => t.date));

    for (let i = 0; i < firstDay; i++) {

        grid.appendChild(makeEl("div", "calendar-day empty"));

    }

    for (let day = 1; day <= totalDays; day++) {

        const dateKey = getLocalDate(new Date(year, month, day));

        const cell = makeEl("button", "calendar-day rec");

        cell.type = "button";

        cell.appendChild(makeEl("span", "", String(day)));

        const dots = makeEl("span", "dots");

        [
            checklistDot(habitsHistory[dateKey]),
            checklistDot(vitaminsHistory[dateKey]),
            workDot(workLog[dateKey]),
            moneyDates.has(dateKey) ? "money" : "dim"
        ].forEach(kind => {

            dots.appendChild(makeEl("i", "dot " + kind));

        });

        cell.appendChild(dots);

        if (dateKey === today) cell.classList.add("today");

        if (dateKey === recordsDate) cell.classList.add("selected");

        if (dateKey > today) {

            cell.disabled = true;

        } else {

            cell.addEventListener("click", () => selectRecordsDate(dateKey));

        }

        grid.appendChild(cell);

    }

}

function renderRecordsDetail() {

    const box = rEl("detail");

    box.replaceChildren();

    box.appendChild(makeEl(
        "strong",
        "",
        parseDate(recordsDate).toLocaleDateString(
            "en-US",
            { month: "long", day: "numeric", year: "numeric" }
        )
    ));

    const h = habitsTracker.getHistory()[recordsDate];
    const v = vitaminsTracker.getHistory()[recordsDate];
    const w = workLog[recordsDate];

    box.appendChild(makeEl(
        "p",
        "",
        "Habits: " + (h && h.total ? `${h.completed} of ${h.total} completed` : "No record")
    ));

    box.appendChild(makeEl(
        "p",
        "",
        "Vitamins: " + (v && v.total ? `${v.completed} of ${v.total} completed` : "No record")
    ));

    let workText = "No record";

    if (w) {

        workText = w.worked
            ? "Nagtrabaho" +
              (w.site ? " — " + w.site : "") +
              (w.pay ? " · " + peso(w.pay) : "")
            : "Off";

    }

    box.appendChild(makeEl("p", "", "Work: " + workText));

    const moneyCount = transactions.filter(t => t.date === recordsDate).length;

    const moneyDay = daySums(recordsDate);

    box.appendChild(makeEl(
        "p",
        "",
        "Money: " + (moneyCount
            ? `Kita ${money(moneyDay.income)} · Gastos ${money(moneyDay.expense)} ` +
              `(${moneyCount} ${moneyCount === 1 ? "record" : "records"})`
            : "No record")
    ));

}

function checklistWeek(history, dates) {

    let completed = 0;
    let total = 0;

    const bars = dates.map(date => {

        const key = getLocalDate(date);

        const record = history[key];

        const c = record ? record.completed : 0;
        const t = record ? record.total : 0;

        completed += c;
        total += t;

        return {
            dateKey: key,
            date,
            name: date.toLocaleDateString("en-US", { weekday: "short" }),
            pct: t > 0 ? Math.round((c / t) * 100) : 0
        };

    });

    return {
        bars,
        completed,
        total,
        percent: total > 0 ? Math.round((completed / total) * 100) : 0
    };

}

function renderRecordsStats() {

    const dates = getWeekDates(parseDate(recordsDate));

    rEl("range").textContent =
        (shortDate(dates[0]) + " – " + shortDate(dates[6])).toUpperCase();

    const pick = (key, date) => {

        recordsCalendar = new Date(date.getFullYear(), date.getMonth(), 1);

        selectRecordsDate(key);

    };

    const h = checklistWeek(habitsTracker.getHistory(), dates);

    rEl("hVal").textContent = h.percent + "%";

    rEl("hSub").textContent = `${h.completed} of ${h.total} done`;

    renderBars(rEl("hChart"), h.bars, recordsDate, pick);

    const v = checklistWeek(vitaminsTracker.getHistory(), dates);

    rEl("vVal").textContent = v.percent + "%";

    rEl("vSub").textContent = `${v.completed} of ${v.total} taken`;

    renderBars(rEl("vChart"), v.bars, recordsDate, pick);

    const keys = dates.map(date => getLocalDate(date));

    const week = workSum(keys);

    let maxPay = 0;

    keys.forEach(key => {

        const record = workLog[key];

        if (record && record.worked) {
            maxPay = Math.max(maxPay, Number(record.pay) || 0);
        }

    });

    const workBars = dates.map((date, index) => {

        const record = workLog[keys[index]];

        let pct = 0;

        if (record && record.worked) {

            pct = maxPay > 0
                ? Math.max(15, Math.round(((Number(record.pay) || 0) / maxPay) * 100))
                : 100;

        }

        return {
            dateKey: keys[index],
            date,
            name: date.toLocaleDateString("en-US", { weekday: "short" }),
            pct
        };

    });

    rEl("kVal").textContent =
        `${week.days} ${week.days === 1 ? "day" : "days"}`;

    rEl("kSub").textContent = peso(week.pay);

    renderBars(rEl("kChart"), workBars, recordsDate, pick);

    const moneyDays = dates.map(date => {

        const key = getLocalDate(date);

        const sums = daySums(key);

        return {
            key,
            name: date.toLocaleDateString("en-US", { weekday: "short" }),
            inc: sums.income,
            exp: sums.expense
        };

    });

    const moneyIn = round2(moneyDays.reduce((sum, d) => sum + d.inc, 0));

    const moneyOut = round2(moneyDays.reduce((sum, d) => sum + d.exp, 0));

    rEl("mVal").textContent = moneySigned(moneyIn - moneyOut);

    rEl("mSub").textContent = `Kita ${money(moneyIn)} · Gastos ${money(moneyOut)}`;

    renderDualBars(rEl("mChart"), moneyDays, recordsDate, key => {

        const picked = parseDate(key);

        pick(key, picked);

    });

}

function renderRecords() {

    renderRecordsCalendar();

    renderRecordsDetail();

    renderRecordsStats();

}

function selectRecordsDate(dateKey) {

    recordsDate = dateKey;

    renderRecords();

}

rEl("prevMonth").addEventListener("click", () => {

    recordsCalendar.setDate(1);

    recordsCalendar.setMonth(recordsCalendar.getMonth() - 1);

    renderRecordsCalendar();

});

rEl("nextMonth").addEventListener("click", () => {

    recordsCalendar.setDate(1);

    recordsCalendar.setMonth(recordsCalendar.getMonth() + 1);

    renderRecordsCalendar();

});

renderRecords();


// ========================================
// MY ATTENDANCE (work in Jerusalem)
// Percent ng category = dumalo / naka-schedule.
// Total = average ng mga percent ng category.
// ========================================

const ATT_WEEKDAYS = [
    "Linggo", "Lunes", "Martes", "Miyerkules",
    "Huwebes", "Biyernes", "Sabado"
];

let attendance = readJSON("lockedInAttendance", {});

if (!attendance || typeof attendance !== "object" || Array.isArray(attendance)) {
    attendance = {};
}

attendance.categories = (
    Array.isArray(attendance.categories) ? attendance.categories : []
)
    .filter(c => c && typeof c.id === "string" && typeof c.name === "string")
    .map(c => ({ id: c.id, name: c.name }));

if (
    !attendance.records ||
    typeof attendance.records !== "object" ||
    Array.isArray(attendance.records)
) {
    attendance.records = {};
}

Object.keys(attendance.records).forEach(catId => {

    const rec = attendance.records[catId];

    if (
        !attendance.categories.some(c => c.id === catId) ||
        !rec ||
        typeof rec !== "object" ||
        Array.isArray(rec)
    ) {

        delete attendance.records[catId];

        return;
    }

    Object.keys(rec).forEach(key => {

        if (isDateKey(key)) rec[key] = rec[key] === true;

        else delete rec[key];

    });

});

function saveAttendance() {

    localStorage.setItem("lockedInAttendance", JSON.stringify(attendance));

}

function pctText(percent) {

    if (percent === null) return "—";

    return (Math.round(percent * 100) / 100) + "%";

}

function attEntries(catId, monthKey) {

    const rec = attendance.records[catId] || {};

    return Object.keys(rec)
        .filter(key => key.startsWith(monthKey))
        .sort()
        .map(key => ({ key, yes: rec[key] === true }));

}

function attStats(catId, monthKey) {

    const entries = attEntries(catId, monthKey);

    const attended = entries.filter(e => e.yes).length;

    return {
        entries,
        scheduled: entries.length,
        attended,
        percent: entries.length > 0 ? (attended / entries.length) * 100 : null
    };

}

function attTotal(monthKey) {

    let sum = 0;
    let counted = 0;
    let scheduled = 0;
    let attended = 0;

    attendance.categories.forEach(cat => {

        const s = attStats(cat.id, monthKey);

        if (s.percent === null) return;

        counted++;

        sum += s.percent;

        scheduled += s.scheduled;

        attended += s.attended;

    });

    return {
        percent: counted > 0 ? sum / counted : null,
        counted,
        scheduled,
        attended
    };

}

// state: "none" | "sched" | "yes"
function setAttendance(catId, dateKey, state) {

    if (!attendance.records[catId]) attendance.records[catId] = {};

    const rec = attendance.records[catId];

    if (state === "none") delete rec[dateKey];

    else rec[dateKey] = state === "yes";

    if (Object.keys(rec).length === 0) delete attendance.records[catId];

    saveAttendance();

}

function attTemplate() {

    return `
        <section class="work-stats money-stats">
            <div class="section-heading">
                <div>
                    <p class="eyebrow">WORK IN JERUSALEM</p>
                    <h2>My Attendance</h2>
                </div>
            </div>

            <div class="stats-card">
                <div class="calendar-header">
                    <button type="button" data-el="prevMonth">‹</button>
                    <h3 data-el="monthLabel">Month Year</h3>
                    <button type="button" data-el="nextMonth">›</button>
                </div>

                <div class="stats-top">
                    <div>
                        <small>TOTAL NGAYONG BUWAN</small>
                        <h3 data-el="total">—</h3>
                        <p data-el="totalSub"></p>
                    </div>
                    <div class="stats-icon">✓</div>
                </div>
            </div>
        </section>

        <section class="calendar-section">
            <div class="section-heading">
                <div>
                    <p class="eyebrow">CALENDAR</p>
                    <h2>Pili ng araw</h2>
                </div>
            </div>

            <div class="calendar-card">
                <div class="calendar-grid" data-el="grid"></div>

                <div class="calendar-legend">
                    <span><i class="legend-complete"></i> Dumalo lahat</span>
                    <span><i class="legend-partial"></i> Kulang</span>
                    <span><i class="legend-sched"></i> Naka-schedule</span>
                    <span><i class="legend-empty"></i> Wala</span>
                </div>

                <p class="rec-note">
                    Pindutin ang araw para i-set ang schedule at attendance
                    ng bawat category.
                </p>
            </div>
        </section>

        <section class="stats-section">
            <div class="section-heading">
                <div>
                    <p class="eyebrow">MGA PAGTITIPON</p>
                    <h2>Categories</h2>
                </div>
                <button type="button" class="chip-btn" data-el="addCat">＋ Category</button>
            </div>

            <div data-el="list"></div>

            <p class="rec-note">
                Pindutin ang petsa para i-check o i-uncheck ang attendance.
                Para magtanggal ng petsa, pindutin ang araw sa calendar
                at piliin ang "Wala".
            </p>
        </section>
    `;

}

const attPanel = makeEl("div", "panel");

attPanel.dataset.panel = "attendance";

attPanel.innerHTML = attTemplate();

panelsHost.appendChild(attPanel);

const aEl = name => attPanel.querySelector(`[data-el="${name}"]`);

let attMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);


// ---------- Calendar ----------

function renderAttendanceCalendar() {

    const grid = aEl("grid");

    grid.innerHTML = "";

    const year = attMonth.getFullYear();
    const month = attMonth.getMonth();

    ["S", "M", "T", "W", "T", "F", "S"].forEach(letter => {

        grid.appendChild(makeEl("div", "calendar-day weekday", letter));

    });

    const firstDay = new Date(year, month, 1).getDay();

    const totalDays = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {

        grid.appendChild(makeEl("div", "calendar-day empty"));

    }

    for (let day = 1; day <= totalDays; day++) {

        const dateKey = getLocalDate(new Date(year, month, day));

        const cell = makeEl("button", "calendar-day", String(day));

        cell.type = "button";

        let scheduled = 0;
        let attended = 0;

        attendance.categories.forEach(cat => {

            const rec = attendance.records[cat.id];

            if (rec && dateKey in rec) {

                scheduled++;

                if (rec[dateKey]) attended++;

            }

        });

        if (dateKey === today) cell.classList.add("today");

        if (scheduled > 0) {

            if (attended === scheduled) cell.classList.add("complete");

            else if (attended === 0 && dateKey >= today) cell.classList.add("sched");

            else cell.classList.add("partial");

        }

        cell.addEventListener("click", () => openAttendanceDay(dateKey));

        grid.appendChild(cell);

    }

}


// ---------- Category cards ----------

function renderAttendanceCards(monthKey) {

    const box = aEl("list");

    box.innerHTML = "";

    if (attendance.categories.length === 0) {

        box.innerHTML = `
            <div class="empty-state">
                <span>✦</span>
                <p>Wala pang category.</p>
                <small>Pindutin ang ＋ Category para magsimula.</small>
            </div>
        `;

        return;
    }

    attendance.categories.forEach(cat => {

        const s = attStats(cat.id, monthKey);

        const card = makeEl("div", "stats-card att-card");

        const head = makeEl("div", "cat-head");

        head.appendChild(makeEl("span", "cat-name", cat.name));

        head.appendChild(makeEl(
            "span",
            "cat-amt",
            s.scheduled > 0
                ? `${s.attended}/${s.scheduled} · ${pctText(s.percent)}`
                : "—"
        ));

        card.appendChild(head);

        const track = makeEl("div", "cat-track");

        const fill = makeEl("div", "cat-fill");

        fill.style.width = (s.percent === null ? 0 : s.percent) + "%";

        track.appendChild(fill);

        card.appendChild(track);

        const dates = makeEl("div", "chip-row att-dates");

        s.entries.forEach(entry => {

            const chip = makeEl(
                "button",
                "chip" + (entry.yes ? " att-yes" : entry.key > today ? " att-future" : ""),
                (entry.yes ? "✓ " : "") + shortDate(parseDate(entry.key))
            );

            chip.type = "button";

            chip.addEventListener("click", () => {

                if (entry.key > today) {

                    showToast("Hindi pa dumarating ang petsang ito");

                    return;
                }

                setAttendance(cat.id, entry.key, entry.yes ? "sched" : "yes");

                renderAttendance();

            });

            dates.appendChild(chip);

        });

        const addChip = makeEl("button", "chip att-add", "＋ Petsa");

        addChip.type = "button";

        addChip.addEventListener("click", () => openAttendanceDateSheet(cat));

        dates.appendChild(addChip);

        const editChip = makeEl("button", "chip att-add", "✎ Edit");

        editChip.type = "button";

        editChip.addEventListener("click", () => openAttendanceCategorySheet(cat));

        dates.appendChild(editChip);

        card.appendChild(dates);

        box.appendChild(card);

    });

}

function renderAttendance() {

    const key = monthKeyOf(attMonth);

    aEl("monthLabel").textContent = attMonth.toLocaleDateString(
        "en-US",
        { month: "long", year: "numeric" }
    );

    const total = attTotal(key);

    const totalEl = aEl("total");

    totalEl.textContent = pctText(total.percent);

    totalEl.className = total.percent === null
        ? ""
        : total.percent >= 75
            ? "pos"
            : total.percent < 50
                ? "neg"
                : "";

    aEl("totalSub").textContent = total.counted > 0
        ? `Average ng ${total.counted} category · ` +
          `${total.attended} dumalo sa ${total.scheduled} naka-schedule`
        : "Wala pang naka-schedule ngayong buwan.";

    renderAttendanceCalendar();

    renderAttendanceCards(key);

}


// ---------- Sheets ----------

function fillWeekday(catId, weekday, monthDate) {

    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    const totalDays = new Date(year, month + 1, 0).getDate();

    if (!attendance.records[catId]) attendance.records[catId] = {};

    const rec = attendance.records[catId];

    let added = 0;

    for (let day = 1; day <= totalDays; day++) {

        const date = new Date(year, month, day);

        if (date.getDay() !== weekday) continue;

        const key = getLocalDate(date);

        // Huwag galawin ang naka-check na.
        if (!(key in rec)) {

            rec[key] = false;

            added++;

        }

    }

    if (Object.keys(rec).length === 0) delete attendance.records[catId];

    return added;

}

function openAttendanceCategorySheet(existing) {

    const cat = existing || null;

    openSheet({
        title: cat ? "Edit Category" : "Bagong Category",
        submitLabel: "Save",
        fields: [
            {
                key: "name",
                label: "Pangalan",
                type: "text",
                value: cat ? cat.name : "",
                placeholder: "Hal. General, Chapter",
                maxLength: 30
            },
            {
                key: "weekday",
                label: "Idagdag ang lahat ng araw na ito ngayong buwan",
                type: "select",
                options: [{ value: "", label: "— wala —" }].concat(
                    ATT_WEEKDAYS.map((name, index) => ({
                        value: String(index),
                        label: name
                    }))
                ),
                value: ""
            }
        ],
        note: "Halimbawa: piliin ang Biyernes para ma-schedule agad ang " +
            "lahat ng Biyernes sa buwang tinitingnan mo. Hindi nito " +
            "babaguhin ang mga naka-check na.",
        onSubmit(values) {

            const name = values.name.trim();

            if (!name) {

                showToast("Ilagay ang pangalan ng category");

                return false;
            }

            const duplicate = attendance.categories.some(c =>
                c.id !== (cat && cat.id) &&
                c.name.toLowerCase() === name.toLowerCase()
            );

            if (duplicate) {

                showToast("May category na may ganyang pangalan");

                return false;
            }

            let target = cat;

            if (target) {

                target.name = name;

            } else {

                target = { id: genId(), name };

                attendance.categories.push(target);

            }

            let added = 0;

            if (values.weekday !== "") {

                added = fillWeekday(target.id, Number(values.weekday), attMonth);

            }

            saveAttendance();

            renderAttendance();

            showToast(
                added > 0
                    ? `Na-save ✓ · nadagdag ang ${added} petsa`
                    : "Na-save ang category ✓"
            );

        },
        onDelete: cat
            ? () => {

                if (!confirm(
                    `Burahin ang "${cat.name}" at lahat ng attendance nito?`
                )) {
                    return false;
                }

                attendance.categories = attendance.categories.filter(
                    c => c.id !== cat.id
                );

                delete attendance.records[cat.id];

                saveAttendance();

                renderAttendance();

                showToast("Na-burahin ang category");

            }
            : null
    });

}

function openAttendanceDateSheet(cat) {

    const sameMonth = monthKeyOf(attMonth) === today.slice(0, 7);

    const defaultDate = sameMonth ? today : getLocalDate(attMonth);

    openSheet({
        title: cat.name,
        submitLabel: "Save",
        fields: [
            {
                key: "date",
                label: "Petsa",
                type: "date",
                value: defaultDate
            },
            {
                key: "status",
                label: "Status",
                type: "select",
                options: [
                    { value: "yes", label: "Dumalo" },
                    { value: "sched", label: "Naka-schedule pa lang" }
                ],
                value: defaultDate <= today ? "yes" : "sched"
            }
        ],
        onSubmit(values) {

            if (!isDateKey(values.date)) {

                showToast("Pumili ng petsa");

                return false;
            }

            if (values.status === "yes" && values.date > today) {

                showToast("Hindi pa pwedeng i-check ang petsang hindi pa dumarating");

                return false;
            }

            setAttendance(cat.id, values.date, values.status);

            const picked = parseDate(values.date);

            attMonth = new Date(picked.getFullYear(), picked.getMonth(), 1);

            renderAttendance();

            showToast("Na-save ✓");

        }
    });

}

function openAttendanceDay(dateKey) {

    if (attendance.categories.length === 0) {

        showToast("Magdagdag muna ng category");

        return;
    }

    closeSheet();

    const sheetBackdrop = makeEl("div", "li-backdrop open");

    const box = makeEl("div", "li-panel");

    sheetBackdrop.appendChild(box);

    const head = makeEl("div", "li-head");

    head.appendChild(makeEl(
        "h2",
        "",
        parseDate(dateKey).toLocaleDateString(
            "en-US",
            { weekday: "short", month: "long", day: "numeric" }
        )
    ));

    const closeBtn = makeEl("button", "li-close", "✕");

    closeBtn.type = "button";

    closeBtn.addEventListener("click", closeSheet);

    head.appendChild(closeBtn);

    box.appendChild(head);

    const body = makeEl("div", "att-day");

    box.appendChild(body);

    const future = dateKey > today;

    function draw() {

        body.innerHTML = "";

        attendance.categories.forEach(cat => {

            const rec = attendance.records[cat.id];

            const value = rec && dateKey in rec
                ? (rec[dateKey] ? "yes" : "sched")
                : "none";

            const row = makeEl("div", "att-day-row");

            row.appendChild(makeEl("span", "att-day-name", cat.name));

            const seg = makeEl("div", "seg");

            [
                ["none", "Wala"],
                ["sched", "Schedule"],
                ["yes", "Dumalo"]
            ].forEach(([state, label]) => {

                const button = makeEl(
                    "button",
                    "seg-btn" + (value === state ? " on " + state : ""),
                    label
                );

                button.type = "button";

                if (state === "yes" && future) button.disabled = true;

                button.addEventListener("click", () => {

                    setAttendance(cat.id, dateKey, state);

                    draw();

                    renderAttendance();

                });

                seg.appendChild(button);

            });

            row.appendChild(seg);

            body.appendChild(row);

        });

    }

    draw();

    if (future) {

        box.appendChild(makeEl(
            "p",
            "li-note",
            "Hindi pa dumarating ang araw na ito, kaya schedule lang ang pwede."
        ));

    }

    sheetBackdrop.addEventListener("click", event => {

        if (event.target === sheetBackdrop) closeSheet();

    });

    document.body.appendChild(sheetBackdrop);

    activeSheet = sheetBackdrop;

}

aEl("prevMonth").addEventListener("click", () => {

    attMonth = new Date(attMonth.getFullYear(), attMonth.getMonth() - 1, 1);

    renderAttendance();

});

aEl("nextMonth").addEventListener("click", () => {

    attMonth = new Date(attMonth.getFullYear(), attMonth.getMonth() + 1, 1);

    renderAttendance();

});

aEl("addCat").addEventListener("click", () => openAttendanceCategorySheet());

renderAttendance();


// ========================================
// SIDEBAR + SECTIONS
// ========================================

function pctToday(history) {

    const record = history[today];

    return record && record.total > 0
        ? Math.round((record.completed / record.total) * 100) + "%"
        : "—";

}

const SECTIONS = [
    {
        id: "habits",
        title: "My daily task",
        icon: "✅",
        group: "TRACKER",
        summary: () => pctToday(habitsTracker.getHistory())
    },
    {
        id: "work",
        title: "Construction Work",
        icon: "🛠",
        group: "TRACKER",
        summary: () => {

            const week = workSum(
                getSunSatDates(new Date()).map(date => getLocalDate(date))
            );

            return week.days > 0
                ? `${week.days}d · ${peso(week.pay)}`
                : "—";

        }
    },
    {
        id: "vitamins",
        title: "Daily Vitamins",
        icon: "💊",
        group: "TRACKER",
        summary: () => pctToday(vitaminsTracker.getHistory())
    },
    {
        id: "transactions",
        title: "Transactions",
        icon: "🧾",
        group: "MONEY",
        summary: () => {

            const s = sumTx(txOfMonth(monthKeyOf(new Date())));

            return s.expense > 0 ? "−" + money(s.expense) : "—";

        }
    },
    {
        id: "balance",
        title: "Balance",
        icon: "👛",
        group: "MONEY",
        summary: () => money(totalBalance())
    },
    {
        id: "attendance",
        title: "My Attendance",
        icon: "📋",
        group: "WORK IN JERUSALEM",
        summary: () => pctText(attTotal(monthKeyOf(new Date())).percent)
    },
    {
        id: "records",
        title: "All Records",
        icon: "📅",
        group: "OVERVIEW",
        summary: () => ""
    }
];

// Kung luma pa ang index.html (may lumang tabs), itago ang tabs.
const oldTabs = document.getElementById("tabs");

if (oldTabs) oldTabs.style.display = "none";

let menuButton = menuBtn;
let titleEl = sectionTitle;

// Kung wala ang menu bar sa index.html, gumawa nito.
if (!menuButton || !titleEl) {

    const bar = makeEl("nav", "topbar");

    menuButton = makeEl("button", "menu-btn", "☰");

    menuButton.type = "button";

    menuButton.setAttribute("aria-label", "Open menu");

    titleEl = makeEl("span", "topbar-title", "My daily task");

    bar.appendChild(menuButton);

    bar.appendChild(titleEl);

    panelsHost.parentNode.insertBefore(bar, panelsHost);

}

const sbBackdrop = makeEl("div", "sidebar-backdrop");

const sidebar = makeEl("aside", "sidebar");

sidebar.setAttribute("aria-label", "Sections");

const sbHead = makeEl("div", "sb-head");

const sbBrand = makeEl("div", "sb-brand");

sbBrand.appendChild(makeEl("span", "brand-icon", "L."));

sbBrand.appendChild(makeEl("span", "", "LOCKED IN."));

const sbClose = makeEl("button", "sb-close", "✕");

sbClose.type = "button";

sbClose.setAttribute("aria-label", "Close menu");

sbHead.appendChild(sbBrand);

sbHead.appendChild(sbClose);

sidebar.appendChild(sbHead);

const sbList = makeEl("div", "sb-list");

let lastGroup = "";

SECTIONS.forEach(section => {

    if (section.group !== lastGroup) {

        lastGroup = section.group;

        sbList.appendChild(makeEl("p", "sb-group", section.group));

    }

    const item = makeEl("button", "sb-item");

    item.type = "button";

    item.appendChild(makeEl("span", "sb-icon", section.icon));

    item.appendChild(makeEl("span", "sb-name", section.title));

    const sum = makeEl("span", "sb-sum");

    item.appendChild(sum);

    item.appendChild(makeEl("span", "sb-chev", "›"));

    item.addEventListener("click", () => {

        showSection(section.id);

        closeSidebar();

    });

    section.el = item;

    section.sumEl = sum;

    sbList.appendChild(item);

});

sidebar.appendChild(sbList);

const sbFoot = makeEl("div", "sb-foot");

const sbSettings = makeEl("button", "sb-item sb-settings");

sbSettings.type = "button";

sbSettings.appendChild(makeEl("span", "sb-icon", "⚙"));

sbSettings.appendChild(makeEl("span", "sb-name", "Settings"));

sbSettings.appendChild(makeEl("span", "sb-chev", "›"));

sbSettings.addEventListener("click", () => {

    closeSidebar();

    openSettings();

});

sbFoot.appendChild(sbSettings);

sidebar.appendChild(sbFoot);

document.body.appendChild(sbBackdrop);

document.body.appendChild(sidebar);

function refreshSidebar() {

    SECTIONS.forEach(section => {

        try {

            section.sumEl.textContent = section.summary();

        } catch (error) {

            section.sumEl.textContent = "";

        }

    });

}

function openSidebar() {

    refreshSidebar();

    sidebar.classList.add("open");

    sbBackdrop.classList.add("open");

    document.body.classList.add("no-scroll");

    menuButton.setAttribute("aria-expanded", "true");

}

function closeSidebar() {

    sidebar.classList.remove("open");

    sbBackdrop.classList.remove("open");

    document.body.classList.remove("no-scroll");

    menuButton.setAttribute("aria-expanded", "false");

}

menuButton.addEventListener("click", () => {

    if (sidebar.classList.contains("open")) closeSidebar();

    else openSidebar();

});

sbClose.addEventListener("click", closeSidebar);

sbBackdrop.addEventListener("click", closeSidebar);

document.addEventListener("keydown", event => {

    if (event.key === "Escape") closeSidebar();

});

// I-swipe pakaliwa ang menu para isara.
let sbTouchX = null;

sidebar.addEventListener("touchstart", event => {

    sbTouchX = event.touches[0].clientX;

}, { passive: true });

sidebar.addEventListener("touchend", event => {

    if (sbTouchX === null) return;

    const dx = event.changedTouches[0].clientX - sbTouchX;

    sbTouchX = null;

    if (dx < -60) closeSidebar();

}, { passive: true });

const panelEls = Array.from(panelsHost.querySelectorAll(".panel"));

function showSection(name) {

    const section = SECTIONS.find(s => s.id === name) || SECTIONS[0];

    SECTIONS.forEach(s => {

        s.el.classList.toggle("active", s === section);

    });

    panelEls.forEach(panelEl => {

        panelEl.classList.toggle("active", panelEl.dataset.panel === section.id);

    });

    titleEl.textContent = section.title;

    try {
        localStorage.setItem("lockedInTab", section.id);
    } catch (error) { /* ignore */ }

    if (section.id === "records") renderRecords();

    if (section.id === "attendance") renderAttendance();

    if (section.id === "transactions" || section.id === "balance") {
        renderMoney();
    }

    if (panelsHost.getBoundingClientRect().top < 0) {

        panelsHost.scrollIntoView({ block: "start" });

    }

}

showSection(localStorage.getItem("lockedInTab") || "habits");

refreshSidebar();


// ========================================
// GREETING
// ========================================

const greeting = makeEl("div");

greeting.id = "greeting";

const welcomeSection = document.querySelector(".welcome");

if (welcomeSection) {

    welcomeSection.insertBefore(greeting, welcomeSection.firstChild);

}

function updateGreeting() {

    const hour = new Date().getHours();

    const part = hour < 12
        ? "Good morning"
        : hour < 18
            ? "Good afternoon"
            : "Good evening";

    const name = settings.name.trim();

    greeting.textContent = name ? `${part}, ${name}` : "";

    greeting.style.display = name ? "block" : "none";

}

updateGreeting();


// ========================================
// SETTINGS PANEL (self-contained)
// ========================================

const settingsStyle = document.createElement("style");

settingsStyle.textContent = `
    #greeting {
        font-size: 1.05rem;
        font-weight: 600;
        margin-bottom: 10px;
        opacity: 0.9;
    }
    .calendar-day.sched {
        background: transparent;
        border: 1px dashed #77778a;
        color: #c9c9d3;
    }
    .legend-sched {
        background: transparent;
        border: 1px dashed #8a8a98;
    }
    .work-detail {
        margin: 4px 0 0;
        font-size: .78rem;
        opacity: .75;
        white-space: pre-line;
    }
    .work-detail-month { margin-top: 8px; }
    .pending-box {
        margin-top: 12px;
        padding: 10px 12px;
        border-radius: 12px;
        font-size: .85rem;
        font-weight: 600;
        background: rgba(255,184,77,.14);
        border: 1px solid rgba(255,184,77,.35);
        color: #ffb84d;
    }
    .pending-box.clear {
        background: rgba(69,201,139,.14);
        border-color: rgba(69,201,139,.35);
        color: var(--green);
    }
    .calendar-day.unpaid { box-shadow: inset 0 0 0 2px #ffb84d; }
    .legend-unpaid {
        background: transparent;
        border: 2px solid #ffb84d;
    }
    .paid-row { margin-top: 10px; }
    .att-card { margin-bottom: 12px; }
    .att-card .cat-fill { background: var(--green); }
    .att-dates {
        flex-wrap: wrap;
        overflow: visible;
        margin: 14px 0 0;
    }
    .chip.att-yes {
        background: rgba(69,201,139,.17);
        border-color: rgba(69,201,139,.4);
        color: var(--green);
    }
    .chip.att-future { border-style: dashed; }
    .chip.att-add { color: var(--white); }
    .att-day {
        display: flex;
        flex-direction: column;
        gap: 14px;
        margin-top: 12px;
    }
    .att-day-name {
        display: block;
        margin-bottom: 8px;
        font-weight: 600;
    }
    .seg { display: flex; gap: 6px; }
    .seg-btn {
        flex: 1;
        padding: 10px 6px;
        border-radius: 10px;
        border: 1px solid #2a2a35;
        background: #1f1f28;
        color: #c9c9d3;
        font-family: inherit;
        font-size: .85rem;
        cursor: pointer;
    }
    .seg-btn.on { color: #fff; font-weight: 600; }
    .seg-btn.on.none { background: #3a3a46; border-color: #4c4c5a; }
    .seg-btn.on.sched { background: #2a2a35; border-color: #8a8a98; }
    .seg-btn.on.yes {
        background: #45c98b;
        border-color: #45c98b;
        color: #07140e;
    }
    .seg-btn:disabled { opacity: .35; cursor: default; }
    .li-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,.7);
        z-index: 1000;
        display: none;
        align-items: flex-end;
        justify-content: center;
    }
    .li-backdrop.open { display: flex; }
    .li-panel {
        width: 100%;
        max-width: 520px;
        max-height: 88vh;
        overflow-y: auto;
        background: #14141a;
        border: 1px solid #2a2a35;
        border-radius: 24px 24px 0 0;
        padding: 22px 20px 30px;
        color: #f2f2f5;
        font-family: inherit;
    }
    .li-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
    }
    .li-head h2 { margin: 0; font-size: 1.4rem; }
    .li-close {
        background: #1f1f28;
        border: 1px solid #2a2a35;
        color: #f2f2f5;
        width: 38px;
        height: 38px;
        border-radius: 12px;
        font-size: 18px;
        cursor: pointer;
    }
    .li-section {
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid #23232d;
    }
    .li-section h3 {
        margin: 0 0 10px;
        font-size: .72rem;
        letter-spacing: .18em;
        text-transform: uppercase;
        color: #f0234f;
    }
    .li-input {
        width: 100%;
        box-sizing: border-box;
        padding: 12px 14px;
        border-radius: 12px;
        border: 1px solid #2a2a35;
        background: #1a1a22;
        color: #fff;
        font-size: 1rem;
    }
    .li-row { display: flex; gap: 10px; flex-wrap: wrap; }
    .li-btn {
        flex: 1 1 40%;
        padding: 12px 10px;
        border-radius: 12px;
        border: 1px solid #2a2a35;
        background: #1f1f28;
        color: #f2f2f5;
        font-size: .95rem;
        cursor: pointer;
    }
    .li-btn.on {
        background: #f0234f;
        border-color: #f0234f;
        color: #fff;
        font-weight: 600;
    }
    .li-btn.danger {
        border-color: #6b1a2c;
        color: #ff6b88;
    }
    .li-note {
        margin: 8px 0 0;
        font-size: .8rem;
        opacity: .6;
        line-height: 1.4;
    }
    .li-toast {
        position: fixed;
        left: 50%;
        bottom: 90px;
        transform: translateX(-50%);
        background: #f2f2f5;
        color: #111;
        padding: 10px 16px;
        border-radius: 12px;
        font-size: .9rem;
        z-index: 1100;
        display: none;
        max-width: 90%;
        text-align: center;
    }
`;

document.head.appendChild(settingsStyle);

const backdrop = makeEl("div", "li-backdrop");

const panel = makeEl("div", "li-panel");

backdrop.appendChild(panel);

function makeSection(title) {

    const section = makeEl("div", "li-section");

    section.appendChild(makeEl("h3", "", title));

    panel.appendChild(section);

    return section;

}

function renderEverything() {

    habitsTracker.render();

    vitaminsTracker.render();

    renderWorkAll();

    renderMoney();

    renderAttendance();

    renderRecords();

}

// Header
const head = makeEl("div", "li-head");

head.appendChild(makeEl("h2", "", "Settings"));

const closeButton = makeEl("button", "li-close", "✕");

closeButton.type = "button";

head.appendChild(closeButton);

panel.appendChild(head);

// --- Profile ---
const profileSection = makeSection("Profile");

const nameInput = makeEl("input", "li-input");

nameInput.type = "text";
nameInput.placeholder = "your name";
nameInput.maxLength = 24;
nameInput.value = settings.name;

nameInput.addEventListener("input", () => {

    settings.name = nameInput.value;

    saveSettings();

    updateGreeting();

});

profileSection.appendChild(nameInput);

// --- Weekly view ---
const weeklySection = makeSection("Weekly view (Habits at Vitamins)");

const weeklyRow = makeEl("div", "li-row");

const rollingButton = makeEl("button", "li-btn", "Rolling 7 days");
const fixedButton = makeEl("button", "li-btn", "Sun – Sat");

rollingButton.type = "button";
fixedButton.type = "button";

function refreshWeekButtons() {

    rollingButton.classList.toggle("on", settings.weekMode === "rolling");

    fixedButton.classList.toggle("on", settings.weekMode === "fixed");

}

function setWeekMode(mode) {

    settings.weekMode = mode;

    saveSettings();

    refreshWeekButtons();

    renderEverything();

}

rollingButton.addEventListener("click", () => setWeekMode("rolling"));
fixedButton.addEventListener("click", () => setWeekMode("fixed"));

weeklyRow.appendChild(rollingButton);
weeklyRow.appendChild(fixedButton);

weeklySection.appendChild(weeklyRow);

weeklySection.appendChild(makeEl(
    "p",
    "li-note",
    "Rolling: 7 araw na nagtatapos sa pinindot mong araw. " +
    "Sun – Sat: ang buong linggo. Ang Construction Work ay laging Sun – Sat."
));

refreshWeekButtons();

// --- Money ---
const moneySettingsSection = makeSection("Money");

moneySettingsSection.appendChild(makeEl(
    "p",
    "li-note",
    "Saan papasok ang sahod kapag nag-save ka sa Construction Work?"
));

const workWalletSelect = makeEl("select", "li-input");

workWalletSelect.style.marginTop = "8px";

function refreshWorkWalletSelect() {

    workWalletSelect.innerHTML = "";

    [
        { value: "", label: "Auto (unang wallet)" },
        { value: "off", label: "Huwag i-record" }
    ]
        .concat(wallets.map(w => ({ value: w.id, label: w.name })))
        .forEach(o => {

            const option = makeEl("option", "", o.label);

            option.value = o.value;

            workWalletSelect.appendChild(option);

        });

    workWalletSelect.value =
        settings.workWallet === "off" || walletById(settings.workWallet)
            ? settings.workWallet
            : "";

}

workWalletSelect.addEventListener("change", () => {

    settings.workWallet = workWalletSelect.value;

    saveSettings();

});

moneySettingsSection.appendChild(workWalletSelect);

const syncOldRow = makeEl("div", "li-row");

syncOldRow.style.marginTop = "10px";

const syncOldButton = makeEl("button", "li-btn", "Isama ang lumang sahod");

syncOldButton.type = "button";

syncOldRow.appendChild(syncOldButton);

moneySettingsSection.appendChild(syncOldRow);

moneySettingsSection.appendChild(makeEl(
    "p",
    "li-note",
    "Papasok lang bilang income ang sahod kapag minarkahan mong " +
    "\"Natanggap na\" ang araw. Ang button sa itaas ay magdadagdag ng " +
    "income para sa mga natanggap nang araw na wala pa sa Transactions " +
    "(isang beses lang bawat araw, walang duplicate)."
));

const workGasSelect = makeEl("select", "li-input");

workGasSelect.style.marginTop = "12px";

[
    ["on", "I-record ang gas bilang gastos"],
    ["off", "Huwag i-record ang gas (para sa net lang)"]
].forEach(([value, label]) => {

    const option = makeEl("option", "", label);

    option.value = value;

    workGasSelect.appendChild(option);

});

workGasSelect.value = settings.workGas === false ? "off" : "on";

workGasSelect.addEventListener("change", () => {

    settings.workGas = workGasSelect.value === "on";

    saveSettings();

    Object.keys(workLog).forEach(key => syncWorkGas(key));

    renderMoney();

    renderRecords();

    showToast("Na-update ang gas");

});

moneySettingsSection.appendChild(workGasSelect);

syncOldButton.addEventListener("click", () => {

    const walletId = autoWorkWalletId();

    if (!walletId) {

        showToast("Naka-off ang auto-record ng sahod");

        return;
    }

    const pending = Object.keys(workLog).filter(key => {

        const record = workLog[key];

        return record &&
            record.worked &&
            record.paid === true &&
            Number(record.pay) > 0 &&
            !transactions.some(t => t.source === "work" && t.workDate === key);

    });

    if (pending.length === 0) {

        showToast("Wala nang idadagdag");

        return;
    }

    const total = pending.reduce(
        (sum, key) => sum + (Number(workLog[key].pay) || 0),
        0
    );

    if (!confirm(
        `Magdadagdag ng ${pending.length} income (${money(total)}) ` +
        `sa wallet na "${walletName(walletId)}". Tuloy?`
    )) {
        return;
    }

    pending.forEach(key => syncWorkTransaction(key));

    renderMoney();

    renderRecords();

    showToast(`Naidagdag ang ${pending.length} sahod ✓`);

});

// --- Backup ---
const backupSection = makeSection("Backup");

const backupRow = makeEl("div", "li-row");

const exportButton = makeEl("button", "li-btn", "⬇ Export");
const importButton = makeEl("button", "li-btn", "⬆ Import");

exportButton.type = "button";
importButton.type = "button";

const fileInput = makeEl("input");

fileInput.type = "file";
fileInput.accept = "application/json,.json";
fileInput.style.display = "none";

backupRow.appendChild(exportButton);
backupRow.appendChild(importButton);

backupSection.appendChild(backupRow);
backupSection.appendChild(fileInput);

backupSection.appendChild(makeEl(
    "p",
    "li-note",
    "Isasama ang habits, vitamins, construction work, money, attendance, at settings. " +
    "Ang Import ay papalit sa lahat ng data na nasa app ngayon."
));

exportButton.addEventListener("click", () => {

    const data = {};

    STORAGE_KEYS.forEach(key => {

        data[key] = localStorage.getItem(key);

    });

    const backup = {
        app: "locked-in",
        version: 8,
        exportedAt: new Date().toISOString(),
        data
    };

    const blob = new Blob(
        [JSON.stringify(backup, null, 2)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = `locked-in-backup-${today}.json`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    showToast("Backup na-export ✓");

});

importButton.addEventListener("click", () => {

    fileInput.value = "";

    fileInput.click();

});

// Ginagawang { key: string|null } ang backup (v5 o luma, v4)
function normalizeBackup(parsed) {

    if (!parsed || typeof parsed !== "object") {
        throw new Error("Invalid backup");
    }

    // v5
    if (parsed.data && typeof parsed.data === "object") {

        const out = {};

        STORAGE_KEYS.forEach(key => {

            out[key] = typeof parsed.data[key] === "string"
                ? parsed.data[key]
                : null;

        });

        return out;
    }

    // v4 (habits + history + settings lang)
    if (
        Array.isArray(parsed.habits) &&
        parsed.history &&
        typeof parsed.history === "object"
    ) {

        const out = {};

        STORAGE_KEYS.forEach(key => { out[key] = null; });

        out.lockedInHabits = JSON.stringify(
            parsed.habits
                .filter(h => h && typeof h.name === "string")
                .map(h => ({ name: h.name, completed: Boolean(h.completed) }))
        );

        out.lockedInHistory = JSON.stringify(parsed.history);

        out.lockedInDate = typeof parsed.date === "string"
            ? parsed.date
            : today;

        if (parsed.settings && typeof parsed.settings === "object") {
            out.lockedInSettings = JSON.stringify(parsed.settings);
        }

        return out;
    }

    throw new Error("Invalid backup");

}

fileInput.addEventListener("change", () => {

    const file = fileInput.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {

        let backup;

        try {
        
        backup = normalizeBackup(JSON.parse(reader.result));

            // I-validate ang bawat laman
            STORAGE_KEYS.forEach(key => {

                if (backup[key] === null) return;

                if (DATE_KEYS.includes(key)) {

                    if (!isDateKey(backup[key])) throw new Error("Invalid date");

                } else {

                    JSON.parse(backup[key]);

                }

            });

            if (
                backup.lockedInHabits !== null &&
                !Array.isArray(JSON.parse(backup.lockedInHabits))
            ) {
                throw new Error("Invalid habits");
            }

        } catch (error) {

            showToast("Hindi valid ang backup file ✗");

            return;
        }

        if (!confirm(
            "Papalitan nito ang lahat ng data mo ngayon " +
            "ng laman ng backup. Tuloy?"
        )) {
            return;
        }

        STORAGE_KEYS.forEach(key => {

            if (backup[key] === null) {

                localStorage.removeItem(key);

            } else {

                localStorage.setItem(key, backup[key]);

            }

        });

        location.reload();

    };

    reader.readAsText(file);

});

// --- Danger zone ---
const dangerSection = makeSection("Danger zone");

const dangerRow = makeEl("div", "li-row");

const resetHistoryButton = makeEl("button", "li-btn danger", "Reset history");
const resetWorkButton = makeEl("button", "li-btn danger", "Reset work log");
const resetMoneyButton = makeEl("button", "li-btn danger", "Reset money");
const resetAttendanceButton = makeEl("button", "li-btn danger", "Reset attendance");
const resetAllButton = makeEl("button", "li-btn danger", "Reset lahat");

resetHistoryButton.type = "button";
resetWorkButton.type = "button";
resetMoneyButton.type = "button";
resetAttendanceButton.type = "button";
resetAllButton.type = "button";

dangerRow.appendChild(resetHistoryButton);
dangerRow.appendChild(resetWorkButton);
dangerRow.appendChild(resetMoneyButton);
dangerRow.appendChild(resetAttendanceButton);
dangerRow.appendChild(resetAllButton);

dangerSection.appendChild(dangerRow);

dangerSection.appendChild(makeEl(
    "p",
    "li-note",
    "Reset history: buburahin ang nakaraang araw ng habits at vitamins " +
    "(mananatili ang listahan). Reset work log: buburahin ang lahat ng " +
    "construction records (mananatili ang income sa Transactions). " +
    "Reset money: buburahin ang transactions, wallets, at budgets. " +
    "Reset attendance: buburahin ang categories at attendance. " +
    "Reset lahat: buburahin ang lahat maliban sa settings. " +
    "Mag-Export muna bilang backup!"
));

resetHistoryButton.addEventListener("click", () => {

    if (!confirm("Burahin ang history ng habits at vitamins? Hindi na ito mababawi.")) {
        return;
    }

    habitsTracker.resetHistory();

    vitaminsTracker.resetHistory();

    renderRecords();

    showToast("History na-reset");

});

resetWorkButton.addEventListener("click", () => {

    if (!confirm("Burahin ang LAHAT ng construction work records at sahod? Hindi na ito mababawi.")) {
        return;
    }

    workLog = {};

    saveWork();

    workSelected = today;

    workCalendar = new Date();

    loadDraft();

    renderWorkAll();

    renderRecords();

    showToast("Work log na-reset");

});

resetMoneyButton.addEventListener("click", () => {

    if (!confirm("Burahin ang LAHAT ng transactions, wallets, at budgets? Hindi na ito mababawi.")) {
        return;
    }

    ["lockedInWallets", "lockedInTransactions", "lockedInBudgets"]
        .forEach(key => localStorage.removeItem(key));

    location.reload();

});

resetAttendanceButton.addEventListener("click", () => {

    if (!confirm("Burahin ang LAHAT ng categories at attendance records? Hindi na ito mababawi.")) {
        return;
    }

    localStorage.removeItem("lockedInAttendance");

    location.reload();

});

resetAllButton.addEventListener("click", () => {

    if (!confirm("Burahin ang LAHAT ng habits, vitamins, work records, at money? Hindi na ito mababawi.")) {
        return;
    }

    if (!confirm("Sigurado ka talaga, Mr. President?")) {
        return;
    }

    STORAGE_KEYS
        .filter(key => key !== "lockedInSettings")
        .forEach(key => localStorage.removeItem(key));

    location.reload();

});

panel.appendChild(makeEl(
    "p",
    "li-note",
    "LOCKED IN. v8 — Discipline today. Freedom tomorrow."
));

function openSettings() {

    nameInput.value = settings.name;

    refreshWorkWalletSelect();

    refreshWeekButtons();

    backdrop.classList.add("open");

}

function closeSettings() {

    backdrop.classList.remove("open");

}

closeButton.addEventListener("click", closeSettings);

backdrop.addEventListener("click", event => {

    if (event.target === backdrop) closeSettings();

});

document.addEventListener("keydown", event => {

    if (event.key === "Escape") closeSettings();

});

document.body.appendChild(backdrop);


// ========================================
// SERVICE WORKER
// ========================================

if ("serviceWorker" in navigator) {

    window.addEventListener("load", () => {

        navigator.serviceWorker.register("./sw.js")

            .then(() => {

                console.log(
                    "LOCKED IN: Offline support ready."
                );

            })

            .catch(error => {

                console.error(
                    "Service Worker Error:",
                    error
                );

            });

    });

}
