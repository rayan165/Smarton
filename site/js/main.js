/* ============================================
   TrustMesh — Landing Page Scripts
   ============================================ */

(function () {
  'use strict';

  // ---- Hero Canvas: Animated Grid with Dots ----
  function initHeroCanvas() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width, height;
    let dots = [];
    let mouse = { x: -1000, y: -1000 };
    let animationId;

    function resize() {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
      initDots();
    }

    function initDots() {
      dots = [];
      const spacing = 60;
      const cols = Math.ceil(width / spacing) + 1;
      const rows = Math.ceil(height / spacing) + 1;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          dots.push({
            x: i * spacing,
            y: j * spacing,
            baseX: i * spacing,
            baseY: j * spacing,
            radius: 1.2,
            opacity: 0.15 + Math.random() * 0.1,
            phase: Math.random() * Math.PI * 2,
            speed: 0.002 + Math.random() * 0.003,
          });
        }
      }
    }

    function draw(time) {
      ctx.clearRect(0, 0, width, height);

      // Draw grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 0.5;
      const spacing = 60;

      for (let x = 0; x <= width; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw dots
      for (const dot of dots) {
        const dx = mouse.x - dot.baseX;
        const dy = mouse.y - dot.baseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 200;

        let opacity = dot.opacity;
        let radius = dot.radius;
        let color = '0, 212, 255';

        if (dist < maxDist) {
          const factor = 1 - dist / maxDist;
          opacity = dot.opacity + factor * 0.6;
          radius = dot.radius + factor * 2;
        }

        // Subtle float animation
        const floatX = Math.sin(time * dot.speed + dot.phase) * 2;
        const floatY = Math.cos(time * dot.speed + dot.phase * 1.5) * 2;

        ctx.beginPath();
        ctx.arc(dot.baseX + floatX, dot.baseY + floatY, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${opacity})`;
        ctx.fill();
      }

      animationId = requestAnimationFrame(draw);
    }

    canvas.addEventListener('mousemove', function (e) {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });

    canvas.addEventListener('mouseleave', function () {
      mouse.x = -1000;
      mouse.y = -1000;
    });

    window.addEventListener('resize', resize);
    resize();
    animationId = requestAnimationFrame(draw);
  }

  // ---- Navbar scroll effect ----
  function initNav() {
    const nav = document.getElementById('nav');
    const toggle = document.getElementById('nav-toggle');
    const links = document.querySelector('.nav-links');

    if (!nav) return;

    window.addEventListener('scroll', function () {
      if (window.scrollY > 50) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    });

    if (toggle && links) {
      toggle.addEventListener('click', function () {
        toggle.classList.toggle('open');
        links.classList.toggle('open');
      });

      // Close menu on link click
      links.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
          toggle.classList.remove('open');
          links.classList.remove('open');
        });
      });
    }
  }

  // ---- IntersectionObserver fade-in ----
  function initFadeIn() {
    const elements = document.querySelectorAll('.fade-in');
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry, index) {
          if (entry.isIntersecting) {
            // Stagger animations for sibling elements
            const parent = entry.target.parentElement;
            const siblings = parent ? parent.querySelectorAll('.fade-in') : [];
            let delay = 0;

            siblings.forEach(function (sib, i) {
              if (sib === entry.target) {
                delay = i * 80;
              }
            });

            setTimeout(function () {
              entry.target.classList.add('visible');
            }, delay);

            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    elements.forEach(function (el) {
      observer.observe(el);
    });
  }

  // ---- Trust score bar animation ----
  function initScoreBars() {
    const bars = document.querySelectorAll('.score-bar');
    if (!bars.length) return;

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            const bar = entry.target;
            const targetWidth = bar.getAttribute('data-width');
            const color = bar.getAttribute('data-color');

            if (color) {
              bar.style.background = color;
            }

            // Map weight percentage to visual bar width (30% weight -> 100% bar)
            const maxWeight = 30;
            const visualWidth = (parseFloat(targetWidth) / maxWeight) * 100;

            setTimeout(function () {
              bar.style.width = visualWidth + '%';
              bar.classList.add('animated');
            }, 200);

            observer.unobserve(bar);
          }
        });
      },
      {
        threshold: 0.3,
      }
    );

    bars.forEach(function (bar) {
      observer.observe(bar);
    });
  }

  // ---- Smooth scroll for anchor links ----
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;

        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          const navHeight = document.getElementById('nav')
            ? document.getElementById('nav').offsetHeight
            : 0;
          const targetPos =
            target.getBoundingClientRect().top + window.scrollY - navHeight - 20;

          window.scrollTo({
            top: targetPos,
            behavior: 'smooth',
          });
        }
      });
    });
  }

  // ---- Initialize everything ----
  function init() {
    initHeroCanvas();
    initNav();
    initFadeIn();
    initScoreBars();
    initSmoothScroll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
