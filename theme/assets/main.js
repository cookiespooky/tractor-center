(function () {
  var modal = document.querySelector('[data-search-modal]');
  var openBtn = document.querySelector('[data-search-open]');
  var closeBtns = document.querySelectorAll('[data-search-close]');
  var input = document.querySelector('[data-search-input]');
  var results = document.querySelector('[data-search-results]');

  function openModal() {
    if (!modal) return;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    if (input) input.focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  }

  if (openBtn) {
    openBtn.addEventListener('click', openModal);
  }
  closeBtns.forEach(function (btn) {
    btn.addEventListener('click', closeModal);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });

  function renderItems(items) {
    if (!results) return;
    if (!items || items.length === 0) {
      results.innerHTML = '<p class="muted">No results yet.</p>';
      return;
    }
    var html = '<ul>';
    items.forEach(function (item) {
      html += '<li><a href="' + item.path + '">' + item.title + '</a>';
      if (item.snippet) html += '<p class="muted">' + item.snippet + '</p>';
      html += '</li>';
    });
    html += '</ul>';
    results.innerHTML = html;
  }

  function fetchStaticIndex(query) {
    return fetch('/search.json')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var q = query.toLowerCase();
        var items = (data.items || []).filter(function (item) {
          return (item.title || '').toLowerCase().includes(q) ||
            (item.snippet || '').toLowerCase().includes(q);
        }).slice(0, 10);
        renderItems(items);
      });
  }

  function fetchServer(query) {
    return fetch('/v1/search?q=' + encodeURIComponent(query))
      .then(function (res) { return res.json(); })
      .then(function (data) { renderItems(data.items || []); });
  }

  function wireSearchInput() {
    if (!input) return;
    var timeout;
    input.addEventListener('input', function () {
      var q = input.value.trim();
      if (q.length < 2) {
        renderItems([]);
        return;
      }
      clearTimeout(timeout);
      timeout = setTimeout(function () {
        if (window.__notepubSearchMode === 'static') {
          fetchStaticIndex(q);
        } else {
          fetchServer(q);
        }
      }, 200);
    });
  }

  function wireGalleryAutoScroll() {
    var marquees = document.querySelectorAll('.gallery-marquee');
    if (!marquees.length) return;

    marquees.forEach(function (marquee) {
      var track = marquee.querySelector('.gallery-track');
      if (!track) return;

      var pauseUntil = 0;
      var speed = 0.35;
      var isDown = false;
      var startX = 0;
      var startScroll = 0;
      var ticking = false;

      function nowMs() {
        return Date.now();
      }

      function pauseAuto(ms) {
        pauseUntil = nowMs() + ms;
      }

      function step() {
        if (nowMs() >= pauseUntil && !isDown) {
          marquee.scrollLeft += speed;
          var half = (track.scrollWidth - marquee.clientWidth) / 2;
          if (half > 0 && marquee.scrollLeft >= half) {
            marquee.scrollLeft = 0;
          }
        }
        requestAnimationFrame(step);
      }

      marquee.addEventListener('wheel', function (e) {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          marquee.scrollLeft += e.deltaY;
          e.preventDefault();
        }
        pauseAuto(1800);
      }, { passive: false });

      marquee.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          ticking = false;
          pauseAuto(1200);
        });
      });

      marquee.addEventListener('pointerdown', function (e) {
        isDown = true;
        marquee.style.cursor = 'grabbing';
        startX = e.clientX;
        startScroll = marquee.scrollLeft;
        pauseAuto(2000);
      });

      marquee.addEventListener('pointermove', function (e) {
        if (!isDown) return;
        var dx = e.clientX - startX;
        marquee.scrollLeft = startScroll - dx;
      });

      function endDrag() {
        if (!isDown) return;
        isDown = false;
        marquee.style.cursor = 'grab';
        pauseAuto(1500);
      }

      marquee.addEventListener('pointerup', endDrag);
      marquee.addEventListener('pointercancel', endDrag);
      marquee.addEventListener('pointerleave', endDrag);

      requestAnimationFrame(step);
    });
  }

  wireSearchInput();
  wireGalleryAutoScroll();
})();
