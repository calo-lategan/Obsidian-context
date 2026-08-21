import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════
// CLAUDE HIVE — HD-2D Style AI Agent Pixel Office
// Octopath Traveler inspired: pixel sprites + depth + bloom + lighting
// ═══════════════════════════════════════════════════════════════

const TILE = 24;
const MAP_W = 36;
const MAP_H = 26;
const SCALE = 2;
const CANVAS_W = MAP_W * TILE;
const CANVAS_H = MAP_H * TILE;

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function lerp(a, b, t) { return a + (b - a) * Math.min(1, t); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ─── PALETTE ───
const PAL = {
  bg: "#0c0e1a",
  floorWarm: "#2a2440",
  floorCool: "#231f3a",
  floorHighlight: "#352e52",
  carpet: "#2e1a3a",
  carpetLight: "#3d2850",
  wallBase: "#1a1830",
  wallMid: "#252248",
  wallTop: "#302a5a",
  wallTrim: "#c9a44a",
  woodDark: "#3a2210",
  woodMid: "#5c3a1a",
  woodLight: "#8b6830",
  woodHighlight: "#b89050",
  deskSurface: "#6b4a28",
  deskEdge: "#4a3018",
  monitor: "#0a0c14",
  screenGlow: "#00e89a",
  screenBlue: "#4488ff",
  screenAmber: "#ffaa22",
  chairDark: "#2a2a3a",
  chairMid: "#3d3d55",
  glass: "#88bbff",
  glassDark: "#446688",
  gold: "#ffd700",
  goldDark: "#b8960a",
  plantGreen: "#2a8a4a",
  plantDark: "#1a5a2a",
  plantBright: "#40c868",
  potTerra: "#8a4a2a",
  bookRed: "#aa2233",
  bookBlue: "#2244aa",
  bookGreen: "#227744",
  bookGold: "#aa8822",
  lampWarm: "#ffe4a0",
  lampGlow: "#fff4d0",
  shadow: "rgba(0,0,0,0.4)",
  meetingWall: "#1e1a38",
  breakWall: "#1e2a1e",
  homeBase: "#181828",
  pathStone: "#2a283a",
  pathLight: "#3a3650",
  grass: "#1a2a1a",
  grassLight: "#223a1e",
  sky: "#0a1628",
  star: "#ffffff",
  ambient: "rgba(200,160,255,0.02)",
};

// ─── AGENT DATA ───
const AGENTS = [
  { id: "cowork", name: "Chief", role: "CEO / Manager", color: "#ffd700", accent: "#e6a800", skin: "#ffcc88", hair: "#8a5a2a", emoji: "👑", homeX: 2, homeY: 20, deskX: 4, deskY: 6, personality: "Strategic visionary who sees the big picture" },
  { id: "claude-code", name: "Apex", role: "CTO / Supervisor", color: "#4a9eff", accent: "#2a6ecc", skin: "#eebb99", hair: "#2a2a3a", emoji: "🔧", homeX: 6, homeY: 20, deskX: 8, deskY: 6, personality: "Technical genius, tracks every detail" },
  { id: "researcher", name: "Archie", role: "Lead Researcher", color: "#b066ff", accent: "#8844cc", skin: "#ddaa88", hair: "#5a2a6a", emoji: "🔬", homeX: 10, homeY: 20, deskX: 12, deskY: 6, personality: "Endlessly curious, reads everything" },
  { id: "builder", name: "Pixel", role: "Senior Builder", color: "#ff5566", accent: "#cc2244", skin: "#ffcc99", hair: "#cc4422", emoji: "🏗️", homeX: 14, homeY: 20, deskX: 4, deskY: 10, personality: "Ships fast, builds with passion" },
  { id: "tester", name: "Bugsy", role: "QA Lead", color: "#44dd88", accent: "#22aa55", skin: "#ddbb99", hair: "#446633", emoji: "🧪", homeX: 18, homeY: 20, deskX: 8, deskY: 10, personality: "Nothing escapes Bugsy's review" },
  { id: "designer", name: "Palette", role: "Creative Director", color: "#ff66aa", accent: "#cc3388", skin: "#ffddbb", hair: "#ff88aa", emoji: "🎨", homeX: 22, homeY: 20, deskX: 12, deskY: 10, personality: "Makes everything beautiful" },
  { id: "skill-creator", name: "Sage", role: "Skill Architect", color: "#44ccdd", accent: "#2299aa", skin: "#eeccaa", hair: "#ffffff", emoji: "📚", homeX: 26, homeY: 20, deskX: 16, deskY: 6, personality: "Meta-learner, distills wisdom" },
  { id: "plugin-dev", name: "Forge", role: "Plugin Engineer", color: "#ff9933", accent: "#cc7722", skin: "#ddaa77", hair: "#885522", emoji: "🔌", homeX: 30, homeY: 20, deskX: 16, deskY: 10, personality: "Integration master, builds bridges" },
  { id: "scheduler", name: "Tempo", role: "Operations Lead", color: "#7788aa", accent: "#556688", skin: "#ccbb99", hair: "#3a3a4a", emoji: "📅", homeX: 2, homeY: 23, deskX: 20, deskY: 6, personality: "Keeps the trains running on time" },
  { id: "archivist", name: "Recall", role: "Knowledge Manager", color: "#aa8855", accent: "#887744", skin: "#ddbbaa", hair: "#554433", emoji: "🗄️", homeX: 6, homeY: 23, deskX: 20, deskY: 10, personality: "Remembers everything, documents it all" },
];

const ACTIVITIES = {
  working: ["Writing code...", "Reviewing PR...", "Debugging issue...", "Designing component...", "Creating skill...", "Building plugin...", "Running tests...", "Researching docs..."],
  meeting: ["Sprint planning", "Code review sync", "Brainstorming session", "Architecture review", "Team standup"],
  break: ["Coffee break ☕", "Reading articles", "Chatting with team", "Quick stretch"],
  learning: ["Reading papers 📄", "Building new skill", "Studying patterns", "Exploring new tech"],
  traveling: ["Walking..."],
  resting: ["💤 Sleeping...", "💤 Resting at home...", "💤 Recharging..."],
};

// ─── DRAW HELPERS ───
function drawPixelRect(ctx, x, y, w, h, color, shadowSize = 0) {
  if (shadowSize > 0) {
    ctx.fillStyle = PAL.shadow;
    ctx.fillRect(x + shadowSize, y + shadowSize, w, h);
  }
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawGlowRect(ctx, x, y, w, h, color, glowColor, glowSize = 8) {
  ctx.save();
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = glowSize;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function drawWoodPlank(ctx, x, y, w, h, dark, light) {
  ctx.fillStyle = dark;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = light;
  ctx.fillRect(x, y, w, 1);
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(x, y + h - 1, w, 1);
}

// ─── FURNITURE RENDERERS ───
function drawDesk(ctx, x, y) {
  // Desk legs
  drawPixelRect(ctx, x + 2, y + 14, 3, 10, PAL.deskEdge);
  drawPixelRect(ctx, x + 40, y + 14, 3, 10, PAL.deskEdge);
  // Desk surface
  drawPixelRect(ctx, x, y + 10, 45, 6, PAL.deskEdge);
  drawPixelRect(ctx, x + 1, y + 10, 43, 4, PAL.deskSurface);
  drawPixelRect(ctx, x + 1, y + 10, 43, 1, PAL.woodHighlight);
  // Monitor stand
  drawPixelRect(ctx, x + 18, y + 5, 8, 6, PAL.chairDark);
  drawPixelRect(ctx, x + 20, y + 8, 4, 3, PAL.chairMid);
  // Monitor
  drawPixelRect(ctx, x + 8, y - 6, 28, 14, PAL.monitor, 2);
  drawPixelRect(ctx, x + 9, y - 5, 26, 12, PAL.monitor);
  // Screen content (glowing)
  const screenColors = [PAL.screenGlow, PAL.screenBlue, PAL.screenAmber];
  const sc = screenColors[Math.floor((x * 7 + y * 13) % 3)];
  drawGlowRect(ctx, x + 10, y - 4, 24, 10, sc + "22", sc, 12);
  // Code lines on screen
  ctx.fillStyle = sc + "88";
  for (let i = 0; i < 4; i++) {
    const lw = 6 + ((x * 3 + i * 7) % 14);
    ctx.fillRect(x + 12, y - 3 + i * 2.5, lw, 1);
  }
}

function drawChair(ctx, x, y, agentColor) {
  // Chair base
  drawPixelRect(ctx, x, y + 8, 14, 4, PAL.chairDark);
  drawPixelRect(ctx, x + 1, y + 8, 12, 3, PAL.chairMid);
  // Chair back
  drawPixelRect(ctx, x + 1, y, 12, 10, agentColor + "44");
  drawPixelRect(ctx, x + 2, y + 1, 10, 8, agentColor + "33");
  // Wheels
  ctx.fillStyle = PAL.chairDark;
  ctx.fillRect(x + 2, y + 12, 3, 2);
  ctx.fillRect(x + 9, y + 12, 3, 2);
}

function drawMeetingTable(ctx, x, y) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(x + 3, y + 3, 96, 56);
  // Table legs
  const legColor = PAL.woodDark;
  drawPixelRect(ctx, x + 6, y + 44, 4, 12, legColor);
  drawPixelRect(ctx, x + 86, y + 44, 4, 12, legColor);
  drawPixelRect(ctx, x + 6, y + 4, 4, 12, legColor);
  drawPixelRect(ctx, x + 86, y + 4, 4, 12, legColor);
  // Table surface
  drawPixelRect(ctx, x, y, 96, 52, PAL.woodDark);
  drawPixelRect(ctx, x + 2, y + 2, 92, 48, PAL.woodMid);
  drawPixelRect(ctx, x + 4, y + 4, 88, 44, PAL.deskSurface);
  // Wood grain highlights
  ctx.fillStyle = PAL.woodHighlight + "33";
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(x + 8, y + 8 + i * 9, 80, 1);
  }
  // Center decoration
  ctx.fillStyle = PAL.gold + "22";
  ctx.fillRect(x + 30, y + 16, 36, 20);
}

function drawBookshelf(ctx, x, y) {
  // Frame
  drawPixelRect(ctx, x, y, 28, 44, PAL.woodDark, 2);
  drawPixelRect(ctx, x + 1, y + 1, 26, 42, PAL.woodMid);
  // Shelves
  for (let s = 0; s < 3; s++) {
    const sy = y + 4 + s * 14;
    drawPixelRect(ctx, x + 1, sy + 12, 26, 2, PAL.woodDark);
    // Books
    const bookColors = [PAL.bookRed, PAL.bookBlue, PAL.bookGreen, PAL.bookGold, "#664488", "#448866"];
    for (let b = 0; b < 5; b++) {
      const bx = x + 3 + b * 5;
      const bh = 8 + (b * 3 + s * 7) % 4;
      ctx.fillStyle = bookColors[(b + s * 3) % bookColors.length];
      ctx.fillRect(bx, sy + 12 - bh, 4, bh);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(bx, sy + 12 - bh, 1, bh);
    }
  }
}

function drawPlant(ctx, x, y, size = 1) {
  const s = size;
  // Pot
  drawPixelRect(ctx, x - 4 * s, y + 4 * s, 10 * s, 8 * s, PAL.potTerra);
  drawPixelRect(ctx, x - 5 * s, y + 3 * s, 12 * s, 3 * s, PAL.potTerra);
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(x - 4 * s, y + 4 * s, 2 * s, 6 * s);
  // Leaves
  const leafColors = [PAL.plantDark, PAL.plantGreen, PAL.plantBright];
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const lx = x + Math.cos(angle) * 7 * s;
    const ly = y - 4 * s + Math.sin(angle) * 5 * s;
    ctx.fillStyle = leafColors[i % 3];
    ctx.beginPath();
    ctx.ellipse(lx, ly, 5 * s, 3 * s, angle, 0, Math.PI * 2);
    ctx.fill();
  }
  // Center
  ctx.fillStyle = PAL.plantBright;
  ctx.beginPath();
  ctx.arc(x, y - 5 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();
}

function drawLamp(ctx, x, y, on = true) {
  // Pole
  drawPixelRect(ctx, x, y + 8, 2, 20, PAL.goldDark);
  // Base
  drawPixelRect(ctx, x - 4, y + 28, 10, 3, PAL.goldDark);
  // Shade
  drawPixelRect(ctx, x - 6, y, 14, 10, on ? PAL.lampWarm : PAL.chairDark);
  if (on) {
    drawGlowRect(ctx, x - 6, y, 14, 10, PAL.lampWarm + "88", PAL.lampWarm, 20);
    // Light cone
    ctx.fillStyle = "rgba(255,228,160,0.06)";
    ctx.beginPath();
    ctx.moveTo(x - 6, y + 10);
    ctx.lineTo(x + 8, y + 10);
    ctx.lineTo(x + 20, y + 40);
    ctx.lineTo(x - 18, y + 40);
    ctx.fill();
  }
}

function drawCoffeeMachine(ctx, x, y) {
  drawPixelRect(ctx, x, y, 18, 24, "#3a3a4a", 2);
  drawPixelRect(ctx, x + 1, y + 1, 16, 22, "#4a4a5a");
  // Display
  drawGlowRect(ctx, x + 3, y + 3, 12, 6, "#112211", "#22ff44", 4);
  ctx.fillStyle = "#22ff44";
  ctx.fillRect(x + 5, y + 5, 3, 2);
  ctx.fillRect(x + 9, y + 5, 4, 2);
  // Buttons
  ctx.fillStyle = "#ff4444";
  ctx.fillRect(x + 4, y + 12, 3, 3);
  ctx.fillStyle = "#44ff44";
  ctx.fillRect(x + 9, y + 12, 3, 3);
  // Cup area
  ctx.fillStyle = "#2a2a3a";
  ctx.fillRect(x + 3, y + 17, 12, 5);
  // Cup
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x + 7, y + 18, 5, 4);
  ctx.fillStyle = "#8b5a2a";
  ctx.fillRect(x + 8, y + 18, 3, 2);
}

function drawWindow(ctx, x, y, w, h, timeOfDay) {
  // Frame
  drawPixelRect(ctx, x - 2, y - 2, w + 4, h + 4, PAL.wallTrim);
  drawPixelRect(ctx, x, y, w, h, PAL.glassDark);
  // Sky through window
  const skyColors = { morning: "#4466aa", afternoon: "#6688cc", evening: "#1a2244" };
  ctx.fillStyle = skyColors[timeOfDay] || skyColors.afternoon;
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  // Light rays
  if (timeOfDay !== "evening") {
    ctx.fillStyle = "rgba(255,220,150,0.15)";
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  }
  // Cross frame
  ctx.fillStyle = PAL.wallTrim;
  ctx.fillRect(x + w / 2 - 1, y, 2, h);
  ctx.fillRect(x, y + h / 2 - 1, w, 2);
  // Light spill on floor
  if (timeOfDay !== "evening") {
    ctx.fillStyle = "rgba(255,220,150,0.04)";
    const spread = 30;
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w + spread, y + h + 60);
    ctx.lineTo(x - spread, y + h + 60);
    ctx.fill();
  }
}

// ─── PIXEL CHARACTER RENDERER ───
function drawAgent(ctx, agent, tick, isSelected) {
  const bx = Math.round(agent.x);
  const by = Math.round(agent.y);
  const bob = Math.sin((tick + agent.bobOffset) * 0.12) * 1.2;
  const walking = Math.abs(agent.targetX - agent.x) > 3 || Math.abs(agent.targetY - agent.y) > 3;
  const walkCycle = Math.sin(tick * 0.35) * 2.5;

  // Shadow (elliptical, soft)
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(bx, by + 16, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const cy = by + bob;

  // ── BODY ──
  // Torso
  ctx.fillStyle = agent.color;
  ctx.fillRect(bx - 6, cy - 2, 12, 10);
  // Shirt detail
  ctx.fillStyle = agent.accent;
  ctx.fillRect(bx - 6, cy - 2, 12, 2);
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(bx - 1, cy - 2, 2, 10);

  // Arms
  const armSwing = walking ? walkCycle : 0;
  ctx.fillStyle = agent.skin;
  ctx.fillRect(bx - 9, cy + armSwing, 3, 8);
  ctx.fillRect(bx + 6, cy - armSwing, 3, 8);

  // ── LEGS ──
  ctx.fillStyle = "#2a2a3a";
  if (walking) {
    ctx.fillRect(bx - 4, cy + 8 + walkCycle, 4, 7);
    ctx.fillRect(bx + 1, cy + 8 - walkCycle, 4, 7);
  } else {
    ctx.fillRect(bx - 4, cy + 8, 4, 7);
    ctx.fillRect(bx + 1, cy + 8, 4, 7);
  }
  // Shoes
  ctx.fillStyle = agent.accent;
  if (walking) {
    ctx.fillRect(bx - 5, cy + 14 + walkCycle, 5, 2);
    ctx.fillRect(bx + 1, cy + 14 - walkCycle, 5, 2);
  } else {
    ctx.fillRect(bx - 5, cy + 14, 5, 2);
    ctx.fillRect(bx + 1, cy + 14, 5, 2);
  }

  // ── HEAD ──
  // Hair back
  ctx.fillStyle = agent.hair;
  ctx.fillRect(bx - 7, cy - 16, 14, 6);
  // Head/face
  ctx.fillStyle = agent.skin;
  ctx.fillRect(bx - 6, cy - 14, 12, 13);
  // Hair front
  ctx.fillStyle = agent.hair;
  ctx.fillRect(bx - 7, cy - 17, 14, 5);
  // Hair sides
  ctx.fillRect(bx - 7, cy - 14, 2, 4);
  ctx.fillRect(bx + 5, cy - 14, 2, 4);

  // Eyes
  const ed = agent.direction;
  const ex = ed === 1 ? 1 : ed === 3 ? -1 : 0;
  // Eye whites
  ctx.fillStyle = "#fff";
  ctx.fillRect(bx - 4 + ex, cy - 10, 3, 3);
  ctx.fillRect(bx + 1 + ex, cy - 10, 3, 3);
  // Pupils
  ctx.fillStyle = "#1a1a2a";
  ctx.fillRect(bx - 3 + ex, cy - 9, 2, 2);
  ctx.fillRect(bx + 2 + ex, cy - 9, 2, 2);
  // Eye shine
  ctx.fillStyle = "#fff";
  ctx.fillRect(bx - 3 + ex, cy - 10, 1, 1);
  ctx.fillRect(bx + 2 + ex, cy - 10, 1, 1);
  // Mouth
  ctx.fillStyle = agent.mood > 70 ? "#ee8877" : "#aa7766";
  ctx.fillRect(bx - 2, cy - 5, 4, 1);
  if (agent.mood > 80) {
    ctx.fillRect(bx - 1, cy - 4, 2, 1);
  }

  // ── STATUS INDICATOR ──
  const statusConfig = {
    working: { icon: "💻", color: "#44dd88", glow: "#22aa55" },
    meeting: { icon: "🗣", color: "#4499ff", glow: "#2266cc" },
    break: { icon: "☕", color: "#ffaa33", glow: "#cc8822" },
    learning: { icon: "📖", color: "#bb66ff", glow: "#8833cc" },
    traveling: { icon: "🚶", color: "#888", glow: "#555" },
    resting: { icon: "💤", color: "#6666aa", glow: "#4444aa" },
  };
  const sc = statusConfig[agent.status] || statusConfig.working;

  // Floating bubble
  const bubbleY = cy - 26 + Math.sin(tick * 0.06) * 1.5;
  ctx.save();
  ctx.shadowColor = sc.glow;
  ctx.shadowBlur = 6;
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.beginPath();
  ctx.roundRect(bx - 9, bubbleY - 4, 18, 11, 3);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = sc.color;
  ctx.font = "8px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(sc.icon, bx, bubbleY + 5);
  ctx.textAlign = "left";

  // ── NAME TAG ──
  ctx.font = "bold 7px monospace";
  const nw = ctx.measureText(agent.name).width + 6;
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.beginPath();
  ctx.roundRect(bx - nw / 2, by + 18, nw, 10, 2);
  ctx.fill();
  ctx.fillStyle = agent.color;
  ctx.textAlign = "center";
  ctx.fillText(agent.name, bx, by + 26);
  // Level badge
  ctx.fillStyle = PAL.gold;
  ctx.font = "bold 6px monospace";
  ctx.fillText(`Lv${agent.level}`, bx, by + 33);
  ctx.textAlign = "left";

  // ── SELECTION RING ──
  if (isSelected) {
    ctx.save();
    ctx.strokeStyle = PAL.gold;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = PAL.gold;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(bx, by + 8, 14, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// ─── HOME RENDERER ───
function drawHome(ctx, agent, timeOfDay) {
  const hx = agent.homeX * TILE;
  const hy = agent.homeY * TILE;

  // Foundation shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(hx - 2, hy + TILE + 4, TILE * 2 + 8, 6);

  // House body
  drawPixelRect(ctx, hx, hy + 6, TILE * 2 + 4, TILE + 2, PAL.homeBase);
  drawPixelRect(ctx, hx + 1, hy + 7, TILE * 2 + 2, TILE, "#222238");

  // Roof
  ctx.fillStyle = agent.color;
  ctx.beginPath();
  ctx.moveTo(hx - 4, hy + 8);
  ctx.lineTo(hx + TILE + 2, hy - 8);
  ctx.lineTo(hx + TILE * 2 + 8, hy + 8);
  ctx.fill();
  ctx.fillStyle = agent.accent;
  ctx.beginPath();
  ctx.moveTo(hx - 4, hy + 8);
  ctx.lineTo(hx + TILE + 2, hy - 4);
  ctx.lineTo(hx + TILE * 2 + 8, hy + 8);
  ctx.fill();

  // Roof edge
  ctx.fillStyle = agent.color;
  ctx.fillRect(hx - 6, hy + 6, TILE * 2 + 16, 3);

  // Door
  drawPixelRect(ctx, hx + TILE - 2, hy + TILE - 8, 10, 16, PAL.woodMid);
  drawPixelRect(ctx, hx + TILE - 1, hy + TILE - 7, 8, 14, PAL.woodLight);
  ctx.fillStyle = PAL.gold;
  ctx.fillRect(hx + TILE + 5, hy + TILE, 2, 2);

  // Windows (glow when learning)
  const isHome = agent.status === "learning" || agent.status === "resting";
  const windowGlow = isHome ? (agent.status === "resting" ? "#4444aa" : PAL.lampWarm) : (timeOfDay === "evening" ? "#223344" : PAL.glass);
  drawPixelRect(ctx, hx + 4, hy + 12, 12, 10, "#1a1a2a");
  drawGlowRect(ctx, hx + 5, hy + 13, 10, 8, windowGlow + (isHome ? "cc" : "44"), isHome ? PAL.lampWarm : "transparent", isHome ? 10 : 0);
  ctx.fillStyle = agent.color + "44";
  ctx.fillRect(hx + 5 + 4, hy + 13, 1, 8);
  ctx.fillRect(hx + 5, hy + 13 + 3, 10, 1);

  drawPixelRect(ctx, hx + TILE + 10, hy + 12, 12, 10, "#1a1a2a");
  drawGlowRect(ctx, hx + TILE + 11, hy + 13, 10, 8, windowGlow + (isHome ? "cc" : "44"), isHome ? PAL.lampWarm : "transparent", isHome ? 10 : 0);

  // Nameplate
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(hx + 2, hy + TILE + 6, TILE * 2, 9);
  ctx.fillStyle = agent.color;
  ctx.font = "bold 6px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`${agent.emoji} ${agent.name}'s Home`, hx + TILE + 2, hy + TILE + 13);
  ctx.textAlign = "left";
}

// ─── PARTICLE SYSTEM ───
function createParticles() {
  const particles = [];
  for (let i = 0; i < 30; i++) {
    particles.push({
      x: Math.random() * CANVAS_W,
      y: Math.random() * CANVAS_H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -0.1 - Math.random() * 0.2,
      size: 1 + Math.random() * 2,
      alpha: 0.1 + Math.random() * 0.3,
      life: Math.random(),
    });
  }
  return particles;
}

export default function ClaudeHiveOffice() {
  const canvasRef = useRef(null);
  const particlesRef = useRef(createParticles());
  const [tick, setTick] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showDashboard, setShowDashboard] = useState(true);
  const [timeOfDay, setTimeOfDay] = useState("morning");
  const [speed, setSpeed] = useState(1);
  const [notifications, setNotifications] = useState([]);
  const [meetingInProgress, setMeetingInProgress] = useState(null);
  const [hivePaused, setHivePaused] = useState(false);
  const [dashTab, setDashTab] = useState("team"); // team | tasks | chat | meetings | projects
  const [chatLog, setChatLog] = useState(() => [
    { id: 1, from: "Chief", to: "all", text: "Good morning team! Let's crush it today.", time: "09:00", color: "#ffd700" },
    { id: 2, from: "Apex", to: "all", text: "Morning stand-up in 5. Bring your blockers.", time: "09:01", color: "#4a9eff" },
    { id: 3, from: "Archie", to: "Pixel", text: "Found a great pattern for the auth module.", time: "09:15", color: "#b066ff" },
    { id: 4, from: "Bugsy", to: "all", text: "Tests passing at 94%. Working on edge cases.", time: "09:22", color: "#44dd88" },
    { id: 5, from: "Sage", to: "all", text: "New skill draft ready: 'API Error Handling'", time: "09:30", color: "#44ccdd" },
  ]);
  const [meetingLog, setMeetingLog] = useState(() => [
    { id: 1, topic: "Sprint Planning — Week 12", attendees: ["Chief", "Apex", "Pixel", "Bugsy"], status: "completed", notes: "Defined 8 tasks. Pixel takes auth, Bugsy takes QA pipeline.", time: "09:00" },
    { id: 2, topic: "Architecture Review — DB Migration", attendees: ["Apex", "Forge", "Recall"], status: "completed", notes: "Decision: Use Convex for real-time state. Recall to document.", time: "10:30" },
    { id: 3, topic: "Skill Sharing — Prompt Engineering", attendees: ["Sage", "Archie", "Palette"], status: "upcoming", notes: "Sage presents new skill creation patterns.", time: "14:00" },
  ]);
  const [taskBoard, setTaskBoard] = useState(() => [
    { id: 1, title: "Build authentication module", assignee: "Pixel", status: "in_progress", priority: "high", project: "Project Alpha" },
    { id: 2, title: "Write QA test suite", assignee: "Bugsy", status: "in_progress", priority: "high", project: "Project Alpha" },
    { id: 3, title: "Design dashboard layout", assignee: "Palette", status: "todo", priority: "medium", project: "Project Alpha" },
    { id: 4, title: "Research vector DB options", assignee: "Archie", status: "done", priority: "medium", project: "Project Beta" },
    { id: 5, title: "Create API integration skill", assignee: "Sage", status: "in_progress", priority: "medium", project: "Project Alpha" },
    { id: 6, title: "Build Cowork bridge plugin", assignee: "Forge", status: "todo", priority: "high", project: "Infrastructure" },
    { id: 7, title: "Schedule weekly retros", assignee: "Tempo", status: "done", priority: "low", project: "Operations" },
    { id: 8, title: "Document architecture decisions", assignee: "Recall", status: "in_progress", priority: "medium", project: "Infrastructure" },
    { id: 9, title: "Set up CI/CD pipeline", assignee: "Apex", status: "todo", priority: "high", project: "Infrastructure" },
    { id: 10, title: "Plan resource allocation", assignee: "Chief", status: "in_progress", priority: "high", project: "Operations" },
  ]);
  const [projects] = useState(() => [
    { name: "Project Alpha", color: "#ff5566", progress: 42, tasks: 5, description: "Main product MVP — auth, dashboard, API" },
    { name: "Project Beta", color: "#4a9eff", progress: 15, tasks: 2, description: "Vector DB research & prototype" },
    { name: "Infrastructure", color: "#44ccdd", progress: 28, tasks: 3, description: "CI/CD, plugins, architecture docs" },
    { name: "Operations", color: "#ffd700", progress: 60, tasks: 2, description: "Scheduling, retros, resource planning" },
  ]);
  const [agentStates, setAgentStates] = useState(() =>
    AGENTS.map(a => ({
      ...a,
      x: a.deskX * TILE + TILE / 2,
      y: a.deskY * TILE + TILE / 2,
      targetX: a.deskX * TILE + TILE / 2,
      targetY: a.deskY * TILE + TILE / 2,
      status: "working",
      activity: rand(ACTIVITIES.working),
      mood: 80 + Math.floor(Math.random() * 20),
      energy: 65 + Math.floor(Math.random() * 35),
      xp: Math.floor(Math.random() * 500),
      level: 1 + Math.floor(Math.random() * 5),
      skillsCreated: Math.floor(Math.random() * 8),
      tasksCompleted: Math.floor(Math.random() * 30),
      direction: 0,
      frame: 0,
      bobOffset: Math.random() * Math.PI * 2,
    }))
  );

  // ─── SIMULATION ───
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => {
        const cycle = t % 900;
        if (cycle < 300) setTimeOfDay("morning");
        else if (cycle < 600) setTimeOfDay("afternoon");
        else setTimeOfDay("evening");
        return t + 1;
      });

      // Update particles
      particlesRef.current = particlesRef.current.map(p => {
        let np = { ...p };
        np.x += np.vx;
        np.y += np.vy;
        np.life -= 0.002;
        if (np.life <= 0 || np.y < -10) {
          np.x = Math.random() * CANVAS_W;
          np.y = CANVAS_H + 10;
          np.life = 1;
        }
        return np;
      });

      setAgentStates(prev => prev.map(agent => {
        let a = { ...agent };
        a.frame = (agent.frame + 1) % 60;

        // Always allow movement toward target (even when paused — they're going home)
        const dx = a.targetX - a.x;
        const dy = a.targetY - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 2) {
          a.x = lerp(a.x, a.targetX, 0.04 * speed);
          a.y = lerp(a.y, a.targetY, 0.04 * speed);
          if (a.status !== "resting" && a.status !== "traveling") a.status = "traveling";
          a.direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
        } else if (a.status === "resting") {
          // Stay resting, recover energy
          a.energy = clamp(a.energy + 0.3, 20, 100);
          a.mood = clamp(a.mood + 0.1, 40, 100);
        }

        // Don't do autonomous actions when paused
        if (hivePaused) return a;

        if (Math.random() < 0.003 * speed) {
          const statuses = ["working", "working", "working", "meeting", "break", "learning"];
          const ns = rand(statuses);
          a.status = ns;
          a.activity = rand(ACTIVITIES[ns]);
          if (ns === "working") {
            a.targetX = agent.deskX * TILE + TILE / 2;
            a.targetY = agent.deskY * TILE + TILE / 2;
          } else if (ns === "meeting") {
            a.targetX = (25 + Math.random() * 3) * TILE;
            a.targetY = (4 + Math.random() * 3) * TILE;
          } else if (ns === "break") {
            a.targetX = (25 + Math.random() * 4) * TILE;
            a.targetY = (12 + Math.random() * 2) * TILE;
          } else if (ns === "learning") {
            a.targetX = agent.homeX * TILE + TILE;
            a.targetY = agent.homeY * TILE + TILE;
            a.xp += Math.floor(Math.random() * 10);
          }
        }

        if (Math.random() < 0.01) {
          a.energy = clamp(a.energy + (a.status === "break" ? 3 : a.status === "learning" ? 2 : -1), 20, 100);
          a.mood = clamp(a.mood + (Math.random() > 0.35 ? 1 : -1), 40, 100);
        }
        if (Math.random() < 0.005 * speed && a.status === "working") {
          a.xp += Math.floor(Math.random() * 5) + 1;
          if (a.xp > a.level * 100) { a.level += 1; a.xp = 0; }
          if (Math.random() < 0.1) a.tasksCompleted += 1;
        }
        return a;
      }));

      if (!hivePaused && Math.random() < 0.001 * speed) {
        const topics = ["Sprint planning", "Architecture review", "Code review sync", "Skill sharing session", "Retrospective"];
        setMeetingInProgress(rand(topics));
        setTimeout(() => setMeetingInProgress(null), 8000 / speed);
      }

      // ─── SOCIAL INTERACTION ENGINE ───
      // Proximity-based conversations: agents in the same room interact
      if (!hivePaused && Math.random() < 0.008 * speed) {
        setAgentStates(prev => {
          // Find agents on break in the break room area
          const breakAgents = prev.filter(a => a.status === "break" && a.x > 23 * TILE && a.y > 10 * TILE && a.y < 16 * TILE);
          if (breakAgents.length >= 2) {
            const speaker = rand(breakAgents);
            const listener = rand(breakAgents.filter(a => a.id !== speaker.id));

            // Knowledge sharing conversations
            const coffeeConvos = [
              { msg: `${listener.name}, I found something interesting about ${rand(["caching", "error handling", "auth patterns", "state management"])}. Want to hear?`, response: `${speaker.name}, tell me! I've been stuck on something similar.` },
              { msg: `Has anyone looked into ${rand(["WebSocket pooling", "edge caching", "incremental builds", "type inference"])}? I think it could help the project.`, response: `Not yet, but that sounds useful. Can you write it up as a skill?` },
              { msg: `I just realized we should ${rand(["add rate limiting", "refactor the API layer", "split that service", "add better logging"])} before it becomes tech debt.`, response: `Good catch. Should we bring it up at the next standup?` },
              { msg: `☕ This coffee is great. Also, I learned that ${rand(["Convex supports vector search", "PixiJS 8 has WebGPU", "Clerk has org-level tokens", "Next.js 15 caches differently"])}.`, response: `Wait, really? That changes how we should approach the ${rand(["search feature", "rendering pipeline", "auth flow", "data layer"])}.` },
            ];
            const convo = rand(coffeeConvos);

            setChatLog(log => [...log.slice(-30),
              { id: Date.now(), from: speaker.name, to: listener.name, text: convo.msg, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), color: speaker.color },
              { id: Date.now() + 1, from: listener.name, to: speaker.name, text: convo.response, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), color: listener.color },
            ]);
          }

          // Meeting room conversations
          const meetingAgents = prev.filter(a => a.status === "meeting" && a.x > 23 * TILE && a.y < 9 * TILE);
          if (meetingAgents.length >= 2 && Math.random() < 0.3) {
            const speaker = rand(meetingAgents);
            const meetingMsgs = [
              `I think we should prioritize the ${rand(["auth module", "dashboard", "API integration", "test suite"])} this sprint.`,
              `My blocker is ${rand(["waiting on the design spec", "the API rate limit", "a flaky test", "unclear requirements"])}. Can anyone help?`,
              `I created a new skill for ${rand(["error boundaries", "form validation", "data fetching", "component patterns"])}. It's in the library now.`,
              `Looking at the metrics, our ${rand(["test coverage is at 78%", "build time dropped 30%", "API latency is under 200ms", "deployment is automated"])}.`,
            ];
            setChatLog(log => [...log.slice(-30), {
              id: Date.now(), from: speaker.name, to: "meeting", text: rand(meetingMsgs),
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), color: speaker.color,
            }]);
          }

          // "Anyone for coffee?" — sometimes IGNORED
          const workingAgents = prev.filter(a => a.status === "working");
          if (workingAgents.length >= 3 && Math.random() < 0.05) {
            const asker = rand(workingAgents);
            setChatLog(log => {
              const newLog = [...log.slice(-30), {
                id: Date.now(), from: asker.name, to: "all",
                text: rand(["Anyone want to grab coffee? ☕", "Break time? I need to stretch.", "Coffee run? I have ideas to discuss."]),
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), color: asker.color,
              }];

              // Some agents respond, some ignore (busy)
              const responders = workingAgents.filter(a => a.id !== asker.id && Math.random() < 0.3);
              const ignorers = workingAgents.filter(a => a.id !== asker.id && !responders.includes(a));

              if (responders.length > 0) {
                const r = rand(responders);
                newLog.push({
                  id: Date.now() + 1, from: r.name, to: asker.name,
                  text: rand(["I'm in! Be right there.", "Sure, let me save my work first.", "Coming! Need to discuss something with you."]),
                  time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), color: r.color,
                });
              }
              if (responders.length === 0 && ignorers.length > 0) {
                // Everyone ignored! Sad but realistic.
                newLog.push({
                  id: Date.now() + 2, from: asker.name, to: "all",
                  text: rand(["...guess everyone's in the zone. Solo coffee it is!", "No takers? I'll bring back ideas then.", "Alright, focused team today! I respect it."]),
                  time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), color: asker.color,
                });
              }

              return newLog;
            });
          }

          // Help requests between agents
          if (Math.random() < 0.02) {
            const helper = rand(prev.filter(a => ["researcher", "skill-creator", "archivist"].includes(a.id)));
            const asker2 = rand(prev.filter(a => ["builder", "tester", "designer", "plugin-dev"].includes(a.id)));
            if (helper && asker2) {
              const helpConvos = [
                { ask: `${helper.name}, do you have any docs on ${rand(["OAuth flows", "WebSocket patterns", "state machines", "caching strategies"])}?`, answer: `Yes! I wrote a skill on that last week. Sending it your way.` },
                { ask: `Can someone review my ${rand(["PR for the auth module", "test suite for the API", "design for the dashboard", "plugin manifest"])}?`, answer: `On it. I'll check it during my next review cycle.` },
                { ask: `I'm stuck on ${rand(["a race condition", "a CSS layout issue", "a type error", "a failing test"])}. Has anyone seen this before?`, answer: `I have notes from when I hit something similar. Let me dig them up.` },
              ];
              const hc = rand(helpConvos);
              setChatLog(log => [...log.slice(-30),
                { id: Date.now(), from: asker2.name, to: helper.name, text: hc.ask, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), color: asker2.color },
                { id: Date.now() + 1, from: helper.name, to: asker2.name, text: hc.answer, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), color: helper.color },
              ]);
            }
          }

          return prev;
        });
      }

      // Generate misc chat messages
      if (!hivePaused && Math.random() < 0.004 * speed) {
        setAgentStates(prev => {
          const sender = rand(prev);
          const receiver = rand(prev.filter(x => x.id !== sender.id));
          const chatMsgs = [
            `Hey ${receiver.name}, can you review my latest changes?`,
            `Found an interesting approach for the ${rand(["auth", "API", "UI", "DB"])} module.`,
            `Just finished the ${rand(["unit tests", "integration tests", "docs", "refactor"])}!`,
            `@all Quick update: ${rand(["PR ready", "blocked on API", "tests passing", "design done"])}`,
            `${receiver.name}, I created a skill for ${rand(["error handling", "state management", "testing patterns"])}`,
            `Coffee break anyone? ☕`,
            `This ${rand(["pattern", "approach", "architecture"])} is really elegant.`,
          ];
          setChatLog(log => [...log.slice(-30), {
            id: Date.now(),
            from: sender.name,
            to: Math.random() > 0.4 ? receiver.name : "all",
            text: rand(chatMsgs),
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            color: sender.color,
          }]);
          return prev;
        });
      }

      if (Math.random() < 0.006 * speed) {
        setAgentStates(prev => {
          const a = rand(prev);
          const msgs = [
            `${a.emoji} ${a.name} completed a task!`,
            `${a.emoji} ${a.name} created a new skill`,
            `${a.emoji} ${a.name} found a key insight`,
            `${a.emoji} ${a.name} is pairing with ${rand(prev.filter(x => x.id !== a.id)).name}`,
            `${a.emoji} ${a.name} leveled up! → Lv.${a.level + 1}`,
          ];
          setNotifications(n => [...n.slice(-5), { id: Date.now() + Math.random(), agent: a, text: rand(msgs), time: Date.now() }]);
          return prev;
        });
      }
      setNotifications(n => n.filter(x => Date.now() - x.time < 6000));
    }, 50);
    return () => clearInterval(interval);
  }, [speed, hivePaused]);

  // ─── RENDER ───
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    // BG
    ctx.fillStyle = PAL.bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // ─── FLOOR TILES with depth ───
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const px = x * TILE;
        const py = y * TILE;
        const isOffice = x >= 1 && x < 22 && y >= 2 && y < 13;
        const isMeeting = x >= 23 && x < 32 && y >= 2 && y < 9;
        const isBreak = x >= 23 && x < 32 && y >= 10 && y < 16;
        const isPath = y >= 17 && y < 19;
        const isHomes = y >= 19;
        const isOutdoor = !isOffice && !isMeeting && !isBreak && !isPath && !isHomes && y >= 2;

        if (isOffice) {
          ctx.fillStyle = (x + y) % 2 === 0 ? PAL.floorWarm : PAL.floorCool;
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = PAL.floorHighlight;
          ctx.fillRect(px, py, TILE, 1);
        } else if (isMeeting) {
          ctx.fillStyle = (x + y) % 2 === 0 ? "#241e3e" : "#2a2448";
          ctx.fillRect(px, py, TILE, TILE);
        } else if (isBreak) {
          ctx.fillStyle = (x + y) % 2 === 0 ? "#1e2a1e" : "#243024";
          ctx.fillRect(px, py, TILE, TILE);
        } else if (isPath) {
          ctx.fillStyle = (x + y) % 2 === 0 ? PAL.pathStone : PAL.pathLight;
          ctx.fillRect(px, py, TILE, TILE);
          // Path texture
          if ((x + y * 3) % 5 === 0) {
            ctx.fillStyle = "rgba(255,255,255,0.03)";
            ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
          }
        } else if (isHomes) {
          ctx.fillStyle = (x + y) % 3 === 0 ? PAL.grass : PAL.grassLight;
          ctx.fillRect(px, py, TILE, TILE);
        } else if (isOutdoor) {
          ctx.fillStyle = PAL.grass;
          ctx.fillRect(px, py, TILE, TILE);
        }
      }
    }

    // ─── OFFICE CARPET RUNNER ───
    ctx.fillStyle = PAL.carpet;
    ctx.fillRect(10 * TILE, 7 * TILE, 4 * TILE, 5 * TILE);
    ctx.fillStyle = PAL.carpetLight;
    ctx.fillRect(10.2 * TILE, 7.2 * TILE, 3.6 * TILE, 4.6 * TILE);
    // Carpet pattern
    ctx.fillStyle = PAL.carpet;
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(10.5 * TILE, (7.5 + i * 1.5) * TILE, 3 * TILE, 2);
    }

    // ─── WALLS ───
    // Office walls — top
    for (let x = 0; x < 23; x++) {
      drawPixelRect(ctx, x * TILE, 1.5 * TILE, TILE, TILE / 2 + 2, PAL.wallBase);
      drawPixelRect(ctx, x * TILE, 1.5 * TILE, TILE, 3, PAL.wallTop);
      // Trim
      ctx.fillStyle = PAL.wallTrim;
      ctx.fillRect(x * TILE, 2 * TILE - 2, TILE, 2);
    }
    // Office wall — right
    for (let y = 2; y < 13; y++) {
      drawPixelRect(ctx, 22 * TILE, y * TILE, TILE / 2, TILE, PAL.wallBase);
      ctx.fillStyle = PAL.wallTrim;
      ctx.fillRect(22 * TILE, y * TILE, 2, TILE);
    }
    // Meeting room walls
    for (let x = 23; x < 33; x++) {
      drawPixelRect(ctx, x * TILE, 1.5 * TILE, TILE, TILE / 2 + 2, PAL.meetingWall);
      ctx.fillStyle = PAL.wallTrim;
      ctx.fillRect(x * TILE, 2 * TILE - 2, TILE, 2);
    }
    for (let y = 2; y < 9; y++) {
      drawPixelRect(ctx, 32 * TILE, y * TILE, TILE / 2, TILE, PAL.meetingWall);
    }
    // Break room walls
    for (let x = 23; x < 33; x++) {
      ctx.fillStyle = PAL.wallTrim;
      ctx.fillRect(x * TILE, 10 * TILE - 2, TILE, 2);
    }

    // ─── WINDOWS ───
    drawWindow(ctx, 3 * TILE, 1.6 * TILE, 28, 16, timeOfDay);
    drawWindow(ctx, 8 * TILE, 1.6 * TILE, 28, 16, timeOfDay);
    drawWindow(ctx, 14 * TILE, 1.6 * TILE, 28, 16, timeOfDay);
    drawWindow(ctx, 19 * TILE, 1.6 * TILE, 28, 16, timeOfDay);
    drawWindow(ctx, 25 * TILE, 1.6 * TILE, 28, 16, timeOfDay);
    drawWindow(ctx, 30 * TILE, 1.6 * TILE, 28, 16, timeOfDay);

    // ─── OFFICE DESKS ───
    // Row 1
    for (let i = 0; i < 5; i++) {
      const dx = (2 + i * 4) * TILE;
      drawDesk(ctx, dx, 4 * TILE);
      drawChair(ctx, dx + 16, 5.5 * TILE + 10, AGENTS[Math.min(i, AGENTS.length - 1)].color);
    }
    // Row 2
    for (let i = 0; i < 5; i++) {
      const dx = (2 + i * 4) * TILE;
      drawDesk(ctx, dx, 8 * TILE);
      drawChair(ctx, dx + 16, 9.5 * TILE + 10, AGENTS[Math.min(i + 5, AGENTS.length - 1)].color);
    }

    // ─── OFFICE DECORATIONS ───
    // Bookshelves
    drawBookshelf(ctx, 1 * TILE, 2.5 * TILE);
    drawBookshelf(ctx, 21 * TILE - 28, 2.5 * TILE);
    // Plants
    drawPlant(ctx, 1.5 * TILE, 7 * TILE, 1.2);
    drawPlant(ctx, 21 * TILE, 7 * TILE, 1.2);
    drawPlant(ctx, 1.5 * TILE, 11 * TILE, 1);
    drawPlant(ctx, 21 * TILE, 11 * TILE, 1);
    // Lamps
    drawLamp(ctx, 11 * TILE, 2.5 * TILE, true);
    drawLamp(ctx, 13 * TILE, 2.5 * TILE, true);
    // Whiteboard
    drawPixelRect(ctx, 6 * TILE, 1.8 * TILE, 4 * TILE, 0.5 * TILE, "#ddd");
    ctx.fillStyle = "#aaa";
    ctx.fillRect(6 * TILE - 2, 1.7 * TILE, 4 * TILE + 4, 3);
    // Whiteboard content
    ctx.fillStyle = "#44aa66";
    ctx.fillRect(6.2 * TILE, 1.9 * TILE, 20, 2);
    ctx.fillStyle = "#4466aa";
    ctx.fillRect(6.2 * TILE, 2.05 * TILE, 40, 2);
    ctx.fillStyle = "#aa4444";
    ctx.fillRect(7 * TILE, 1.9 * TILE, 30, 2);

    // ─── MEETING ROOM ───
    drawMeetingTable(ctx, 24.5 * TILE, 3.5 * TILE);
    // Presentation screen
    drawPixelRect(ctx, 31 * TILE, 2.5 * TILE, 14, 3.5 * TILE, "#111");
    drawGlowRect(ctx, 31.2 * TILE, 2.7 * TILE, 10, 3.1 * TILE, "#112244", "#4488ff", 8);
    // Screen content
    ctx.fillStyle = "#4488ff55";
    ctx.fillRect(31.3 * TILE, 3 * TILE, 8, 4);
    ctx.fillStyle = "#44dd8855";
    ctx.fillRect(31.3 * TILE, 3.5 * TILE, 8, 4);
    // Meeting room plants
    drawPlant(ctx, 23.5 * TILE, 3 * TILE, 1.3);
    drawPlant(ctx, 31.5 * TILE, 8 * TILE, 1);

    // Meeting indicator
    if (meetingInProgress) {
      ctx.save();
      ctx.fillStyle = "rgba(68,100,255,0.08)";
      ctx.fillRect(23 * TILE, 2 * TILE, 9 * TILE, 7 * TILE);
      ctx.fillStyle = "#4488ff";
      ctx.font = "bold 8px monospace";
      ctx.textAlign = "center";
      ctx.fillText("🗣 MEETING IN PROGRESS", 27.5 * TILE, 8.5 * TILE);
      ctx.textAlign = "left";
      ctx.restore();
    }

    // ─── BREAK ROOM ───
    drawCoffeeMachine(ctx, 23.5 * TILE, 10.5 * TILE);
    // Tables
    drawPixelRect(ctx, 26 * TILE, 11.5 * TILE, 2.5 * TILE, 1.5 * TILE, PAL.woodMid);
    drawPixelRect(ctx, 26.1 * TILE, 11.6 * TILE, 2.3 * TILE, 1.3 * TILE, PAL.woodLight);
    drawPixelRect(ctx, 29.5 * TILE, 11.5 * TILE, 2 * TILE, 1.5 * TILE, PAL.woodMid);
    // Sofa
    drawPixelRect(ctx, 24 * TILE, 14 * TILE, 6 * TILE, 1.5 * TILE, "#3a2255");
    drawPixelRect(ctx, 24.1 * TILE, 13.5 * TILE, 1 * TILE, 2 * TILE, "#4a3268");
    drawPixelRect(ctx, 29 * TILE, 13.5 * TILE, 1 * TILE, 2 * TILE, "#4a3268");
    drawPixelRect(ctx, 24.3 * TILE, 14.1 * TILE, 5.4 * TILE, 1.2 * TILE, "#4a3268");
    // Break room plants & lamp
    drawPlant(ctx, 31 * TILE, 11 * TILE, 1.5);
    drawLamp(ctx, 31 * TILE, 13 * TILE, timeOfDay === "evening");
    // Break room bookshelf (skill library!)
    drawBookshelf(ctx, 31 * TILE, 10.5 * TILE);

    // ─── ROOM LABELS ───
    ctx.save();
    ctx.font = "bold 9px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillText("🏢 MAIN OFFICE", 8 * TILE, 12.5 * TILE);
    ctx.fillText("🗣️ MEETING ROOM", 25 * TILE, 2.3 * TILE);
    ctx.fillText("☕ BREAK ROOM", 25 * TILE, 10.3 * TILE);
    ctx.fillStyle = "rgba(255,215,0,0.2)";
    ctx.fillText("🏠 AGENT HOMES — Learning & Rest Zone", 6 * TILE, 18.5 * TILE);
    ctx.restore();

    // ─── OUTDOOR ELEMENTS ───
    // Trees along path
    const treeSpots = [[0, 14], [3, 15], [7, 14.5], [11, 15], [15, 14], [19, 15.5], [33, 5], [34, 10], [33, 14], [34, 17]];
    treeSpots.forEach(([tx, ty]) => {
      const tpx = tx * TILE + 12;
      const tpy = ty * TILE;
      // Trunk
      ctx.fillStyle = "#3a2a14";
      ctx.fillRect(tpx - 2, tpy + 6, 6, 14);
      ctx.fillStyle = "#4a3a24";
      ctx.fillRect(tpx - 1, tpy + 6, 4, 14);
      // Foliage layers
      ctx.fillStyle = "#1a4a2a";
      ctx.beginPath();
      ctx.arc(tpx + 1, tpy - 2, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2a6a3a";
      ctx.beginPath();
      ctx.arc(tpx + 1, tpy - 4, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3a8a4a";
      ctx.beginPath();
      ctx.arc(tpx + 1, tpy - 6, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Path dashes
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    for (let x = 0; x < MAP_W; x += 2) {
      ctx.fillRect(x * TILE + 4, 17.8 * TILE, TILE - 8, 2);
    }

    // ─── HOMES ───
    agentStates.forEach(a => drawHome(ctx, a, timeOfDay));

    // ─── AGENTS (sorted by Y for depth) ───
    [...agentStates]
      .sort((a, b) => a.y - b.y)
      .forEach(a => drawAgent(ctx, a, tick, selectedAgent === a.id));

    // ─── SPEECH BUBBLES (for agents chatting in proximity) ───
    // Find pairs of break-room agents and draw conversation indicators
    const breakAgents = agentStates.filter(a => a.status === "break" && a.x > 23 * TILE && a.y > 10 * TILE);
    if (breakAgents.length >= 2) {
      breakAgents.forEach((a, i) => {
        if (i > 0) {
          // Draw a small chat line between nearby agents
          const prev2 = breakAgents[i - 1];
          ctx.save();
          ctx.strokeStyle = "rgba(255,255,255,0.08)";
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y - 10);
          ctx.lineTo(prev2.x, prev2.y - 10);
          ctx.stroke();
          ctx.restore();
        }
        // Animated speech dots
        const dotPhase = (tick * 0.1 + i * 2) % 3;
        ctx.fillStyle = a.color + "88";
        for (let d = 0; d < 3; d++) {
          const alpha = d <= dotPhase ? 1 : 0.3;
          ctx.globalAlpha = alpha;
          ctx.fillRect(a.x + 12 + d * 4, a.y - 24 + Math.sin(tick * 0.15 + d) * 1.5, 2, 2);
        }
        ctx.globalAlpha = 1;
      });
    }

    // Meeting room: show "presenting" indicator for one agent
    const meetingAgents = agentStates.filter(a => a.status === "meeting" && a.x > 23 * TILE && a.y < 9 * TILE);
    if (meetingAgents.length >= 2 && meetingInProgress) {
      const presenter = meetingAgents[0];
      ctx.save();
      ctx.fillStyle = "rgba(68,100,255,0.5)";
      ctx.font = "7px monospace";
      ctx.textAlign = "center";
      ctx.fillText("📊 presenting...", presenter.x, presenter.y - 34);
      ctx.textAlign = "left";
      ctx.restore();
    }

    // ─── ATMOSPHERIC PARTICLES (dust/light motes) ───
    particlesRef.current.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha * p.life;
      ctx.fillStyle = timeOfDay === "evening" ? "#8888ff" : "#ffe8c0";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // ─── TIME OVERLAY ───
    const overlays = {
      morning: "rgba(255,200,120,0.03)",
      afternoon: "rgba(255,240,200,0.01)",
      evening: "rgba(40,30,80,0.18)",
    };
    ctx.fillStyle = overlays[timeOfDay];
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // ─── VIGNETTE ───
    const vg = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.3, CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.7);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // ─── HUD CLOCK ───
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.beginPath();
    ctx.roundRect(CANVAS_W - 90, 6, 84, 18, 4);
    ctx.fill();
    const clockEmoji = timeOfDay === "morning" ? "🌅" : timeOfDay === "afternoon" ? "☀️" : "🌙";
    ctx.fillStyle = PAL.gold;
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${clockEmoji} ${timeOfDay.toUpperCase()}`, CANVAS_W - 48, 19);
    ctx.textAlign = "left";

  }, [tick, agentStates, selectedAgent, meetingInProgress, timeOfDay]);

  // ─── CLICK HANDLER ───
  const handleCanvasClick = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    let clicked = null;
    agentStates.forEach(a => {
      if (Math.abs(mx - a.x) < 16 && Math.abs(my - a.y) < 20) clicked = a.id;
    });
    setSelectedAgent(clicked);
    if (clicked) setShowDashboard(true);
  }, [agentStates]);

  const selected = agentStates.find(a => a.id === selectedAgent);
  const totalTasks = agentStates.reduce((s, a) => s + a.tasksCompleted, 0);
  const avgMood = Math.round(agentStates.reduce((s, a) => s + a.mood, 0) / agentStates.length);
  const avgEnergy = Math.round(agentStates.reduce((s, a) => s + a.energy, 0) / agentStates.length);
  const totalSkills = agentStates.reduce((s, a) => s + a.skillsCreated, 0);

  const statusCounts = {};
  agentStates.forEach(a => { statusCounts[a.status] = (statusCounts[a.status] || 0) + 1; });

  return (
    <div style={{ background: "#06060e", minHeight: "100vh", color: "#ddd", fontFamily: "'JetBrains Mono', 'Fira Code', monospace", display: "flex", flexDirection: "column" }}>
      {/* ─── HEADER ─── */}
      <div style={{ background: "linear-gradient(135deg, #0e0e1e 0%, #161630 50%, #0e0e1e 100%)", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #2a2850" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 24, filter: "drop-shadow(0 0 8px #ffd700)" }}>🐝</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 16, letterSpacing: 3, background: "linear-gradient(90deg, #ffd700, #ffaa00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>CLAUDE HIVE</h1>
            <p style={{ margin: 0, fontSize: 9, color: "#666", letterSpacing: 1 }}>AI AGENT PIXEL OFFICE • HD-2D</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 3, background: "#111", borderRadius: 6, padding: 3 }}>
            {[0.5, 1, 2, 3].map(s => (
              <button key={s} onClick={() => setSpeed(s)} style={{ background: speed === s ? "linear-gradient(135deg, #ffd700, #ffaa00)" : "transparent", color: speed === s ? "#000" : "#555", border: "none", padding: "4px 10px", borderRadius: 4, cursor: "pointer", fontFamily: "inherit", fontSize: 10, fontWeight: speed === s ? "bold" : "normal", transition: "all 0.2s" }}>
                {s}x
              </button>
            ))}
          </div>
          {/* CRITICAL: Send All Home / Wake Up */}
          <button onClick={() => {
            if (hivePaused) {
              // Wake everyone up — send to desks
              setHivePaused(false);
              setAgentStates(prev => prev.map(a => ({
                ...a,
                targetX: a.deskX * TILE + TILE / 2,
                targetY: a.deskY * TILE + TILE / 2,
                status: "working",
                activity: rand(ACTIVITIES.working),
              })));
              setNotifications(n => [...n, { id: Date.now(), agent: AGENTS[0], text: "☀️ Rise and shine! All agents returning to work.", time: Date.now() }]);
            } else {
              // Send everyone home — pause simulation
              setHivePaused(true);
              setMeetingInProgress(null);
              setAgentStates(prev => prev.map(a => ({
                ...a,
                targetX: a.homeX * TILE + TILE,
                targetY: a.homeY * TILE + TILE,
                status: "resting",
                activity: rand(ACTIVITIES.resting),
              })));
              setNotifications(n => [...n, { id: Date.now(), agent: AGENTS[0], text: "🌙 All agents sent home. Credits preserved. Goodnight!", time: Date.now() }]);
            }
          }} style={{
            background: hivePaused
              ? "linear-gradient(135deg, #44dd88, #22aa55)"
              : "linear-gradient(135deg, #ff4444, #cc2222)",
            color: "#fff",
            border: "none",
            padding: "6px 16px",
            borderRadius: 6,
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 10,
            fontWeight: "bold",
            boxShadow: hivePaused ? "0 0 12px rgba(68,221,136,0.3)" : "0 0 12px rgba(255,68,68,0.3)",
            transition: "all 0.3s",
          }}>
            {hivePaused ? "☀️ WAKE UP" : "🏠 SEND ALL HOME"}
          </button>
          <button onClick={() => setShowDashboard(!showDashboard)} style={{ background: showDashboard ? "linear-gradient(135deg, #ffd700, #ffaa00)" : "#1a1a30", color: showDashboard ? "#000" : "#888", border: "1px solid #333", padding: "5px 14px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 10, fontWeight: "bold", transition: "all 0.2s" }}>
            📊 DASHBOARD
          </button>
        </div>
      </div>

      {/* ─── MAIN AREA ─── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Canvas */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} onClick={handleCanvasClick} style={{ width: "100%", height: "calc(100vh - 90px)", imageRendering: "pixelated", cursor: "pointer", display: "block", objectFit: "contain", background: "#06060e" }} />

          {/* Notifications */}
          <div style={{ position: "absolute", top: 10, left: 10, display: "flex", flexDirection: "column", gap: 4, pointerEvents: "none", maxWidth: 280 }}>
            {notifications.map(n => (
              <div key={n.id} style={{ background: "rgba(6,6,14,0.9)", backdropFilter: "blur(8px)", padding: "6px 12px", borderRadius: 8, fontSize: 10, color: "#ddd", borderLeft: `3px solid ${n.agent.color}`, opacity: clamp(1 - (Date.now() - n.time) / 6000, 0, 1), transition: "opacity 0.5s", boxShadow: `0 0 12px ${n.agent.color}22` }}>
                {n.text}
              </div>
            ))}
          </div>

          {meetingInProgress && (
            <div style={{ position: "absolute", top: 10, right: showDashboard ? 340 : 10, background: "rgba(68,100,255,0.9)", backdropFilter: "blur(8px)", padding: "8px 14px", borderRadius: 8, fontSize: 10, color: "#fff", maxWidth: 200, boxShadow: "0 0 20px rgba(68,100,255,0.3)" }}>
              🗣 <strong>Meeting:</strong> {meetingInProgress}
            </div>
          )}

          {/* Paused overlay */}
          {hivePaused && (
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "rgba(6,6,14,0.85)", backdropFilter: "blur(12px)", padding: "16px 32px", borderRadius: 12, textAlign: "center", border: "1px solid #333", boxShadow: "0 0 40px rgba(0,0,0,0.5)", pointerEvents: "none" }}>
              <div style={{ fontSize: 28 }}>🌙</div>
              <div style={{ fontSize: 14, fontWeight: "bold", color: "#8888cc", marginTop: 4 }}>HIVE RESTING</div>
              <div style={{ fontSize: 10, color: "#555", marginTop: 4 }}>All agents at home • Credits preserved</div>
              <div style={{ fontSize: 10, color: "#44dd88", marginTop: 4 }}>Energy recovering...</div>
            </div>
          )}

          {/* Status bar */}
          <div style={{ display: "flex", gap: 16, padding: "6px 16px", background: hivePaused ? "rgba(20,20,40,0.95)" : "rgba(10,10,20,0.95)", borderTop: `1px solid ${hivePaused ? "#2a2a55" : "#1a1a30"}`, fontSize: 10, color: "#888", flexWrap: "wrap", transition: "all 0.3s" }}>
            {hivePaused ? (
              <span style={{ color: "#8888cc" }}>💤 <strong>PAUSED</strong> — All {agentStates.length} agents resting at home</span>
            ) : (<>
              <span>💻 <strong style={{ color: "#44dd88" }}>{statusCounts.working || 0}</strong> working</span>
              <span>🗣 <strong style={{ color: "#4499ff" }}>{statusCounts.meeting || 0}</strong> meeting</span>
              <span>📖 <strong style={{ color: "#bb66ff" }}>{statusCounts.learning || 0}</strong> learning</span>
              <span>☕ <strong style={{ color: "#ffaa33" }}>{statusCounts.break || 0}</strong> break</span>
            </>)}
            <span style={{ borderLeft: "1px solid #333", paddingLeft: 12 }}>✅ <strong style={{ color: "#ffd700" }}>{totalTasks}</strong> tasks</span>
            <span>📚 <strong style={{ color: "#bb66ff" }}>{totalSkills}</strong> skills</span>
            <span>😊 <strong style={{ color: avgMood > 70 ? "#44dd88" : "#ff5566" }}>{avgMood}%</strong></span>
            <span>⚡ <strong style={{ color: avgEnergy > 50 ? "#4499ff" : "#ffaa33" }}>{avgEnergy}%</strong></span>
          </div>
        </div>

        {/* ─── DASHBOARD PANEL ─── */}
        {showDashboard && (
          <div style={{ width: 320, background: "#0a0a16", borderLeft: "1px solid #1a1a30", display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 44px)" }}>
            {/* Tab bar */}
            <div style={{ display: "flex", borderBottom: "1px solid #1a1a30", flexShrink: 0 }}>
              {[
                { id: "team", icon: "👥" },
                { id: "tasks", icon: "✅" },
                { id: "chat", icon: "💬" },
                { id: "meetings", icon: "🗣" },
                { id: "projects", icon: "📁" },
              ].map(tab => (
                <button key={tab.id} onClick={() => { setDashTab(tab.id); if (tab.id !== "team") setSelectedAgent(null); }}
                  style={{ flex: 1, background: dashTab === tab.id ? "#14142a" : "transparent", border: "none", borderBottom: dashTab === tab.id ? "2px solid #ffd700" : "2px solid transparent", color: dashTab === tab.id ? "#ffd700" : "#555", padding: "8px 4px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, transition: "all 0.2s" }}
                  title={tab.id.charAt(0).toUpperCase() + tab.id.slice(1)}>
                  {tab.icon}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>

              {/* ═══ TEAM TAB ═══ */}
              {dashTab === "team" && (selected ? (
                <div>
                  <button onClick={() => setSelectedAgent(null)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontFamily: "inherit", fontSize: 10, marginBottom: 8, padding: 0 }}>← Back to team</button>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, padding: 12, background: `linear-gradient(135deg, ${selected.color}11, transparent)`, borderRadius: 10, border: `1px solid ${selected.color}22` }}>
                    <div style={{ width: 44, height: 44, background: `linear-gradient(135deg, ${selected.color}, ${selected.accent})`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: `0 0 16px ${selected.color}33` }}>{selected.emoji}</div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 15, color: selected.color }}>{selected.name}</h2>
                      <p style={{ margin: 0, fontSize: 10, color: "#777" }}>{selected.role}</p>
                      <p style={{ margin: 0, fontSize: 9, color: "#555" }}>Level {selected.level} • {selected.xp}/{selected.level * 100} XP</p>
                    </div>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ background: "#111", borderRadius: 6, height: 6, overflow: "hidden" }}>
                      <div style={{ background: `linear-gradient(90deg, ${selected.color}, ${selected.accent})`, height: "100%", width: `${(selected.xp / (selected.level * 100)) * 100}%`, borderRadius: 6, transition: "width 0.5s", boxShadow: `0 0 8px ${selected.color}44` }} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
                    {[
                      { l: "Mood", v: selected.mood + "%", c: selected.mood > 70 ? "#44dd88" : "#ff5566", i: "😊" },
                      { l: "Energy", v: selected.energy + "%", c: selected.energy > 50 ? "#4499ff" : "#ffaa33", i: "⚡" },
                      { l: "Tasks", v: selected.tasksCompleted, c: "#ffd700", i: "✅" },
                      { l: "Skills", v: selected.skillsCreated, c: "#bb66ff", i: "📚" },
                    ].map(s => (
                      <div key={s.l} style={{ background: "#0e0e1e", padding: 10, borderRadius: 8, textAlign: "center", border: "1px solid #1a1a30" }}>
                        <div style={{ fontSize: 14 }}>{s.i}</div>
                        <div style={{ fontSize: 15, fontWeight: "bold", color: s.c }}>{s.v}</div>
                        <div style={{ fontSize: 8, color: "#555", textTransform: "uppercase", letterSpacing: 1 }}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: "#0e0e1e", padding: 12, borderRadius: 8, marginBottom: 10, border: "1px solid #1a1a30" }}>
                    <div style={{ fontSize: 8, color: "#555", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Current Activity</div>
                    <div style={{ fontSize: 12, color: { working: "#44dd88", meeting: "#4499ff", break: "#ffaa33", learning: "#bb66ff", traveling: "#777", resting: "#6666aa" }[selected.status] }}>{selected.activity}</div>
                  </div>
                  <div style={{ background: "#0e0e1e", padding: 12, borderRadius: 8, marginBottom: 12, border: "1px solid #1a1a30" }}>
                    <div style={{ fontSize: 8, color: "#555", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Personality</div>
                    <div style={{ fontSize: 11, color: "#999", lineHeight: 1.4 }}>{selected.personality}</div>
                  </div>
                  {/* Agent's tasks */}
                  <div style={{ background: "#0e0e1e", padding: 12, borderRadius: 8, marginBottom: 12, border: "1px solid #1a1a30" }}>
                    <div style={{ fontSize: 8, color: "#555", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Assigned Tasks</div>
                    {taskBoard.filter(t => t.assignee === selected.name).map(t => (
                      <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "1px solid #111" }}>
                        <span style={{ fontSize: 10, color: "#aaa" }}>{t.title}</span>
                        <span style={{ fontSize: 8, padding: "2px 6px", borderRadius: 4, background: t.status === "done" ? "#22aa5533" : t.status === "in_progress" ? "#ffd70033" : "#44444433", color: t.status === "done" ? "#44dd88" : t.status === "in_progress" ? "#ffd700" : "#888" }}>
                          {t.status === "in_progress" ? "IN PROGRESS" : t.status.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {[
                      { label: "📍 Desk", action: () => ({ targetX: selected.deskX * TILE + TILE / 2, targetY: selected.deskY * TILE + TILE / 2, status: "working", activity: rand(ACTIVITIES.working) }) },
                      { label: "🗣 Meet", action: () => ({ targetX: 27 * TILE, targetY: 5 * TILE, status: "meeting", activity: rand(ACTIVITIES.meeting) }) },
                      { label: "☕ Break", action: () => ({ targetX: 27 * TILE, targetY: 13 * TILE, status: "break", activity: rand(ACTIVITIES.break) }) },
                      { label: "📖 Learn", action: () => ({ targetX: selected.homeX * TILE + TILE, targetY: selected.homeY * TILE + TILE, status: "learning", activity: rand(ACTIVITIES.learning) }) },
                    ].map(btn => (
                      <button key={btn.label} onClick={() => {
                        setHivePaused(false);
                        setAgentStates(prev => prev.map(a => a.id === selected.id ? { ...a, ...btn.action() } : a));
                        setNotifications(n => [...n, { id: Date.now(), agent: selected, text: `${selected.emoji} ${selected.name}: ${btn.label}`, time: Date.now() }]);
                      }} style={{ background: "#111", color: selected.color, border: `1px solid ${selected.color}33`, padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 9, transition: "all 0.2s" }}>
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  {agentStates.map(a => (
                    <div key={a.id} onClick={() => setSelectedAgent(a.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 3, background: "#0e0e1e", borderRadius: 8, cursor: "pointer", borderLeft: `3px solid ${a.color}`, transition: "all 0.2s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#14142a"}
                      onMouseLeave={e => e.currentTarget.style.background = "#0e0e1e"}>
                      <div style={{ width: 32, height: 32, background: `linear-gradient(135deg, ${a.color}44, ${a.accent}22)`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{a.emoji}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: "bold", color: a.color }}>{a.name}</div>
                        <div style={{ fontSize: 8, color: "#555" }}>{a.role}</div>
                        <div style={{ fontSize: 9, color: { working: "#44dd88", meeting: "#4499ff", break: "#ffaa33", learning: "#bb66ff", traveling: "#777", resting: "#6666aa" }[a.status], overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.activity}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 8, color: a.color }}>Lv.{a.level}</div>
                        <div style={{ width: 30, height: 3, background: "#222", borderRadius: 2, marginTop: 3 }}>
                          <div style={{ height: "100%", background: a.energy > 50 ? "#4499ff" : "#ffaa33", width: `${a.energy}%`, borderRadius: 2 }} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: 14, padding: 14, background: "#0e0e1e", borderRadius: 10, border: "1px solid #1a1a30" }}>
                    <div style={{ fontSize: 10, fontWeight: "bold", marginBottom: 10, background: "linear-gradient(90deg, #ffd700, #ffaa00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: 1 }}>📊 TEAM STATS</div>
                    {[
                      { l: "Tasks Completed", v: totalTasks, c: "#44dd88" },
                      { l: "Skills Created", v: totalSkills, c: "#bb66ff" },
                      { l: "Average Mood", v: avgMood + "%", c: avgMood > 70 ? "#44dd88" : "#ff5566" },
                      { l: "Average Energy", v: avgEnergy + "%", c: avgEnergy > 50 ? "#4499ff" : "#ffaa33" },
                      { l: "Combined Level", v: agentStates.reduce((s, a) => s + a.level, 0), c: "#ffd700" },
                    ].map(s => (
                      <div key={s.l} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #111" }}>
                        <span style={{ fontSize: 10, color: "#777" }}>{s.l}</span>
                        <span style={{ fontSize: 11, fontWeight: "bold", color: s.c }}>{s.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* ═══ TASKS TAB ═══ */}
              {dashTab === "tasks" && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 12, background: "linear-gradient(90deg, #ffd700, #ffaa00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: 1 }}>TASK BOARD</div>
                  {["in_progress", "todo", "done"].map(status => {
                    const tasks = taskBoard.filter(t => t.status === status);
                    const label = status === "in_progress" ? "🔄 In Progress" : status === "todo" ? "📋 To Do" : "✅ Done";
                    const labelColor = status === "in_progress" ? "#ffd700" : status === "todo" ? "#888" : "#44dd88";
                    return (
                      <div key={status} style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 10, fontWeight: "bold", color: labelColor, marginBottom: 6, letterSpacing: 1 }}>{label} ({tasks.length})</div>
                        {tasks.map(t => {
                          const agent = agentStates.find(a => a.name === t.assignee);
                          return (
                            <div key={t.id} style={{ background: "#0e0e1e", padding: "8px 10px", borderRadius: 6, marginBottom: 4, borderLeft: `3px solid ${agent?.color || "#555"}`, border: "1px solid #1a1a30" }}>
                              <div style={{ fontSize: 11, color: "#ccc", marginBottom: 3 }}>{t.title}</div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: 9, color: agent?.color || "#777" }}>{agent?.emoji} {t.assignee}</span>
                                <div style={{ display: "flex", gap: 4 }}>
                                  <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: t.priority === "high" ? "#ff444422" : t.priority === "medium" ? "#ffaa3322" : "#44444422", color: t.priority === "high" ? "#ff6666" : t.priority === "medium" ? "#ffaa33" : "#888" }}>{t.priority}</span>
                                  <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: "#22222244", color: "#777" }}>{t.project}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ═══ CHAT TAB ═══ */}
              {dashTab === "chat" && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 12, background: "linear-gradient(90deg, #ffd700, #ffaa00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: 1 }}>TEAM CHAT</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {chatLog.slice(-20).map(msg => (
                      <div key={msg.id} style={{ background: "#0e0e1e", padding: "8px 10px", borderRadius: 8, borderLeft: `3px solid ${msg.color}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: 10, fontWeight: "bold", color: msg.color }}>{msg.from}</span>
                          <span style={{ fontSize: 8, color: "#444" }}>{msg.time}</span>
                        </div>
                        <div style={{ fontSize: 10, color: "#aaa", lineHeight: 1.4 }}>
                          {msg.to !== "all" && <span style={{ color: "#666" }}>→ {msg.to}: </span>}
                          {msg.text}
                        </div>
                      </div>
                    ))}
                  </div>
                  {hivePaused && <div style={{ textAlign: "center", padding: 16, color: "#555", fontSize: 10 }}>💤 Chat paused — agents are resting</div>}
                </div>
              )}

              {/* ═══ MEETINGS TAB ═══ */}
              {dashTab === "meetings" && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 12, background: "linear-gradient(90deg, #ffd700, #ffaa00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: 1 }}>MEETINGS</div>
                  {meetingInProgress && (
                    <div style={{ background: "rgba(68,100,255,0.15)", border: "1px solid #4488ff44", padding: 12, borderRadius: 8, marginBottom: 12 }}>
                      <div style={{ fontSize: 10, color: "#4488ff", fontWeight: "bold" }}>🔴 LIVE NOW</div>
                      <div style={{ fontSize: 12, color: "#ddd", marginTop: 4 }}>{meetingInProgress}</div>
                    </div>
                  )}
                  {meetingLog.map(m => (
                    <div key={m.id} style={{ background: "#0e0e1e", padding: 12, borderRadius: 8, marginBottom: 6, border: "1px solid #1a1a30" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: "bold", color: "#ddd" }}>{m.topic}</span>
                        <span style={{ fontSize: 8, padding: "2px 6px", borderRadius: 4, background: m.status === "completed" ? "#22aa5533" : "#ffaa3333", color: m.status === "completed" ? "#44dd88" : "#ffaa33" }}>{m.status}</span>
                      </div>
                      <div style={{ fontSize: 9, color: "#666", marginBottom: 4 }}>🕐 {m.time} • {m.attendees.join(", ")}</div>
                      <div style={{ fontSize: 10, color: "#999", lineHeight: 1.4, background: "#0a0a14", padding: 6, borderRadius: 4 }}>📝 {m.notes}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* ═══ PROJECTS TAB ═══ */}
              {dashTab === "projects" && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 12, background: "linear-gradient(90deg, #ffd700, #ffaa00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: 1 }}>PROJECTS</div>
                  {projects.map(p => {
                    const pTasks = taskBoard.filter(t => t.project === p.name);
                    const doneTasks = pTasks.filter(t => t.status === "done").length;
                    const inProgress = pTasks.filter(t => t.status === "in_progress").length;
                    return (
                      <div key={p.name} style={{ background: "#0e0e1e", padding: 14, borderRadius: 10, marginBottom: 8, border: `1px solid ${p.color}22`, borderLeft: `3px solid ${p.color}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: "bold", color: p.color }}>{p.name}</span>
                          <span style={{ fontSize: 10, fontWeight: "bold", color: p.color }}>{p.progress}%</span>
                        </div>
                        <div style={{ fontSize: 10, color: "#777", marginBottom: 8 }}>{p.description}</div>
                        {/* Progress bar */}
                        <div style={{ background: "#111", borderRadius: 4, height: 6, overflow: "hidden", marginBottom: 8 }}>
                          <div style={{ background: `linear-gradient(90deg, ${p.color}, ${p.color}88)`, height: "100%", width: `${p.progress}%`, borderRadius: 4, transition: "width 0.5s" }} />
                        </div>
                        {/* Task breakdown */}
                        <div style={{ display: "flex", gap: 8, fontSize: 9 }}>
                          <span style={{ color: "#44dd88" }}>✅ {doneTasks} done</span>
                          <span style={{ color: "#ffd700" }}>🔄 {inProgress} active</span>
                          <span style={{ color: "#888" }}>📋 {pTasks.length - doneTasks - inProgress} todo</span>
                        </div>
                        {/* Assigned agents */}
                        <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                          {[...new Set(pTasks.map(t => t.assignee))].map(name => {
                            const ag = agentStates.find(a => a.name === name);
                            return ag ? (
                              <span key={name} style={{ fontSize: 8, padding: "2px 6px", borderRadius: 4, background: ag.color + "22", color: ag.color }}>{ag.emoji} {name}</span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0a0a16; }
        ::-webkit-scrollbar-thumb { background: #2a2a50; border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: #3a3a60; }
      `}</style>
    </div>
  );
}