(function () {
  'use strict';

  // Nav scroll
  var nav = document.getElementById('nav');
  if (nav) {
    window.addEventListener('scroll', function () {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    });
  }

  // Mobile toggle
  var toggle = document.getElementById('nav-toggle');
  var links = document.getElementById('nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      toggle.classList.toggle('open');
      links.classList.toggle('open');
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        toggle.classList.remove('open');
        links.classList.remove('open');
      });
    });
  }

  // Fade-in on scroll
  var fades = document.querySelectorAll('.fade-in');
  if (fades.length) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var parent = entry.target.parentElement;
          var siblings = parent ? parent.querySelectorAll('.fade-in') : [];
          var delay = 0;
          siblings.forEach(function (s, i) { if (s === entry.target) delay = i * 80; });
          setTimeout(function () { entry.target.classList.add('visible'); }, delay);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -20px 0px' });
    fades.forEach(function (el) { obs.observe(el); });
  }

  // Score equalizer bars
  var eqFills = document.querySelectorAll('.eq-fill');
  if (eqFills.length) {
    var eqObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var h = e.target.getAttribute('data-h');
          setTimeout(function () { e.target.style.height = h + '%'; }, 200);
          eqObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.3 });
    eqFills.forEach(function (b) { eqObs.observe(b); });
  }

  // Staking bars
  var sbFills = document.querySelectorAll('.sb-fill');
  if (sbFills.length) {
    var sbObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var w = e.target.getAttribute('data-w');
          setTimeout(function () { e.target.style.width = w + '%'; }, 300);
          sbObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.3 });
    sbFills.forEach(function (b) { sbObs.observe(b); });
  }

  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = this.getAttribute('href');
      if (id === '#') return;
      var target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        var off = nav ? nav.offsetHeight : 0;
        window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - off - 16, behavior: 'smooth' });
      }
    });
  });
})();
