/* =====================================================
   ATCKR — Cyber Defense Quiz (Checkpoint 2)
   Script: quiz2.js
   Description: All quiz logic, hint system, answer
   checking, confetti on completion, and localStorage
   progress saving. Students must get all 5 correct.
   ===================================================== */


/* -------------------------------------------------------
   QUIZ QUESTIONS — Cyber Defense Focus
   5 questions about how to defend against threats,
   what each tool does, and real-world best practices.
------------------------------------------------------- */
const QUESTIONS = [
  {
    img: '🧱',
    caption: '// SCENARIO: Your computer is being hit with worms',
    question: 'Worms are spreading fast across your network trying to reach your computer. Which defense should you use first?',
    choices: [
      'A VPN Shield — it encrypts all traffic',
      'A Firewall — it blocks common threats like worms',
      'An Updater — it slows the worms down',
      'Do nothing — worms usually go away on their own'
    ],
    correct: 1,
    hint: '💡 Think about what a Firewall does in real life — it acts like a security guard checking every visitor trying to reach your computer. Which enemy is it designed to stop?',
    fact: '✅ Correct! A Firewall is your first line of defense against worms. It checks every connection and blocks threats before they reach your system.'
  },
  {
    img: '🕵️',
    caption: '// SCENARIO: Something is secretly watching you',
    question: 'Spyware is silently collecting your passwords without you knowing. What is the BEST tool to detect and remove it?',
    choices: [
      'A Firewall — it blocks all incoming traffic',
      'A VPN Shield — it hides your activity',
      'Antivirus software — it scans for hidden threats',
      'Just restart your computer and hope it goes away'
    ],
    correct: 2,
    hint: '💡 Spyware is stealthy — it hides itself. You need a tool that specifically scans your computer looking for programs in disguise. Which tool in the game could "see" stealthy enemies?',
    fact: '✅ Correct! Antivirus software scans your entire computer for hidden malware like spyware. In the game, the Antivirus tower was the ONLY one that could detect stealthy enemies!'
  },
  {
    img: '🔒',
    caption: '// SCENARIO: All your files are locked',
    question: 'Ransomware has locked all your files and is demanding money. What should you do to PREVENT this from happening in the future?',
    choices: [
      'Pay the ransom — it\'s the quickest solution',
      'Use a VPN to encrypt your traffic and keep backups of your files',
      'Delete all your files so ransomware has nothing to lock',
      'Turn off your computer forever'
    ],
    correct: 1,
    hint: '💡 Prevention is better than cure! Think about two things: one tool that hides and encrypts your internet traffic, and one habit that means you always have a copy of your files even if they get locked.',
    fact: '✅ Correct! A VPN encrypts your internet traffic so ransomware can\'t intercept it. And keeping regular backups means even if ransomware strikes, you don\'t lose your files!'
  },
  {
    img: '🔄',
    caption: '// SCENARIO: Hackers are exploiting old software',
    question: 'Hackers are using a security hole in your old software to attack your computer. What is the MOST important thing you can do?',
    choices: [
      'Ignore it — old software works fine',
      'Buy a new computer',
      'Keep your software updated — updates patch security holes',
      'Only use the internet sometimes'
    ],
    correct: 2,
    hint: '💡 In the game, the Updater tower patched exploits and slowed enemies. In real life, the same concept applies — what do software companies release to fix security holes in their programs?',
    fact: '✅ Correct! Software updates patch security vulnerabilities. Outdated software is one of the most common ways hackers break in. Always keep your apps and operating system updated!'
  },
  {
    img: '🛡️',
    caption: '// SCENARIO: Building a strong defense',
    question: 'Which combination of defenses gives you the STRONGEST protection against ALL types of cyber threats?',
    choices: [
      'Just a Firewall — one strong wall is enough',
      'Antivirus + Firewall + VPN + keeping software updated',
      'Only a VPN — it hides everything',
      'Turning off WiFi when not using it'
    ],
    correct: 1,
    hint: '💡 Remember in the game — different towers stopped different enemies. No single tower could beat everything. The same is true in real life. What combination covers all the threats you learned about?',
    fact: '✅ Correct! Real cybersecurity uses multiple layers of protection — just like the game! Firewall blocks common attacks, Antivirus finds hidden malware, VPN encrypts your traffic, and updates patch vulnerabilities.'
  }
];


/* -------------------------------------------------------
   QUIZ STATE
------------------------------------------------------- */
const Q = {
  index:     0,
  correct:   0,
  answered:  false,
  hintShown: false
};


/* -------------------------------------------------------
   PARTICLE BACKGROUND — cyan dots matching game2 theme
------------------------------------------------------- */
(function setupParticles() {
  const canvas = document.getElementById('particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, pts = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    pts = Array.from({ length: 40 }, () => ({
      x:  Math.random() * W,
      y:  Math.random() * H,
      r:  Math.random() * 1.2 + 0.4,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      a:  Math.random()
    }));
  }

  resize();
  window.addEventListener('resize', resize);

  (function draw() {
    ctx.clearRect(0, 0, W, H);
    pts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 229, 255, ${p.a * 0.4})`;
      ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
    });
    requestAnimationFrame(draw);
  })();
})();


/* -------------------------------------------------------
   SCREEN NAVIGATION
------------------------------------------------------- */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}


/* -------------------------------------------------------
   START QUIZ
------------------------------------------------------- */
function startQuiz() {
  Q.index = 0; Q.correct = 0; Q.answered = false; Q.hintShown = false;
  showScreen('s-quiz');
  loadQuestion();
}


/* -------------------------------------------------------
   LOAD QUESTION
------------------------------------------------------- */
function loadQuestion() {
  const q   = QUESTIONS[Q.index];
  const tot = QUESTIONS.length;
  Q.answered = false; Q.hintShown = false;

  const pct = Math.round((Q.index / tot) * 100);
  document.getElementById('progFill').style.width = pct + '%';
  document.getElementById('qNum').textContent    = 'Q' + (Q.index + 1) + ' / ' + tot;
  document.getElementById('qScore').textContent  = Q.correct + ' / ' + tot;

  const imgEl = document.getElementById('qImg');
  if (q.img.startsWith('../') || q.img.endsWith('.jpg') || q.img.endsWith('.png')) {
    imgEl.innerHTML = '<img src="' + q.img + '" alt="Question image">';
  } else {
    imgEl.textContent = q.img;
    imgEl.style.fontSize = '4.5rem';
  }

  document.getElementById('qCaption').textContent = q.caption;
  document.getElementById('qText').textContent    = q.question;

  const choicesEl = document.getElementById('choices');
  choicesEl.innerHTML = '';
  ['A','B','C','D'].forEach((letter, i) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.innerHTML = '<span class="choice-letter">' + letter + '</span>' + q.choices[i];
    btn.onclick = () => checkAnswer(i, btn);
    choicesEl.appendChild(btn);
  });

  document.getElementById('hintBox').textContent = '';
  document.getElementById('hintBox').className   = 'hint-box';
  document.getElementById('hintBtn').disabled    = false;
  document.getElementById('feedback').textContent = '';
  document.getElementById('feedback').className   = 'feedback';

  const card = document.getElementById('qCard');
  card.style.animation = 'none';
  void card.offsetWidth;
  card.style.animation = 'cardIn 0.4s cubic-bezier(0.34,1.56,0.64,1)';
}


/* -------------------------------------------------------
   CHECK ANSWER
------------------------------------------------------- */
function checkAnswer(index, btn) {
  if (Q.answered) return;
  const q = QUESTIONS[Q.index];

  if (index === q.correct) {
    Q.answered = true;
    Q.correct++;
    btn.classList.add('correct');
    document.querySelectorAll('.choice-btn').forEach(b => b.disabled = true);
    document.getElementById('qScore').textContent = Q.correct + ' / ' + QUESTIONS.length;
    const fb = document.getElementById('feedback');
    fb.textContent = q.fact;
    fb.className   = 'feedback ok';
    setTimeout(() => {
      if (Q.index + 1 >= QUESTIONS.length) {
        showComplete();
      } else {
        Q.index++;
        loadQuestion();
      }
    }, 2200);
  } else {
    btn.classList.add('wrong');
    setTimeout(() => btn.classList.remove('wrong'), 500);
    const fb = document.getElementById('feedback');
    fb.textContent = 'Not quite — try again! Check the hint if you need help. 💡';
    fb.className   = 'feedback no';
    if (!Q.hintShown) setTimeout(showHint, 600);
  }
}


/* -------------------------------------------------------
   SHOW HINT
------------------------------------------------------- */
function showHint() {
  if (Q.hintShown) return;
  Q.hintShown = true;
  const hb = document.getElementById('hintBox');
  hb.textContent = QUESTIONS[Q.index].hint;
  hb.className   = 'hint-box show';
  document.getElementById('hintBtn').disabled = true;
}


/* -------------------------------------------------------
   SHOW COMPLETE
------------------------------------------------------- */
function showComplete() {
  localStorage.setItem('quiz2_passed', 'true');
  localStorage.setItem('quiz2_score', Q.correct);
  spawnConfetti();
  showScreen('s-complete');
}


/* -------------------------------------------------------
   CONFETTI — fills the full screen with cyan and green
------------------------------------------------------- */
function spawnConfetti() {
  const colors = ['#00e5ff', '#39ff14', '#ffffff', '#ffd32a', '#a55eea', '#00b8cc'];
  const style  = document.createElement('style');
  style.textContent = `
    @keyframes cFall {
      0%   { transform: translateY(-10px) rotate(0deg);   opacity: 1; }
      100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
    }
    @keyframes cFallSide {
      0%   { transform: translateY(-10px) translateX(0) rotate(0deg);   opacity: 1; }
      100% { transform: translateY(110vh) translateX(80px) rotate(540deg); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  for (let i = 0; i < 150; i++) {
    const el     = document.createElement('div');
    const size   = Math.random() * 8 + 4;
    const isRect = Math.random() > 0.5;
    el.style.cssText = [
      'position:fixed',
      'pointer-events:none',
      'z-index:9999',
      'left:'   + Math.random() * 100 + 'vw',
      'top:-20px',
      'width:'  + size + 'px',
      'height:' + (isRect ? size * 0.4 : size) + 'px',
      'border-radius:' + (isRect ? '1px' : '50%'),
      'background:' + colors[i % colors.length],
      'opacity:1',
      'animation:' + (Math.random() > 0.5 ? 'cFall' : 'cFallSide') + ' ' +
        (1.5 + Math.random() * 2.5) + 's ' +
        (Math.random() * 0.8) + 's ease-in forwards'
    ].join(';');
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4500);
  }
}


/* -------------------------------------------------------
   GO TO LEVEL 3
------------------------------------------------------- */
function goToLevel3() {
  window.location.href = 'vocabblast.html';
}
