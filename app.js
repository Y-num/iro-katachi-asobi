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

  const EXTRA_ANIMALS = ["🐼", "🦊", "🐸", "🐢", "🐨", "🦁"];
  const FLOWERS = ["🌷", "🌼", "🌻", "🌸", "🌺"];
  const FLOWER_IMAGES = ["assets/flower-tulip.png", "assets/flower-daisy.png"];
  const FOODS = ["🍎", "🥕", "🍓", "🍪", "🍌"];
  const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];

  const state = {
    score: 0,
    soundEnabled: true,
    isTransitioning: false,
    currentQuestion: null,
    audioCtx: null,
    entities: [], // { id, kind: 'walker'|'flyer'|'flower'|'weed'|'food', emoji, x, y, vx, vy, tx, ty, el, innerEl, waitTimer }
    nextEntityId: 1,
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
  const gardenWorld = document.getElementById("garden-world");
  const gardenEntities = document.getElementById("garden-entities");
  const treeWrap = document.getElementById("tree-wrap");
  const treeVisual = document.getElementById("tree-visual");
  const treeSparkle = document.getElementById("tree-sparkle");
  const toySun = document.getElementById("toy-sun");
  const toyCloud1 = document.getElementById("toy-cloud-1");
  const toyCloud2 = document.getElementById("toy-cloud-2");
  const toyRainbow = document.getElementById("toy-rainbow");
  const toyBalloon = document.getElementById("toy-balloon");
  const btnWater = document.getElementById("btn-water");
  const btnFeed = document.getElementById("btn-feed");
  const btnWeed = document.getElementById("btn-weed");
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

  function playTone(freq, duration, type = "sine", delay = 0, volume = 0.14) {
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
    playTone(PENTATONIC[index % PENTATONIC.length], 0.22, "triangle", 0, 0.13);
  }

  function playChimeArpeggio() {
    playTone(659.25, 0.15, "sine", 0, 0.12);
    playTone(783.99, 0.15, "sine", 0.07, 0.12);
    playTone(1046.5, 0.25, "sine", 0.14, 0.13);
  }

  function playWaterSound() {
    [987.77, 880, 1046.5, 783.99, 1174.66].forEach((f, i) => {
      playTone(f, 0.1, "sine", i * 0.06, 0.09);
    });
  }

  function playEatSound() {
    playTone(440, 0.08, "triangle", 0, 0.12);
    playTone(587.33, 0.1, "triangle", 0.08, 0.13);
    playTone(783.99, 0.15, "sine", 0.16, 0.13);
  }

  function playPluckSound() {
    playTone(392, 0.07, "triangle", 0, 0.12);
    playTone(659.25, 0.12, "sine", 0.05, 0.14);
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
    } catch (_) {}
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

  function randRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function triggerBounceClass(el, className) {
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
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
    const { isSilhouette = false, withFace = true, dashed = false } = options;
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

  // --- Growing Tree (0..5 stages using generated watercolor illustrations) ---
  function createTreeSvg(stage) {
    if (stage === 0) {
      return `
        <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true">
          <ellipse cx="60" cy="108" rx="34" ry="8" fill="#A57B50" opacity="0.7" />
          <ellipse cx="60" cy="96" rx="11" ry="13" fill="#D99B52" stroke="#9C6631" stroke-width="3" />
          <path d="M56 91 Q60 87 64 91" fill="none" stroke="#FFFDF5" stroke-width="2.5" stroke-linecap="round" />
        </svg>
      `;
    }
    if (stage === 1) {
      return `<img src="assets/tree-sprout.png" class="tree-img stage-1" alt="ふたば" draggable="false" />`;
    }
    if (stage === 2 || stage === 3) {
      return `<img src="assets/tree-young.png" class="tree-img stage-${stage}" alt="わかぎ" draggable="false" />`;
    }
    return `<img src="assets/tree-full.png" class="tree-img stage-${stage}" alt="おおきなき" draggable="false" />`;
  }

  // --- Living Garden Entities System ---
  function addGardenEntity(kind, emoji, x, y) {
    const id = state.nextEntityId++;
    const el = document.createElement("button");
    el.type = "button";
    el.className = `entity-item entity-${kind}`;
    el.style.left = `${x}%`;
    el.style.bottom = `${y}%`;

    const inner = document.createElement("span");
    inner.className = "entity-inner";
    if (kind === "flower") {
      const img = document.createElement("img");
      img.src = pickRandom(FLOWER_IMAGES);
      img.className = "flower-img";
      img.alt = "おはな";
      img.draggable = false;
      inner.appendChild(img);
    } else {
      inner.textContent = emoji;
    }
    el.appendChild(inner);

    const entity = {
      id,
      kind,
      emoji,
      x,
      y,
      tx: randRange(10, 88),
      ty: kind === "flyer" ? randRange(48, 86) : randRange(7, 26),
      vx: 0,
      vy: 0,
      waitTimer: 0,
      el,
      innerEl: inner,
    };

    el.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      ensureAudioContext();
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      if (kind === "weed") {
        pluckWeed(entity, cx, cy);
      } else if (kind === "flower") {
        playPentatonicNote(id);
        triggerBounceClass(el, "boing");
        spawnTapBurst(cx, cy, { count: 7, symbols: [emoji, "✨", "💛"], color: "#FF9EBB" });
      } else if (kind === "food") {
        playTapSound();
        triggerBounceClass(el, "boing");
        spawnTapBurst(cx, cy, { count: 6, symbols: ["✨", "😋"] });
      } else {
        // walker or flyer
        playPentatonicNote(id);
        triggerBounceClass(el, "happy-jump");
        spawnTapBurst(cx, cy, { count: 8, symbols: ["♥", "✨", "🎵"], color: "#FF595E" });
      }
    });

    gardenEntities.appendChild(el);
    state.entities.push(entity);
    return entity;
  }

  function removeGardenEntity(entity) {
    entity.el.remove();
    state.entities = state.entities.filter((item) => item.id !== entity.id);
  }

  function pluckWeed(weedEntity, cx, cy) {
    if (weedEntity.plucked) return;
    weedEntity.plucked = true;
    playPluckSound();
    weedEntity.el.classList.add("plucked");
    spawnTapBurst(cx, cy, { count: 9, symbols: ["✨", "🌸", "⭐"], color: "#8AC926" });

    const wx = weedEntity.x;
    const wy = weedEntity.y;
    setTimeout(() => {
      removeGardenEntity(weedEntity);
      // 雑草を抜いた跡にお花が咲く！
      const flowers = state.entities.filter((e) => e.kind === "flower");
      if (flowers.length < 14) {
        addGardenEntity("flower", pickRandom(FLOWERS), wx, wy);
      }
      updateWeedHint();
    }, 320);
  }

  function updateWeedHint() {
    const weeds = state.entities.filter((e) => e.kind === "weed");
    btnWeed.classList.toggle("pulse-hint", weeds.length >= 3);
  }

  function spawnWeed() {
    const weeds = state.entities.filter((e) => e.kind === "weed");
    if (weeds.length >= 5) return;
    const x = randRange(8, 86);
    const y = randRange(6, 22);
    addGardenEntity("weed", pickRandom(["🌿", "🌾"]), x, y);
    updateWeedHint();
  }

  function spawnFlower() {
    const flowers = state.entities.filter((e) => e.kind === "flower");
    if (flowers.length >= 14) return;
    const x = randRange(6, 86);
    const y = randRange(5, 24);
    addGardenEntity("flower", pickRandom(FLOWERS), x, y);
  }

  function initGarden() {
    gardenEntities.innerHTML = "";
    state.entities = [];

    // 最初からひよこが1匹お散歩＆雑草が2本生えている
    addGardenEntity("walker", "🐣", 26, 12);
    spawnWeed();
    spawnWeed();
    updateGardenVisuals(0, false);
  }

  function updateGardenVisuals(score, animate = false) {
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

    // 正解ごとのワールド変化
    if (animate) {
      if (score === 1) {
        spawnFlower();
      } else if (score === 2) {
        addGardenEntity("walker", "🐰", 74, 14);
      } else if (score === 3) {
        addGardenEntity("flyer", "🦋", 20, 68);
      } else if (score === 4) {
        addGardenEntity("walker", "🐱", 18, 16);
      } else if (score === 5) {
        toyRainbow.classList.remove("hidden");
        triggerBounceClass(toyRainbow, "boing");
      } else if (score === 6) {
        addGardenEntity("flyer", "🐦", 80, 74);
      } else if (score === 7) {
        addGardenEntity("walker", "🐶", 65, 10);
      } else if (score === 8) {
        toyBalloon.classList.remove("hidden");
        triggerBounceClass(toyBalloon, "boing");
      } else if (score === 9) {
        addGardenEntity("flyer", "🐝", 45, 58);
      } else if (score >= 10) {
        const walkers = state.entities.filter((e) => e.kind === "walker");
        if (score % 3 === 0 && walkers.length < 10) {
          addGardenEntity("walker", pickRandom(EXTRA_ANIMALS), randRange(15, 85), randRange(8, 22));
        } else {
          spawnFlower();
        }
      }

      // 時々新しい雑草も生えてくる
      if (score % 2 === 0) {
        spawnWeed();
      }
    } else {
      toyRainbow.classList.add("hidden");
      toyBalloon.classList.add("hidden");
    }

    // 空の変化
    gardenWorld.classList.remove("sky-rainbow", "sky-sunset", "sky-night");
    if (score >= 10) {
      const cycle = Math.floor((score - 10) / 3) % 4;
      if (cycle === 0) {
        gardenWorld.classList.add("sky-sunset");
        toySun.textContent = "🌇";
      } else if (cycle === 1) {
        gardenWorld.classList.add("sky-night");
        toySun.textContent = "🌙";
      } else if (cycle === 2) {
        gardenWorld.classList.add("sky-rainbow");
        toySun.textContent = "☀️";
      } else {
        toySun.textContent = "☀️";
      }
    } else if (score >= 5) {
      gardenWorld.classList.add("sky-rainbow");
      toySun.textContent = "☀️";
    } else {
      toySun.textContent = "☀️";
    }
  }

  // 生き物たちの自律移動ループ
  let lastMoveTime = performance.now();
  function tickGardenMovement(now) {
    const dt = Math.min(0.05, (now - lastMoveTime) / 1000);
    lastMoveTime = now;

    const foods = state.entities.filter((e) => e.kind === "food");

    state.entities.forEach((entity) => {
      if (entity.kind !== "walker" && entity.kind !== "flyer") return;

      // 歩く生き物は近くにエサがあれば駆け寄る！
      let targetFood = null;
      if (entity.kind === "walker" && foods.length > 0) {
        let minDist = Infinity;
        foods.forEach((f) => {
          const d = Math.hypot(f.x - entity.x, f.y - entity.y);
          if (d < minDist) {
            minDist = d;
            targetFood = f;
          }
        });
      }

      if (targetFood) {
        entity.tx = targetFood.x;
        entity.ty = targetFood.y;
        entity.waitTimer = 0;
      } else if (entity.waitTimer > 0) {
        entity.waitTimer -= dt;
        return;
      }

      const dx = entity.tx - entity.x;
      const dy = entity.ty - entity.y;
      const dist = Math.hypot(dx, dy);

      if (targetFood && dist < 4.5) {
        // エサを食べる！
        const rect = entity.el.getBoundingClientRect();
        playEatSound();
        triggerBounceClass(entity.el, "happy-jump");
        spawnTapBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, {
          count: 8,
          symbols: ["♥", "😋", "✨"],
          color: "#FF595E",
        });
        removeGardenEntity(targetFood);
        entity.waitTimer = 0.7;
        entity.tx = randRange(10, 88);
        entity.ty = randRange(7, 25);
        return;
      }

      if (dist < 2.2) {
        // 目的地についたら少し休んで次の場所へ
        entity.waitTimer = entity.kind === "flyer" ? randRange(0.1, 0.5) : randRange(0.6, 2.2);
        entity.tx = randRange(8, 88);
        entity.ty = entity.kind === "flyer" ? randRange(46, 86) : randRange(6, 25);
        return;
      }

      const speed = targetFood ? 28 : entity.kind === "flyer" ? 18 : 11;
      const step = speed * dt;
      entity.x += (dx / dist) * step;
      entity.y += (dy / dist) * step;

      entity.el.style.left = `${entity.x}%`;
      entity.el.style.bottom = `${entity.y}%`;
      // 進行方向に合わせて向きを変える
      entity.el.style.transform = dx < -0.2 ? "scaleX(1)" : "scaleX(-1)";
    });

    requestAnimationFrame(tickGardenMovement);
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

  // --- Unified Question Generation ---
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
        launchConfetti(90);
      } else {
        playSuccessSound();
        launchConfetti(32);
      }

      if (x && y) {
        spawnTapBurst(x, y, { count: 10, symbols: ["🌟", "✨", "🎉"], color: choice.color.hex });
      }

      const praise = pickRandom(PRAISE_WORDS);
      feedbackEmoji.textContent = isMilestone ? "🎊" : praise.emoji;
      feedbackBubble.classList.remove("hidden");
      speak(praise.text);

      updateGardenVisuals(state.score, true);

      setTimeout(() => {
        loadNextQuestion();
      }, 1250);
    } else {
      playGentleTryAgainSound();
      triggerBounceClass(card, "wrong-shake");
      speak("こっちかな？");
    }
  }

  // --- Care Toolbar Gimmicks (スワイプで任意の場所にドロップ) ---
  function attachCareDrag(btn, getGhostSymbol, onDropInGarden) {
    let startX = 0;
    let startY = 0;
    let isPointerActive = false;
    let isDragging = false;
    let ghost = null;
    let currentSymbol = "";

    btn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      ensureAudioContext();
      startX = e.clientX;
      startY = e.clientY;
      isPointerActive = true;
      isDragging = false;
      currentSymbol = getGhostSymbol();
      try {
        btn.setPointerCapture(e.pointerId);
      } catch (_) {}
    });

    btn.addEventListener("pointermove", (e) => {
      if (!isPointerActive) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (!isDragging && Math.hypot(dx, dy) > 10) {
        isDragging = true;
        ghost = document.createElement("div");
        ghost.className = "care-ghost";
        ghost.textContent = currentSymbol;
        document.body.appendChild(ghost);
      }

      if (isDragging && ghost) {
        ghost.style.left = `${e.clientX}px`;
        ghost.style.top = `${e.clientY}px`;

        const rect = gardenWorld.getBoundingClientRect();
        const isInside =
          e.clientX >= rect.left - 12 &&
          e.clientX <= rect.right + 12 &&
          e.clientY >= rect.top - 12 &&
          e.clientY <= rect.bottom + 12;
        gardenWorld.classList.toggle("drop-ready", isInside);
      }
    });

    const finishCarePointer = (e) => {
      if (!isPointerActive) return;
      isPointerActive = false;
      gardenWorld.classList.remove("drop-ready");
      try {
        if (btn.hasPointerCapture(e.pointerId)) {
          btn.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}

      if (ghost) {
        ghost.remove();
        ghost = null;
      }

      if (e.type === "pointercancel") return;

      if (isDragging) {
        const rect = gardenWorld.getBoundingClientRect();
        const isInside =
          e.clientX >= rect.left - 12 &&
          e.clientX <= rect.right + 12 &&
          e.clientY >= rect.top - 12 &&
          e.clientY <= rect.bottom + 12;

        if (isInside) {
          const pctX = Math.max(6, Math.min(90, ((e.clientX - rect.left) / rect.width) * 100));
          const pctBottom = Math.max(6, Math.min(25, ((rect.bottom - e.clientY) / rect.height) * 100));
          onDropInGarden(e.clientX, e.clientY, pctX, pctBottom, currentSymbol);
        }
      } else {
        // タップ時は跳ねて音だけ鳴らす（スワイプで持っていける合図）
        playTapSound();
        triggerBounceClass(btn, "boing");
      }
    };

    btn.addEventListener("pointerup", finishCarePointer);
    btn.addEventListener("pointercancel", finishCarePointer);
  }

  // 💧 みずやり：ドロップした場所に雨を降らせてお花を咲かせる
  attachCareDrag(btnWater, () => "💧", (cx, cy, pctX, pctBottom) => {
    playWaterSound();
    triggerBounceClass(treeVisual, "wiggle-anim");
    gardenWorld.classList.add("watered");
    setTimeout(() => gardenWorld.classList.remove("watered"), 900);

    spawnTapBurst(cx, Math.max(cy - 20, gardenWorld.getBoundingClientRect().top + 20), {
      count: 12,
      symbols: ["💧", "🩵", "✨"],
      color: "#1982C4",
      fallDown: true,
    });

    const flowers = state.entities.filter((e) => e.kind === "flower");
    if (flowers.length < 14) {
      addGardenEntity("flower", pickRandom(FLOWERS), pctX, pctBottom);
    }
    state.entities.forEach((ent) => {
      if (ent.kind === "walker" || ent.kind === "flyer") {
        triggerBounceClass(ent.el, "happy-jump");
      }
    });
  });

  // 🍎 えさやり：ドロップした任意の場所にエサを落とす
  attachCareDrag(btnFeed, () => pickRandom(FOODS), (cx, cy, pctX, pctBottom, symbol) => {
    playTapSound();
    const foods = state.entities.filter((ent) => ent.kind === "food");
    if (foods.length >= 6) {
      removeGardenEntity(foods[0]);
    }
    addGardenEntity("food", symbol, pctX, pctBottom);
    spawnTapBurst(cx, cy, {
      count: 7,
      symbols: [symbol, "✨"],
      color: "#FF595E",
    });
  });

  // 🌿 ざっそうとり：ドロップした場所の近くの雑草を抜く
  attachCareDrag(btnWeed, () => "🌿", (cx, cy, pctX, pctBottom) => {
    const weeds = state.entities.filter((ent) => ent.kind === "weed" && !ent.plucked);
    if (weeds.length > 0) {
      let nearest = weeds[0];
      let minDist = Infinity;
      weeds.forEach((w) => {
        const d = Math.hypot(w.x - pctX, w.y - pctBottom);
        if (d < minDist) {
          minDist = d;
          nearest = w;
        }
      });
      const wRect = nearest.el.getBoundingClientRect();
      pluckWeed(nearest, wRect.left + wRect.width / 2, wRect.top + wRect.height / 2);
    } else {
      playChimeArpeggio();
      spawnTapBurst(cx, cy, {
        count: 8,
        symbols: ["✨", "🌸", "🌿"],
        color: "#8AC926",
      });
    }
  });

  // --- Sky & Background Gimmicks ---
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

  targetSlot.addEventListener("pointerdown", (e) => {
    if (e.target === btnSpeak) return;
    e.stopPropagation();
    ensureAudioContext();
    triggerBounceClass(targetSlot, "boing");
    playTapSound();
    spawnTapBurst(e.clientX, e.clientY, { count: 7, symbols: ["✨", "🎵"] });
    if (state.currentQuestion) {
      speak(state.currentQuestion.prompt);
    }
  });

  treeWrap.addEventListener("pointerdown", (e) => {
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

  [toyCloud1, toyCloud2].forEach((cloud) => {
    cloud.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      ensureAudioContext();
      triggerBounceClass(cloud, "boing");
      playWaterSound();
      spawnTapBurst(e.clientX, e.clientY + 12, {
        count: 8,
        symbols: ["💧", "🩵", "✨"],
        color: "#1982C4",
        fallDown: true,
      });
    });
  });

  toyRainbow.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    ensureAudioContext();
    playPentatonicNote(5);
    triggerBounceClass(toyRainbow, "boing");
    spawnTapBurst(e.clientX, e.clientY, {
      count: 10,
      symbols: ["🌈", "✨", "💛", "💙"],
      color: "#FFCA3A",
    });
  });

  toyBalloon.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    ensureAudioContext();
    playPentatonicNote(4);
    triggerBounceClass(toyBalloon, "boing");
    spawnTapBurst(e.clientX, e.clientY, {
      count: 8,
      symbols: ["🎈", "🎉", "✨"],
      color: "#FF595E",
    });
  });

  // 画面のどこ（余白）をタップしても音とキラキラが出る！
  document.addEventListener("pointerdown", (e) => {
    if (!(e.target instanceof Element) || e.target.closest("button, .target-slot, .tree-wrap")) return;
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
    initGarden();
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

  // 定期的に雑草が少し生える（15秒ごと）
  setInterval(() => {
    spawnWeed();
  }, 15000);

  // --- Start immediately ---
  initGarden();
  loadNextQuestion();
  requestAnimationFrame(tickGardenMovement);
})();
