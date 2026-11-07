// ========================================
// LOCKED IN. V3 - HABIT TRACKER
// ========================================


// ========================================
// ELEMENTS
// ========================================

const habitForm = document.getElementById("habitForm");
const habitInput = document.getElementById("habitInput");
const habitList = document.getElementById("habitList");

const progressPercent = document.getElementById("progressPercent");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");

const habitCount = document.getElementById("habitCount");
const currentDate = document.getElementById("currentDate");
const streakCount = document.getElementById("streakCount");

const calendarGrid = document.getElementById("calendarGrid");
const monthLabel = document.getElementById("monthLabel");
const selectedDay = document.getElementById("selectedDay");

const weeklyChart = document.getElementById("weeklyChart");
const weeklyPercent = document.getElementById("weeklyPercent");
const weeklyCompleted = document.getElementById("weeklyCompleted");

// OPTIONAL: kung may element ka na id="weeklyRange"
// (yung "LAST 7 DAYS" label), mag-a-update siya ng
// "Nov 2 – Nov 8". Kung wala, walang mangyayari.
const weeklyRange = document.getElementById("weeklyRange");

const prevMonth = document.getElementById("prevMonth");
const nextMonth = document.getElementById("nextMonth");


// ========================================
// DATE SYSTEM
// ========================================

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

let selectedDate = today;
let calendarDate = new Date();


// ========================================
// STORAGE
// ========================================

let habits = JSON.parse(
    localStorage.getItem("lockedInHabits")
) || [];

let history = JSON.parse(
    localStorage.getItem("lockedInHistory")
) || {};

let lastDate = localStorage.getItem("lockedInDate");


// ========================================
// NEW DAY RESET
// ========================================

if (lastDate !== today) {

    habits = habits.map(habit => ({
        ...habit,
        completed: false
    }));

    localStorage.setItem(
        "lockedInHabits",
        JSON.stringify(habits)
    );

    localStorage.setItem("lockedInDate", today);
}


// ========================================
// DATE DISPLAY
// ========================================

currentDate.textContent = new Date().toLocaleDateString(
    "en-US",
    {
        weekday: "long",
        month: "long",
        day: "numeric"
    }
);


// ========================================
// SAVE HISTORY
// ========================================

function saveTodayHistory() {

    const total = habits.length;

    const completed = habits.filter(
        habit => habit.completed
    ).length;

    history[today] = {
        total,
        completed,
        habits: habits.map(habit => ({
            name: habit.name,
            completed: habit.completed
        }))
    };

    localStorage.setItem(
        "lockedInHistory",
        JSON.stringify(history)
    );

    localStorage.setItem(
        "lockedInHabits",
        JSON.stringify(habits)
    );

    localStorage.setItem("lockedInDate", today);
}


// ========================================
// SAVE DATA
// ========================================

function saveData() {

    saveTodayHistory();

    renderAll();

}


// ========================================
// HABIT RENDERING
// ========================================

function renderHabits() {

    habitList.innerHTML = "";

    if (habits.length === 0) {

        habitList.innerHTML = `
            <div class="empty-state">
                <span>✦</span>
                <p>No habits yet.</p>
                <small>Start building your routine today.</small>
            </div>
        `;

        return;
    }

    habits.forEach((habit, index) => {

        const item = document.createElement("div");

        item.className = "habit-item";

        if (habit.completed) {
            item.classList.add("completed");
        }

        const checkbox = document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.className = "habit-check";
        checkbox.checked = habit.completed;

        checkbox.addEventListener("change", () => {

            habits[index].completed = checkbox.checked;

            saveData();

        });

        const name = document.createElement("span");

        name.className = "habit-name";
        name.textContent = habit.name;

        const deleteButton = document.createElement("button");

        deleteButton.className = "delete-btn";
        deleteButton.textContent = "×";
        deleteButton.setAttribute("aria-label", "Delete habit");

        deleteButton.addEventListener("click", () => {

            habits.splice(index, 1);

            saveData();

        });

        item.appendChild(checkbox);
        item.appendChild(name);
        item.appendChild(deleteButton);

        habitList.appendChild(item);

    });

}


// ========================================
// ADD HABIT
// ========================================

habitForm.addEventListener("submit", event => {

    event.preventDefault();

    const name = habitInput.value.trim();

    if (!name) return;

    habits.push({
        name,
        completed: false
    });

    habitInput.value = "";

    saveData();

});


// ========================================
// DAILY PROGRESS (laging para sa TODAY)
// ========================================

function updateProgress() {

    const total = habits.length;

    const completed = habits.filter(
        habit => habit.completed
    ).length;

    const percentage = total === 0
        ? 0
        : Math.round((completed / total) * 100);

    progressPercent.textContent = percentage + "%";

    progressBar.style.width = percentage + "%";

    progressText.textContent =
        `${completed} of ${total} habits completed`;

    habitCount.textContent = `${total} HABITS`;

}


// ========================================
// HISTORICAL STREAK SYSTEM
// ========================================

function updateStreak() {

    let streak = 0;

    let date = parseDate(selectedDate);

    const selectedRecord = history[selectedDate];

    if (selectedDate === today) {

        if (
            !selectedRecord ||
            selectedRecord.total === 0 ||
            selectedRecord.completed !== selectedRecord.total
        ) {

            date.setDate(date.getDate() - 1);

        }

    } else {

        if (
            !selectedRecord ||
            selectedRecord.total === 0 ||
            selectedRecord.completed !== selectedRecord.total
        ) {

            streakCount.textContent = 0;
            return;

        }

    }

    while (true) {

        const dateKey = getLocalDate(date);

        const record = history[dateKey];

        if (
            !record ||
            record.total === 0 ||
            record.completed !== record.total
        ) {

            break;

        }

        streak++;

        date.setDate(date.getDate() - 1);

    }

    streakCount.textContent = streak;

}


// ========================================
// SELECTED DAY HISTORY
// ========================================

function showSelectedDay(dateKey) {

    selectedDay.replaceChildren();

    const record = history[dateKey];

    const readableDate = parseDate(dateKey).toLocaleDateString(
        "en-US",
        {
            month: "long",
            day: "numeric",
            year: "numeric"
        }
    );

    const heading = document.createElement("strong");

    heading.textContent = readableDate;

    selectedDay.appendChild(heading);

    if (!record) {

        const message = document.createElement("p");

        message.textContent = "No recorded habits.";

        selectedDay.appendChild(message);

        return;
    }

    const summary = document.createElement("p");

    summary.textContent =
        `${record.completed} of ${record.total} completed`;

    selectedDay.appendChild(summary);

    (record.habits || []).forEach(habit => {

        const line = document.createElement("p");

        line.textContent =
            `${habit.completed ? "✓" : "○"} ${habit.name}`;

        selectedDay.appendChild(line);

    });

}


// ========================================
// WEEKLY STATISTICS
// Sumusunod sa selectedDate (7 days na
// nagtatapos sa araw na pinindot mo).
// ========================================

function renderWeeklyStats() {

    weeklyChart.innerHTML = "";

    let totalCompleted = 0;
    let totalHabits = 0;

    const days = [];

    const anchorDate = parseDate(selectedDate);

    for (let i = 6; i >= 0; i--) {

        const date = new Date(
            anchorDate.getFullYear(),
            anchorDate.getMonth(),
            anchorDate.getDate() - i
        );

        const dateKey = getLocalDate(date);

        const record = history[dateKey];

        const completed = record ? record.completed : 0;

        const total = record ? record.total : 0;

        const percentage = total > 0
            ? Math.round((completed / total) * 100)
            : 0;

        totalCompleted += completed;
        totalHabits += total;

        days.push({
            dateKey,
            date,
            name: date.toLocaleDateString("en-US", {
                weekday: "short"
            }),
            percentage
        });

    }

    days.forEach(day => {

        const column = document.createElement("div");

        column.className = "chart-column";

        // Naka-highlight ang araw na pinindot
        if (day.dateKey === selectedDate) {
            column.classList.add("active");
        }

        column.innerHTML = `
            <div class="chart-track">
                <div class="chart-fill"
                    style="height: ${day.percentage}%">
                </div>
            </div>
            <small>${day.name}</small>
        `;

        // Pwede ring pindutin ang bar para lumipat ng araw
        column.style.cursor = "pointer";

        column.addEventListener("click", () => {

            calendarDate = new Date(
                day.date.getFullYear(),
                day.date.getMonth(),
                1
            );

            selectDate(day.dateKey);

        });

        weeklyChart.appendChild(column);

    });

    const average = totalHabits > 0
        ? Math.round(
            (totalCompleted / totalHabits) * 100
        )
        : 0;

    weeklyPercent.textContent = average + "%";

    weeklyCompleted.textContent = totalCompleted;

    if (weeklyRange) {

        const fmt = { month: "short", day: "numeric" };

        weeklyRange.textContent =
            days[0].date.toLocaleDateString("en-US", fmt) +
            " – " +
            days[6].date.toLocaleDateString("en-US", fmt);

    }

}


// ========================================
// MONTHLY CALENDAR
// ========================================

function renderCalendar() {

    calendarGrid.innerHTML = "";

    const year = calendarDate.getFullYear();

    const month = calendarDate.getMonth();

    monthLabel.textContent = calendarDate.toLocaleDateString(
        "en-US",
        {
            month: "long",
            year: "numeric"
        }
    );

    const weekdays = ["S", "M", "T", "W", "T", "F", "S"];

    weekdays.forEach(day => {

        const cell = document.createElement("div");

        cell.className = "calendar-day weekday";

        cell.textContent = day;

        calendarGrid.appendChild(cell);

    });

    const firstDay = new Date(year, month, 1).getDay();

    const totalDays = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {

        const empty = document.createElement("div");

        empty.className = "calendar-day empty";

        calendarGrid.appendChild(empty);

    }

    for (let day = 1; day <= totalDays; day++) {

        const date = new Date(year, month, day);

        const dateKey = getLocalDate(date);

        const cell = document.createElement("button");

        cell.type = "button";

        cell.className = "calendar-day";

        cell.textContent = day;

        const record = history[dateKey];

        if (dateKey === today) {
            cell.classList.add("today");
        }

        if (dateKey === selectedDate) {
            cell.classList.add("selected");
        }

        if (record && record.total > 0) {

            if (record.completed === record.total) {

                cell.classList.add("complete");

            } else {

                cell.classList.add("partial");

            }

        }

        if (dateKey > today) {

            cell.disabled = true;

        } else {

            cell.addEventListener("click", () => {

                selectDate(dateKey);

            });

        }

        calendarGrid.appendChild(cell);

    }

}


// ========================================
// SELECT DATE - MAIN UPDATE
// ========================================

function selectDate(dateKey) {

    selectedDate = dateKey;

    renderCalendar();

    showSelectedDay(selectedDate);

    updateStreak();

    renderWeeklyStats();

}


// ========================================
// CALENDAR NAVIGATION
// ========================================

prevMonth.addEventListener("click", () => {

    calendarDate.setDate(1);

    calendarDate.setMonth(
        calendarDate.getMonth() - 1
    );

    renderCalendar();

});


nextMonth.addEventListener("click", () => {

    calendarDate.setDate(1);

    calendarDate.setMonth(
        calendarDate.getMonth() + 1
    );

    renderCalendar();

});


// ========================================
// RENDER EVERYTHING
// ========================================

function renderAll() {

    renderHabits();

    updateProgress();

    updateStreak();

    renderCalendar();

    showSelectedDay(selectedDate);

    renderWeeklyStats();

}


// ========================================
// INITIALIZE
// ========================================

saveTodayHistory();

renderAll();


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
