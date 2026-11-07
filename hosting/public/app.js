/* Script clásico: compatible con HTTP y apertura local (file://). */
(() => {
  'use strict';

  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

  function initCountdown() {
    const clock = document.querySelector('#countdown');
    const targetTime = Date.parse(clock.dataset.launch);
    const status = document.querySelector('#countdown-status');
    const units = [...clock.querySelectorAll('[data-countdown]')];
    const animationTimers = new WeakMap();
    let timer;

    if (!Number.isFinite(targetTime)) {
      status.textContent = 'La fecha de la cuenta regresiva no está disponible.';
      return;
    }

    function update() {
      clearTimeout(timer);
      const remaining = Math.max(0, Math.ceil((targetTime - Date.now()) / 1000));
      const values = {
        days: Math.floor(remaining / 86400),
        hours: Math.floor((remaining % 86400) / 3600),
        minutes: Math.floor((remaining % 3600) / 60),
        seconds: remaining % 60,
      };
      units.forEach(element => {
        const next = String(values[element.dataset.countdown]).padStart(2, '0');
        if (element.textContent === next) return;
        const initialized = element.textContent !== '--';
        element.textContent = next;
        clearTimeout(animationTimers.get(element));
        if (initialized && !motionPreference.matches && !document.hidden) {
          element.classList.add('is-changing');
          animationTimers.set(element, setTimeout(() => element.classList.remove('is-changing'), 120));
        }
      });
      if (remaining === 0) {
        status.textContent = '¡Llegó la fecha de referencia! Consulta la disponibilidad en tu tienda oficial.';
      } else if (!document.hidden) {
        // Recalcular desde el reloj absoluto evita acumular deriva del temporizador.
        timer = setTimeout(update, 1000 - (Date.now() % 1000));
      }
    }
    document.addEventListener('visibilitychange', update);
    update();
  }

  function initNavigation() {
    document.querySelector('#reserve-cta').addEventListener('click', event => {
      event.preventDefault();
      document.querySelector('#registration-title').focus({ preventScroll: true });
      document.querySelector('#registro').scrollIntoView({
        behavior: motionPreference.matches || document.body.classList.contains('motion-reduced') || event.detail === 0 ? 'instant' : 'smooth',
        block: 'start',
      });
    });
  }

  function initComparison() {
    const filters = document.querySelector('.filter-bar');
    const cards = [...document.querySelectorAll('.comparison-card')];
    filters.hidden = false;
    filters.addEventListener('click', event => {
      const button = event.target.closest('[data-filter]');
      if (!button) return;
      filters.querySelectorAll('button').forEach(item => {
        item.setAttribute('aria-pressed', String(item === button));
      });
      cards.forEach(card => {
        card.hidden = button.dataset.filter !== 'all' && card.dataset.category !== button.dataset.filter;
      });
      const count = cards.filter(card => !card.hidden).length;
      document.querySelector('#comparison-status').textContent = `${count} temas visibles. Filtro: ${button.textContent}.`;
      document.dispatchEvent(new Event('vicecity:layout'));
    });
  }

  function initAccordions() {
    document.querySelectorAll('.accordion-trigger').forEach(button => {
      const panel = document.getElementById(button.getAttribute('aria-controls'));
      button.disabled = false;
      const setExpanded = expanded => {
        button.setAttribute('aria-expanded', String(expanded));
        panel.hidden = !expanded;
        button.querySelector('span').textContent = expanded ? '−' : '+';
        document.dispatchEvent(new Event('vicecity:layout'));
      };
      setExpanded(false);
      button.addEventListener('click', () => setExpanded(button.getAttribute('aria-expanded') !== 'true'));
    });
  }

  function initVideo() {
    const video = document.querySelector('#hero-video');
    const status = document.querySelector('#video-status');
    const wantsAutoplay = video.hasAttribute('autoplay');
    let visible = false, userPaused = false, internalPause = false;
    const pause = () => {
      if (!video.paused) { internalPause = true; video.pause(); }
    };
    const applyMotionPreference = () => {
      const reduced = motionPreference.matches || document.body.classList.contains('motion-reduced');
      if (reduced || document.hidden || !visible) pause();
      else if (wantsAutoplay && !userPaused && video.muted) video.play().catch(() => {});
    };
    // El autoplay es una solicitud; navegador, red y ahorro de datos pueden impedirlo.
    video.muted = true;
    video.autoplay = false; // Defer the same muted autoplay request until visible.
    video.addEventListener('pause', () => {
      if (internalPause) internalPause = false;
      else userPaused = true;
    });
    video.addEventListener('play', () => { userPaused = false; });
    applyMotionPreference();
    motionPreference.addEventListener('change', applyMotionPreference);
    document.addEventListener('cinema-motion-change', applyMotionPreference);
    document.addEventListener('visibilitychange', applyMotionPreference);
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      applyMotionPreference();
    }, { threshold: 0.2 });
    observer.observe(video);
    window.addEventListener('pagehide', event => { pause(); if (!event.persisted) observer.disconnect(); });
    video.addEventListener('error', () => {
      status.textContent = 'No pudimos cargar el MP4. Prueba el enlace directo o consulta los videos en el sitio oficial de Rockstar.';
    });
    video.querySelectorAll('source').forEach(source => source.addEventListener('error', () => {
      video.dispatchEvent(new Event('error'));
    }));
    video.addEventListener('playing', () => { status.textContent = ''; });
  }

  initCountdown();
  initNavigation();
  initComparison();
  initAccordions();
  initVideo();
})();
