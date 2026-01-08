import "./style.css";

type QuestTask = {
  id: string;
  name: string;
  value: number;
  max: number;
  step: number;     // how much + does
  unit?: string;
};

let level = 1;
let xp = 0;
let xpToNextLevel = 100;
let dailyStreak = 0;
let lastCompletedDate: string | null = null;
let statPoints = 0;
let strength = 0;
let agility = 0;
let vitality = 0;
let intelligence = 0;
let perception = 0;
let showStatHelp = false;

function getPlayerTitle(): string {
  if (level < 1) return "Unranked";
  if (level < 10) return "E-Rank Hunter";
  if (level < 20) return "D-Rank Hunter";
  if (level < 35) return "C-Rank Hunter";
  if (level < 50) return "B-Rank Hunter";
  if (level < 80) return "A-Rank Hunter";
  if (level < 100) return "S-Rank Hunter";
  return "Awakened";
}

function toggleStatHelp() {
  showStatHelp = !showStatHelp;
  render();
}

type SaveData = {
  level: number;
  xp: number;
  xpToNextLevel: number;
  statPoints: number;
  dailyStreak: number;
  lastCompletedDate: string | null;

  stats: {
    strength: number;
    agility: number;
    vitality: number;
    intelligence: number;
    perception: number;
  };

  tasks: {
    id: string;
    value: number;
  }[];

  date: string;
};

const SAVE_KEY = "solo_leveling_save";

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function resetGame() {
  if (!confirm("Reset ALL progress?")) return;

  localStorage.removeItem(SAVE_KEY);

  // Reset player core
  level = 1;
  xp = 0;
  xpToNextLevel = 100;
  dailyStreak = 0;
  lastCompletedDate = null;

  // Reset stats
  statPoints = 0;
  strength = 0;
  agility = 0;
  vitality = 0;
  intelligence = 0;
  perception = 0;

  // Reset tasks
  tasks.forEach(t => (t.value = 0));

  saveGame();
  render();
}

function triggerXPFlame() {
  requestAnimationFrame(() => {
    const bar = document.querySelector<HTMLElement>(".xp-bar");
    if (!bar) return;

    bar.classList.remove("active");
    void bar.offsetWidth;
    bar.classList.add("active");
  });
}

function triggerScreenShake() {
  const panel = document.querySelector(".quest-panel");
  if (!panel) return;

  panel.classList.remove("shake");
  (panel as HTMLElement).offsetWidth;
  panel.classList.add("shake");
}

function shouldShowTimer(): boolean {
  return !allTasksCompleted();
}

function strengthMultiplier() {
  return 1 + strength / (strength + 50);
}

function intelligenceMultiplier() {
  return 1 - intelligence / (intelligence + 200);
}

function vitalityPenaltyMultiplier() {
  return 1 / (1 + vitality / 25);
}

function perceptionBonus() {
  return perception / (perception + 100);
}

function statRow(label: string, value: number, key: string) {
  return `
    <div class="stat-row">
      <span>${label}: ${value}</span>
      <button ${statPoints <= 0 ? "disabled" : ""}
        onclick="window.addStat('${key}')">+</button>
    </div>
  `;
}

function saveGame() {
  const data: SaveData = {
    level,
    xp,
    xpToNextLevel,
    dailyStreak,
    lastCompletedDate,
    statPoints,

    stats: {
      strength,
      agility,
      vitality,
      intelligence,
      perception
    },

    tasks: tasks.map(t => ({
      id: t.id,
      value: t.value
    })),

    date: getToday()
  };

  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return;

  try {
    const data: SaveData = JSON.parse(raw);

    // New day → reset tasks, keep level & XP
if (data.date !== getToday()) {
  // New day started

  const completedYesterday = data.tasks.every(
    t => t.value >= (tasks.find(x => x.id === t.id)?.max ?? Infinity)
  );

  statPoints = data.statPoints ?? 0;

if (data.stats) {
  strength = data.stats.strength ?? 0;
  agility = data.stats.agility ?? 0;
  vitality = data.stats.vitality ?? 0;
  intelligence = data.stats.intelligence ?? 0;
  perception = data.stats.perception ?? 0;
}

  if (completedYesterday) {
    // SUCCESS → increase streak
    dailyStreak++;
    lastCompletedDate = data.date;
  } else {
    // FAILURE → reset streak + penalty
    applyStreakPenalty();
    lastCompletedDate = null;
  }

  // Reset tasks for today
  tasks.forEach(t => (t.value = 0));
  saveGame();
  return;
}

    level = data.level;
    xp = data.xp;
    xpToNextLevel = data.xpToNextLevel;
    statPoints = data.statPoints ?? 0;

if (data.stats) {
  strength = data.stats.strength ?? 0;
  agility = data.stats.agility ?? 0;
  vitality = data.stats.vitality ?? 0;
  intelligence = data.stats.intelligence ?? 0;
  perception = data.stats.perception ?? 0;
}

    dailyStreak = data.dailyStreak ?? 0;
    lastCompletedDate = data.lastCompletedDate ?? null;

    data.tasks.forEach(savedTask => {
      const task = tasks.find(t => t.id === savedTask.id);
      if (task) task.value = savedTask.value;
    });
  } catch {
    console.warn("Save file corrupted, resetting.");
    localStorage.removeItem(SAVE_KEY);
  }
}

function addStat(stat: string) {
  if (statPoints <= 0) return;

  switch (stat) {
    case "str": strength++; break;
    case "agi": agility++; break;
    case "vit": vitality++; break;
    case "int": intelligence++; break;
    case "per": perception++; break;
  }

  statPoints--;
  saveGame();
  render();
}

function gainXP(amount: number) {
  let leveledUp = false;
  const beforeTitle = getPlayerTitle();

    // Strength bonus
  amount *= strengthMultiplier();

  // Perception chance (small XP only)
  if (Math.random() < perceptionBonus()) {
    amount *= 2;
  }

  xp += amount;

  while (xp >= xpToNextLevel) {
    xp -= xpToNextLevel;
    level++;
    xpToNextLevel = Math.floor(
  xpToNextLevel * 1.2 * intelligenceMultiplier()
);
    statPoints += 3;
    leveledUp = true;
  }

  saveGame();
  render();

  if (leveledUp) {
    requestAnimationFrame(() => {
      triggerLevelUpFlame();
      triggerScreenShake();

      const afterTitle = getPlayerTitle();
      if (beforeTitle !== afterTitle) {
        triggerRankUpAnimation(afterTitle);
      }
    });
  }
}

function removeXP(amount: number) {
  xp -= amount;

  while (xp < 0 && level > 1) {
    level--;
    statPoints = Math.max(statPoints - 3, 0);
    xpToNextLevel = Math.floor(xpToNextLevel / 1.2);
    xp += xpToNextLevel;
  }

  if (xp < 0) xp = 0;

  saveGame();
}

function applyStreakPenalty() {
let penalty = Math.floor(
  (xpToNextLevel / 2) * vitalityPenaltyMultiplier()
);
  xp -= penalty;

  while (xp < 0 && level > 1) {
    level--;
    statPoints = Math.max(statPoints - 3, 0);
    xpToNextLevel = Math.floor(xpToNextLevel / 1.2);
    xp += xpToNextLevel;
  }

  if (xp < 0) xp = 0;
  if (level < 1) level = 1;

  dailyStreak = 0;
}

function triggerRankUpAnimation(newTitle: string) {
  const overlay = document.createElement("div");
  overlay.className = "rank-up-overlay";

  overlay.innerHTML = `
    <div class="rank-up-text">
      <div class="rank-label">RANK UP</div>
      <div class="rank-title">${newTitle}</div>
    </div>
  `;

  document.body.appendChild(overlay);

  setTimeout(() => {
    overlay.classList.add("show");
  }, 50);

  setTimeout(() => {
    overlay.classList.remove("show");
    setTimeout(() => overlay.remove(), 500);
  }, 1800);
}

function completeQuest() {
  if (!allTasksCompleted()) return;

  gainXP(500);
  alert("Daily Quest Complete!");
}

const tasks: QuestTask[] = [
  { id: "pushups", name: "Push-ups", value: 0, max:100, step: 5 },
  { id: "situps", name: "Sit-ups", value: 0, max: 100, step: 5 },
  { id: "squats", name: "Squats", value: 0, max: 100, step: 5 },
];

function getSecondsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  return Math.floor((midnight.getTime() - now.getTime()) / 1000);
}

let remainingSeconds = getSecondsUntilMidnight();

setInterval(() => {
  remainingSeconds = getSecondsUntilMidnight();
  render();
}, 1000);

const app = document.querySelector<HTMLDivElement>("#app")!;

function formatTime(seconds: number) {
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function allTasksCompleted() {
  return tasks.every(t => t.value >= t.max);
}

function decrementTask(id: string) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  const before = task.value;
  task.value = Math.max(task.value - task.step, 0);

  if (task.value < before) {
    removeXP(50);
  }

  saveGame();
  render();
}

function incrementTask(id: string) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  if (task.value >= task.max) return;

  const before = task.value;
  task.value = Math.min(task.value + task.step, task.max);

  // XP only if progress actually increased
  if (task.value > before) {
    gainXP(50);
    triggerXPFlame();
  }

  saveGame();
  render();
}

function triggerLevelUpFlame() {
  const bar = document.querySelector(".xp-bar");
  if (!bar) return;

  bar.classList.remove("level-up");
  (bar as HTMLElement).offsetWidth; // ✅ correct
  bar.classList.add("level-up");
}

function render() {
  app.innerHTML = `
    <div class="quest-panel">
      <h1>QUEST INFO</h1>
      <p class="subtitle">[Daily Quest: Player Training has arrived]</p>

<div class="xp-bar">
  <div 
    class="xp-fill" 
    style="width: ${(xp / xpToNextLevel) * 100}%"
  ></div>

  <!-- XP gain flame -->
  <div class="xp-flame"></div>

  <!-- LEVEL UP flame -->
  <div class="level-up-flame"></div>
</div>

      <div class="player-info">
      <div>LEVEL ${level}</div>
      <div class="title">${getPlayerTitle()}</div>
      <div class="xp">
  XP: ${Math.floor(xp)} / ${Math.floor(xpToNextLevel)}
</div>
      <div class="streak">🔥 Streak: ${dailyStreak}</div>
      </div>

      <div class="goal-box">
        <h2>GOAL</h2>
        ${tasks
          .map(
            t => `
          <div class="task">
            <span>${t.name}</span>
            <span>[${Math.floor(t.value)}/${t.max}${t.unit ?? ""}]</span>
           <div class="task-controls">
  <button onclick="window.decrementTask('${t.id}')">−</button>
  <button onclick="window.incrementTask('${t.id}')">+</button>
</div>
          </div>
        `
          )
          .join("")}
      </div>

<div class="stats goal-box">
  <div class="stats-header">
    <h2>STATS</h2>
    <button class="help-btn" onclick="window.toggleStatHelp()">❓</button>
  </div>

  <p class="stat-points">Available Points: ${statPoints}</p>

  ${
    showStatHelp
      ? `
        <div class="stat-help">
          <h3>Stat Effects</h3>

          <p><strong>💪 Strength</strong><br>
          Increases XP gained from workouts.</p>

          <p><strong>👟 Agility</strong><br>
          Increases streak bonuses and future action speed.</p>

          <p><strong>❤️ Vitality</strong><br>
          Reduces XP lost when missing a day.</p>

          <p><strong>🧠 Intelligence</strong><br>
          Improves XP scaling per level.</p>

          <p><strong>👁️ Perception</strong><br>
          Chance to gain double XP.</p>
        </div>
      `
      : ""
  }

  ${statRow("💪Strength", strength, "str")}
  ${statRow("👟Agility", agility, "agi")}
  ${statRow("❤️Vitality", vitality, "vit")}
  ${statRow("🧠Intelligence", intelligence, "int")}
  ${statRow("👁️Perception", perception, "per")}

</div>

<button
  class="complete"
  ${allTasksCompleted() ? "" : "disabled"}
  onclick="window.completeQuest()"
>
  COMPLETE QUEST
</button>


${
  shouldShowTimer()
    ? `
      <p class="warning">
        WARNING: Failure to complete the daily quest will result in a penalty.
      </p>
    `
    : ``
}


      ${
  shouldShowTimer()
    ? `<div class="timer">${formatTime(remainingSeconds)}</div>`
    : `<div class="timer complete-msg">DAILY QUEST COMPLETE</div>`
}
    </div>

    <button class="reset" onclick="window.resetGame()">
    RESET (DEV)
    </button>
  `;
}

// expose function for buttons
(window as any).incrementTask = incrementTask;
(window as any).resetGame = resetGame;
(window as any).decrementTask = decrementTask;
(window as any).completeQuest = completeQuest;
(window as any).addStat = addStat;
(window as any).toggleStatHelp = toggleStatHelp;

loadGame();
render();
