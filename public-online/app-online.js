const seedExercises = [
  { id: crypto.randomUUID(), name: "Bench press", area: "Chest", equipment: "Barbell", notes: "", image: "" },
  { id: crypto.randomUUID(), name: "Squat", area: "Legs", equipment: "Barbell", notes: "", image: "" },
  { id: crypto.randomUUID(), name: "Lat pulldown", area: "Back", equipment: "Cable", notes: "", image: "" },
  { id: crypto.randomUUID(), name: "Shoulder press", area: "Shoulders", equipment: "Dumbbells", notes: "", image: "" }
];

let state = { exercises: seedExercises, workouts: [], cardioWorkouts: [], bodyWeights: [], bloodPressure: [], nutrition: { calorieGoal: "", targetWeight: "", targetWeeks: "", foods: [], water: [] }, profile: { height: "", heightUnit: "cm" } };
let currentUser = null;
let activeAdmin = null;
let currentWorkout = [];
let editingWorkoutId = "";
let editingCardioId = "";
let calendarDate = new Date();
let selectedDate = toISODate(new Date());
let weightRange = "7";
let exerciseImageData = "";
let barcodeStream = null;
let foodSearchCache = [];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const els = {
  loginScreen: $("#loginScreen"),
  adminScreen: $("#adminScreen"),
  appShell: $("#appShell"),
  loginForm: $("#loginForm"),
  loginEmail: $("#loginEmail"),
  loginPin: $("#loginPin"),
  createUserForm: $("#createUserForm"),
  newUserEmail: $("#newUserEmail"),
  newUserPin: $("#newUserPin"),
  adminLoginForm: $("#adminLoginForm"),
  adminEmail: $("#adminEmail"),
  adminPin: $("#adminPin"),
  adminLogoutBtn: $("#adminLogoutBtn"),
  adminUserList: $("#adminUserList"),
  changeAdminPinForm: $("#changeAdminPinForm"),
  currentAdminPin: $("#currentAdminPin"),
  newAdminPin: $("#newAdminPin"),
  adminMessage: $("#adminMessage"),
  loginMessage: $("#loginMessage"),
  logoutBtn: $("#logoutBtn"),
  currentUserName: $("#currentUserName"),
  tabs: $$(".tab-button"),
  views: $$(".view"),
  workoutForm: $("#workoutForm"),
  workoutName: $("#workoutName"),
  workoutDate: $("#workoutDate"),
  workoutMinutes: $("#workoutMinutes"),
  cancelWorkoutEditBtn: $("#cancelWorkoutEditBtn"),
  cardioForm: $("#cardioForm"),
  cardioType: $("#cardioType"),
  cardioDate: $("#cardioDate"),
  cardioMinutes: $("#cardioMinutes"),
  cardioSeconds: $("#cardioSeconds"),
  cardioDistance: $("#cardioDistance"),
  cardioDistanceUnit: $("#cardioDistanceUnit"),
  cancelCardioEditBtn: $("#cancelCardioEditBtn"),
  repeatWorkoutSelect: $("#repeatWorkoutSelect"),
  repeatWorkoutBtn: $("#repeatWorkoutBtn"),
  exerciseSelect: $("#exerciseSelect"),
  addExerciseBtn: $("#addExerciseBtn"),
  resetWorkoutBtn: $("#resetWorkoutBtn"),
  workoutExercises: $("#workoutExercises"),
  recentWorkouts: $("#recentWorkouts"),
  exerciseForm: $("#exerciseForm"),
  exerciseName: $("#exerciseName"),
  exerciseArea: $("#exerciseArea"),
  exerciseEquipment: $("#exerciseEquipment"),
  exerciseNotes: $("#exerciseNotes"),
  exerciseImage: $("#exerciseImage"),
  exerciseImagePreview: $("#exerciseImagePreview"),
  clearExerciseImageBtn: $("#clearExerciseImageBtn"),
  exerciseLibrary: $("#exerciseLibrary"),
  summaryWorkouts: $("#summaryWorkouts"),
  summarySets: $("#summarySets"),
  summaryMinutes: $("#summaryMinutes"),
  calendarTitle: $("#calendarTitle"),
  calendarGrid: $("#calendarGrid"),
  selectedDateTitle: $("#selectedDateTitle"),
  selectedDayWorkouts: $("#selectedDayWorkouts"),
  prevMonthBtn: $("#prevMonthBtn"),
  nextMonthBtn: $("#nextMonthBtn"),
  resultsGrid: $("#resultsGrid"),
  weightForm: $("#weightForm"),
  weightDate: $("#weightDate"),
  weightValue: $("#weightValue"),
  weightUnit: $("#weightUnit"),
  heightForm: $("#heightForm"),
  heightValue: $("#heightValue"),
  heightUnit: $("#heightUnit"),
  weightStats: $("#weightStats"),
  bmiStats: $("#bmiStats"),
  weightChart: $("#weightChart"),
  weightHistory: $("#weightHistory"),
  weightRangeButtons: $$("[data-weight-range]"),
  bloodPressureForm: $("#bloodPressureForm"),
  bpDate: $("#bpDate"),
  bpSystolic: $("#bpSystolic"),
  bpDiastolic: $("#bpDiastolic"),
  bpPulse: $("#bpPulse"),
  bpStats: $("#bpStats"),
  bpRangeChart: $("#bpRangeChart"),
  bpChart: $("#bpChart"),
  bpHistory: $("#bpHistory"),
  nutritionGoalForm: $("#nutritionGoalForm"),
  calorieGoal: $("#calorieGoal"),
  targetWeight: $("#targetWeight"),
  targetWeeks: $("#targetWeeks"),
  calorieGoalHint: $("#calorieGoalHint"),
  foodSearchForm: $("#foodSearchForm"),
  foodSearchInput: $("#foodSearchInput"),
  barcodeInput: $("#barcodeInput"),
  barcodeLookupBtn: $("#barcodeLookupBtn"),
  scanBarcodeBtn: $("#scanBarcodeBtn"),
  barcodeVideo: $("#barcodeVideo"),
  foodSearchMessage: $("#foodSearchMessage"),
  foodSearchResults: $("#foodSearchResults"),
  nutritionDate: $("#nutritionDate"),
  nutritionStats: $("#nutritionStats"),
  waterForm: $("#waterForm"),
  waterAmount: $("#waterAmount"),
  waterUnit: $("#waterUnit"),
  foodLogList: $("#foodLogList")
};

async function api(path, options = {}) {
  const targets = [path, `/.netlify/functions/api${path.replace(/^\/api/, "")}`];
  let lastError = null;

  for (const target of [...new Set(targets)]) {
    try {
      const response = await fetch(target, {
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", ...(options.headers || {}) },
        ...options,
        body: options.body ? JSON.stringify(options.body) : undefined
      });
      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json") ? await response.json() : {};

      if (response.ok) return data;

      const fallbackMessage = response.status === 404
        ? "Backend function was not found. Deploy the full project, including the netlify/functions folder."
        : `Backend returned ${response.status}.`;
      lastError = new Error(data.error || fallbackMessage);
      if (response.status !== 404 || target.startsWith("/.netlify")) throw lastError;
    } catch (error) {
      lastError = error;
      if (target.startsWith("/.netlify")) break;
    }
  }

  throw new Error(lastError?.message || "Backend is not connected. Make sure the full project, including netlify/functions, is deployed.");
}

async function loadData() {
  state = await api("/api/data");
  state.exercises ||= [];
  state.workouts ||= [];
  state.cardioWorkouts ||= [];
  state.bodyWeights ||= [];
  state.bloodPressure ||= [];
  state.nutrition ||= { calorieGoal: "", targetWeight: "", targetWeeks: "", foods: [], water: [] };
  state.nutrition.foods ||= [];
  state.nutrition.water ||= [];
  state.profile ||= { height: "", heightUnit: "cm" };
  state.profile.heightUnit ||= "cm";
}

async function saveState() {
  await api("/api/data", { method: "PUT", body: state });
}

function showLogin(message = "") {
  activeAdmin = null;
  currentUser = null;
  els.loginScreen.classList.remove("is-hidden");
  els.adminScreen.classList.add("is-hidden");
  els.appShell.classList.add("is-locked");
  els.loginMessage.textContent = message;
}

async function showApp(user) {
  currentUser = user;
  activeAdmin = null;
  els.loginScreen.classList.add("is-hidden");
  els.adminScreen.classList.add("is-hidden");
  els.appShell.classList.remove("is-locked");
  await loadData();
  setDefaultDates();
  render();
}

async function showAdmin(user) {
  activeAdmin = user;
  els.loginScreen.classList.add("is-hidden");
  els.appShell.classList.add("is-locked");
  els.adminScreen.classList.remove("is-hidden");
  await renderAdminUsers();
}

function setDefaultDates() {
  els.workoutDate.value = toISODate(new Date());
  els.cardioDate.value = toISODate(new Date());
  els.bpDate.value = toISODate(new Date());
  els.nutritionDate.value = toISODate(new Date());
  els.workoutName.value ||= "Workout";
  els.workoutMinutes.value ||= 45;
  els.cardioMinutes.value ||= 30;
  els.weightDate.value = toISODate(new Date());
  els.heightValue.value = state.profile?.height || "";
  els.heightUnit.value = state.profile?.heightUnit || "cm";
  els.calorieGoal.value = state.nutrition?.calorieGoal || "";
  els.targetWeight.value = state.nutrition?.targetWeight || "";
  els.targetWeeks.value = state.nutrition?.targetWeeks || "";
  renderCalorieGoalHint();
}

function render() {
  if (!currentUser) return;
  els.currentUserName.textContent = currentUser.email;
  renderExerciseSelect();
  renderRepeatWorkoutSelect();
  renderWorkoutBuilder();
  renderExerciseLibrary();
  renderRecentWorkouts();
  renderCalendar();
  renderSelectedDate();
  renderResults();
  renderWeightLogger();
  renderBloodPressure();
  renderNutrition();
  renderSummary();
}

function renderSummary() {
  const totalSets = state.workouts.reduce((sum, workout) => sum + workout.exercises.reduce((inner, exercise) => inner + exercise.sets.length, 0), 0);
  const totalMinutes = allSessions().reduce((sum, session) => sum + Number(session.minutes || 0), 0);
  els.summaryWorkouts.textContent = allSessions().length;
  els.summarySets.textContent = totalSets;
  els.summaryMinutes.textContent = formatMinutes(totalMinutes);
}

function renderExerciseSelect() {
  els.exerciseSelect.innerHTML = "";
  if (!state.exercises.length) {
    els.exerciseSelect.innerHTML = '<option value="">Create an exercise first</option>';
    return;
  }
  state.exercises.toSorted((a, b) => a.name.localeCompare(b.name)).forEach((exercise) => {
    els.exerciseSelect.append(new Option(`${exercise.name} · ${exercise.area}`, exercise.id));
  });
}

function renderRepeatWorkoutSelect() {
  els.repeatWorkoutSelect.innerHTML = "";
  if (!state.workouts.length) {
    els.repeatWorkoutSelect.append(new Option("No logged workouts yet", ""));
    return;
  }
  state.workouts.toSorted((a, b) => b.date.localeCompare(a.date)).forEach((workout) => {
    els.repeatWorkoutSelect.append(new Option(`${workout.name} · ${formatDate(workout.date)}`, workout.id));
  });
}

function renderWorkoutBuilder() {
  els.workoutExercises.innerHTML = currentWorkout.length ? "" : '<div class="empty-state">No exercises added yet.</div>';
  currentWorkout.forEach((entry) => {
    const exercise = state.exercises.find((item) => item.id === entry.exerciseId);
    const card = document.createElement("article");
    card.className = "workout-card";
    card.dataset.entryId = entry.id;
    card.innerHTML = `
      <div class="workout-card-head">
        <div class="exercise-card-title">
          <div class="exercise-thumb ${exercise?.image ? "" : "is-empty"}">${exercise?.image ? `<img src="${exercise.image}" alt="${escapeHTML(exercise.name)}" />` : ""}</div>
          <div><h3>${escapeHTML(exercise?.name || entry.name || "Exercise")}</h3><p>${escapeHTML([exercise?.area || entry.area, exercise?.equipment].filter(Boolean).join(" · "))}</p></div>
        </div>
        <button class="icon-button remove-exercise" type="button" aria-label="Remove exercise">×</button>
      </div>
      <div class="sets"></div>
      <button class="mini-button add-set" type="button">Add set</button>
    `;
    const sets = card.querySelector(".sets");
    entry.sets.forEach((set, index) => {
      const row = document.createElement("div");
      row.className = "set-row";
      row.innerHTML = `
        <strong>Set ${index + 1}</strong>
        <label>Reps<input inputmode="numeric" type="number" min="0" value="${set.reps}" placeholder="${set.previousReps ?? ""}" data-field="reps" data-set-id="${set.id}" /></label>
        <label>Weight used<input inputmode="decimal" type="number" min="0" step="0.5" value="${set.weight}" placeholder="${set.previousWeight ?? ""}" data-field="weight" data-set-id="${set.id}" /></label>
        <button class="icon-button remove-set" type="button" aria-label="Remove set" data-set-id="${set.id}">×</button>
      `;
      sets.append(row);
    });
    els.workoutExercises.append(card);
  });
}

function renderExerciseLibrary() {
  els.exerciseLibrary.innerHTML = state.exercises.length ? "" : '<div class="empty-state">No exercises saved.</div>';
  state.exercises.toSorted((a, b) => a.name.localeCompare(b.name)).forEach((exercise) => {
    const item = document.createElement("article");
    item.className = "exercise-item";
    item.innerHTML = `
      <div class="exercise-info">
        <div class="exercise-thumb ${exercise.image ? "" : "is-empty"}">${exercise.image ? `<img src="${exercise.image}" alt="${escapeHTML(exercise.name)}" />` : ""}</div>
        <div><h3>${escapeHTML(exercise.name)}</h3><p><span class="pill">${escapeHTML(exercise.area)}</span> ${escapeHTML(exercise.equipment || "")}</p>${exercise.notes ? `<p>${escapeHTML(exercise.notes)}</p>` : ""}</div>
      </div>
      <button class="danger-button" type="button" data-delete-exercise="${exercise.id}">Delete</button>
    `;
    els.exerciseLibrary.append(item);
  });
}

function createWorkoutItem(workout) {
  const item = document.createElement("article");
  item.className = "recent-item";
  const setCount = workout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
  const repCount = workout.exercises.reduce((sum, exercise) => sum + exercise.sets.reduce((inner, set) => inner + Number(set.reps || 0), 0), 0);
  item.innerHTML = `
    <div><h3>${escapeHTML(workout.name)}</h3><p class="recent-meta">${formatDate(workout.date)} · ${workout.minutes}m · ${setCount} sets · ${repCount} reps</p><p class="recent-meta">${workout.exercises.map((entry) => escapeHTML(entry.name)).join(", ")}</p></div>
    <div class="admin-actions"><button class="secondary-button" type="button" data-edit-workout="${workout.id}">Edit</button><button class="danger-button" type="button" data-delete-workout="${workout.id}">Delete</button></div>
  `;
  return item;
}

function createCardioItem(cardio) {
  const item = document.createElement("article");
  item.className = "recent-item";
  item.innerHTML = `
    <div><h3>${escapeHTML(cardio.type)}</h3><p class="recent-meta">${formatDate(cardio.date)} · ${formatMinutes(cardio.minutes)} · ${Number(cardio.distance).toFixed(2)}${cardio.distanceUnit}</p><p class="recent-meta">Cardio</p></div>
    <div class="admin-actions"><button class="secondary-button" type="button" data-edit-cardio="${cardio.id}">Edit</button><button class="danger-button" type="button" data-delete-cardio="${cardio.id}">Delete</button></div>
  `;
  return item;
}

function allSessions() {
  return [
    ...state.workouts.map((workout) => ({ ...workout, sessionType: "strength" })),
    ...state.cardioWorkouts.map((cardio) => ({ ...cardio, sessionType: "cardio" }))
  ].toSorted((a, b) => `${b.date}${b.createdAt || ""}`.localeCompare(`${a.date}${a.createdAt || ""}`));
}

function createSessionItem(session) {
  return session.sessionType === "cardio" ? createCardioItem(session) : createWorkoutItem(session);
}

function sessionIcon(session) {
  if (session.sessionType === "strength") return "🏋";
  const type = String(session.type || "").toLowerCase();
  if (type.includes("bike")) return "🚲";
  if (type.includes("walk")) return "🚶";
  if (type.includes("run") || type.includes("treadmill")) return "🏃";
  if (type.includes("row")) return "🚣";
  return "•";
}

function renderRecentWorkouts() {
  const recent = allSessions().slice(0, 6);
  els.recentWorkouts.innerHTML = recent.length ? "" : '<div class="empty-state">Saved workouts will appear here.</div>';
  recent.forEach((session) => els.recentWorkouts.append(createSessionItem(session)));
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
    const date = addDays(startDate, index);
    const iso = toISODate(date);
    const workouts = allSessions().filter((session) => session.date === iso);
    const button = document.createElement("button");
    button.className = `calendar-day ${date.getMonth() !== month ? "is-muted" : ""} ${iso === selectedDate ? "is-selected" : ""} ${workouts.length ? "has-workout" : ""}`;
    button.type = "button";
    button.dataset.date = iso;
    const icons = workouts.slice(0, 4).map((session) => `<span class="calendar-icon" title="${escapeHTML(session.sessionType === "cardio" ? session.type : "Workout")}">${sessionIcon(session)}</span>`).join("");
    button.innerHTML = `<strong>${date.getDate()}</strong>${workouts.length ? `<div class="calendar-icons">${icons}</div><span class="calendar-count">${workouts.length} logged</span>` : ""}`;
    els.calendarGrid.append(button);
  }
}

function renderSelectedDate() {
  const workouts = allSessions().filter((session) => session.date === selectedDate);
  els.selectedDateTitle.textContent = formatDate(selectedDate);
  els.selectedDayWorkouts.innerHTML = workouts.length ? "" : '<div class="empty-state">No workouts on this date.</div>';
  workouts.forEach((session) => els.selectedDayWorkouts.append(createSessionItem(session)));
}

function renderResults() {
  const periods = [
    ["Day", "Today", 1],
    ["Week", "Last 7 days", 7],
    ["4 weeks", "Last 4 weeks", 28],
    ["3 months", "Last 3 months", 91],
    ["12 months", "Last 12 months", 365]
  ];
  const today = startOfDay(new Date());
  els.resultsGrid.innerHTML = "";
  periods.forEach(([label, title, days]) => {
    const currentStart = addDays(today, -(days - 1));
    const previousStart = addDays(today, -(days * 2 - 1));
    const previousEnd = addDays(today, -days);
    const current = summarizeWorkouts(currentStart, today);
    const previous = summarizeWorkouts(previousStart, previousEnd);
    const card = document.createElement("article");
    card.className = "result-card";
    card.innerHTML = `<p class="eyebrow">${label}</p><h3>${title}</h3><p class="result-range">${formatDate(toISODate(currentStart))} - ${formatDate(toISODate(today))}</p><div class="result-metrics"><div><span>${current.count}</span><small>Workouts</small></div><div><span>${formatMinutes(current.minutes)}</span><small>Total time</small></div></div><div class="comparison-grid"><div class="comparison ${current.count - previous.count >= 0 ? "up" : "down"}"><strong>Workouts</strong><span>${current.count - previous.count >= 0 ? "+" : ""}${current.count - previous.count}</span><small>Previous: ${previous.count}</small></div><div class="comparison ${current.minutes - previous.minutes >= 0 ? "up" : "down"}"><strong>Time</strong><span>${formatSignedMinutes(current.minutes - previous.minutes)}</span><small>Previous: ${formatMinutes(previous.minutes)}</small></div></div>`;
    els.resultsGrid.append(card);
  });
}

function summarizeWorkouts(start, end) {
  return allSessions().reduce((sum, workout) => {
    const date = new Date(`${workout.date}T12:00:00`);
    if (date >= start && date <= end) {
      sum.count += 1;
      sum.minutes += Number(workout.minutes || 0);
    }
    return sum;
  }, { count: 0, minutes: 0 });
}

function getCardioMinutes() {
  const minutes = Number(els.cardioMinutes.value || 0);
  const seconds = Math.min(59, Math.max(0, Number(els.cardioSeconds.value || 0)));
  return minutes + seconds / 60;
}

function formatMinutes(value) {
  const totalSeconds = Math.round(Number(value || 0) * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  if (seconds) return `${minutes}:${String(seconds).padStart(2, "0")}`;
  return `${minutes}m`;
}

function formatSignedMinutes(value) {
  if (!value) return "No change";
  return `${value > 0 ? "+" : "-"}${formatMinutes(Math.abs(value))}`;
}

function renderWeightLogger() {
  renderWeightHistory();
  renderBmiStats();
  const entries = getWeightEntries();
  if (!entries.length) {
    els.weightStats.innerHTML = '<div class="weight-stat"><span>--</span><small>Latest</small></div><div class="weight-stat"><span>--</span><small>Change</small></div><div class="weight-stat"><span>0</span><small>Entries</small></div>';
    els.weightChart.innerHTML = '<div class="empty-state">Add weigh-ins to draw a graph.</div>';
    return;
  }
  const unit = entries.at(-1).unit;
  const first = entries[0].weight;
  const latest = entries.at(-1).weight;
  els.weightStats.innerHTML = `<div class="weight-stat"><span>${latest}${unit}</span><small>Latest</small></div><div class="weight-stat"><span>${(latest - first).toFixed(1)}${unit}</span><small>Change</small></div><div class="weight-stat"><span>${entries.length}</span><small>Entries</small></div>`;
  if (entries.length < 2) {
    els.weightChart.innerHTML = '<div class="empty-state">Add one more weigh-in to draw a graph.</div>';
    return;
  }
  const points = entries.map((entry, index) => `${40 + (index / (entries.length - 1)) * 680},${240 - ((entry.weight - Math.min(...entries.map((e) => e.weight))) / Math.max(1, Math.max(...entries.map((e) => e.weight)) - Math.min(...entries.map((e) => e.weight)))) * 190}`).join(" ");
  els.weightChart.innerHTML = `<svg class="weight-svg" viewBox="0 0 760 280"><line x1="40" y1="240" x2="720" y2="240"></line><polyline points="${points}"></polyline></svg>`;
}

function getCurrentBmiWeight() {
  if (els.weightValue.value) {
    return { weight: Number(els.weightValue.value), unit: els.weightUnit.value };
  }
  const latest = state.bodyWeights.toSorted((a, b) => b.date.localeCompare(a.date))[0];
  return latest ? { weight: Number(latest.weight), unit: latest.unit } : null;
}

function weightToKg(weight, unit) {
  return unit === "lb" ? weight * 0.45359237 : weight;
}

function heightToMetres(height, unit) {
  return unit === "ft" ? height * 0.3048 : height / 100;
}

function bmiCategory(bmi) {
  if (bmi < 18.5) return "Under";
  if (bmi < 25) return "Healthy";
  if (bmi < 30) return "Over";
  return "High";
}

function renderBmiStats() {
  const height = Number(els.heightValue.value || state.profile?.height || 0);
  const heightUnit = els.heightUnit.value || state.profile?.heightUnit || "cm";
  const weightEntry = getCurrentBmiWeight();
  if (!height || !weightEntry?.weight) {
    els.bmiStats.innerHTML = '<div class="weight-stat"><span>--</span><small>BMI</small></div><div class="weight-stat"><span>--</span><small>Height</small></div><div class="weight-stat"><span>--</span><small>Using weight</small></div>';
    return;
  }
  const bmi = weightToKg(weightEntry.weight, weightEntry.unit) / heightToMetres(height, heightUnit) ** 2;
  els.bmiStats.innerHTML = `<div class="weight-stat"><span>${bmi.toFixed(1)}</span><small>BMI</small></div><div class="weight-stat"><span>${height}${heightUnit}</span><small>Height</small></div><div class="weight-stat"><span>${bmiCategory(bmi)}</span><small>Range</small></div>`;
}

function getWeightEntries() {
  const days = weightRange === "3m" ? 91 : weightRange === "12m" ? 365 : Number(weightRange);
  const start = addDays(startOfDay(new Date()), -(days - 1));
  return state.bodyWeights.filter((entry) => new Date(`${entry.date}T12:00:00`) >= start).toSorted((a, b) => a.date.localeCompare(b.date));
}

function renderWeightHistory() {
  const entries = state.bodyWeights.toSorted((a, b) => b.date.localeCompare(a.date));
  els.weightHistory.innerHTML = entries.length ? "" : '<div class="empty-state">Saved weigh-ins will appear here.</div>';
  entries.forEach((entry) => {
    const item = document.createElement("article");
    item.className = "recent-item";
    item.innerHTML = `<div><h3>${entry.weight}${entry.unit}</h3><p class="recent-meta">${formatDate(entry.date)}</p></div><button class="danger-button" type="button" data-delete-weight="${entry.id}">Delete</button>`;
    els.weightHistory.append(item);
  });
}

function bpRange(entry) {
  const sys = Number(entry?.systolic || 0);
  const dia = Number(entry?.diastolic || 0);
  if (sys > 180 || dia > 120) return { key: "crisis", label: "Crisis", detail: "SYS >180 or DIA >120" };
  if (sys >= 140 || dia >= 90) return { key: "stage2", label: "High 2", detail: "SYS 140+ or DIA 90+" };
  if (sys >= 130 || dia >= 80) return { key: "stage1", label: "High 1", detail: "SYS 130-139 or DIA 80-89" };
  if (sys >= 120 && dia < 80) return { key: "elevated", label: "Elevated", detail: "SYS 120-129 and DIA under 80" };
  if (sys && dia) return { key: "normal", label: "Normal", detail: "SYS under 120 and DIA under 80" };
  return { key: "none", label: "--", detail: "Add a reading" };
}

function renderBloodPressure() {
  const entries = state.bloodPressure.toSorted((a, b) => a.date.localeCompare(b.date));
  const latest = entries.at(-1);
  const range = bpRange(latest);
  els.bpStats.innerHTML = latest
    ? `<div class="weight-stat"><span>${latest.systolic}/${latest.diastolic}</span><small>Latest</small></div><div class="weight-stat"><span>${latest.pulse}</span><small>Pulse</small></div><div class="weight-stat"><span>${range.label}</span><small>Range</small></div>`
    : '<div class="weight-stat"><span>--</span><small>Latest</small></div><div class="weight-stat"><span>--</span><small>Pulse</small></div><div class="weight-stat"><span>--</span><small>Range</small></div>';
  renderBpRangeChart(range.key);
  renderBpChart(entries);
  renderBpHistory(entries);
}

function renderBpRangeChart(activeKey) {
  const zones = [
    ["normal", "Normal", "<120 / <80"],
    ["elevated", "Elevated", "120-129 / <80"],
    ["stage1", "High 1", "130-139 / 80-89"],
    ["stage2", "High 2", "140+ / 90+"],
    ["crisis", "Crisis", ">180 / >120"]
  ];
  els.bpRangeChart.innerHTML = zones.map(([key, label, detail]) => `<div class="bp-zone ${key === activeKey ? "is-active" : ""}"><strong>${label}</strong><span>${detail}</span><small>${key === activeKey ? "Latest" : ""}</small></div>`).join("");
}

function renderBpChart(entries) {
  if (entries.length < 2) {
    els.bpChart.innerHTML = '<div class="empty-state">Add at least two readings to draw a graph.</div>';
    return;
  }
  const width = 760;
  const height = 280;
  const padding = 34;
  const values = entries.flatMap((entry) => [entry.systolic, entry.diastolic]);
  const minValue = Math.max(40, Math.min(...values) - 10);
  const maxValue = Math.max(...values) + 10;
  const range = Math.max(1, maxValue - minValue);
  const point = (entry, value) => {
    const index = entries.indexOf(entry);
    const x = padding + (index / Math.max(1, entries.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - minValue) / range) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };
  const sysPoints = entries.map((entry) => point(entry, entry.systolic)).join(" ");
  const diaPoints = entries.map((entry) => point(entry, entry.diastolic)).join(" ");
  const dots = entries.map((entry) => {
    const [sx, sy] = point(entry, entry.systolic).split(",");
    const [dx, dy] = point(entry, entry.diastolic).split(",");
    return `<circle cx="${sx}" cy="${sy}" r="4"><title>${formatDate(entry.date)} SYS ${entry.systolic}</title></circle><circle class="bp-dia-dot" cx="${dx}" cy="${dy}" r="4"><title>${formatDate(entry.date)} DIA ${entry.diastolic}</title></circle>`;
  }).join("");
  els.bpChart.innerHTML = `<svg class="weight-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Blood pressure trend graph"><line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" /><line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" /><text x="${padding}" y="22">${Math.round(maxValue)}</text><text x="${padding}" y="${height - 8}">${Math.round(minValue)}</text><polyline points="${sysPoints}" /><polyline class="bp-dia" points="${diaPoints}" /><g>${dots}</g></svg>`;
}

function renderBpHistory(entries) {
  const recent = entries.slice().reverse();
  els.bpHistory.innerHTML = recent.length ? "" : '<div class="empty-state">Saved blood pressure readings will appear here.</div>';
  recent.forEach((entry) => {
    const range = bpRange(entry);
    const item = document.createElement("article");
    item.className = "recent-item";
    item.innerHTML = `<div><h3>${entry.systolic}/${entry.diastolic}</h3><p class="recent-meta">${formatDate(entry.date)} · Pulse ${entry.pulse} · ${range.label}</p></div><button class="danger-button" type="button" data-delete-bp="${entry.id}">Delete</button>`;
    els.bpHistory.append(item);
  });
}

function normalizeFoodProduct(product) {
  const nutriments = product.nutriments || {};
  return {
    code: product.code || "",
    name: product.product_name || product.generic_name || "Unnamed food",
    brand: product.brands || "",
    serving: Number(product.serving_quantity || nutriments.serving_quantity || 100),
    calories100: Number(nutriments["energy-kcal_100g"] ?? nutriments["energy-kcal_serving"] ?? 0),
    protein100: Number(nutriments.proteins_100g ?? nutriments.proteins_serving ?? 0),
    carbs100: Number(nutriments.carbohydrates_100g ?? nutriments.carbohydrates_serving ?? 0),
    fat100: Number(nutriments.fat_100g ?? nutriments.fat_serving ?? 0)
  };
}

async function searchFood(term) {
  if (!term.trim()) return;
  els.foodSearchMessage.textContent = "Searching food database...";
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(term)}&search_simple=1&action=process&json=1&page_size=8&fields=code,product_name,generic_name,brands,nutriments`;
  const response = await fetch(url);
  const data = await response.json();
  renderFoodSearchResults((data.products || []).map(normalizeFoodProduct).filter((food) => food.calories100 || food.protein100 || food.carbs100 || food.fat100));
}

async function lookupBarcode(code) {
  if (!code.trim()) return;
  els.foodSearchMessage.textContent = "Looking up barcode...";
  const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=code,product_name,generic_name,brands,nutriments`);
  const data = await response.json();
  if (!data.product) {
    els.foodSearchMessage.textContent = "No product found for that barcode.";
    els.foodSearchResults.innerHTML = "";
    return;
  }
  renderFoodSearchResults([normalizeFoodProduct(data.product)]);
}

function renderFoodSearchResults(results) {
  foodSearchCache = results;
  els.foodSearchMessage.textContent = results.length ? "Choose a result to add it to today." : "No nutrition results found.";
  els.foodSearchResults.innerHTML = results.length ? "" : '<div class="empty-state">Try another search or barcode.</div>';
  results.forEach((food, index) => {
    const item = document.createElement("article");
    item.className = "recent-item";
    item.innerHTML = `<div><h3>${escapeHTML(food.name)}</h3><p class="recent-meta">${escapeHTML(food.brand)} · per 100g: ${Math.round(food.calories100)} kcal · P ${food.protein100.toFixed(1)}g · C ${food.carbs100.toFixed(1)}g · F ${food.fat100.toFixed(1)}g</p><div class="two-col"><label>Amount<input type="number" min="0" step="0.1" value="${food.serving || 100}" data-food-amount="${index}" /></label><label>Unit<select data-food-unit="${index}"><option value="g">g</option><option value="ml">ml</option><option value="tsp">tsp</option><option value="tbsp">tbsp</option><option value="serving">serving</option></select></label></div></div><button class="primary-button" type="button" data-add-food="${index}">Add</button>`;
    els.foodSearchResults.append(item);
  });
}

function foodUnitMultiplier(amount, unit, food) {
  if (unit === "serving") return (amount * (food.serving || 100)) / 100;
  if (unit === "tsp") return (amount * 5) / 100;
  if (unit === "tbsp") return (amount * 15) / 100;
  return amount / 100;
}

function addFood(index) {
  const food = foodSearchCache[Number(index)];
  if (!food) return;
  const amount = Number(els.foodSearchResults.querySelector(`[data-food-amount="${index}"]`)?.value || food.serving || 100);
  const unit = els.foodSearchResults.querySelector(`[data-food-unit="${index}"]`)?.value || "g";
  const multiplier = foodUnitMultiplier(amount, unit, food);
  state.nutrition.foods.push({
    id: crypto.randomUUID(),
    date: els.nutritionDate.value,
    name: food.name,
    brand: food.brand,
    amount,
    unit,
    calories: food.calories100 * multiplier,
    protein: food.protein100 * multiplier,
    carbs: food.carbs100 * multiplier,
    fat: food.fat100 * multiplier
  });
  saveState().then(renderNutrition);
}

function selectedNutritionLogs() {
  const date = els.nutritionDate.value || toISODate(new Date());
  return {
    foods: state.nutrition.foods.filter((item) => item.date === date),
    water: state.nutrition.water.filter((item) => item.date === date)
  };
}

function nutritionTotals(foods) {
  return foods.reduce((sum, food) => {
    const servings = Number(food.servings || 1);
    sum.calories += Number(food.calories || 0) * servings;
    sum.protein += Number(food.protein || 0) * servings;
    sum.carbs += Number(food.carbs || 0) * servings;
    sum.fat += Number(food.fat || 0) * servings;
    return sum;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

function renderCalorieGoalHint() {
  const latest = state.bodyWeights.toSorted((a, b) => b.date.localeCompare(a.date))[0];
  const target = Number(els.targetWeight.value || state.nutrition.targetWeight || 0);
  const weeks = Number(els.targetWeeks.value || state.nutrition.targetWeeks || 0);
  if (!latest || !target || !weeks) {
    els.calorieGoalHint.textContent = "Set a calorie goal manually, or enter target weight and weeks for a simple estimate.";
    return;
  }
  const latestKg = latest.unit === "lb" ? latest.weight * 0.45359237 : latest.weight;
  const targetKg = target;
  const dailyChange = ((targetKg - latestKg) * 7700) / (weeks * 7);
  const base = Number(els.calorieGoal.value || state.nutrition.calorieGoal || 2200);
  els.calorieGoalHint.textContent = `Simple estimate: about ${Math.round(base + dailyChange)} kcal/day from a ${Math.round(dailyChange)} kcal daily adjustment.`;
}

function renderNutrition() {
  renderCalorieGoalHint();
  const { foods, water } = selectedNutritionLogs();
  const totals = nutritionTotals(foods);
  const goal = Number(state.nutrition.calorieGoal || 0);
  const waterMl = water.reduce((sum, item) => sum + Number(item.amountMl || 0), 0);
  els.nutritionStats.innerHTML = `<div class="weight-stat"><span>${Math.round(totals.calories)}</span><small>Calories${goal ? ` / ${goal}` : ""}</small></div><div class="weight-stat"><span>${totals.protein.toFixed(0)}g</span><small>Protein</small></div><div class="weight-stat"><span>${totals.carbs.toFixed(0)}g / ${totals.fat.toFixed(0)}g</span><small>Carbs / Fat</small></div>`;
  els.foodLogList.innerHTML = foods.length || water.length ? "" : '<div class="empty-state">Food and water logged for this day will appear here.</div>';
  foods.forEach((food) => {
    const item = document.createElement("article");
    item.className = "recent-item";
    item.innerHTML = `<div><h3>${escapeHTML(food.name)}</h3><p class="recent-meta">${food.amount || 1}${food.unit || "serving"} · ${Math.round(food.calories)} kcal · P ${Number(food.protein || 0).toFixed(1)}g · C ${Number(food.carbs || 0).toFixed(1)}g · F ${Number(food.fat || 0).toFixed(1)}g</p></div><button class="danger-button" type="button" data-delete-food="${food.id}">Delete</button>`;
    els.foodLogList.append(item);
  });
  if (waterMl) {
    const item = document.createElement("article");
    item.className = "recent-item";
    item.innerHTML = `<div><h3>Water</h3><p class="recent-meta">${waterMl}ml logged today</p></div>`;
    els.foodLogList.append(item);
  }
}

async function scanBarcode() {
  if (!("BarcodeDetector" in window)) {
    els.foodSearchMessage.textContent = "Barcode scanning is not supported by this browser. Enter the barcode manually instead.";
    return;
  }
  barcodeStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
  els.barcodeVideo.srcObject = barcodeStream;
  els.barcodeVideo.classList.remove("is-hidden");
  await els.barcodeVideo.play();
  const detector = new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
  const scan = async () => {
    if (!barcodeStream) return;
    const codes = await detector.detect(els.barcodeVideo).catch(() => []);
    if (codes.length) {
      const code = codes[0].rawValue;
      stopBarcodeScan();
      els.barcodeInput.value = code;
      await lookupBarcode(code);
      return;
    }
    requestAnimationFrame(scan);
  };
  requestAnimationFrame(scan);
}

function stopBarcodeScan() {
  barcodeStream?.getTracks().forEach((track) => track.stop());
  barcodeStream = null;
  els.barcodeVideo.classList.add("is-hidden");
}

async function renderAdminUsers() {
  const { users } = await api("/api/admin/users");
  els.adminUserList.innerHTML = users.length ? "" : '<div class="empty-state">No user accounts yet.</div>';
  users.forEach((user) => {
    const item = document.createElement("article");
    item.className = "admin-user-item";
    item.innerHTML = `<div><h3>${escapeHTML(user.email)}</h3><p class="recent-meta">${user.status}</p></div><div class="admin-actions">${user.status === "pending" ? `<button class="primary-button" type="button" data-approve-user="${user.id}">Approve</button>` : `<button class="secondary-button" type="button" data-pend-user="${user.id}">Set pending</button>`}<button class="danger-button" type="button" data-delete-user="${user.id}">Remove</button></div>`;
    els.adminUserList.append(item);
  });
}

function createSets(count = 5) {
  return Array.from({ length: count }, () => ({ id: crypto.randomUUID(), reps: "", weight: "" }));
}

function addExerciseToWorkout(exerciseId) {
  const exercise = state.exercises.find((item) => item.id === exerciseId);
  if (!exercise) return;
  currentWorkout.push({ id: crypto.randomUUID(), exerciseId, name: exercise.name, area: exercise.area, sets: createSets(5) });
  renderWorkoutBuilder();
}

function repeatWorkout(workoutId) {
  const workout = state.workouts.find((item) => item.id === workoutId);
  if (!workout) return;
  els.workoutName.value = workout.name;
  els.workoutMinutes.value = workout.minutes;
  currentWorkout = workout.exercises.map((entry) => ({ id: crypto.randomUUID(), exerciseId: entry.exerciseId, name: entry.name, area: entry.area, sets: entry.sets.map((set) => ({ id: crypto.randomUUID(), reps: "", weight: "", previousReps: set.reps, previousWeight: set.weight })) }));
  renderWorkoutBuilder();
}

function editWorkout(workoutId) {
  const workout = state.workouts.find((item) => item.id === workoutId);
  if (!workout) return;
  editingWorkoutId = workoutId;
  els.workoutName.value = workout.name;
  els.workoutDate.value = workout.date;
  els.workoutMinutes.value = workout.minutes;
  currentWorkout = workout.exercises.map((entry) => ({
    id: crypto.randomUUID(),
    exerciseId: entry.exerciseId,
    name: entry.name,
    area: entry.area,
    sets: entry.sets.map((set) => ({ id: crypto.randomUUID(), reps: set.reps, weight: set.weight }))
  }));
  els.cancelWorkoutEditBtn.classList.remove("is-hidden");
  showView("logView");
  renderWorkoutBuilder();
}

function cancelWorkoutEdit() {
  editingWorkoutId = "";
  currentWorkout = [];
  els.workoutForm.reset();
  els.cancelWorkoutEditBtn.classList.add("is-hidden");
  setDefaultDates();
  renderWorkoutBuilder();
}

function editCardio(cardioId) {
  const cardio = state.cardioWorkouts.find((item) => item.id === cardioId);
  if (!cardio) return;
  editingCardioId = cardioId;
  els.cardioType.value = cardio.type;
  els.cardioDate.value = cardio.date;
  const totalSeconds = Math.round(Number(cardio.minutes || 0) * 60);
  els.cardioMinutes.value = Math.floor(totalSeconds / 60);
  els.cardioSeconds.value = totalSeconds % 60;
  els.cardioDistance.value = cardio.distance;
  els.cardioDistanceUnit.value = cardio.distanceUnit || "km";
  els.cancelCardioEditBtn.classList.remove("is-hidden");
  showView("logView");
}

function cancelCardioEdit() {
  editingCardioId = "";
  els.cardioForm.reset();
  els.cancelCardioEditBtn.classList.add("is-hidden");
  setDefaultDates();
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

function toISODate(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${dateString}T12:00:00`));
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function escapeHTML(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function showView(viewId) {
  els.tabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.view === viewId));
  els.views.forEach((view) => view.classList.toggle("is-active", view.id === viewId));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

els.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const { user } = await api("/api/login", { method: "POST", body: { email: els.loginEmail.value, password: els.loginPin.value } });
    await showApp(user);
  } catch (error) {
    showLogin(error.message);
  }
});

els.createUserForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const result = await api("/api/register", { method: "POST", body: { email: els.newUserEmail.value, password: els.newUserPin.value } });
    els.createUserForm.reset();
    showLogin(result.message);
  } catch (error) {
    showLogin(error.message);
  }
});

els.adminLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const { user } = await api("/api/login", { method: "POST", body: { email: els.adminEmail.value, password: els.adminPin.value } });
    if (user.role !== "admin") throw new Error("Admin access required.");
    await showAdmin(user);
  } catch (error) {
    showLogin(error.message);
  }
});

els.changeAdminPinForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/admin/password", { method: "POST", body: { currentPassword: els.currentAdminPin.value, newPassword: els.newAdminPin.value } });
    els.changeAdminPinForm.reset();
    els.adminMessage.textContent = "Admin password updated.";
  } catch (error) {
    els.adminMessage.textContent = error.message;
  }
});

els.adminLogoutBtn.addEventListener("click", async () => {
  await api("/api/logout", { method: "POST" });
  showLogin("Admin logged out.");
});

els.logoutBtn.addEventListener("click", async () => {
  await api("/api/logout", { method: "POST" });
  showLogin("Logged out.");
});

els.tabs.forEach((button) => {
  if (button.dataset.view) button.addEventListener("click", () => {
    showView(button.dataset.view);
  });
});

els.addExerciseBtn.addEventListener("click", () => addExerciseToWorkout(els.exerciseSelect.value));
els.repeatWorkoutBtn.addEventListener("click", () => repeatWorkout(els.repeatWorkoutSelect.value));
els.resetWorkoutBtn.addEventListener("click", () => {
  editingWorkoutId = "";
  els.cancelWorkoutEditBtn.classList.add("is-hidden");
  currentWorkout = [];
  renderWorkoutBuilder();
});

els.cancelWorkoutEditBtn.addEventListener("click", cancelWorkoutEdit);
els.cancelCardioEditBtn.addEventListener("click", cancelCardioEdit);

els.workoutExercises.addEventListener("click", (event) => {
  const card = event.target.closest(".workout-card");
  const entry = currentWorkout.find((item) => item.id === card?.dataset.entryId);
  if (!entry) return;

  let shouldRender = false;
  if (event.target.matches(".add-set")) {
    entry.sets.push(...createSets(1));
    shouldRender = true;
  }
  if (event.target.matches(".remove-set")) {
    entry.sets = entry.sets.filter((set) => set.id !== event.target.dataset.setId);
    if (!entry.sets.length) entry.sets.push(...createSets(1));
    shouldRender = true;
  }
  if (event.target.matches(".remove-exercise")) {
    currentWorkout = currentWorkout.filter((item) => item.id !== entry.id);
    shouldRender = true;
  }
  if (shouldRender) renderWorkoutBuilder();
});

els.workoutExercises.addEventListener("input", (event) => {
  const card = event.target.closest(".workout-card");
  const entry = currentWorkout.find((item) => item.id === card?.dataset.entryId);
  const set = entry?.sets.find((item) => item.id === event.target.dataset.setId);
  if (set) set[event.target.dataset.field] = event.target.value;
});

els.workoutForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const exercises = currentWorkout.map((entry) => {
    const exercise = state.exercises.find((item) => item.id === entry.exerciseId);
    return { exerciseId: entry.exerciseId, name: exercise?.name || entry.name, area: exercise?.area || entry.area, sets: entry.sets.map((set) => ({ reps: Number(set.reps || 0), weight: set.weight === "" ? "" : Number(set.weight) })).filter((set) => set.reps > 0 || set.weight !== "") };
  }).filter((entry) => entry.sets.length);
  if (!exercises.length) return alert("Add at least one set before saving.");
  const workout = { id: editingWorkoutId || crypto.randomUUID(), name: els.workoutName.value, date: els.workoutDate.value, minutes: Number(els.workoutMinutes.value), exercises, createdAt: new Date().toISOString() };
  if (editingWorkoutId) {
    const index = state.workouts.findIndex((item) => item.id === editingWorkoutId);
    if (index >= 0) state.workouts[index] = { ...state.workouts[index], ...workout };
  } else {
    state.workouts.push(workout);
  }
  editingWorkoutId = "";
  els.cancelWorkoutEditBtn.classList.add("is-hidden");
  currentWorkout = [];
  await saveState();
  render();
});

els.cardioForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  state.cardioWorkouts ||= [];
  const cardio = {
    id: editingCardioId || crypto.randomUUID(),
    type: els.cardioType.value,
    date: els.cardioDate.value,
    minutes: getCardioMinutes(),
    distance: Number(els.cardioDistance.value),
    distanceUnit: els.cardioDistanceUnit.value,
    createdAt: new Date().toISOString()
  };
  if (editingCardioId) {
    const index = state.cardioWorkouts.findIndex((item) => item.id === editingCardioId);
    if (index >= 0) state.cardioWorkouts[index] = { ...state.cardioWorkouts[index], ...cardio };
  } else {
    state.cardioWorkouts.push(cardio);
  }
  editingCardioId = "";
  selectedDate = els.cardioDate.value;
  calendarDate = new Date(`${selectedDate}T12:00:00`);
  els.cardioDistance.value = "";
  els.cardioSeconds.value = "";
  els.cancelCardioEditBtn.classList.add("is-hidden");
  await saveState();
  render();
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

els.exerciseForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  state.exercises.push({ id: crypto.randomUUID(), name: els.exerciseName.value, area: els.exerciseArea.value, equipment: els.exerciseEquipment.value, notes: els.exerciseNotes.value, image: exerciseImageData });
  els.exerciseForm.reset();
  clearExerciseImage();
  await saveState();
  render();
});

els.weightForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const existing = state.bodyWeights.find((entry) => entry.date === els.weightDate.value);
  if (existing) {
    existing.weight = Number(els.weightValue.value);
    existing.unit = els.weightUnit.value;
  } else {
    state.bodyWeights.push({ id: crypto.randomUUID(), date: els.weightDate.value, weight: Number(els.weightValue.value), unit: els.weightUnit.value, createdAt: new Date().toISOString() });
  }
  els.weightValue.value = "";
  await saveState();
  renderWeightLogger();
});

els.bloodPressureForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  state.bloodPressure ||= [];
  state.bloodPressure.push({
    id: crypto.randomUUID(),
    date: els.bpDate.value,
    systolic: Number(els.bpSystolic.value),
    diastolic: Number(els.bpDiastolic.value),
    pulse: Number(els.bpPulse.value),
    createdAt: new Date().toISOString()
  });
  els.bpSystolic.value = "";
  els.bpDiastolic.value = "";
  els.bpPulse.value = "";
  await saveState();
  renderBloodPressure();
});

els.nutritionGoalForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  state.nutrition.calorieGoal = els.calorieGoal.value ? Number(els.calorieGoal.value) : "";
  state.nutrition.targetWeight = els.targetWeight.value ? Number(els.targetWeight.value) : "";
  state.nutrition.targetWeeks = els.targetWeeks.value ? Number(els.targetWeeks.value) : "";
  await saveState();
  renderNutrition();
});

els.foodSearchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await searchFood(els.foodSearchInput.value);
  } catch {
    els.foodSearchMessage.textContent = "Food lookup failed. Try again or enter a barcode.";
  }
});

els.barcodeLookupBtn.addEventListener("click", async () => {
  try {
    await lookupBarcode(els.barcodeInput.value);
  } catch {
    els.foodSearchMessage.textContent = "Barcode lookup failed.";
  }
});
els.scanBarcodeBtn.addEventListener("click", async () => {
  try {
    await scanBarcode();
  } catch {
    els.foodSearchMessage.textContent = "Barcode scanner could not start. Enter the barcode manually instead.";
    stopBarcodeScan();
  }
});
els.nutritionDate.addEventListener("change", renderNutrition);
els.calorieGoal.addEventListener("input", renderCalorieGoalHint);
els.targetWeight.addEventListener("input", renderCalorieGoalHint);
els.targetWeeks.addEventListener("input", renderCalorieGoalHint);

els.waterForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const amount = Number(els.waterAmount.value || 0);
  if (!amount) return;
  const amountMl = els.waterUnit.value === "oz" ? Math.round(amount * 29.5735) : amount;
  state.nutrition.water.push({ id: crypto.randomUUID(), date: els.nutritionDate.value, amountMl, createdAt: new Date().toISOString() });
  els.waterAmount.value = "";
  await saveState();
  renderNutrition();
});

els.heightForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  state.profile ||= {};
  state.profile.height = els.heightValue.value ? Number(els.heightValue.value) : "";
  state.profile.heightUnit = els.heightUnit.value;
  await saveState();
  renderBmiStats();
});

els.weightValue.addEventListener("input", renderBmiStats);
els.weightRangeButtons.forEach((button) => button.addEventListener("click", () => {
  weightRange = button.dataset.weightRange;
  els.weightRangeButtons.forEach((rangeButton) => rangeButton.classList.toggle("is-active", rangeButton === button));
  renderWeightLogger();
}));

els.heightValue.addEventListener("input", renderBmiStats);
els.heightUnit.addEventListener("change", renderBmiStats);
els.weightUnit.addEventListener("change", renderBmiStats);

document.addEventListener("click", async (event) => {
  const date = event.target.closest(".calendar-day")?.dataset.date;
  if (date) {
    selectedDate = date;
    renderCalendar();
    renderSelectedDate();
  }
  if (event.target.dataset.editWorkout) editWorkout(event.target.dataset.editWorkout);
  if (event.target.dataset.editCardio) editCardio(event.target.dataset.editCardio);
  if (event.target.dataset.addFood) addFood(event.target.dataset.addFood);
  if (event.target.dataset.deleteWorkout) state.workouts = state.workouts.filter((workout) => workout.id !== event.target.dataset.deleteWorkout);
  if (event.target.dataset.deleteCardio) state.cardioWorkouts = state.cardioWorkouts.filter((cardio) => cardio.id !== event.target.dataset.deleteCardio);
  if (event.target.dataset.deleteExercise) state.exercises = state.exercises.filter((exercise) => exercise.id !== event.target.dataset.deleteExercise);
  if (event.target.dataset.deleteWeight) state.bodyWeights = state.bodyWeights.filter((entry) => entry.id !== event.target.dataset.deleteWeight);
  if (event.target.dataset.deleteBp) state.bloodPressure = state.bloodPressure.filter((entry) => entry.id !== event.target.dataset.deleteBp);
  if (event.target.dataset.deleteFood) state.nutrition.foods = state.nutrition.foods.filter((entry) => entry.id !== event.target.dataset.deleteFood);
  if (event.target.dataset.deleteWorkout || event.target.dataset.deleteCardio || event.target.dataset.deleteExercise || event.target.dataset.deleteWeight || event.target.dataset.deleteBp || event.target.dataset.deleteFood) {
    await saveState();
    render();
  }
  if (event.target.dataset.approveUser) {
    await api(`/api/admin/users/${event.target.dataset.approveUser}/approve`, { method: "POST" });
    await renderAdminUsers();
  }
  if (event.target.dataset.pendUser) {
    await api(`/api/admin/users/${event.target.dataset.pendUser}/pending`, { method: "POST" });
    await renderAdminUsers();
  }
  if (event.target.dataset.deleteUser) {
    await api(`/api/admin/users/${event.target.dataset.deleteUser}`, { method: "DELETE" });
    await renderAdminUsers();
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

(async function init() {
  setDefaultDates();
  try {
    const { user } = await api("/api/me");
    if (!user) return showLogin();
    if (user.role === "admin") return showAdmin(user);
    return showApp(user);
  } catch {
    showLogin();
  }
})();
