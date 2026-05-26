const legacyStorageKey = "setlog-workout-tracker-v1";
const usersStorageKey = "workout-tracker-users-v1";
const sessionStorageKey = "workout-tracker-active-user-v1";
const defaultAdminEmail = "admin@workout.local";
const defaultAdminPin = "0000";

const seedExercises = [
  { id: crypto.randomUUID(), name: "Bench press", area: "Chest", equipment: "Barbell", notes: "", image: "" },
  { id: crypto.randomUUID(), name: "Squat", area: "Legs", equipment: "Barbell", notes: "", image: "" },
  { id: crypto.randomUUID(), name: "Lat pulldown", area: "Back", equipment: "Cable", notes: "", image: "" },
  { id: crypto.randomUUID(), name: "Shoulder press", area: "Shoulders", equipment: "Dumbbells", notes: "", image: "" },
];

let activeUser = getActiveUser();
let activeAdmin = null;
let storageKey = activeUser ? getUserStorageKey(activeUser.id) : legacyStorageKey;
let state = activeUser ? loadState() : createEmptyState();
let currentWorkout = [];
let calendarDate = new Date();
let selectedDate = toISODate(new Date());
let exerciseImageData = "";
let weightRange = "7";
let barcodeStream = null;
let foodSearchCache = [];

const els = {
  loginScreen: document.querySelector("#loginScreen"),
  appShell: document.querySelector("#appShell"),
  loginForm: document.querySelector("#loginForm"),
  loginEmail: document.querySelector("#loginEmail"),
  loginPin: document.querySelector("#loginPin"),
  createUserForm: document.querySelector("#createUserForm"),
  newUserEmail: document.querySelector("#newUserEmail"),
  newUserPin: document.querySelector("#newUserPin"),
  adminLoginForm: document.querySelector("#adminLoginForm"),
  adminEmail: document.querySelector("#adminEmail"),
  adminPin: document.querySelector("#adminPin"),
  adminScreen: document.querySelector("#adminScreen"),
  adminLogoutBtn: document.querySelector("#adminLogoutBtn"),
  adminUserList: document.querySelector("#adminUserList"),
  changeAdminPinForm: document.querySelector("#changeAdminPinForm"),
  currentAdminPin: document.querySelector("#currentAdminPin"),
  newAdminPin: document.querySelector("#newAdminPin"),
  adminMessage: document.querySelector("#adminMessage"),
  loginMessage: document.querySelector("#loginMessage"),
  logoutBtn: document.querySelector("#logoutBtn"),
  tabs: document.querySelectorAll(".tab-button"),
  views: document.querySelectorAll(".view"),
  workoutForm: document.querySelector("#workoutForm"),
  workoutName: document.querySelector("#workoutName"),
  workoutDate: document.querySelector("#workoutDate"),
  workoutMinutes: document.querySelector("#workoutMinutes"),
  cardioForm: document.querySelector("#cardioForm"),
  cardioType: document.querySelector("#cardioType"),
  cardioDate: document.querySelector("#cardioDate"),
  cardioMinutes: document.querySelector("#cardioMinutes"),
  cardioSeconds: document.querySelector("#cardioSeconds"),
  cardioDistance: document.querySelector("#cardioDistance"),
  cardioDistanceUnit: document.querySelector("#cardioDistanceUnit"),
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
  heightForm: document.querySelector("#heightForm"),
  heightValue: document.querySelector("#heightValue"),
  heightUnit: document.querySelector("#heightUnit"),
  weightStats: document.querySelector("#weightStats"),
  bmiStats: document.querySelector("#bmiStats"),
  weightChart: document.querySelector("#weightChart"),
  weightHistory: document.querySelector("#weightHistory"),
  weightRangeButtons: document.querySelectorAll("[data-weight-range]"),
  bloodPressureForm: document.querySelector("#bloodPressureForm"),
  bpDate: document.querySelector("#bpDate"),
  bpSystolic: document.querySelector("#bpSystolic"),
  bpDiastolic: document.querySelector("#bpDiastolic"),
  bpPulse: document.querySelector("#bpPulse"),
  bpStats: document.querySelector("#bpStats"),
  bpRangeChart: document.querySelector("#bpRangeChart"),
  bpChart: document.querySelector("#bpChart"),
  bpHistory: document.querySelector("#bpHistory"),
  nutritionGoalForm: document.querySelector("#nutritionGoalForm"),
  calorieGoal: document.querySelector("#calorieGoal"),
  targetWeight: document.querySelector("#targetWeight"),
  targetWeeks: document.querySelector("#targetWeeks"),
  calorieGoalHint: document.querySelector("#calorieGoalHint"),
  foodSearchForm: document.querySelector("#foodSearchForm"),
  foodSearchInput: document.querySelector("#foodSearchInput"),
  barcodeInput: document.querySelector("#barcodeInput"),
  barcodeLookupBtn: document.querySelector("#barcodeLookupBtn"),
  scanBarcodeBtn: document.querySelector("#scanBarcodeBtn"),
  barcodeVideo: document.querySelector("#barcodeVideo"),
  foodSearchMessage: document.querySelector("#foodSearchMessage"),
  foodSearchResults: document.querySelector("#foodSearchResults"),
  nutritionDate: document.querySelector("#nutritionDate"),
  nutritionStats: document.querySelector("#nutritionStats"),
  waterForm: document.querySelector("#waterForm"),
  waterAmount: document.querySelector("#waterAmount"),
  waterUnit: document.querySelector("#waterUnit"),
  foodLogList: document.querySelector("#foodLogList"),
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
      cardioWorkouts: Array.isArray(parsed.cardioWorkouts) ? parsed.cardioWorkouts : [],
      bodyWeights: Array.isArray(parsed.bodyWeights) ? parsed.bodyWeights.map(normalizeWeightEntry) : [],
      bloodPressure: Array.isArray(parsed.bloodPressure) ? parsed.bloodPressure : [],
      nutrition: parsed.nutrition || { calorieGoal: "", targetWeight: "", targetWeeks: "", foods: [], water: [] },
      profile: { height: parsed.profile?.height || "", heightUnit: parsed.profile?.heightUnit || "cm" },
    };
  } catch {
    return createEmptyState();
  }
}

function createEmptyState() {
  return { exercises: seedExercises.map((exercise) => ({ ...exercise, id: crypto.randomUUID() })), workouts: [], cardioWorkouts: [], bodyWeights: [], bloodPressure: [], nutrition: { calorieGoal: "", targetWeight: "", targetWeeks: "", foods: [], water: [] }, profile: { height: "", heightUnit: "cm" } };
}

function loadUsers() {
  try {
    const users = JSON.parse(localStorage.getItem(usersStorageKey) || "[]").map(normalizeUser);
    if (!users.some((user) => user.role === "admin")) {
      users.push({
        id: "local-admin",
        email: defaultAdminEmail,
        name: "Admin",
        pin: defaultAdminPin,
        role: "admin",
        status: "approved",
        createdAt: new Date().toISOString(),
      });
      saveUsers(users);
    }
    return users;
  } catch {
    const users = [{
      id: "local-admin",
      email: defaultAdminEmail,
      name: "Admin",
      pin: defaultAdminPin,
      role: "admin",
      status: "approved",
      createdAt: new Date().toISOString(),
    }];
    saveUsers(users);
    return users;
  }
}

function saveUsers(users) {
  localStorage.setItem(usersStorageKey, JSON.stringify(users));
}

function normalizeUser(user) {
  const email = (user.email || user.name || "").trim().toLowerCase();
  return {
    id: user.id || crypto.randomUUID(),
    email,
    name: user.name || email,
    pin: user.pin || "",
    role: user.role || "user",
    status: user.status || "approved",
    createdAt: user.createdAt || new Date().toISOString(),
    approvedAt: user.approvedAt || "",
  };
}

function getUserStorageKey(userId) {
  return `workout-tracker-data-${userId}`;
}

function getActiveUser() {
  const activeUserId = localStorage.getItem(sessionStorageKey);
  if (!activeUserId) return null;
  const user = loadUsers().find((item) => item.id === activeUserId);
  return user?.role === "user" && user.status === "approved" ? user : null;
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
  const totalSeconds = Math.round(Number(minutes || 0) * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const remainingMinutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours) return `${hours}h ${String(remainingMinutes).padStart(2, "0")}m`;
  if (seconds) return `${remainingMinutes}:${String(seconds).padStart(2, "0")}`;
  return `${remainingMinutes}m`;
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function render() {
  if (!activeUser) return;
  els.currentUserName.textContent = activeUser.email;
  renderRepeatWorkoutSelect();
  renderExerciseSelect();
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

function renderLoginUsers() {
  els.loginForm.querySelector("button").disabled = false;
}

function showLoginScreen(message = "") {
  els.loginScreen.classList.remove("is-hidden");
  els.adminScreen.classList.add("is-hidden");
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

function loginUser(email, pin) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = loadUsers().find((item) => item.role === "user" && item.email === normalizedEmail);
  if (!user || user.pin !== pin) {
    showLoginScreen("That email and PIN do not match.");
    return;
  }

  if (user.status !== "approved") {
    showLoginScreen("This account is waiting for admin approval.");
    return;
  }

  setActiveUser(user);
  currentWorkout = [];
  showView("logView");
  showAppScreen();
}

function createUser(email, pin) {
  const users = loadUsers();
  const normalizedEmail = email.trim().toLowerCase();

  if (users.some((user) => user.email === normalizedEmail)) {
    showLoginScreen("That email already exists. Login or choose another email.");
    return;
  }

  const user = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    name: normalizedEmail,
    pin,
    role: "user",
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  saveUsers(users);
  showLoginScreen("Account created. An admin must approve it before login.");
}

function loginAdmin(email, pin) {
  const admin = loadUsers().find((user) => user.role === "admin" && user.email === email.trim().toLowerCase());
  if (!admin || admin.pin !== pin) {
    showLoginScreen("Admin email and PIN do not match.");
    return;
  }

  activeAdmin = admin;
  els.adminMessage.textContent = "";
  els.loginScreen.classList.add("is-hidden");
  els.appShell.classList.add("is-locked");
  els.adminScreen.classList.remove("is-hidden");
  renderAdminUsers();
}

function changeAdminPin(currentPin, newPin) {
  if (!activeAdmin) return;

  const users = loadUsers();
  const admin = users.find((user) => user.id === activeAdmin.id);
  if (!admin || admin.pin !== currentPin) {
    els.adminMessage.textContent = "Current PIN is incorrect.";
    return;
  }

  admin.pin = newPin;
  saveUsers(users);
  activeAdmin = admin;
  els.changeAdminPinForm.reset();
  els.adminMessage.textContent = "Admin PIN updated.";
}

function renderAdminUsers() {
  const users = loadUsers().filter((user) => user.role === "user");
  els.adminUserList.innerHTML = users.length ? "" : '<div class="empty-state">No user accounts yet.</div>';

  users
    .sort((a, b) => a.status.localeCompare(b.status) || a.email.localeCompare(b.email))
    .forEach((user) => {
      const item = document.createElement("article");
      item.className = "admin-user-item";
      item.innerHTML = `
        <div>
          <h3>${escapeHTML(user.email)}</h3>
          <p class="recent-meta">${user.status === "approved" ? "Approved" : "Pending approval"} · Created ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(user.createdAt))}</p>
        </div>
        <div class="admin-actions">
          ${user.status === "pending" ? `<button class="primary-button" type="button" data-approve-user="${user.id}">Approve</button>` : `<button class="secondary-button" type="button" data-pend-user="${user.id}">Set pending</button>`}
          <button class="danger-button" type="button" data-delete-user="${user.id}">Remove</button>
        </div>
      `;
      els.adminUserList.append(item);
    });
}

function updateUserStatus(userId, status) {
  const users = loadUsers();
  const user = users.find((item) => item.id === userId);
  if (!user) return;
  user.status = status;
  user.approvedAt = status === "approved" ? new Date().toISOString() : "";
  saveUsers(users);
  renderAdminUsers();
  renderLoginUsers();
}

function deleteUser(userId) {
  const users = loadUsers().filter((user) => user.id !== userId);
  localStorage.removeItem(getUserStorageKey(userId));
  saveUsers(users);
  renderAdminUsers();
  renderLoginUsers();
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
  const recent = allSessions().slice(0, 6);
  els.recentWorkouts.innerHTML = recent.length ? "" : '<div class="empty-state">Saved workouts will appear here.</div>';

  recent.forEach((session) => {
    els.recentWorkouts.append(createSessionItem(session));
  });
}

function allSessions() {
  return [
    ...state.workouts.map((workout) => ({ ...workout, sessionType: "strength" })),
    ...(state.cardioWorkouts || []).map((cardio) => ({ ...cardio, sessionType: "cardio" })),
  ].sort((a, b) => `${b.date}${b.createdAt || ""}`.localeCompare(`${a.date}${a.createdAt || ""}`));
}

function createSessionItem(session) {
  return session.sessionType === "cardio" ? createCardioItem(session) : createWorkoutItem(session);
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

function createCardioItem(cardio) {
  const item = document.createElement("article");
  item.className = "recent-item";
  item.innerHTML = `
    <div>
      <h3>${escapeHTML(cardio.type)}</h3>
      <p class="recent-meta">${formatDate(cardio.date, { day: "numeric", month: "short", year: "numeric" })} · ${formatMinutes(Number(cardio.minutes || 0))} · ${Number(cardio.distance || 0).toFixed(2)}${cardio.distanceUnit || "km"}</p>
      <ul class="set-summary"><li><strong>Cardio</strong><span>Distance and time workout</span></li></ul>
    </div>
    <button class="danger-button" type="button" data-delete-cardio="${cardio.id}">Delete</button>
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
    const workouts = allSessions().filter((session) => session.date === iso);

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
  const workouts = allSessions().filter((session) => session.date === selectedDate);
  els.selectedDateTitle.textContent = formatDate(selectedDate, { weekday: "short", day: "numeric", month: "short" });
  els.selectedDayWorkouts.innerHTML = workouts.length ? "" : '<div class="empty-state">No workouts on this date.</div>';

  workouts.forEach((session) => {
    els.selectedDayWorkouts.append(createSessionItem(session));
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
  return allSessions().reduce(
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
  if (!minutes) return "No change";
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
  renderBmiStats();
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

function getCurrentBmiWeight() {
  if (els.weightValue.value) {
    return { weight: Number(els.weightValue.value), unit: els.weightUnit.value };
  }
  const latest = state.bodyWeights.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
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
    els.bmiStats.innerHTML = `
      <div class="weight-stat"><span>--</span><small>BMI</small></div>
      <div class="weight-stat"><span>--</span><small>Height</small></div>
      <div class="weight-stat"><span>--</span><small>Using weight</small></div>
    `;
    return;
  }

  const bmi = weightToKg(weightEntry.weight, weightEntry.unit) / heightToMetres(height, heightUnit) ** 2;
  els.bmiStats.innerHTML = `
    <div class="weight-stat"><span>${bmi.toFixed(1)}</span><small>BMI</small></div>
    <div class="weight-stat"><span>${height}${heightUnit}</span><small>Height</small></div>
    <div class="weight-stat"><span>${bmiCategory(bmi)}</span><small>Range</small></div>
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
  const entries = (state.bloodPressure || []).slice().sort((a, b) => a.date.localeCompare(b.date));
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
    ["crisis", "Crisis", ">180 / >120"],
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
    item.innerHTML = `<div><h3>${entry.systolic}/${entry.diastolic}</h3><p class="recent-meta">${formatDate(entry.date, { day: "numeric", month: "short", year: "numeric" })} · Pulse ${entry.pulse} · ${range.label}</p></div><button class="danger-button" type="button" data-delete-bp="${entry.id}">Delete</button>`;
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
    fat100: Number(nutriments.fat_100g ?? nutriments.fat_serving ?? 0),
  };
}

async function searchFood(term) {
  if (!term.trim()) return;
  els.foodSearchMessage.textContent = "Searching food database...";
  const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(term)}&search_simple=1&action=process&json=1&page_size=8&fields=code,product_name,generic_name,brands,nutriments`);
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
    fat: food.fat100 * multiplier,
  });
  saveState();
  renderNutrition();
}

function renderCalorieGoalHint() {
  const latest = state.bodyWeights.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
  const target = Number(els.targetWeight.value || state.nutrition?.targetWeight || 0);
  const weeks = Number(els.targetWeeks.value || state.nutrition?.targetWeeks || 0);
  if (!latest || !target || !weeks) {
    els.calorieGoalHint.textContent = "Set a calorie goal manually, or enter target weight and weeks for a simple estimate.";
    return;
  }
  const latestKg = latest.unit === "lb" ? latest.weight * 0.45359237 : latest.weight;
  const dailyChange = ((target - latestKg) * 7700) / (weeks * 7);
  const base = Number(els.calorieGoal.value || state.nutrition?.calorieGoal || 2200);
  els.calorieGoalHint.textContent = `Simple estimate: about ${Math.round(base + dailyChange)} kcal/day from a ${Math.round(dailyChange)} kcal daily adjustment.`;
}

function renderNutrition() {
  state.nutrition ||= { calorieGoal: "", targetWeight: "", targetWeeks: "", foods: [], water: [] };
  state.nutrition.foods ||= [];
  state.nutrition.water ||= [];
  renderCalorieGoalHint();
  const date = els.nutritionDate.value || toISODate(new Date());
  const foods = state.nutrition.foods.filter((item) => item.date === date);
  const water = state.nutrition.water.filter((item) => item.date === date);
  const totals = foods.reduce((sum, food) => {
    sum.calories += Number(food.calories || 0);
    sum.protein += Number(food.protein || 0);
    sum.carbs += Number(food.carbs || 0);
    sum.fat += Number(food.fat || 0);
    return sum;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
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

function getCardioMinutes() {
  const minutes = Number(els.cardioMinutes.value || 0);
  const seconds = Math.min(59, Math.max(0, Number(els.cardioSeconds.value || 0)));
  return minutes + seconds / 60;
}

function setDefaultWorkoutValues() {
  els.workoutDate.value = toISODate(new Date());
  els.cardioDate.value = toISODate(new Date());
  els.bpDate.value = toISODate(new Date());
  els.nutritionDate.value = toISODate(new Date());
  els.workoutName.value = "Workout";
  els.workoutMinutes.value = 45;
  els.cardioMinutes.value = 30;
  els.weightDate.value = toISODate(new Date());
  els.heightValue.value = state.profile?.height || "";
  els.heightUnit.value = state.profile?.heightUnit || "cm";
  els.calorieGoal.value = state.nutrition?.calorieGoal || "";
  els.targetWeight.value = state.nutrition?.targetWeight || "";
  els.targetWeeks.value = state.nutrition?.targetWeeks || "";
  renderCalorieGoalHint();
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
  loginUser(els.loginEmail.value, els.loginPin.value);
  els.loginPin.value = "";
});

els.createUserForm.addEventListener("submit", (event) => {
  event.preventDefault();
  createUser(els.newUserEmail.value, els.newUserPin.value);
  els.createUserForm.reset();
});

els.adminLoginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loginAdmin(els.adminEmail.value, els.adminPin.value);
  els.adminLoginForm.reset();
});

els.adminLogoutBtn.addEventListener("click", () => {
  activeAdmin = null;
  showLoginScreen("Admin logged out.");
});

els.changeAdminPinForm.addEventListener("submit", (event) => {
  event.preventDefault();
  changeAdminPin(els.currentAdminPin.value, els.newAdminPin.value);
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

els.cardioForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.cardioWorkouts ||= [];
  state.cardioWorkouts.push({
    id: crypto.randomUUID(),
    type: els.cardioType.value,
    date: els.cardioDate.value,
    minutes: getCardioMinutes(),
    distance: Number(els.cardioDistance.value),
    distanceUnit: els.cardioDistanceUnit.value,
    createdAt: new Date().toISOString(),
  });
  selectedDate = els.cardioDate.value;
  calendarDate = new Date(`${selectedDate}T12:00:00`);
  els.cardioDistance.value = "";
  els.cardioSeconds.value = "";
  saveState();
  render();
  showView("calendarView");
});

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

els.bloodPressureForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.bloodPressure ||= [];
  state.bloodPressure.push({
    id: crypto.randomUUID(),
    date: els.bpDate.value,
    systolic: Number(els.bpSystolic.value),
    diastolic: Number(els.bpDiastolic.value),
    pulse: Number(els.bpPulse.value),
    createdAt: new Date().toISOString(),
  });
  els.bpSystolic.value = "";
  els.bpDiastolic.value = "";
  els.bpPulse.value = "";
  saveState();
  renderBloodPressure();
});

els.nutritionGoalForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.nutrition ||= { foods: [], water: [] };
  state.nutrition.calorieGoal = els.calorieGoal.value ? Number(els.calorieGoal.value) : "";
  state.nutrition.targetWeight = els.targetWeight.value ? Number(els.targetWeight.value) : "";
  state.nutrition.targetWeeks = els.targetWeeks.value ? Number(els.targetWeeks.value) : "";
  saveState();
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

els.scanBarcodeBtn.addEventListener("click", () => {
  els.foodSearchMessage.textContent = "Barcode scanning is available on the hosted HTTPS app. Enter barcode manually here.";
});

els.nutritionDate.addEventListener("change", renderNutrition);
els.calorieGoal.addEventListener("input", renderCalorieGoalHint);
els.targetWeight.addEventListener("input", renderCalorieGoalHint);
els.targetWeeks.addEventListener("input", renderCalorieGoalHint);

els.waterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const amount = Number(els.waterAmount.value || 0);
  if (!amount) return;
  const amountMl = els.waterUnit.value === "oz" ? Math.round(amount * 29.5735) : amount;
  state.nutrition.water.push({ id: crypto.randomUUID(), date: els.nutritionDate.value, amountMl, createdAt: new Date().toISOString() });
  els.waterAmount.value = "";
  saveState();
  renderNutrition();
});

els.heightForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.profile ||= {};
  state.profile.height = els.heightValue.value ? Number(els.heightValue.value) : "";
  state.profile.heightUnit = els.heightUnit.value;
  saveState();
  renderBmiStats();
});

els.weightValue.addEventListener("input", renderBmiStats);
els.weightUnit.addEventListener("change", () => {
  renderWeightLogger();
  renderBmiStats();
});
els.heightValue.addEventListener("input", renderBmiStats);
els.heightUnit.addEventListener("change", renderBmiStats);

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
  const cardioId = event.target.dataset.deleteCardio;
  const bpId = event.target.dataset.deleteBp;
  const foodId = event.target.dataset.deleteFood;
  const clearImageId = event.target.dataset.clearImage;
  const weightId = event.target.dataset.deleteWeight;
  const approveUserId = event.target.dataset.approveUser;
  const pendUserId = event.target.dataset.pendUser;
  const deleteUserId = event.target.dataset.deleteUser;
  const date = event.target.closest(".calendar-day")?.dataset.date;

  if (approveUserId) {
    updateUserStatus(approveUserId, "approved");
  }

  if (pendUserId) {
    updateUserStatus(pendUserId, "pending");
  }

  if (deleteUserId) {
    deleteUser(deleteUserId);
  }

  if (event.target.dataset.addFood) addFood(event.target.dataset.addFood);

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

  if (cardioId) {
    state.cardioWorkouts = state.cardioWorkouts.filter((cardio) => cardio.id !== cardioId);
    saveState();
    render();
  }

  if (weightId) {
    state.bodyWeights = state.bodyWeights.filter((entry) => entry.id !== weightId);
    saveState();
    renderWeightLogger();
  }

  if (bpId) {
    state.bloodPressure = state.bloodPressure.filter((entry) => entry.id !== bpId);
    saveState();
    renderBloodPressure();
  }

  if (foodId) {
    state.nutrition.foods = state.nutrition.foods.filter((entry) => entry.id !== foodId);
    saveState();
    renderNutrition();
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
