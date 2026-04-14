(function () {
  'use strict';

  // Nav scroll effect
  var nav = document.getElementById('nav');
  if (nav) {
    window.addEventListener('scroll', function () {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    });
  }

  // Mobile nav toggle
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

  // IntersectionObserver fade-in
  var fades = document.querySelectorAll('.fade-in');
  if (fades.length) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          // Stagger siblings
          var parent = entry.target.parentElement;
          var siblings = parent ? parent.querySelectorAll('.fade-in') : [];
          var delay = 0;
          siblings.forEach(function (sib, i) {
            if (sib === entry.target) delay = i * 80;
          });
          setTimeout(function () {
            entry.target.classList.add('visible');
          }, delay);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

    fades.forEach(function (el) { observer.observe(el); });
  }

  // Score bar animation
  var bars = document.querySelectorAll('.s-fill');
  if (bars.length) {
    var barObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var w = entry.target.getAttribute('data-w');
          setTimeout(function () {
            entry.target.style.width = w + '%';
          }, 200);
          barObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    bars.forEach(function (b) { barObserver.observe(b); });
  }

  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = this.getAttribute('href');
      if (id === '#') return;
      var target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        var offset = nav ? nav.offsetHeight : 0;
        window.scrollTo({
          top: target.getBoundingClientRect().top + window.scrollY - offset - 16,
          behavior: 'smooth'
        });
      }
    });
  });
})();
