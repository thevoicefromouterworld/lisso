/* Snowlit storefront — vanilla JS, sin dependencias */
(() => {
  'use strict';
  const S = window.STORE || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = n => new Intl.NumberFormat(S.brand?.locale || 'en-US', { style: 'currency', currency: S.brand?.currency || 'USD' }).format(n);
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem('snowlit_' + k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem('snowlit_' + k, JSON.stringify(v)); } catch {} }
  };

  /* ---------- Ilustraciones propias (SVG) ---------- */
  function rng(seed) { let x = seed; return () => (x = (x * 16807) % 2147483647) / 2147483647; }
  function flakes(n, x0, y0, w, h, seed, cls = 'flake') {
    const r = rng(seed); let out = '';
    for (let i = 0; i < n; i++) {
      const x = x0 + r() * w, y = y0 + r() * h, rad = .6 + r() * 1.6, o = .45 + r() * .55;
      out += `<circle class="${cls}${i % 5 === 0 ? ' twinkle' : ''}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(2)}" fill="#fff" fill-opacity="${o.toFixed(2)}" style="animation-delay:${(-r() * 3).toFixed(2)}s"/>`;
    }
    return out;
  }
  let uid = 0;
  /** El producto: caja transparente con farola y nieve */
  function productSVG(on = true) {
    const id = 's' + (++uid);
    return `<svg viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<defs>
  <radialGradient id="${id}g" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFE2A8" stop-opacity=".95"/><stop offset=".35" stop-color="#FFC877" stop-opacity=".45"/><stop offset="1" stop-color="#FFB45C" stop-opacity="0"/></radialGradient>
  <linearGradient id="${id}c" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".12" stop-color="#fff" stop-opacity=".04"/><stop offset=".9" stop-color="#fff" stop-opacity=".02"/><stop offset="1" stop-color="#fff" stop-opacity=".14"/></linearGradient>
  <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4F7FC"/><stop offset="1" stop-color="#C9D3E4"/></linearGradient>
  <clipPath id="${id}k"><rect x="52" y="34" width="196" height="326" rx="8"/></clipPath>
</defs>
<ellipse cx="150" cy="372" rx="120" ry="10" fill="#000" opacity=".55"/>
<g clip-path="url(#${id}k)">
  <rect x="52" y="34" width="196" height="326" fill="#0A0F1E"/>
  ${on ? `<circle cx="168" cy="132" r="120" fill="url(#${id}g)" class="lamp-glow"/>` : ''}
  <path d="M112 352 V140 q0 -26 26 -26 h34" fill="none" stroke="#2A3142" stroke-width="5" stroke-linecap="round"/>
  <path d="M112 352 V140 q0 -26 26 -26 h34" fill="none" stroke="#5A6680" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>
  <rect x="104" y="250" width="16" height="22" rx="2" fill="#2A3142"/><rect x="107" y="253" width="10" height="7" fill="#46516A"/>
  <path d="M160 114 h26 l-4 9 h-18z" fill="#2A3142"/>
  <ellipse cx="173" cy="124" rx="9" ry="3.2" fill="${on ? '#FFF4D6' : '#6B7489'}"/>
  ${on ? `<path d="M164 124 L130 300 L220 300 L182 124Z" fill="#FFD58A" fill-opacity=".08" class="lamp-light"/>` : ''}
  ${flakes(260, 56, 40, 188, 300, 7)}
  <path d="M52 336 q30 -10 58 -4 t60 -2 t78 4 V360 H52z" fill="url(#${id}s)"/>
  ${flakes(40, 56, 330, 188, 28, 11)}
</g>
<rect x="52" y="34" width="196" height="326" rx="8" fill="url(#${id}c)" stroke="#C7D3EA" stroke-opacity=".55" stroke-width="2"/>
<rect x="52" y="34" width="196" height="10" rx="5" fill="#fff" opacity=".18"/>
<rect x="40" y="186" width="14" height="38" rx="3" fill="#E9EDF4"/><rect x="43" y="196" width="6" height="10" rx="1.5" fill="#B9C2D2"/>
</svg>`;
  }
  /** Escena de habitación a oscuras para la sección interactiva */
  function roomSVG() {
    const id = 'r' + (++uid);
    return `<svg viewBox="0 0 500 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
<defs>
  <radialGradient id="${id}w" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFC877" stop-opacity=".5"/><stop offset=".5" stop-color="#FF9F45" stop-opacity=".12"/><stop offset="1" stop-color="#FF9F45" stop-opacity="0"/></radialGradient>
  <linearGradient id="${id}d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A1410"/><stop offset="1" stop-color="#0B0806"/></linearGradient>
</defs>
<rect width="500" height="400" fill="#070A14"/>
<rect x="300" y="40" width="150" height="170" rx="4" fill="#0B1226" stroke="#141C33" stroke-width="6"/>
<path d="M375 40v170M300 125h150" stroke="#141C33" stroke-width="5"/>
${flakes(70, 304, 44, 142, 162, 23, 'outside')}
<ellipse cx="190" cy="230" rx="230" ry="190" fill="url(#${id}w)" class="wall-glow"/>
<rect x="0" y="300" width="500" height="100" fill="url(#${id}d)"/>
<rect x="0" y="298" width="500" height="4" fill="#3A2C1E" class="wall-glow"/>
<rect x="40" y="262" width="54" height="38" rx="4" fill="#141A2A"/><rect x="46" y="250" width="46" height="14" rx="3" fill="#1C2338"/>
<path d="M410 300 v-26 q0 -14 14 -14 h10 q14 0 14 14 v26" fill="#121827"/>
<g transform="translate(130 136) scale(.42)">${productSVG(true)}</g>
<ellipse cx="193" cy="304" rx="70" ry="8" fill="#FFC877" fill-opacity=".22" class="wall-glow"/>
</svg>`;
  }

  const ART = {
    bed: '<svg viewBox="0 0 120 90" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M10 70V40M10 58h100v12M110 70V52q0-8-8-8H46v14"/><rect x="18" y="46" width="22" height="12" rx="5"/><rect x="70" y="18" width="18" height="24" rx="3"/><path d="M79 26v10" opacity=".6"/></svg>',
    desk: '<svg viewBox="0 0 120 90" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M8 62h104M18 62v20M102 62v20"/><rect x="22" y="22" width="44" height="30" rx="3"/><path d="M44 52v10"/><rect x="80" y="34" width="16" height="28" rx="2"/><path d="M84 58V42q0-4 4-4h3" opacity=".7"/></svg>',
    gift: '<svg viewBox="0 0 120 90" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><rect x="30" y="34" width="60" height="46" rx="3"/><rect x="26" y="24" width="68" height="12" rx="2"/><path d="M60 24v56"/><path d="M60 24c-6-12-22-12-20-2 2 6 14 4 20 2zM60 24c6-12 22-12 20-2-2 6-14 4-20 2z"/></svg>',
    diy: '<svg viewBox="0 0 120 90" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M30 76c0-14 8-22 18-22s18 8 18 22M54 76c0-14 8-22 18-22s18 8 18 22"/><circle cx="48" cy="36" r="10"/><circle cx="72" cy="36" r="10"/><path d="M58 18c2-4 6-4 4 0 4-4 6 0 2 2" opacity=".7"/></svg>'
  };

  /* ---------- Estado ---------- */
  const variants = S.variants || [];
  const bundles = S.bundles || [];
  const qs = new URLSearchParams(location.search);
  const state = {
    color: variants.find(v => v.id === qs.get('color'))?.id || variants[0]?.id,
    pack: bundles.find(b => b.id === qs.get('pack'))?.id || (bundles.find(b => b.default) || bundles[0])?.id,
    out: new Set()
  };
  const V = () => variants.find(v => v.id === state.color);
  const B = () => bundles.find(b => b.id === state.pack);

  /* ---------- Atribución (UTM / click IDs) ---------- */
  (function captureAttribution() {
    const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'ttclid', 'gclid'];
    const found = {};
    keys.forEach(k => { if (qs.get(k)) found[k] = qs.get(k); });
    if (Object.keys(found).length) store.set('attr', { ...found, ts: Date.now() });
    if (!store.get('vid')) store.set('vid', 'v' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36));
    if (qs.get('code')) store.set('promo', qs.get('code'));
  })();

  /* ---------- Píxeles (solo con consentimiento) ---------- */
  const T = S.tracking || {};
  const queue = [];
  let pixelsReady = false;
  function loadPixels() {
    if (pixelsReady) return; pixelsReady = true;
    if (T.metaPixelId) {
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s) }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', T.metaPixelId); fbq('track', 'PageView');
    }
    if (T.tiktokPixelId) {
      !function (w, d, t) { w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || []; ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"], ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } }; for (var i = 0; i < ttq.methods.length; i++)ttq.setAndDefer(ttq, ttq.methods[i]); ttq.instance = function (t) { for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++)ttq.setAndDefer(e, ttq.methods[n]); return e }, ttq.load = function (e, n) { var i = "https://analytics.tiktok.com/i18n/pixel/events.js"; ttq._i = ttq._i || {}, ttq._i[e] = [], ttq._i[e]._u = i, ttq._t = ttq._t || {}, ttq._t[e] = +new Date, ttq._o = ttq._o || {}, ttq._o[e] = n || {}; var o = document.createElement("script"); o.type = "text/javascript", o.async = !0, o.src = i + "?sdkid=" + e + "&lib=" + t; var a = document.getElementsByTagName("script")[0]; a.parentNode.insertBefore(o, a) }; ttq.load(T.tiktokPixelId); ttq.page() }(window, document, 'ttq');
    }
    if (T.ga4Id) {
      const s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + T.ga4Id; document.head.appendChild(s);
      window.dataLayer = window.dataLayer || []; window.gtag = function () { dataLayer.push(arguments); };
      gtag('js', new Date()); gtag('config', T.ga4Id);
    }
    queue.splice(0).forEach(([n, d, o]) => fire(n, d, o));
  }
  const MAP = {
    ViewContent: { tt: 'ViewContent', ga: 'view_item' },
    AddToCart: { tt: 'AddToCart', ga: 'add_to_cart' },
    InitiateCheckout: { tt: 'InitiateCheckout', ga: 'begin_checkout' },
    Purchase: { tt: 'CompletePayment', ga: 'purchase' }
  };
  function fire(name, data = {}, opts = {}) {
    if (!pixelsReady) { queue.push([name, data, opts]); return; }
    const m = MAP[name] || {};
    try { window.fbq && fbq('track', name, data, opts.eventID ? { eventID: opts.eventID } : undefined); } catch {}
    try { window.ttq && ttq.track(m.tt || name, { ...data, content_type: 'product', event_id: opts.eventID }); } catch {}
    try { window.gtag && gtag('event', m.ga || name, { currency: data.currency, value: data.value, transaction_id: opts.eventID }); } catch {}
  }

  function initConsent() {
    const box = $('#consent');
    const decided = store.get('consent');
    const hasPixels = T.metaPixelId || T.tiktokPixelId || T.ga4Id;
    if (decided === 'grant') loadPixels();
    if (!decided && hasPixels && box) box.hidden = false;
    $$('[data-consent]').forEach(b => b.addEventListener('click', () => {
      const v = b.dataset.consent; store.set('consent', v); box.hidden = true;
      if (v === 'grant') loadPixels();
    }));
    $$('[data-open-consent]').forEach(b => b.addEventListener('click', () => { if (box) box.hidden = false; }));
  }

  /* ---------- UI ---------- */
  const CUR = S.brand?.currency || 'USD';
  const media = () => ['hero', 'detail', 'lifestyle'].map(k => ({ k, src: `assets/media/${k}.jpg` }));
  const gallery = { idx: 0, items: [] };

  function renderSwatches() {
    const field = $('#colorField'), wrap = $('#swatches');
    if (field && variants.length < 2) { field.hidden = true; return; }
    if (!wrap) return;
    wrap.setAttribute('role', 'radiogroup');
    wrap.innerHTML = variants.map(v => `<button type="button" class="swatch${state.out.has(v.id) ? ' is-out' : ''}" role="radio" style="--c:${v.hex}" aria-label="${v.name}${state.out.has(v.id) ? ' (sold out)' : ''}" aria-checked="${v.id === state.color}" data-color="${v.id}"></button>`).join('');
    $$('.swatch', wrap).forEach(b => b.addEventListener('click', () => setColor(b.dataset.color)));
  }
  /** Galería: ilustración propia + fotos reales del producto si existen (las descarga el build) */
  async function initGallery() {
    const ok = src => new Promise(res => { const im = new Image(); im.onload = () => res(im.naturalWidth > 50); im.onerror = () => res(false); im.src = src; });
    const photos = [];
    for (const m of media()) if (await ok(m.src)) photos.push(m);
    gallery.items = [...photos.slice(0, 1), { k: 'art' }, ...photos.slice(1)];
    if (!photos.length) gallery.items = [{ k: 'art' }];
    const thumbs = $('#thumbs');
    if (thumbs && gallery.items.length > 1) {
      thumbs.innerHTML = gallery.items.map((m, i) => `<button type="button" class="thumb" role="tab" aria-selected="${i === 0}" aria-label="Image ${i + 1}" data-i="${i}">${m.k === 'art' ? productSVG() : `<img src="${m.src}" alt="">`}</button>`).join('');
      $$('.thumb', thumbs).forEach(b => b.addEventListener('click', () => showSlide(+b.dataset.i)));
    }
    const detail = photos.find(p => p.k === 'detail'), life = photos.find(p => p.k === 'lifestyle');
    if (detail && life) { $('#photoDetail').src = detail.src; $('#photoLifestyle').src = life.src; $('#photos').hidden = false; }
    showSlide(0);
  }
  function showSlide(i) {
    gallery.idx = i;
    const m = gallery.items[i] || { k: 'art' };
    const scene = $('#heroScene'), photo = $('#heroPhoto'), stage = $('#stage');
    if (m.k === 'art') { scene.innerHTML = productSVG(); scene.hidden = false; photo.hidden = true; stage.classList.remove('is-photo'); }
    else { photo.src = m.src; photo.alt = `${S.brand?.productName} photo`; photo.hidden = false; scene.hidden = true; stage.classList.add('is-photo'); }
    $$('.thumb').forEach(t => t.setAttribute('aria-selected', String(+t.dataset.i === i)));
  }
  function renderBundles() {
    const wrap = $('#bundles'); if (!wrap) return;
    wrap.setAttribute('role', 'radiogroup');
    wrap.innerHTML = bundles.map(b => {
      const unit = b.price / b.qty;
      return `<button type="button" class="bundle" role="radio" aria-checked="${b.id === state.pack}" data-pack="${b.id}">
        ${b.badge ? `<span class="bundle__badge${b.qty === 3 ? ' bundle__badge--alt' : ''}">${b.badge}</span>` : ''}
        <span class="bundle__radio" aria-hidden="true"></span>
        <span><span class="bundle__name">${b.label}</span><span class="bundle__sub">${b.qty > 1 ? fmt(unit) + ' each' : 'Just for you'}</span></span>
        <span class="bundle__price">${fmt(b.price)}${b.compareAt ? `<s>${fmt(b.compareAt)}</s>` : ''}</span>
      </button>`;
    }).join('');
    $$('.bundle', wrap).forEach(b => b.addEventListener('click', () => setPack(b.dataset.pack)));
  }
  function renderSpecs() {
    const dl = $('#specs'); if (!dl || !S.specs) return;
    dl.innerHTML = S.specs.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  }
  function update() {
    const v = V(), b = B(); if (!v || !b) return;
    $('#colorName') && ($('#colorName').textContent = v.name);
    $('#priceNow').textContent = fmt(b.price);
    const was = $('#priceWas'), save = $('#priceSave');
    if (b.compareAt) { was.textContent = fmt(b.compareAt); was.hidden = false; save.textContent = 'Save ' + Math.round((1 - b.price / b.compareAt) * 100) + '% vs. singles'; save.hidden = false; }
    else { was.hidden = true; save.hidden = true; }
    $('#priceUnit').textContent = (b.qty > 1 ? fmt(b.price / b.qty) + ' each · ' : '') + 'Free US shipping';
    const out = state.out.has(v.id);
    $('#buyLabel').textContent = out ? 'Sold out — back soon' : `Buy ${b.qty > 1 ? b.qty + '-pack' : 'now'} · ${fmt(b.price)}`;
    $('#buyBtn').disabled = out;
    $('#stickyPrice').textContent = fmt(b.price);
    $('#stickyLabel').textContent = b.label;
    $$('.swatch').forEach(s => s.setAttribute('aria-checked', s.dataset.color === v.id));
    $$('.bundle').forEach(s => s.setAttribute('aria-checked', s.dataset.pack === b.id));
    const url = new URL(location.href); url.searchParams.set('pack', b.id); if (variants.length > 1) url.searchParams.set('color', v.id);
    history.replaceState(null, '', url);
  }
  function setColor(id) { state.color = id; update(); }
  function setPack(id) { state.pack = id; update(); }

  /* ---------- Checkout ---------- */
  function checkoutURL() {
    const base = (S.paymentLinks || {})[`${state.pack}:${state.color}`];
    if (!base) return null;
    const u = new URL(base);
    u.searchParams.set('locale', (S.brand?.locale || 'en').slice(0, 2));
    const vid = (store.get('vid') || '').replace(/[^a-zA-Z0-9_-]/g, '');
    if (vid) u.searchParams.set('client_reference_id', vid);
    const promo = store.get('promo');
    if (promo) u.searchParams.set('prefilled_promo_code', promo);
    return u.toString();
  }
  function buy(e) {
    const btn = e.currentTarget;
    const b = B(), v = V();
    const url = checkoutURL();
    const data = { value: b.price, currency: CUR, content_ids: [`${b.id}-${v.id}`], content_name: S.brand?.productName, num_items: b.qty };
    fire('AddToCart', data); fire('InitiateCheckout', data);
    if (!url) { alert('Our store is being set up. Please check back in a few minutes.'); return; }
    btn.classList.add('is-loading');
    store.set('last', { pack: b.id, color: v.id, value: b.price, ts: Date.now() });
    setTimeout(() => { location.href = url; }, 120);
  }

  /* ---------- Lights on ---------- */
  function initLights() {
    const room = $('#room'), sw = $('#lightSwitch'); if (!room || !sw) return;
    $('#roomScene').innerHTML = roomSVG();
    const set = on => { room.dataset.on = String(on); sw.setAttribute('aria-checked', String(on)); $('#switchLabel').textContent = on ? 'Switch it off' : 'Switch it on'; };
    sw.addEventListener('click', () => set(room.dataset.on !== 'true'));
    room.addEventListener('click', () => set(room.dataset.on !== 'true'));
    new IntersectionObserver(([en], o) => { if (en.isIntersecting) { setTimeout(() => set(true), 700); o.disconnect(); } }, { threshold: .55 }).observe(room);
  }

  /* ---------- Datos dinámicos (stock / reseñas) ---------- */
  async function loadStock() {
    try {
      const r = await fetch('data/stock.json', { cache: 'no-cache' }); if (!r.ok) return;
      const d = await r.json();
      Object.entries(d.variants || {}).forEach(([id, s]) => { if (s && s.available === false) state.out.add(id); });
      if (state.out.has(state.color)) { const alt = variants.find(v => !state.out.has(v.id)); if (alt) state.color = alt.id; }
      renderSwatches(); update();
      const low = Object.entries(d.variants || {}).find(([id, s]) => id === state.color && s.low);
      const note = $('#stockNote'); if (note && low) { note.textContent = 'Low stock in our US warehouse.'; note.hidden = false; }
    } catch {}
  }
  async function loadReviews() {
    try {
      const r = await fetch('data/reviews.json', { cache: 'no-cache' }); if (!r.ok) return;
      const list = (await r.json()).filter(x => x.verified);
      if (!list.length) return;
      const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
      $('#reviews').innerHTML = list.slice(0, 6).map(x => `<article class="review"><div class="review__stars" aria-label="${x.rating} out of 5">${'★'.repeat(x.rating)}${'☆'.repeat(5 - x.rating)}</div><p>${esc(x.text)}</p><small>${esc(x.name)} · Verified buyer</small></article>`).join('');
      $('#reviews-section').hidden = false;
    } catch {}
  }

  /* ---------- Misc ---------- */
  function initChrome() {
    const header = $('.header');
    const onScroll = () => header && header.classList.toggle('is-scrolled', scrollY > 8);
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
    const sticky = $('#sticky'), buyBtn = $('#buyBtn');
    if (sticky && buyBtn) {
      new IntersectionObserver(([en]) => {
        const show = !en.isIntersecting && en.boundingClientRect.top < 0;
        sticky.classList.toggle('is-visible', show);
        sticky.setAttribute('aria-hidden', String(!show));
        $('#stickyBtn').tabIndex = show ? 0 : -1;
      }).observe(buyBtn);
    }
    $$('[data-support-email]').forEach(a => { a.href = 'mailto:' + S.brand?.supportEmail; a.textContent = S.brand?.supportEmail; });
    $$('[data-year]').forEach(e => e.textContent = new Date().getFullYear());
    $$('[data-ship-days]').forEach(e => e.textContent = `${S.shipping?.minDays}–${S.shipping?.maxDays}`);
    // Fecha límite de Navidad: se oculta sola cuando pasa
    const cut = S.shipping?.christmasCutoff ? new Date(S.shipping.christmasCutoff + 'T23:59:00') : null;
    if (cut) {
      const label = cut.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      $$('[data-cutoff]').forEach(e => e.textContent = label);
      if (Date.now() > cut.getTime()) $$('[data-xmas]').forEach(e => { e.hidden = true; const sep = e.nextElementSibling; if (sep && sep.getAttribute('aria-hidden')) sep.hidden = true; });
    }
    $$('.use__art').forEach(el => { const k = [...el.classList].find(c => c.startsWith('use__art--'))?.slice(10); if (ART[k]) el.innerHTML = ART[k]; });
    const els = $$('.section .section__head, .use, .step, .specs-grid > *, .faq, .table-wrap, .guarantee, .lights > *, .photos > *');
    els.forEach(e => e.classList.add('reveal'));
    const io = new IntersectionObserver(en => en.forEach(x => { if (x.isIntersecting) { x.target.classList.add('is-in'); io.unobserve(x.target); } }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach(e => io.observe(e));
  }

  function initProduct() {
    if (!$('#buyBtn')) return;
    renderSwatches(); renderBundles(); renderSpecs(); update();
    initGallery();
    $('#buyBtn').addEventListener('click', buy);
    $('#stickyBtn').addEventListener('click', buy);
    const b = B();
    fire('ViewContent', { value: b.price, currency: CUR, content_ids: [`${b.id}-${state.color}`], content_name: S.brand?.productName, content_type: 'product' });
    loadStock(); loadReviews();
  }

  // duplica el contenido del anuncio para un marquee continuo en móvil
  const tr = $('.announce__track'); if (tr) tr.innerHTML += '<span class="dup" aria-hidden="true">·</span>' + tr.innerHTML.replace(/<span( aria-hidden="true")?( data-xmas(="")?)?>/g, '<span class="dup" aria-hidden="true"$2>');
  window.SnowlitArt = productSVG;
  window.SnowlitTrack = fire;
  initChrome();
  initConsent();
  initProduct();
  initLights();
})();
