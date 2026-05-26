const legacyStorageKey = "setlog-workout-tracker-v1";
const usersStorageKey = "workout-tracker-users-v1";
const sessionStorageKey = "workout-tracker-active-user-v1";

const seedExercises = [
  { id: crypto.randomUUID(), name: "Bench press", area: "Chest", equipment: "Barbell", notes: "", image: "" },
  { id: crypto.randomUUID(), name: "Squat", area: "Legs", equipment: "Barbell", notes: "", image: "" },
  { id: crypto.randomUUID(), name: "Lat pulldown", area: "Back", equipment: "Cable", notes: "", image: "" },
  { id: crypto.randomUUID(), name: "Shoulder press", area: "Shoulders", equipment: "Dumbbells", notes: "", image: "" },
];

let activeUser = getActiveUser();
let storageKey = activeUser ? getUserStorageKey(activeUser.id) : legacyStorageKey;
let state = activeUser ? loadState() : createEmptyState();
let currentWorkout = [];
let calendarDate = new Date();
let selectedDate = toISODate(new Date());
let exerciseImageData = "";
let weightRange = "7";

const els = {
  loginScreen: document.querySelector("#loginScreen"),
  appShell: document.querySelector("#appShell"),
  loginForm: document.querySelector("#loginForm"),
  loginUserSelect: document.querySelector("#loginUserSelect"),
  loginPin: document.querySelector("#loginPin"),
  createUserForm: document.querySelector("#createUserForm"),
  newUserName: document.querySelector("#newUserName"),
  newUserPin: document.querySelector("#newUserPin"),
  loginMessage: document.querySelector("#loginMessage"),
  logoutBtn: document.querySelector("#logoutBtn"),
  tabs: document.querySelectorAll(".tab-button"),
  views: document.querySelectorAll(".view"),
  workoutForm: document.querySelector("#workoutForm"),
  workoutName: document.querySelector("#workoutName"),
  workoutDate: document.querySelector("#workoutDate"),
  workoutMinutes: document.querySelector("#workoutMinutes"),
  repeatWorkoutSelect: document.querySelector("#repeatWorkoutSelect"),
  repeatWorkoutBtn: document.querySelector("#repeatWorkoutBtn"),
  exerciseSelect: document.querySelector("#exerciseSelect"),
  addExerciseBtn: document.querySelector("#addExerciseBtn"),
  resetWorkoutBtn: document.querySelector("#resetWorkoutBtn"),
  workoutExercises: document.querySelector("#workoutExercises"),
  exerciseForm: document.querySelector("#exerciseForm"),
  exerciseName: document.querySelector("#exerciseName"),
  exerciseArea: document.querySelector("#exerciseArea"),
  exerciseEquipment: document.querySelector("#exerciseEquipment"),
  exerciseNotes: document.querySelector("#exerciseNotes"),
  exerciseImage: document.querySelector("#exerciseImage"),
  exerciseImagePreview: document.querySelector("#exerciseImagePreview"),
  clearExerciseImageBtn: document.querySelector("#clearExerciseImageBtn"),
  exerciseLibrary: document.querySelector("#exerciseLibrary"),
  recentWorkouts: document.querySelector("#recentWorkouts"),
  currentUserName: document.querySelector("#currentUserName"),
  summaryWorkouts: document.querySelector("#summaryWorkouts"),
  summarySets: document.querySelector("#summarySets"),
  summaryMinutes: document.querySelector("#summaryMinutes"),
  calendarTitle: document.querySelector("#calendarTitle"),
  calendarGrid: document.querySelector("#calendarGrid"),
  prevMonthBtn: document.querySelector("#prevMonthBtn"),
  nextMonthBtn: document.querySelector("#nextMonthBtn"),
  selectedDateTitle: document.querySelector("#selectedDateTitle"),
  selectedDayWorkouts: document.querySelector("#selectedDayWorkouts"),
  resultsGrid: document.querySelector("#resultsGrid"),
  weightForm: document.querySelector("#weightForm"),
  weightDate: document.querySelector("#weightDate"),
  weightValue: document.querySelector("#weightValue"),
  weightUnit: document.querySelector("#weightUnit"),
  weightStats: document.querySelector("#weightStats"),
  weightChart: document.querySelector("#weightChart"),
  weightHistory: document.querySelector("#weightHistory"),
  weightRangeButtons: document.querySelectorAll("[data-weight-range]"),
  exerciseBlockTemplate: document.querySelector("#exerciseBlockTemplate"),
};

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) {
    return createEmptyState();
  }

  try {
    const parsed = JSON.parse(saved);
    return {
      exercises: Array.isArray(parsed.exercises) && parsed.exercises.length ? parsed.exercises.map(normalizeExercise) : seedExercises,
      workouts: Array.isArray(parsed.workouts) ? parsed.workouts : [],
      bodyWeights: Array.isArray(parsed.bodyWeights) ? parsed.bodyWeights.map(normalizeWeightEntry) : [],
    };
  } catch {
    return createEmptyState();
  }
}

function createEmptyState() {
  return { exercises: seedExercises.map((exercise) => ({ ...exercise, id: crypto.randomUUID() })), workouts: [], bodyWeights: [] };
}

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(usersStorageKey) || "[]");
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(usersStorageKey, JSON.stringify(users));
}

function getUserStorageKey(userId) {
  return `workout-tracker-data-${userId}`;
}

function getActiveUser() {
  const activeUserId = localStorage.getItem(sessionStorageKey);
  if (!activeUserId) return null;
  return loadUsers().find((user) => user.id === activeUserId) || null;
}

function setActiveUser(user) {
  activeUser = user;
  storageKey = getUserStorageKey(user.id);
  localStorage.setItem(sessionStorageKey, user.id);
  state = loadState();
}

function clearActiveUser() {
  activeUser = null;
  localStorage.removeItem(sessionStorageKey);
  state = createEmptyState();
}

function normalizeExercise(exercise) {
  return {
    id: exercise.id || crypto.randomUUID(),
    name: exercise.name || "Exercise",
    area: exercise.area || "General",
    equipment: exercise.equipment || "",
    notes: exercise.notes || "",
    image: exercise.image || "",
  };
}

function normalizeWeightEntry(entry) {
  return {
    id: entry.id || crypto.randomUUID(),
    date: entry.date || toISODate(new Date()),
    weight: Number(entry.weight || 0),
    unit: entry.unit || "kg",
    createdAt: entry.createdAt || new Date().toISOString(),
  };
}

function saveState() {
  if (!activeUser) return;
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function toISODate(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function formatDate(dateString, options = {}) {
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat("en-GB", options).format(date);
}

function formatMinutes(minutes) {
  const total = Number(minutes || 0);
  const hours = Math.floor(total / 60);
  const remaining = total % 60;
  if (!hours) return `${remaining}m`;
  if (!remaining) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function render() {
  if (!activeUser) return;
  els.currentUserName.textContent = activeUser.name;
  renderRepeatWorkoutSelect();
  renderExerciseSelect();
  renderWorkoutBuilder();
  renderExerciseLibrary();
  renderRecentWorkouts();
  renderCalendar();
  renderSelectedDate();
  renderResults();
  renderWeightLogger();
  renderSummary();
}

function renderSummary() {
  const totalSets = state.workouts.reduce((sum, workout) => sum + workout.exercises.reduce((inner, exercise) => inner + exercise.sets.length, 0), 0);
  const totalMinutes = state.workouts.reduce((sum, workout) => sum + Number(workout.minutes || 0), 0);

  els.summaryWorkouts.textContent = state.workouts.length;
  els.summarySets.textContent = totalSets;
  els.summaryMinutes.textContent = `${totalMinutes}m`;
}

function renderLoginUsers() {
  const users = loadUsers();
  els.loginUserSelect.innerHTML = "";

  if (!users.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Create an account first";
    els.loginUserSelect.append(option);
    els.loginUserSelect.disabled = true;
    els.loginForm.querySelector("button").disabled = true;
    return;
  }

  els.loginUserSelect.disabled = false;
  els.loginForm.querySelector("button").disabled = false;
  users.forEach((user) => {
    const option = document.createElement("option");
    option.value = user.id;
    option.textContent = user.name;
    els.loginUserSelect.append(option);
  });
}

function showLoginScreen(message = "") {
  els.loginScreen.classList.remove("is-hidden");
  els.appShell.classList.add("is-locked");
  els.loginMessage.textContent = message;
  renderLoginUsers();
}

function showAppScreen() {
  els.loginScreen.classList.add("is-hidden");
  els.appShell.classList.remove("is-locked");
  els.loginMessage.textContent = "";
  setDefaultWorkoutValues();
  renderImagePreview();
  render();
}

function loginUser(userId, pin) {
  const user = loadUsers().find((item) => item.id === userId);
  if (!user || user.pin !== pin) {
    showLoginScreen("That name and PIN do not match.");
    return;
  }

  setActiveUser(user);
  currentWorkout = [];
  showView("logView");
  showAppScreen();
}

function createUser(name, pin) {
  const users = loadUsers();
  const trimmedName = name.trim();

  if (users.some((user) => user.name.toLowerCase() === trimmedName.toLowerCase())) {
    showLoginScreen("That name already exists. Login or choose another name.");
    return;
  }

  const user = {
    id: crypto.randomUUID(),
    name: trimmedName,
    pin,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  saveUsers(users);
  setActiveUser(user);
  saveState();
  currentWorkout = [];
  showView("logView");
  showAppScreen();
}

function renderRepeatWorkoutSelect() {
  els.repeatWorkoutSelect.innerHTML = "";

  if (!state.workouts.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No logged workouts yet";
    els.repeatWorkoutSelect.append(option);
    els.repeatWorkoutSelect.disabled = true;
    els.repeatWorkoutBtn.disabled = true;
    return;
  }

  els.repeatWorkoutSelect.disabled = false;
  els.repeatWorkoutBtn.disabled = false;

  state.workouts
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .forEach((workout) => {
      const option = document.createElement("option");
      option.value = workout.id;
      option.textContent = `${workout.name} · ${formatDate(workout.date, { day: "numeric", month: "short", year: "numeric" })}`;
      els.repeatWorkoutSelect.append(option);
    });
}

function renderExerciseSelect() {
  els.exerciseSelect.innerHTML = "";

  if (!state.exercises.length) {
    const option = document.createElement("option");
    option.textContent = "Create an exercise first";
    option.value = "";
    els.exerciseSelect.append(option);
    els.exerciseSelect.disabled = true;
    els.addExerciseBtn.disabled = true;
    return;
  }

  els.exerciseSelect.disabled = false;
  els.addExerciseBtn.disabled = false;

  state.exercises
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((exercise) => {
      const option = document.createElement("option");
      option.value = exercise.id;
      option.textContent = `${exercise.name} · ${exercise.area}`;
      els.exerciseSelect.append(option);
    });
}

function renderWorkoutBuilder() {
  els.workoutExercises.innerHTML = "";

  if (!currentWorkout.length) {
    els.workoutExercises.innerHTML = '<div class="empty-state">No exercises added yet.</div>';
    return;
  }

  currentWorkout.forEach((entry) => {
    const template = els.exerciseBlockTemplate.content.cloneNode(true);
    const card = template.querySelector(".workout-card");
    const title = template.querySelector("h3");
    const meta = template.querySelector("p");
    const sets = template.querySelector(".sets");
    const thumb = template.querySelector(".exercise-thumb");
    const exercise = state.exercises.find((item) => item.id === entry.exerciseId);
    const titleText = exercise?.name || entry.name || "Exercise";

    title.textContent = titleText;
    meta.textContent = [exercise?.area || entry.area, exercise?.equipment].filter(Boolean).join(" · ");
    renderExerciseThumb(thumb, exercise);
    card.dataset.entryId = entry.id;

    entry.sets.forEach((set, index) => {
      const row = document.createElement("div");
      row.className = "set-row";
      row.innerHTML = `
        <strong>Set ${index + 1}</strong>
        <label>Reps<input inputmode="numeric" type="number" min="0" value="${set.reps}" placeholder="${set.previousReps ?? ""}" data-field="reps" data-set-id="${set.id}" /></label>
        <label>Weight used<input inputmode="decimal" type="number" min="0" step="0.5" value="${set.weight}" placeholder="${set.previousWeight ?? ""}" data-field="weight" data-set-id="${set.id}" /></label>
        <button class="icon-button remove-set" title="Remove set" type="button" aria-label="Remove set" data-set-id="${set.id}">×</button>
      `;
      sets.append(row);
    });

    els.workoutExercises.append(template);
  });
}

function renderExerciseLibrary() {
  els.exerciseLibrary.innerHTML = "";

  if (!state.exercises.length) {
    els.exerciseLibrary.innerHTML = '<div class="empty-state">No exercises saved.</div>';
    return;
  }

  state.exercises
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((exercise) => {
      const item = document.createElement("article");
      item.className = "exercise-item";
      item.innerHTML = `
        <div class="exercise-info">
          <div class="exercise-thumb ${exercise.image ? "" : "is-empty"}">
            ${exercise.image ? `<img src="${exercise.image}" alt="${escapeHTML(exercise.name)}" />` : ""}
          </div>
          <div>
            <h3>${escapeHTML(exercise.name)}</h3>
            <p><span class="pill">${escapeHTML(exercise.area)}</span> ${escapeHTML(exercise.equipment || "")}</p>
            ${exercise.notes ? `<p>${escapeHTML(exercise.notes)}</p>` : ""}
          </div>
        </div>
        <div class="exercise-actions">
          <label class="upload-button">
            ${exercise.image ? "Change image" : "Add image"}
            <input type="file" accept="image/*" data-image-exercise="${exercise.id}" />
          </label>
          ${exercise.image ? `<button class="mini-button" type="button" data-clear-image="${exercise.id}">Remove image</button>` : ""}
          <button class="danger-button" type="button" data-delete-exercise="${exercise.id}">Delete</button>
        </div>
      `;
      els.exerciseLibrary.append(item);
    });
}

function renderRecentWorkouts() {
  const recent = state.workouts.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  els.recentWorkouts.innerHTML = recent.length ? "" : '<div class="empty-state">Saved workouts will appear here.</div>';

  recent.forEach((workout) => {
    els.recentWorkouts.append(createWorkoutItem(workout));
  });
}

function createWorkoutItem(workout) {
  const item = document.createElement("article");
  item.className = "recent-item";

  const setCount = workout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
  const repCount = workout.exercises.reduce((sum, exercise) => sum + exercise.sets.reduce((inner, set) => inner + Number(set.reps || 0), 0), 0);
  const exerciseDetails = workout.exercises
    .map((entry) => {
      const setDetails = entry.sets
        .map((set, index) => {
          const weight = set.weight === "" || set.weight == null ? "bodyweight" : set.weight;
          return `S${index + 1}: ${set.reps} reps @ ${weight}`;
        })
        .join(" · ");
      return `<li><strong>${escapeHTML(entry.name)}</strong><span>${escapeHTML(setDetails)}</span></li>`;
    })
    .join("");

  item.innerHTML = `
    <div>
      <h3>${escapeHTML(workout.name)}</h3>
      <p class="recent-meta">${formatDate(workout.date, { day: "numeric", month: "short", year: "numeric" })} · ${workout.minutes}m · ${plural(setCount, "set")} · ${plural(repCount, "rep")}</p>
      <ul class="set-summary">${exerciseDetails}</ul>
    </div>
    <button class="danger-button" type="button" data-delete-workout="${workout.id}">Delete</button>
  `;
  return item;
}

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const startDate = new Date(year, month, 1 - startOffset);

  els.calendarTitle.textContent = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(firstDay);
  els.calendarGrid.innerHTML = "";

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    const iso = toISODate(date);
    const workouts = state.workouts.filter((workout) => workout.date === iso);

    const button = document.createElement("button");
    button.className = "calendar-day";
    button.type = "button";
    button.dataset.date = iso;
    if (date.getMonth() !== month) button.classList.add("is-muted");
    if (iso === selectedDate) button.classList.add("is-selected");
    if (workouts.length) button.classList.add("has-workout");
    button.innerHTML = `
      <strong>${date.getDate()}</strong>
      ${workouts.length ? `<span class="calendar-count">${plural(workouts.length, "workout")}</span>` : ""}
    `;
    els.calendarGrid.append(button);
  }
}

function renderSelectedDate() {
  const workouts = state.workouts.filter((workout) => workout.date === selectedDate).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  els.selectedDateTitle.textContent = formatDate(selectedDate, { weekday: "short", day: "numeric", month: "short" });
  els.selectedDayWorkouts.innerHTML = workouts.length ? "" : '<div class="empty-state">No workouts on this date.</div>';

  workouts.forEach((workout) => {
    els.selectedDayWorkouts.append(createWorkoutItem(workout));
  });
}

function renderResults() {
  const periods = getResultPeriods();
  els.resultsGrid.innerHTML = "";

  periods.forEach((period) => {
    const current = summarizeWorkoutsBetween(period.currentStart, period.currentEnd);
    const previous = summarizeWorkoutsBetween(period.previousStart, period.previousEnd);
    const workoutDelta = current.count - previous.count;
    const minuteDelta = current.minutes - previous.minutes;

    const card = document.createElement("article");
    card.className = "result-card";
    card.innerHTML = `
      <div>
        <p class="eyebrow">${period.label}</p>
        <h3>${period.title}</h3>
        <p class="result-range">${formatRange(period.currentStart, period.currentEnd)}</p>
      </div>
      <div class="result-metrics">
        <div>
          <span>${current.count}</span>
          <small>Workouts</small>
        </div>
        <div>
          <span>${formatMinutes(current.minutes)}</span>
          <small>Total time</small>
        </div>
      </div>
      <div class="comparison-grid">
        ${createComparison("Workouts", workoutDelta, previous.count, false)}
        ${createComparison("Time", minuteDelta, previous.minutes, true)}
      </div>
    `;
    els.resultsGrid.append(card);
  });
}

function getResultPeriods() {
  const today = startOfDay(new Date());
  return [
    createDayPeriod("Today", "Day", today),
    createRollingDayPeriod("Last 7 days", "Week", today, 7),
    createRollingDayPeriod("Last 4 weeks", "4 weeks", today, 28),
    createRollingMonthPeriod("Last 3 months", "3 months", today, 3),
    createRollingMonthPeriod("Last 12 months", "12 months", today, 12),
  ];
}

function createDayPeriod(title, label, today) {
  return {
    title,
    label,
    currentStart: today,
    currentEnd: today,
    previousStart: addDays(today, -1),
    previousEnd: addDays(today, -1),
  };
}

function createRollingDayPeriod(title, label, today, days) {
  return {
    title,
    label,
    currentStart: addDays(today, -(days - 1)),
    currentEnd: today,
    previousStart: addDays(today, -(days * 2 - 1)),
    previousEnd: addDays(today, -days),
  };
}

function createRollingMonthPeriod(title, label, today, months) {
  const currentStart = addMonths(today, -months);
  const previousStart = addMonths(currentStart, -months);
  return {
    title,
    label,
    currentStart,
    currentEnd: today,
    previousStart,
    previousEnd: addDays(currentStart, -1),
  };
}

function summarizeWorkoutsBetween(start, end) {
  const startTime = start.getTime();
  const endTime = end.getTime();
  return state.workouts.reduce(
    (summary, workout) => {
      const workoutTime = new Date(`${workout.date}T12:00:00`).getTime();
      if (workoutTime < startTime || workoutTime > endTime) return summary;
      summary.count += 1;
      summary.minutes += Number(workout.minutes || 0);
      return summary;
    },
    { count: 0, minutes: 0 },
  );
}

function createComparison(label, delta, previousValue, isTime) {
  const direction = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const displayValue = isTime ? formatSignedMinutes(delta) : `${delta > 0 ? "+" : ""}${delta}`;
  const display = delta === 0 ? "No change" : displayValue;
  const previous = isTime ? formatMinutes(previousValue) : previousValue;

  return `
    <div class="comparison ${direction}">
      <strong>${label}</strong>
      <span>${display}</span>
      <small>Previous: ${previous}</small>
    </div>
  `;
}

function formatSignedMinutes(minutes) {
  const sign = minutes > 0 ? "+" : "-";
  return `${sign}${formatMinutes(Math.abs(minutes))}`;
}

function formatRange(start, end) {
  const options = { day: "numeric", month: "short" };
  if (toISODate(start) === toISODate(end)) {
    return new Intl.DateTimeFormat("en-GB", options).format(start);
  }
  return `${new Intl.DateTimeFormat("en-GB", options).format(start)} - ${new Intl.DateTimeFormat("en-GB", options).format(end)}`;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function renderWeightLogger() {
  const displayUnit = getDisplayWeightUnit();
  const entries = getWeightEntriesForRange(weightRange, displayUnit);
  renderWeightStats(entries, displayUnit);
  renderWeightChart(entries, displayUnit);
  renderWeightHistory();
}

function getDisplayWeightUnit() {
  const latest = state.bodyWeights.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
  return els.weightUnit.value || latest?.unit || "kg";
}

function getWeightEntriesForRange(range, unit) {
  const today = startOfDay(new Date());
  const start = range === "3m" ? addMonths(today, -3) : range === "12m" ? addMonths(today, -12) : addDays(today, -(Number(range) - 1));
  return state.bodyWeights
    .filter((entry) => {
      const entryDate = new Date(`${entry.date}T12:00:00`);
      return entryDate >= start && entryDate <= today;
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => ({
      ...entry,
      displayWeight: convertWeight(entry.weight, entry.unit, unit),
    }));
}

function convertWeight(value, fromUnit, toUnit) {
  const weight = Number(value || 0);
  if (fromUnit === toUnit) return weight;
  return toUnit === "kg" ? weight * 0.45359237 : weight / 0.45359237;
}

function renderWeightStats(entries, unit) {
  if (!entries.length) {
    els.weightStats.innerHTML = `
      <div class="weight-stat"><span>--</span><small>Latest</small></div>
      <div class="weight-stat"><span>--</span><small>Change</small></div>
      <div class="weight-stat"><span>0</span><small>Entries</small></div>
    `;
    return;
  }

  const first = entries[0].displayWeight;
  const latest = entries.at(-1).displayWeight;
  const change = latest - first;
  els.weightStats.innerHTML = `
    <div class="weight-stat"><span>${formatWeight(latest, unit)}</span><small>Latest</small></div>
    <div class="weight-stat"><span>${formatSignedWeight(change, unit)}</span><small>Change</small></div>
    <div class="weight-stat"><span>${entries.length}</span><small>Entries</small></div>
  `;
}

function renderWeightChart(entries, unit) {
  if (entries.length < 2) {
    els.weightChart.innerHTML = '<div class="empty-state">Add at least two weigh-ins to draw a graph.</div>';
    return;
  }

  const width = 760;
  const height = 280;
  const padding = 34;
  const weights = entries.map((entry) => entry.displayWeight);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const range = Math.max(1, maxWeight - minWeight);
  const startTime = new Date(`${entries[0].date}T12:00:00`).getTime();
  const endTime = new Date(`${entries.at(-1).date}T12:00:00`).getTime();
  const timeRange = Math.max(1, endTime - startTime);
  const points = entries
    .map((entry) => {
      const time = new Date(`${entry.date}T12:00:00`).getTime();
      const x = padding + ((time - startTime) / timeRange) * (width - padding * 2);
      const y = height - padding - ((entry.displayWeight - minWeight) / range) * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const markers = entries
    .map((entry) => {
      const time = new Date(`${entry.date}T12:00:00`).getTime();
      const x = padding + ((time - startTime) / timeRange) * (width - padding * 2);
      const y = height - padding - ((entry.displayWeight - minWeight) / range) * (height - padding * 2);
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5"><title>${formatDate(entry.date, { day: "numeric", month: "short" })}: ${formatWeight(entry.displayWeight, unit)}</title></circle>`;
    })
    .join("");

  els.weightChart.innerHTML = `
    <svg class="weight-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Weight trend graph">
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" />
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" />
      <text x="${padding}" y="22">${formatWeight(maxWeight, unit)}</text>
      <text x="${padding}" y="${height - 8}">${formatWeight(minWeight, unit)}</text>
      <polyline points="${points}" />
      <g>${markers}</g>
    </svg>
  `;
}

function renderWeightHistory() {
  const entries = state.bodyWeights.slice().sort((a, b) => b.date.localeCompare(a.date));
  els.weightHistory.innerHTML = entries.length ? "" : '<div class="empty-state">Saved weigh-ins will appear here.</div>';

  entries.forEach((entry) => {
    const item = document.createElement("article");
    item.className = "recent-item";
    item.innerHTML = `
      <div>
        <h3>${formatWeight(entry.weight, entry.unit)}</h3>
        <p class="recent-meta">${formatDate(entry.date, { day: "numeric", month: "short", year: "numeric" })}</p>
      </div>
      <button class="danger-button" type="button" data-delete-weight="${entry.id}">Delete</button>
    `;
    els.weightHistory.append(item);
  });
}

function formatWeight(value, unit) {
  return `${Number(value || 0).toFixed(1)}${unit}`;
}

function formatSignedWeight(value, unit) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(Number(value || 0)).toFixed(1)}${unit}`;
}

function createSets(count = 5) {
  return Array.from({ length: count }, () => ({
    id: crypto.randomUUID(),
    reps: "",
    weight: "",
  }));
}

function addExerciseToWorkout(exerciseId) {
  if (!exerciseId) return;
  const exercise = state.exercises.find((item) => item.id === exerciseId);
  if (!exercise) return;

  currentWorkout.push({
    id: crypto.randomUUID(),
    exerciseId,
    name: exercise.name,
    area: exercise.area,
    sets: createSets(5),
  });
  renderWorkoutBuilder();
}

function repeatWorkout(workoutId) {
  const workout = state.workouts.find((item) => item.id === workoutId);
  if (!workout) return;

  els.workoutName.value = workout.name;
  els.workoutMinutes.value = workout.minutes || 45;
  els.workoutDate.value = toISODate(new Date());
  currentWorkout = workout.exercises.map((entry) => ({
    id: crypto.randomUUID(),
    exerciseId: entry.exerciseId,
    name: entry.name,
    area: entry.area,
    sets: entry.sets.length
      ? entry.sets.map((set) => ({
          id: crypto.randomUUID(),
          reps: "",
          weight: "",
          previousReps: set.reps,
          previousWeight: set.weight,
        }))
      : createSets(5),
  }));
  renderWorkoutBuilder();
}

function renderExerciseThumb(container, exercise) {
  container.innerHTML = "";
  container.classList.toggle("is-empty", !exercise?.image);
  if (!exercise?.image) return;

  const image = document.createElement("img");
  image.src = exercise.image;
  image.alt = exercise.name;
  container.append(image);
}

function renderImagePreview() {
  els.exerciseImagePreview.innerHTML = "";
  els.exerciseImagePreview.classList.toggle("is-empty", !exerciseImageData);

  if (!exerciseImageData) {
    const placeholder = document.createElement("span");
    placeholder.textContent = "No image selected";
    els.exerciseImagePreview.append(placeholder, els.clearExerciseImageBtn);
    return;
  }

  const image = document.createElement("img");
  image.src = exerciseImageData;
  image.alt = "Selected exercise preview";
  els.exerciseImagePreview.append(image, els.clearExerciseImageBtn);
}

function clearExerciseImage() {
  exerciseImageData = "";
  els.exerciseImage.value = "";
  renderImagePreview();
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", reject);
    image.src = src;
  });
}

async function resizeImage(file) {
  const dataUrl = await fileToDataURL(file);
  const image = await loadImage(dataUrl);
  const maxSize = 900;
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);

  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

function saveWorkout(event) {
  event.preventDefault();

  const entries = currentWorkout
    .map((entry) => {
      const exercise = state.exercises.find((item) => item.id === entry.exerciseId);
      return {
        exerciseId: entry.exerciseId,
        name: exercise?.name || entry.name || "Exercise",
        area: exercise?.area || entry.area || "",
        sets: entry.sets
          .map((set) => ({
            reps: Number(set.reps || 0),
            weight: set.weight === "" ? "" : Number(set.weight),
          }))
          .filter((set) => set.reps > 0 || set.weight !== ""),
      };
    })
    .filter((entry) => entry.sets.length);

  if (!entries.length) {
    alert("Add at least one set before saving.");
    return;
  }

  state.workouts.push({
    id: crypto.randomUUID(),
    name: els.workoutName.value.trim(),
    date: els.workoutDate.value,
    minutes: Number(els.workoutMinutes.value),
    exercises: entries,
    createdAt: new Date().toISOString(),
  });

  saveState();
  currentWorkout = [];
  els.workoutForm.reset();
  setDefaultWorkoutValues();
  selectedDate = state.workouts.at(-1).date;
  calendarDate = new Date(`${selectedDate}T12:00:00`);
  render();
  showView("calendarView");
}

function setDefaultWorkoutValues() {
  els.workoutDate.value = toISODate(new Date());
  els.workoutName.value = "Workout";
  els.workoutMinutes.value = 45;
  els.weightDate.value = toISODate(new Date());
}

function showView(viewId) {
  els.tabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.view === viewId));
  els.views.forEach((view) => view.classList.toggle("is-active", view.id === viewId));
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

els.tabs.forEach((button) => {
  if (button.dataset.view) {
    button.addEventListener("click", () => showView(button.dataset.view));
  }
});

els.loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loginUser(els.loginUserSelect.value, els.loginPin.value);
  els.loginPin.value = "";
});

els.createUserForm.addEventListener("submit", (event) => {
  event.preventDefault();
  createUser(els.newUserName.value, els.newUserPin.value);
  els.createUserForm.reset();
});

els.logoutBtn.addEventListener("click", () => {
  clearActiveUser();
  currentWorkout = [];
  showLoginScreen("Logged out.");
});

els.addExerciseBtn.addEventListener("click", () => addExerciseToWorkout(els.exerciseSelect.value));

els.repeatWorkoutBtn.addEventListener("click", () => repeatWorkout(els.repeatWorkoutSelect.value));

els.resetWorkoutBtn.addEventListener("click", () => {
  currentWorkout = [];
  els.workoutForm.reset();
  setDefaultWorkoutValues();
  renderWorkoutBuilder();
});

els.workoutExercises.addEventListener("click", (event) => {
  const card = event.target.closest(".workout-card");
  if (!card) return;
  const entry = currentWorkout.find((item) => item.id === card.dataset.entryId);
  if (!entry) return;

  if (event.target.matches(".add-set")) {
    entry.sets.push(...createSets(1));
    renderWorkoutBuilder();
  }

  if (event.target.matches(".remove-set")) {
    entry.sets = entry.sets.filter((set) => set.id !== event.target.dataset.setId);
    if (!entry.sets.length) entry.sets.push(...createSets(1));
    renderWorkoutBuilder();
  }

  if (event.target.matches(".remove-exercise")) {
    currentWorkout = currentWorkout.filter((item) => item.id !== entry.id);
    renderWorkoutBuilder();
  }
});

els.workoutExercises.addEventListener("input", (event) => {
  const input = event.target;
  if (!input.dataset.field) return;

  const card = input.closest(".workout-card");
  const entry = currentWorkout.find((item) => item.id === card.dataset.entryId);
  const set = entry?.sets.find((item) => item.id === input.dataset.setId);
  if (set) {
    set[input.dataset.field] = input.value;
  }
});

els.workoutForm.addEventListener("submit", saveWorkout);

els.weightForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const date = els.weightDate.value;
  const existing = state.bodyWeights.find((entry) => entry.date === date);
  const weight = Number(els.weightValue.value);
  const unit = els.weightUnit.value;

  if (existing) {
    existing.weight = weight;
    existing.unit = unit;
  } else {
    state.bodyWeights.push({
      id: crypto.randomUUID(),
      date,
      weight,
      unit,
      createdAt: new Date().toISOString(),
    });
  }

  saveState();
  els.weightValue.value = "";
  renderWeightLogger();
});

els.weightUnit.addEventListener("change", renderWeightLogger);

els.weightRangeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    weightRange = button.dataset.weightRange;
    els.weightRangeButtons.forEach((rangeButton) => rangeButton.classList.toggle("is-active", rangeButton === button));
    renderWeightLogger();
  });
});

els.exerciseImage.addEventListener("change", async () => {
  const [file] = els.exerciseImage.files;
  if (!file) {
    clearExerciseImage();
    return;
  }

  if (!file.type.startsWith("image/")) {
    alert("Choose an image file.");
    clearExerciseImage();
    return;
  }

  try {
    exerciseImageData = await resizeImage(file);
    renderImagePreview();
  } catch {
    alert("That image could not be loaded.");
    clearExerciseImage();
  }
});

els.clearExerciseImageBtn.addEventListener("click", clearExerciseImage);

els.exerciseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.exercises.push({
    id: crypto.randomUUID(),
    name: els.exerciseName.value.trim(),
    area: els.exerciseArea.value,
    equipment: els.exerciseEquipment.value.trim(),
    notes: els.exerciseNotes.value.trim(),
    image: exerciseImageData,
  });
  saveState();
  els.exerciseForm.reset();
  clearExerciseImage();
  render();
});

document.addEventListener("click", (event) => {
  const exerciseId = event.target.dataset.deleteExercise;
  const workoutId = event.target.dataset.deleteWorkout;
  const clearImageId = event.target.dataset.clearImage;
  const weightId = event.target.dataset.deleteWeight;
  const date = event.target.closest(".calendar-day")?.dataset.date;

  if (clearImageId) {
    const exercise = state.exercises.find((item) => item.id === clearImageId);
    if (exercise) {
      exercise.image = "";
      saveState();
      render();
    }
  }

  if (exerciseId) {
    const inUse = state.workouts.some((workout) => workout.exercises.some((entry) => entry.exerciseId === exerciseId));
    if (inUse && !confirm("This exercise appears in saved workouts. Delete it from the library anyway?")) return;
    state.exercises = state.exercises.filter((exercise) => exercise.id !== exerciseId);
    currentWorkout = currentWorkout.filter((entry) => entry.exerciseId !== exerciseId);
    saveState();
    render();
  }

  if (workoutId) {
    state.workouts = state.workouts.filter((workout) => workout.id !== workoutId);
    saveState();
    render();
  }

  if (weightId) {
    state.bodyWeights = state.bodyWeights.filter((entry) => entry.id !== weightId);
    saveState();
    renderWeightLogger();
  }

  if (date) {
    selectedDate = date;
    renderCalendar();
    renderSelectedDate();
  }
});

els.exerciseLibrary.addEventListener("change", async (event) => {
  const exerciseId = event.target.dataset.imageExercise;
  if (!exerciseId) return;

  const [file] = event.target.files;
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Choose an image file.");
    event.target.value = "";
    return;
  }

  try {
    const exercise = state.exercises.find((item) => item.id === exerciseId);
    if (exercise) {
      exercise.image = await resizeImage(file);
      saveState();
      render();
    }
  } catch {
    alert("That image could not be loaded.");
    event.target.value = "";
  }
});

els.prevMonthBtn.addEventListener("click", () => {
  calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1);
  renderCalendar();
});

els.nextMonthBtn.addEventListener("click", () => {
  calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1);
  renderCalendar();
});

if (activeUser) {
  showAppScreen();
} else {
  showLoginScreen();
}
