/* ============================================================
   SETHU — Master Script
   Interactions · Animations · Waitlist · Score Counters
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initRevealAnimations();
  initScoreCounters();
  initScoreBars();
  initFAQAccordion();
  initWaitlistForm();
  initSmoothScroll();
});

/* ==========  NAVIGATION  ========== */
function initNavigation() {
  const nav = document.querySelector('.nav');
  const toggle = document.querySelector('.nav__toggle');
  const links = document.querySelector('.nav__links');

  // Scroll effect
  const onScroll = () => {
    if (window.scrollY > 60) {
      nav.classList.add('is-scrolled');
    } else {
      nav.classList.remove('is-scrolled');
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile toggle
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('is-active');
      links.classList.toggle('is-open');
    });

    // Close on link click
    links.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        toggle.classList.remove('is-active');
        links.classList.remove('is-open');
      });
    });
  }
}

/* ==========  REVEAL ON SCROLL  ========== */
function initRevealAnimations() {
  const reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  reveals.forEach(el => observer.observe(el));
}

/* ==========  SCORE NUMBER COUNTER  ========== */
function initScoreCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.3 }
  );

  counters.forEach(el => observer.observe(el));
}

function animateCounter(el) {
  const target = parseInt(el.getAttribute('data-count'), 10);
  const suffix = el.getAttribute('data-suffix') || '';
  const duration = 1400;
  const start = performance.now();

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(eased * target);
    el.textContent = current + suffix;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

/* ==========  SCORE BAR FILLS  ========== */
function initScoreBars() {
  const bars = document.querySelectorAll('.score-dim__fill');
  if (!bars.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const width = entry.target.getAttribute('data-width');
          entry.target.style.width = width + '%';
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  bars.forEach(el => observer.observe(el));
}

/* ==========  FAQ ACCORDION  ========== */
function initFAQAccordion() {
  const items = document.querySelectorAll('.faq__item');
  items.forEach(item => {
    const question = item.querySelector('.faq__question');
    const answer = item.querySelector('.faq__answer');

    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');

      // Close all
      items.forEach(i => {
        i.classList.remove('is-open');
        i.querySelector('.faq__answer').style.maxHeight = '0';
      });

      // Toggle clicked
      if (!isOpen) {
        item.classList.add('is-open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });
}

/* ==========  WAITLIST FORM  ========== */
function initWaitlistForm() {
  const form = document.getElementById('waitlist-form');
  const successEl = document.getElementById('waitlist-success');
  const errorEl = document.getElementById('waitlist-error');
  if (!form) return;

  // Detect base URL — works when served by Express (localhost:3000)
  // or when opened as a static file (file://)
  const API_BASE = (window.location.protocol === 'file:')
    ? 'http://localhost:3000'
    : '';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameInput = form.querySelector('#waitlist-name');
    const emailInput = form.querySelector('#waitlist-email');
    const submitBtn = form.querySelector('.waitlist__submit');
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();

    if (!name || !email) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      emailInput.style.borderColor = '#e74c3c';
      setTimeout(() => { emailInput.style.borderColor = ''; }, 2000);
      return;
    }

    // Disable button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Joining...';

    try {
      const response = await fetch(`${API_BASE}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, source: 'website' })
      });

      const data = await response.json();

      if (response.status === 201) {
        // Success — real backend confirmed the signup
        form.style.display = 'none';
        successEl.classList.add('is-visible');

      } else if (response.status === 409) {
        // Duplicate email
        form.style.display = 'none';
        document.getElementById('waitlist-success-heading').textContent = 'You\'re already on the list.';
        document.getElementById('waitlist-success-message').textContent = 'This email is already registered. We\'ll keep you updated.';
        successEl.classList.add('is-visible');

      } else {
        // Validation or server error
        showWaitlistError(data.error || 'Something went wrong. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Join the Waitlist';
      }
    } catch (err) {
      // Network error — backend not running
      console.error('Waitlist error:', err);
      showWaitlistError(
        'The waitlist server is not available right now. ' +
        'Please try again later or check back when the backend is running (npm start).'
      );
      submitBtn.disabled = false;
      submitBtn.textContent = 'Join the Waitlist';
    }
  });

  function showWaitlistError(message) {
    if (errorEl) {
      document.getElementById('waitlist-error-message').textContent = message;
      form.style.display = 'none';
      errorEl.style.display = 'block';
      errorEl.classList.add('is-visible');
    }
  }
}

/* ==========  SMOOTH SCROLL  ========== */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        const offset = 80;
        const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
}
