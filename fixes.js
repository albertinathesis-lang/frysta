// clone/fixes.js — re-drives frysta's JS-driven dynamics with values MEASURED on the live page.
// Vanilla, one guarded block per behavior. Nothing here is eyeballed: every number below was
// read off https://frysta.framer.website/ in the kit's headless Chrome (1728×982 @2x) on
// 2026-09-29 — see targets/frysta/tools-local/ (sample-live2.js → cycler-timeline.json,
// sample-exit.js → cycler-animations.json) and NOTES.md.
(function () {
  "use strict";

  // ── 1. Hero phrase cycler (.framer-bjwa4n-container) ─────────────────────────────────
  // Live: a Framer code component rotates five phrases under "Frysta is a design studio that".
  //   order, looping:         see PHRASES (phrase 0 is server-rendered, fully visible)
  //   switch schedule:        first switch 2046–2340 ms after navigation start (mean 2151; = hydration
  //                           + 1725 ms), then every 3750 ms (19 measured switches, +3740…+3764 ms apart)
  //   enter, per letter:      2 WAAPI animations — opacity 0→1, filter blur(10.4px)→blur(0px);
  //                           duration 1375 ms, easing ease-out, fill both,
  //                           delay 687.5 + 916.67·i/(n−1) ms  (i = letter index, n = letters)
  //   exit, per letter:       opacity 1→0, filter blur(0px)→blur(0.173333px); 1375 ms, ease-out,
  //                           delay 0; wrapper z-index 1→0; layer unmounted when the exit ends
  //   markup, per phrase:     absolute layer > flex-wrap row > one inline-flex group per word
  //                           (a space is its own group) > inline-block wrapper > <p> per letter
  try { heroCycler(); } catch (e) { console.error("fixes.js heroCycler:", e); }
  try { navHideOnScroll(); } catch (e) { console.error("fixes.js navHideOnScroll:", e); }
  try { worksBelt(); } catch (e) { console.error("fixes.js worksBelt:", e); }
  try { quoteBlobs(); } catch (e) { console.error("fixes.js quoteBlobs:", e); }
  try { smoothScroll(); } catch (e) { console.error("fixes.js smoothScroll:", e); }
  try { buyTemplateAppear(); } catch (e) { console.error("fixes.js buyTemplateAppear:", e); }
  try { hoverStates(); } catch (e) { console.error("fixes.js hoverStates:", e); }
  try { navMenu(); } catch (e) { console.error("fixes.js navMenu:", e); }

  // ── 8. Navigation menu (hamburger .framer-z4rgc → full-screen menu) ─────────────────────
  // Captured on live with a real CDP click (tools-local/menu-probe.js → clone/menu-capture.json: the backdrop
  // `.framer-tksc6t`, the panel `.framer-1dxuw6v` and the nav in its "Desktop Open" state). Site config
  // (script_main module): backdrop animate {opacity 1, duration 0}, exit {opacity 0, duration 0}, tap hides;
  // panel groups initial {opacity 0, y −30} → animate {opacity 1, y 0} tween 0.4 s ease [.5,0,.88,.77] (K),
  // exit duration 0 (G). Measured: groups reach opacity 1 at ~470 ms; close unmounts within one frame; the
  // hamburger bars switch to the `open` variant (module Ui18__8rg, tween 0.5 s ease [.44,0,.56,1]) and back;
  // `html` gets Lenis' `lenis-stopped` while open. The clock shows the current Los Angeles time.
  function navMenu() {
    const nav = document.querySelector(".framer-uiuq7q-container"), toggle = nav && nav.querySelector(".framer-z4rgc");
    if (!toggle) return;
    const EASE_K = "cubic-bezier(0.5, 0, 0.88, 0.77)", EASE_B = "cubic-bezier(0.44, 0, 0.56, 1)";
    const navRoot = nav.querySelector(".framer-HU0cD");
    const toggleVariant = hoverVariant(toggle, { from: ["framer-v-1673xgn"], to: ["framer-v-muaiak"], duration: 500, easing: EASE_B, bind: false });
    let data = null, open = false, bg = null, panel = null, clock = 0;
    fetch("menu-capture.json").then((r) => r.json()).then((j) => { data = j; }).catch((e) => console.error("menu-capture.json:", e));
    const laTime = () => new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Los_Angeles" }).format(new Date());
    function show() {
      if (!data || open) return; open = true;
      const host = nav.parentElement || document.body;
      const tpl = document.createElement("template"); tpl.innerHTML = data.bg + data.panel;
      bg = tpl.content.firstElementChild; panel = tpl.content.lastElementChild;
      host.appendChild(bg); host.appendChild(panel);
      const p = panel.querySelector(".framer-gu2we4-container p"); if (p) { p.textContent = laTime(); clock = setInterval(() => { p.textContent = laTime(); }, 1000); }
      for (const g of panel.querySelectorAll('[data-framer-name="Menu_SocialLinks"], [data-framer-name="Menu_NavLinks"], [data-framer-name="Menu_LocationTime"], [data-framer-name="Contact_Email"], [data-framer-name="Menu_CreditsWrapper"]')) {
        const a = g.animate([{ opacity: 0, transform: "translateY(-30px)" }, { opacity: 1, transform: "none" }], { duration: 400, easing: EASE_K, fill: "both" });
        a.finished.then(() => a.cancel(), () => {});
      }
      toggle.setAttribute("data-framer-name", "open"); toggleVariant(true);
      if (navRoot) { navRoot.classList.replace("framer-v-1mkwj8y", "framer-v-simons"); navRoot.setAttribute("data-framer-name", "Desktop Open"); }
      if (window.__lenis) window.__lenis.stop(); else document.documentElement.classList.add("lenis-stopped");
      bg.addEventListener("click", hide);
    }
    function hide() {
      if (!open) return; open = false;
      clearInterval(clock);
      if (bg) bg.remove(); if (panel) panel.remove(); bg = panel = null;
      toggle.setAttribute("data-framer-name", "closed"); toggleVariant(false);
      if (navRoot) { navRoot.classList.replace("framer-v-simons", "framer-v-1mkwj8y"); navRoot.setAttribute("data-framer-name", "Desktop Close"); }
      if (window.__lenis) window.__lenis.start(); else document.documentElement.classList.remove("lenis-stopped");
    }
    toggle.addEventListener("click", () => (open ? hide() : show()));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") hide(); });
  }

  // ── 7. Hover variants ────────────────────────────────────────────────────────────────────
  // Every hover below was measured on LIVE with a real CDP pointer (tools-local/hover-survey.js, row-probe.js,
  // card-probe.js); the variant CSS is the site's own (captured stylesheet), the tween is the component's
  // declared transition, and the layout change is projected exactly as framer-motion does (transform from
  // the old box to the new box → identity, opacity crossfades in parallel).
  //   • "About Us" style button  a.framer-HeaRF  → class `hover`; tween 0.5 s ease [.44,0,.56,1] (shared-lib X):
  //       arrow icons crossfade (framer-wlky11 0→1, framer-j3buxn 1→0) and slide +18 px, the 1×1 px
  //       framer-1xqnidk fills the button (inset 0 → 40×40)
  //   • Selected-works cards  a.framer-cYySy  → class `hover`; tween 0.4 s ease [.44,0,.56,1] (module OK970iPlg z):
  //       framer-1kfajtu goes full-width (translateX −690.5 → none), labels crossfade (1toy0v2 ↔ btw4go)
  //   • Insight cards  a.framer-ndfg2  → class `hover`; tween 0.4 s ease [.44,0,.56,1] (module oZP_JLOFj V):
  //       image box inset −4px −8px (665→681 × 349→357, projected as scale 0.977→1), arrow +20 px, labels crossfade
  //   • Services rows  .framer-pnZ4R  → the row's hover switches its icon (.framer-xV5da) variant class, tween 0.5 s
  //       ease [.44,0,.56,1] (module BYcnRKRpL B): Orbital 17quxgj→g2tja0 (parts 61→43 / 25→43 px, and the
  //       framer-1fn40j7 wrapper spins one full turn), CoreOrbit 1lfbqun→hshuyz, AtomIcon 16eskzb→hk7mqz,
  //       PulseCore v29wf2→15gfva8
  //   • The footer links, the fixed "Buy Template" pill and the Framer badge have NO hover state (measured:
  //       0 style/geometry changes, 0 animations) — see behavior-deviations.json.
  function hoverStates() {
    const EASE = "cubic-bezier(0.44, 0, 0.56, 1)";
    // the label/arrow crossfades are variant properties written inline by framer-motion, not CSS — swapped in onSwap
    const crossfade = (root, showSel, hideSel) => (on) => { for (const e of root.querySelectorAll(showSel)) e.style.opacity = on ? "1" : "0"; for (const e of root.querySelectorAll(hideSel)) e.style.opacity = on ? "0" : "1"; };
    for (const el of document.querySelectorAll("a.framer-HeaRF")) hoverVariant(el, { to: ["hover"], duration: 500, easing: EASE, onSwap: crossfade(el, ".framer-wlky11", ".framer-j3buxn") });
    for (const el of document.querySelectorAll("a.framer-cYySy")) {
      // the text wrapper sits at left:50% + inline translateX(-50%); the hover variant sets left/right 0 and x: 0
      // (measured matrix(1,0,0,1,-690.5,0) → none) — the same spot, so it is swapped with the class, not projected
      const wrap = el.querySelector(".framer-1kfajtu");
      const fade = crossfade(el, ".framer-btw4go", ".framer-1toy0v2");
      hoverVariant(el, { to: ["hover"], duration: 400, easing: EASE, onSwap: (on) => { fade(on); if (wrap) { if (on) wrap.style.transform = "none"; else wrap.style.transform = "translateX(-50%)"; } } });
    }
    // menu links ("Underlined" variant): the site's stylesheet carries a `.hover` rule for their Line; tween 0.4 s (shared-lib A)
    document.addEventListener("pointerenter", (e) => { const t = e.target; if (t instanceof Element && t.matches("a.framer-Y1I09.framer-v-zc7ixc") && !t.__hv) { t.__hv = hoverVariant(t, { to: ["hover"], duration: 400, easing: EASE, bind: false }); t.__hv(true); t.addEventListener("pointerleave", () => t.__hv(false)); } }, true);
    for (const el of document.querySelectorAll("a.framer-ndfg2")) hoverVariant(el, { to: ["hover"], duration: 400, easing: EASE, onSwap: crossfade(el, ".framer-u3hl0c", ".framer-1nkxnhz") });
    const ICON_VARIANTS = { "framer-v-17quxgj": "framer-v-g2tja0", "framer-v-1lfbqun": "framer-v-hshuyz", "framer-v-16eskzb": "framer-v-hk7mqz", "framer-v-v29wf2": "framer-v-15gfva8" };
    for (const row of document.querySelectorAll(".framer-pnZ4R")) {
      const icon = row.querySelector(".framer-xV5da"); if (!icon) continue;
      const from = [...icon.classList].find((c) => ICON_VARIANTS[c]); if (!from) continue;
      const to = ICON_VARIANTS[from];
      const spin = from === "framer-v-17quxgj" ? icon.querySelector(".framer-1fn40j7") : null;
      // Orbital's two rings are centred by a variant transform (inline translate(-50%, -50%) on live, not CSS)
      const centred = from === "framer-v-17quxgj" ? [...icon.querySelectorAll(".framer-11iz3a, .framer-9inyhz")] : [];
      hoverVariant(icon, { from: [from], to: [to], duration: 500, easing: EASE, trigger: row, onSwap: (on) => { for (const e of centred) e.style.transform = on ? "translate(-50%, -50%)" : ""; } });
      if (spin) {
        let a = null;
        row.addEventListener("pointerenter", () => { if (a) a.cancel(); a = spin.animate([{ rotate: "0deg" }, { rotate: "360deg" }], { duration: 500, easing: EASE, fill: "both" }); a.finished.then(() => { a.cancel(); a = null; }, () => {}); });
        row.addEventListener("pointerleave", () => { if (a) a.cancel(); a = spin.animate([{ rotate: "360deg" }, { rotate: "0deg" }], { duration: 500, easing: EASE, fill: "both" }); a.finished.then(() => { a.cancel(); a = null; }, () => {}); });
      }
    }
  }

  // ── 6. Fixed "Buy Template" pill appear (a.framer-157woa) ───────────────────────────────
  // Site config (page module): style appear effect, animateOnce, threshold 0.5, enter {opacity 0, y 20,
  // transformPerspective 1200} → target {opacity 1, y 0}, transition {tween, delay 1.9 s, duration 0.3 s,
  // ease [.12,.23,.5,1]}. Its settled transform on live is perspective(1200px) (matrix3d …, -0.000833, …).
  function buyTemplateAppear() {
    const el = document.querySelector("a.framer-157woa"); if (!el) return;
    for (const a of el.getAnimations()) a.cancel();
    el.style.opacity = "0"; el.style.transform = "perspective(1200px) translateY(20px)";
    const opts = { delay: 1900, duration: 300, easing: "cubic-bezier(0.12, 0.23, 0.5, 1)", fill: "both" };
    const a1 = el.animate([{ opacity: 0 }, { opacity: 1 }], opts);
    const a2 = el.animate([{ transform: "perspective(1200px) translateY(20px)" }, { transform: "perspective(1200px) translateY(0px)" }], opts);
    Promise.all([a1.finished, a2.finished]).then(() => { el.style.opacity = "1"; el.style.transform = "perspective(1200px)"; a1.cancel(); a2.cancel(); }, () => {});
  }

  // ── 5. Lenis smooth scroll (html.lenis.lenis-smooth) ─────────────────────────────────────
  // The site wraps the page in Framer University's SmoothScroll component (module YUjpPZtbR), which bundles
  // Lenis 1.1.9 and constructs `new Lenis({ duration: intensity / 10 })` with a requestAnimationFrame loop; the
  // page passes intensity 20 → duration 2 (Lenis default easing). It also tags every `overflow: auto` element
  // with data-lenis-prevent. The same library version is vendored as clone/lenis-1.1.9.min.js (source copy in tools-local/) and driven the same way.
  function smoothScroll() {
    const s = document.createElement("script");
    s.src = "lenis-1.1.9.min.js";
    s.onload = () => {
      try {
        for (const el of document.getElementsByTagName("*")) { try { if (getComputedStyle(el).overflow === "auto") el.setAttribute("data-lenis-prevent", "true"); } catch (e) {} }
        const lenis = new window.Lenis({ duration: 2 });
        const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
        requestAnimationFrame(raf);
        window.__lenis = lenis;
      } catch (e) { console.error("fixes.js lenis:", e); }
    };
    document.head.appendChild(s);
  }

  // ── shared: Framer hover variants ────────────────────────────────────────────────────────
  // Framer components switch a variant class on pointer enter/leave (their CSS is in the captured
  // stylesheet) and animate the resulting layout change with a FLIP projection (transform from the
  // old box to the new one, then to identity) while crossfading opacity children — both with the
  // component's declared tween. `pairs` lists elements whose opacity the variant flips (crossfade).
  function hoverVariant(root, { from = [], to = ["hover"], duration, easing, depthLimit = 60, trigger = root, bind = true, onSwap = null }) {
    if (!root) return () => {};
    const tween = { duration, easing, fill: "both" };
    let running = [];
    const apply = (on) => {
      for (const a of running) a.cancel(); running = [];
      const els = [root, ...root.querySelectorAll("*")].slice(0, depthLimit).filter((el) => el.tagName !== "use");
      const before = els.map((el) => ({ el, r: el.getBoundingClientRect(), op: getComputedStyle(el).opacity }));
      for (const c of from) root.classList.toggle(c, !on);
      for (const c of to) root.classList.toggle(c, on);
      if (onSwap) onSwap(on); // variant properties that are not CSS (e.g. a transform the variant sets inline)
      const parentDelta = new Map();
      for (const { el, r, op } of before) {
        const n = el.getBoundingClientRect();
        const opNow = getComputedStyle(el).opacity;
        if (op !== opNow) running.push(el.animate([{ opacity: op }, { opacity: opNow }], tween));
        if (!r.width || !r.height || !n.width || !n.height) continue;
        const dx = r.left - n.left + (r.width - n.width) / 2, dy = r.top - n.top + (r.height - n.height) / 2;
        const sx = r.width / n.width, sy = r.height / n.height;
        parentDelta.set(el, { dx, dy, sx, sy });
        const pd = el.parentElement && parentDelta.get(el.parentElement);
        // a child that moved exactly with its parent is carried by the parent's projection
        if (pd && Math.abs(pd.dx - dx) < 0.5 && Math.abs(pd.dy - dy) < 0.5 && Math.abs(pd.sx - sx) < 0.01 && Math.abs(pd.sy - sy) < 0.01) continue;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) continue;
        const a = el.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` }, { transform: "none" }], tween);
        a.finished.then(() => a.cancel(), () => {});
        running.push(a);
      }
    };
    if (bind) { trigger.addEventListener("pointerenter", () => apply(true)); trigger.addEventListener("pointerleave", () => apply(false)); }
    return apply;
  }

  // ── shared: a framer-motion style spring integrator driven per rAF ──────────────────────
  // x'' = -(k/m)(x - target) - (c/m)x' ; semi-implicit Euler, dt clamped (a long frame must not explode)
  function makeSpring({ stiffness, damping, mass = 1, value = 0 }) {
    const st = { value, target: value, velocity: 0, running: false, raf: 0, delayTimer: 0, onFrame: null };
    function tick(now) {
      const dt = Math.min(0.064, Math.max(0.001, (now - (st.last || now)) / 1000)); st.last = now;
      const a = (-stiffness * (st.value - st.target) - damping * st.velocity) / mass;
      st.velocity += a * dt; st.value += st.velocity * dt;
      const settled = Math.abs(st.value - st.target) < 0.01 && Math.abs(st.velocity) < 0.01;
      if (settled) { st.value = st.target; st.velocity = 0; st.running = false; }
      if (st.onFrame) st.onFrame(st.value);
      if (st.running) st.raf = requestAnimationFrame(tick); else st.raf = 0;
    }
    st.set = (target, delayMs = 0) => {
      clearTimeout(st.delayTimer);
      const go = () => { st.target = target; if (!st.running) { st.running = true; st.last = 0; st.raf = requestAnimationFrame(tick); } };
      if (delayMs > 0) st.delayTimer = setTimeout(go, delayMs); else go();
    };
    return st;
  }

  // ── 2. Nav bar hides on scroll-down, shows on scroll-up (.framer-uiuq7q-container) ─────
  // Site config (script_main module): scroll-direction effect {direction: "down", target: y −60} with
  // transition {type: spring, stiffness: 300, damping: 60, mass: 1, delay: 0.4}; default variant y 0.
  // The runtime's rule (framer module, hook Mc / jc / tS): on every scroll sample, dir = y < prev ? "up" : "down"
  // (first sample compares against 0, so it is "down"); when dir differs from the previous sample's dir only the
  // anchor position is recorded; when it is the same dir and |y − anchor| ≥ 4 px, the target becomes the −60
  // variant for "down" and the default for "up" (fired once per target change). Samples with y < 0 or beyond
  // the scroll length are ignored. Measured on live: a 20px jump hides it ~450 ms later; a lone jump upward does
  // not show it, a second upward sample does (tools-local/nav-probe.js, nav-jump.js).
  function navHideOnScroll() {
    const nav = document.querySelector(".framer-uiuq7q-container"); if (!nav) return;
    // the DOM was captured after the settle sweep, with the nav in its hidden state (inline translateY(-60px));
    // live shows the nav at load (y 0) — start from the default variant like the page does
    for (const a of nav.getAnimations()) a.cancel();
    nav.style.transform = "none";
    const spring = makeSpring({ stiffness: 300, damping: 60, mass: 1, value: 0 });
    spring.onFrame = (y) => { nav.style.transform = Math.abs(y) < 0.005 ? "none" : "translateY(" + y.toFixed(4) + "px)"; };
    let prev, lastDir, anchor = 0, current; // `current` = the target variant in force (undefined = default)
    const sample = () => {
      const y = window.scrollY, len = document.documentElement.scrollHeight - window.innerHeight;
      if (y > len || y < 0) return;
      const dir = y < (prev ?? 0) ? "up" : "down"; prev = y;
      const changed = dir !== lastDir; lastDir = dir;
      if (changed) { anchor = y; return; }
      if (Math.abs(y - anchor) < 4) return;
      const target = dir === "down" ? -60 : undefined;
      if (target !== current) { current = target; spring.set(target ?? 0, 400); }
    };
    sample();
    window.addEventListener("scroll", sample, { passive: true });
  }

  // ── 3. Selected-works belt: horizontal scroll transform (.framer-wc3b1s) ───────────────
  // Site config (page module): transform targets x: 0 → -4200 on `onScrollTarget` (viewport threshold 1)
  // through a spring {stiffness: 400, damping: 100, mass: 1}. Measured on live at 100px steps: x stays 0 until
  // scrollY ≈ 959 (= spacer top 1941.03 − 982 viewport), then −5.03 px per scrolled px, clamped at −4200 by
  // scrollY ≈ 1794 (= spacer bottom − viewport): progress = (scrollY − (spacerTop − vh)) / spacerHeight, where the
  // spacer is the 85vh `.framer-sjg95s` sibling that gives the sticky gallery its scroll range.
  function worksBelt() {
    const belt = document.querySelector(".framer-wc3b1s"), spacer = document.querySelector(".framer-sjg95s");
    if (!belt || !spacer) return;
    for (const a of belt.getAnimations()) a.cancel(); // the build's motion pass may have applied a time clip here; scroll owns this transform
    const spring = makeSpring({ stiffness: 400, damping: 100, mass: 1, value: 0 });
    spring.onFrame = (x) => { belt.style.transform = Math.abs(x) < 0.005 ? "none" : "translateX(" + x.toFixed(4) + "px)"; };
    const target = () => {
      const r = spacer.getBoundingClientRect(), vh = window.innerHeight;
      const top = r.top + window.scrollY, p = Math.min(1, Math.max(0, (window.scrollY - (top - vh)) / r.height));
      return -4200 * p;
    };
    const update = () => spring.set(target());
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  // ── 4. Quote-card blobs: mirrored linear loops (.framer-1fjnr9w "Dark", .framer-ep90y3 "Blue") ─
  // Site config (page module): loop effect, repeatType mirror, repeatDelay 0, pause offscreen;
  //   Dark: {rotate: 360, scale: 1.2}, tween 3 s linear   Blue: {rotate: 360, scale: 1.1}, tween 4 s linear
  // Measured on live: legs of 3033–3037 ms / 3945–4050 ms, scale 1.0011–1.1999 / 1.0008–1.1, rotation reversing
  // each leg (mirror), transform written per frame by JS (no WAAPI animation on the element).
  function quoteBlobs() {
    const specs = [[".framer-1fjnr9w", 3000, 1.2], [".framer-ep90y3", 4000, 1.1]];
    for (const [sel, dur, scale] of specs) {
      const el = document.querySelector(sel); if (!el) continue;
      for (const a of el.getAnimations()) a.cancel();
      let elapsed = 0, last = 0, visible = false, raf = 0;
      const frame = (now) => {
        if (!visible) { raf = 0; return; }
        if (last) elapsed += now - last; last = now;
        const leg = Math.floor(elapsed / dur), p0 = (elapsed % dur) / dur, p = leg % 2 ? 1 - p0 : p0; // mirror
        el.style.transform = "scale(" + (1 + (scale - 1) * p).toFixed(5) + ") rotate(" + (360 * p).toFixed(3) + "deg)";
        raf = requestAnimationFrame(frame);
      };
      const io = new IntersectionObserver((entries) => {
        visible = entries.some((e) => e.isIntersecting);
        if (visible && !raf) { last = 0; raf = requestAnimationFrame(frame); }
      });
      io.observe(el);
    }
  }

  function heroCycler() {
    const PHRASES = ["turnmakes web magic.", "powers creativity.", "launches sites.", "changes the game.", "also builds sites."];
    // The component starts its timer on mount: first switch 1716–1735 ms after hydration completes;
    // a visitor sees it 2046–2340 ms after navigation start (4 live runs, median 2110 — live must download
    // ~1.5 MB of modules first), then every 3750 ms. The clone anchors inside that measured range (2100 ms).
    // Anchor: the measured live range is 2046–2340 ms (values 2046, 2046, 2174, 2340; median 2110). Under the kit's
    // runner both gates showed the clone ~60 ms behind live with the mean (2151), so the median-side value is used.
    const FIRST_SWITCH_MS = 2100, PERIOD_MS = 3750;
    const ENTER = { delay0: 687.5, span: 916.6666666666666, dur: 1375, easing: "ease-out", blurFrom: "blur(10.4px)" };
    const EXIT = { dur: 1375, easing: "ease-out", blurTo: "blur(0.173333px)" };
    const WRAP_ENTER = "display: inline-block; opacity: 0; filter: blur(10.4px); z-index: 1; will-change: transform;";
    const WRAP_SETTLED = "display: inline-block; opacity: 1; filter: blur(0px); z-index: 1; will-change: transform;";

    const container = document.querySelector(".framer-bjwa4n-container");
    if (!container) return;
    const row = container.querySelector('div[style*="position:relative"][style*="flex-direction:row"], div[style*="position: relative"][style*="flex-direction: row"]');
    const tplP = row && row.querySelector('div[style*="inline-block"] > p');
    if (!row || !tplP) return;
    const pStyle = tplP.getAttribute("style"); // the site's own letter <p> style, verbatim

    const isLayer = (el) => el.tagName === "DIV" && /position:\s*absolute/.test(el.getAttribute("style") || "");
    const phraseLayers = () => [...row.children].filter((el) => isLayer(el) && el.querySelector("p"));

    const mine = new Set(); // animations this driver owns — anything else in the subtree is cancelled
    // Live (Framer's motion runtime) commits a finished letter animation's end state inline and
    // cancels the Animation object — measured: at capture time only the letters still mid-flight
    // hold a live Animation (26 frozen on live = 13 letters × 2 while 2 finished letters sat at
    // inline opacity:1). Same technique here, so a phase-freeze seeks exactly the same set.
    function animate(el, keyframes, opts) {
      const a = el.animate(keyframes, opts);
      mine.add(a);
      a.finished.then(() => { try { if (el.isConnected) a.commitStyles(); } catch (e) {} a.cancel(); mine.delete(a); }, () => mine.delete(a));
      return a;
    }
    function purgeForeign() {
      for (const a of row.getAnimations({ subtree: true })) if (!mine.has(a)) a.cancel();
    }

    function buildLayer(text, wrapStyle) {
      const layer = document.createElement("div");
      layer.setAttribute("style", "position:absolute;top:0;left:0;overflow:visible;width:100%;text-align:left");
      const flex = document.createElement("div");
      flex.setAttribute("style", "display: flex; flex-wrap: wrap; width: 100%; justify-content: flex-start; gap: 0px;");
      layer.appendChild(flex);
      const wraps = [];
      for (const group of text.split(/(\s)/).filter(Boolean)) {
        const word = document.createElement("div");
        word.setAttribute("style", "display: inline-flex; flex-wrap: nowrap; white-space: pre;");
        flex.appendChild(word);
        for (const ch of group) {
          const wrap = document.createElement("div");
          wrap.setAttribute("style", wrapStyle);
          const p = document.createElement("p");
          p.setAttribute("style", pStyle);
          p.textContent = ch;
          wrap.appendChild(p);
          word.appendChild(wrap);
          wraps.push(wrap);
        }
      }
      layer.__wraps = wraps;
      return layer;
    }
    function playEnter(layer, elapsedMs) {
      const n = layer.__wraps.length;
      layer.__wraps.forEach((wrap, i) => {
        const delay = ENTER.delay0 + (n > 1 ? (ENTER.span * i) / (n - 1) : 0);
        const opts = { delay, duration: ENTER.dur, easing: ENTER.easing, fill: "both" };
        const a1 = animate(wrap, [{ opacity: 0 }, { opacity: 1 }], opts);
        const a2 = animate(wrap, [{ filter: ENTER.blurFrom }, { filter: "blur(0px)" }], opts);
        if (elapsedMs) { a1.currentTime = elapsedMs; a2.currentTime = elapsedMs; }
      });
    }
    function playExit(layer, elapsedMs) {
      layer.__wraps.forEach((wrap) => {
        wrap.style.zIndex = "0";
        const opts = { duration: EXIT.dur, easing: EXIT.easing, fill: "both" };
        const a1 = animate(wrap, [{ opacity: 1 }, { opacity: 0 }], opts);
        const a2 = animate(wrap, [{ filter: "blur(0px)" }, { filter: EXIT.blurTo }], opts);
        if (elapsedMs) { a1.currentTime = elapsedMs; a2.currentTime = elapsedMs; }
      });
      setTimeout(() => layer.remove(), Math.max(0, EXIT.dur - (elapsedMs || 0)));
    }

    // Seed the state the live page is in RIGHT NOW on its own clock (performance.now() is ms
    // since navigation start on both pages), so a capture at any moment lands on the same
    // phrase at the same phase. The static markup (phrase 0, settled) is replaced by the
    // timed state — identical when the page is younger than the first switch.
    purgeForeign();
    for (const l of phraseLayers()) l.remove();
    const now = performance.now();
    let switches; // how many switches have happened
    let current;
    if (now < FIRST_SWITCH_MS) {
      switches = 0;
      current = buildLayer(PHRASES[0], WRAP_SETTLED);
      row.appendChild(current);
      // Live's server-rendered phrase 0 still gets its appear animations, at duration 0 (measured:
      // 20 letters × 2 WAAPI animations, opacity 1→1 / blur(0px)→blur(0px), ease-out, fill both,
      // delay 687.5 + 916.67·i/(n−1)) — visually nothing, but part of the page's startup inventory.
      const n = current.__wraps.length;
      current.__wraps.forEach((wrap, i) => {
        const opts = { delay: ENTER.delay0 + (n > 1 ? (ENTER.span * i) / (n - 1) : 0), duration: 0, easing: ENTER.easing, fill: "both" };
        animate(wrap, [{ opacity: 1 }, { opacity: 1 }], opts);
        animate(wrap, [{ filter: "blur(0px)" }, { filter: "blur(0px)" }], opts);
      });
    } else {
      switches = Math.floor((now - FIRST_SWITCH_MS) / PERIOD_MS) + 1;
      const sinceSwitch = now - (FIRST_SWITCH_MS + (switches - 1) * PERIOD_MS);
      const idx = switches % PHRASES.length;
      if (sinceSwitch < EXIT.dur) {
        const prev = buildLayer(PHRASES[(idx + PHRASES.length - 1) % PHRASES.length], WRAP_SETTLED);
        row.appendChild(prev);
        playExit(prev, sinceSwitch);
      }
      current = buildLayer(PHRASES[idx], WRAP_ENTER);
      row.appendChild(current);
      playEnter(current, sinceSwitch);
    }

    function scheduleNext() {
      const at = FIRST_SWITCH_MS + switches * PERIOD_MS;
      setTimeout(step, Math.max(0, at - performance.now()));
    }
    function step() {
      purgeForeign();
      switches += 1;
      const next = buildLayer(PHRASES[switches % PHRASES.length], WRAP_ENTER);
      playExit(current, 0);
      row.appendChild(next);
      playEnter(next, 0);
      current = next;
      scheduleNext();
    }
    scheduleNext();

    // The build's motion pass replays the letter animations it captured mid-transition on
    // whatever nodes match their selectors (armed on DOMContentLoaded / scroll). Those are this
    // component's transient state, not a second behavior — cancel anything not ours, for the
    // first seconds and at every switch.
    const guardUntil = performance.now() + 6000;
    (function guard() { purgeForeign(); if (performance.now() < guardUntil) requestAnimationFrame(guard); })();
    document.addEventListener("DOMContentLoaded", purgeForeign);
    window.addEventListener("load", purgeForeign);
  }
})();
