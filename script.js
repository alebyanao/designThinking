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
  var ALL = 'ALL';
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
    if (meta) meta.setAttribute('content', t === 'dark' ? '#0d1220' : '#f8f6f2');
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
  var shown = [];

  var ICON_EYE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var ICON_DL = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/></svg>';
  var ICON_X = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  function fileName(f) { return f.src.split('/').pop(); }
  function fileExt(f) { return (fileName(f).split('.').pop() || 'file').toLowerCase(); }

  function render(cat) {
    current = cat;
    $$('.tab', tabsEl).forEach(function (t) {
      var on = t.dataset.cat === cat;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    var list = FILES.filter(function (f) { return cat === ALL || f.category === cat; });
    shown = list;
    panelEl.innerHTML = list.length ? list.map(function (f, i) {
      var name = fileName(f);
      var ext = fileExt(f);
      return '<article class="file-card" data-idx="' + i + '">' +
        '<span class="file-badge ft-' + esc(ext) + '">' + esc(ext) + '</span>' +
        '<div class="file-body"><h3>' + esc(f.title) + '</h3><p>' + esc(f.desc) + '</p>' +
        '<span class="file-cat">' + esc(f.category) + '</span></div>' +
        '<div class="file-actions">' +
        '<button class="btn btn-ghost btn-sm" type="button" data-preview="' + i + '" aria-label="Lihat ' + esc(f.title) + '">' + ICON_EYE + 'Lihat</button>' +
        '<a class="btn btn-primary btn-sm" href="' + esc(f.src) + '" download="' + esc(name) + '">Unduh</a>' +
        '</div>' +
        '</article>';
    }).join('') : '<p class="chart-note">Belum ada file di kategori ini.</p>';
  }

  /* ---------- Laporan: pratinjau file (tombol "Lihat" / klik kartu) ---------- */
  var modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'file-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'file-modal-title');
  modal.innerHTML =
    '<div class="modal-dialog">' +
      '<div class="modal-head">' +
        '<div class="modal-title"><span class="file-badge" id="file-modal-badge"></span><h3 id="file-modal-title"></h3></div>' +
        '<div class="modal-actions">' +
          '<a class="btn btn-primary btn-sm" id="file-modal-dl" href="#" download>' + ICON_DL + '<span>Unduh</span></a>' +
          '<button class="icon-btn" id="file-modal-close" type="button" aria-label="Tutup pratinjau">' + ICON_X + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="modal-body" id="file-modal-body"></div>' +
    '</div>';
  document.body.appendChild(modal);

  var mBody = $('#file-modal-body', modal);
  var mTitle = $('#file-modal-title', modal);
  var mBadge = $('#file-modal-badge', modal);
  var mDl = $('#file-modal-dl', modal);
  var mClose = $('#file-modal-close', modal);
  var lastFocus = null;

  var IMG = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif'];
  var TXT = ['txt', 'md', 'json', 'csv'];
  var VID = ['mp4', 'webm'];
  var OFFICE = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'];

  function isPublicHost() {
    var h = location.hostname;
    if (!/^https?:$/.test(location.protocol)) return false;
    return !(h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || /^(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(h) || /\.local$/.test(h));
  }
  function absUrl(src) { return new URL(src, location.href).href; }

  function note(title, text, f) {
    return '<div class="preview-note"><h4>' + esc(title) + '</h4><p>' + esc(text) + '</p>' +
      '<div class="file-actions"><a class="btn btn-primary btn-sm" href="' + esc(f.src) + '" target="_blank" rel="noopener">Buka di tab baru</a>' +
      '<a class="btn btn-ghost btn-sm" href="' + esc(f.src) + '" download="' + esc(fileName(f)) + '">Unduh</a></div></div>';
  }

  function openPreview(i) {
    var f = shown[i];
    if (!f) return;
    var ext = fileExt(f);
    lastFocus = document.activeElement;
    mTitle.textContent = f.title;
    mBadge.className = 'file-badge ft-' + ext;
    mBadge.textContent = ext;
    mDl.href = f.src;
    mDl.setAttribute('download', fileName(f));
    mBody.innerHTML = '';

    if (ext === 'pdf') {
      mBody.innerHTML = '<iframe title="' + esc(f.title) + '" src="' + esc(f.src) + '"></iframe>';
    } else if (IMG.indexOf(ext) > -1) {
      mBody.innerHTML = '<img class="preview-img" src="' + esc(f.src) + '" alt="' + esc(f.title) + '">';
    } else if (VID.indexOf(ext) > -1) {
      mBody.innerHTML = '<video class="preview-img" src="' + esc(f.src) + '" controls playsinline></video>';
    } else if (TXT.indexOf(ext) > -1) {
      mBody.innerHTML = '<pre class="preview-text">Memuat…</pre>';
      fetch(f.src).then(function (r) { return r.text(); }).then(function (t) {
        var pre = $('pre', mBody); if (pre) pre.textContent = t;
      }).catch(function () { mBody.innerHTML = note('Pratinjau gagal dimuat', 'File tidak dapat ditampilkan. Coba buka di tab baru atau unduh.', f); });
    } else if (OFFICE.indexOf(ext) > -1) {
      if (isPublicHost()) {
        mBody.innerHTML = '<iframe title="' + esc(f.title) + '" src="https://view.officeapps.live.com/op/embed.aspx?src=' + encodeURIComponent(absUrl(f.src)) + '"></iframe>';
      } else {
        mBody.innerHTML = note('Pratinjau belum tersedia', 'Pratinjau file Office (Word, PowerPoint, Excel) hanya berfungsi setelah website diunggah ke internet. Untuk sementara, unduh file ini.', f);
      }
    } else {
      mBody.innerHTML = note('Pratinjau tidak tersedia', 'Format file ini tidak bisa ditampilkan langsung di browser.', f);
    }

    modal.classList.add('is-open');
    document.body.classList.add('modal-open');
    mClose.focus();
  }

  function closePreview() {
    if (!modal.classList.contains('is-open')) return;
    modal.classList.remove('is-open');
    document.body.classList.remove('modal-open');
    setTimeout(function () { if (!modal.classList.contains('is-open')) mBody.innerHTML = ''; }, 300);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  mClose.addEventListener('click', closePreview);
  modal.addEventListener('click', function (e) { if (e.target === modal) closePreview(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePreview(); });

  panelEl.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-preview]');
    if (btn) { openPreview(Number(btn.getAttribute('data-preview'))); return; }
    if (e.target.closest('a')) return; // tombol Unduh tetap berfungsi
    var card = e.target.closest('.file-card');
    if (card) openPreview(Number(card.getAttribute('data-idx')));
  });

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