
// ========================================
// LOCKED IN. V2 - HABIT TRACKER
// ========================================

// ELEMENTS

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


// LOCAL DATE HELPER

function getLocalDate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

const today = getLocalDate();


// STORAGE

let habits = JSON.parse(
    localStorage.getItem("lockedInHabits")
) || [];

let history = JSON.parse(
    localStorage.getItem("lockedInHistory")
) || {};

let lastDate = localStorage.getItem("lockedInDate");


// RESET COMPLETION ON A NEW DAY

if (lastDate !== today) {

    if (lastDate) {
        const previous = new Date(lastDate + "T00:00:00");
        const current = new Date(today + "T00:00:00");

        const difference = Math.round(
            (current - previous) / 86400000
        );

        if (difference > 1) {
            // Missed days do not count toward streak.
        }
    }

    habits = habits.map(habit => ({
        ...habit,
        completed: false
    }));

    localStorage.setItem("lockedInDate", today);
    localStorage.setItem(
        "lockedInHabits",
        JSON.stringify(habits)
    );
}


// DATE DISPLAY

currentDate.textContent = new Date().toLocaleDateString(
    "en-US",
    {
        weekday: "long",
        month: "long",
        day: "numeric"
    }
);


// SAVE CURRENT DAY HISTORY

function saveTodayHistory() {

    const total = habits.length;

    const completed = habits.filter(
        habit => habit.completed
    ).length;

    history[today] = {
        total: total,
        completed: completed,
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


// SAVE ALL DATA

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
        name: name,
        completed: false
    });

    habitInput.value = "";

    saveData();

});


// ========================================
// DAILY PROGRESS
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

    habitCount.textContent =
        `${total} HABITS`;

}


// ========================================
// STREAK SYSTEM
// ========================================

function updateStreak() {

    let streak = 0;

    const todayRecord = history[today];

    // If today is not completed yet,
    // start checking from yesterday.

    let date = new Date(today + "T00:00:00");

    if (
        !todayRecord ||
        todayRecord.total === 0 ||
        todayRecord.completed !== todayRecord.total
    ) {
        date.setDate(date.getDate() - 1);
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
// MONTHLY CALENDAR
// ========================================

let calendarDate = new Date(
    new Date(today + "T00:00:00").getFullYear(),
    new Date(today + "T00:00:00").getMonth(),
    1
);

let selectedDate = today;

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

        const element = document.createElement("div");

        element.className = "calendar-day weekday";
        element.textContent = day;

        calendarGrid.appendChild(element);

    });

    const firstDay = new Date(year, month, 1).getDay();

    const daysInMonth = new Date(year, month + 1, 0).getDate();


    // EMPTY CELLS

    for (let i = 0; i < firstDay; i++) {

        const empty = document.createElement("div");

        empty.className = "calendar-day empty";

        calendarGrid.appendChild(empty);

    }


    // CALENDAR DATES

    for (let day = 1; day <= daysInMonth; day++) {

        const dateKey =
            `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        const record = history[dateKey];

        const cell = document.createElement("button");

        cell.type = "button";
        cell.className = "calendar-day";
        cell.textContent = day;

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

        cell.addEventListener("click", () => {

            selectedDate = dateKey;

            renderCalendar();
            showSelectedDay(dateKey);

        });

        calendarGrid.appendChild(cell);

    }

}


// CALENDAR NAVIGATION

document.getElementById("prevMonth").addEventListener(
    "click",
    () => {

        calendarDate.setMonth(calendarDate.getMonth() - 1);

        renderCalendar();

    }
);

document.getElementById("nextMonth").addEventListener(
    "click",
    () => {

        calendarDate.setMonth(calendarDate.getMonth() + 1);

        renderCalendar();

    }
);


// ========================================
// SELECTED DAY HISTORY
// ========================================


function showSelectedDay(dateKey) {

    selectedDay.replaceChildren();

    const record = history[dateKey];

    const readableDate = new Date(
        dateKey + "T00:00:00"
    ).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
    });

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

    record.habits.forEach(habit => {

        const line = document.createElement("p");

        line.textContent =
            `${habit.completed ? "✓" : "○"} ${habit.name}`;

        selectedDay.appendChild(line);

    });

}


// ========================================
// WEEKLY STATISTICS
// ========================================

function renderWeeklyStats() {

    weeklyChart.innerHTML = "";

    let totalCompleted = 0;
    let totalHabits = 0;

    const days = [];

    for (let i = 6; i >= 0; i--) {

        const date = new Date(today + "T00:00:00");

        date.setDate(date.getDate() - i);

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
            name: date.toLocaleDateString("en-US", {
                weekday: "short"
            }),
            percentage: percentage
        });

    }


    days.forEach(day => {

        const column = document.createElement("div");

        column.className = "chart-column";

        column.innerHTML = `
            <div class="chart-track">
                <div class="chart-fill"
                    style="height: ${day.percentage}%">
                </div>
            </div>
            <small>${day.name}</small>
        `;

        weeklyChart.appendChild(column);

    });


    const average = totalHabits > 0
        ? Math.round((totalCompleted / totalHabits) * 100)
        : 0;

    weeklyPercent.textContent = average + "%";

    weeklyCompleted.textContent = totalCompleted;

}


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


// INITIALIZE

saveTodayHistory();

renderAll();

 // REGISTER SERVICE WORKER

if ("serviceWorker" in navigator) {

    window.addEventListener("load", () => {

        navigator.serviceWorker.register("./sw.js")
            .then(() => {
                console.log("LOCKED IN: Offline support ready.");
            })
            .catch(error => {
                console.error("Service Worker Error:", error);
            });

    });

}