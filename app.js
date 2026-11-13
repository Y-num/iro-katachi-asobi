(() => {
  "use strict";

  const COLORS = [
    { id: "red", name: "あか", adj: "あかい", hex: "#FF595E", stroke: "#D9383E" },
    { id: "blue", name: "あお", adj: "あおい", hex: "#1982C4", stroke: "#105E91" },
    { id: "yellow", name: "きいろ", adj: "きいろい", hex: "#FFCA3A", stroke: "#D9A314" },
    { id: "green", name: "みどり", adj: "みどりの", hex: "#8AC926", stroke: "#669B14" },
    { id: "orange", name: "おれんじ", adj: "おれんじの", hex: "#FF924C", stroke: "#D66B27" },
    { id: "purple", name: "むらさき", adj: "むらさきの", hex: "#9B5DE5", stroke: "#7538BF" },
  ];

  const SHAPES = [
    { id: "circle", name: "まる" },
    { id: "triangle", name: "さんかく" },
    { id: "square", name: "しかく" },
    { id: "star", name: "ほし" },
    { id: "heart", name: "はーと" },
    { id: "diamond", name: "だいや" },
  ];

  const PRAISE_WORDS = [
    { text: "やったね！", emoji: "🎉" },
    { text: "すごい！", emoji: "🌟" },
    { text: "せいかい！", emoji: "✨" },
    { text: "じょうず！", emoji: "👏" },
    { text: "ぴんぽーん！", emoji: "🎈" },
  ];

  // どう弾いても心地よいペンタトニックスケール（ド・レ・ミ・ソ・ラ・ド）
  const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];

  const state = {
    score: 0,
    soundEnabled: true,
    isTransitioning: false,
    currentQuestion: null,
    audioCtx: null,
  };

  // DOM Elements
  const btnReset = document.getElementById("btn-reset");
  const scoreBadge = document.getElementById("score-badge");
  const scoreCount = document.getElementById("score-count");
  const btnSound = document.getElementById("btn-sound");
  const iconSoundOn = document.getElementById("icon-sound-on");
  const iconSoundOff = document.getElementById("icon-sound-off");
  const btnSpeak = document.getElementById("btn-speak");
  const targetSlot = document.getElementById("target-slot");
  const targetVisual = document.getElementById("target-visual");
  const gardenStage = document.getElementById("garden-stage");
  const treeVisual = document.getElementById("tree-visual");
  const treeSparkle = document.getElementById("tree-sparkle");
  const toySun = document.getElementById("toy-sun");
  const toyCloud = document.getElementById("toy-cloud");
  const toyRainbow = document.getElementById("toy-rainbow");
  const toyBalloon = document.getElementById("toy-balloon");
  const toyButterfly = document.getElementById("toy-butterfly");
  const toyBird = document.getElementById("toy-bird");
  const toyFlowerL = document.getElementById("toy-flower-l");
  const toyFlowerR = document.getElementById("toy-flower-r");
  const toyRabbit = document.getElementById("toy-rabbit");
  const toyCat = document.getElementById("toy-cat");
  const toyDog = document.getElementById("toy-dog");
  const choicesGrid = document.getElementById("choices-grid");
  const feedbackBubble = document.getElementById("feedback-bubble");
  const feedbackEmoji = document.getElementById("feedback-emoji");
  const confettiCanvas = document.getElementById("confetti-canvas");

  // --- Audio (Web Audio API) ---
  function ensureAudioContext() {
    if (!state.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        state.audioCtx = new AudioCtx();
      }
    }
    if (state.audioCtx && state.audioCtx.state === "suspended") {
      state.audioCtx.resume().catch(() => {});
    }
  }

  function playTone(freq, duration, type = "sine", delay = 0, volume = 0.15) {
    if (!state.soundEnabled) return;
    ensureAudioContext();
    const ctx = state.audioCtx;
    if (!ctx) return;

    const startTime = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  function playPentatonicNote(index) {
    const freq = PENTATONIC[index % PENTATONIC.length];
    playTone(freq, 0.22, "triangle", 0, 0.14);
  }

  function playChimeArpeggio() {
    playTone(659.25, 0.15, "sine", 0, 0.12);
    playTone(783.99, 0.15, "sine", 0.07, 0.12);
    playTone(1046.5, 0.25, "sine", 0.14, 0.13);
  }

  function playRainSound() {
    playTone(880, 0.08, "sine", 0, 0.08);
    playTone(783.99, 0.08, "sine", 0.08, 0.08);
    playTone(987.77, 0.1, "sine", 0.16, 0.08);
  }

  function playSuccessSound() {
    playTone(523.25, 0.14, "triangle", 0, 0.18);
    playTone(659.25, 0.14, "triangle", 0.09, 0.18);
    playTone(783.99, 0.28, "triangle", 0.18, 0.2);
    playTone(1046.5, 0.35, "sine", 0.27, 0.16);
  }

  function playMilestoneSound() {
    const notes = [
      { f: 523.25, d: 0.14, t: 0 },
      { f: 659.25, d: 0.14, t: 0.1 },
      { f: 783.99, d: 0.14, t: 0.2 },
      { f: 1046.5, d: 0.4, t: 0.3 },
    ];
    notes.forEach((n) => playTone(n.f, n.d, "triangle", n.t, 0.18));
  }

  function playGentleTryAgainSound() {
    playTone(329.63, 0.14, "sine", 0, 0.11);
    playTone(293.66, 0.18, "sine", 0.1, 0.11);
  }

  function playTapSound() {
    playTone(440, 0.07, "sine", 0, 0.1);
  }

  // --- Speech (Web Speech API) ---
  function speak(text) {
    if (!state.soundEnabled || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "ja-JP";
      utter.rate = 0.92;
      utter.pitch = 1.15;
      window.speechSynthesis.speak(utter);
    } catch (_) {
      // 音声合成非対応環境でもゲーム進行に影響させない
    }
  }

  // --- SVG Shape Generator ---
  function getShapePath(shapeId) {
    switch (shapeId) {
      case "circle":
        return '<circle cx="50" cy="50" r="38" />';
      case "triangle":
        return '<path d="M50 13 L88 82 Q90 86 85 86 L15 86 Q10 86 12 82 Z" />';
      case "square":
        return '<rect x="14" y="14" width="72" height="72" rx="14" />';
      case "star":
        return '<path d="M50 10 L61 35 L89 38 L68 57 L74 85 L50 71 L26 85 L32 57 L11 38 L39 35 Z" stroke-linejoin="round" />';
      case "heart":
        return '<path d="M50 84 C50 84 12 60 12 34 C12 20 23 12 35 12 C43 12 48 17 50 22 C52 17 57 12 65 12 C77 12 88 20 88 34 C88 60 50 84 50 84 Z" />';
      case "diamond":
        return '<path d="M50 10 L86 50 L50 90 L14 50 Z" stroke-linejoin="round" />';
      default:
        return '<circle cx="50" cy="50" r="38" />';
    }
  }

  function createShapeSvg(shapeId, fill, stroke, options = {}) {
    const {
      isSilhouette = false,
      withFace = true,
      dashed = false,
    } = options;

    const shapeMarkup = getShapePath(shapeId);
    const fillAttr = isSilhouette ? "rgba(210, 198, 180, 0.35)" : fill;
    const strokeAttr = isSilhouette ? "#B8AA96" : stroke;
    const strokeDash = dashed ? 'stroke-dasharray="7 5"' : "";
    const strokeWidth = isSilhouette ? 4 : 4.5;

    let faceMarkup = "";
    if (withFace && !isSilhouette) {
      const eyeY = shapeId === "triangle" ? 56 : shapeId === "heart" ? 44 : 46;
      const mouthY = eyeY + 11;
      faceMarkup = `
        <circle cx="40" cy="${eyeY}" r="3.4" fill="#3A2E25" />
        <circle cx="60" cy="${eyeY}" r="3.4" fill="#3A2E25" />
        <path d="M43 ${mouthY} Q50 ${mouthY + 7} 57 ${mouthY}" fill="none" stroke="#3A2E25" stroke-width="3.2" stroke-linecap="round" />
      `;
    }

    return `
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
        <g fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${strokeWidth}" ${strokeDash} stroke-linejoin="round">
          ${shapeMarkup}
        </g>
        ${faceMarkup}
      </svg>
    `;
  }

  // --- Growing Tree SVG (0..5 stages) ---
  function createTreeSvg(stage) {
    const soil = `<ellipse cx="60" cy="108" rx="44" ry="10" fill="#B6895B" />`;
    let content = "";

    if (stage === 0) {
      content = `
        <ellipse cx="60" cy="96" rx="11" ry="13" fill="#D99B52" stroke="#9C6631" stroke-width="3" />
        <path d="M56 91 Q60 87 64 91" fill="none" stroke="#FFFDF5" stroke-width="2.5" stroke-linecap="round" />
      `;
    } else if (stage === 1) {
      content = `
        <path d="M60 105 Q60 84 60 74" fill="none" stroke="#6FA51B" stroke-width="6" stroke-linecap="round" />
        <path d="M60 78 Q40 62 34 74 Q42 88 60 80 Z" fill="#8AC926" stroke="#669B14" stroke-width="3" />
        <path d="M60 76 Q80 60 86 72 Q78 86 60 78 Z" fill="#A7E048" stroke="#669B14" stroke-width="3" />
      `;
    } else if (stage === 2) {
      content = `
        <path d="M55 106 L56 68 L64 68 L65 106 Z" fill="#9C6631" stroke="#75491F" stroke-width="3" stroke-linejoin="round" />
        <circle cx="44" cy="60" r="18" fill="#8AC926" stroke="#669B14" stroke-width="3" />
        <circle cx="76" cy="60" r="18" fill="#8AC926" stroke="#669B14" stroke-width="3" />
        <circle cx="60" cy="46" r="22" fill="#A7E048" stroke="#669B14" stroke-width="3" />
      `;
    } else if (stage === 3) {
      content = `
        <path d="M52 106 L55 58 L65 58 L68 106 Z" fill="#9C6631" stroke="#75491F" stroke-width="3" stroke-linejoin="round" />
        <circle cx="38" cy="54" r="22" fill="#70B81B" stroke="#538A12" stroke-width="3" />
        <circle cx="82" cy="54" r="22" fill="#70B81B" stroke="#538A12" stroke-width="3" />
        <circle cx="60" cy="36" r="26" fill="#8AC926" stroke="#538A12" stroke-width="3" />
        <circle cx="48" cy="48" r="18" fill="#A7E048" />
        <circle cx="72" cy="48" r="18" fill="#A7E048" />
      `;
    } else if (stage === 4) {
      content = `
        <path d="M51 106 L55 54 L65 54 L69 106 Z" fill="#9C6631" stroke="#75491F" stroke-width="3" stroke-linejoin="round" />
        <circle cx="36" cy="52" r="23" fill="#70B81B" stroke="#538A12" stroke-width="3" />
        <circle cx="84" cy="52" r="23" fill="#70B81B" stroke="#538A12" stroke-width="3" />
        <circle cx="60" cy="34" r="28" fill="#8AC926" stroke="#538A12" stroke-width="3" />
        <circle cx="46" cy="48" r="18" fill="#A7E048" />
        <circle cx="74" cy="48" r="18" fill="#A7E048" />
        <circle cx="40" cy="42" r="7" fill="#FF9EBB" stroke="#FF595E" stroke-width="2" />
        <circle cx="40" cy="42" r="2.5" fill="#FFCA3A" />
        <circle cx="76" cy="38" r="7" fill="#FF9EBB" stroke="#FF595E" stroke-width="2" />
        <circle cx="76" cy="38" r="2.5" fill="#FFCA3A" />
        <circle cx="58" cy="24" r="7" fill="#FFF07C" stroke="#FF924C" stroke-width="2" />
        <circle cx="58" cy="24" r="2.5" fill="#FF595E" />
        <circle cx="62" cy="54" r="6" fill="#FF9EBB" stroke="#FF595E" stroke-width="2" />
        <circle cx="62" cy="54" r="2" fill="#FFCA3A" />
      `;
    } else {
      content = `
        <path d="M50 106 L54 52 L66 52 L70 106 Z" fill="#9C6631" stroke="#75491F" stroke-width="3" stroke-linejoin="round" />
        <circle cx="35" cy="52" r="24" fill="#70B81B" stroke="#538A12" stroke-width="3" />
        <circle cx="85" cy="52" r="24" fill="#70B81B" stroke="#538A12" stroke-width="3" />
        <circle cx="60" cy="32" r="29" fill="#8AC926" stroke="#538A12" stroke-width="3" />
        <circle cx="46" cy="46" r="19" fill="#A7E048" />
        <circle cx="74" cy="46" r="19" fill="#A7E048" />
        <circle cx="38" cy="48" r="7.5" fill="#FF595E" stroke="#D9383E" stroke-width="2" />
        <circle cx="80" cy="46" r="7.5" fill="#FF595E" stroke="#D9383E" stroke-width="2" />
        <circle cx="60" cy="26" r="7.5" fill="#FF924C" stroke="#D66B27" stroke-width="2" />
        <circle cx="54" cy="52" r="6.5" fill="#FFCA3A" stroke="#D9A314" stroke-width="2" />
        <circle cx="70" cy="28" r="5" fill="#FF9EBB" />
        <circle cx="42" cy="28" r="5" fill="#FFF07C" />
        <circle cx="55" cy="76" r="2.2" fill="#3A2E25" />
        <circle cx="65" cy="76" r="2.2" fill="#3A2E25" />
        <path d="M57 82 Q60 85 63 82" fill="none" stroke="#3A2E25" stroke-width="2" stroke-linecap="round" />
      `;
    }

    return `
      <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true">
        ${soil}
        ${content}
      </svg>
    `;
  }

  function revealGardenToy(el, isNew) {
    if (!el) return;
    const wasHidden = el.classList.contains("hidden");
    el.classList.remove("hidden");
    if (isNew && wasHidden) {
      triggerBounceClass(el, "appear");
    }
  }

  function updateGarden(score, animate = false) {
    scoreCount.textContent = String(score);
    if (animate) {
      triggerBounceClass(scoreBadge, "pop");
    }

    // 木の成長（0〜5）
    const treeStageNum = Math.min(5, score);
    treeVisual.innerHTML = createTreeSvg(treeStageNum);
    if (animate) {
      treeVisual.classList.remove("grow-anim");
      treeSparkle.classList.remove("active");
      void treeVisual.offsetWidth;
      treeVisual.classList.add("grow-anim");
      treeSparkle.classList.add("active");
    }

    // スコアに応じておにわの要素が次々登場・変化
    const unlocks = [
      { min: 1, el: toyFlowerL },
      { min: 2, el: toyFlowerR },
      { min: 3, el: toyButterfly },
      { min: 4, el: toyBird },
      { min: 5, el: toyRainbow },
      { min: 6, el: toyRabbit },
      { min: 7, el: toyBalloon },
      { min: 8, el: toyCat },
      { min: 9, el: toyDog },
    ];

    unlocks.forEach(({ min, el }) => {
      if (score >= min) {
        revealGardenToy(el, animate && score === min);
      } else {
        el.classList.add("hidden");
      }
    });

    // 空の変化（10問以降は昼→虹→夕方→夜空がループ！）
    gardenStage.classList.remove("sky-rainbow", "sky-sunset", "sky-night");
    if (score >= 10) {
      const cycle = Math.floor((score - 10) / 3) % 4;
      if (cycle === 0) {
        gardenStage.classList.add("sky-sunset");
        toySun.textContent = "🌇";
      } else if (cycle === 1) {
        gardenStage.classList.add("sky-night");
        toySun.textContent = "🌙";
      } else if (cycle === 2) {
        gardenStage.classList.add("sky-rainbow");
        toySun.textContent = "☀️";
      } else {
        toySun.textContent = "☀️";
      }
    } else if (score >= 5) {
      gardenStage.classList.add("sky-rainbow");
      toySun.textContent = "☀️";
    } else {
      toySun.textContent = "☀️";
    }
  }

  // --- Utilities ---
  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function pickRandom(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  function triggerBounceClass(el, className) {
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
  }

  // --- Particle & Confetti Canvas ---
  let particles = [];
  let animId = null;

  function ensureCanvasSize() {
    if (confettiCanvas.width !== window.innerWidth || confettiCanvas.height !== window.innerHeight) {
      confettiCanvas.width = window.innerWidth;
      confettiCanvas.height = window.innerHeight;
    }
  }

  function launchConfetti(count = 45) {
    ensureCanvasSize();
    const palette = COLORS.map((c) => c.hex);
    for (let i = 0; i < count; i++) {
      particles.push({
        kind: "rect",
        x: Math.random() * confettiCanvas.width,
        y: -20 - Math.random() * 120,
        vx: (Math.random() - 0.5) * 5,
        vy: 3 + Math.random() * 4.5,
        gravity: 0.04,
        size: 8 + Math.random() * 8,
        color: pickRandom(palette),
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2,
        life: 160,
      });
    }
    startParticleLoop();
  }

  function spawnTapBurst(x, y, options = {}) {
    ensureCanvasSize();
    const {
      count = 9,
      symbols = ["✨", "⭐", "🎵", "💛"],
      color = null,
      fallDown = false,
    } = options;

    const ripple = document.createElement("span");
    ripple.className = "tap-ripple";
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    if (color) {
      ripple.style.borderColor = color;
    }
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 580);

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 2.2 + Math.random() * 3.5;
      particles.push({
        kind: "emoji",
        text: pickRandom(symbols),
        x,
        y,
        vx: fallDown ? (Math.random() - 0.5) * 2.5 : Math.cos(angle) * speed,
        vy: fallDown ? 1.5 + Math.random() * 2.5 : Math.sin(angle) * speed - 1.5,
        gravity: fallDown ? 0.12 : 0.14,
        size: 16 + Math.random() * 10,
        rot: 0,
        vRot: (Math.random() - 0.5) * 0.15,
        life: 44 + Math.floor(Math.random() * 16),
      });
    }
    startParticleLoop();
  }

  function startParticleLoop() {
    if (!animId) {
      animateParticles();
    }
  }

  function animateParticles() {
    const ctx = confettiCanvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    particles = particles.filter((p) => p.life > 0 && p.y < confettiCanvas.height + 40);
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rot += p.vRot;
      p.life -= 1;

      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life / 20);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);

      if (p.kind === "emoji") {
        ctx.font = `${p.size}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.text, 0, 0);
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
      }
      ctx.restore();
    });

    if (particles.length > 0) {
      animId = requestAnimationFrame(animateParticles);
    } else {
      animId = null;
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  // --- Unified Question Generation (いろ / かたち / いろ＋かたち) ---
  function buildQuestion() {
    const kind = pickRandom(["color", "shape", "mix"]);

    if (kind === "color") {
      const targetColor = pickRandom(COLORS);
      const otherColors = shuffle(COLORS.filter((c) => c.id !== targetColor.id)).slice(0, 3);
      const choices = shuffle([targetColor, ...otherColors]).map((c) => ({
        id: c.id,
        isCorrect: c.id === targetColor.id,
        color: c,
        shape: SHAPES[0],
        label: c.name,
      }));

      return {
        prompt: `${targetColor.name} は どれかな？`,
        targetShape: "circle",
        targetColor,
        targetIsSilhouette: false,
        choices,
      };
    }

    if (kind === "shape") {
      const targetShape = pickRandom(SHAPES);
      const otherShapes = shuffle(SHAPES.filter((s) => s.id !== targetShape.id)).slice(0, 3);
      const baseColors = shuffle(COLORS);
      const choices = shuffle([targetShape, ...otherShapes]).map((s, idx) => ({
        id: s.id,
        isCorrect: s.id === targetShape.id,
        color: baseColors[idx % baseColors.length],
        shape: s,
        label: s.name,
      }));

      return {
        prompt: `${targetShape.name} は どれかな？`,
        targetShape: targetShape.id,
        targetColor: null,
        targetIsSilhouette: true,
        choices,
      };
    }

    // mix
    const targetColor = pickRandom(COLORS);
    const targetShape = pickRandom(SHAPES);
    const altColor = pickRandom(COLORS.filter((c) => c.id !== targetColor.id));
    const altShape = pickRandom(SHAPES.filter((s) => s.id !== targetShape.id));

    const choices = shuffle([
      {
        id: `${targetColor.id}-${targetShape.id}`,
        isCorrect: true,
        color: targetColor,
        shape: targetShape,
        label: `${targetColor.adj} ${targetShape.name}`,
      },
      {
        id: `${targetColor.id}-${altShape.id}`,
        isCorrect: false,
        color: targetColor,
        shape: altShape,
        label: `${targetColor.adj} ${altShape.name}`,
      },
      {
        id: `${altColor.id}-${targetShape.id}`,
        isCorrect: false,
        color: altColor,
        shape: targetShape,
        label: `${altColor.adj} ${targetShape.name}`,
      },
      {
        id: `${altColor.id}-${altShape.id}`,
        isCorrect: false,
        color: altColor,
        shape: altShape,
        label: `${altColor.adj} ${altShape.name}`,
      },
    ]);

    return {
      prompt: `${targetColor.adj} ${targetShape.name} は どれかな？`,
      targetShape: targetShape.id,
      targetColor,
      targetIsSilhouette: false,
      choices,
    };
  }

  function loadNextQuestion() {
    state.isTransitioning = false;
    targetSlot.classList.remove("matched", "drag-over");
    feedbackBubble.classList.add("hidden");

    const q = buildQuestion();
    state.currentQuestion = q;

    targetVisual.innerHTML = createShapeSvg(
      q.targetShape,
      q.targetColor ? q.targetColor.hex : "#D2C6B4",
      q.targetColor ? q.targetColor.stroke : "#B8AA96",
      {
        isSilhouette: q.targetIsSilhouette,
        withFace: !q.targetIsSilhouette,
        dashed: q.targetIsSilhouette,
      }
    );

    choicesGrid.innerHTML = "";
    q.choices.forEach((choice) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "choice-card";
      card.setAttribute("aria-label", choice.label);
      card.innerHTML = `
        <div class="choice-svg-wrap">
          ${createShapeSvg(choice.shape.id, choice.color.hex, choice.color.stroke, { withFace: true })}
        </div>
      `;

      attachCardInteractions(card, choice);
      choicesGrid.appendChild(card);
    });

    speak(q.prompt);
  }

  // --- Interaction: Tap + Drag & Drop ---
  function attachCardInteractions(card, choice) {
    let startX = 0;
    let startY = 0;
    let isPointerActive = false;
    let isDragging = false;
    let ghost = null;

    card.addEventListener("pointerdown", (e) => {
      if (state.isTransitioning) return;
      ensureAudioContext();
      startX = e.clientX;
      startY = e.clientY;
      isPointerActive = true;
      isDragging = false;
      try {
        card.setPointerCapture(e.pointerId);
      } catch (_) {}
    });

    card.addEventListener("pointermove", (e) => {
      if (state.isTransitioning || !isPointerActive) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (!isDragging && Math.hypot(dx, dy) > 12) {
        isDragging = true;
        card.classList.add("dragging");

        ghost = document.createElement("div");
        ghost.className = "drag-ghost";
        const rect = card.getBoundingClientRect();
        ghost.style.width = `${rect.width * 0.85}px`;
        ghost.style.height = `${rect.height * 0.85}px`;
        ghost.innerHTML = createShapeSvg(choice.shape.id, choice.color.hex, choice.color.stroke, { withFace: true });
        document.body.appendChild(ghost);
      }

      if (isDragging && ghost) {
        ghost.style.left = `${e.clientX}px`;
        ghost.style.top = `${e.clientY}px`;

        const targetRect = targetSlot.getBoundingClientRect();
        const isOver =
          e.clientX >= targetRect.left - 16 &&
          e.clientX <= targetRect.right + 16 &&
          e.clientY >= targetRect.top - 16 &&
          e.clientY <= targetRect.bottom + 16;
        targetSlot.classList.toggle("drag-over", isOver);
      }
    });

    const finishPointer = (e) => {
      if (!isPointerActive) return;
      isPointerActive = false;
      try {
        if (card.hasPointerCapture(e.pointerId)) {
          card.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}
      card.classList.remove("dragging");
      targetSlot.classList.remove("drag-over");

      if (ghost) {
        ghost.remove();
        ghost = null;
      }

      if (state.isTransitioning || e.type === "pointercancel") return;

      if (isDragging) {
        const targetRect = targetSlot.getBoundingClientRect();
        const droppedOnTarget =
          e.clientX >= targetRect.left - 24 &&
          e.clientX <= targetRect.right + 24 &&
          e.clientY >= targetRect.top - 24 &&
          e.clientY <= targetRect.bottom + 24;

        if (droppedOnTarget) {
          handleChoice(card, choice, e.clientX, e.clientY);
        }
      } else {
        handleChoice(card, choice, e.clientX, e.clientY);
      }
    };

    card.addEventListener("pointerup", finishPointer);
    card.addEventListener("pointercancel", finishPointer);
  }

  function handleChoice(card, choice, x, y) {
    if (state.isTransitioning) return;

    if (choice.isCorrect) {
      state.isTransitioning = true;
      card.classList.add("correct-pop");
      targetSlot.classList.add("matched");

      targetVisual.innerHTML = createShapeSvg(
        choice.shape.id,
        choice.color.hex,
        choice.color.stroke,
        { withFace: true }
      );

      state.score += 1;
      const isMilestone = state.score % 5 === 0;

      if (isMilestone) {
        playMilestoneSound();
        launchConfetti(95);
      } else {
        playSuccessSound();
        launchConfetti(35);
      }

      if (x && y) {
        spawnTapBurst(x, y, { count: 10, symbols: ["🌟", "✨", "🎉"], color: choice.color.hex });
      }

      const praise = pickRandom(PRAISE_WORDS);
      feedbackEmoji.textContent = isMilestone ? "🎊" : praise.emoji;
      feedbackBubble.classList.remove("hidden");
      speak(praise.text);

      updateGarden(state.score, true);

      setTimeout(() => {
        loadNextQuestion();
      }, 1300);
    } else {
      playGentleTryAgainSound();
      triggerBounceClass(card, "wrong-shake");
      speak("こっちかな？");
    }
  }

  // --- Interactive Gimmicks ---
  // 背景の浮遊おもちゃタップ
  document.querySelectorAll(".bg-toy").forEach((toy, idx) => {
    toy.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      ensureAudioContext();
      playPentatonicNote(idx);
      triggerBounceClass(toy, "boing");
      spawnTapBurst(e.clientX, e.clientY, {
        count: 8,
        symbols: ["✨", "⭐", "♥", "🎵"],
      });
    });
  });

  // お題枠タップでジャンプ＆音声再生
  targetSlot.addEventListener("pointerdown", (e) => {
    if (e.target === btnSpeak) return;
    e.stopPropagation();
    ensureAudioContext();
    triggerBounceClass(targetSlot, "boing");
    playTapSound();
    spawnTapBurst(e.clientX, e.clientY, {
      count: 7,
      symbols: ["✨", "🎵"],
    });
    if (state.currentQuestion) {
      speak(state.currentQuestion.prompt);
    }
  });

  // おにわステージ（木）タップで揺れて葉っぱ・花・実が舞う
  gardenStage.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".stage-toy")) return;
    e.stopPropagation();
    ensureAudioContext();
    triggerBounceClass(treeVisual, "wiggle-anim");
    playChimeArpeggio();

    const stageSymbols =
      state.score >= 5
        ? ["🍎", "🍊", "🌸", "✨"]
        : state.score >= 4
        ? ["🌸", "🌼", "✨"]
        : ["🍃", "🌱", "✨"];

    spawnTapBurst(e.clientX, e.clientY, {
      count: 9,
      symbols: stageSymbols,
      color: "#8AC926",
    });
  });

  // おひさま／おつきさまタップ
  toySun.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    ensureAudioContext();
    triggerBounceClass(toySun, "spin");
    playChimeArpeggio();
    spawnTapBurst(e.clientX, e.clientY, {
      count: 10,
      symbols: [toySun.textContent, "✨", "🌟"],
      color: "#FFCA3A",
    });
  });

  // くもタップで雨粒シャワー＆木が喜ぶ
  toyCloud.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    ensureAudioContext();
    triggerBounceClass(toyCloud, "boing");
    triggerBounceClass(treeVisual, "wiggle-anim");
    playRainSound();
    spawnTapBurst(e.clientX, e.clientY + 12, {
      count: 10,
      symbols: ["💧", "🩵", "✨"],
      color: "#1982C4",
      fallDown: true,
    });
  });

  // おにわに登場した仲間・アイテムのタップ反応
  const gardenToyEffects = [
    { el: toyRainbow, symbols: ["🌈", "✨", "💛", "💙"], color: "#FFCA3A", note: 5 },
    { el: toyBalloon, symbols: ["🎈", "🎉", "✨"], color: "#FF595E", note: 4 },
    { el: toyButterfly, symbols: ["🦋", "🌸", "✨"], color: "#9B5DE5", note: 3 },
    { el: toyBird, symbols: ["🐦", "🎵", "🎶"], color: "#1982C4", note: 2 },
    { el: toyFlowerL, symbols: ["🌷", "🌸", "✨"], color: "#FF9EBB", note: 1 },
    { el: toyFlowerR, symbols: ["🌼", "🌻", "✨"], color: "#FFCA3A", note: 0 },
    { el: toyRabbit, symbols: ["🐰", "🥕", "♥"], color: "#FF924C", note: 2 },
    { el: toyCat, symbols: ["🐱", "🐾", "♥"], color: "#FFCA3A", note: 4 },
    { el: toyDog, symbols: ["🐶", "🦴", "♥"], color: "#8AC926", note: 3 },
  ];

  gardenToyEffects.forEach(({ el, symbols, color, note }) => {
    el.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      ensureAudioContext();
      playPentatonicNote(note);
      triggerBounceClass(el, "boing");
      spawnTapBurst(e.clientX, e.clientY, {
        count: 8,
        symbols,
        color,
      });
    });
  });

  // 画面のどこ（余白）をタップしても音とキラキラが出る！
  document.addEventListener("pointerdown", (e) => {
    if (!(e.target instanceof Element) || e.target.closest("button, .target-slot, .garden-stage")) return;
    ensureAudioContext();
    playPentatonicNote(Math.floor(Math.random() * PENTATONIC.length));
    spawnTapBurst(e.clientX, e.clientY, {
      count: 6,
      symbols: ["✨", "⭐", "🫧"],
    });
  });

  // --- Top Bar Listeners ---
  btnReset.addEventListener("click", () => {
    ensureAudioContext();
    playTapSound();
    state.score = 0;
    updateGarden(0, false);
    loadNextQuestion();
  });

  btnSound.addEventListener("click", () => {
    state.soundEnabled = !state.soundEnabled;
    btnSound.classList.toggle("sound-on", state.soundEnabled);
    btnSound.classList.toggle("sound-off", !state.soundEnabled);
    iconSoundOn.classList.toggle("hidden", !state.soundEnabled);
    iconSoundOff.classList.toggle("hidden", state.soundEnabled);

    if (!state.soundEnabled && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    } else if (state.soundEnabled) {
      playTapSound();
    }
  });

  btnSpeak.addEventListener("click", (e) => {
    e.stopPropagation();
    if (state.currentQuestion) {
      playTapSound();
      speak(state.currentQuestion.prompt);
    }
  });

  // --- Start immediately ---
  updateGarden(0, false);
  loadNextQuestion();
})();
