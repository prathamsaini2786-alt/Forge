/* =========================================================
   FORGE — app.js
   Workout / Calorie / Weight tracker with local (client-side
   only) accounts. No server — everything lives in localStorage,
   scoped per username. This is demo-grade auth, not real
   security: don't reuse a real password here.
   ========================================================= */

(() => {
  "use strict";

  /* ---------------------------------------------------------
     Storage helpers
     --------------------------------------------------------- */
  const GLOBAL_KEYS = {
    users: "forge_users",           // { username: { passwordHash, createdAt } }
    session: "forge_session",       // { username }
  };

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) {
        console.error("Storage read failed for", key, e);
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        console.error("Storage write failed for", key, e);
        showToast("Storage full or unavailable — entry may not be saved.");
        return false;
      }
    },
  };

  let currentUser = null;
  const userKey = (name) => `forge_${currentUser}_${name}`;

  const getMeals = () => store.get(userKey("meals"), []);
  const getWorkouts = () => store.get(userKey("workouts"), []);
  const getWeightLogs = () => store.get(userKey("weightLogs"), []);
  const getGoals = () =>
    store.get(userKey("goals"), {
      dailyCalorieTarget: 2000,
      weightTarget: null,
      weeklyWorkoutTarget: 4,
      streakMilestone: 7,
    });

  const getProfile = () =>
    store.get(userKey("profile"), {
      displayName: "",
      age: null,
      gender: "",
      heightCm: null,
      activityLevel: "moderate",
    });
  const getWaterLogs = () => store.get(userKey("waterLogs"), []);
  const getSleepLogs = () => store.get(userKey("sleepLogs"), []);

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ---------------------------------------------------------
     Password hashing (SHA-256 via Web Crypto).
     Client-side hashing is still not real account security —
     there's no server to keep the hash function or salt secret
     from someone poking at this code — but it beats storing
     plaintext passwords in localStorage.
     --------------------------------------------------------- */
  function fallbackHash(s) {
    let h1 = 0xdeadbeef ^ s.length, h2 = 0x41c6ce57 ^ s.length;
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return "f:" + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  }
  async function hashPassword(password, forceFallback) {
    try {
      if (!forceFallback && window.crypto && crypto.subtle) {
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
        return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
      }
    } catch (e) { console.warn("Web Crypto unavailable, using fallback hash", e); }
    return fallbackHash(password);
  }

  /* ---------------------------------------------------------
     Auth
     --------------------------------------------------------- */
  function getUsers() {
    return store.get(GLOBAL_KEYS.users, {});
  }

  async function signup(username, password) {
    username = username.trim();
    const users = getUsers();
    if (!username || username.length < 3) return { ok: false, error: "Username must be at least 3 characters." };
    if (users[username]) return { ok: false, error: "That username is already taken." };
    if (!password || password.length < 4) return { ok: false, error: "Password must be at least 4 characters." };

    const passwordHash = await hashPassword(password);
    users[username] = { passwordHash, createdAt: Date.now() };
    const saved = store.set(GLOBAL_KEYS.users, users);
    if (!saved || !getUsers()[username]) {
      return { ok: false, error: "Could not save the account in this browser." };
    }
    return { ok: true };
  }

  async function login(username, password) {
    username = username.trim();
    const users = getUsers();
    const user = users[username];
    if (!user) return { ok: false, error: "No account with that username." };
    const passwordHash = await hashPassword(password, String(user.passwordHash).startsWith("f:"));
    if (passwordHash !== user.passwordHash) return { ok: false, error: "Incorrect password." };
    return { ok: true };
  }

  function startSession(username, isNew) {
    currentUser = username;
    store.set(GLOBAL_KEYS.session, { username });
    showApp(isNew);
  }

  function logout() {
    currentUser = null;
    localStorage.removeItem(GLOBAL_KEYS.session);
    document.getElementById("appRoot").style.display = "none";
    document.getElementById("authScreen").style.display = "flex";
    document.getElementById("onboard").style.display = "none";
    document.getElementById("loginForm").reset();
    document.getElementById("signupForm").reset();
  }

  function showApp(isNew) {
    document.getElementById("authScreen").style.display = "none";
    document.getElementById("appRoot").style.display = "flex";
    document.getElementById("dashGreeting").textContent = isNew ? `Welcome, ${currentUser}` : `Welcome back, ${currentUser}`;
    syncDietUI();
    navigateTo("dashboard");
    try { renderAll(); } catch (e) { console.error(e); }
    if (isNew || !getProfile().onboarded) openOnboarding();
  }

  function initAuth() {
    const tabs = document.querySelectorAll(".auth-tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        document.querySelectorAll(".auth-form").forEach((f) => f.classList.remove("active"));
        document.getElementById(tab.dataset.tab + "Form").classList.add("active");
      });
    });

    document.getElementById("loginForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const errEl = document.getElementById("loginError");
      errEl.textContent = "";
      const username = document.getElementById("loginUsername").value;
      const password = document.getElementById("loginPassword").value;
      let result;
      try { result = await login(username, password); } catch (err) { console.error(err); result = { ok: false, error: "Something went wrong. Check the browser console." }; }
      if (!result.ok) {
        errEl.textContent = result.error;
        return;
      }
      startSession(username.trim());
    });

    document.getElementById("signupForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const errEl = document.getElementById("signupError");
      errEl.textContent = "";
      const username = document.getElementById("signupUsername").value;
      const password = document.getElementById("signupPassword").value;
      const confirm = document.getElementById("signupPasswordConfirm").value;
      if (password !== confirm) {
        errEl.textContent = "Passwords don't match.";
        return;
      }
      let result;
      try { result = await signup(username, password); } catch (err) { console.error(err); result = { ok: false, error: "Something went wrong. Check the browser console." }; }
      if (!result.ok) {
        errEl.textContent = result.error;
        return;
      }
      startSession(username.trim(), true);
      showToast(`Welcome, ${username.trim()} 👋`);
    });

    document.getElementById("logoutBtn").addEventListener("click", () => {
      logout();
      showToast("Logged out");
    });
  }

  function initPasswordToggles() {
    document.querySelectorAll(".password-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const input = document.getElementById(btn.dataset.toggleFor);
        if (!input) return;
        const showing = input.type === "text";
        input.type = showing ? "password" : "text";
        btn.setAttribute("aria-pressed", String(!showing));
        btn.setAttribute("aria-label", showing ? "Show password" : "Hide password");
        btn.classList.toggle("active", !showing);
      });
    });
  }

  function tryRestoreSession() {
    const session = store.get(GLOBAL_KEYS.session, null);
    if (session && session.username && getUsers()[session.username]) {
      currentUser = session.username;
      showApp();
    }
  }

  /* ---------------------------------------------------------
     Motivational fitness quotes — one is featured per day
     --------------------------------------------------------- */
  const FITNESS_QUOTES = [
    { text: "The pain you feel today will be the strength you feel tomorrow.", author: "Arnold Schwarzenegger" },
    { text: "Strength does not come from winning. Your struggles develop your strengths.", author: "Arnold Schwarzenegger" },
    { text: "The last three or four reps is what makes the muscle grow.", author: "Arnold Schwarzenegger" },
    { text: "It isn't the mountains ahead to climb that wear you out; it's the pebble in your shoe.", author: "Muhammad Ali" },
    { text: "Don't quit. Suffer now and live the rest of your life as a champion.", author: "Muhammad Ali" },
    { text: "It's not whether you get knocked down, it's whether you get up.", author: "Vince Lombardi" },
    { text: "Do not let what you cannot do interfere with what you can do.", author: "John Wooden" },
    { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
    { text: "I fear not the man who has practiced 10,000 kicks once, but the man who has practiced one kick 10,000 times.", author: "Bruce Lee" },
    { text: "I've failed over and over and over again in my life. And that is why I succeed.", author: "Michael Jordan" },
    { text: "A champion is defined not by their wins but by how they can recover when they fall.", author: "Serena Williams" },
    { text: "It's hard to beat a person who never gives up.", author: "Babe Ruth" },
    { text: "The most important thing is to try and inspire people so that they can be great in whatever they want to do.", author: "Kobe Bryant" },
    { text: "Fear is not an option.", author: "Usain Bolt" },
    { text: "I don't focus on what I'm up against. I focus on my goals and I try to ignore the rest.", author: "Venus Williams" },
    { text: "Success isn't always about greatness. It's about consistency. Consistent hard work leads to success.", author: "Dwayne Johnson" },
    { text: "Today I will do what others won't, so tomorrow I can accomplish what others can't.", author: "Jerry Rice" },
    { text: "Physical fitness is not only one of the most important keys to a healthy body, it is the basis of dynamic and creative intellectual activity.", author: "John F. Kennedy" },
  ];
  function dayOfYear(d) {
    const start = new Date(d.getFullYear(), 0, 0);
    return Math.floor((d - start) / 86400000);
  }
  function quoteOfTheDay() {
    const idx = dayOfYear(new Date()) % FITNESS_QUOTES.length;
    return FITNESS_QUOTES[idx];
  }

  /* ---------------------------------------------------------
     Date helpers
     --------------------------------------------------------- */
  const todayStr = () => new Date().toISOString().slice(0, 10);
  const daysAgoStr = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };
  const fmtLongDate = () => new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const fmtShortDate = (dateStr) => new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });

  /* ---------------------------------------------------------
     Toast (supports an optional Undo-style action button)
     --------------------------------------------------------- */
  let toastTimer = null;
  function showToast(msg, opts) {
    const el = document.getElementById("toast");
    const msgEl = document.getElementById("toastMsg");
    const actionEl = document.getElementById("toastAction");
    msgEl.textContent = msg;

    if (opts && opts.actionLabel && opts.onAction) {
      actionEl.textContent = opts.actionLabel;
      actionEl.style.display = "";
      actionEl.onclick = () => {
        opts.onAction();
        el.classList.remove("show");
        clearTimeout(toastTimer);
      };
    } else {
      actionEl.style.display = "none";
      actionEl.onclick = null;
    }

    el.classList.add("show");
    clearTimeout(toastTimer);
    const duration = opts && opts.duration ? opts.duration : (opts && opts.actionLabel ? 4500 : 2600);
    toastTimer = setTimeout(() => el.classList.remove("show"), duration);
  }

  /* ---------------------------------------------------------
     Generic delete-with-undo helper.
     Removes the item from storage immediately (so counts/streaks/
     achievements stay accurate), but keeps a copy around so the
     user can put it back if the delete was a mis-tap.
     --------------------------------------------------------- */
  function deleteWithUndo({ storageKey, items, id, label, renderFn }) {
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) return;
    const [removed] = items.splice(index, 1);
    store.set(storageKey, items);
    renderFn();
    showToast(`${label} removed`, {
      actionLabel: "Undo",
      onAction: () => {
        const current = store.get(storageKey, []);
        current.splice(Math.min(index, current.length), 0, removed);
        store.set(storageKey, current);
        renderFn();
        checkAchievements();
        showToast(`${label} restored`);
      },
    });
    checkAchievements();
  }

  /* ---------------------------------------------------------
     Navigation
     --------------------------------------------------------- */
  function navigateTo(view) {
    document.querySelectorAll(".nav-item").forEach((i) => i.classList.toggle("active", i.dataset.view === view));
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    const target = document.getElementById("view-" + view);
    if (!target) return;
    target.classList.add("active");
    if (view === "dashboard") renderDashboard();
    if (view === "meals") renderMeals();
    if (view === "workouts") renderWorkouts();
    if (view === "weight") renderWeight();
    if (view === "goals") renderGoals();
    if (view === "achievements") renderAchievements();
    if (view === "settings") renderSettings();
    window.scrollTo(0, 0);
  }

  function initNav() {
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.addEventListener("click", () => navigateTo(item.dataset.view));
    });
    const brandHome = document.getElementById("brandHome");
    if (brandHome) brandHome.addEventListener("click", () => navigateTo("dashboard"));
  }

  function renderAll() {
    renderDashboard();
    renderMeals();
    renderWorkouts();
    renderWeight();
    renderGoals();
    renderAchievements();
    checkAchievements();
  }

  /* ---------------------------------------------------------
     Modals — with basic focus trapping for keyboard/SR users
     --------------------------------------------------------- */
  let lastFocusedBeforeModal = null;
  const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function openModal(id) {
    const backdrop = document.getElementById(id);
    lastFocusedBeforeModal = document.activeElement;
    backdrop.classList.add("open");
    const focusables = backdrop.querySelectorAll(FOCUSABLE_SELECTOR);
    if (focusables.length) focusables[0].focus();
  }
  function closeModal(id) {
    document.getElementById(id).classList.remove("open");
    if (lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === "function") {
      lastFocusedBeforeModal.focus();
    }
    lastFocusedBeforeModal = null;
  }
  function trapModalTab(e) {
    if (e.key !== "Tab") return;
    const openBackdrop = document.querySelector(".modal-backdrop.open");
    if (!openBackdrop) return;
    const focusables = Array.from(openBackdrop.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }
  function initModals() {
    document.getElementById("openMealModal").addEventListener("click", () => openModal("mealModal"));
    document.getElementById("openWorkoutModal").addEventListener("click", () => openModal("workoutModal"));
    document.getElementById("openWeightModal").addEventListener("click", () => openModal("weightModal"));
    document.querySelectorAll("[data-close-modal]").forEach((btn) => {
      btn.addEventListener("click", () => closeModal(btn.closest(".modal-backdrop").id));
    });
    document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
      backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeModal(backdrop.id); });
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const openBackdrop = document.querySelector(".modal-backdrop.open");
        if (openBackdrop) closeModal(openBackdrop.id);
      }
      trapModalTab(e);
    });
  }

  /* ---------------------------------------------------------
     Streak calculation
     --------------------------------------------------------- */
  function computeStreak() {
    const loggedDates = new Set([...getMeals().map((m) => m.date), ...getWorkouts().map((w) => w.date)]);
    if (loggedDates.size === 0) return 0;
    let streak = 0;
    let cursor = loggedDates.has(todayStr()) ? 0 : 1;
    while (loggedDates.has(daysAgoStr(cursor))) { streak++; cursor++; }
    return streak;
  }

  /* ---------------------------------------------------------
     Streak popover — click the sidebar streak pill to see
     the last 7 days at a glance and progress to the next badge.
     --------------------------------------------------------- */
  function renderStreakPopover() {
    const loggedDates = new Set([...getMeals().map((m) => m.date), ...getWorkouts().map((w) => w.date)]);
    const streak = computeStreak();
    const goals = getGoals();
    const milestone = Number(goals.streakMilestone) || 7;

    document.getElementById("sidebarStreakCount").textContent = streak;
    document.getElementById("streakPopoverCount").textContent = streak;

    const dayLetters = ["S", "M", "T", "W", "T", "F", "S"];
    const daysHtml = [];
    for (let i = 6; i >= 0; i--) {
      const d = daysAgoStr(i);
      const hit = loggedDates.has(d);
      const isToday = i === 0;
      const dow = new Date(d + "T00:00:00").getDay();
      daysHtml.push(
        `<div class="streak-day ${hit ? "hit" : ""} ${isToday ? "today" : ""}">
          <span class="streak-day-dot">${hit ? "✓" : ""}</span>
          <span class="streak-day-label">${dayLetters[dow]}</span>
        </div>`
      );
    }
    document.getElementById("streakDays").innerHTML = daysHtml.join("");

    const pct = Math.max(0, Math.min(1, streak / milestone));
    document.getElementById("streakPopoverFill").style.width = Math.round(pct * 100) + "%";
    const caption = document.getElementById("streakPopoverCaption");
    if (streak >= milestone) {
      caption.textContent = `Milestone reached — ${streak} / ${milestone} days!`;
    } else if (streak === 0) {
      caption.textContent = "Log a meal or workout to start a streak.";
    } else {
      caption.textContent = `${milestone - streak} more day${milestone - streak === 1 ? "" : "s"} to your ${milestone}-day badge.`;
    }
  }

  function initStreakPopover() {
    const pill = document.getElementById("sidebarStreak");
    const popover = document.getElementById("streakPopover");
    if (!pill || !popover) return;
    pill.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = !popover.classList.contains("open");
      if (willOpen) renderStreakPopover();
      popover.classList.toggle("open", willOpen);
      pill.setAttribute("aria-expanded", String(willOpen));
    });
    document.addEventListener("click", (e) => {
      if (popover.classList.contains("open") && !popover.contains(e.target) && e.target !== pill) {
        popover.classList.remove("open");
        pill.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && popover.classList.contains("open")) {
        popover.classList.remove("open");
        pill.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------------------------------------------------------
     Workout calorie estimate (MET-based)
     --------------------------------------------------------- */
  const MET_VALUES = {
    running: 9.8, cycling: 7.5, weight_training: 5.0, swimming: 8.0,
    yoga: 2.5, hiit: 8.0, walking: 3.5, sports: 7.0,
  };

  function currentWeightKg() {
    const logs = getWeightLogs();
    return logs.length ? logs[logs.length - 1].weight : 70;
  }

  function estimateCalories(type, durationMin) {
    const met = MET_VALUES[type] || 6.0;
    return Math.round(met * currentWeightKg() * (durationMin / 60));
  }
  function estimateCaloriesForMet(met, durationMin) {
    return Math.round(met * currentWeightKg() * (durationMin / 60));
  }

  /* ---------------------------------------------------------
     BMI helpers
     --------------------------------------------------------- */
  function computeBmi(weightKg, heightCm) {
    if (!weightKg || !heightCm) return null;
    const m = heightCm / 100;
    return weightKg / (m * m);
  }
  function bmiCategory(bmi) {
    if (bmi == null) return null;
    if (bmi < 18.5) return { label: "Underweight", cssClass: "bmi-zone-under" };
    if (bmi < 25) return { label: "Normal", cssClass: "bmi-zone-normal" };
    if (bmi < 30) return { label: "Overweight", cssClass: "bmi-zone-over" };
    return { label: "Obese", cssClass: "bmi-zone-obese" };
  }

  /* ---------------------------------------------------------
     Water & sleep targets — curated from bodyweight, activity
     level and age (falls back to sane adult defaults when the
     profile hasn't been filled in yet).
     --------------------------------------------------------- */
  const ACTIVITY_WATER_MULTIPLIER = {
    sedentary: 1.0, light: 1.05, moderate: 1.1, active: 1.2, very_active: 1.3,
  };
  function waterTargetMl() {
    const profile = getProfile();
    const weight = currentWeightKg();
    const mult = ACTIVITY_WATER_MULTIPLIER[profile.activityLevel] || 1.1;
    const raw = weight * 35 * mult;
    return Math.round(raw / 50) * 50;
  }
  function sleepTargetHours() {
    const profile = getProfile();
    let target = 8;
    const age = Number(profile.age) || null;
    if (age) {
      if (age < 18) target = 9;
      else if (age < 26) target = 8;
      else if (age < 65) target = 8;
      else target = 7.5;
    }
    if (profile.activityLevel === "very_active") target += 0.5;
    return Math.round(target * 4) / 4;
  }
  function todayWaterMl() {
    return getWaterLogs().filter((w) => w.date === todayStr()).reduce((s, w) => s + Number(w.ml || 0), 0);
  }
  function todaySleepEntry() {
    const logs = getSleepLogs().filter((s) => s.date === todayStr());
    return logs.length ? logs[logs.length - 1] : null;
  }

  /* ---------------------------------------------------------
     DASHBOARD
     --------------------------------------------------------- */
  let weeklyChart = null;
  let weightTrendChart = null;
  let macroRingChart = null;

  function renderDashboard() {
    document.getElementById("dashDate").textContent = fmtLongDate();

    const goals = getGoals();
    const today = todayStr();
    const yesterday = daysAgoStr(1);
    const meals = getMeals().filter((m) => m.date === today);
    const workouts = getWorkouts().filter((w) => w.date === today);
    const mealsYesterday = getMeals().filter((m) => m.date === yesterday);
    const workoutsYesterday = getWorkouts().filter((w) => w.date === yesterday);
    const weightLogs = getWeightLogs();

    const caloriesIn = meals.reduce((s, m) => s + Number(m.calories || 0), 0);
    const caloriesBurned = workouts.reduce((s, w) => s + Number(w.calories || 0), 0);
    const net = caloriesIn - caloriesBurned;
    const goal = Number(goals.dailyCalorieTarget) || 2000;
    const pct = Math.max(0, Math.min(1, caloriesIn / goal));

    const caloriesBurnedYesterday = workoutsYesterday.reduce((s, w) => s + Number(w.calories || 0), 0);
    const netYesterday = mealsYesterday.reduce((s, m) => s + Number(m.calories || 0), 0) - caloriesBurnedYesterday;

    animateCount(document.getElementById("caloriesInVal"), caloriesIn);
    document.getElementById("calorieGoalVal").textContent = goal;
    animateCount(document.getElementById("caloriesBurnedVal"), caloriesBurned);
    animateCount(document.getElementById("netCaloriesVal"), net);
    animateCount(document.getElementById("powerValue"), Math.round(pct * 100));
    document.getElementById("currentWeightVal").textContent = weightLogs.length ? weightLogs[weightLogs.length - 1].weight : "—";

    setTrendDelta("caloriesBurnedDelta", caloriesBurned, caloriesBurnedYesterday, "vs yesterday");
    setTrendDelta("netCaloriesDelta", net, netYesterday, "vs yesterday", { lowerIsBetter: true });
    if (weightLogs.length >= 2) {
      const prevWeight = weightLogs[weightLogs.length - 2].weight;
      setTrendDelta("currentWeightDelta", weightLogs[weightLogs.length - 1].weight, prevWeight, "vs last log", { decimals: 1, lowerIsBetter: true });
    } else {
      document.getElementById("currentWeightDelta").textContent = "";
    }

    const fill = document.getElementById("powerMeterFill");
    fill.style.width = Math.round(pct * 100) + "%";
    document.getElementById("powerMeterTrack").setAttribute("aria-valuenow", Math.round(pct * 100));
    if (pct >= 1) {
      fill.classList.add("milestone");
      setTimeout(() => fill.classList.remove("milestone"), 1000);
    }

    renderWeeklyCalorieChart();
    renderWeightTrendChart("weightTrendChart");
    document.getElementById("sidebarStreakCount").textContent = computeStreak();
    renderQuoteOfTheDay();
    renderPlanCard();
  }

  function renderQuoteOfTheDay() {
    const q = quoteOfTheDay();
    const textEl = document.getElementById("quoteText");
    const authorEl = document.getElementById("quoteAuthor");
    if (!textEl || !authorEl) return;
    textEl.textContent = q.text;
    authorEl.textContent = `— ${q.author}`;
  }

  /* Small trend indicator (▲/▼ vs a prior value) shown under a stat card value. */
  function setTrendDelta(elId, current, prior, caption, opts = {}) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (prior === 0 && current === 0) { el.textContent = ""; el.className = "stat-delta flat"; return; }
    const diff = current - prior;
    const decimals = opts.decimals || 0;
    const rounded = Math.abs(diff).toFixed(decimals);
    if (Math.abs(diff) < (decimals ? 0.05 : 1)) {
      el.textContent = `— ${caption}`;
      el.className = "stat-delta flat";
      return;
    }
    const isIncrease = diff > 0;
    const isGood = opts.lowerIsBetter ? !isIncrease : isIncrease;
    el.textContent = `${isIncrease ? "▲" : "▼"} ${rounded} ${caption}`;
    el.className = "stat-delta " + (isGood ? "up" : "down");
  }

  function renderWeeklyCalorieChart() {
    const ctx = document.getElementById("weeklyCalorieChart");
    if (typeof Chart === "undefined") return;
    ctx.closest(".chart-card")?.classList.add("chart-ready");
    const meals = getMeals();
    const workouts = getWorkouts();
    const labels = [], inData = [], outData = [];
    for (let i = 6; i >= 0; i--) {
      const d = daysAgoStr(i);
      labels.push(fmtShortDate(d));
      inData.push(meals.filter((m) => m.date === d).reduce((s, m) => s + Number(m.calories || 0), 0));
      outData.push(workouts.filter((w) => w.date === d).reduce((s, w) => s + Number(w.calories || 0), 0));
    }
    if (weeklyChart) weeklyChart.destroy();
    weeklyChart = new Chart(ctx, {
      type: "bar",
      data: { labels, datasets: [
        { label: "In", data: inData, backgroundColor: cssVar("--primary"), borderRadius: 4 },
        { label: "Out", data: outData, backgroundColor: cssVar("--charge"), borderRadius: 4 },
      ]},
      options: chartBaseOptions(),
    });
  }

  function renderWeightTrendChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (typeof Chart === "undefined") return;
    ctx.closest(".chart-card")?.classList.add("chart-ready");
    const logs = [...getWeightLogs()].sort((a, b) => a.date.localeCompare(b.date));
    const labels = logs.map((l) => fmtShortDate(l.date));
    const data = logs.map((l) => l.weight);
    const chartRef = canvasId === "weightTrendChart" ? "weightTrendChart" : "weightPageChart";
    if (chartRef === "weightTrendChart" && weightTrendChart) weightTrendChart.destroy();
    if (chartRef === "weightPageChart" && window.__weightPageChart) window.__weightPageChart.destroy();

    const chart = new Chart(ctx, {
      type: "line",
      data: { labels: labels.length ? labels : ["No data"], datasets: [{
        label: "Weight (kg)", data: data.length ? data : [0],
        borderColor: cssVar("--primary"), backgroundColor: cssVar("--primary") + "22",
        tension: 0.35, fill: true, pointBackgroundColor: cssVar("--primary"), pointRadius: 3,
      }]},
      options: chartBaseOptions(),
    });
    if (chartRef === "weightTrendChart") weightTrendChart = chart;
    else window.__weightPageChart = chart;
  }

  function chartBaseOptions() {
    return {
      responsive: true, maintainAspectRatio: false, resizeDelay: 100,
      animation: { duration: 300 },
      plugins: { legend: { labels: { color: cssVar("--text-muted"), font: { family: "Manrope", size: 11 } } } },
      scales: {
        x: { ticks: { color: cssVar("--text-faint"), font: { size: 10 } }, grid: { color: cssVar("--border") } },
        y: { ticks: { color: cssVar("--text-faint"), font: { size: 10 } }, grid: { color: cssVar("--border") }, beginAtZero: true },
      },
    };
  }

  /* ---------------------------------------------------------
     MEALS + nutrition summary (MFP-style remaining/ring)
     --------------------------------------------------------- */
  function renderMeals() {
    const today = todayStr();
    const meals = getMeals().filter((m) => m.date === today).sort((a, b) => b.createdAt - a.createdAt);
    const workoutsToday = getWorkouts().filter((w) => w.date === today);
    const goals = getGoals();

    const listEl = document.getElementById("mealList");
    if (!meals.length) {
      listEl.innerHTML = '<p class="empty-state">No meals logged today. Tap a food above to add it instantly.</p>';
    } else {
      listEl.innerHTML = meals.map((m) => `
        <div class="entry-row">
          <div class="entry-main">
            <span class="entry-title">${escapeHtml(m.name)}</span>
            <span class="entry-meta">P ${m.protein}g · C ${m.carbs}g · F ${m.fats}g</span>
          </div>
          <span class="entry-value">${m.calories} kcal</span>
          <button class="entry-delete" data-id="${m.id}" aria-label="Delete meal">✕</button>
        </div>`).join("");
      listEl.querySelectorAll(".entry-delete").forEach((btn) => {
        btn.addEventListener("click", () => {
          deleteWithUndo({
            storageKey: userKey("meals"), items: getMeals(), id: btn.dataset.id,
            label: "Meal", renderFn: renderMeals,
          });
        });
      });
    }

    const sumCal = meals.reduce((s, m) => s + Number(m.calories || 0), 0);
    const sumProtein = meals.reduce((s, m) => s + Number(m.protein || 0), 0);
    const sumCarbs = meals.reduce((s, m) => s + Number(m.carbs || 0), 0);
    const sumFats = meals.reduce((s, m) => s + Number(m.fats || 0), 0);
    const exerciseCal = workoutsToday.reduce((s, w) => s + Number(w.calories || 0), 0);
    const goalCal = Number(goals.dailyCalorieTarget) || 2000;
    const remaining = goalCal - sumCal + exerciseCal;

    document.getElementById("remainingCalVal").textContent = remaining;
    document.getElementById("rfGoal").textContent = goalCal;
    document.getElementById("rfFood").textContent = sumCal;
    document.getElementById("rfExercise").textContent = exerciseCal;

    renderMacroRing(sumProtein, sumCarbs, sumFats);
  }

  function renderMacroRing(protein, carbs, fats) {
    const ctx = document.getElementById("macroRingChart");
    if (typeof Chart === "undefined") return;
    const pCal = protein * 4, cCal = carbs * 4, fCal = fats * 9;
    const total = pCal + cCal + fCal;
    const data = total > 0 ? [pCal, cCal, fCal] : [1, 1, 1];
    const colors = [cssVar("--primary"), cssVar("--charge"), "#f59e0b"];

    if (macroRingChart) macroRingChart.destroy();
    macroRingChart = new Chart(ctx, {
      type: "doughnut",
      data: { datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
      options: {
        cutout: "70%",
        plugins: { legend: { display: false }, tooltip: { enabled: total > 0 } },
      },
    });

    document.getElementById("macroLegend").innerHTML = `
      <div class="macro-legend-item"><span class="macro-legend-dot" style="background:${colors[0]}"></span>Protein <b>${round1(protein)}g</b></div>
      <div class="macro-legend-item"><span class="macro-legend-dot" style="background:${colors[1]}"></span>Carbs <b>${round1(carbs)}g</b></div>
      <div class="macro-legend-item"><span class="macro-legend-dot" style="background:${colors[2]}"></span>Fats <b>${round1(fats)}g</b></div>
    `;
  }

  function initMealForm() {
    const form = document.getElementById("mealForm");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const meal = {
        id: uid(), date: todayStr(), createdAt: Date.now(),
        name: document.getElementById("mealName").value.trim(),
        calories: Number(document.getElementById("mealCalories").value) || 0,
        protein: Number(document.getElementById("mealProtein").value) || 0,
        carbs: Number(document.getElementById("mealCarbs").value) || 0,
        fats: Number(document.getElementById("mealFats").value) || 0,
      };
      if (!meal.name) return;
      const all = getMeals();
      all.push(meal);
      store.set(userKey("meals"), all);
      form.reset();
      closeModal("mealModal");
      renderMeals();
      showToast("Meal logged 🍽");
      checkAchievements();
    });
  }

  /* ---------------------------------------------------------
     QUICK ADD — MEALS
     --------------------------------------------------------- */
  let renderQuickGrid = () => {};
  let activeCategory = "all";
  let activeDiet = "all";

  function initQuickAddMeals() {
    const db = window.FOOD_DATABASE || [];
    const grid = document.getElementById("quickAddGrid");
    const searchInput = document.getElementById("quickAddSearch");
    const chipsWrap = document.getElementById("categoryChips");
    const dietChipsWrap = document.getElementById("dietChips");

    const categories = ["all", ...new Set(db.map((f) => f.category))];
    chipsWrap.innerHTML = categories.map((c) =>
      `<button type="button" class="chip ${c === "all" ? "active" : ""}" data-cat="${c}">${c.replace("_", " ")}</button>`
    ).join("");
    chipsWrap.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        chipsWrap.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        activeCategory = chip.dataset.cat;
        renderGrid();
      });
    });

    if (dietChipsWrap) {
      dietChipsWrap.querySelectorAll(".diet-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
          dietChipsWrap.querySelectorAll(".diet-chip").forEach((c) => c.classList.remove("active"));
          chip.classList.add("active");
          activeDiet = chip.dataset.diet;
          renderGrid();
        });
      });
    }

    let highlightIndex = -1;

    function addFoodById(dataId, cardEl) {
      const food = db.find((f) => String(f.id) === dataId);
      if (!food) return;
      const meal = {
        id: uid(), date: todayStr(), createdAt: Date.now(),
        name: food.name, calories: food.calories, protein: food.protein, carbs: food.carbs, fats: food.fats,
      };
      const all = getMeals();
      all.push(meal);
      store.set(userKey("meals"), all);
      if (cardEl) {
        cardEl.classList.add("just-added");
        setTimeout(() => cardEl.classList.remove("just-added"), 400);
      }
      renderMeals();
      showToast(`${food.name} added — ${food.calories} kcal`);
      checkAchievements();
    }

    function applyHighlight() {
      const cards = grid.querySelectorAll(".food-card");
      cards.forEach((c, i) => c.classList.toggle("kb-highlight", i === highlightIndex));
      if (highlightIndex >= 0 && cards[highlightIndex]) {
        cards[highlightIndex].scrollIntoView({ block: "nearest" });
      }
    }

    function renderGrid() {
      const q = searchInput.value.trim().toLowerCase();
      let items = db;
      if (activeCategory !== "all") items = items.filter((f) => f.category === activeCategory);
      if (activeDiet !== "all") items = items.filter((f) => f.diet === activeDiet);
      if (q) items = items.filter((f) => f.name.toLowerCase().includes(q));
      highlightIndex = -1;

      if (!items.length) {
        grid.innerHTML = '<div class="quick-add-empty">No matches — use “+ Custom Meal” to add it manually.</div>';
        return;
      }
      grid.innerHTML = items.map((f, i) => `
        <button type="button" class="food-card" data-id="${f.id}" style="animation-delay:${Math.min(i * 20, 300)}ms">
          <span class="food-card-diet-dot ${f.diet === "non_veg" ? "nonveg" : "veg"}" aria-hidden="true"></span>
          <span class="food-card-name">${escapeHtml(f.name)}</span>
          <span class="food-card-meta">
            <span class="food-card-serving">${escapeHtml(f.serving)}</span>
            <span class="food-card-cal">${f.calories} kcal</span>
          </span>
        </button>`).join("");

      grid.querySelectorAll(".food-card").forEach((card) => {
        card.addEventListener("click", () => addFoodById(card.dataset.id, card));
      });
    }

    // Keyboard: type to filter, ArrowDown/Up to move through results, Enter to add.
    searchInput.addEventListener("input", renderGrid);
    searchInput.addEventListener("keydown", (e) => {
      const cards = grid.querySelectorAll(".food-card");
      if (!cards.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        highlightIndex = Math.min(highlightIndex + 1, cards.length - 1);
        applyHighlight();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        highlightIndex = Math.max(highlightIndex - 1, 0);
        applyHighlight();
      } else if (e.key === "Enter") {
        e.preventDefault();
        const idx = highlightIndex >= 0 ? highlightIndex : 0;
        addFoodById(cards[idx].dataset.id, cards[idx]);
      } else if (e.key === "Escape") {
        highlightIndex = -1;
        applyHighlight();
      }
    });

    renderQuickGrid = renderGrid;
    renderGrid();
  }

  /* ---------------------------------------------------------
     WORKOUTS — category drill-down (Gym / Cardio / Sports)
     --------------------------------------------------------- */
  const CATEGORY_TO_MODAL_TYPE = { gym: "weight_training", cardio: "running", sports: "sports" };
  let activeWorkoutCategory = null;
  let activeDuration = 30;

  // Form-guide photos for each gym exercise — each image already includes
  // the exercise name, both form positions, numbered cues, and a tips box.
  const EXERCISE_FORM_IMAGES = {
    "Bench Press": "assets/exercise-forms/bench-press.svg",
    "Squat": "assets/exercise-forms/squat.svg",
    "Deadlift": "assets/exercise-forms/deadlift.svg",
    "Pull-ups": "assets/exercise-forms/pull-ups.svg",
    "Shoulder Press": "assets/exercise-forms/shoulder-press.svg",
    "Bicep Curl": "assets/exercise-forms/bicep-curl.svg",
    "Lat Pulldown": "assets/exercise-forms/lat-pulldown.svg",
    "Leg Press": "assets/exercise-forms/leg-press.svg",
    "Plank / Core": "assets/exercise-forms/plank.svg",
    "General Weight Training": "assets/exercise-forms/general-weight-training.svg",
    "Running": "assets/exercise-forms/running.svg",
    "Cycling": "assets/exercise-forms/cycling.svg",
    "Swimming": "assets/exercise-forms/swimming.svg",
    "Jump Rope": "assets/exercise-forms/jump-rope.svg",
    "Rowing Machine": "assets/exercise-forms/rowing-machine.svg",
    "Elliptical": "assets/exercise-forms/elliptical.svg",
    "Stair Climber": "assets/exercise-forms/stair-climber.svg",
    "Walking": "assets/exercise-forms/walking.svg",
    "Incline Treadmill Walk": "assets/exercise-forms/incline-treadmill-walk.svg",
    "Football / Soccer": "assets/exercise-forms/football-soccer.svg",
    "Basketball": "assets/exercise-forms/basketball.svg",
    "Badminton": "assets/exercise-forms/badminton.svg",
    "Cricket": "assets/exercise-forms/cricket.svg",
    "Tennis": "assets/exercise-forms/tennis.svg",
    "Table Tennis": "assets/exercise-forms/table-tennis.svg",
    "Volleyball": "assets/exercise-forms/volleyball.svg",
    "Boxing": "assets/exercise-forms/boxing.svg",
  };

  function showExerciseForm(name) {
    const card = document.getElementById("exerciseFormCard");
    const img = document.getElementById("exerciseFormImg");
    const src = EXERCISE_FORM_IMAGES[name];
    if (!card || !img || !src) {
      hideExerciseForm();
      return;
    }
    img.src = src;
    img.alt = `${name} — proper form guide, step by step`;
    card.style.display = "block";
    card.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function hideExerciseForm() {
    const card = document.getElementById("exerciseFormCard");
    if (card) card.style.display = "none";
  }

  function renderWorkouts() {
    const today = todayStr();
    const workouts = getWorkouts().filter((w) => w.date === today).sort((a, b) => b.createdAt - a.createdAt);
    const listEl = document.getElementById("workoutList");
    if (!workouts.length) {
      listEl.innerHTML = '<p class="empty-state">No workouts logged today. Pick a category above and tap an exercise.</p>';
      return;
    }
    listEl.innerHTML = workouts.map((w) => `
      <div class="entry-row">
        <div class="entry-main">
          <span class="entry-title">${escapeHtml(w.name || labelForWorkout(w.type))}</span>
          <span class="entry-meta">${w.duration} min</span>
        </div>
        <span class="entry-value burn">${w.calories} kcal</span>
        <button class="entry-delete" data-id="${w.id}" aria-label="Delete workout">✕</button>
      </div>`).join("");
    listEl.querySelectorAll(".entry-delete").forEach((btn) => {
      btn.addEventListener("click", () => {
        deleteWithUndo({
          storageKey: userKey("workouts"), items: getWorkouts(), id: btn.dataset.id,
          label: "Workout", renderFn: renderWorkouts,
        });
      });
    });
  }

  function labelForWorkout(type) {
    const map = { running: "Running", cycling: "Cycling", weight_training: "Weight training", swimming: "Swimming",
      yoga: "Yoga", hiit: "HIIT", walking: "Walking", sports: "Sports" };
    return map[type] || type;
  }

  function initWorkoutCategories() {
    const categoryGrid = document.getElementById("workoutCategoryGrid");
    const panel = document.getElementById("exercisePanel");
    const durationChips = document.getElementById("durationChips");
    const exerciseGrid = document.getElementById("exerciseGrid");
    const backBtn = document.getElementById("backToCategories");

    const DURATIONS = [15, 30, 45, 60];
    durationChips.innerHTML = DURATIONS.map((d) => `<button type="button" class="chip ${d === activeDuration ? "active" : ""}" data-dur="${d}">${d} min</button>`).join("");
    durationChips.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        durationChips.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        activeDuration = Number(chip.dataset.dur);
        renderExerciseGrid();
      });
    });

    categoryGrid.querySelectorAll(".category-card").forEach((card) => {
      card.addEventListener("click", () => {
        categoryGrid.querySelectorAll(".category-card").forEach((c) => c.classList.remove("active"));
        card.classList.add("active");
        activeWorkoutCategory = card.dataset.cat;
        panel.style.display = "block";
        hideExerciseForm();
        renderExerciseGrid();
      });
    });

    backBtn.addEventListener("click", () => {
      panel.style.display = "none";
      categoryGrid.querySelectorAll(".category-card").forEach((c) => c.classList.remove("active"));
      activeWorkoutCategory = null;
      hideExerciseForm();
    });

    const formCloseBtn = document.getElementById("exerciseFormClose");
    if (formCloseBtn) formCloseBtn.addEventListener("click", hideExerciseForm);

    function renderExerciseGrid() {
      const db = window.EXERCISE_DATABASE || {};
      const exercises = db[activeWorkoutCategory] || [];
      exerciseGrid.innerHTML = exercises.map((ex, i) => {
        const est = estimateCaloriesForMet(ex.met, activeDuration);
        const formImage = EXERCISE_FORM_IMAGES[ex.name] || "";
        return `
        <button type="button" class="workout-chip" data-idx="${i}">
          ${formImage ? `<img class="workout-chip-image" src="${formImage}" alt="${escapeHtml(ex.name)} exercise form">` : `<span class="workout-chip-icon">${ex.icon}</span>`}
          <span class="workout-chip-title">${escapeHtml(ex.name)}</span>
          <span class="workout-chip-meta">${activeDuration} min · ~${est} kcal</span>
        </button>`;
      }).join("");

      exerciseGrid.querySelectorAll(".workout-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
          const ex = exercises[chip.dataset.idx];
          const calories = estimateCaloriesForMet(ex.met, activeDuration);
          const workout = {
            id: uid(), date: todayStr(), createdAt: Date.now(),
            type: CATEGORY_TO_MODAL_TYPE[activeWorkoutCategory] || "sports",
            name: ex.name, duration: activeDuration, calories,
          };
          const all = getWorkouts();
          all.push(workout);
          store.set(userKey("workouts"), all);
          chip.classList.add("just-added");
          setTimeout(() => chip.classList.remove("just-added"), 400);
          renderWorkouts();
          showToast(`${ex.name} logged — ${calories} kcal burned`);
          checkAchievements();
          if (EXERCISE_FORM_IMAGES[ex.name]) {
            showExerciseForm(ex.name);
          } else {
            hideExerciseForm();
          }
        });
      });
    }
  }

  function initWorkoutForm() {
    const typeSelect = document.getElementById("workoutType");
    const durationInput = document.getElementById("workoutDuration");
    const caloriesInput = document.getElementById("workoutCalories");
    const hint = document.getElementById("calorieEstimateHint");

    function updateHint() {
      const est = estimateCalories(typeSelect.value, Number(durationInput.value) || 0);
      hint.textContent = `Estimated burn: ~${est} kcal (based on your latest logged weight)`;
      if (!caloriesInput.value) caloriesInput.placeholder = String(est);
    }
    typeSelect.addEventListener("change", updateHint);
    durationInput.addEventListener("input", updateHint);
    updateHint();

    const form = document.getElementById("workoutForm");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const duration = Number(durationInput.value) || 0;
      const calories = Number(caloriesInput.value) || estimateCalories(typeSelect.value, duration);
      const workout = { id: uid(), date: todayStr(), createdAt: Date.now(), type: typeSelect.value, duration, calories };
      const all = getWorkouts();
      all.push(workout);
      store.set(userKey("workouts"), all);
      form.reset();
      caloriesInput.placeholder = "auto";
      closeModal("workoutModal");
      renderWorkouts();
      showToast("Workout logged 💪");
      checkAchievements();
      updateHint();
    });
  }

  /* ---------------------------------------------------------
     WEIGHT
     --------------------------------------------------------- */
  function renderWeight() {
    const logs = [...getWeightLogs()].sort((a, b) => b.createdAt - a.createdAt);
    const listEl = document.getElementById("weightList");
    if (!logs.length) {
      listEl.innerHTML = '<p class="empty-state">No weight entries yet.</p>';
    } else {
      listEl.innerHTML = logs.map((w) => `
        <div class="entry-row">
          <div class="entry-main"><span class="entry-title">${fmtShortDate(w.date)}</span></div>
          <span class="entry-value charge">${w.weight} kg</span>
          <button class="entry-delete" data-id="${w.id}" aria-label="Delete entry">✕</button>
        </div>`).join("");
      listEl.querySelectorAll(".entry-delete").forEach((btn) => {
        btn.addEventListener("click", () => {
          deleteWithUndo({
            storageKey: userKey("weightLogs"), items: getWeightLogs(), id: btn.dataset.id,
            label: "Weight entry", renderFn: renderWeight,
          });
        });
      });
    }
    renderWeightTrendChart("weightPageChart");
    renderBmiTracker();
    renderWaterTracker();
    renderSleepTracker();
  }

  /* ---------------------------------------------------------
     BMI TRACKER
     --------------------------------------------------------- */
  function renderBmiTracker() {
    const profile = getProfile();
    const weight = currentWeightKg();
    const noHeightEl = document.getElementById("bmiNoHeight");
    const contentEl = document.getElementById("bmiContent");
    if (!noHeightEl || !contentEl) return;

    const heightInput = document.getElementById("bmiHeightInput");
    if (heightInput && document.activeElement !== heightInput) {
      heightInput.value = profile.heightCm || "";
    }

    if (!profile.heightCm) {
      noHeightEl.style.display = "";
      contentEl.style.display = "none";
      return;
    }
    noHeightEl.style.display = "none";
    contentEl.style.display = "";

    const bmi = computeBmi(weight, profile.heightCm);
    const cat = bmiCategory(bmi);
    document.getElementById("bmiNumber").textContent = bmi.toFixed(1);
    const badge = document.getElementById("bmiBadge");
    badge.textContent = cat.label;
    document.getElementById("bmiMeta").textContent = `${weight} kg at ${profile.heightCm} cm`;

    const clamped = Math.max(15, Math.min(40, bmi));
    const pct = ((clamped - 15) / (40 - 15)) * 100;
    document.getElementById("bmiPointer").style.left = pct + "%";
  }

  /* ---------------------------------------------------------
     WATER TRACKER
     --------------------------------------------------------- */
  function renderWaterTracker() {
    const target = waterTargetMl();
    const current = todayWaterMl();
    const pct = target ? Math.max(0, Math.min(1, current / target)) : 0;
    const targetLabel = document.getElementById("waterTargetLabel");
    if (!targetLabel) return;
    targetLabel.textContent = `Target ${target} ml`;
    document.getElementById("waterCurrentVal").textContent = current;
    document.getElementById("waterPct").textContent = Math.round(pct * 100) + "%";
    document.getElementById("waterFill").style.width = Math.round(pct * 100) + "%";
  }

  function addWater(ml) {
    const entry = { id: uid(), date: todayStr(), createdAt: Date.now(), ml };
    const all = getWaterLogs();
    all.push(entry);
    store.set(userKey("waterLogs"), all);
    renderWaterTracker();
    showToast(`+${ml} ml logged 💧`);
    checkAchievements();
  }

  function initWaterTracker() {
    document.querySelectorAll(".water-chip").forEach((btn) => {
      btn.addEventListener("click", () => addWater(Number(btn.dataset.ml)));
    });
    const resetBtn = document.getElementById("waterResetBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        const today = todayStr();
        const remaining = getWaterLogs().filter((w) => w.date !== today);
        store.set(userKey("waterLogs"), remaining);
        renderWaterTracker();
        showToast("Water log reset for today");
      });
    }
  }

  /* ---------------------------------------------------------
     SLEEP TRACKER
     --------------------------------------------------------- */
  function renderSleepTracker() {
    const target = sleepTargetHours();
    const entry = todaySleepEntry();
    const hours = entry ? Number(entry.hours) : 0;
    const pct = target ? Math.max(0, Math.min(1, hours / target)) : 0;
    const targetLabel = document.getElementById("sleepTargetLabel");
    if (!targetLabel) return;
    targetLabel.textContent = `Target ${target} hrs`;
    document.getElementById("sleepCurrentVal").textContent = hours || 0;
    document.getElementById("sleepPct").textContent = Math.round(pct * 100) + "%";
    document.getElementById("sleepFill").style.width = Math.round(pct * 100) + "%";
    const input = document.getElementById("sleepHoursInput");
    if (input && entry) input.value = entry.hours;
  }

  function initSleepForm() {
    const form = document.getElementById("sleepLogForm");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const hours = Number(document.getElementById("sleepHoursInput").value);
      if (!hours && hours !== 0) return;
      const today = todayStr();
      const all = getSleepLogs();
      const existing = all.find((s) => s.date === today);
      if (existing) {
        existing.hours = hours;
        existing.createdAt = Date.now();
      } else {
        all.push({ id: uid(), date: today, createdAt: Date.now(), hours });
      }
      store.set(userKey("sleepLogs"), all);
      renderSleepTracker();
      showToast("Sleep logged 🌙");
      checkAchievements();
    });
  }

  function initBmiCard() {
    initBmiHeightInput();
  }

  function initWeightForm() {
    const form = document.getElementById("weightForm");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const weight = Number(document.getElementById("weightValue").value);
      if (!weight) return;
      const entry = { id: uid(), date: todayStr(), createdAt: Date.now(), weight };
      const all = getWeightLogs();
      all.push(entry);
      store.set(userKey("weightLogs"), all);
      form.reset();
      closeModal("weightModal");
      renderWeight();
      showToast("Weight logged ⚖️");
      checkAchievements();
    });
  }

  /* ---------------------------------------------------------
     GOALS
     --------------------------------------------------------- */
  function renderGoals() {
    const goals = getGoals();
    document.getElementById("goalCalories").value = goals.dailyCalorieTarget || "";
    document.getElementById("goalWeight").value = goals.weightTarget || "";
    document.getElementById("goalWorkouts").value = goals.weeklyWorkoutTarget || "";
    document.getElementById("goalStreak").value = goals.streakMilestone || 7;

    const today = todayStr();
    const caloriesIn = getMeals().filter((m) => m.date === today).reduce((s, m) => s + Number(m.calories || 0), 0);
    const weightLogs = getWeightLogs();
    const currentWeight = weightLogs.length ? weightLogs[weightLogs.length - 1].weight : null;
    const weekStart = daysAgoStr(6);
    const workoutsThisWeek = getWorkouts().filter((w) => w.date >= weekStart).length;
    const streak = computeStreak();

    const calPct = goals.dailyCalorieTarget ? Math.min(1, caloriesIn / goals.dailyCalorieTarget) : 0;
    const workoutPct = goals.weeklyWorkoutTarget ? Math.min(1, workoutsThisWeek / goals.weeklyWorkoutTarget) : 0;
    const streakPct = goals.streakMilestone ? Math.min(1, streak / goals.streakMilestone) : 0;

    let weightBlock = "";
    if (goals.weightTarget && currentWeight != null) {
      const start = weightLogs.length ? weightLogs[0].weight : currentWeight;
      const total = Math.abs(start - goals.weightTarget) || 1;
      const done = Math.abs(start - currentWeight);
      const weightPct = Math.max(0, Math.min(1, done / total));
      weightBlock = progressCard("Weight goal", weightPct, `${currentWeight}kg → ${goals.weightTarget}kg target`);
    }

    document.getElementById("goalsProgress").innerHTML =
      progressCard("Today's calories", calPct, `${caloriesIn} / ${goals.dailyCalorieTarget || 0} kcal`) +
      progressCard("Workouts this week", workoutPct, `${workoutsThisWeek} / ${goals.weeklyWorkoutTarget || 0} sessions`) +
      progressCard("Streak milestone", streakPct, `${streak} / ${goals.streakMilestone || 0} days`) +
      weightBlock;
  }

  function progressCard(title, pct, caption) {
    return `<div class="progress-card"><h4>${title}</h4>
      <div class="progress-track"><div class="progress-fill" style="width:${Math.round(pct * 100)}%"></div></div>
      <div class="progress-caption">${caption}</div></div>`;
  }

  function initGoalsForm() {
    document.getElementById("goalsForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const goals = {
        dailyCalorieTarget: Number(document.getElementById("goalCalories").value) || 2000,
        weightTarget: Number(document.getElementById("goalWeight").value) || null,
        weeklyWorkoutTarget: Number(document.getElementById("goalWorkouts").value) || 0,
        streakMilestone: Number(document.getElementById("goalStreak").value) || 7,
      };
      store.set(userKey("goals"), goals);
      renderGoals();
      showToast("Goals saved 🎯");
      checkAchievements();
    });
  }

  /* ---------------------------------------------------------
     HEIGHT (now captured directly on the BMI card)
     --------------------------------------------------------- */
  function initBmiHeightInput() {
    const input = document.getElementById("bmiHeightInput");
    const saveBtn = document.getElementById("bmiHeightSave");
    if (!input || !saveBtn) return;

    function save() {
      const heightCm = Number(input.value) || null;
      const profile = { ...getProfile(), heightCm };
      store.set(userKey("profile"), profile);
      renderBmiTracker();
      renderWaterTracker();
      renderSleepTracker();
      showToast(heightCm ? "Height saved 📏" : "Height cleared");
      checkAchievements();
    }
    saveBtn.addEventListener("click", save);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); save(); } });
  }

  /* ---------------------------------------------------------
     ACHIEVEMENTS
     --------------------------------------------------------- */
  function getBadgeDefs() {
    const goals = getGoals();
    return [
      { id: "first_meal", icon: "🍽", title: "First Fuel", desc: "Log your first meal", test: () => getMeals().length >= 1 },
      { id: "first_workout", icon: "🔥", title: "First Rep", desc: "Log your first workout", test: () => getWorkouts().length >= 1 },
      { id: "first_weight", icon: "⚖️", title: "Checkpoint", desc: "Log your first weight entry", test: () => getWeightLogs().length >= 1 },
      { id: "streak_3", icon: "⚡", title: "Warming Up", desc: "3-day logging streak", test: () => computeStreak() >= 3,
        progress: () => ({ current: computeStreak(), target: 3 }) },
      { id: "streak_custom", icon: "🌟", title: "Streak Milestone", desc: `${goals.streakMilestone}-day logging streak`, test: () => computeStreak() >= (goals.streakMilestone || 7),
        progress: () => ({ current: computeStreak(), target: goals.streakMilestone || 7 }) },
      { id: "streak_30", icon: "👑", title: "Unbreakable", desc: "30-day logging streak", test: () => computeStreak() >= 30,
        progress: () => ({ current: computeStreak(), target: 30 }) },
      { id: "meals_25", icon: "📈", title: "Meal Prepper", desc: "Log 25 meals total", test: () => getMeals().length >= 25,
        progress: () => ({ current: getMeals().length, target: 25 }) },
      { id: "workouts_15", icon: "🏋️", title: "Iron Will", desc: "Log 15 workouts total", test: () => getWorkouts().length >= 15,
        progress: () => ({ current: getWorkouts().length, target: 15 }) },
      { id: "goal_hit", icon: "🎯", title: "On Target", desc: "Hit your daily calorie goal", test: () => {
          const today = todayStr();
          const goal = getGoals().dailyCalorieTarget;
          const cal = getMeals().filter((m) => m.date === today).reduce((s, m) => s + Number(m.calories || 0), 0);
          return goal && cal >= goal * 0.95 && cal <= goal * 1.05;
        } },
      { id: "weight_goal", icon: "🏆", title: "Goal Crusher", desc: "Reach your target weight", test: () => {
          const g = getGoals();
          const logs = getWeightLogs();
          if (!g.weightTarget || !logs.length) return false;
          return Math.abs(logs[logs.length - 1].weight - g.weightTarget) <= 0.5;
        } },
      { id: "water_first", icon: "💧", title: "First Sip", desc: "Log your first glass of water", test: () => getWaterLogs().length >= 1 },
      { id: "water_goal_today", icon: "🌊", title: "Fully Hydrated", desc: "Hit your water target in a single day", test: () => waterTargetMl() > 0 && todayWaterMl() >= waterTargetMl() },
      { id: "sleep_first", icon: "🌙", title: "Lights Out", desc: "Log your first night of sleep", test: () => getSleepLogs().length >= 1 },
      { id: "sleep_goal_today", icon: "😴", title: "Well Rested", desc: "Meet your sleep target", test: () => {
          const e = todaySleepEntry();
          return !!e && Number(e.hours) >= sleepTargetHours();
        } },
      { id: "profile_complete", icon: "🪪", title: "Know Thyself", desc: "Log your height in the BMI tracker", test: () => {
          const p = getProfile();
          return !!p.heightCm;
        } },
      { id: "weight_5", icon: "📉", title: "Consistent Tracker", desc: "Log 5 weight entries", test: () => getWeightLogs().length >= 5,
        progress: () => ({ current: getWeightLogs().length, target: 5 }) },
      { id: "weight_20", icon: "📊", title: "Data Driven", desc: "Log 20 weight entries", test: () => getWeightLogs().length >= 20,
        progress: () => ({ current: getWeightLogs().length, target: 20 }) },
      { id: "meals_100", icon: "🍱", title: "Century Club", desc: "Log 100 meals total", test: () => getMeals().length >= 100,
        progress: () => ({ current: getMeals().length, target: 100 }) },
      { id: "workouts_50", icon: "💪", title: "Half Century", desc: "Log 50 workouts total", test: () => getWorkouts().length >= 50,
        progress: () => ({ current: getWorkouts().length, target: 50 }) },
      { id: "streak_60", icon: "🔱", title: "Relentless", desc: "60-day logging streak", test: () => computeStreak() >= 60,
        progress: () => ({ current: computeStreak(), target: 60 }) },
    ];
  }

  function renderAchievements() {
    const badges = getBadgeDefs();
    document.getElementById("badgeGrid").innerHTML = badges.map((b) => {
      const unlocked = b.test();
      let progressHtml = "";
      if (!unlocked && b.progress) {
        const { current, target } = b.progress();
        const pct = Math.max(0, Math.min(1, target ? current / target : 0));
        progressHtml = `
          <div class="badge-progress-track"><div class="badge-progress-fill" style="width:${Math.round(pct * 100)}%"></div></div>
          <div class="badge-progress-caption">${Math.min(current, target)} / ${target}</div>`;
      }
      return `<div class="badge-card ${unlocked ? "unlocked" : ""}">
        <div class="badge-icon">${b.icon}</div>
        <div class="badge-title">${b.title}</div>
        <div class="badge-desc">${b.desc}</div>
        ${progressHtml}
      </div>`;
    }).join("");
  }

  function checkAchievements() {
    const prevUnlocked = new Set(store.get(userKey("badges_unlocked"), []));
    const badges = getBadgeDefs();
    const nowUnlocked = badges.filter((b) => b.test()).map((b) => b.id);
    const newlyUnlocked = nowUnlocked.filter((id) => !prevUnlocked.has(id));
    if (newlyUnlocked.length) {
      const badge = badges.find((b) => b.id === newlyUnlocked[0]);
      showToast(`🏅 Achievement unlocked: ${badge.title}`);
    }
    store.set(userKey("badges_unlocked"), nowUnlocked);
  }

  /* ---------------------------------------------------------
     Appearance — light (white + navy) by default, dark + accent in Settings
     --------------------------------------------------------- */
  const ACCENTS = [
    { id: "navy", name: "Navy", light: "#1e3a8a", dark: "#7c9cff" },
    { id: "blue", name: "Royal blue", light: "#2563eb", dark: "#6ea0ff" },
    { id: "teal", name: "Teal", light: "#0f766e", dark: "#2dd4bf" },
    { id: "purple", name: "Purple", light: "#6d28d9", dark: "#a78bfa" },
    { id: "crimson", name: "Crimson", light: "#be123c", dark: "#fb7185" },
    { id: "forest", name: "Forest", light: "#15803d", dark: "#4ade80" },
    { id: "orange", name: "Orange", light: "#c2410c", dark: "#fb923c" },
  ];
  const $ = (id) => document.getElementById(id);
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  function mixHex(a, b, t) {
    const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const x = p(a), y = p(b);
    return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
  }
  const getAppearance = () => ({ theme: "light", accent: "navy", ...store.get("forge_appearance", {}) });
  function applyAppearance() {
    const a = getAppearance();
    const acc = ACCENTS.find((x) => x.id === a.accent) || ACCENTS[0];
    const dark = a.theme === "dark";
    const c = dark ? acc.dark : acc.light;
    const r = document.documentElement;
    r.dataset.theme = dark ? "dark" : "light";
    r.style.setProperty("--primary", c);
    r.style.setProperty("--burn", mixHex(c, "#ffffff", dark ? 0.25 : 0.2));
    r.style.setProperty("--charge", mixHex(c, "#ffffff", 0.45));
  }
  function setAppearance(patch) {
    store.set("forge_appearance", { ...getAppearance(), ...patch });
    applyAppearance();
    if (currentUser) { try { renderDashboard(); renderMeals(); renderWeight(); } catch (e) { console.error(e); } }
    renderSettings();
  }
  function renderSettings() {
    const a = getAppearance();
    const dark = a.theme === "dark";
    document.querySelectorAll("#themeSeg button").forEach((b) => b.classList.toggle("active", b.dataset.theme === a.theme));
    $("accentSwatches").innerHTML = ACCENTS.map((x) =>
      `<button type="button" class="swatch ${x.id === a.accent ? "active" : ""}" data-accent="${x.id}" style="--sw:${dark ? x.dark : x.light}" aria-label="${x.name}" title="${x.name}"></button>`).join("");
    const p = getProfile();
    $("settingsPlanSummary").textContent = p.diet && p.physique
      ? `${PHYSIQUE[p.physique].label} · ${p.diet === "veg" ? "Vegetarian" : "Non-vegetarian"} · ${p.gymDays} gym days/week · ${p.sessionMin} min sessions`
      : "You haven't finished setup yet.";
  }
  function initSettings() {
    document.querySelectorAll("#themeSeg button").forEach((b) => b.addEventListener("click", () => setAppearance({ theme: b.dataset.theme })));
    $("accentSwatches").addEventListener("click", (e) => {
      const b = e.target.closest(".swatch");
      if (b) setAppearance({ accent: b.dataset.accent });
    });
    $("themeQuick").addEventListener("click", () => setAppearance({ theme: getAppearance().theme === "dark" ? "light" : "dark" }));
    $("editPlanBtn").addEventListener("click", openOnboarding);
    renderSettings();
  }

  /* ---------------------------------------------------------
     Diet filter — veg users only ever see veg foods
     --------------------------------------------------------- */
  function syncDietUI() {
    const diet = getProfile().diet;
    activeDiet = diet === "veg" ? "veg" : "all";
    const wrap = $("dietChips");
    if (wrap) {
      wrap.style.display = diet === "veg" ? "none" : "";
      wrap.querySelectorAll(".diet-chip").forEach((c) => c.classList.toggle("active", c.dataset.diet === activeDiet));
    }
    renderQuickGrid();
  }

  /* ---------------------------------------------------------
     Plan — calories, macros and weekly split from the setup answers
     (standard Mifflin-St Jeor estimate; a starting point, not medical advice)
     --------------------------------------------------------- */
  const PHYSIQUE = {
    aesthetic: { label: "Aesthetic", protein: 2.0, focus: "Shoulders, back width and arms, plus 2 short cardio sessions a week to stay lean." },
    muscular: { label: "Muscular", protein: 2.2, focus: "Heavy compound lifts, progressive overload and minimal cardio, eating in a small surplus." },
    fit: { label: "Fit", protein: 1.6, focus: "A balanced mix of strength, cardio and mobility for all-round fitness." },
  };
  const SPLITS = {
    1: ["Full body"], 2: ["Full body A", "Full body B"], 3: ["Push", "Pull", "Legs"],
    4: ["Upper", "Lower", "Upper", "Lower"], 5: ["Push", "Pull", "Legs", "Upper", "Lower"],
    6: ["Push", "Pull", "Legs", "Push", "Pull", "Legs"],
  };
  function computePlan(p) {
    const bmr = 10 * p.weight + 6.25 * p.heightCm - 5 * (p.age || 20) + (p.gender === "female" ? -161 : 5);
    const factor = { 1: 1.3, 2: 1.4, 3: 1.5, 4: 1.55, 5: 1.65, 6: 1.7 }[p.gymDays] || 1.4;
    let delta = 0;
    if (p.goalWeight < p.weight - 0.5) delta = -400;
    else if (p.goalWeight > p.weight + 0.5) delta = 300;
    if (p.physique === "muscular") delta = Math.max(delta, 250);
    if (p.physique === "aesthetic") delta = delta > 0 ? 100 : Math.min(delta, -200);
    return { calories: Math.max(1200, Math.round((bmr * factor + delta) / 10) * 10) };
  }
  function macrosFor(cal, weight, physique) {
    const protein = Math.round(weight * ((PHYSIQUE[physique] || {}).protein || 1.8));
    const fats = Math.round((cal * 0.25) / 9);
    const carbs = Math.max(0, Math.round((cal - protein * 4 - fats * 9) / 4));
    return { protein, carbs, fats };
  }
  function renderPlanCard() {
    const el = $("planCard");
    if (!el) return;
    const p = getProfile();
    if (!p.diet || !p.physique) {
      el.innerHTML = `<div class="plan-empty"><div><h3>Set up your plan</h3><p>Add your weight, food preference, physique and gym days to get calories, macros and a weekly split.</p></div><button type="button" class="btn-primary" id="planSetupBtn">Start setup</button></div>`;
      $("planSetupBtn").addEventListener("click", openOnboarding);
      return;
    }
    const w = currentWeightKg();
    const goals = getGoals();
    const cal = Number(goals.dailyCalorieTarget) || computePlan({ ...p, weight: w, goalWeight: goals.weightTarget || w }).calories;
    const m = macrosFor(cal, w, p.physique);
    const week = new Set(getWorkouts().filter((x) => x.date >= daysAgoStr(6)).map((x) => x.date)).size;
    const split = (SPLITS[p.gymDays] || []).map((s, i) => `<span class="split-chip"><b>Day ${i + 1}</b>${s}</span>`).join("");
    el.innerHTML = `
      <div class="plan-head"><div><p class="eyebrow">Your plan</p><h3>${PHYSIQUE[p.physique].label} · ${p.diet === "veg" ? "🟢 Vegetarian" : "🔴 Non-veg"}</h3></div>
        <button type="button" class="btn-ghost small" id="planEditBtn">Edit</button></div>
      <div class="plan-macros">
        <div><span>${cal}</span><small>kcal / day</small></div><div><span>${m.protein}g</span><small>protein</small></div>
        <div><span>${m.carbs}g</span><small>carbs</small></div><div><span>${m.fats}g</span><small>fats</small></div>
      </div>
      <p class="plan-line"><b>This week:</b> ${week} / ${p.gymDays} gym days · ${p.sessionMin} min sessions</p>
      <div class="plan-split">${split}</div>
      <p class="plan-focus">${PHYSIQUE[p.physique].focus}</p>
      <p class="hint-text">Estimates from standard formulas, a starting point rather than medical advice.</p>`;
    $("planEditBtn").addEventListener("click", openOnboarding);
  }

  /* ---------------------------------------------------------
     Setup wizard (shown after sign-up, and from Settings / dashboard)
     --------------------------------------------------------- */
  const ob = { step: 1, diet: null, physique: null, days: null, mins: null };
  function obSyncChoices() {
    document.querySelectorAll("#onboard [data-group]").forEach((g) => {
      g.querySelectorAll("button[data-value]").forEach((b) => b.classList.toggle("active", String(ob[g.dataset.group]) === b.dataset.value));
    });
  }
  function obShow(step) {
    ob.step = step;
    document.querySelectorAll(".ob-step").forEach((s) => s.classList.toggle("active", Number(s.dataset.step) === step));
    $("obStepLabel").textContent = `Step ${step} of 3`;
    $("obBar").style.width = (step / 3) * 100 + "%";
    $("obBack").style.visibility = step === 1 ? "hidden" : "visible";
    $("obNext").textContent = step === 3 ? "Build my plan" : "Next";
    $("obError").textContent = "";
  }
  function openOnboarding() {
    const p = getProfile(), g = getGoals(), logs = getWeightLogs();
    $("obWeight").value = logs.length ? logs[logs.length - 1].weight : "";
    $("obGoalWeight").value = g.weightTarget || "";
    $("obHeight").value = p.heightCm || "";
    $("obAge").value = p.age || "";
    $("obGender").value = p.gender || "male";
    Object.assign(ob, { diet: p.diet || null, physique: p.physique || null, days: p.gymDays || null, mins: p.sessionMin || null });
    obSyncChoices();
    obShow(1);
    $("onboard").style.display = "flex";
    setTimeout(() => $("obWeight").focus(), 50);
  }
  function obError(step) {
    if (step === 1) {
      const w = Number($("obWeight").value), gw = Number($("obGoalWeight").value), h = Number($("obHeight").value), a = Number($("obAge").value);
      if (!(w >= 20 && w <= 300)) return "Enter your current weight in kg.";
      if (!(gw >= 20 && gw <= 300)) return "Enter your goal weight in kg.";
      if (!(h >= 100 && h <= 250)) return "Enter your height in cm.";
      if (!(a >= 12 && a <= 90)) return "Enter your age.";
    }
    if (step === 2 && !ob.diet) return "Choose vegetarian or non-vegetarian.";
    if (step === 2 && !ob.physique) return "Choose the physique you're going for.";
    if (step === 3 && !ob.days) return "Choose how many days a week you can train.";
    if (step === 3 && !ob.mins) return "Choose how long each session can be.";
    return "";
  }
  function obFinish() {
    const weight = Number($("obWeight").value), goalWeight = Number($("obGoalWeight").value);
    const heightCm = Number($("obHeight").value), age = Number($("obAge").value), gender = $("obGender").value;
    const plan = computePlan({ weight, goalWeight, heightCm, age, gender, physique: ob.physique, gymDays: ob.days });
    const level = ob.days <= 1 ? "light" : ob.days <= 3 ? "moderate" : ob.days <= 5 ? "active" : "very_active";
    store.set(userKey("profile"), { ...getProfile(), heightCm, age, gender, diet: ob.diet, physique: ob.physique, gymDays: ob.days, sessionMin: ob.mins, activityLevel: level, onboarded: true });
    store.set(userKey("goals"), { ...getGoals(), dailyCalorieTarget: plan.calories, weightTarget: goalWeight, weeklyWorkoutTarget: ob.days });
    const logs = getWeightLogs();
    if (!logs.length || logs[logs.length - 1].weight !== weight) {
      logs.push({ id: uid(), date: todayStr(), createdAt: Date.now(), weight });
      store.set(userKey("weightLogs"), logs);
    }
    $("onboard").style.display = "none";
    syncDietUI();
    renderAll();
    navigateTo("dashboard");
    showToast("Your plan is ready 🎯");
  }
  function obNext() {
    const err = obError(ob.step);
    if (err) { $("obError").textContent = err; return; }
    if (ob.step < 3) obShow(ob.step + 1); else obFinish();
  }
  function initOnboarding() {
    document.querySelectorAll("#onboard [data-group]").forEach((g) => {
      g.addEventListener("click", (e) => {
        const b = e.target.closest("button[data-value]");
        if (!b) return;
        const numeric = g.dataset.group === "days" || g.dataset.group === "mins";
        ob[g.dataset.group] = numeric ? Number(b.dataset.value) : b.dataset.value;
        obSyncChoices();
      });
    });
    $("obNext").addEventListener("click", obNext);
    $("obBack").addEventListener("click", () => obShow(Math.max(1, ob.step - 1)));
    $("obSkip").addEventListener("click", () => {
      store.set(userKey("profile"), { ...getProfile(), onboarded: true });
      $("onboard").style.display = "none";
      renderPlanCard();
    });
    $("onboard").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.tagName === "INPUT") { e.preventDefault(); obNext(); }
    });
  }

  /* ---------------------------------------------------------
     Utils
     --------------------------------------------------------- */
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
  function round1(n) { return Math.round(n * 10) / 10; }

  const countUpState = new WeakMap();
  function animateCount(el, target, duration = 500) {
    if (!el) return;
    const start = countUpState.get(el) ?? (Number(el.textContent.replace(/[^\d.-]/g, "")) || 0);
    const startTime = performance.now();
    function step(now) {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(start + (target - start) * eased);
      if (t < 1) requestAnimationFrame(step);
      else countUpState.set(el, target);
    }
    requestAnimationFrame(step);
  }

  function initEmbers() {
    const field = document.getElementById("emberField");
    if (!field) return;
    for (let i = 0; i < 22; i++) {
      const ember = document.createElement("span");
      ember.className = "ember" + (Math.random() > 0.6 ? " charge" : "");
      ember.style.left = Math.random() * 100 + "vw";
      ember.style.setProperty("--drift", (Math.random() * 60 - 30) + "px");
      const duration = 8 + Math.random() * 10;
      ember.style.animationDuration = duration + "s";
      ember.style.animationDelay = Math.random() * duration + "s";
      field.appendChild(ember);
    }
  }

  /* ---------------------------------------------------------
     Init
     --------------------------------------------------------- */
  const initForge = () => {
    // Legacy controller is intentionally mounted once. This prevents duplicate
    // event listeners during Vite/HMR development and keeps auth/navigation stable.
    if (window.__FORGE_INITIALIZED__) return;
    window.__FORGE_INITIALIZED__ = true;

    applyAppearance();
    initAuth();
    initPasswordToggles();
    initNav();
    initModals();
    initMealForm();
    initWorkoutForm();
    initWeightForm();
    initGoalsForm();
    initQuickAddMeals();
    initWorkoutCategories();
    initStreakPopover();
    initBmiCard();
    initWaterTracker();
    initSleepForm();
    initOnboarding();
    initSettings();

    tryRestoreSession();
  };

  // React mounts the original markup before loading this legacy controller.
  // Run immediately when DOMContentLoaded has already fired.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initForge, { once: true });
  } else {
    initForge();
  }
})();
