// Formas musicais da landing: cada seção tem uma forma que gira no próprio eixo e vira o fundo ou a estrutura
// da seção (a mesma ideia da guitarra, com outras formas). SVG e CSS; o JS só passa o progresso de entrada da
// seção (--e, 0 a 1) e cuida das interações. Com movimento reduzido tudo aparece no estado final.
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
const NS = "http://www.w3.org/2000/svg";
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const svg = (tag, attrs = {}, parent) => {
  const el = document.createElementNS(NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  if (parent) parent.append(el);
  return el;
};
if (reduced) document.documentElement.classList.add("forms-still");

// progresso de entrada: 0 quando o topo da seção chega no pé da tela, 1 quando chega a 35% do topo
const entry = (el) => {
  const r = el.getBoundingClientRect();
  return reduced ? 1 : clamp((innerHeight - r.top) / (innerHeight * 0.65));
};
const forms = [];
let ticking = false;
const update = () => {
  ticking = false;
  document.documentElement.style.setProperty("--scroll", (scrollY / innerHeight).toFixed(3));
  for (const f of forms) f.update(entry(f.el));
};
const queue = () => {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(update);
  }
};
addEventListener("scroll", queue, { passive: true });
addEventListener("resize", queue);

// ------------------------------------------------------------------ 1. Cursos: a palheta cai do palco no carrossel
// A palheta dourada da logo sai do hero girando no próprio eixo (efeito de moeda), atravessa a borda rasgada e
// quica em cima dos painéis dos instrumentos. Passar o mouse nela (ou tocar) faz ela girar de novo.
{
  const sec = document.getElementById("cursos");
  const deck = sec?.querySelector(".inst__deck");
  if (deck) {
    const pick = document.createElement("img");
    pick.className = "pickdrop";
    pick.src = "landing/pick-gold.svg";
    pick.alt = "";
    pick.setAttribute("aria-hidden", "true");
    sec.prepend(pick);
    const bounce = (t) => {
      // queda com dois quiques (easeOutBounce)
      const n = 7.5625, d = 2.75;
      if (t < 1 / d) return n * t * t;
      if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
      if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
      return n * (t -= 2.625 / d) * t + 0.984375;
    };
    forms.push({
      el: sec,
      update(e) {
        const k = clamp(e * 1.15);
        const top = deck.offsetTop - pick.offsetHeight * 0.55; // pousa na borda de cima dos painéis
        const y = -sec.offsetTop * 0.18 + (top + sec.offsetTop * 0.18) * bounce(k);
        pick.style.setProperty("--y", `${y.toFixed(1)}px`);
        pick.style.setProperty("--spin", `${((1 - k) * 720).toFixed(1)}deg`);
        pick.style.setProperty("--tilt", `${(k * 18).toFixed(1)}deg`);
      },
    });
    const flick = () => {
      if (reduced) return;
      pick.classList.remove("is-flick");
      void pick.offsetWidth;
      pick.classList.add("is-flick");
    };
    pick.addEventListener("pointerenter", flick);
    pick.addEventListener("click", flick);
  }
}

// ------------------------------------------------------------------ 2. Aulas: a tablatura vira as linhas-guia
// A escola é de rock: no lugar da partitura, a tablatura (6 cordas). O "TAB" gira no próprio eixo, as 6 cordas se
// estendem pela seção, e cada etapa é a casa de um riff de power chord (0, 3, 5) que acende quando a etapa abre.
{
  const sec = document.getElementById("aulas");
  const host = sec?.querySelector(".mo-pc__text");
  if (host) {
    const box = document.createElement("div");
    box.className = "staff";
    box.setAttribute("aria-hidden", "true");
    const s = svg("svg", { viewBox: "0 0 600 116", preserveAspectRatio: "none" }, box);
    const tab = svg("g", { class: "staff__clef" }, s);
    ["T", "A", "B"].forEach((l, i) => (svg("text", { x: "20", y: 30 + i * 22, class: "staff__tab" }, tab).textContent = l));
    for (let i = 0; i < 6; i++) svg("line", { class: "staff__line", x1: "52", x2: "596", y1: 14 + i * 14, y2: 14 + i * 14, style: `--i:${i}` }, s);
    const notes = [
      [190, 5, "0"],
      [350, 5, "3"],
      [510, 5, "5"],
    ].map(([x, str, fret], n) => {
      const y = 14 + str * 14;
      const g = svg("g", { class: "staff__note", style: `--x:${x}px;--y:${y}px` }, s);
      svg("rect", { x: x - 11, y: y - 10, width: "22", height: "20", rx: "4", class: "staff__fretbg" }, g);
      svg("text", { x: x, y: y + 5, class: "staff__fret" }, g).textContent = fret;
      svg("text", { x: x, y: 112, class: "staff__num" }, g).textContent = `passo ${n + 1}`;
      // a quinta do power chord: na 5ª corda, dois trastes acima
      const y5 = 14 + 4 * 14;
      svg("rect", { x: x - 11, y: y5 - 10, width: "22", height: "20", rx: "4", class: "staff__fretbg" }, g);
      svg("text", { x: x, y: y5 + 5, class: "staff__fret" }, g).textContent = String(Number(fret) + 2);
      return g;
    });
    host.append(box);
    forms.push({
      el: sec,
      update(e) {
        box.style.setProperty("--e", e.toFixed(3));
      },
    });
    const steps = [...sec.querySelectorAll(".mo-pc__step")];
    const sync = () => {
      let on = steps.findIndex((st) => st.classList.contains("is-on"));
      if (on < 0) on = 0;
      notes.forEach((n, i) => n.classList.toggle("is-on", i === on));
    };
    steps.forEach((st) => new MutationObserver(sync).observe(st, { attributes: true, attributeFilter: ["class"] }));
    sync();
  }
}

// ------------------------------------------------------------------ 3. Festivais: a onda sonora vira o fundo (equalizador)
// Desenhado num <canvas> que cobre a seção inteira (camada de fundo). Na entrada, o ícone de onda da logo (barras
// verticais) gira 90° deitado e as barras se espalham pela base da seção; depois seguem o mouse como um visualizador.
{
  const sec = document.getElementById("festivais");
  if (sec) {
    const cv = document.createElement("canvas");
    cv.className = "eq";
    cv.setAttribute("aria-hidden", "true");
    sec.prepend(cv);
    const ctx = cv.getContext("2d");
    const N = 44;
    const base = Array.from({ length: N }, (_, i) => 0.18 + 0.5 * Math.exp(-Math.pow((i - N / 2) / (N / 5), 2)) + 0.1 * Math.sin(i * 1.7) ** 2);
    const cur = base.map(() => 0.05);
    const css = getComputedStyle(document.documentElement);
    const gold = css.getPropertyValue("--p-accent").trim() || "#c8952e";
    let mx = 0.5,
      inside = false,
      raf = 0,
      e = 0,
      W = 0,
      H = 0;
    const size = () => {
      const r = sec.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = r.width;
      H = r.height;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const paint = () => {
      ctx.clearRect(0, 0, W, H);
      const band = H * 0.46; // as barras ocupam a base da seção
      const spread = Math.min(1, e * 1.4); // 0: o ícone pequeno no centro; 1: a largura toda
      const turn = (1 - Math.min(1, e * 1.8)) * (-Math.PI / 2); // gira 90° até deitar
      const totalW = W * (0.12 + 0.88 * spread);
      const gap = totalW * 0.006;
      const bw = (totalW - gap * (N - 1)) / N;
      ctx.save();
      ctx.translate(W / 2, H);
      ctx.rotate(turn);
      const grad = ctx.createLinearGradient(0, 0, 0, -band);
      grad.addColorStop(0, gold + "8c");
      grad.addColorStop(1, "#9ccbd873");
      ctx.fillStyle = grad;
      for (let i = 0; i < N; i++) {
        const h = Math.max(2, cur[i] * band);
        const x = -totalW / 2 + i * (bw + gap);
        const r = Math.min(bw / 2, 8);
        ctx.beginPath();
        ctx.roundRect(x, -h, bw, h, [r, r, 0, 0]);
        ctx.fill();
      }
      ctx.restore();
    };
    const draw = () => {
      raf = 0;
      let moving = false;
      for (let i = 0; i < N; i++) {
        const peak = inside ? 0.55 * Math.exp(-Math.pow((i / (N - 1) - mx) / 0.1, 2)) : 0;
        const t = (base[i] * (0.4 + 0.6 * e) + peak) * e;
        const d = t - cur[i];
        if (Math.abs(d) > 0.002) moving = true;
        cur[i] += d * (reduced ? 1 : 0.18);
      }
      paint();
      if (moving && !reduced) raf = requestAnimationFrame(draw);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };
    sec.addEventListener("pointermove", (ev) => {
      const r = sec.getBoundingClientRect();
      mx = clamp((ev.clientX - r.left) / r.width);
      inside = true;
      kick();
    });
    sec.addEventListener("pointerleave", () => {
      inside = false;
      kick();
    });
    addEventListener("resize", () => {
      size();
      kick();
    });
    size();
    forms.push({
      el: sec,
      update(v) {
        e = v;
        if (!finePointer) {
          const r = sec.getBoundingClientRect();
          mx = clamp(1 - (r.top + r.height / 2) / innerHeight);
          inside = v > 0.6;
        }
        kick();
      },
    });
  }
}

// ------------------------------------------------------------------ 4. Professores: o disco de vinil vira o fundo da lista
{
  const sec = document.getElementById("professores");
  const col = sec?.querySelector(".wrap .span-6");
  if (col) {
    col.classList.add("has-vinyl");
    const wrap = document.createElement("div");
    wrap.className = "vinyl";
    wrap.setAttribute("aria-hidden", "true");
    const s = svg("svg", { viewBox: "-100 -100 200 200" }, wrap);
    const disc = svg("g", { class: "vinyl__disc" }, s);
    svg("circle", { r: "99", class: "vinyl__body" }, disc);
    for (let r = 40; r < 97; r += 3.2) svg("circle", { r: r.toFixed(1), class: "vinyl__groove" }, disc);
    svg("circle", { r: "30", class: "vinyl__label" }, disc);
    svg("path", { d: "M0 -16 C-6 -10 -15 0 -15 7 C-15 13 -8 15 0 15 C8 15 15 13 15 7 C15 0 6 -10 0 -16Z", class: "vinyl__pick", transform: "scale(.9)" }, disc);
    svg("circle", { r: "2.4", class: "vinyl__hole" }, disc);
    const needle = svg("g", { class: "vinyl__needle" }, s);
    svg("line", { x1: "92", y1: "-92", x2: "26", y2: "-8" }, needle);
    svg("circle", { cx: "92", cy: "-92", r: "5" }, needle);
    sec.prepend(wrap); // fica pendurado na borda entre Festivais e Professores
    let angle = 0,
      speed = 0,
      raf = 0,
      lastT = 0,
      hover = false;
    const spin = (t) => {
      raf = 0;
      const dt = Math.min(0.05, (t - (lastT || t)) / 1000);
      lastT = t;
      speed += ((hover ? 120 : 0) - speed) * (1 - Math.exp(-dt * 4));
      angle += speed * dt;
      disc.style.transform = `rotate(${(angle + scrollY * 0.12).toFixed(2)}deg)`;
      if (Math.abs(speed) > 0.5 || hover) raf = requestAnimationFrame(spin);
      else lastT = 0;
    };
    const kick = () => {
      if (!raf && !reduced) raf = requestAnimationFrame(spin);
    };
    sec.querySelectorAll(".rows li").forEach((row) => {
      const point = () => {
        hover = true;
        const r = row.getBoundingClientRect(),
          w = wrap.getBoundingClientRect();
        // ângulo da agulha: do pivô (canto de cima à direita do disco) até o meio da linha do professor
        const px = w.left + w.width * 0.96,
          py = w.top + w.height * 0.04;
        const a = Math.atan2(r.top + r.height / 2 - py, r.left + Math.min(r.width, 240) - px);
        const rest = Math.atan2(-8 + 92, 26 - 92);
        needle.style.transform = `rotate(${(((a - rest) * 180) / Math.PI).toFixed(1)}deg)`;
        needle.classList.add("is-on");
        kick();
      };
      row.addEventListener(finePointer ? "mouseenter" : "click", point);
      row.addEventListener("mouseleave", () => {
        hover = false;
        needle.classList.remove("is-on");
        needle.style.transform = "";
      });
    });
    forms.push({
      el: sec,
      update(e) {
        wrap.style.setProperty("--e", e.toFixed(3));
        if (!raf) disc.style.transform = `rotate(${(angle + scrollY * 0.12).toFixed(2)}deg)`;
      },
    });
  }
}

// ------------------------------------------------------------------ 5. Sede: o knob do amplificador emoldura o endereço
// Um knob de amp com a escala de 0 a 11: gira no próprio eixo até o 11 e fica atrás do endereço como um selo.
{
  const sec = document.getElementById("sede");
  const addr = sec?.querySelector(".type-moment");
  if (addr) {
    const box = document.createElement("div");
    box.className = "rosette knob";
    box.setAttribute("aria-hidden", "true");
    const s = svg("svg", { viewBox: "-100 -100 200 200" }, box);
    const scale = svg("g", { class: "knob__scale" }, s);
    // escala de 0 a 11 em 300°, de -150° a +150°
    for (let i = 0; i <= 11; i++) {
      const a = ((-150 + (300 * i) / 11) * Math.PI) / 180;
      svg("line", { x1: Math.sin(a) * 78, y1: -Math.cos(a) * 78, x2: Math.sin(a) * 90, y2: -Math.cos(a) * 90, class: i === 11 ? "knob__tick is-max" : "knob__tick" }, scale);
      const t = svg("text", { x: Math.sin(a) * 99, y: -Math.cos(a) * 99 + 4, class: i === 11 ? "knob__n is-max" : "knob__n" }, scale);
      t.textContent = String(i);
    }
    const dial = svg("g", { class: "knob__dial" }, s);
    svg("circle", { r: "62", class: "knob__body" }, dial);
    svg("circle", { r: "52", class: "knob__cap" }, dial);
    svg("line", { x1: "0", y1: "-20", x2: "0", y2: "-50", class: "knob__pointer" }, dial);
    const host = document.createElement("div");
    host.className = "rosette-host";
    addr.before(host);
    host.append(addr, box);
    addr.querySelector("a")?.addEventListener("click", () => {
      if (reduced) return;
      box.classList.remove("is-spinning");
      void box.offsetWidth;
      box.classList.add("is-spinning");
    });
    forms.push({
      el: sec,
      update(e) {
        box.style.setProperty("--e", e.toFixed(3));
      },
    });
  }
}

// ------------------------------------------------------------------ 6. Fechamento: a baqueta marca o tempo e deita como a linha do botão
// Bate no ar (como na contagem da banda) e, quando a seção chega, deita e vira a linha do botão grande. Passar o
// mouse no botão faz a contagem "1, 2, 3, 4" do baterista.
{
  const sec = document.getElementById("contact");
  const btn = sec?.querySelector(".closing__cta .btn--xl");
  if (btn) {
    const box = document.createElement("div");
    box.className = "metro";
    box.setAttribute("aria-hidden", "true");
    box.innerHTML = '<span class="metro__rod"><i class="metro__weight"></i></span><span class="metro__count"><b>1</b><b>2</b><b>3</b><b>4</b></span>';
    btn.before(box);
    const rod = box.querySelector(".metro__rod");
    const setLen = () => box.style.setProperty("--len", `${box.clientWidth - 8}px`);
    setLen();
    addEventListener("resize", setLen);
    let raf = 0,
      settled = reduced,
      visible = false;
    if (reduced) box.classList.add("is-settled");
    const swing = (t) => {
      raf = 0;
      if (settled || !visible) return;
      // batida seca: sobe devagar, desce rápido (como uma baqueta)
      const ph = ((t / 1000) * 1.6) % 1;
      const a = ph < 0.75 ? -34 * (ph / 0.75) : -34 * (1 - (ph - 0.75) / 0.25);
      rod.style.setProperty("--a", `${a.toFixed(2)}deg`);
      raf = requestAnimationFrame(swing);
    };
    forms.push({
      el: sec,
      update(e) {
        visible = e > 0.02;
        if (!settled && e >= 0.92) {
          settled = true;
          box.classList.add("is-settled");
          if (!reduced) setTimeout(() => btn.classList.add("is-hit"), 700);
        }
        if (!settled && visible && !raf) raf = requestAnimationFrame(swing);
      },
    });
    btn.addEventListener("mouseenter", () => {
      if (reduced) return;
      box.classList.remove("is-beating");
      void box.offsetWidth;
      box.classList.add("is-beating");
    });
  }
}

update();
