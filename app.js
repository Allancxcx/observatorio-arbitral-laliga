/* Observatorio arbitral — UI dinámica (solo lectura) */
(function () {
  const THEME_KEY = "obs-theme";

  function $(sel) { return document.querySelector(sel); }
  function $all(sel) { return [...document.querySelectorAll(sel)]; }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const theme = saved || "dark";
    document.documentElement.setAttribute("data-theme", theme);
    const btn = $("#themeBtn");
    btn.textContent = theme === "dark" ? "Modo día" : "Modo noche";
    btn.addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem(THEME_KEY, next);
      btn.textContent = next === "dark" ? "Modo día" : "Modo noche";
      redrawCharts();
    });
  }

  function fmt(v) {
    return v === null || v === undefined ? "n/d" : String(v);
  }

  function pair(a, b) {
    if (a == null && b == null) return '<span class="null">n/d</span>';
    return `${fmt(a)} / ${fmt(b)}`;
  }

  async function loadData() {
    const res = await fetch("./data/canonical-dataset.json", { cache: "no-store" });
    if (!res.ok) throw new Error("No se pudo cargar dataset");
    const data = await res.json();
    Object.freeze(data);
    return data;
  }

  async function softIntegrity(data) {
    const seal = $("#seal");
    try {
      const res = await fetch("./data/canonical-dataset.json", { cache: "no-store" });
      const buf = await res.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", buf);
      const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
      const expected = document.querySelector('meta[name="dataset-sha256"]')?.content;
      if (expected && expected !== "PLACEHOLDER_HASH" && hex === expected) {
        seal.textContent = "Dataset íntegro";
        seal.classList.add("ok");
      } else if (expected === "PLACEHOLDER_HASH") {
        seal.textContent = "v" + (data.meta?.version || "2");
      } else {
        seal.textContent = "Copia local · ver fuentes";
        seal.classList.add("warn");
      }
    } catch {
      seal.textContent = "Modo lectura";
    }
  }

  function renderConclusiones(data) {
    const box = $("#conclBox");
    box.innerHTML = (data.conclusiones_imparciales || []).map((c, i) =>
      `<div class="card"><span class="pill">C${i + 1}</span><p style="margin:8px 0 0">${c}</p></div>`
    ).join("");
  }

  function renderUefa(data) {
    const u = data.uefa_proceso || {};
    $("#uefaStats").innerHTML = [
      ["Inicio investigación UEFA", u.inicio_investigacion || "—"],
      ["Docs Madrid recibidos", u.denuncia_real_madrid_docs || "—"],
      ["Estado público", "Investigación en curso"],
    ].map(([l, v]) => `<div class="stat"><div class="lbl">${l}</div><div class="val" style="font-size:1.25rem">${v}</div></div>`).join("");
  }

  function renderPolemicas(data) {
    const list = data.polemicas || [];
    const host = $("#polTimeline");
    function paint(filter) {
      host.innerHTML = list
        .filter((p) => filter === "all" || p.severidad === filter)
        .map((p) => {
          const sev = p.severidad === "roja" ? "r" : p.severidad === "naranja" ? "o" : "g";
          return `<article class="tl">
            <div class="when">${p.fecha}<br><span class="pill ${sev}">${p.severidad}</span></div>
            <div>
              <strong>${p.titulo}</strong>
              <div class="tiny">${p.clubes}</div>
              <p style="margin:6px 0">${p.resumen}</p>
              <div class="tiny">Fuente: ${p.fuente}</div>
            </div>
          </article>`;
        }).join("");
    }
    paint("all");
    $all("#polFilters button").forEach((btn) => {
      btn.addEventListener("click", () => {
        $all("#polFilters button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        paint(btn.dataset.f);
      });
    });
  }

  let chartState = { data: null };

  function renderBrutos(data) {
    const rows = data.laliga_temporada || [];
    chartState.data = data;
    const sel = $("#tempFilter");
    sel.innerHTML = `<option value="all">Todas</option>` + rows.map((r) => `<option value="${r.temp}">${r.temp}</option>`).join("");

    function paint(temp) {
      const filtered = temp === "all" ? rows : rows.filter((r) => r.temp === temp);
      $("#brutosBody").innerHTML = filtered.map((r) => `<tr>
        <td>${r.temp}</td>
        <td>${pair(r.bcn_poss, r.mad_poss)}</td>
        <td>${pair(r.bcn_shots, r.mad_shots)}</td>
        <td>${pair(r.bcn_sot, r.mad_sot)}</td>
        <td>${pair(r.bcn_goles, r.mad_goles)}</td>
        <td>${pair(r.bcn_pen_f, r.mad_pen_f)}</td>
        <td>${pair(r.bcn_pen_c, r.mad_pen_c)}</td>
        <td>${pair(r.bcn_roj, r.mad_roj)}</td>
        <td>${pair(r.bcn_roj_riv, r.mad_roj_riv)}</td>
        <td class="tiny">${r.fuente}</td>
      </tr>`).join("");
    }
    paint("all");
    sel.addEventListener("change", () => paint(sel.value));

    const c = data.clasico_muestra_rojas;
    if (c) {
      $("#clasicoTxt").textContent =
        `En ~${c.periodo_aprox}: rojas Madrid ${c.rojas_madrid} vs Barça ${c.rojas_barca}. Fuente: ${c.fuente}.`;
    }
  }

  function renderOpta(data) {
    const o = data.opta_0304_1718;
    if (!o) return;
    $("#optaStats").innerHTML = [
      ["Saldo pen Barça", "+" + o.barcelona.saldo_pen, "var(--barca)"],
      ["Saldo pen Madrid", "+" + o.real_madrid.saldo_pen, "var(--madrid)"],
      ["Saldo rojas Barça", "+" + o.barcelona.saldo_rojas, "var(--barca)"],
      ["Saldo rojas Madrid", String(o.real_madrid.saldo_rojas), "var(--danger)"],
    ].map(([l, v, c]) => `<div class="stat"><div class="lbl">${l}</div><div class="val" style="color:${c}">${v}</div></div>`).join("");
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function drawBars(canvasId, labels, series, colors) {
    const c = document.getElementById(canvasId);
    if (!c) return;
    const ctx = c.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = c.parentElement.clientWidth - 24;
    const h = 220;
    c.width = w * dpr; c.height = h * dpr;
    c.style.width = w + "px"; c.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const pad = { t: 16, r: 10, b: 36, l: 28 };
    const flat = series.flat().filter((x) => x != null);
    const max = Math.max(...flat, 1) * 1.15;
    const n = labels.length;
    const groupW = (w - pad.l - pad.r) / Math.max(n, 1);
    const barW = (groupW * 0.72) / series.length;
    ctx.strokeStyle = cssVar("--line");
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, h - pad.b);
    ctx.lineTo(w - pad.r, h - pad.b);
    ctx.stroke();
    labels.forEach((lab, i) => {
      series.forEach((s, si) => {
        const val = s[i];
        if (val == null) return;
        const bh = ((h - pad.t - pad.b) * val) / max;
        const x = pad.l + i * groupW + groupW * 0.14 + si * barW;
        ctx.fillStyle = colors[si];
        ctx.fillRect(x, h - pad.b - bh, Math.max(barW - 2, 1), bh);
      });
      ctx.fillStyle = cssVar("--muted");
      ctx.font = "10px DM Sans";
      ctx.textAlign = "center";
      ctx.fillText(lab, pad.l + i * groupW + groupW / 2, h - 12);
    });
  }

  function redrawCharts() {
    const data = chartState.data;
    if (!data) return;
    const rows = data.laliga_temporada || [];
    const labels = rows.map((r) => r.temp.replace("20", "").slice(0, 5));
    drawBars("chartGoles", labels, [rows.map((r) => r.bcn_goles), rows.map((r) => r.mad_goles)], [cssVar("--barca"), cssVar("--madrid")]);
    drawBars("chartPen", labels, [rows.map((r) => r.bcn_pen_f), rows.map((r) => r.mad_pen_f)], [cssVar("--barca"), cssVar("--madrid")]);
    const o = data.opta_0304_1718;
    if (o) {
      drawBars("chartOpta", ["Saldo pen", "Saldo rojas"], [
        [o.barcelona.saldo_pen, o.barcelona.saldo_rojas],
        [o.real_madrid.saldo_pen, o.real_madrid.saldo_rojas],
      ], [cssVar("--barca"), cssVar("--madrid")]);
    }
  }

  async function main() {
    initTheme();
    try {
      const data = await loadData();
      renderConclusiones(data);
      renderUefa(data);
      renderPolemicas(data);
      renderBrutos(data);
      renderOpta(data);
      redrawCharts();
      softIntegrity(data);
      window.addEventListener("resize", redrawCharts);
    } catch (e) {
      $("#seal").textContent = "Error cargando datos";
      $("#seal").classList.add("warn");
      console.error(e);
    }
  }

  main();
})();
