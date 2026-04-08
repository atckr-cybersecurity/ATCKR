/* =====================================================
   ATCKR — Phishing Quiz (Checkpoint 1)
   Script: quiz1.js
   Description: All quiz logic, hint system, answer
   checking, progress tracking, and screen navigation.
   Students must get every question right to proceed.
   ===================================================== */


/* -------------------------------------------------------
   QUIZ QUESTIONS
   Each question has: the visual emoji/image, a caption,
   the question text, 4 answer choices, the correct
   answer index (0-3), a hint, and a fun fact shown
   after getting it right.
------------------------------------------------------- */
const QUESTIONS = [
  {
    img: '🎣',
    caption: '// SCENARIO: Suspicious text message',
    question: 'You get a text from "Bank of America" saying your account is locked and you must click a link immediately. What should you do?',
    choices: [
      'Click the link right away — your account might get closed!',
      'Ignore it and call your bank directly using their real number',
      'Reply to the text and ask if it is real',
      'Forward the link to a friend to check'
    ],
    correct: 1,
    hint: '💡 Think about this — if your account was really in danger, would a bank ask you to click a random link in a text? Real banks have official phone numbers you can call instead.',
    fact: '✅ Correct! Real banks NEVER ask you to log in through a text link. Always call the number on the back of your card or go directly to the bank website by typing it yourself.'
  },
  {
    img: '🔗',
    caption: '// SCENARIO: Checking a website link',
    question: 'You receive a text saying you won a prize and it sends you to: "amaz0n-giftcard-winner.xyz" — what is wrong with this link?',
    choices: [
      'Nothing — it looks fine to me',
      'The link is too long',
      '"amaz0n" uses a zero instead of the letter O — it is a fake URL',
      'It ends in .xyz which is a rare domain'
    ],
    correct: 2,
    hint: '💡 Look very carefully at the word "amaz0n" — is every letter correct? Scammers replace letters with numbers that look similar to trick you. The letter O and the number 0 look almost the same!',
    fact: '✅ Correct! Scammers use tricks like replacing "o" with "0" or "l" with "1" to make fake URLs look real. Always read every letter of a link carefully before clicking!'
  },
  {
    img: '⚡',
    caption: '// SCENARIO: Urgent message pressure',
    question: 'A message says "YOU HAVE 10 MINUTES to claim your free gift card or it expires FOREVER!" Why is extreme urgency a red flag?',
    choices: [
      'It is not a red flag — the offer might really expire',
      'Scammers create panic so you act fast without thinking',
      'Only emails with urgency are scams, not texts',
      'Urgency is only a problem if the message has a link'
    ],
    correct: 1,
    hint: '💡 Why would a real company only give you 10 minutes? Think about what happens when you panic — do you check things carefully or do you just react quickly? Scammers WANT you to panic so you stop thinking.',
    fact: '✅ Correct! Creating panic and urgency is one of the oldest scam tricks. When something makes you feel rushed or scared, that is exactly when you should slow down and think carefully.'
  },
  {
    img: '🔑',
    caption: '// SCENARIO: Gaming chat request',
    question: 'Someone in an online game offers you 1000 free diamonds but says you need to give them your username and password first. What should you do?',
    choices: [
      'Give them your info — free diamonds sound great!',
      'Only give your username but not your password',
      'Never share your password with anyone — this is a scam',
      'Ask them to prove it works first, then share your info'
    ],
    correct: 2,
    hint: '💡 There is one thing you should NEVER share with ANYONE online — not even someone who claims to be a friend or a developer. Free items in games never require your login information.',
    fact: '✅ Correct! You should NEVER give your password to anyone — not a stranger, not a "developer," not even someone claiming to be from the game company. Free item generators are always fake and designed to steal accounts.'
  },
  {
    img: '🛡️',
    caption: '// SCENARIO: Real vs fake messages',
    question: 'Which of these messages is most likely to be a REAL, safe message?',
    choices: [
      '"CONGRATULATIONS!! You won $500! Claim in 5 MIN: pr1ze-winner.net"',
      '"Your school is closed tomorrow. Questions? Call: (617) 555-0120"',
      '"Your Netflix is SUSPENDED — update billing: netf1ix-update.com"',
      '"Click here IMMEDIATELY or your account will be DELETED forever"'
    ],
    correct: 1,
    hint: '💡 Look at each message and ask: does it create panic? Does it have a suspicious link? Does it promise something too good to be true? One of these messages is calm, gives a real phone number, and asks you to do nothing suspicious.',
    fact: '✅ Correct! The school message is safe because it gives a real phone number to verify, has no suspicious links, asks nothing personal from you, and uses calm simple language. Scam messages almost always have urgency, fake links, or impossible prizes.'
  }
];


/* -------------------------------------------------------
   QUIZ STATE
------------------------------------------------------- */
const Q = {
  index:      0,      // current question number
  correct:    0,      // how many answered correctly
  answered:   false,  // prevents clicking while locked
  hintShown:  false   // tracks if hint is already visible
};


/* -------------------------------------------------------
   PARTICLE BACKGROUND
   Same floating dot effect as the main game
------------------------------------------------------- */
(function setupParticles() {
  const canvas = document.getElementById('particles');
  const ctx    = canvas.getContext('2d');
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
      ctx.fillStyle = `rgba(82, 214, 58, ${p.a * 0.4})`;
      ctx.fill();
      p.x += p.vx;
      p.y += p.vy;
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
   Resets state and loads the first question
------------------------------------------------------- */
function startQuiz() {
  Q.index    = 0;
  Q.correct  = 0;
  Q.answered = false;
  Q.hintShown = false;
  showScreen('s-quiz');
  loadQuestion();
}


/* -------------------------------------------------------
   LOAD QUESTION
   Populates the question card with current question data
   and builds the answer choice buttons dynamically
------------------------------------------------------- */
function loadQuestion() {
  const q = QUESTIONS[Q.index];
  Q.answered  = false;
  Q.hintShown = false;

  // Update progress bar and counter
  const pct = Math.round((Q.index / QUESTIONS.length) * 100);
  document.getElementById('qProgressBar').style.width = pct + '%';
  document.getElementById('qCounter').textContent = 'Q' + (Q.index + 1) + ' / ' + QUESTIONS.length;
  document.getElementById('qScore').textContent   = Q.correct + ' / ' + QUESTIONS.length;

  // Set image — supports both emoji and actual image files
  const imgEl = document.getElementById('qImg');
  if (q.img.startsWith('../') || q.img.endsWith('.jpg') || q.img.endsWith('.png')) {
    imgEl.innerHTML = '<img src="' + q.img + '" alt="Question illustration">';
  } else {
    imgEl.textContent = q.img;
    imgEl.style.fontSize = '5rem';
  }

  document.getElementById('qCaption').textContent = q.caption;
  document.getElementById('qText').textContent    = q.question;

  // Build answer choice buttons
  const choicesEl = document.getElementById('choices');
  choicesEl.innerHTML = '';
  const letters = ['A', 'B', 'C', 'D'];

  q.choices.forEach((text, i) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.innerHTML = '<span class="choice-letter">' + letters[i] + '</span>' + text;
    btn.onclick = () => checkAnswer(i, btn);
    choicesEl.appendChild(btn);
  });

  // Reset hint and feedback
  document.getElementById('hintBox').textContent = '';
  document.getElementById('hintBox').className   = 'hint-box';
  document.getElementById('btnHint').disabled    = false;
  document.getElementById('feedbackMsg').textContent = '';
  document.getElementById('feedbackMsg').className   = 'feedback-msg';

  // Animate card in
  const card = document.getElementById('qCard');
  card.style.animation = 'none';
  void card.offsetWidth;
  card.style.animation = 'cardIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
}


/* -------------------------------------------------------
   CHECK ANSWER
   Called when a student clicks a choice button.
   If correct — show success feedback then advance.
   If wrong — shake the button, show hint prompt,
   and let them try again. Never locks them out.
------------------------------------------------------- */
function checkAnswer(index, btn) {
  if (Q.answered) return;

  const q = QUESTIONS[Q.index];

  if (index === q.correct) {
    // CORRECT — lock answer, show success state
    Q.answered = true;
    Q.correct++;

    btn.classList.add('correct');

    // Disable all other buttons
    document.querySelectorAll('.choice-btn').forEach(b => b.disabled = true);

    // Show success feedback
    const fb = document.getElementById('feedbackMsg');
    fb.textContent = q.fact;
    fb.className   = 'feedback-msg show-correct';

    // Update score display
    document.getElementById('qScore').textContent = Q.correct + ' / ' + QUESTIONS.length;

    // Wait then move to next question or complete screen
    setTimeout(() => {
      if (Q.index + 1 >= QUESTIONS.length) {
        showComplete();
      } else {
        Q.index++;
        loadQuestion();
      }
    }, 2200);

  } else {
    // WRONG — shake button and show hint prompt
    btn.classList.add('wrong');
    setTimeout(() => btn.classList.remove('wrong'), 500);

    // Show feedback nudge
    const fb = document.getElementById('feedbackMsg');
    fb.textContent = "Not quite — try again! Use the hint if you need help. 💡";
    fb.className   = 'feedback-msg show-wrong';

    // Auto-show hint after a wrong answer if not already shown
    if (!Q.hintShown) {
      setTimeout(() => showHint(), 600);
    }
  }
}


/* -------------------------------------------------------
   SHOW HINT
   Reveals the hint text for the current question.
   Only shows once — button disables after use.
------------------------------------------------------- */
function showHint() {
  if (Q.hintShown) return;
  Q.hintShown = true;

  const q       = QUESTIONS[Q.index];
  const hintBox = document.getElementById('hintBox');
  hintBox.textContent = q.hint;
  hintBox.className   = 'hint-box show';

  document.getElementById('btnHint').disabled = true;
}


/* -------------------------------------------------------
   SHOW COMPLETE SCREEN
   Populates and displays the quiz complete screen
   with confetti and saves progress to localStorage
------------------------------------------------------- */
function showComplete() {
  // Save quiz completion to localStorage
  localStorage.setItem('quiz1_passed', 'true');
  localStorage.setItem('quiz1_score', Q.correct);

  spawnConfetti();
  showScreen('s-complete');
}


/* -------------------------------------------------------
   CONFETTI
   Green and white confetti matching ATCKR theme
------------------------------------------------------- */
function spawnConfetti() {
  const colors = ['#52d63a', '#ffffff', '#3db829', '#a3f075', '#f59e0b', '#00ff41'];

  const style = document.createElement('style');
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
   GO TO LEVEL 2
   Change the href to point to your game2.html file
------------------------------------------------------- */
function goToLevel2() {
  window.location.href = 'game2.html';
}
