/* =====================================================
   ATCKR — Vocab Blast (Game 3)
   Script file: game3.js
   Description: All game logic, canvas rendering,
   player movement, bullet firing, virus spawning,
   vocab matching, score tracking, streak system,
   audio, and screen navigation for Vocab Blast.
===================================================== */


/* -------------------------------------------------------
   VOCAB DATA
   All 9 terms sourced directly from vocab.html.
   word    = term displayed at the bottom prompt
   correct = the definition the player must shoot
   decoys  = wrong definitions shown as other viruses
------------------------------------------------------- */
const VOCAB = [
  {
    word:    'Phishing',
    correct: 'Hackers pretend to be trusted sources to steal your personal info or money.',
    decoys:  [
      'Software that secretly records your online activity.',
      'A system that monitors and filters network traffic.',
      'Converting data into a coded format only you can read.'
    ]
  },
  {
    word:    'Malware',
    correct: 'Harmful software designed to damage, steal, or disrupt computer systems.',
    decoys:  [
      'A fake message that tricks you into revealing passwords.',
      'A security check using two forms of verification.',
      'When private data is exposed without permission.'
    ]
  },
  {
    word:    'Firewall',
    correct: 'Monitors and controls network traffic to block unauthorized access.',
    decoys:  [
      'Harmful software that damages or steals data from systems.',
      'A tactic used to trick people into revealing secret info.',
      'Software that secretly watches your computer activity.'
    ]
  },
  {
    word:    'Encryption',
    correct: 'Converting information into a coded form only authorized users can read.',
    decoys:  [
      'A security guard that filters all incoming network traffic.',
      'When sensitive data is exposed or stolen by hackers.',
      'Software that copies itself and spreads to other computers.'
    ]
  },
  {
    word:    'Two-Factor Authentication',
    correct: 'Logging in requires two verification steps — like a password plus a phone code.',
    decoys:  [
      'Malware that locks your files and demands money to unlock.',
      'Manipulating someone into giving up confidential information.',
      'Harmful software designed to disrupt or damage systems.'
    ]
  },
  {
    word:    'Spyware',
    correct: 'Secretly collects information about your activity without your permission.',
    decoys:  [
      'A security system that filters incoming and outgoing traffic.',
      'Converting your data into a secret coded format.',
      'When protected data is accessed without authorization.'
    ]
  },
  {
    word:    'Data Breach',
    correct: 'Sensitive or private information is accessed or exposed without authorization.',
    decoys:  [
      'Software that secretly watches what you type and browse.',
      'Requires two identity checks before granting access.',
      'Harmful software designed to steal or damage data.'
    ]
  },
  {
    word:    'Social Engineering',
    correct: 'Manipulating people into revealing confidential info or performing unsafe actions.',
    decoys:  [
      'A system that monitors and controls your network traffic.',
      'When private data is leaked or stolen without permission.',
      'Software designed to secretly record your computer activity.'
    ]
  },
  {
    word:    'Password',
    correct: 'A secret string of characters that verifies your identity and protects your accounts.',
    decoys:  [
      'Harmful software that disrupts or damages computer systems.',
      'Blocking unauthorized access using network traffic rules.',
      'Requiring two forms of identity verification to log in.'
    ]
  }
];

/* Emoji pool — shuffled each round for variety */
const VIRUS_EMOJIS = ['🦠', '🐛', '👾', '💀', '🧨', '⚠️', '🕵️', '🔒', '🎣'];


/* -------------------------------------------------------
   GAME STATE
   Mirrors the G object pattern from game1 & game2.
------------------------------------------------------- */
const G = {
  lives:    3,
  score:    0,
  streak:   0,
  best:     0,
  correct:  0,
  missed:   0,
  bonus:    0,
  round:    0,
  answered: false,
  gameOver: false,
  queue:    [],        // shuffled VOCAB entries
  viruses:  [],        // falling virus objects
  bullets:  [],        // active bullet objects
  particles:[],        // explosion particles
  player:   { x: 0, y: 0, w: 58, h: 34 },
  keys:     { left: false, right: false, shoot: false },
  shootCD:  0          // shoot cooldown timer
};


/* -------------------------------------------------------
   CANVAS SETUP
------------------------------------------------------- */
let canvas, ctx, W, H, animId;

function initCanvas() {
  canvas = document.getElementById('gameCanvas');
  ctx    = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
  if (!canvas) return;
  const wrap = canvas.parentElement;
  W = canvas.width  = wrap.clientWidth;
  H = canvas.height = wrap.clientHeight;
  G.player.x = W / 2;
  G.player.y = H - 78;
}


/* -------------------------------------------------------
   AUDIO ENGINE
   Identical lazy-init pattern to game1 & game2.
------------------------------------------------------- */
let audioCtx = null;

function getAC() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function tone(freq, type, dur, vol = 0.11) {
  try {
    const ac   = getAC();
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
  } catch(e) { /* fail silently */ }
}

function sndShoot()  { tone(800, 'square', 0.07, 0.08); }
function sndHit()    { tone(523,'sine',0.07); setTimeout(()=>tone(784,'sine',0.1),65); setTimeout(()=>tone(1047,'sine',0.16),135); }
function sndWrong()  { tone(220,'sawtooth',0.2,0.1); setTimeout(()=>tone(180,'sawtooth',0.18,0.08),125); }
function sndLeak()   { tone(180,'sawtooth',0.22,0.11); }
function sndStreak() { [523,659,784,1047].forEach((f,i) => setTimeout(()=>tone(f,'sine',0.15),i*68)); }


/* -------------------------------------------------------
   SCREEN NAVIGATION
   Same showScreen() pattern as game1 & game2.
------------------------------------------------------- */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}


/* -------------------------------------------------------
   PARTICLE BACKGROUND
   Same floating-dot starfield as game1 & game2.
------------------------------------------------------- */
(function setupParticles() {
  const el = document.getElementById('particles');
  if (!el) return;
  const pc = el.getContext('2d');
  let PW, PH, pts = [];

  function resize() {
    PW = el.width  = window.innerWidth;
    PH = el.height = window.innerHeight;
    pts = Array.from({length: 55}, () => ({
      x:  Math.random() * PW,
      y:  Math.random() * PH,
      r:  Math.random() * 1.4 + 0.4,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      a:  Math.random()
    }));
  }

  resize();
  window.addEventListener('resize', resize);

  (function loop() {
    pc.clearRect(0, 0, PW, PH);
    pts.forEach(p => {
      pc.beginPath();
      pc.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      pc.fillStyle = `rgba(0,229,255,${p.a * 0.28})`;
      pc.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > PW) p.vx *= -1;
      if (p.y < 0 || p.y > PH) p.vy *= -1;
    });
    requestAnimationFrame(loop);
  })();
})();


/* -------------------------------------------------------
   START GAME
   Resets all state and starts the game loop.
   Called by the Start button on the intro screen.
------------------------------------------------------- */
function startGame() {
  Object.assign(G, {
    lives: 3, score: 0, streak: 0, best: 0,
    correct: 0, missed: 0, bonus: 0,
    round: 0, answered: false, gameOver: false,
    viruses: [], bullets: [], particles: [], shootCD: 0,
    keys: { left: false, right: false, shoot: false }
  });

  // Shuffle vocab order each playthrough
  G.queue = [...VOCAB].sort(() => Math.random() - 0.5);

  showScreen('s-game');

  // Double rAF: same fix as game1 & game2 so canvas has real dimensions
  requestAnimationFrame(() => requestAnimationFrame(() => {
    initCanvas();
    initInput();
    G.player.x = W / 2;
    G.player.y = H - 78;
    loadNextWord();
    updateHUD();

    if (animId) cancelAnimationFrame(animId);
    let last = 0;

    function loop(ts) {
      const dt = Math.min((ts - (last || ts)) / 1000, 0.05);
      last = ts;
      if (!G.gameOver) update(dt);
      draw();
      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);
  }));
}


/* -------------------------------------------------------
   LOAD NEXT WORD
   Spawns 4 viruses per round: 1 correct + 3 decoys.
   Viruses are shuffled and stagger-spawned from above.
------------------------------------------------------- */
function loadNextWord() {
  if (G.round >= G.queue.length) { endGame(); return; }

  const entry = G.queue[G.round];
  G.currentWord = entry;
  G.viruses     = [];
  G.bullets     = [];

  // Build pool of 4 options (1 correct + 3 decoys) and shuffle
  const pool = [
    { text: entry.correct, isCorrect: true },
    ...entry.decoys.map(d => ({ text: d, isCorrect: false }))
  ].sort(() => Math.random() - 0.5);

  const count   = pool.length;           // always 4
  const spacing = W / (count + 1);
  const emojis  = [...VIRUS_EMOJIS].sort(() => Math.random() - 0.5);

  pool.forEach((v, i) => {
    G.viruses.push({
      text:      v.text,
      isCorrect: v.isCorrect,
      emoji:     emojis[i % emojis.length],
      x:         spacing * (i + 1),
      y:         -80 - i * 45,           // staggered start positions
      xDraw:     spacing * (i + 1),
      speed:     28 + G.round * 2.5,       // faster each round
      wobble:    Math.random() * Math.PI * 2,
      wobbleSpd: 0.7 + Math.random() * 0.6,
      alive:     true
    });
  });

  document.getElementById('prompt-word').textContent = entry.word;
  document.getElementById('vbRound').textContent = G.round + 1;
}


/* -------------------------------------------------------
   INPUT HANDLING
   Arrow keys / WASD to move, Space or Up to shoot.
------------------------------------------------------- */
let inputWired = false;

function initInput() {
  if (inputWired) return;
  inputWired = true;

  window.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft'  || e.key === 'a') G.keys.left  = true;
    if (e.key === 'ArrowRight' || e.key === 'd') G.keys.right = true;
    if (e.key === ' ' || e.key === 'ArrowUp')    G.keys.shoot = true;
    if (e.key === ' ') e.preventDefault();
  });

  window.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft'  || e.key === 'a') G.keys.left  = false;
    if (e.key === 'ArrowRight' || e.key === 'd') G.keys.right = false;
    if (e.key === ' ' || e.key === 'ArrowUp')    G.keys.shoot = false;
  });
}


/* -------------------------------------------------------
   UPDATE LOOP
   Handles player movement, shooting, virus movement,
   bullet collisions, and particle aging.
------------------------------------------------------- */
const PSPD = 300;  // player speed in px/s
const BSPD = 500;  // bullet speed in px/s

function update(dt) {
  if (G.answered) return;

  // --- Player movement ---
  const hw = G.player.w / 2;
  if (G.keys.left)  G.player.x = Math.max(hw,       G.player.x - PSPD * dt);
  if (G.keys.right) G.player.x = Math.min(W - hw,   G.player.x + PSPD * dt);

  // --- Shoot ---
  G.shootCD -= dt;
  if (G.keys.shoot && G.shootCD <= 0) {
    G.bullets.push({ x: G.player.x, y: G.player.y - G.player.h / 2 - 6, alive: true });
    G.shootCD = 0.26;
    sndShoot();
  }

  // --- Move viruses ---
  for (const v of G.viruses) {
    if (!v.alive) continue;
    v.y       += v.speed * dt;
    v.wobble  += v.wobbleSpd * dt;
    v.xDraw    = v.x + Math.sin(v.wobble) * 13;

    // Correct virus reaches the bottom — lose a life
    if (v.isCorrect && v.y > H - 95) {
      v.alive = false;
      G.lives--;
      G.streak = 0;
      sndLeak();
      showToast('⚠️ The right answer slipped through! -1 life');
      burst(v.xDraw, v.y, '#ff4757', 12);
      updateHUD();
      if (G.lives <= 0) { G.gameOver = true; setTimeout(endGame, 700); return; }
      G.answered = true;
      setTimeout(nextRound, 850);
      return;
    }

    // Wrong virus off the bottom — remove silently, no penalty
    if (!v.isCorrect && v.y > H + 30) v.alive = false;
  }

  // --- Move bullets & check collisions ---
  for (const b of G.bullets) {
    if (!b.alive) continue;
    b.y -= BSPD * dt;
    if (b.y < -12) { b.alive = false; continue; }

    for (const v of G.viruses) {
      if (!v.alive) continue;
      if (Math.abs(b.x - v.xDraw) < 42 && Math.abs(b.y - v.y) < 32) {
        b.alive = false;
        v.alive = false;
        if (v.isCorrect) {
          // ✅ Correct hit
          G.correct++;
          G.streak++;
          if (G.streak > G.best) G.best = G.streak;

          let pts = 100 + G.round * 10;
          if (G.streak >= 4) pts += 50;
          else if (G.streak >= 2) pts += 20;
          G.bonus += pts - (100 + G.round * 10);
          G.score += pts;

          sndHit();
          if (G.streak >= 3) { setTimeout(sndStreak, 150); showCombo(G.streak); }
          burst(v.xDraw, v.y, '#39ff14', 18);
          showToast('✅ Correct! +' + pts + ' pts');
          updateHUD();
          G.answered = true;
          setTimeout(nextRound, 900);

        } else {
          // ❌ Wrong hit
          G.lives--;
          G.streak = 0;
          G.missed++;
          sndWrong();
          burst(v.xDraw, v.y, '#ff4757', 12);
          showToast('❌ Wrong definition! -1 life');
          updateHUD();
          shakeCanvas();
          if (G.lives <= 0) { G.gameOver = true; setTimeout(endGame, 700); return; }
        }
        break;
      }
    }
  }

  // Clean up dead bullets
  G.bullets = G.bullets.filter(b => b.alive);

  // All viruses gone without a correct hit — advance anyway
  if (G.viruses.every(v => !v.alive) && !G.answered) {
    G.missed++;
    G.answered = true;
    setTimeout(nextRound, 400);
  }

  // --- Age particles ---
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i];
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.life -= dt;
    if (p.life <= 0) G.particles.splice(i, 1);
  }
}

function nextRound() {
  G.round++;
  G.answered = false;
  if (G.round >= G.queue.length) { endGame(); return; }
  loadNextWord();
}


/* -------------------------------------------------------
   DRAW
   Renders background grid, viruses with definition
   bubbles, bullets, the player computer, and particles.
------------------------------------------------------- */
function draw() {
  if (!ctx) return;
  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = '#060d14';
  ctx.fillRect(0, 0, W, H);

  // Subtle grid
  ctx.strokeStyle = 'rgba(0,229,255,0.035)';
  ctx.lineWidth   = 1;
  for (let x = 0; x < W; x += 44) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y < H; y += 44) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  // --- Viruses ---
  for (const v of G.viruses) {
    if (!v.alive) continue;
    const vx = v.xDraw;

    // Glow halo
    const grd = ctx.createRadialGradient(vx, v.y, 0, vx, v.y, 50);
    grd.addColorStop(0, 'rgba(0,229,255,0.12)');
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(vx, v.y, 50, 0, Math.PI * 2); ctx.fill();

    // Emoji body
    ctx.font = '1.75rem serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(v.emoji, vx, v.y - 2);

    // Definition text bubble
    drawBubble(vx, v.y + 24, v.text, v.isCorrect);
  }

  // --- Bullets ---
  for (const b of G.bullets) {
    if (!b.alive) continue;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur  = 14;
    ctx.fillStyle   = '#00e5ff';
    ctx.beginPath();
    ctx.roundRect(b.x - 3, b.y - 11, 6, 22, 3);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // --- Player (computer/monitor) ---
  drawPlayer();

  // --- Particles ---
  for (const p of G.particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color; ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* Draws a text bubble containing the definition below the virus emoji */
function drawBubble(cx, topY, text, isCorrect) {
  const maxW  = Math.min(175, W * 0.26);
  const lh    = 13;
  const pad   = 6;
  const lines = wrapText(text, maxW);
  const bh    = lines.length * lh + pad * 2;
  const bw    = maxW + pad * 2;

  ctx.fillStyle   =  'rgba(10,20,35,0.9)' ;
  ctx.strokeStyle = 'rgba(0,299,255,0.4)' ;
  ctx.lineWidth   = 1;
  rr(cx - bw / 2, topY, bw, bh, 8);
  ctx.fill(); ctx.stroke();

  ctx.fillStyle    =  '#e2e8f0';
  ctx.font         = '600 0.6rem Nunito, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  lines.forEach((line, i) => ctx.fillText(line, cx, topY + pad + i * lh));
}

/* Draws the stylised computer/monitor player at the bottom */
function drawPlayer() {
  const { x, y, w, h } = G.player;
  const hw = w / 2, hh = h / 2;

  ctx.shadowColor = '#00e5ff';
  ctx.shadowBlur  = 16;

  // Monitor body
  ctx.fillStyle   = '#0d2235';
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth   = 2;
  rr(x - hw, y - hh, w, h - 7, 6);
  ctx.fill(); ctx.stroke();

  // Screen interior
  ctx.fillStyle = '#001828';
  rr(x - hw + 5, y - hh + 4, w - 10, h - 17, 4);
  ctx.fill();

  // Screen icon
  ctx.shadowBlur = 0;
  ctx.font = 'bold 0.9rem serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('💻', x, y - 5);

  // Stand
  ctx.fillStyle   = '#0d2235';
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.moveTo(x - 8,  y + hh - 7);
  ctx.lineTo(x + 8,  y + hh - 7);
  ctx.lineTo(x + 13, y + hh);
  ctx.lineTo(x - 13, y + hh);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Cannon barrel
  ctx.fillStyle   = '#00e5ff';
  ctx.shadowColor = '#00e5ff';
  ctx.shadowBlur  = 8;
  ctx.fillRect(x - 3, y - hh - 11, 6, 12);
  ctx.shadowBlur = 0;
}


/* -------------------------------------------------------
   UTILITY HELPERS
------------------------------------------------------- */

/* Word-wrap text to fit within maxW pixels */
function wrapText(text, maxW) {
  ctx.font = '600 0.6rem Nunito, sans-serif';
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const word of words) {
    const test = cur ? cur + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur); cur = word;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/* Draw a rounded rectangle path (used for bubbles and player) */
function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);     ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);     ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);         ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* Spawn an explosion particle burst */
function burst(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1.5 + Math.random() * 3.5;
    G.particles.push({
      x, y,
      vx:    Math.cos(a) * s,
      vy:    Math.sin(a) * s,
      color,
      life:  0.4 + Math.random() * 0.4,
      size:  2 + Math.random() * 4
    });
  }
}

/* Shake the canvas-wrap element on a wrong answer */
function shakeCanvas() {
  const el = document.getElementById('canvas-wrap');
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = 'wrongShake 0.35s ease';
  setTimeout(() => el.style.animation = '', 400);
}


/* -------------------------------------------------------
   HUD & UI HELPERS
   Same patterns as game1 & game2.
------------------------------------------------------- */
function updateHUD() {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('vbLives',   G.lives);
  set('vbScore',   G.score.toLocaleString());
  set('vbCorrect', G.correct);
  set('vbTotal',   G.queue.length);
  set('vbRound',   Math.min(G.round + 1, G.queue.length));

  const el = document.getElementById('vbStreak');
  if (el) {
    el.textContent = G.streak >= 2 ? '🔥 ' + G.streak + 'x' : '';
    el.style.color = G.streak >= 5 ? '#f59e0b' : '#fcd34d';
  }
}

function showCombo(streak) {
  const msgs = { 3:'🔥 On a roll!', 4:'🔥🔥 Unstoppable!', 5:'⚡ Vocab Hero!', 6:'🌟 Legendary!', 7:'💥 Unbeatable!' };
  const el   = document.getElementById('combo');
  if (!el) return;
  el.style.color = streak >= 5 ? '#f59e0b' : '#34d399';
  el.textContent = msgs[Math.min(streak, 7)] || streak + 'x 🔥';
  el.className   = 'combo';
  void el.offsetWidth;
  el.className   = 'combo go';
}

function showToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = [
    'position:fixed', 'bottom:100px', 'left:50%',
    'transform:translateX(-50%)',
    'background:#0d1f33',
    'border:0.5px solid rgba(0,229,255,0.35)',
    'color:#e2e8f0', 'font-size:0.82rem', 'font-weight:800',
    'padding:9px 18px', 'border-radius:20px',
    'z-index:500',
    'animation:chipPop 0.3s cubic-bezier(0.34,1.56,0.64,1)',
    'max-width:320px', 'text-align:center', 'white-space:nowrap'
  ].join(';');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2800);
}

function spawnConfetti() {
  const colors = ['#7c3aed','#10b981','#f59e0b','#3b82f6','#ef4444','#06b6d4','#ec4899'];
  for (let i = 0; i < 70; i++) {
    const p = document.createElement('div');
    p.style.cssText = [
      'position:fixed', 'width:8px', 'height:8px', 'border-radius:2px',
      'pointer-events:none', 'z-index:998',
      'left:' + Math.random() * 100 + 'vw', 'top:-10px',
      'background:' + colors[i % colors.length],
      'transform:rotate(' + Math.random() * 360 + 'deg)',
      'animation:confettiFall ' + (1.2 + Math.random() * 2) + 's ' + Math.random() * 0.6 + 's ease-in forwards'
    ].join(';');
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 3500);
  }
}


/* -------------------------------------------------------
   END GAME
   Calculates stars, populates results screen,
   saves to localStorage — mirrors game1 & game2.
------------------------------------------------------- */
function endGame() {
  G.gameOver = true;
  if (animId) cancelAnimationFrame(animId);

  const total    = G.queue.length;
  const pct      = G.correct / total;
  const survived = G.lives > 0;
  const stars    = !survived ? 1 : pct >= 0.85 ? 3 : pct >= 0.6 ? 2 : 1;

  const trophies = { 3:'🏆', 2:'🎉', 1:'💪' };
  const titles   = { 3:'VOCAB MASTER! 🔥', 2:'Great Job!', 1: survived ? 'Keep Studying!' : "Don't Give Up!" };
  const subs     = {
    3: "You know every cybersecurity term! You're a digital defender! 🛡️",
    2: 'Solid vocab knowledge — review the tricky ones and try again!',
    1: survived ? 'Every round teaches you more. Try again!' : 'You ran out of lives — but you learned a lot!'
  };

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('resTrophy', trophies[stars]);
  set('resTitle',  titles[stars]);
  set('resSub',    subs[stars]);
  set('resScore',  G.score.toLocaleString() + ' pts');
  set('resStars',  '⭐'.repeat(stars) + '☆'.repeat(3 - stars));
  set('bdCorrect', G.correct + '/' + total);
  set('bdMissed',  G.missed);
  set('bdBest',    G.best + 'x');
  set('bdBonus',   '+' + G.bonus);

  if (stars >= 2) setTimeout(spawnConfetti, 350);

  // Save to localStorage — same key pattern as game1 & game2
  localStorage.setItem('game3_passed', (survived && pct >= 0.6) ? 'true' : 'false');
  localStorage.setItem('game3_score',  G.score);
  localStorage.setItem('game3_stars',  stars);

  showScreen('s-results');
}

function goHome() {
  window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {
  // Canvas and input are wired inside startGame() via double rAF
  // so the game screen is visible with real dimensions first.
  // Nothing else needed here.
});

// This program was made to some degree with Claude. Human coding was added for effects and to ensure accuracy.
