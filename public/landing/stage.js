// Palco da landing: a foto da sala de ensaio com parallax (rolagem e mouse), a poeira nos feixes de luz, o cabo de
// guitarra que liga as seções (desenhado com a rolagem até plugar no botão final), a revelação dos títulos e
// fotos ao entrar na tela e a inclinação 3D das fotos no hover. Sem dependências.
//
// Desempenho: só se anima transform e opacity (a GPU compõe sem repintar); nada roda fora da tela ou com a aba
// oculta; leituras de layout nunca vêm depois de escritas no mesmo quadro. Em aparelhos modestos (pouca memória,
// poucos núcleos, economia de dados) ou se a poeira não segurar ~45 fps, entra o modo leve (classe "st-lite"):
// sem poeira, sem zoom contínuo da foto e com um feixe de luz só.
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
const root = document.documentElement;
const nav = navigator;
let lite =
  (nav.deviceMemory ?? 8) <= 4 || (nav.hardwareConcurrency ?? 8) <= 4 || !!nav.connection?.saveData;
root.classList.add("st-js");
if (reduced) root.classList.add("st-still");
if (lite) root.classList.add("st-lite");

// pausa as animações em CSS de um bloco enquanto ele está fora da tela
const pauseOffscreen = (el, onChange) => {
  if (!el) return;
  new IntersectionObserver(([e]) => {
    el.classList.toggle("is-off", !e.isIntersecting);
    onChange?.(e.isIntersecting);
  }).observe(el);
};

// ------------------------------------------------------------------ hero: parallax e poeira
const hero = document.querySelector(".hero--stage");
const stage = hero?.querySelector(".stage");
const photo = hero?.querySelector(".stage__photo");
const dust = hero?.querySelector(".stage__dust");
let heroVisible = true;
if (hero) {
  pauseOffscreen(hero, (v) => {
    heroVisible = v;
    if (v) kickDust();
  });
  // o mouse só define o alvo; a foto chega nele suavemente (sem trancos), e o loop para quando assenta
  let tx = 0,
    ty = 0,
    cx = 0,
    cy = 0,
    raf = 0;
  const frame = () => {
    raf = 0;
    if (!heroVisible || !photo) return;
    cx += (tx - cx) * 0.08;
    cy += (ty - cy) * 0.08;
    const y = Math.min(scrollY, innerHeight);
    // escreve direto na foto: variáveis no hero recalculariam o estilo de todo o texto a cada quadro
    photo.style.translate = `${(cx * -22).toFixed(2)}px ${(y * 0.28 + cy * -14).toFixed(2)}px`;
    // o esmaecer da rolagem fica no palco (sem transição); a foto guarda a transição só para acender
    if (stage) stage.style.opacity = (1 - Math.min(1, y / innerHeight) * 0.6).toFixed(3);
    if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) raf = requestAnimationFrame(frame);
  };
  const kick = () => {
    if (!raf && !reduced) raf = requestAnimationFrame(frame);
  };
  addEventListener("scroll", kick, { passive: true });
  if (fine && !lite)
    hero.addEventListener("pointermove", (e) => {
      tx = e.clientX / innerWidth - 0.5;
      ty = e.clientY / innerHeight - 0.5;
      kick();
    });
  const lit = () => {
    hero.classList.add("is-lit");
    kick();
  };
  if (photo?.complete) lit();
  else photo?.decode?.().then(lit, lit);
}
pauseOffscreen(document.querySelector(".marquee"));

// poeira: ~40 grãos desenhados a partir de um único sprite pronto (drawImage é bem mais barato que arc + fill)
let dustRaf = 0;
const kickDust = () => {
  if (!dustRaf && !reduced && !lite && dust) dustRaf = requestAnimationFrame(drawDust);
};
let W = 0,
  H = 0,
  motes = [];
const ctx = dust?.getContext("2d", { alpha: true });
const sprite = document.createElement("canvas");
{
  sprite.width = sprite.height = 16;
  const s = sprite.getContext("2d");
  const g = s.createRadialGradient(8, 8, 0, 8, 8, 8);
  g.addColorStop(0, "rgba(255,224,170,1)");
  g.addColorStop(0.45, "rgba(255,214,150,.55)");
  g.addColorStop(1, "rgba(255,214,150,0)");
  s.fillStyle = g;
  s.fillRect(0, 0, 16, 16);
}
const sizeDust = () => {
  if (!dust) return;
  // densidade 1: os grãos são borrados de propósito; poupa 2 a 4x de memória em telas retina
  W = dust.clientWidth;
  H = dust.clientHeight;
  dust.width = W;
  dust.height = H;
  const n = W < 700 ? 22 : 40;
  motes = Array.from({ length: n }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    s: 3 + Math.random() * 5,
    vx: (Math.random() - 0.5) * 0.12,
    vy: -0.05 - Math.random() * 0.18,
    a: 0.2 + Math.random() * 0.55,
    t: Math.random() * 6.28,
  }));
};
// vigia o ritmo: se a média passar de ~22 ms por quadro, o aparelho não aguenta e a poeira sai
let last = 0,
  slow = 0,
  frames = 0;
function drawDust(t) {
  dustRaf = 0;
  if (!heroVisible || document.hidden || lite) return;
  const dt = last ? Math.min(100, t - last) : 16.7;
  last = t;
  if (++frames > 20) slow = slow * 0.95 + (dt > 22 ? 1 : 0) * 0.05;
  if (frames > 90 && slow > 0.5) {
    lite = true;
    root.classList.add("st-lite");
    ctx.clearRect(0, 0, W, H);
    return;
  }
  const k = dt / 16.7; // velocidade igual a 30, 60 ou 120 Hz
  ctx.clearRect(0, 0, W, H);
  for (const m of motes) {
    m.x += (m.vx + Math.sin(t / 1400 + m.t) * 0.08) * k;
    m.y += m.vy * k;
    if (m.y < -8) {
      m.y = H + 8;
      m.x = Math.random() * W;
    }
    if (m.x < -8) m.x = W + 8;
    else if (m.x > W + 8) m.x = -8;
    ctx.globalAlpha = m.a * (0.6 + 0.4 * Math.sin(t / 700 + m.t * 3));
    ctx.drawImage(sprite, m.x - m.s / 2, m.y - m.s / 2, m.s, m.s);
  }
  dustRaf = requestAnimationFrame(drawDust);
}
if (dust && !reduced && !lite) {
  sizeDust();
  kickDust();
  let rs = 0;
  addEventListener("resize", () => {
    clearTimeout(rs);
    rs = setTimeout(sizeDust, 150);
  });
  document.addEventListener("visibilitychange", () => {
    last = 0;
    kickDust();
  });
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

// ------------------------------------------------------------------ fotos inclinam no hover (um cálculo por quadro)
if (fine && !reduced && !lite)
  document.querySelectorAll(".tilt, .develop").forEach((el) => {
    let raf = 0,
      ev = null;
    el.addEventListener("pointermove", (e) => {
      ev = e;
      raf ||= requestAnimationFrame(() => {
        raf = 0;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--rx", `${(((ev.clientY - r.top) / r.height - 0.5) * -6).toFixed(2)}deg`);
        el.style.setProperty("--ry", `${(((ev.clientX - r.left) / r.width - 0.5) * 8).toFixed(2)}deg`);
      });
    });
    el.addEventListener("pointerleave", () => {
      cancelAnimationFrame(raf);
      raf = 0;
      el.style.removeProperty("--rx");
      el.style.removeProperty("--ry");
    });
  });

// ------------------------------------------------------------------ o cabo de guitarra que liga as seções
// Um path só, no documento inteiro: sai do amplificador do hero, atravessa o pé do palco (abaixo dos botões,
// como um cabo no chão da sala), passa por baixo do letreiro, desce pelas margens trocando de lado em cada
// borda rasgada e termina plugado no botão grande do fechamento. Desenha conforme a rolagem, com uma leve
// inércia para o traço correr liso em vez de pular.
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
    shown = -1,
    goal = 0,
    plugged = false;
  const abs = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height };
  };
  // tabela [comprimento, maior y até ali]: o "maior y até ali" nunca diminui, então dá para buscar por bisseção
  let ss = [],
    ys = [];
  const path = (x0, y0) => {
    let d = `M${x0.toFixed(1)} ${y0.toFixed(1)}`,
      px = x0,
      py = y0,
      acc = 0,
      top = y0;
    ss = [0];
    ys = [y0];
    const add = (x, y) => {
      acc += Math.hypot(x - px, y - py);
      top = Math.max(top, y);
      px = x;
      py = y;
      ss.push(acc);
      ys.push(top);
    };
    return {
      L(x, y) {
        d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
        add(x, y);
      },
      C(ax, ay, bx, by, x, y) {
        d += ` C${ax.toFixed(1)} ${ay.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
        const x0 = px,
          y0 = py;
        for (let i = 1; i <= 20; i++) {
          const t = i / 20,
            u = 1 - t;
          const k0 = u * u * u,
            k1 = 3 * u * u * t,
            k2 = 3 * u * t * t,
            k3 = t * t * t;
          add(k0 * x0 + k1 * ax + k2 * bx + k3 * x, k0 * y0 + k1 * ay + k2 * by + k3 * y);
        }
      },
      get d() {
        return d;
      },
      get y() {
        return py;
      },
    };
  };
  const build = () => {
    const t = abs(target);
    const docH = Math.ceil(t.y + t.h + 40); // só até o botão final: o svg não aumenta a página
    const vw = root.clientWidth;
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
    let tx = t.x - 1,
      ty = t.y + t.h / 2;
    const mq = document.querySelector(".marquee");
    const m = mq ? abs(mq) : null;
    const text = hero.querySelector(".hero__text");
    const tb = text ? abs(text) : null;
    // as divisas com borda rasgada: ali nunca há texto. A que fica debaixo do letreiro não serve para
    // atravessar (o cabo cruzaria os nomes dos instrumentos): ali ele só passa reto, por baixo da faixa.
    const underMarquee = (cy) => m && cy > m.y - 90 && cy < m.y + m.h + 90;
    const cuts = [...document.querySelectorAll(".torn")].map((s) => abs(s).y);
    let x = a.x + a.w / 2,
      y = a.y + a.h;
    const P = path(x, y);
    let side = x > vw / 2 ? R : L;
    // a travessia no pé do palco: entre o fim do texto e o topo do letreiro, se houver folga
    const floorTop = Math.max(y + 34, tb ? tb.y + tb.h + 28 : 0);
    const floorBottom = m ? m.y - 18 : (cuts[0] ?? ty) - 80;
    const other = side === R ? L : R;
    if (floorBottom - floorTop >= 8 && Math.abs(x - other) > 160) {
      const yc = (floorTop + floorBottom) / 2;
      const dir = other < x ? -1 : 1;
      const x1 = x + dir * 110,
        x2 = other - dir * 110;
      const sag = 14;
      P.C(x, y + (yc - y) * 0.9, x + dir * 40, yc, x1, yc);
      P.C(x1 + (x2 - x1) / 3, yc + sag, x2 - (x2 - x1) / 3, yc + sag, x2, yc);
      P.C(other, yc, other, yc, other, yc + 90);
      side = other;
      y = yc + 90;
    } else {
      // sem folga (telas baixas): desce até a margem do lado do amplificador
      const firstY = cuts[0] ?? ty;
      P.C(x, y + 120, side, firstY - 220, side, firstY - 50);
      y = firstY - 50;
    }
    let jackRot = 0;
    cuts.forEach((cy, i) => {
      const next = side === R ? L : R;
      if (i === cuts.length - 1) {
        // a última volta: desce pela margem até a altura do botão e entra pela lateral dele
        if (side === R) tx = t.x + t.w + 1;
        const dir = side === R ? -1 : 1;
        P.L(side, ty - 90);
        P.C(side, ty - 20, side + dir * 10, ty, tx, ty);
        jackRot = side === R ? 90 : -90;
      } else if (underMarquee(cy) || cy + 50 <= y) {
        P.L(side, Math.max(y, cy + 50));
      } else {
        // atravessa a página rente à borda rasgada (uma faixa de ±50px em volta da divisa, onde não há texto)
        P.L(side, cy - 50);
        P.C(side, cy + 4, next, cy - 4, next, cy + 50);
        side = next;
      }
    });
    if (!cuts.length) P.L(tx, ty);
    glow.setAttribute("d", P.d);
    line.setAttribute("d", P.d);
    len = line.getTotalLength();
    // a tabela mede um pouco diferente do navegador: escala para o comprimento real do traço
    const k = len / (ss[ss.length - 1] || 1);
    ss = ss.map((v) => v * k);
    glow.style.strokeDasharray = line.style.strokeDasharray = `${len} ${len}`;
    jack.setAttribute("transform", `translate(${tx.toFixed(1)} ${ty.toFixed(1)}) rotate(${jackRot})`);
    shown = -1;
    lastOff = ""; // traço novo: escreve o deslocamento de novo
    aim();
  };
  // o maior comprimento cujo trecho inteiro ainda está acima da frente da rolagem (bisseção na tabela)
  const reach = (front) => {
    if (ys[ys.length - 1] <= front) return len;
    let lo = 0,
      hi = ys.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (ys[mid] <= front) lo = mid;
      else hi = mid;
    }
    // interpola dentro do último trecho para o traço avançar sem degraus
    const f = ys[hi] > ys[lo] ? Math.min(1, Math.max(0, (front - ys[lo]) / (ys[hi] - ys[lo]))) : 0;
    return ss[lo] + (ss[hi] - ss[lo]) * f;
  };
  // um cálculo por quadro (a rolagem dispara vários eventos por quadro), e só escreve se o traço mudou
  let raf = 0,
    lastOff = "";
  const paint = () => {
    raf = 0;
    goal = reduced ? len : reach(scrollY + innerHeight * 0.72);
    shown = shown < 0 || reduced ? goal : shown + (goal - shown) * 0.2;
    if (Math.abs(goal - shown) < 0.8) shown = goal;
    const off = Math.max(0, len - shown).toFixed(1);
    if (off !== lastOff) {
      lastOff = off;
      glow.style.strokeDashoffset = line.style.strokeDashoffset = off;
    }
    const done = shown >= len - 2;
    if (done !== plugged) {
      plugged = done;
      jack.classList.toggle("is-on", done);
      target.classList.toggle("is-plugged", done);
    }
    if (shown !== goal) raf = requestAnimationFrame(paint);
  };
  const aim = () => {
    raf ||= requestAnimationFrame(paint);
  };
  let rt = 0;
  const rebuild = () => {
    clearTimeout(rt);
    rt = setTimeout(build, 140);
  };
  // a rolagem não lê layout nenhum: se o botão final muda de lugar (a baqueta deita), o ResizeObserver
  // e o transitionend da .metro refazem o cabo
  addEventListener("scroll", aim, { passive: true });
  addEventListener("resize", rebuild);
  new ResizeObserver(rebuild).observe(document.body);
  document.addEventListener("transitionend", (e) => e.target.closest?.(".metro, .inst__deck") && rebuild());
  addEventListener("load", build);
  build();
}
