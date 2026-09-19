// Iron Lion 4977 · Miembros nuevos — vista de horario personal.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const POLL_MS = 10000;

  const state = {
    data: null,          // { roundCount, people[] }
    me: null,            // persona actual
    sched: null,         // estado del cronómetro desde /api/state
    clockOffset: 0,      // serverTime - Date.now()
    expanded: new Set(),
    lastRoundKey: null,
  };

  // ---------- chispas de fondo ----------
  (function sparks() {
    const host = $(".sparks");
    if (!host || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const n = innerWidth < 480 ? 18 : 30;
    for (let i = 0; i < n; i++) {
      const s = document.createElement("i");
      s.className = "spark";
      s.style.left = Math.random() * 100 + "%";
      s.style.setProperty("--t", 7 + Math.random() * 9 + "s");
      s.style.setProperty("--d", -Math.random() * 16 + "s");
      s.style.setProperty("--x", (Math.random() * 120 - 60).toFixed(0) + "px");
      s.style.width = s.style.height = (2 + Math.random() * 2.5).toFixed(1) + "px";
      host.appendChild(s);
    }
  })();

  // ---------- datos ----------
  async function loadData() {
    const r = await fetch("/data.json", { cache: "no-cache" });
    state.data = await r.json();
  }

  async function loadSched() {
    try {
      const r = await fetch("/api/state", { cache: "no-store" });
      if (!r.ok) throw new Error(r.status);
      const s = await r.json();
      if (s.serverTime) state.clockOffset = Date.parse(s.serverTime) - Date.now();
      state.sched = s;
    } catch {
      // Sin API (ej. abriendo el HTML local): modo apagado.
      state.sched = state.sched || { mode: "off" };
    }
  }

  const now = () => Date.now() + state.clockOffset;

  // ---------- cálculo de ronda ----------
  // Devuelve { phase: 'off'|'pre'|'live'|'break'|'done', round, progress, remainingMs, nextRound }
  function computeRound() {
    const s = state.sched || { mode: "off" };
    const total = state.data.roundCount;
    if (s.mode === "manual") {
      const r = Math.min(total, Math.max(0, s.manualRound | 0));
      if (r === 0) return { phase: "pre", round: 1, progress: 0 };
      return { phase: "live", round: r, progress: 1, manual: true };
    }
    if (s.mode !== "auto" || !s.startAt) return { phase: "off", round: 1, progress: 0 };

    const start = Date.parse(s.startAt);
    const roundMs = (s.roundMinutes || 5) * 60000;
    const breakMs = (s.breakMinutes || 0) * 60000;
    const period = roundMs + breakMs;
    const elapsed = now() - start;
    if (elapsed < 0) return { phase: "pre", round: 1, progress: 0, remainingMs: -elapsed };
    const idx = Math.floor(elapsed / period);
    if (idx >= total) return { phase: "done", round: total, progress: 1 };
    const inPeriod = elapsed - idx * period;
    if (inPeriod < roundMs) {
      return { phase: "live", round: idx + 1, progress: inPeriod / roundMs, remainingMs: roundMs - inPeriod };
    }
    return { phase: "break", round: idx + 1, nextRound: Math.min(total, idx + 2), progress: 1, remainingMs: period - inPeriod };
  }

  const fmt = (ms) => {
    const t = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(t / 60), s = t % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  function teammates(round, group) {
    return state.data.people.filter((p) => p.rounds[round - 1] === group);
  }

  // ---------- render persona ----------
  function renderPerson() {
    const me = state.me;
    const parts = me.name.trim().split(/\s+/);
    const first = parts.slice(0, Math.min(2, parts.length - 1)).join(" ") || parts[0];
    const last = parts.slice(first.split(" ").length).join(" ");
    $("#p-name").innerHTML = `${esc(first)}<span class="last">${esc(last)}</span>`;
    document.title = `${first} · Iron Lion 4977`;

    const list = $("#rounds");
    const tpl = $("#tpl-round");
    list.innerHTML = "";
    me.rounds.forEach((g, i) => {
      const li = tpl.content.firstElementChild.cloneNode(true);
      li.dataset.round = i + 1;
      li.style.setProperty("--i", i);
      $(".round-idx b", li).textContent = i + 1;
      $(".round-group b", li).textContent = g;
      const btn = $(".round-btn", li);
      btn.addEventListener("click", () => {
        const open = btn.getAttribute("aria-expanded") !== "true";
        btn.setAttribute("aria-expanded", open);
        if (open) fillChips($(".round-team ul", li), teammates(i + 1, g));
      });
      list.appendChild(li);
    });
    $("#view-person").hidden = false;
    tick();
  }

  function fillChips(ul, people) {
    ul.innerHTML = "";
    people.forEach((p) => {
      const li = document.createElement("li");
      li.textContent = p.name;
      if (p.slug === state.me.slug) li.classList.add("me");
      ul.appendChild(li);
    });
  }

  function setLive(status, text) {
    const el = $("#live");
    el.dataset.state = status;
    $("#live-text").textContent = text;
  }

  // Se ejecuta cada segundo: actualiza la tarjeta "ahora" y estados de rondas.
  function tick() {
    if (!state.me) return;
    const me = state.me;
    const c = computeRound();
    const nowCard = $("#now");
    const ring = $("#ring");
    const num = $("#ring-num");
    const key = `${c.phase}-${c.round}`;
    const changed = key !== state.lastRoundKey;
    state.lastRoundKey = key;

    const group = me.rounds[c.round - 1];
    const nextGroup = c.nextRound ? me.rounds[c.nextRound - 1] : null;

    nowCard.dataset.status = c.phase;
    ring.style.setProperty("--p", c.phase === "live" ? c.progress.toFixed(4) : c.progress);

    if (c.phase === "off") {
      setLive("idle", "Aún no empieza");
      $("#now-label").textContent = "Tu primera ronda";
      $("#now-timer").textContent = "";
      $("#ring-small").textContent = "Grupo";
      num.textContent = me.rounds[0];
      $("#now-title").innerHTML = `Empiezas en el <em>grupo ${me.rounds[0]}</em>`;
      $("#now-sub").textContent = "Cuando arranque la actividad, aquí verás la ronda en curso y a qué grupo ir.";
      showTeam(1, me.rounds[0]);
    } else if (c.phase === "pre") {
      setLive("idle", "Por comenzar");
      $("#now-label").textContent = "Ronda 1 · próxima";
      $("#now-timer").textContent = c.remainingMs != null ? fmt(c.remainingMs) : "";
      $("#ring-small").textContent = "Grupo";
      num.textContent = me.rounds[0];
      $("#now-title").innerHTML = `Prepárate: <em>grupo ${me.rounds[0]}</em>`;
      $("#now-sub").textContent = c.remainingMs != null ? "La Ronda 1 arranca en breve." : "El staff marcará el inicio de la Ronda 1.";
      showTeam(1, me.rounds[0]);
    } else if (c.phase === "live") {
      setLive("live", `Ronda ${c.round} en curso`);
      $("#now-label").textContent = `Ronda ${c.round} de ${state.data.roundCount}`;
      $("#now-timer").textContent = c.manual ? "" : fmt(c.remainingMs);
      $("#ring-small").textContent = "Grupo";
      num.textContent = group;
      $("#now-title").innerHTML = `Ve al <em>grupo ${group}</em>`;
      const nx = c.round < state.data.roundCount ? `Después: grupo ${me.rounds[c.round]} en la ronda ${c.round + 1}.` : "Es tu última ronda.";
      $("#now-sub").textContent = c.manual ? nx : `Quedan ${fmt(c.remainingMs)} de esta ronda. ${nx}`;
      showTeam(c.round, group);
    } else if (c.phase === "break") {
      setLive("break", `Cambio a ronda ${c.nextRound}`);
      $("#now-label").textContent = "Cambio de grupo";
      $("#now-timer").textContent = fmt(c.remainingMs);
      $("#ring-small").textContent = "Siguiente";
      num.textContent = nextGroup;
      $("#now-title").innerHTML = `Dirígete al <em>grupo ${nextGroup}</em>`;
      $("#now-sub").textContent = `La ronda ${c.nextRound} comienza en ${fmt(c.remainingMs)}.`;
      showTeam(c.nextRound, nextGroup);
    } else if (c.phase === "done") {
      setLive("done", "Actividad terminada");
      $("#now-label").textContent = "¡Listo!";
      $("#now-timer").textContent = "";
      $("#ring-small").textContent = "Rondas";
      num.textContent = state.data.roundCount;
      $("#now-title").innerHTML = `Completaste <em>todas</em> las rondas`;
      $("#now-sub").textContent = "Gracias por tu temple. Donde hay una chispa, hay TEMPLE.";
      $("#team").hidden = true;
    }

    if (changed) {
      num.classList.remove("bump"); void num.offsetWidth; num.classList.add("bump");
      if (navigator.vibrate && c.phase === "live") navigator.vibrate(30);
    }

    // Estados de la lista de rondas
    const liveRound = c.phase === "live" ? c.round : c.phase === "break" ? c.nextRound : c.phase === "done" ? Infinity : 0;
    document.querySelectorAll(".round").forEach((li) => {
      const r = +li.dataset.round;
      const st = r < liveRound ? "past" : r === liveRound ? "live" : "next";
      li.dataset.state = st;
      $(".round-state", li).textContent = st === "live" ? (c.phase === "break" ? "Siguiente" : "Ahora") : st === "past" ? "Hecha" : "";
    });
  }

  function showTeam(round, group) {
    const box = $("#team");
    const others = teammates(round, group);
    box.hidden = false;
    $("h3", box).textContent = round === computeRound().round && computeRound().phase === "live" ? "En tu grupo ahora" : `En tu grupo · Ronda ${round}`;
    const ul = $("#team-list");
    const sig = others.map((p) => p.slug).join("|") + round;
    if (ul.dataset.sig === sig) return;
    ul.dataset.sig = sig;
    fillChips(ul, others);
  }

  // ---------- render lista ----------
  function renderList() {
    const ul = $("#people");
    const input = $("#search");
    const draw = () => {
      const q = norm(input.value);
      const rows = state.data.people.filter((p) => !q || norm(p.name).includes(q));
      ul.innerHTML = rows.length
        ? rows.map((p) => `<li><a href="/?p=${p.slug}">${esc(p.name)}<span>Ronda 1 · Grupo ${p.rounds[0]}</span></a></li>`).join("")
        : `<li class="empty">No encontramos ese nombre. Pregunta al staff.</li>`;
    };
    input.addEventListener("input", draw);
    draw();
    $("#view-list").hidden = false;
    setLive("idle", "Busca tu nombre");
  }

  const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------- arranque ----------
  async function main() {
    await Promise.all([loadData(), loadSched()]);
    const slug = new URLSearchParams(location.search).get("p");
    state.me = slug ? state.data.people.find((p) => p.slug === slug) : null;
    if (state.me) renderPerson(); else renderList();

    setInterval(tick, 1000);
    setInterval(loadSched, POLL_MS);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) loadSched().then(tick); });
  }
  main().catch((e) => { console.error(e); setLive("idle", "Error al cargar"); });
})();
