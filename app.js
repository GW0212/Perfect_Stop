// STOP Challenge - v9 features (fixed clickable)
(() => {
  const $ = (sel) => document.querySelector(sel);

  // DOM
  const timerEl = $("#timer");
  const fx = $("#fx");
  const ctx = fx ? fx.getContext("2d") : null;

  const btnStart = $("#btnStart");
  const btnStop  = $("#btnStop");
  const btnReset = $("#btnReset");

  const btnSave = $("#btnSave");
  const btnRandom = $("#btnRandom");
  const btnNewRandom = $("#btnNewRandom");
  const btnFull = $("#btnFull");
  const volRange = $("#volRange");

  const btnHow = $("#btnHow");
  const dlgHow = $("#how");

  const btnSound = $("#btnSound");

  const gameTitleEl = $("#gameTitle");
  const gameSubEl = $("#gameSub");
  const gameCardEl = document.querySelector(".game-card");

  const result = $("#result");
  const resultTitle = $("#resultTitle");
  const resultGrade = $("#resultGrade");
  const resultSub = $("#resultSub");

  const bestValue = $("#bestValue");
  const triesValue = $("#triesValue");

  const stageBtns = Array.from(document.querySelectorAll(".stage"));

  // If critical nodes missing, just bail silently (prevents total UI freeze)
  if(!timerEl || !btnStart || !btnStop || !btnReset || !result || !resultTitle || !resultSub){
    console.warn("[STOP Challenge] missing DOM nodes");
    return;
  }

  // ---------- state ----------
  let stageSec = 10;
  let randomMode = false;
  let targetCS = stageSec * 100; // centiseconds

  let running = false;
  let startT = 0;
  let rafId = 0;

  // audio
  let soundOn = true;
  let volume = 0.8;
  let audioCtx = null;

  // fx
  let fxMode = "none"; // none | confetti | gloom | flash
  let fxStart = 0;
  let parts = [];

  const pad2 = (n) => String(n).padStart(2, "0");
  const fmt = (sec, cs) => `${pad2(sec)}:${pad2(cs)}`;
  const toTargetDisplay = (csTotal) => fmt(Math.floor(csTotal/100), csTotal % 100);

  const keyBest = (sec) => `stopChallenge_best_${sec}`;
  const keyTries = (sec) => `stopChallenge_tries_${sec}`;

  function getBest(sec){
    const v = Number(localStorage.getItem(keyBest(sec)));
    return Number.isFinite(v) ? v : null;
  }
  function setBest(sec, val){
    localStorage.setItem(keyBest(sec), String(val));
  }
  function getTries(sec){
    const v = Number(localStorage.getItem(keyTries(sec)));
    return Number.isFinite(v) ? v : 0;
  }
  function bumpTries(sec){
    const t = getTries(sec) + 1;
    localStorage.setItem(keyTries(sec), String(t));
    return t;
  }

  function updateStats(){
    if(bestValue){
      const b = getBest(stageSec);
      bestValue.textContent = b == null ? "-" : `${b.toFixed(2)}s`;
    }
    if(triesValue){
      triesValue.textContent = String(getTries(stageSec));
    }
  }

  // ---------- FX canvas ----------
  function resizeFx(){
    if(!fx || !ctx) return;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const w = window.innerWidth;
    const h = window.innerHeight;
    fx.width = Math.floor(w * dpr);
    fx.height = Math.floor(h * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,w,h);
  }
  window.addEventListener("resize", resizeFx);

  function clearFx(){
    if(!fx || !ctx) return;
    ctx.clearRect(0,0,window.innerWidth,window.innerHeight);
  }

  function confetti(strength=1.0){
    if(!ctx) return;
    fxMode = "confetti";
    fxStart = performance.now();
    parts = [];
    const w = window.innerWidth, h = window.innerHeight;
    const N = Math.max(40, Math.floor(140 * strength));
    for(let i=0;i<N;i++){
      parts.push({
        x: Math.random()*w,
        y: -20 - Math.random()*h*0.2,
        vx: (Math.random()-0.5)*120,
        vy: 120 + Math.random()*260,
        s: 4 + Math.random()*6,
        rot: Math.random()*Math.PI*2,
        vr: (Math.random()-0.5)*8,
        hue: Math.floor(Math.random()*360),
      });
    }
    requestAnimationFrame(drawFx);
  }

  function flashGood(intensity=1.0){
    if(!ctx) return;
    fxMode = "flash";
    fxStart = performance.now();
    parts = [{ intensity }];
    requestAnimationFrame(drawFx);
  }

  function gloom(){
    if(!ctx) return;
    fxMode = "gloom";
    fxStart = performance.now();
    parts = [];
    const w = window.innerWidth, h = window.innerHeight;
    const N = 160;
    for(let i=0;i<N;i++){
      parts.push({
        x: Math.random()*w,
        y: Math.random()*h,
        vy: 420 + Math.random()*520,
        len: 10 + Math.random()*18,
        a: 0.18 + Math.random()*0.22,
      });
    }
    requestAnimationFrame(drawFx);
  }

  function drawFx(now){
    if(!ctx) return;
    const w = window.innerWidth, h = window.innerHeight;
    const t = (now - fxStart);

    ctx.clearRect(0,0,w,h);

    if(fxMode === "confetti"){
      // fade out by 1200ms
      const life = 1200;
      const p = Math.min(1, t/life);
      for(const q of parts){
        q.x += q.vx * (1/60);
        q.y += q.vy * (1/60);
        q.rot += q.vr * (1/60);
        ctx.save();
        ctx.translate(q.x, q.y);
        ctx.rotate(q.rot);
        ctx.globalAlpha = 1 - p;
        ctx.fillStyle = `hsl(${q.hue} 90% 55%)`;
        ctx.fillRect(-q.s/2, -q.s/2, q.s, q.s);
        ctx.restore();
      }
      if(p < 1) requestAnimationFrame(drawFx);
      else { fxMode="none"; clearFx(); }
      return;
    }

    if(fxMode === "flash"){
      const life = 420;
      const p = Math.min(1, t/life);
      const a = (1 - p) * 0.20 * (parts[0]?.intensity ?? 1);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fillRect(0,0,w,h);
      if(p < 1) requestAnimationFrame(drawFx);
      else { fxMode="none"; clearFx(); }
      return;
    }

    if(fxMode === "gloom"){
      // immediate full-screen gray overlay + rain for ~1600ms
      const life = 1600;
      const p = Math.min(1, t/life);

      const overlayA = 0.38 * (1 - p*0.15);
      ctx.fillStyle = `rgba(60,60,60,${overlayA})`;
      ctx.fillRect(0,0,w,h);

      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 2;
      for(const r of parts){
        r.y += r.vy * (1/60);
        if(r.y > h + 40){
          r.y = -40;
          r.x = Math.random()*w;
        }
        ctx.globalAlpha = r.a * (1 - p);
        ctx.beginPath();
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.x, r.y + r.len);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      if(p < 1) requestAnimationFrame(drawFx);
      else { fxMode="none"; clearFx(); }
      return;
    }
  }

  
  function triggerShake(){
    if(!gameCardEl) return;
    gameCardEl.classList.remove("shake");
    // force reflow to restart animation
    void gameCardEl.offsetWidth;
    gameCardEl.classList.add("shake");
    setTimeout(() => gameCardEl && gameCardEl.classList.remove("shake"), 450);
  }

// ---------- audio ----------
  function getAudio(){
    if(!audioCtx){
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }
  function tone(freq, start, dur, type="sine", gain=0.12){
    const ac = getAudio();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain * volume), start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(ac.destination);
    o.start(start);
    o.stop(start + dur + 0.02);
  }

  function playStartClick(){
    const ac = getAudio();
    const now = ac.currentTime + 0.02;
    tone(523.25, now, 0.07, "sine", 0.09);
  }
  function playFanfare(){
    const ac = getAudio();
    const now = ac.currentTime + 0.02;
    tone(523.25, now, 0.10, "sine", 0.10);
    tone(659.25, now+0.09, 0.12, "sine", 0.10);
    tone(783.99, now+0.18, 0.14, "sine", 0.10);
    tone(1046.5, now+0.30, 0.18, "sine", 0.10);
  }
  function playGood(){
    const ac = getAudio();
    const now = ac.currentTime + 0.02;
    tone(659.25, now, 0.10, "sine", 0.09);
    tone(987.77, now+0.07, 0.12, "sine", 0.08);
  }
  function playSad(){
    const ac = getAudio();
    const now = ac.currentTime + 0.02;
    tone(392.0, now, 0.14, "sine", 0.08);
    tone(311.13, now+0.10, 0.18, "sine", 0.08);
  }

  // ---------- timer ----------
  function readElapsed(now){
    const elapsed = Math.max(0, (now - startT) / 1000);
    const sec = Math.floor(elapsed);
    const cs  = Math.floor(elapsed * 100) % 100;
    return { elapsed, sec, cs, display: fmt(sec, cs) };
  }

  function setButtons(state){
    // idle | running | done
    if(state === "idle"){
      btnStart.disabled = false;
      btnStop.disabled = true;
      btnReset.disabled = true;
    }else if(state === "running"){
      btnStart.disabled = true;
      btnStop.disabled = false;
      btnReset.disabled = false;
    }else if(state === "done"){
      btnStart.disabled = false;
      btnStop.disabled = true;
      btnReset.disabled = false;
    }
  }

  function tick(now){
    if(!running) return;
    const { display } = readElapsed(now);
    timerEl.textContent = display;
    rafId = requestAnimationFrame(tick);
  }

  function start(){
    if(running) return;
    result.hidden = true;
    document.documentElement.classList.remove('with-result');
    if(btnSave) btnSave.disabled = true;
    clearFx();
    resizeFx();
    running = true;
    setButtons("running");
    startT = performance.now();
    rafId = requestAnimationFrame(tick);
    if(soundOn) playStartClick();
  }

  function stop(){
    if(!running) return;
    running = false;
    cancelAnimationFrame(rafId);
    setButtons("done");

    const { sec, cs, display } = readElapsed(performance.now());
    const elapsedCS = sec * 100 + cs;
    const deltaCS = elapsedCS - targetCS;
    const absCS = Math.abs(deltaCS);
    const absDelta = absCS / 100;

    bumpTries(stageSec);
    updateStats();

    const targetDisp = toTargetDisplay(targetCS);
    const lateEarly = deltaCS > 0 ? "늦음" : "빠름";

    const PERFECT_CS = 0;
    const GOOD_CS = 5; // ±0.05s

    result.hidden = false;
    document.documentElement.classList.add('with-result');

    if(absCS <= PERFECT_CS){
      resultTitle.textContent = "성공하셨습니다!!";
      resultTitle.style.color = "var(--good)";
      if(resultGrade){
        resultGrade.textContent = "PERFECT";
        resultGrade.style.color = "#b45309";
      }
      resultSub.textContent = `목표 ${targetDisp} / 당신은 ${display}에 STOP 버튼을 눌렀습니다. (오차 ${absDelta.toFixed(2)}s)`;
      if(soundOn) playFanfare();
      flashGood(1.0);
      confetti(1.0);
      if(getBest(stageSec) == null || absDelta < getBest(stageSec)) setBest(stageSec, absDelta);
      updateStats();
      if(navigator.vibrate) navigator.vibrate(60);
    } else if(absCS <= GOOD_CS){
      resultTitle.textContent = "거의 성공!";
      resultTitle.style.color = "var(--good)";
      if(resultGrade){
        resultGrade.textContent = "GOOD";
        resultGrade.style.color = "var(--good)";
      }
      resultSub.textContent = `목표 ${targetDisp} / 당신은 ${display}에 STOP 버튼을 눌렀습니다. (오차 ${absDelta.toFixed(2)}s, ${lateEarly})`;
      if(soundOn) playGood();
      flashGood(0.55);
      confetti(0.55);
      if(getBest(stageSec) == null || absDelta < getBest(stageSec)) setBest(stageSec, absDelta);
      updateStats();
      if(navigator.vibrate) navigator.vibrate(40);
    } else {
      resultTitle.textContent = "실패하셨습니다ㅠㅠ";
      resultTitle.style.color = "var(--bad)";
      if(resultGrade){
        resultGrade.textContent = "MISS";
        resultGrade.style.color = "var(--bad)";
      }
      resultSub.textContent = `목표 ${targetDisp} / 당신은 ${display}에 STOP 버튼을 눌렀습니다. (오차 ${absDelta.toFixed(2)}s, ${lateEarly})`;
      if(soundOn) playSad();
      triggerShake();
      gloom();
      if(navigator.vibrate) navigator.vibrate([30,40,30]);
    }

    if(btnSave) btnSave.disabled = false;
  }

  function hardReset(){
    running = false;
    cancelAnimationFrame(rafId);
    timerEl.textContent = "00:00";
    result.hidden = true;
    document.documentElement.classList.remove('with-result');
    if(btnSave) btnSave.disabled = true;
    clearFx();
    setButtons("idle");
  }

  // ---------- random mode ----------
  function makeRandomTarget(secMax){
    const min = 100; // 1.00s
    const max = secMax * 100 + 99;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function updateGameCopy(){
    if(gameTitleEl){
      gameTitleEl.textContent = `${stageSec}초 맞추기 게임`;
    }
    if(gameSubEl){
      const target = toTargetDisplay(targetCS);
      gameSubEl.innerHTML = `목표 <b>${target}</b>에 STOP!`;
    }
  }

  function selectStage(sec){
    stageSec = sec;
    stageBtns.forEach(b => b.setAttribute("aria-selected", String(Number(b.dataset.sec) === sec)));
    targetCS = randomMode ? makeRandomTarget(stageSec) : stageSec * 100;
    updateGameCopy();
    updateStats();
    hardReset();
  }

  // ---------- share image ----------
  function wrapText(ctx2, text, x, y, maxWidth, lineHeight){
    const words = text.split(" ");
    let line = "";
    let yy = y;
    for(let i=0;i<words.length;i++){
      const test = line + words[i] + " ";
      const w = ctx2.measureText(test).width;
      if(w > maxWidth && i > 0){
        ctx2.fillText(line.trim(), x, yy);
        line = words[i] + " ";
        yy += lineHeight;
      }else{
        line = test;
      }
    }
    ctx2.fillText(line.trim(), x, yy);
  }

  function exportResultPng(){
    const W = 1080, H = 1080;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d");

    g.fillStyle = "#ffffff";
    g.fillRect(0,0,W,H);

    const grade = resultGrade?.textContent || "";
    const title = "STOP 챌린지";
    const stage = `${stageSec}초`;
    const targetDisp = toTargetDisplay(targetCS);
    const sub = (resultSub?.textContent || "").replace(/\s+/g," ").trim();

    g.fillStyle = "#111827";
    g.font = "700 52px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    g.textAlign = "center";
    g.fillText(title, W/2, 120);

    g.fillStyle = "#6b7280";
    g.font = "600 34px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    g.fillText(`모드: ${randomMode ? "랜덤" : "스테이지"} · ${stage} · 목표 ${targetDisp}`, W/2, 180);

    const gradeColor = grade === "PERFECT" ? "#b45309" : (grade === "GOOD" ? "#059669" : "#dc2626");
    g.fillStyle = gradeColor;
    g.font = "900 140px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    g.fillText(grade || "RESULT", W/2, 420);

    g.strokeStyle = "#e5e7eb";
    g.lineWidth = 4;
    g.strokeRect(120, 520, 840, 360);

    g.fillStyle = "#111827";
    g.font = "600 40px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    wrapText(g, sub, W/2, 600, 760, 52);

    g.fillStyle = "#9ca3af";
    g.font = "500 28px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    g.fillText("STOP Challenge", W/2, 980);

    c.toBlob((blob) => {
      if(!blob) return;
      const a = document.createElement("a");
      const stamp = new Date();
      const y = stamp.getFullYear();
      const m = String(stamp.getMonth()+1).padStart(2,"0");
      const d = String(stamp.getDate()).padStart(2,"0");
      a.download = `stop_challenge_${stageSec}s_${grade || "RESULT"}_${y}${m}${d}.png`;
      a.href = URL.createObjectURL(blob);
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(a.href);
        a.remove();
      }, 500);
    }, "image/png");
  }

  // ---------- controls wiring ----------
  // sound toggle
  if(btnSound){
    btnSound.addEventListener("click", () => {
      soundOn = !soundOn;
      btnSound.setAttribute("aria-pressed", String(soundOn));
      btnSound.textContent = soundOn ? "🔊" : "🔇";
    });
  }

  // volume
  const savedVol = Number(localStorage.getItem("stopChallenge_volume"));
  if(!Number.isNaN(savedVol)){
    volume = Math.max(0, Math.min(1, savedVol));
  }
  if(volRange){
    volRange.value = String(Math.round(volume * 100));
    volRange.addEventListener("input", () => {
      volume = Math.max(0, Math.min(1, Number(volRange.value)/100));
      localStorage.setItem("stopChallenge_volume", String(volume));
    });
  }

  // fullscreen
  if(btnFull){
    btnFull.addEventListener("click", async () => {
      try{
        if(document.fullscreenElement){
          await document.exitFullscreen();
        }else{
          await document.documentElement.requestFullscreen();
        }
      }catch(e){}
    });
  }

  // how/rules dialog
  if(btnHow && dlgHow){
    btnHow.addEventListener("click", () => {
      if(typeof dlgHow.showModal === "function") dlgHow.showModal();
    });
  }

  // stage buttons
  stageBtns.forEach(btn => {
    btn.addEventListener("click", () => selectStage(Number(btn.dataset.sec)));
  });

  // random buttons
  if(btnRandom){
    btnRandom.addEventListener("click", () => {
      randomMode = !randomMode;
      btnRandom.setAttribute("aria-pressed", String(randomMode));
      btnRandom.textContent = randomMode ? "랜덤 목표: ON" : "랜덤 목표: OFF";
      if(btnNewRandom) btnNewRandom.hidden = !randomMode;
      targetCS = randomMode ? makeRandomTarget(stageSec) : stageSec * 100;
      updateGameCopy();
      hardReset();
    });
  }
  if(btnNewRandom){
    btnNewRandom.addEventListener("click", () => {
      if(!randomMode) return;
      targetCS = makeRandomTarget(stageSec);
      updateGameCopy();
      hardReset();
    });
  }

  // main buttons
  btnStart.addEventListener("click", start);
  btnStop.addEventListener("click", stop);
  btnReset.addEventListener("click", hardReset);

  // save
  if(btnSave){
    btnSave.addEventListener("click", exportResultPng);
    btnSave.disabled = true;
  }

  // keyboard
  document.addEventListener("keydown", (e) => {
    if(e.key === " "){
      e.preventDefault();
      if(running) stop(); else start();
    }
    if(e.key.toLowerCase() === "r") hardReset();
    if(e.key === "1") selectStage(10);
    if(e.key === "2") selectStage(30);
    if(e.key === "3") selectStage(60);
  });

  // init
  resizeFx();
  setButtons("idle");
  if(btnNewRandom) btnNewRandom.hidden = true;
  selectStage(10);

  console.debug("[STOP Challenge] ready.");
})();
