(() => {
  "use strict";

  const TOTAL_QUESTIONS = 5;

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

  const state = {
    mode: "color",
    questionIndex: 0,
    soundEnabled: true,
    isTransitioning: false,
    currentQuestion: null,
    audioCtx: null,
  };

  // DOM Elements
  const screenHome = document.getElementById("screen-home");
  const screenGame = document.getElementById("screen-game");
  const screenClear = document.getElementById("screen-clear");
  const btnHome = document.getElementById("btn-home");
  const btnSound = document.getElementById("btn-sound");
  const iconSoundOn = document.getElementById("icon-sound-on");
  const iconSoundOff = document.getElementById("icon-sound-off");
  const soundLabel = document.getElementById("sound-label");
  const progressStars = document.getElementById("progress-stars");
  const btnSpeak = document.getElementById("btn-speak");
  const questionText = document.getElementById("question-text");
  const targetSlot = document.getElementById("target-slot");
  const targetVisual = document.getElementById("target-visual");
  const choicesGrid = document.getElementById("choices-grid");
  const feedbackBubble = document.getElementById("feedback-bubble");
  const feedbackEmoji = document.getElementById("feedback-emoji");
  const feedbackText = document.getElementById("feedback-text");
  const btnReplay = document.getElementById("btn-replay");
  const btnChooseMode = document.getElementById("btn-choose-mode");
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

  function playTone(freq, duration, type = "sine", delay = 0, volume = 0.16) {
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

  function playSuccessSound() {
    playTone(523.25, 0.14, "triangle", 0, 0.18); // C5
    playTone(659.25, 0.14, "triangle", 0.09, 0.18); // E5
    playTone(783.99, 0.28, "triangle", 0.18, 0.2); // G5
    playTone(1046.5, 0.35, "sine", 0.27, 0.16); // C6
  }

  function playGentleTryAgainSound() {
    playTone(329.63, 0.14, "sine", 0, 0.12); // E4
    playTone(293.66, 0.18, "sine", 0.1, 0.12); // D4
  }

  function playTapSound() {
    playTone(440, 0.07, "sine", 0, 0.1);
  }

  function playFanfareSound() {
    const notes = [
      { f: 523.25, d: 0.15, t: 0 },
      { f: 659.25, d: 0.15, t: 0.12 },
      { f: 783.99, d: 0.15, t: 0.24 },
      { f: 1046.5, d: 0.45, t: 0.36 },
      { f: 783.99, d: 0.15, t: 0.56 },
      { f: 1046.5, d: 0.55, t: 0.7 },
    ];
    notes.forEach((n) => playTone(n.f, n.d, "triangle", n.t, 0.18));
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

  // --- Confetti ---
  let confettiParticles = [];
  let confettiAnimId = null;

  function launchConfetti(count = 45) {
    const ctx = confettiCanvas.getContext("2d");
    if (!ctx) return;

    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;

    const palette = COLORS.map((c) => c.hex);
    for (let i = 0; i < count; i++) {
      confettiParticles.push({
        x: Math.random() * confettiCanvas.width,
        y: -20 - Math.random() * 120,
        vx: (Math.random() - 0.5) * 5,
        vy: 3 + Math.random() * 4.5,
        size: 8 + Math.random() * 8,
        color: pickRandom(palette),
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2,
      });
    }

    if (!confettiAnimId) {
      animateConfetti();
    }
  }

  function animateConfetti() {
    const ctx = confettiCanvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    confettiParticles = confettiParticles.filter((p) => p.y < confettiCanvas.height + 30);
    confettiParticles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vRot;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
      ctx.restore();
    });

    if (confettiParticles.length > 0) {
      confettiAnimId = requestAnimationFrame(animateConfetti);
    } else {
      confettiAnimId = null;
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  // --- Screen Navigation ---
  function showScreen(target) {
    [screenHome, screenGame, screenClear].forEach((el) => el.classList.remove("active"));
    target.classList.add("active");

    const isHome = target === screenHome;
    btnHome.classList.toggle("hidden", isHome);
    progressStars.classList.toggle("hidden", target !== screenGame);
  }

  function renderProgressStars() {
    progressStars.innerHTML = "";
    for (let i = 0; i < TOTAL_QUESTIONS; i++) {
      const span = document.createElement("span");
      span.className = "star-slot" + (i < state.questionIndex ? " filled" : "");
      span.textContent = "★";
      progressStars.appendChild(span);
    }
  }

  // --- Question Generation ---
  function buildQuestion() {
    if (state.mode === "color") {
      const targetColor = pickRandom(COLORS);
      const otherColors = shuffle(COLORS.filter((c) => c.id !== targetColor.id)).slice(0, 3);
      const choices = shuffle([targetColor, ...otherColors]).map((c) => ({
        id: c.id,
        isCorrect: c.id === targetColor.id,
        color: c,
        shape: SHAPES[0], // circle
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

    if (state.mode === "shape") {
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

    // mode === "mix"
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

    renderProgressStars();
    const q = buildQuestion();
    state.currentQuestion = q;

    questionText.textContent = q.prompt;
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
    let isDragging = false;
    let ghost = null;

    card.addEventListener("pointerdown", (e) => {
      if (state.isTransitioning) return;
      ensureAudioContext();
      startX = e.clientX;
      startY = e.clientY;
      isDragging = false;
      card.setPointerCapture(e.pointerId);
    });

    card.addEventListener("pointermove", (e) => {
      if (state.isTransitioning || !card.hasPointerCapture(e.pointerId)) return;
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
      if (!card.hasPointerCapture(e.pointerId)) return;
      card.releasePointerCapture(e.pointerId);
      card.classList.remove("dragging");
      targetSlot.classList.remove("drag-over");

      if (ghost) {
        ghost.remove();
        ghost = null;
      }

      if (state.isTransitioning) return;

      if (isDragging) {
        const targetRect = targetSlot.getBoundingClientRect();
        const droppedOnTarget =
          e.clientX >= targetRect.left - 24 &&
          e.clientX <= targetRect.right + 24 &&
          e.clientY >= targetRect.top - 24 &&
          e.clientY <= targetRect.bottom + 24;

        if (droppedOnTarget) {
          handleChoice(card, choice);
        }
      } else {
        handleChoice(card, choice);
      }
    };

    card.addEventListener("pointerup", finishPointer);
    card.addEventListener("pointercancel", finishPointer);
  }

  function handleChoice(card, choice) {
    if (state.isTransitioning) return;

    if (choice.isCorrect) {
      state.isTransitioning = true;
      card.classList.add("correct-pop");
      targetSlot.classList.add("matched");

      // 正解の図形をターゲット枠にもピタッと表示
      targetVisual.innerHTML = createShapeSvg(
        choice.shape.id,
        choice.color.hex,
        choice.color.stroke,
        { withFace: true }
      );

      playSuccessSound();
      launchConfetti(35);

      const praise = pickRandom(PRAISE_WORDS);
      feedbackEmoji.textContent = praise.emoji;
      feedbackText.textContent = praise.text;
      feedbackBubble.classList.remove("hidden");
      speak(praise.text);

      state.questionIndex += 1;
      renderProgressStars();

      setTimeout(() => {
        if (state.questionIndex >= TOTAL_QUESTIONS) {
          showClearScreen();
        } else {
          loadNextQuestion();
        }
      }, 1350);
    } else {
      playGentleTryAgainSound();
      card.classList.remove("wrong-shake");
      void card.offsetWidth; // reflow
      card.classList.add("wrong-shake");
      speak("こっちかな？");
    }
  }

  function showClearScreen() {
    showScreen(screenClear);
    playFanfareSound();
    launchConfetti(110);
    speak("すごい！ ぜんぶ できたね！");
  }

  function startGame(mode) {
    ensureAudioContext();
    playTapSound();
    state.mode = mode;
    state.questionIndex = 0;
    showScreen(screenGame);
    loadNextQuestion();
  }

  // --- Event Listeners ---
  document.querySelectorAll(".mode-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      startGame(btn.dataset.mode);
    });
  });

  btnHome.addEventListener("click", () => {
    playTapSound();
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    showScreen(screenHome);
  });

  btnSound.addEventListener("click", () => {
    state.soundEnabled = !state.soundEnabled;
    btnSound.classList.toggle("sound-on", state.soundEnabled);
    btnSound.classList.toggle("sound-off", !state.soundEnabled);
    iconSoundOn.classList.toggle("hidden", !state.soundEnabled);
    iconSoundOff.classList.toggle("hidden", state.soundEnabled);
    soundLabel.textContent = state.soundEnabled ? "おと あり" : "おと なし";

    if (!state.soundEnabled && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    } else if (state.soundEnabled) {
      playTapSound();
    }
  });

  btnSpeak.addEventListener("click", () => {
    if (state.currentQuestion) {
      playTapSound();
      speak(state.currentQuestion.prompt);
    }
  });

  btnReplay.addEventListener("click", () => {
    startGame(state.mode);
  });

  btnChooseMode.addEventListener("click", () => {
    playTapSound();
    showScreen(screenHome);
  });
})();
