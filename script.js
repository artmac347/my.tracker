// ========================================
// LOCKED IN. V5
// Habits + Construction Work + Vitamins
// + All Records + Settings
// ========================================


// ========================================
// BASIC HELPERS
// ========================================

const panelsHost = document.getElementById("panels");
const tabsNav = document.getElementById("tabs");

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
    "lockedInSettings"
];

let settings = {
    name: "",
    weekMode: "rolling", // "rolling" o "fixed"
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
                    </div>
                    <div class="stats-icon">🛠</div>
                </div>

                <div class="weekly-chart" data-el="chart"></div>

                <div class="stats-bottom">
                    <span data-el="monthLabelStat">This month</span>
                    <strong data-el="monthSummary">0 days · ₱0</strong>
                </div>
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

function saveWork() {

    localStorage.setItem("lockedInWork", JSON.stringify(workLog));

}

function workSum(dateKeys) {

    let days = 0;
    let pay = 0;

    dateKeys.forEach(key => {

        const record = workLog[key];

        if (record && record.worked) {

            days++;

            pay += Number(record.pay) || 0;

        }

    });

    return { days, pay };

}

function monthKeys(anchor) {

    const prefix = getLocalDate(anchor).slice(0, 7);

    return Object.keys(workLog).filter(key => key.startsWith(prefix));

}

function refreshToggle() {

    wEl("btnWorked").classList.toggle("on", draftWorked);

    wEl("btnOff").classList.toggle("on", !draftWorked);

    wEl("fields").style.display = draftWorked ? "" : "none";

}

function loadDraft() {

    const record = workLog[workSelected];

    draftWorked = record ? Boolean(record.worked) : true;

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

    const month = workSum(monthKeys(anchor));

    wEl("monthLabelStat").textContent = anchor.toLocaleDateString(
        "en-US",
        { month: "long", year: "numeric" }
    );

    wEl("monthSummary").textContent =
        `${month.days} ${month.days === 1 ? "day" : "days"} · ${peso(month.pay)}`;

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

        row.appendChild(makeEl(
            "span",
            record.worked ? "row-pay" : "row-pay is-off",
            record.worked ? peso(record.pay) : "Off"
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

wEl("save").addEventListener("click", () => {

    let pay = Number(wEl("pay").value);

    if (!Number.isFinite(pay) || pay < 0) pay = 0;

    pay = Math.round(pay * 100) / 100;

    workLog[workSelected] = {
        worked: draftWorked,
        site: draftWorked ? wEl("site").value.trim() : "",
        pay: draftWorked ? pay : 0
    };

    saveWork();

    loadDraft();

    renderWorkAll();

    renderRecords();

    showToast("Na-save ✓");

});

wEl("clear").addEventListener("click", () => {

    if (!workLog[workSelected]) return;

    if (!confirm("Burahin ang record ng araw na ito?")) return;

    delete workLog[workSelected];

    saveWork();

    loadDraft();

    renderWorkAll();

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
                    Tatlong tuldok bawat araw, kaliwa → kanan:
                    Habits · Vitamins · Work.<br>
                    Green = complete · Pula = partial · Dilaw = nagtrabaho ·
                    Abo = off.
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
            workDot(workLog[dateKey])
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
// TABS
// ========================================

const tabButtons = Array.from(tabsNav.querySelectorAll(".tab"));

const panelEls = Array.from(panelsHost.querySelectorAll(".panel"));

function showTab(name) {

    tabButtons.forEach(button => {

        button.classList.toggle("active", button.dataset.tab === name);

    });

    panelEls.forEach(panel => {

        panel.classList.toggle("active", panel.dataset.panel === name);

    });

    try {
        localStorage.setItem("lockedInTab", name);
    } catch (error) { /* ignore */ }

    if (name === "records") renderRecords();

    if (panelsHost.getBoundingClientRect().top < 0) {

        panelsHost.scrollIntoView({ block: "start" });

    }

}

tabButtons.forEach(button => {

    button.addEventListener("click", () => showTab(button.dataset.tab));

});

const savedTab = localStorage.getItem("lockedInTab");

showTab(
    tabButtons.some(button => button.dataset.tab === savedTab)
        ? savedTab
        : "habits"
);


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
    .li-gear {
        position: fixed;
        right: 18px;
        bottom: 22px;
        width: 52px;
        height: 52px;
        border-radius: 16px;
        border: 1px solid #2a2a35;
        background: #1a1a22;
        color: #f0234f;
        font-size: 24px;
        cursor: pointer;
        z-index: 900;
        box-shadow: 0 6px 20px rgba(0,0,0,.5);
    }
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

const gearButton = makeEl("button", "li-gear", "⚙");

gearButton.type = "button";
gearButton.setAttribute("aria-label", "Settings");

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
nameInput.placeholder = "Pangalan mo (hal. Macmac)";
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
    "Isasama ang habits, vitamins, construction work, at settings. " +
    "Ang Import ay papalit sa lahat ng data na nasa app ngayon."
));

exportButton.addEventListener("click", () => {

    const data = {};

    STORAGE_KEYS.forEach(key => {

        data[key] = localStorage.getItem(key);

    });

    const backup = {
        app: "locked-in",
        version: 5,
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

                if (backup[key] !== null) JSON.parse(backup[key]);

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
const resetAllButton = makeEl("button", "li-btn danger", "Reset lahat");

resetHistoryButton.type = "button";
resetWorkButton.type = "button";
resetAllButton.type = "button";

dangerRow.appendChild(resetHistoryButton);
dangerRow.appendChild(resetWorkButton);
dangerRow.appendChild(resetAllButton);

dangerSection.appendChild(dangerRow);

dangerSection.appendChild(makeEl(
    "p",
    "li-note",
    "Reset history: buburahin ang nakaraang araw ng habits at vitamins " +
    "(mananatili ang listahan). Reset work log: buburahin ang lahat ng " +
    "construction records. Reset lahat: buburahin ang lahat maliban sa settings. " +
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

resetAllButton.addEventListener("click", () => {

    if (!confirm("Burahin ang LAHAT ng habits, vitamins, at work records? Hindi na ito mababawi.")) {
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
    "LOCKED IN. v5 — Discipline today. Freedom tomorrow."
));

function openSettings() {

    nameInput.value = settings.name;

    refreshWeekButtons();

    backdrop.classList.add("open");

}

function closeSettings() {

    backdrop.classList.remove("open");

}

gearButton.addEventListener("click", openSettings);

closeButton.addEventListener("click", closeSettings);

backdrop.addEventListener("click", event => {

    if (event.target === backdrop) closeSettings();

});

document.addEventListener("keydown", event => {

    if (event.key === "Escape") closeSettings();

});

document.body.appendChild(gearButton);
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
