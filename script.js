/* ============================================================
   script.js — Enchante by Yann
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initSmoothScroll();
  initScrollAnimations();
  initMusic();
  initContactForm();

  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});

/* ============================================================
   NAV
   ============================================================ */
function initNav() {
  const nav       = document.getElementById('nav');
  const hamburger = document.getElementById('hamburger');
  const menu      = document.getElementById('nav-menu');
  if (!nav || !hamburger || !menu) return;

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });

  hamburger.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', String(isOpen));
  });

  menu.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      menu.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('click', (e) => {
    if (menu.classList.contains('open') &&
        !menu.contains(e.target) &&
        !hamburger.contains(e.target)) {
      menu.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });
}

/* ============================================================
   SMOOTH SCROLL
   ============================================================ */
function initSmoothScroll() {
  const NAV_HEIGHT = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--nav-height')
  ) || 76;

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const id     = anchor.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      window.scrollTo({
        top: target.getBoundingClientRect().top + window.scrollY - NAV_HEIGHT,
        behavior: 'smooth'
      });
    });
  });
}

/* ============================================================
   SCROLL ANIMATIONS
   ============================================================ */
function initScrollAnimations() {
  const elements = document.querySelectorAll('.animate');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el       = entry.target;
      const siblings = Array.from(el.parentElement.querySelectorAll('.animate:not(.visible)'));
      const delay    = siblings.indexOf(el) * 80;
      setTimeout(() => el.classList.add('visible'), Math.max(0, delay));
      observer.unobserve(el);
    });
  }, { threshold: 0.1 });

  elements.forEach(el => observer.observe(el));

  // Hero elements animate in immediately on load
  document.querySelectorAll('.hero .animate').forEach((el, i) => {
    setTimeout(() => el.classList.add('visible'), 300 + i * 150);
  });
}

/* ============================================================
   BACKGROUND MUSIC — Web Audio API ambient generator
   Creates soothing layered sine tones with gentle modulation.
   Starts on first user interaction (browser autoplay policy).
   ============================================================ */
function initMusic() {
  const btn     = document.getElementById('music-btn');
  const iconOn  = btn ? btn.querySelector('.icon-music')  : null;
  const iconOff = btn ? btn.querySelector('.icon-muted')  : null;
  if (!btn) return;

  let ctx        = null;
  let master     = null;
  let oscs       = [];
  let isPlaying  = false;
  let initialized = false;

  // Soothing harmonic series — soft, floral, spa-like
  const LAYERS = [
    { freq: 174.0, gain: 0.18, lfoRate: 0.07,  type: 'sine'     },
    { freq: 261.6, gain: 0.12, lfoRate: 0.11,  type: 'sine'     },
    { freq: 349.2, gain: 0.08, lfoRate: 0.09,  type: 'triangle' },
    { freq: 523.3, gain: 0.05, lfoRate: 0.13,  type: 'sine'     },
    { freq: 130.8, gain: 0.10, lfoRate: 0.05,  type: 'sine'     },
  ];

  function build() {
    ctx    = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.connect(ctx.destination);

    // Gentle low-pass to soften any harshness
    const filter = ctx.createBiquadFilter();
    filter.type            = 'lowpass';
    filter.frequency.value = 900;
    filter.Q.value         = 0.4;
    filter.connect(master);

    LAYERS.forEach(({ freq, gain, lfoRate, type }, i) => {
      const osc     = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type            = type;
      osc.frequency.value = freq;
      osc.detune.value    = (i % 2 === 0 ? 1 : -1) * i * 2.5; // micro-detune for warmth

      gainNode.gain.value = gain;

      // LFO for slow breathing / shimmer
      const lfo     = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = lfoRate;
      lfoGain.gain.value  = gain * 0.4;
      lfo.connect(lfoGain);
      lfoGain.connect(gainNode.gain);
      lfo.start();

      osc.connect(gainNode);
      gainNode.connect(filter);
      osc.start();

      oscs.push(osc, lfo);
    });
  }

  function fadeIn() {
    if (!ctx) build();
    if (ctx.state === 'suspended') ctx.resume();
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 3.5);
    isPlaying = true;
    btn.classList.add('playing');
    if (iconOn)  iconOn.style.display  = '';
    if (iconOff) iconOff.style.display = 'none';
    btn.setAttribute('aria-label', 'Pause music');
  }

  function fadeOut() {
    if (!ctx) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
    isPlaying = false;
    btn.classList.remove('playing');
    if (iconOn)  iconOn.style.display  = 'none';
    if (iconOff) iconOff.style.display = '';
    btn.setAttribute('aria-label', 'Play music');
  }

  // Auto-start on first interaction anywhere on the page
  function autoStart() {
    if (initialized) return;
    initialized = true;
    fadeIn();
  }
  document.addEventListener('click',      autoStart, { once: true });
  document.addEventListener('touchstart', autoStart, { once: true });
  document.addEventListener('keydown',    autoStart, { once: true });

  // Button toggles play / pause
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!initialized) { autoStart(); return; }
    isPlaying ? fadeOut() : fadeIn();
  });
}

/* ============================================================
   CONTACT FORM
   ============================================================ */
function initContactForm() {
  const form      = document.getElementById('contact-form');
  const submitBtn = document.getElementById('submit-btn');
  const feedback  = document.getElementById('form-feedback');
  if (!form || !submitBtn || !feedback) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    feedback.className = 'form-feedback';

    try {
      const response = await fetch(form.action, {
        method:  'POST',
        body:    new FormData(form),
        headers: { 'Accept': 'application/json' },
      });

      if (response.ok) {
        feedback.className   = 'form-feedback success';
        feedback.textContent = 'Thank you! Your enquiry has been sent. We\'ll be in touch soon.';
        form.reset();
        clearAllErrors();
      } else {
        feedback.className   = 'form-feedback error';
        feedback.textContent = 'Something went wrong. Please try again or email us directly.';
      }
    } catch {
      feedback.className   = 'form-feedback error';
      feedback.textContent = 'Network error. Please check your connection and try again.';
    } finally {
      setLoading(false);
      feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });

  function setLoading(on) {
    submitBtn.classList.toggle('loading', on);
    submitBtn.disabled = on;
  }

  function validateForm() {
    clearAllErrors();
    let valid = true;

    const nameEl     = form.querySelector('#name');
    const emailEl    = form.querySelector('#email');
    const occasionEl = form.querySelector('#occasion');
    const msgEl      = form.querySelector('#message');

    if (!nameEl.value.trim()) {
      setError(nameEl, 'name-error', 'Please enter your name.');
      valid = false;
    }
    if (!emailEl.value.trim()) {
      setError(emailEl, 'email-error', 'Please enter your email.');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailEl.value.trim())) {
      setError(emailEl, 'email-error', 'Please enter a valid email.');
      valid = false;
    }
    if (!occasionEl.value) {
      setError(occasionEl, 'occasion-error', 'Please select an occasion.');
      valid = false;
    }
    if (!msgEl.value.trim() || msgEl.value.trim().length < 10) {
      setError(msgEl, 'message-error', 'Please describe your vision (at least 10 characters).');
      valid = false;
    }

    if (!valid) {
      const first = form.querySelector('.error');
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return valid;
  }

  function setError(field, errorId, message) {
    field.classList.add('error');
    const errEl = document.getElementById(errorId);
    if (errEl) errEl.textContent = message;
    field.addEventListener('input', () => {
      field.classList.remove('error');
      const e = document.getElementById(errorId);
      if (e) e.textContent = '';
    }, { once: true });
  }

  function clearAllErrors() {
    form.querySelectorAll('.field-error').forEach(el => { el.textContent = ''; });
    form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
  }
}
