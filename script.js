(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- DATA LAPORAN (ganti dengan data resmi) ---------- */
  var REPORT = {
    'Data Needfinding': { beneficiaries: 12480, programs: 38, volunteers: 420, funds: 9.4, quarters: [2650, 3020, 3310, 3500] },
    'Pov & HMW': { beneficiaries: 10320, programs: 31, volunteers: 365, funds: 7.8, quarters: [2200, 2480, 2700, 2940] },
    'Solutions': { beneficiaries: 8150,  programs: 26, volunteers: 290, funds: 6.1, quarters: [1700, 1950, 2150, 2350] }
  };
  var YEARS = Object.keys(REPORT).sort().reverse();
  var fmt = new Intl.NumberFormat('id-ID');
  var fmtDec = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  var header = $('#top');
  var nav = $('#site-nav');
  var menuBtn = $('#menu-toggle');

  /* ---------- Header: efek scroll + progress ---------- */
  var progress = $('#scroll-progress');
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY || document.documentElement.scrollTop;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      header.classList.toggle('is-scrolled', y > 12);
      progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Menu mobile ---------- */
  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Tutup menu' : 'Buka menu');
  }
  menuBtn.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
  $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  document.addEventListener('click', function (e) {
    if (nav.classList.contains('is-open') && !nav.contains(e.target) && !menuBtn.contains(e.target)) setMenu(false);
  });
  window.addEventListener('resize', function () { if (window.innerWidth > 860) setMenu(false); });

  /* ---------- Tema gelap / terang ---------- */
  var root = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    if (meta) meta.setAttribute('content', t === 'dark' ? '#0f1714' : '#faf7f2');
  }
  applyTheme(root.getAttribute('data-theme') || 'light');
  $('#theme-toggle').addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  /* ---------- Link aktif sesuai bagian yang terlihat ---------- */
  var links = $$('.nav-link');
  var sections = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
  function setActive(id) {
    links.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + id); });
  }
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) setActive(en.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }
  // Footer pendek: aktifkan Kontak saat halaman mentok di bawah
  window.addEventListener('scroll', function () {
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) setActive('contact');
  }, { passive: true });

  /* ---------- Reveal saat scroll ---------- */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Laporan: tab, angka, grafik ---------- */
  var tabsEl = $('#year-tabs');
  var metricsEl = $('#metrics');
  var chartEl = $('#chart');
  var current = YEARS[0];

  function animateNumber(el, to, decimals) {
    if (reduceMotion) { el.textContent = decimals ? fmtDec.format(to) : fmt.format(to); return; }
    var start = performance.now(), dur = 900;
    (function step(now) {
      var p = Math.min((now - start) / dur, 1);
      var v = to * (1 - Math.pow(1 - p, 3));
      el.textContent = decimals ? fmtDec.format(v) : fmt.format(Math.round(v));
      if (p < 1) requestAnimationFrame(step);
    })(start);
  }

  function delta(now, prev) {
    if (!prev) return { text: 'Tahun pertama dalam data', neg: false };
    var d = ((now - prev) / prev) * 100;
    return { text: (d >= 0 ? '▲ ' : '▼ ') + fmtDec.format(Math.abs(d)) + '% dari tahun lalu', neg: d < 0 };
  }

  function render(year) {
    current = year;
    var d = REPORT[year];
    var prev = REPORT[String(Number(year) - 1)];

    $$('.tab', tabsEl).forEach(function (t) {
      var on = t.dataset.year === year;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });

    var items = [
      { key: 'beneficiaries', label: 'Penerima manfaat', dec: 0, prefix: '', suffix: '' },
      { key: 'programs', label: 'Program aktif', dec: 0, prefix: '', suffix: '' },
      { key: 'volunteers', label: 'Relawan', dec: 0, prefix: '', suffix: '' },
      { key: 'funds', label: 'Dana tersalur', dec: 1, prefix: 'Rp ', suffix: ' M' }
    ];
    metricsEl.innerHTML = '';
    items.forEach(function (m) {
      var dl = delta(d[m.key], prev && prev[m.key]);
      var card = document.createElement('div');
      card.className = 'metric';
      card.innerHTML =
        '<span class="metric-label">' + m.label + '</span>' +
        '<span class="metric-value">' + m.prefix + '<span data-count></span>' + m.suffix + '</span>' +
        '<span class="metric-delta' + (dl.neg ? ' neg' : '') + '">' + dl.text + '</span>';
      metricsEl.appendChild(card);
      animateNumber($('[data-count]', card), d[m.key], m.dec);
    });

    var max = Math.max.apply(null, d.quarters);
    chartEl.innerHTML = '';
    d.quarters.forEach(function (v, i) {
      var bar = document.createElement('div');
      bar.className = 'bar';
      bar.innerHTML = '<div class="bar-fill"><span class="bar-val">' + fmt.format(v) + '</span></div><span class="bar-label">TW ' + (i + 1) + '</span>';
      chartEl.appendChild(bar);
      var fill = $('.bar-fill', bar);
      var h = Math.round((v / max) * 88) + 6;
      if (reduceMotion) fill.style.setProperty('--h', h + '%');
      else requestAnimationFrame(function () { requestAnimationFrame(function () { fill.style.setProperty('--h', h + '%'); }); });
    });

    $('#chart-year').textContent = 'Tahun ' + year;
    var best = d.quarters.indexOf(max) + 1;
    $('#chart-note').textContent = 'Triwulan ' + best + ' mencatat jumlah tertinggi: ' + fmt.format(max) + ' orang.';
  }

  YEARS.forEach(function (y) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'tab';
    b.setAttribute('role', 'tab');
    b.dataset.year = y;
    b.textContent = y;
    b.addEventListener('click', function () { render(y); });
    tabsEl.appendChild(b);
  });
  // Navigasi panah pada tab
  tabsEl.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var i = YEARS.indexOf(current) + (e.key === 'ArrowRight' ? 1 : -1);
    i = (i + YEARS.length) % YEARS.length;
    render(YEARS[i]);
    $('.tab[data-year="' + YEARS[i] + '"]', tabsEl).focus();
  });
  render(current);

  /* ---------- Unduh CSV ---------- */
  $('#download-report').addEventListener('click', function () {
    var d = REPORT[current];
    var rows = [
      ['Indikator', 'Nilai ' + current],
      ['Penerima manfaat', d.beneficiaries],
      ['Program aktif', d.programs],
      ['Relawan', d.volunteers],
      ['Dana tersalur (Rp miliar)', d.funds]
    ];
    d.quarters.forEach(function (v, i) { rows.push(['Penerima manfaat TW ' + (i + 1), v]); });
    var csv = '\ufeff' + rows.map(function (r) { return r.join(';'); }).join('\r\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'laporan-arunika-' + current + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });

  /* ---------- Video: muat iframe hanya saat diputar ---------- */
  var frame = $('#video-frame');
  $('#video-play').addEventListener('click', function () {
    var id = frame.dataset.videoId;
    var iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0&modestbranding=1';
    iframe.title = 'Video profil Arunika';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    frame.innerHTML = '';
    frame.appendChild(iframe);
  });

  /* ---------- Formulir berlangganan (validasi sisi klien) ---------- */
  var form = $('#newsletter');
  var status = $('#form-status');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = form.elements.email.value.trim();
    var ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
    status.className = 'form-status ' + (ok ? 'ok' : 'err');
    if (!ok) {
      status.textContent = 'Masukkan alamat surel yang valid.';
      form.elements.email.focus();
      return;
    }
    // TODO: kirim ke layanan newsletter (Mailchimp, Buttondown, Vercel Function, dsb.)
    status.textContent = 'Terima kasih! Kami akan menghubungi ' + email + '.';
    form.reset();
  });

  /* ---------- Kembali ke atas + tahun footer ---------- */
  $('#to-top').addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });
  $('#year').textContent = new Date().getFullYear();
})();
