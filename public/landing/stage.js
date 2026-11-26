// Palco da landing: a foto da sala de ensaio com parallax (rolagem e mouse), a poeira nos feixes de luz, o cabo de
// guitarra que liga as seções (desenhado com a rolagem até plugar no botão final), a revelação dos títulos e
// fotos ao entrar na tela e a inclinação 3D das fotos no hover. Sem dependências; pausa fora da tela.
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
const root = document.documentElement;
root.classList.add("st-js");
if (reduced) root.classList.add("st-still");

// ------------------------------------------------------------------ hero: parallax e poeira
const hero = document.querySelector(".hero--stage");
const photo = hero?.querySelector(".stage__photo");
const dust = hero?.querySelector(".stage__dust");
let heroVisible = true;
if (hero) {
  new IntersectionObserver(([e]) => {
    heroVisible = e.isIntersecting;
    if (heroVisible) kickDust();
  }).observe(hero);
  let mx = 0,
    my = 0;
  const parallax = () => {
    if (reduced || !heroVisible) return;
    const y = Math.min(scrollY, innerHeight);
    hero.style.setProperty("--py", `${(y * 0.28).toFixed(1)}px`);
    hero.style.setProperty("--mx", mx.toFixed(3));
    hero.style.setProperty("--my", my.toFixed(3));
    hero.style.setProperty("--fade", (1 - Math.min(1, y / innerHeight) * 0.6).toFixed(3));
  };
  addEventListener("scroll", () => requestAnimationFrame(parallax), { passive: true });
  if (fine)
    hero.addEventListener("pointermove", (e) => {
      mx = e.clientX / innerWidth - 0.5;
      my = e.clientY / innerHeight - 0.5;
      requestAnimationFrame(parallax);
    });
  photo?.decode?.().then(() => hero.classList.add("is-lit"), () => hero.classList.add("is-lit"));
  if (photo?.complete) hero.classList.add("is-lit");
}

let dustRaf = 0;
const kickDust = () => {
  if (!dustRaf && !reduced && dust) dustRaf = requestAnimationFrame(drawDust);
};
let W = 0,
  H = 0,
  motes = [];
const ctx = dust?.getContext("2d");
const sizeDust = () => {
  if (!dust) return;
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  W = dust.clientWidth;
  H = dust.clientHeight;
  dust.width = Math.round(W * dpr);
  dust.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const n = W < 700 ? 30 : 64;
  motes = Array.from({ length: n }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: 0.6 + Math.random() * 1.8,
    vx: (Math.random() - 0.5) * 0.12,
    vy: -0.05 - Math.random() * 0.18,
    a: 0.15 + Math.random() * 0.5,
    t: Math.random() * 6.28,
  }));
};
function drawDust(t) {
  dustRaf = 0;
  if (!heroVisible || document.hidden) return;
  ctx.clearRect(0, 0, W, H);
  for (const m of motes) {
    m.x += m.vx + Math.sin(t / 1400 + m.t) * 0.08;
    m.y += m.vy;
    if (m.y < -4) {
      m.y = H + 4;
      m.x = Math.random() * W;
    }
    if (m.x < -4) m.x = W + 4;
    if (m.x > W + 4) m.x = -4;
    const tw = 0.6 + 0.4 * Math.sin(t / 700 + m.t * 3);
    ctx.fillStyle = `rgba(255, 214, 150, ${(m.a * tw).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, 6.283);
    ctx.fill();
  }
  dustRaf = requestAnimationFrame(drawDust);
}
if (dust && !reduced) {
  sizeDust();
  kickDust();
  addEventListener("resize", sizeDust);
  document.addEventListener("visibilitychange", kickDust);
}

// ------------------------------------------------------------------ revelação ao rolar
const reveal = [
  ...document.querySelectorAll("main > .section h2, .footer.closing h2, .split-photo, .taped, .inst__panel, .ensaio, .equipe__card, .bandas__chips li"),
];
reveal.forEach((el, i) => {
  el.classList.add("rv");
  if (el.matches(".inst__panel, .equipe__card, .bandas__chips li")) el.style.setProperty("--rv-d", `${(i % 8) * 70}ms`);
});
if (!reduced && "IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      }),
    { rootMargin: "0px 0px -12% 0px" },
  );
  reveal.forEach((el) => io.observe(el));
} else reveal.forEach((el) => el.classList.add("is-in"));

// ------------------------------------------------------------------ fotos inclinam no hover
if (fine && !reduced)
  document.querySelectorAll(".tilt, .develop").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--rx", `${(((e.clientY - r.top) / r.height - 0.5) * -6).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${(((e.clientX - r.left) / r.width - 0.5) * 8).toFixed(2)}deg`);
    });
    el.addEventListener("pointerleave", () => {
      el.style.removeProperty("--rx");
      el.style.removeProperty("--ry");
    });
  });

// ------------------------------------------------------------------ o cabo de guitarra que liga as seções
// Um path só, no documento inteiro: sai do amplificador do hero, desce pelas margens trocando de lado em cada
// borda rasgada e termina plugado no botão grande do fechamento. Desenha conforme a rolagem.
const target = document.querySelector(".footer.closing .btn--xl");
const amp = hero?.querySelector(".stage__amp");
if (target && amp) {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "cable");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = '<path class="cable__glow"/><path class="cable__line"/><g class="cable__jack"><rect x="-5" y="-30" width="10" height="22" rx="3"/><rect x="-2.5" y="-10" width="5" height="12" rx="1.5" class="cable__tip"/></g>';
  document.body.append(svg);
  const glow = svg.querySelector(".cable__glow"),
    line = svg.querySelector(".cable__line"),
    jack = svg.querySelector(".cable__jack");
  let len = 0,
    table = [],
    endY = 0,
    plugged = false;
  const abs = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height };
  };
  const build = () => {
    const ft = abs(target);
    const docH = Math.ceil(ft.y + ft.h + 40); // só até o botão final: o svg não aumenta a página
    const vw = document.documentElement.clientWidth;
    svg.setAttribute("width", vw);
    svg.setAttribute("height", docH);
    svg.setAttribute("viewBox", `0 0 ${vw} ${docH}`);
    const wrap = document.querySelector("main .wrap");
    const wr = wrap ? abs(wrap) : { x: 24, w: vw - 48 };
    // nas margens laterais, fora do texto; no celular encosta na borda
    const gutter = Math.max(10, Math.min(wr.x * 0.5, 70));
    const L = gutter,
      R = vw - gutter;
    const a = abs(amp);
    const t = abs(target);
    // o plugue entra pela lateral do botão, do lado em que o cabo chega
    let tx = t.x - 1,
      ty = t.y + t.h / 2;
    // a divisa de cada seção com borda rasgada: ali nunca há texto (o conteúdo fica a um respiro de distância)
    const cuts = [...document.querySelectorAll(".torn")].map((s) => abs(s).y);
    let x = a.x + a.w / 2,
      y = a.y + a.h;
    let d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
    let side = x > vw / 2 ? R : L;
    let jackRot = 0;
    // primeiro desce até a margem do lado do amplificador
    const firstY = cuts[0] ?? ty;
    d += ` C${x} ${y + 120} ${side} ${firstY - 220} ${side} ${firstY - 50}`;
    x = side;
    y = firstY - 50;
    cuts.forEach((cy, i) => {
      const next = side === R ? L : R;
      const last = i === cuts.length - 1;
      if (last) {
        // a última volta: desce pela margem até a altura do botão e entra pela lateral dele
        if (side === R) tx = t.x + t.w + 1;
        const dir = side === R ? -1 : 1;
        d += ` L${side} ${ty - 90} C${side} ${ty - 20} ${side + dir * 10} ${ty} ${tx} ${ty}`;
        jackRot = side === R ? 90 : -90;
      } else {
        // atravessa a página rente à borda rasgada (uma faixa de ±50px em volta da divisa, onde não há texto)
        d += ` L${side} ${cy - 50} C${side} ${cy + 4} ${next} ${cy - 4} ${next} ${cy + 50}`;
        side = next;
      }
    });
    if (!cuts.length) d += ` L${tx} ${ty}`;
    glow.setAttribute("d", d);
    line.setAttribute("d", d);
    len = line.getTotalLength();
    [glow, line].forEach((p) => {
      p.style.strokeDasharray = `${len} ${len}`;
    });
    // tabela comprimento → y para desenhar até a altura da tela
    table = [];
    for (let s = 0; s <= len; s += Math.max(8, len / 900)) table.push([s, line.getPointAtLength(s).y]);
    table.push([len, ty]);
    endY = ty;
    jack.setAttribute("transform", `translate(${tx.toFixed(1)} ${ty.toFixed(1)}) rotate(${jackRot})`);
    draw();
  };
  let lastT = "";
  const draw = () => {
    // o botão final muda de lugar quando a baqueta deita: refaz o cabo se ele mexeu
    const tr = target.getBoundingClientRect();
    const key = `${Math.round(tr.left + scrollX)},${Math.round(tr.top + scrollY)}`;
    if (lastT && key !== lastT) {
      lastT = key;
      return build();
    }
    lastT = key;
    const front = scrollY + innerHeight * 0.72;
    let drawn = len;
    if (!reduced) {
      // o maior comprimento cujo ponto ainda está acima da frente da rolagem
      drawn = 0;
      for (const [s, y] of table) if (y <= front) drawn = s;
    }
    const off = Math.max(0, len - drawn);
    glow.style.strokeDashoffset = off;
    line.style.strokeDashoffset = off;
    const done = off < 2 && front >= endY;
    jack.classList.toggle("is-on", done);
    if (done !== plugged) {
      plugged = done;
      target.classList.toggle("is-plugged", done);
    }
  };
  let raf = 0;
  addEventListener("scroll", () => (raf ||= requestAnimationFrame(() => ((raf = 0), draw()))), { passive: true });
  let rt = 0;
  const rebuild = () => {
    clearTimeout(rt);
    rt = setTimeout(build, 120);
  };
  addEventListener("resize", rebuild);
  new ResizeObserver(rebuild).observe(document.body);
  document.addEventListener("transitionend", (e) => e.target.closest?.(".metro, .inst__deck") && rebuild());
  addEventListener("load", build);
  build();
}
