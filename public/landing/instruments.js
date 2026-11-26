// Carrossel de cursos: painéis coloridos lado a lado (um por instrumento). Clicar num painel o expande, o
// instrumento dá zoom-in para o centro e entram o título, o texto e a foto de alguém tocando. "Ver de perto"
// (ou clicar no instrumento do painel aberto) amplia a imagem num <dialog> que cresce a partir dela (FLIP),
// com anterior/próximo, teclado e zoom ao clicar. Sem JS os painéis aparecem todos abertos, em lista.
const deck = document.querySelector("[data-inst]");
if (deck) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const panels = [...deck.querySelectorAll(".inst__panel")];
  const dialog = document.querySelector(".zoom");
  const zImg = dialog?.querySelector(".zoom__img");
  const zStage = dialog?.querySelector(".zoom__stage");
  deck.classList.add("is-live");
  let open = -1;

  const set = (i, focus = false) => {
    open = i;
    deck.classList.toggle("has-open", i >= 0);
    panels.forEach((p, k) => {
      const on = k === i;
      p.classList.toggle("is-open", on);
      p.querySelector(".inst__hit").setAttribute("aria-expanded", String(on));
      p.querySelector(".inst__body").inert = !on;
    });
    if (i >= 0 && focus) panels[i].querySelector(".inst__title")?.focus?.();
    // no celular o painel aberto vira o topo da tela
    if (i >= 0 && matchMedia("(max-width: 899px)").matches) {
      setTimeout(() => panels[i].scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" }), 380);
    }
  };
  panels.forEach((p, k) => {
    p.querySelector(".inst__title")?.setAttribute("tabindex", "-1");
    p.querySelector(".inst__hit").addEventListener("click", () => set(open === k ? -1 : k, true));
    p.querySelector(".inst__close").addEventListener("click", () => {
      set(-1);
      p.querySelector(".inst__hit").focus();
    });
    p.querySelector(".inst__zoom")?.addEventListener("click", () => zoom(k));
    p.querySelector(".inst__img")?.addEventListener("click", () => {
      if (p.classList.contains("is-open")) zoom(k);
    });
  });
  set(-1);

  // setas do teclado navegam entre os painéis; Esc fecha
  deck.addEventListener("keydown", (e) => {
    const k = panels.findIndex((p) => p.contains(document.activeElement));
    if (k < 0) return;
    if (e.key === "Escape" && open >= 0) {
      const was = open;
      set(-1);
      panels[was].querySelector(".inst__hit").focus();
    }
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    if (e.target.closest(".inst__body")) return;
    e.preventDefault();
    const n = (k + (e.key === "ArrowRight" ? 1 : -1) + panels.length) % panels.length;
    panels[n].querySelector(".inst__hit").focus();
    if (open >= 0) set(n);
  });

  // swipe no painel aberto troca de instrumento
  let sx = 0,
    sy = 0;
  deck.addEventListener("touchstart", (e) => ((sx = e.touches[0].clientX), (sy = e.touches[0].clientY)), { passive: true });
  deck.addEventListener(
    "touchend",
    (e) => {
      if (open < 0) return;
      const dx = e.changedTouches[0].clientX - sx,
        dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) set((open + (dx < 0 ? 1 : -1) + panels.length) % panels.length);
    },
    { passive: true },
  );

  // ------------------------------------------------------------ ampliação
  let cur = -1,
    from = null;
  const fill = (k) => {
    const p = panels[k];
    const src = p.querySelector(".inst__img");
    cur = k;
    dialog.style.setProperty("--c", p.style.getPropertyValue("--c"));
    dialog.style.setProperty("--ci", p.style.getPropertyValue("--ci"));
    dialog.classList.toggle("is-wide", p.classList.contains("is-wide"));
    zImg.src = src.currentSrc || src.src;
    zImg.alt = src.alt;
    dialog.querySelector(".zoom__num").textContent = p.querySelector(".inst__num").textContent;
    dialog.querySelector(".zoom__name").textContent = p.querySelector(".inst__title").textContent;
    unzoom();
  };
  const flip = (fromEl, back = false) => {
    if (reduced || !fromEl) return Promise.resolve();
    const a = fromEl.getBoundingClientRect(),
      b = zImg.getBoundingClientRect();
    if (!a.width || !b.width) return Promise.resolve();
    const t = `translate(${a.left + a.width / 2 - (b.left + b.width / 2)}px, ${a.top + a.height / 2 - (b.top + b.height / 2)}px) scale(${a.height / b.height})`;
    const frames = [{ transform: t, opacity: 0.6 }, { transform: "none", opacity: 1 }];
    return zImg.animate(back ? frames.reverse() : frames, { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)", fill: back ? "forwards" : "none" }).finished;
  };
  const zoom = (k) => {
    if (!dialog) return;
    from = panels[k].querySelector(".inst__img");
    fill(k);
    dialog.showModal();
    dialog.classList.remove("is-out");
    const go = () => flip(from);
    if (zImg.complete) go();
    else zImg.addEventListener("load", go, { once: true });
  };
  const close = async () => {
    if (!dialog?.open) return;
    dialog.classList.add("is-out");
    const back = panels[cur]?.querySelector(".inst__img");
    if (open !== cur) set(cur);
    try {
      await flip(back, true);
    } catch {}
    zImg.getAnimations().forEach((a) => a.cancel());
    dialog.close();
    dialog.classList.remove("is-out");
    panels[cur]?.querySelector(".inst__zoom")?.focus();
  };
  const step = (d) => {
    const n = (cur + d + panels.length) % panels.length;
    if (!panels[n].querySelector(".inst__img")) return;
    fill(n);
    if (!reduced) zImg.animate([{ transform: `translateX(${d * 60}px) scale(.92)`, opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 380, easing: "cubic-bezier(.2,.8,.2,1)" });
  };
  // clicar na imagem aproxima (2,2x) no ponto clicado; mover o mouse percorre a imagem; clicar de novo afasta
  let zoomed = false;
  const unzoom = () => {
    zoomed = false;
    zStage?.classList.remove("is-zoomed");
    zImg?.style.removeProperty("transform-origin");
  };
  const origin = (e) => {
    const r = zImg.getBoundingClientRect();
    zImg.style.transformOrigin = `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}% ${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`;
  };
  if (dialog) {
    zImg.addEventListener("click", (e) => {
      e.stopPropagation();
      if (zoomed) return unzoom();
      zoomed = true;
      origin(e);
      zStage.classList.add("is-zoomed");
    });
    zImg.addEventListener("pointermove", (e) => zoomed && e.pointerType === "mouse" && origin(e));
    dialog.querySelector(".zoom__x").addEventListener("click", close);
    dialog.querySelector(".zoom__prev").addEventListener("click", () => step(-1));
    dialog.querySelector(".zoom__next").addEventListener("click", () => step(1));
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      close();
    });
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog || e.target === zStage) close();
    });
    dialog.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    });
  }
}
