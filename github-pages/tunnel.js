'use strict';

(() => {
  const tunnel = document.querySelector('#work-tunnel');
  if (!tunnel) return;
  if (!window.TunnelProjection || !window.TunnelRenderer) { document.documentElement.classList.remove('tunnel-ready'); return; }
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const sticky = tunnel.querySelector('.tunnel-sticky');
  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  const hero = document.querySelector('#home');
  const singularity = tunnel.querySelector('.tunnel-singularity');
  const portal = tunnel.querySelector('.tunnel-portal');
  const progressbar = tunnel.querySelector('[role="progressbar"]');
  const hint = tunnel.querySelector('.tunnel-scroll-hint');
  const clamp = value => Math.min(1, Math.max(0, value));
  const state = { progress: 0 };
  const gallery = tunnel.querySelector('.tunnel-gallery');
  const sources = [...gallery.querySelectorAll('.tunnel-work')].map(element => {
    const website = element.classList.contains('tunnel-desktop');
    const image = element.querySelector('img');
    const crop = window.WebsiteCrops?.[image.getAttribute('src').split('/').at(-1)];
    return { element, image, crop, website,
      arcSpan: website ? .96 : .44, innerRatio: website ? .60 : .42 };
  });
  // Keep the existing spiral spacing; selected distant panels use another page.
  const primarySources = sources.filter(({ element }) => !element.hasAttribute('data-repeat-for'));
  const items = Array.from({ length: primarySources.length * 2 }, (_, index) => {
    const primary = primarySources[index % primarySources.length];
    const alternate = index >= primarySources.length
      ? sources.find(({ element }) => element.dataset.repeatFor === primary.element.dataset.workId)
      : null;
    const source = alternate || primary;
    const sourceIndex = sources.indexOf(source);
    const depth = 950 * Math.pow(1.235, index);
    return {
      ...source, sourceIndex,
      angle: (-145 + index * 137.5) * Math.PI / 180, depth,
    };
  });
  const travelLength = items.at(-1).depth + 80;
  const depthRate = Math.log1p(travelLength / 950);
  let geometry = { start: 0, distance: 1, width: 1, height: 1, cx: 0, cy: 0 };
  let lastHomeVisible = false;
  let lastProgress = -1;
  let frame = 0;
  let resizeFrame = 0;
  let resizePhase = null;
  let lastTarget = -1;
  let decoded = false;
  let renderer = null;

  // Stop the gesture that finishes the tunnel at the real homepage. A timeout
  // alone cannot distinguish the tail of touch/trackpad inertia from new input.
  const homeStop = { holding: false,
    passed: Boolean(window.location?.hash && window.location.hash !== '#home'), previousY: scrollY,
    until: 0, lastWheelAt: -Infinity, touch: null };
  const homeBoundary = () => geometry.start + geometry.distance;
  const stopEnabled = () => !motion.matches && root.classList.contains('tunnel-ready');
  function releaseHome() { homeStop.holding = false; homeStop.passed = true; }
  function alignHome() {
    homeStop.previousY = homeBoundary();
    if (Math.abs(scrollY - homeBoundary()) > .5) scrollTo({ top: homeBoundary(), behavior: 'instant' });
  }
  function stopAtHome() {
    homeStop.holding = true;
    homeStop.until = performance.now() + 700;
    alignHome();
    syncScroll(true);
  }
  function stopScrollOverflow() {
    if (!stopEnabled()) { homeStop.holding = false; homeStop.previousY = scrollY; return; }
    const y = scrollY, boundary = homeBoundary();
    if (homeStop.holding) { alignHome(); return; }
    if (!homeStop.passed && homeStop.previousY < boundary && y >= boundary) {
      stopAtHome(); return;
    }
    if (y < boundary - 2) homeStop.passed = false;
    homeStop.previousY = y;
  }
  function editableOrDialog(event) {
    return event.target?.closest?.('input, textarea, select, [contenteditable="true"], dialog[open]');
  }
  addEventListener('wheel', event => {
    if (!stopEnabled() || event.ctrlKey || editableOrDialog(event) || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const now = performance.now(), gap = now - homeStop.lastWheelAt;
    homeStop.lastWheelAt = now;
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? geometry.height : 1);
    if (homeStop.holding) {
      if (now >= homeStop.until && gap >= 250 && Math.abs(delta) > 0) releaseHome();
      else { event.preventDefault(); alignHome(); }
    } else if (!homeStop.passed && delta > 0 && scrollY < homeBoundary() && scrollY + delta >= homeBoundary()) {
      event.preventDefault(); stopAtHome();
    }
  }, { passive: false });
  addEventListener('touchstart', event => {
    if (event.touches.length !== 1) { homeStop.touch = null; return; }
    const point = event.touches[0];
    homeStop.touch = { x: point.clientX, y: point.clientY, originY: point.clientY,
      fresh: homeStop.holding && performance.now() >= homeStop.until };
  }, { passive: true });
  addEventListener('touchmove', event => {
    const touch = homeStop.touch;
    if (!stopEnabled() || !touch || event.touches.length !== 1 || editableOrDialog(event)) return;
    const point = event.touches[0], delta = touch.y - point.clientY;
    if (Math.abs(point.clientX - touch.x) > Math.abs(delta)) return;
    if (homeStop.holding) {
      if (touch.fresh && Math.abs(touch.originY - point.clientY) > 8) releaseHome();
      else { event.preventDefault(); alignHome(); }
    } else if (!homeStop.passed && delta > 0 && scrollY < homeBoundary() && scrollY + delta >= homeBoundary()) {
      event.preventDefault(); stopAtHome();
    }
    touch.x = point.clientX; touch.y = point.clientY;
  }, { passive: false });
  for (const type of ['touchend', 'touchcancel']) addEventListener(type, () => { homeStop.touch = null; }, { passive: true });
  addEventListener('keydown', event => {
    if (!stopEnabled() || event.ctrlKey || event.altKey || event.metaKey || editableOrDialog(event)) return;
    const steps = { ArrowDown: 40, PageDown: geometry.height, ' ': geometry.height,
      ArrowUp: -40, PageUp: -geometry.height, End: Infinity, Home: -Infinity };
    let delta = steps[event.key];
    if (delta === undefined || (event.target?.closest?.('button, a, summary') && event.key === ' ')) return;
    if (event.key === ' ' && event.shiftKey) delta = -delta;
    if (homeStop.holding) {
      if (!event.repeat && performance.now() >= homeStop.until) releaseHome();
      else { event.preventDefault(); alignHome(); }
    } else if (!homeStop.passed && delta > 0 && scrollY < homeBoundary() && scrollY + delta >= homeBoundary()) {
      event.preventDefault(); stopAtHome();
    }
  });
  document.addEventListener('click', event => {
    const href = event.target?.closest?.('a[href]')?.getAttribute('href');
    // Explicit navigation is intentional; it must not be treated as inertia.
    if (href?.startsWith('#') && href !== '#home' && href !== '#') releaseHome();
  }, { capture: true });

  function activateRenderer(forceCanvas = false) {
    if ((!forceCanvas && motion.matches) || !decoded || (renderer && !forceCanvas)) return;
    const next = window.TunnelRenderer.create(sources, {
      forceCanvas, onContextLost: () => activateRenderer(true),
    });
    if (!next) {
      root.classList.remove('tunnel-ready', 'home-is-pinned');
      header.inert = hero.inert = false;
      root.dataset.homeVisible = 'true';
      dispatchEvent(new CustomEvent('portfolio:home-visibility', { detail: { visible: true } }));
      return;
    }
    if (renderer) { renderer.canvas.replaceWith(next.canvas); renderer.dispose(); }
    else gallery.append(next.canvas);
    renderer = next;
    tunnel.classList.add('tunnel-rendered');
    measure();
  }

  function render() {
    const progress = state.progress;
    if (!root.classList.contains('tunnel-ready') || motion.matches || Math.abs(progress - lastProgress) < .00001) return;
    lastProgress = progress;
    const { cx, cy, radius, journeyEnd } = geometry;
    // Logarithmic spacing gives distant turns time on screen without making
    // the nearby works rush past at the beginning of the longer journey.
    const { journey, portal: expansion, reveal, pinned, chrome } = window.TunnelProjection.getPhases(progress, journeyEnd);
    const travel = 950 * Math.expm1(journey * depthRate);
    const ending = clamp((travel - (items.at(-1).depth - 520)) / 480);
    singularity.style.visibility = expansion > 0 ? 'hidden' : 'visible';
    portal.style.opacity = expansion > 0 ? '1' : '0';
    const initialScale = 3 / geometry.portalRadius;
    portal.style.transform = `translate(-50%, -50%) scale(${initialScale + (1 - initialScale) * expansion})`;
    tunnel.style.setProperty('--tunnel-chrome', String(chrome));
    sticky.inert = chrome < .01;
    root.classList.toggle('home-is-pinned', pinned);
    root.style.setProperty('--home-reveal', reveal.toFixed(5));
    root.style.setProperty('--home-visibility', reveal > .001 ? 'visible' : 'hidden');
    root.style.setProperty('--home-pointer', reveal >= .98 ? 'auto' : 'none');
    header.inert = hero.inert = reveal < .98;
    const homeVisible = reveal >= .12;
    root.dataset.homeVisible = String(homeVisible);
    if (homeVisible !== lastHomeVisible) {
      lastHomeVisible = homeVisible;
      dispatchEvent(new CustomEvent('portfolio:home-visibility', { detail: { visible: homeVisible } }));
    }
    progressbar.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
    const panels = [];
    items.forEach(item => {
      const near = item.depth - travel;
      const opacity = clamp((near - 280) / 260) * (1 - ending) * Math.max(.65, 1 - Math.max(0, near) / 9000);
      const projection = opacity > .01 && near > 280 ? window.TunnelProjection.projectSector({
        angle: item.angle + journey * Math.PI * 1.3, radius, near,
        innerRatio: item.innerRatio, arcSpan: item.arcSpan, cx, cy, focal: 900,
      }) : null;
      if (projection) {
        panels.push({ ...projection, sourceIndex: item.sourceIndex, opacity });
      }
    });
    renderer?.draw(panels);
  }

  // A single reusable tween; direct rendering remains available if GSAP fails.
  const smoothTo = window.gsap?.quickTo(state, 'progress', {
    duration: .32, ease: 'power2.out', onUpdate: render,
  });
  function syncScroll(immediate = false) {
    frame = 0;
    if (motion.matches) return;
    const target = clamp((scrollY - geometry.start) / geometry.distance);
    if (target === lastTarget && !immediate) return;
    lastTarget = target;
    if (immediate || !smoothTo || target === 0 || target === 1 || document.hidden) {
      smoothTo?.tween.pause();
      state.progress = target;
      render();
    } else smoothTo(target, state.progress);
  }
  function measure() {
    resizeFrame = 0;
    const preserve = resizePhase;
    resizePhase = null;
    const width = sticky.clientWidth;
    const height = sticky.clientHeight;
    const mobile = width <= 600;
    // Measure the natural layout, then reserve exactly that space while the
    // same real header and hero are held in the viewport for the fade.
    root.classList.remove('home-is-pinned');
    root.style.setProperty('--home-header-height', `${header.offsetHeight}px`);
    root.style.setProperty('--home-hero-height', `${hero.offsetHeight}px`);
    geometry = {
      start: tunnel.getBoundingClientRect().top + scrollY,
      distance: Math.max(1, tunnel.offsetHeight - height), width, height,
      cx: width / 2, cy: height / 2,
      radius: Math.min(width, height) * (mobile ? .58 : .64),
      portalRadius: window.TunnelProjection.coveringRadius(width, height),
      // The final part reveals the actual homepage without vertical movement.
      journeyEnd: Math.max(.5, 1 - height / Math.max(height * 2, tunnel.offsetHeight - height)),
    };
    portal.style.width = portal.style.height = `${geometry.portalRadius * 2}px`;
    renderer?.resize(width, height, Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75));
    if (preserve && !motion.matches) {
      const progress = window.TunnelProjection.remapProgress(preserve.progress, preserve.end, geometry.journeyEnd);
      scrollTo({ top: geometry.start + progress * geometry.distance, behavior: 'instant' });
    }
    if (homeStop.holding && stopEnabled()) alignHome();
    else homeStop.previousY = scrollY;
    progressbar.hidden = motion.matches;
    lastProgress = -1;
    if (motion.matches) {
      smoothTo?.tween.pause();
      sticky.inert = false;
      tunnel.style.setProperty('--tunnel-chrome', '1');
      root.style.setProperty('--home-reveal', '1');
      root.style.setProperty('--home-visibility', 'visible');
      root.style.setProperty('--home-pointer', 'auto');
      root.dataset.homeVisible = 'true';
      header.inert = hero.inert = false;
    } else {
      activateRenderer();
      syncScroll(true);
    }
  }
  document.querySelectorAll('a[href="#home"]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      if (location.hash !== '#home') history.pushState(null, '', '#home');
      if (motion.matches) hero.scrollIntoView({ behavior: 'instant', block: 'start' });
      else { homeStop.passed = false; stopAtHome(); }
      syncScroll(true);
      const heading = document.querySelector('#hero-heading');
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    });
  });
  document.documentElement.classList.add('tunnel-ready');
  addEventListener('scroll', () => {
    stopScrollOverflow();
    if (!frame && !resizeFrame) frame = requestAnimationFrame(() => syncScroll());
  }, { passive: true });
  addEventListener('resize', () => {
    if (!resizeFrame) {
      // Capture before browser scroll anchoring moves the natural hero during
      // an orientation change; preserve the visual phase, not its old pixels.
      if (lastTarget >= 0 && lastTarget < 1 && !motion.matches) resizePhase = { progress: lastTarget, end: geometry.journeyEnd };
      if (frame) { cancelAnimationFrame(frame); frame = 0; }
      resizeFrame = requestAnimationFrame(measure);
    }
  }, { passive: true });
  addEventListener('pageshow', measure);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) syncScroll(true); });
  motion.addEventListener('change', measure);
  document.fonts?.ready.then(measure);
  measure();
  // Large screenshots are decoded before the gallery fades in, avoiding a
  // colored frame appearing a moment before its image on the first render.
  Promise.all(sources.map(({ image }) => {
    return image.decode ? image.decode().catch(() => {}) : Promise.resolve();
  })).then(() => {
    decoded = true;
    activateRenderer();
    measure();
    tunnel.classList.add('is-decoded');
  });
})();
