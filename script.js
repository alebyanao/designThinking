(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- DATA LAPORAN (ganti dengan data resmi) ----------
     Daftar file dibaca otomatis dari files.json, yang dibuat dari isi folder "files/"
     lewat:  node build-files.js   (nama folder = nama tab, judul & keterangan di files/keterangan.json).
     Tab "Semua" otomatis menampilkan seluruh file. */
  var FILES = [];
  var ALL = 'Semua';
  var CATS = [ALL];
  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

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

  /* ---------- Laporan: tab kategori + daftar file ---------- */
  // (kode lama untuk angka & grafik, dinonaktifkan)
  // var items = [
  //   { key: 'beneficiaries', label: 'Penerima manfaat', dec: 0, prefix: '', suffix: '' },
  //   { key: 'programs', label: 'Program aktif', dec: 0, prefix: '', suffix: '' },
  //   { key: 'volunteers', label: 'Relawan', dec: 0, prefix: '', suffix: '' },
  //   { key: 'funds', label: 'Dana tersalur', dec: 1, prefix: 'Rp ', suffix: ' M' }
  // ];
  var tabsEl = $('#year-tabs');
  var panelEl = $('#report-panel');
  var current = ALL;

  function render(cat) {
    current = cat;
    $$('.tab', tabsEl).forEach(function (t) {
      var on = t.dataset.cat === cat;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    var list = FILES.filter(function (f) { return cat === ALL || f.category === cat; });
    panelEl.innerHTML = list.length ? list.map(function (f) {
      var name = f.src.split('/').pop();
      var ext = (name.split('.').pop() || 'file').toLowerCase();
      return '<article class="file-card">' +
        '<span class="file-badge ft-' + esc(ext) + '">' + esc(ext) + '</span>' +
        '<div class="file-body"><h3>' + esc(f.title) + '</h3><p>' + esc(f.desc) + '</p>' +
        '<span class="file-cat">' + esc(f.category) + '</span></div>' +
        '<a class="btn btn-primary btn-sm" href="' + esc(f.src) + '" download="' + esc(name) + '">Unduh</a>' +
        '</article>';
    }).join('') : '<p class="chart-note">Belum ada file di kategori ini.</p>';
  }

  function addTab(c) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'tab';
    b.setAttribute('role', 'tab');
    b.dataset.cat = c;
    b.textContent = c;
    b.addEventListener('click', function () { render(c); });
    tabsEl.appendChild(b);
  }
  // Navigasi panah pada tab
  tabsEl.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var i = CATS.indexOf(current) + (e.key === 'ArrowRight' ? 1 : -1);
    i = (i + CATS.length) % CATS.length;
    render(CATS[i]);
    $('.tab[data-cat="' + CATS[i] + '"]', tabsEl).focus();
  });
  fetch('files.json', { cache: 'no-cache' })
    .then(function (r) { return r.json(); })
    .catch(function () { return []; })
    .then(function (list) {
      FILES = list;
      CATS = [ALL].concat(list.map(function (f) { return f.category; }).filter(function (c, i, a) { return a.indexOf(c) === i; }));
      CATS.forEach(addTab);
      render(ALL);
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
  if (form) form.addEventListener('submit', function (e) {
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
