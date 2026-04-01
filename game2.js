/* =====================================================
   ATCKR — Cyber Tower Defense (Game 2)
   Script file: game2.js
   Description: All game logic, canvas rendering,
   enemy pathing, tower placement, wave system,
   score tracking, audio, and screen navigation
   for the malware tower defense game.
   ===================================================== */


/* -------------------------------------------------------
   GAME STATE
   Tracks everything about the current playthrough.
   Mirrors the G object pattern from game1.js.
------------------------------------------------------- */
const G = {
  score:      0,       // total points earned
  lives:      15,      // remaining lives (enemies reaching end)
  gold:       100,     // currency for placing towers
  wave:       0,       // current wave number
  totalWaves: 5,       // total waves in the game
  streak:     0,       // current kill streak
  best:       0,       // best kill streak this game
  kills:      0,       // total enemies defeated
  bonus:      0,       // total bonus gold earned from streaks
  towers:     [],      // placed tower objects
  enemies:    [],      // active enemy objects
  projectiles:[],      // active projectile objects
  particles:  [],      // active particle objects
  selectedType: null,  // tower type selected in sidebar
  selectedTower: null, // tower object clicked on map
  waveActive: false,   // is a wave currently spawning/running
  spawnQueue: [],      // enemy types queued to spawn
  spawnTimer: 0,       // countdown between spawns
  answered:   false    // repurposed: prevents actions during overlay
};


/* -------------------------------------------------------
   TOWER DEFINITIONS
   targets[] defines which enemy types each tower can hit:
     firewall  → worm, phishing
     antivirus → spyware only
     updater   → worm, spyware
     vpn       → ransomware only
------------------------------------------------------- */
const TOWERS = {
  firewall: {
    key:     'firewall',
    emoji:   '🧱',
    name:    'Firewall',
    cost:    30,
    dmg:     20,
    range:   2.5,   // in grid cells
    rate:    1.5,   // shots per second
    color:   '#060606',
    targets: ['worm', 'phishing'],
    desc:    'Hits: 🐛 Worm · 🎣 Phishing',
    fact:    'A firewall is like a security guard that checks every visitor on its travels to the computer.'
  },
  antivirus: {
    key:     'antivirus',
    emoji:   '🔍',
    name:    'Antivirus',
    cost:    45,
    dmg:     40,
    range:   3.5,
    rate:    0.7,
    color:   '#39ff14',
    targets: ['spyware'],            // only tower that hits spyware
    desc:    'Hits: 🕵️ Spyware only',
    fact:    'Antivirus software scans every file on your computer looking for malware hiding in disguise.'
  },
  updater: {
    key:     'updater',
    emoji:   '🔄',
    name:    'Updater',
    cost:    50,
    dmg:     12,
    range:   2.2,
    rate:    0.9,
    slow:    0.55,   // fraction of speed enemy keeps when slowed
    color:   '#ffd32a',
    targets: ['worm', 'spyware'],
    desc:    'Hits: 🐛 Worm · 🕵️ Spyware',
    fact:    'Software updates patch security holes — outdated software is the most common way hackers get in!'
  },
  vpn: {
    key:     'vpn',
    emoji:   '🔐',
    name:    'VPN Shield',
    cost:    90,
    dmg:     28,
    range:   3.0,
    rate:    0.6,
    aoe:     true,
    color:   '#a55eea',
    targets: ['ransomware'],         // only tower that hits ransomware
    desc:    'Hits: 🔒 Ransomware only',
    fact:    'A VPN encrypts your internet traffic like an invisible tunnel so hackers can\'t snoop on you.'
  }
};


/* -------------------------------------------------------
   ENEMY DEFINITIONS
   Each enemy type maps to a real malware category
   with child-friendly descriptions and cyber facts.
------------------------------------------------------- */
const ENEMIES = {
  worm: {
    key:      'worm',
    emoji:    '🐛',
    name:     'Worm',
    hp:       60,
    speed:    1.9,
    reward:   10,
    damage:   1,    // lives lost when it reaches the computer
    color:    '#ff6b35',
    stealthy: false,
    fact:     'A worm copies itself automatically and spreads to other computers over the internet!'
  },
  spyware: {
    key:      'spyware',
    emoji:    '🕵️',
    name:     'Spyware',
    hp:       80,
    speed:    1.1,
    reward:   18,
    damage:   2,    // steals data silently — costs 2 lives
    color:    '#a55eea',
    stealthy: true,
    fact:     'Spyware secretly watches everything you do and sends your passwords to hackers!'
  },
  ransomware: {
    key:      'ransomware',
    emoji:    '🔒',
    name:     'Ransomware',
    hp:       220,
    speed:    0.7,
    reward:   30,
    damage:   5,    // locks everything — costs 5 lives
    color:    '#ff4757',
    stealthy: false,
    fact:     'Ransomware locks all your files and demands money. Always keep backups!'
  },
  phishing: {
    key:      'phishing',
    emoji:    '🎣',
    name:     'Phishing',
    hp:       110,
    speed:    1.3,
    reward:   22,
    damage:   3,    // steals credentials — costs 3 lives
    color:    '#ffd32a',
    stealthy: false,
    fact:     'Phishing emails pretend to be from someone you trust to steal your passwords!'
  }
};


/* -------------------------------------------------------
   WAVE DEFINITIONS
   Each wave is a list of enemy type keys to spawn.
   Difficulty escalates naturally across 5 waves.
------------------------------------------------------- */
const WAVES = [
  ['worm','worm','worm','worm','worm'],
  ['worm','worm','spyware','spyware','worm','worm'],
  ['phishing','phishing','worm','spyware','phishing','worm','spyware'],
  ['ransomware','worm','worm','phishing','spyware','ransomware','phishing'],
  ['ransomware','spyware','phishing','worm','ransomware','spyware','phishing','worm','ransomware','spyware']
];


/* -------------------------------------------------------
   CYBER FACTS
   Shown as toast banners between waves.
   Mirrors the educational layer from game1.js.
------------------------------------------------------- */
const CYBER_FACTS = [
  '💡 Always use strong passwords — mix letters, numbers, and symbols!',
  '💡 Never click links in messages from people you don\'t know!',
  '💡 Keep your apps updated — updates fix security holes hackers use!',
  '💡 A VPN hides your internet traffic like an invisible tunnel!',
  '💡 Firewalls act like a security guard checking every visitor to your computer!',
  '💡 Antivirus software scans for bad programs hiding on your device!',
  '💡 Never share your passwords — not even with friends!',
  '💡 Always log out of accounts when using shared or public computers!'
];


/* -------------------------------------------------------
   MAP PATH
   The winding route enemies follow across the grid.
   Stored as {x, y} grid cell coordinates.
   The canvas renderer converts these to pixel positions.
------------------------------------------------------- */
const GRID_COLS = 22;
const GRID_ROWS = 13;

const PATH = [
  {x:0,y:6},{x:1,y:6},{x:2,y:6},{x:3,y:6},{x:4,y:6},{x:5,y:6},
  {x:5,y:5},{x:5,y:4},{x:5,y:3},{x:5,y:2},{x:6,y:2},{x:7,y:2},
  {x:8,y:2},{x:9,y:2},{x:10,y:2},{x:11,y:2},{x:11,y:3},{x:11,y:4},
  {x:11,y:5},{x:11,y:6},{x:12,y:6},{x:13,y:6},{x:14,y:6},{x:15,y:6},
  {x:15,y:7},{x:15,y:8},{x:15,y:9},{x:15,y:10},{x:14,y:10},{x:13,y:10},
  {x:12,y:10},{x:11,y:10},{x:10,y:10},{x:9,y:10},{x:8,y:10},
  {x:7,y:10},{x:6,y:10},{x:6,y:11},{x:6,y:12}
];

// Fast lookup set — "x,y" strings
const PATH_SET = new Set(PATH.map(p => `${p.x},${p.y}`));


/* -------------------------------------------------------
   CANVAS SETUP
   Resolves the canvas element, computes cell size and
   offsets so the grid is always centered on screen.
------------------------------------------------------- */
let canvas, ctx, CELL, OX, OY;

function initCanvas() {
  canvas = document.getElementById('tdCanvas');
  ctx    = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
  if (!canvas) return;
  const container = canvas.parentElement;
  canvas.width    = container.clientWidth;
  canvas.height   = container.clientHeight;
  CELL = Math.min(
    Math.floor(canvas.width  / GRID_COLS),
    Math.floor(canvas.height / GRID_ROWS)
  );
  OX = Math.floor((canvas.width  - CELL * GRID_COLS) / 2);
  OY = Math.floor((canvas.height - CELL * GRID_ROWS) / 2);
}

function cellPx(cx, cy) {
  return {
    px: OX + cx * CELL + CELL / 2,
    py: OY + cy * CELL + CELL / 2
  };
}

function pxCell(px, py) {
  return {
    x: Math.floor((px - OX) / CELL),
    y: Math.floor((py - OY) / CELL)
  };
}


/* -------------------------------------------------------
   GRID HELPERS
------------------------------------------------------- */
function isPath(x, y)   { return PATH_SET.has(`${x},${y}`); }
function isOOB(x, y)    { return x < 0 || y < 0 || x >= GRID_COLS || y >= GRID_ROWS; }
function hasTower(x, y) { return G.towers.some(t => t.x === x && t.y === y); }


/* -------------------------------------------------------
   AUDIO ENGINE
   Identical approach to game1.js — Web Audio API tones.
   Reuses the same lazy-init pattern.
------------------------------------------------------- */
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(freq, type, dur, vol = 0.12) {
  try {
    const ac   = getAudioCtx();
    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type            = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    osc.start();
    osc.stop(ac.currentTime + dur);
  } catch (e) { /* fail silently */ }
}

function soundPlace()   { playTone(440, 'sine', 0.1); setTimeout(() => playTone(550, 'sine', 0.12), 60); }
function soundKill()    { playTone(523, 'sine', 0.08); setTimeout(() => playTone(659, 'sine', 0.1), 75); setTimeout(() => playTone(784, 'sine', 0.18), 155); }
function soundStreak()  { [523,659,784,1047].forEach((f,i) => setTimeout(() => playTone(f,'sine',0.16), i*70)); }
function soundLeak()    { playTone(220, 'sawtooth', 0.2, 0.1); setTimeout(() => playTone(180,'sawtooth',0.2,0.08), 120); }
function soundWave()    { playTone(330,'sine',0.08); setTimeout(()=>playTone(440,'sine',0.1),90); setTimeout(()=>playTone(550,'sine',0.15),180); }
function soundNoGold()  { playTone(200,'sawtooth',0.15,0.09); }


/* -------------------------------------------------------
   SCREEN NAVIGATION
   Same showScreen() pattern as game1.js.
------------------------------------------------------- */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}


/* -------------------------------------------------------
   PARTICLE BACKGROUND
   Floating dot starfield — same as game1.js approach.
   Looks for a <canvas id="particles"> on the page.
------------------------------------------------------- */
(function setupParticles() {
  const el = document.getElementById('particles');
  if (!el) return;
  const pc  = el.getContext('2d');
  let W, H, pts = [];

  function resize() {
    W = el.width  = window.innerWidth;
    H = el.height = window.innerHeight;
    pts = Array.from({length: 55}, () => ({
      x:  Math.random() * W,
      y:  Math.random() * H,
      r:  Math.random() * 1.4 + 0.4,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      a:  Math.random()
    }));
  }

  resize();
  window.addEventListener('resize', resize);

  (function loop() {
    pc.clearRect(0, 0, W, H);
    pts.forEach(p => {
      pc.beginPath();
      pc.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      pc.fillStyle = `rgba(124,58,237,${p.a * 0.55})`;
      pc.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
    });
    requestAnimationFrame(loop);
  })();
})();


/* -------------------------------------------------------
   START GAME
   Resets all state and kicks off the game loop.
   Called by the Start button on the intro screen.
------------------------------------------------------- */
function startGame() {
  G.score       = 0;
  G.lives       = 15;
  G.gold        = 100;
  G.wave        = 0;
  G.streak      = 0;
  G.best        = 0;
  G.kills       = 0;
  G.bonus       = 0;
  G.towers      = [];
  G.enemies     = [];
  G.projectiles = [];
  G.particles   = [];
  G.selectedType  = null;
  G.selectedTower = null;
  G.waveActive  = false;
  G.spawnQueue  = [];
  G.spawnTimer  = 0;
  G.answered    = false;

  showScreen('s-game');
  // Double rAF: first frame the screen becomes display:flex,
  // second frame the browser has laid it out with real pixel dimensions.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    initCanvas();
    initInput();
    lastTime    = 0;
    loopRunning = false;
    loopId++;
    const myId = loopId;
    updateHUD();
    sendWave();
    requestAnimationFrame(ts => gameLoop(ts, myId));
  }));
}


/* -------------------------------------------------------
   WAVE LAUNCHER
   Called by the "Send Wave" button.
   Queues up enemies and marks the wave as active.
------------------------------------------------------- */
function sendWave() {
  if (G.waveActive || G.answered) return;
  if (G.wave >= G.totalWaves) return;

  G.wave++;
  document.getElementById('tdWave').textContent = G.wave + '/' + G.totalWaves;

  // Build spawn queue from wave definition (shuffled)
  const template = [...WAVES[G.wave - 1]];
  G.spawnQueue   = template.sort(() => Math.random() - 0.5);
  G.spawnTimer   = 0;
  G.waveActive   = true;

  soundWave();
  showToast(CYBER_FACTS[(G.wave - 1) % CYBER_FACTS.length]);
  updateHUD();
}


/* -------------------------------------------------------
   TOWER SELECTION
   Highlights the sidebar card and sets G.selectedType.
------------------------------------------------------- */
function selectTower(type) {
  G.selectedType  = type;
  G.selectedTower = null;
  document.querySelectorAll('.td-card').forEach(c => c.classList.remove('selected'));
  const card = document.getElementById('td-card-' + type);
  if (card) card.classList.add('selected');
}


/* -------------------------------------------------------
   TOWER PLACEMENT
   Places a tower on a valid empty non-path cell.
------------------------------------------------------- */
function placeTower(cx, cy) {
  if (!G.selectedType) return;
  if (isPath(cx, cy) || isOOB(cx, cy) || hasTower(cx, cy)) return;

  const def = TOWERS[G.selectedType];
  if (!def) return;

  if (G.gold < def.cost) {
    soundNoGold();
    // Flash gold counter red
    const el = document.getElementById('tdGold');
    if (el) {
      el.style.color = '#ff4757';
      setTimeout(() => el.style.color = '', 500);
    }
    return;
  }

  G.gold -= def.cost;
  const pos = cellPx(cx, cy);

  G.towers.push({
    type:     def.key,
    x: cx,    y: cy,
    px: pos.px, py: pos.py,
    emoji:    def.emoji,
    range:    def.range * CELL,
    dmg:      def.dmg,
    rate:     def.rate,
    slow:     def.slow   || 0,
    aoe:      def.aoe    || false,
    targets:  def.targets,          // carry targets array onto the placed instance
    color:    def.color,
    cooldown: 0,
    id:       Math.random()
  });

  soundPlace();
  updateHUD();
}

/* -------------------------------------------------------
   ENEMY SPAWNING
   Creates a new enemy at the start of the PATH.
------------------------------------------------------- */
function spawnEnemy(type) {
  const def = ENEMIES[type];
  const start = PATH[0];
  const pos   = cellPx(start.x, start.y);

  G.enemies.push({
    type:     def.key,
    emoji:    def.emoji,
    name:     def.name,
    hp:       def.hp,
    maxHp:    def.hp,
    speed:    def.speed,        // cells per second
    reward:   def.reward,
    damage:   def.damage,       // lives lost when it reaches the computer
    color:    def.color,
    stealthy: def.stealthy,
    fact:     def.fact,
    slow:     0,
    slowTimer:0,
    pathIdx:  0,
    x:        pos.px,
    y:        pos.py,
    id:       Math.random()
  });
}


/* -------------------------------------------------------
   DAMAGE HELPER
   Applies damage to an enemy; handles kills and rewards.
------------------------------------------------------- */
function dealDamage(enemy, dmg, slow) {
  enemy.hp -= dmg;

  if (slow > 0) {
    enemy.slow      = slow;
    enemy.slowTimer = 2;
  }

  if (enemy.hp <= 0) {
    G.kills++;
    G.streak++;
    if (G.streak > G.best) G.best = G.streak;

    // Reward gold + bonus for streaks
    let reward = enemy.reward;
    if (G.streak >= 5) reward += 10;
    else if (G.streak >= 3) reward += 5;

    G.gold  += reward;
    G.score += reward * 10;
    G.bonus += (reward - enemy.reward);

    spawnParticles(enemy.x, enemy.y, enemy.color, 14);
    soundKill();

    if (G.streak >= 3) {
      setTimeout(soundStreak, 160);
      showCombo(G.streak);
    }

    // Occasionally show an enemy educational fact
    if (Math.random() < 0.35) {
      showToast('Defeated ' + enemy.name + '! 💡 ' + enemy.fact);
    }

    G.enemies = G.enemies.filter(e => e !== enemy);
    updateHUD();
  }
}


/* -------------------------------------------------------
   PARTICLE SPAWNER
   Used for kill explosions and hit sparks.
------------------------------------------------------- */
function spawnParticles(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd   = 1.2 + Math.random() * 3;
    G.particles.push({
      x, y,
      vx:    Math.cos(angle) * spd,
      vy:    Math.sin(angle) * spd,
      color,
      life:  0.35 + Math.random() * 0.45,
      size:  2 + Math.random() * 3
    });
  }
}


/* -------------------------------------------------------
   MAIN UPDATE LOOP
   Called every frame. Handles spawning, movement,
   shooting, projectiles, and wave completion checks.
------------------------------------------------------- */
let lastTime = 0;
let loopRunning = false;
let loopId = 0; // increments each game so old loops self-terminate

function gameLoop(timestamp, id) {
  // If a newer loop has started, this one exits
  if (id !== loopId) return;

  const dt = Math.min((timestamp - (lastTime || timestamp)) / 1000, 0.05);
  lastTime = timestamp;

  if (!G.answered) update(dt);
  draw();
  requestAnimationFrame(ts => gameLoop(ts, id));
}

function update(dt) {
  // --- Spawn enemies from queue ---
  if (G.waveActive && G.spawnQueue.length > 0) {
    G.spawnTimer -= dt;
    if (G.spawnTimer <= 0) {
      spawnEnemy(G.spawnQueue.shift());
      G.spawnTimer = 0.85;
    }
  }

  // --- Wave complete check ---
  if (G.waveActive && G.spawnQueue.length === 0 && G.enemies.length === 0) {
    G.waveActive = false;
    G.streak     = 0;            // reset streak between waves
    const bonus  = 25 + G.wave * 5;
    G.gold      += bonus;
    updateHUD();
    showToast('🌊 Wave ' + G.wave + ' cleared! +' + bonus + ' gold bonus!');

    if (G.wave >= G.totalWaves) {
      setTimeout(endGame, 1200);
    } else {
      setTimeout(() => {
        if (!G.waveActive && !G.answered) {
          sendWave();
        }
      }, 500);
    }
  }

  // --- Move enemies along path ---
  // Uses a movement-budget while-loop so fast enemies can't overshoot
  // a corner waypoint and wander off the path.
  for (let i = G.enemies.length - 1; i >= 0; i--) {
    const e = G.enemies[i];
    if (e.slowTimer > 0) e.slowTimer -= dt;
    let budget = (e.slowTimer > 0 ? e.speed * e.slow : e.speed) * CELL * dt;

    let leaked = false;
    while (budget > 0) {
      const nextNode = PATH[e.pathIdx + 1];

      if (!nextNode) {
        // Enemy reached the computer — lose lives equal to its damage value
        G.lives  -= e.damage;
        G.streak  = 0;
        spawnParticles(e.x, e.y, '#ff4757', 12);
        soundLeak();
        showToast('💥 ' + e.name + ' got through! -' + e.damage + ' ' + (e.damage === 1 ? 'life' : 'lives') + '!');
        G.enemies.splice(i, 1);
        updateHUD();
        if (G.lives <= 0) {
          G.answered = true;
          setTimeout(endGame, 600);
        }
        leaked = true;
        break;
      }

      const tp   = cellPx(nextNode.x, nextNode.y);
      const dx   = tp.px - e.x;
      const dy   = tp.py - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= budget) {
        // Snap exactly onto waypoint and spend remainder on next segment
        e.x = tp.px;
        e.y = tp.py;
        e.pathIdx++;
        budget -= dist;
      } else {
        // Not enough budget to reach next waypoint this frame
        e.x += (dx / dist) * budget;
        e.y += (dy / dist) * budget;
        budget = 0;
      }
    }

    if (leaked) continue;
  }

  // --- Towers shoot ---
  for (const tower of G.towers) {
    tower.cooldown -= dt;
    if (tower.cooldown > 0) continue;

    // Only target enemy types listed in this tower's targets[] array
    const inRange = G.enemies.filter(e => {
      if (!tower.targets.includes(e.type)) return false;
      const dx = e.x - tower.px, dy = e.y - tower.py;
      return Math.sqrt(dx * dx + dy * dy) <= tower.range;
    });

    if (inRange.length === 0) continue;

    tower.cooldown = 1 / tower.rate;

    if (tower.aoe) {
      // AOE towers hit everything in range at once
      inRange.forEach(e => dealDamage(e, tower.dmg, tower.slow));
      spawnParticles(tower.px, tower.py, tower.color, 7);
    } else {
      // Single target — pick enemy furthest along path
      const target = inRange.reduce((a, b) => a.pathIdx > b.pathIdx ? a : b);
      G.projectiles.push({
        x:        tower.px,
        y:        tower.py,
        tx:       target.x,
        ty:       target.y,
        targetId: target.id,
        speed:    320,
        color:    tower.color,
        dmg:      tower.dmg,
        slow:     tower.slow,
        size:     5
      });
    }
  }

  // --- Move projectiles ---
  for (let i = G.projectiles.length - 1; i >= 0; i--) {
    const p      = G.projectiles[i];
    const target = G.enemies.find(e => e.id === p.targetId);
    if (target) { p.tx = target.x; p.ty = target.y; }

    const dx   = p.tx - p.x;
    const dy   = p.ty - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const move = p.speed * dt;

    if (dist <= move + 2) {
      if (target) dealDamage(target, p.dmg, p.slow);
      spawnParticles(p.tx, p.ty, p.color, 5);
      G.projectiles.splice(i, 1);
    } else {
      p.x += (dx / dist) * move;
      p.y += (dy / dist) * move;
    }
  }

  // --- Age particles ---
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i];
    p.x    += p.vx * dt * 60;
    p.y    += p.vy * dt * 60;
    p.life -= dt;
    if (p.life <= 0) G.particles.splice(i, 1);
  }
}


/* -------------------------------------------------------
   DRAW
   Renders the entire game each frame:
   grid → path → towers → enemies → projectiles → particles
------------------------------------------------------- */
let hoverCell = null;

function draw() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background fill
  ctx.fillStyle = '#0d1b2a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // --- Draw grid ---
  for (let x = 0; x < GRID_COLS; x++) {
    for (let y = 0; y < GRID_ROWS; y++) {
      const px = OX + x * CELL;
      const py = OY + y * CELL;
      ctx.fillStyle = isPath(x, y) ? '#1e3d5c'
                    : (x + y) % 2 === 0 ? '#0f2035' : '#112238';
      ctx.fillRect(px, py, CELL, CELL);
      ctx.strokeStyle = '#1a3050';
      ctx.lineWidth   = 0.5;
      ctx.strokeRect(px, py, CELL, CELL);
    }
  }

  // --- Path direction arrows ---
  ctx.fillStyle = 'rgba(0,229,255,0.13)';
  for (let i = 0; i < PATH.length - 1; i++) {
    const a  = cellPx(PATH[i].x, PATH[i].y);
    const b  = cellPx(PATH[i+1].x, PATH[i+1].y);
    const dx = b.px - a.px, dy = b.py - a.py;
    const angle = Math.atan2(dy, dx);
    ctx.save();
    ctx.translate(a.px + dx * 0.5, a.py + dy * 0.5);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(-CELL*0.14, -CELL*0.09);
    ctx.lineTo( CELL*0.14, 0);
    ctx.lineTo(-CELL*0.14,  CELL*0.09);
    ctx.fill();
    ctx.restore();
  }

  // --- Start/end markers ---
  const startPos = cellPx(PATH[0].x, PATH[0].y);
  const endPos   = cellPx(PATH[PATH.length-1].x, PATH[PATH.length-1].y);

  ctx.fillStyle = 'rgba(255,71,87,0.25)';
  ctx.fillRect(OX + PATH[0].x * CELL, OY + PATH[0].y * CELL, CELL, CELL);
  ctx.fillStyle = 'rgba(0,229,255,0.25)';
  ctx.fillRect(OX + PATH[PATH.length-1].x * CELL, OY + PATH[PATH.length-1].y * CELL, CELL, CELL);

  drawEmoji('⚠️',  startPos.px, startPos.py, CELL * 0.55);
  drawEmoji('🖥️', endPos.px,   endPos.py,   CELL * 0.55);

  // --- Hover preview (placement ghost + range ring) ---
  if (G.selectedType && hoverCell) {
    const {x, y} = hoverCell;
    if (!isOOB(x,y) && !isPath(x,y) && !hasTower(x,y)) {
      const def = TOWERS[G.selectedType];
      const pos = cellPx(x, y);
      ctx.strokeStyle = def.color;
      ctx.lineWidth   = 2;
      ctx.strokeRect(OX + x * CELL + 1, OY + y * CELL + 1, CELL - 2, CELL - 2);
      ctx.fillStyle = def.color + '1a';
      ctx.fillRect(OX + x * CELL, OY + y * CELL, CELL, CELL);
      // Range ring
      ctx.beginPath();
      ctx.arc(pos.px, pos.py, def.range * CELL, 0, Math.PI * 2);
      ctx.strokeStyle = def.color + '55';
      ctx.lineWidth   = 1;
      ctx.stroke();
    }
  }

  // --- Towers ---
  for (const tower of G.towers) {
    const selected = tower === G.selectedTower;
    if (selected) {
      // Range ring for selected tower
      ctx.beginPath();
      ctx.arc(tower.px, tower.py, tower.range, 0, Math.PI * 2);
      ctx.strokeStyle = tower.color + '66';
      ctx.lineWidth   = 1.5;
      ctx.stroke();
      // Highlight cell
      ctx.fillStyle = tower.color + '22';
      ctx.fillRect(OX + tower.x * CELL, OY + tower.y * CELL, CELL, CELL);
      ctx.strokeStyle = tower.color;
      ctx.lineWidth   = 2;
      ctx.strokeRect(OX + tower.x * CELL + 1, OY + tower.y * CELL + 1, CELL - 2, CELL - 2);
    }
    drawEmoji(tower.emoji, tower.px, tower.py, CELL * 0.62);
  }

  // --- Projectiles ---
  for (const p of G.projectiles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle   = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur  = 8;
    ctx.fill();
    ctx.shadowBlur  = 0;
  }

  // --- Enemies ---
  for (const e of G.enemies) {
    ctx.globalAlpha = e.stealthy ? 0.5 : 1;
    drawEmoji(e.emoji, e.x, e.y, CELL * 0.62);
    ctx.globalAlpha = 1;

    // HP bar
    const bw = CELL * 0.78, bh = 4;
    const bx = e.x - bw / 2, by = e.y + CELL * 0.37;
    ctx.fillStyle = '#1a3a5c';
    ctx.fillRect(bx, by, bw, bh);
    const pct = e.hp / e.maxHp;
    ctx.fillStyle = pct > 0.6 ? '#39ff14' : pct > 0.3 ? '#ffd32a' : '#ff4757';
    ctx.fillRect(bx, by, bw * pct, bh);

    // Slow indicator
    if (e.slowTimer > 0) drawEmoji('❄️', e.x + CELL * 0.32, e.y - CELL * 0.32, CELL * 0.28);
  }

  // --- Particles ---
  for (const p of G.particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawEmoji(emoji, x, y, size) {
  ctx.font         = size + 'px serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, x, y);
}


/* -------------------------------------------------------
   CANVAS INPUT HANDLING
   Click: place tower or select existing tower.
   Mousemove: track hover cell for placement preview.
------------------------------------------------------- */
let inputWired = false;

function initInput() {
  if (inputWired) return;   // only wire once — canvas reference is stable
  if (!canvas) return;      // safety: don't run before initCanvas()
  inputWired = true;

  canvas.addEventListener('mousemove', e => {
    const r  = canvas.getBoundingClientRect();
    const mx = (e.clientX - r.left) * (canvas.width  / r.width);
    const my = (e.clientY - r.top)  * (canvas.height / r.height);
    hoverCell = pxCell(mx, my);
  });

  canvas.addEventListener('mouseleave', () => { hoverCell = null; });

  canvas.addEventListener('click', e => {
    const r    = canvas.getBoundingClientRect();
    const mx   = (e.clientX - r.left) * (canvas.width  / r.width);
    const my   = (e.clientY - r.top)  * (canvas.height / r.height);
    const cell = pxCell(mx, my);

    if (G.selectedType) {
      placeTower(cell.x, cell.y);
      return;
    }

    // Select an existing tower
    const clicked = G.towers.find(t => t.x === cell.x && t.y === cell.y);
    G.selectedTower = clicked || null;
  });
}


/* -------------------------------------------------------
   HUD UPDATE
   Pushes all stat values to the DOM elements.
   Mirrors updateHUD / renderLives pattern from game1.js.
------------------------------------------------------- */
function updateHUD() {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  set('tdGold',  G.gold);
  set('tdLives', G.lives);
  set('tdScore', G.score.toLocaleString());
  set('tdWave',  G.wave + '/' + G.totalWaves);
  set('tdKills', G.kills);

  // Lives hearts
  const livesEl = document.getElementById('tdLivesBar');
  if (livesEl) {
    const pct = Math.max(0, G.lives / 20);
    livesEl.style.width = (pct * 100) + '%';
    livesEl.style.background = pct > 0.5 ? '#39ff14' : pct > 0.25 ? '#ffd32a' : '#ff4757';
  }

  // Streak
  const streakEl = document.getElementById('tdStreak');
  if (streakEl) {
    streakEl.textContent = G.streak >= 2 ? '🔥 ' + G.streak + 'x' : '';
    streakEl.style.color = G.streak >= 5 ? '#f59e0b' : '#fcd34d';
  }
}


/* -------------------------------------------------------
   COMBO POPUP
   Same pattern as game1.js showCombo().
------------------------------------------------------- */
function showCombo(streak) {
  const msgs = {
    3:'🔥 On a roll!', 4:'🔥🔥 Unstoppable!',
    5:'⚡ Cyber Hero!', 6:'🌟 Legendary!', 7:'💥 Unbeatable!'
  };
  const el = document.getElementById('combo');
  if (!el) return;
  el.style.color  = streak >= 5 ? '#f59e0b' : '#34d399';
  el.textContent  = msgs[Math.min(streak, 7)] || streak + 'x 🔥';
  el.className    = 'combo';
  void el.offsetWidth;
  el.className    = 'combo go';
}


/* -------------------------------------------------------
   TOAST NOTIFICATION
   Identical implementation to game1.js showToast().
------------------------------------------------------- */
function showToast(message) {
  const toast = document.createElement('div');
  toast.style.cssText = [
    'position:fixed','bottom:100px','left:50%',
    'transform:translateX(-50%)',
    'background:#1e2d3d',
    'border:0.5px solid rgba(6,182,212,0.4)',
    'color:#e2e8f0','font-size:0.83rem','font-weight:800',
    'padding:9px 18px','border-radius:20px',
    'z-index:500',
    'animation:chipPop 0.3s cubic-bezier(0.34,1.56,0.64,1)',
    'max-width:310px','text-align:center'
  ].join(';');
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}


/* -------------------------------------------------------
   CONFETTI
   Same implementation as game1.js spawnConfetti().
   Triggered on the results screen for good scores.
------------------------------------------------------- */
function spawnConfetti() {
  const colors = ['#7c3aed','#10b981','#f59e0b','#3b82f6','#ef4444','#06b6d4','#ec4899'];
  for (let i = 0; i < 70; i++) {
    const piece = document.createElement('div');
    piece.style.cssText = [
      'position:fixed','width:8px','height:8px','border-radius:2px',
      'pointer-events:none','z-index:998',
      'left:' + Math.random() * 100 + 'vw',
      'top:-10px',
      'background:' + colors[i % colors.length],
      'transform:rotate(' + Math.random() * 360 + 'deg)',
      'animation:confettiFall ' + (1.2 + Math.random() * 2) + 's ' + Math.random() * 0.6 + 's ease-in forwards'
    ].join(';');
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 3500);
  }
}


/* -------------------------------------------------------
   END GAME
   Calculates stars, populates results screen,
   saves to localStorage — mirrors game1.js endGame().
------------------------------------------------------- */
function endGame() {
  G.answered = true;

  const survived = G.lives > 0;
  const pct      = G.kills / (G.kills + (20 - G.lives));   // kill ratio
  const stars    = !survived ? 1 : pct >= 0.9 ? 3 : pct >= 0.65 ? 2 : 1;

  // Populate result screen
  const trophies = { 3:'🏆', 2:'🎉', 1:'💪' };
  const titles   = {
    3: 'PERFECT DEFENSE! 🔥',
    2: 'Great Job!',
    1: survived ? 'Keep Practicing!' : "Don't Give Up!"
  };
  const subs = {
    3: "You stopped every threat! You're a Cyber Security Legend! 🛡️",
    2: 'Your defenses held strong against most threats!',
    1: survived ? 'Every game teaches you more. Try again!' : 'You ran out of lives — but you learned a lot!'
  };

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

  set('resTrophy', trophies[stars]);
  set('resTitle',  titles[stars]);
  set('resSub',    subs[stars]);
  set('resScore',  G.score.toLocaleString() + ' pts');
  set('resStars',  '⭐'.repeat(stars) + '☆'.repeat(3 - stars));
  set('bdKills',   G.kills);
  set('bdWaves',   G.wave);
  set('bdBest',    G.best + 'x');
  set('bdBonus',   '+' + G.bonus);

  if (stars >= 2) setTimeout(spawnConfetti, 350);

  // Save to localStorage — same keys pattern as game1.js
  const passed = G.lives > 0 && G.wave >= G.totalWaves;
  localStorage.setItem('game2_passed', passed ? 'true' : 'false');
  localStorage.setItem('game2_score',  G.score);
  localStorage.setItem('game2_stars',  stars);

  showScreen('s-results');
}


/* -------------------------------------------------------
   GO TO NEXT GAME
   Called by "Next Game →" button on results screen.
------------------------------------------------------- */
function goNext() {
  const passed = localStorage.getItem('game2_passed') === 'true';
  if (passed) {
    window.location.href = '../games/game3.html';
  } else {
    showToast('💡 Survive all 5 waves to unlock Game 3!');
  }
}


/* -------------------------------------------------------
   BOOT
   Runs once on page load — sets up canvas and input
   once the game screen becomes visible.
------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  // Canvas and input are wired inside startGame() via double rAF
  // so the game screen is visible and has real pixel dimensions first.
  // Nothing else needed here.
});


// This program was made to some degree with Claude. Human coding was added for effects and to ensure accuracy.
