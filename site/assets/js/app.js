/* Lisso storefront — vanilla JS, sin dependencias */
(() => {
  'use strict';
  const S = window.STORE || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = n => new Intl.NumberFormat('es-ES', { style: 'currency', currency: S.brand?.currency || 'EUR' }).format(n);
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem('lisso_' + k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem('lisso_' + k, JSON.stringify(v)); } catch {} }
  };

  /* ---------- Render del producto (SVG propio) ---------- */
  let uid = 0;
  function deviceSVG(v) {
    const id = 'd' + (++uid);
    const dark = v.id === 'grafito';
    return `<svg viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<defs>
  <linearGradient id="${id}b" x1="0" x2="1"><stop offset="0" stop-color="${v.accent}"/><stop offset=".28" stop-color="${v.hex}"/><stop offset=".62" stop-color="${v.hex}"/><stop offset="1" stop-color="${v.accent}"/></linearGradient>
  <radialGradient id="${id}h" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="${dark ? '#5a585c' : '#fff'}"/><stop offset=".55" stop-color="${v.hex}"/><stop offset="1" stop-color="${v.accent}"/></radialGradient>
  <radialGradient id="${id}m" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#F4F4F2"/><stop offset=".6" stop-color="#BDBDBA"/><stop offset="1" stop-color="#8C8C89"/></radialGradient>
  <pattern id="${id}p" width="10" height="17.32" patternUnits="userSpaceOnUse"><circle cx="5" cy="4.33" r="2.6" fill="#55554F" opacity=".72"/><circle cx="0" cy="12.99" r="2.6" fill="#55554F" opacity=".72"/><circle cx="10" cy="12.99" r="2.6" fill="#55554F" opacity=".72"/></pattern>
  <clipPath id="${id}c"><circle cx="150" cy="128" r="74"/></clipPath>
  <linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
</defs>
<rect x="98" y="168" width="104" height="214" rx="52" fill="url(#${id}b)"/>
<rect x="110" y="190" width="14" height="160" rx="7" fill="url(#${id}g)" opacity="${dark ? .25 : .7}"/>
<circle cx="150" cy="128" r="112" fill="url(#${id}h)"/>
<circle cx="150" cy="128" r="112" fill="none" stroke="${v.accent}" stroke-opacity=".5"/>
<circle cx="150" cy="128" r="96" fill="#fff" fill-opacity="${dark ? .12 : .45}" stroke="#fff" stroke-opacity=".8" stroke-width="1.5"/>
<g fill="#A49C92" opacity=".55">
  <circle cx="72" cy="120" r="5"/><circle cx="80" cy="96" r="3.5"/><circle cx="226" cy="140" r="4.5"/><circle cx="214" cy="178" r="3.5"/><circle cx="100" cy="190" r="4"/><circle cx="196" cy="70" r="3"/>
</g>
<circle cx="150" cy="128" r="78" fill="url(#${id}m)"/>
<g clip-path="url(#${id}c)"><rect x="70" y="50" width="160" height="160" fill="url(#${id}p)"/></g>
<circle cx="150" cy="128" r="78" fill="none" stroke="#7d7d79" stroke-width="2"/>
<circle cx="150" cy="128" r="12" fill="#E9E9E6" stroke="#8C8C89"/>
<ellipse cx="118" cy="82" rx="40" ry="16" fill="#fff" opacity=".35" transform="rotate(-28 118 82)"/>
<circle cx="150" cy="262" r="19" fill="${dark ? '#2a292b' : '#fff'}" stroke="${v.accent}" stroke-width="2"/>
<circle cx="150" cy="262" r="11" fill="none" stroke="#7BC4A1" stroke-width="2.5" opacity=".9"/>
<path d="M150 254v8" stroke="#7BC4A1" stroke-width="2.5" stroke-linecap="round"/>
<rect x="138" y="368" width="24" height="7" rx="3.5" fill="#1C1A17" opacity=".75"/>
</svg>`;
  }

  /* ---------- Texturas antes/después ---------- */
  const svgURI = s => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
  function setTextures() {
    const knit = `<svg xmlns='http://www.w3.org/2000/svg' width='44' height='52'><g fill='none' stroke-linecap='round' stroke-width='9'><path d='M5 4 L22 26' stroke='#A75A47'/><path d='M39 4 L22 26' stroke='#9B5140'/><path d='M5 30 L22 52' stroke='#A75A47'/><path d='M39 30 L22 52' stroke='#9B5140'/></g><g fill='none' stroke='#C67A64' stroke-width='2' opacity='.55'><path d='M8 7 L20 22'/><path d='M8 33 L20 48'/></g></svg>`;
    let pills = `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><defs><radialGradient id='g'><stop offset='0' stop-color='#E6C3B5'/><stop offset='.6' stop-color='#C99583'/><stop offset='1' stop-color='#B57D6A' stop-opacity='0'/></radialGradient></defs>`;
    const pts = [[22,30,9],[70,18,7],[120,40,11],[180,22,8],[200,80,10],[150,96,7],[96,88,12],[40,104,8],[20,160,10],[76,150,7],[130,170,11],[190,150,9],[170,204,7],[60,206,9],[110,128,6],[206,196,6]];
    pts.forEach(([x, y, r]) => { pills += `<circle cx='${x}' cy='${y}' r='${r}' fill='url(#g)'/><circle cx='${x - r / 3}' cy='${y - r / 3}' r='${r / 3}' fill='#F2DCD2' opacity='.6'/>`; });
    pills += '</svg>';
    let fuzz = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><g stroke='#D9AE9C' stroke-width='1.2' opacity='.55' fill='none' stroke-linecap='round'>`;
    for (let i = 0; i < 70; i++) { const x = (i * 37) % 160, y = (i * 61) % 160, a = (i * 47) % 360 * Math.PI / 180; fuzz += `<path d='M${x} ${y} q ${6 * Math.cos(a)} ${6 * Math.sin(a)} ${10 * Math.cos(a + .6)} ${10 * Math.sin(a + .6)}'/>`; }
    fuzz += '</g></svg>';
    const el = $('#compare');
    if (!el) return;
    el.style.setProperty('--knit', svgURI(knit));
    el.style.setProperty('--pills', svgURI(pills));
    el.style.setProperty('--fuzz', svgURI(fuzz));
  }

  const ART = {
    sweater: '<svg viewBox="0 0 120 90" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M44 10 L28 16 L10 40 L20 50 L30 40 L30 82 L90 82 L90 40 L100 50 L110 40 L92 16 L76 10 Q60 22 44 10Z"/><path d="M30 74h60M38 30v6M60 34v6M82 30v6M48 50v6M72 50v6" opacity=".5"/></svg>',
    coat: '<svg viewBox="0 0 120 90" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M46 6 L30 12 L18 50 L26 84 L58 84 L58 30 L46 6Z M74 6 L90 12 L102 50 L94 84 L62 84 L62 30 L74 6Z"/><circle cx="66" cy="44" r="1.8"/><circle cx="66" cy="58" r="1.8"/><circle cx="66" cy="72" r="1.8"/><path d="M34 60h14M72 60h14" opacity=".5"/></svg>',
    sofa: '<svg viewBox="0 0 120 90" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M22 52 V30 Q22 22 30 22 H90 Q98 22 98 30 V52"/><path d="M10 50 Q10 42 18 42 Q26 42 26 50 V62 H94 V50 Q94 42 102 42 Q110 42 110 50 V72 H10Z"/><path d="M60 26v34M18 72v8M102 72v8" opacity=".6"/></svg>',
    blanket: '<svg viewBox="0 0 120 90" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M14 22 H98 Q106 22 106 30 V58 Q106 66 98 66 H22"/><path d="M14 22 V66 Q14 74 22 74 H98" /><path d="M22 66 Q14 66 14 58"/><path d="M30 34h56M30 44h56M30 54h40" opacity=".45"/><path d="M98 74v6M88 74v6M78 74v6M68 74v6" opacity=".6"/></svg>'
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
  window.LissoTrack = fire;

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
  function renderSwatches() {
    const wrap = $('#swatches'); if (!wrap) return;
    wrap.setAttribute('role', 'radiogroup');
    wrap.innerHTML = variants.map(v => `<button type="button" class="swatch${state.out.has(v.id) ? ' is-out' : ''}" role="radio" style="--c:${v.hex}" aria-label="${v.name}${state.out.has(v.id) ? ' (agotado)' : ''}" aria-checked="${v.id === state.color}" data-color="${v.id}"></button>`).join('');
    $$('.swatch', wrap).forEach(b => b.addEventListener('click', () => setColor(b.dataset.color)));
    const thumbs = $('#thumbs');
    if (thumbs) {
      thumbs.innerHTML = variants.map(v => `<button type="button" class="thumb" role="tab" aria-selected="${v.id === state.color}" aria-label="Ver color ${v.name}" data-color="${v.id}">${deviceSVG(v)}</button>`).join('');
      $$('.thumb', thumbs).forEach(b => b.addEventListener('click', () => setColor(b.dataset.color)));
    }
  }
  function renderBundles() {
    const wrap = $('#bundles'); if (!wrap) return;
    wrap.setAttribute('role', 'radiogroup');
    wrap.innerHTML = bundles.map(b => {
      const unit = b.price / b.qty;
      return `<button type="button" class="bundle" role="radio" aria-checked="${b.id === state.pack}" data-pack="${b.id}">
        ${b.badge ? `<span class="bundle__badge${b.qty === 3 ? ' bundle__badge--alt' : ''}">${b.badge}</span>` : ''}
        <span class="bundle__radio" aria-hidden="true"></span>
        <span><span class="bundle__name">${b.label}</span><span class="bundle__sub">${b.qty > 1 ? fmt(unit) + ' / unidad' : 'Prueba individual'}</span></span>
        <span class="bundle__price">${fmt(b.price)}${b.compareAt ? `<s>${fmt(b.compareAt)}</s>` : ''}</span>
      </button>`;
    }).join('');
    $$('.bundle', wrap).forEach(b => b.addEventListener('click', () => setPack(b.dataset.pack)));
  }
  function renderSpecs() {
    const dl = $('#specs'); if (!dl || !S.specs) return;
    dl.innerHTML = S.specs.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  }
  function renderDevice() {
    const v = V(); if (!v) return;
    const hero = $('#heroDevice');
    if (hero) hero.innerHTML = deviceSVG(v);
    const photo = $('#heroPhoto');
    if (photo && v.photo) { photo.src = v.photo; photo.alt = 'Quitapelusas Lisso color ' + v.name; photo.hidden = false; } else if (photo) photo.hidden = true;
  }
  function update() {
    const v = V(), b = B(); if (!v || !b) return;
    $('#colorName') && ($('#colorName').textContent = v.name);
    $('#priceNow').textContent = fmt(b.price);
    const was = $('#priceWas'), save = $('#priceSave');
    if (b.compareAt) { was.textContent = fmt(b.compareAt); was.hidden = false; save.textContent = 'Ahorras ' + Math.round((1 - b.price / b.compareAt) * 100) + '% vs. sueltos'; save.hidden = false; }
    else { was.hidden = true; save.hidden = true; }
    $('#priceUnit').textContent = (b.qty > 1 ? fmt(b.price / b.qty) + ' por unidad · ' : '') + 'IVA incluido · Envío gratis';
    $('#buyLabel').textContent = state.out.has(v.id) ? 'Agotado en ' + v.name : `Comprar ${b.label.toLowerCase()} · ${fmt(b.price)}`;
    $('#buyBtn').disabled = state.out.has(v.id);
    $('#stickyPrice').textContent = fmt(b.price);
    $('#stickyLabel').textContent = `${b.label} · ${v.name}`;
    $$('.swatch').forEach(s => s.setAttribute('aria-checked', s.dataset.color === v.id));
    $$('.thumb').forEach(s => s.setAttribute('aria-selected', s.dataset.color === v.id));
    $$('.bundle').forEach(s => s.setAttribute('aria-checked', s.dataset.pack === b.id));
    const url = new URL(location.href); url.searchParams.set('color', v.id); url.searchParams.set('pack', b.id);
    history.replaceState(null, '', url);
  }
  function setColor(id) { state.color = id; renderDevice(); update(); }
  function setPack(id) { state.pack = id; update(); }

  /* ---------- Checkout ---------- */
  function checkoutURL() {
    const key = `${state.pack}:${state.color}`;
    const base = (S.paymentLinks || {})[key];
    if (!base) return null;
    const u = new URL(base);
    u.searchParams.set('locale', 'es');
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
    const data = { value: b.price, currency: 'EUR', content_ids: [`${b.id}-${v.id}`], content_name: S.brand?.productName, num_items: b.qty };
    fire('AddToCart', data); fire('InitiateCheckout', data);
    if (!url) {
      alert('La tienda se está configurando. Vuelve en unos minutos.');
      return;
    }
    btn.classList.add('is-loading');
    store.set('last', { pack: b.id, color: v.id, value: b.price, ts: Date.now() });
    setTimeout(() => { location.href = url; }, 120);
  }

  /* ---------- Antes/después ---------- */
  function initCompare() {
    const el = $('#compare'); if (!el) return;
    const r = $('.compare__range', el);
    r.addEventListener('input', () => el.style.setProperty('--pos', r.value + '%'));
    // pequeña animación de invitación
    let played = false;
    new IntersectionObserver(([en], o) => {
      if (!en.isIntersecting || played) return; played = true; o.disconnect();
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const seq = [50, 78, 22, 50]; let i = 0;
      const step = () => { if (i >= seq.length) return; const to = seq[i++]; animate(+r.value, to, 650, x => { r.value = x; el.style.setProperty('--pos', x + '%'); }, step); };
      step();
    }, { threshold: .6 }).observe(el);
  }
  function animate(from, to, ms, cb, done) {
    const t0 = performance.now();
    const tick = t => { const p = Math.min(1, (t - t0) / ms), e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; cb(from + (to - from) * e); p < 1 ? requestAnimationFrame(tick) : done && done(); };
    requestAnimationFrame(tick);
  }

  /* ---------- Datos dinámicos (stock / reseñas) ---------- */
  async function loadStock() {
    try {
      const r = await fetch('data/stock.json', { cache: 'no-cache' }); if (!r.ok) return;
      const d = await r.json();
      Object.entries(d.variants || {}).forEach(([id, s]) => { if (s && s.available === false) state.out.add(id); });
      if (state.out.has(state.color)) { const alt = variants.find(v => !state.out.has(v.id)); if (alt) state.color = alt.id; }
      renderSwatches(); renderDevice(); update();
      const low = Object.entries(d.variants || {}).find(([id, s]) => id === state.color && s.low);
      const note = $('#stockNote'); if (note && low) { note.textContent = 'Quedan pocas unidades en este color.'; note.hidden = false; }
    } catch {}
  }
  async function loadReviews() {
    try {
      const r = await fetch('data/reviews.json', { cache: 'no-cache' }); if (!r.ok) return;
      const list = (await r.json()).filter(x => x.verified);
      if (!list.length) return;
      const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
      $('#reviews').innerHTML = list.slice(0, 6).map(x => `<article class="review"><div class="review__stars" aria-label="${x.rating} de 5">${'★'.repeat(x.rating)}${'☆'.repeat(5 - x.rating)}</div><p>${esc(x.text)}</p><small>${esc(x.name)} · Compra verificada</small></article>`).join('');
      $('#opiniones').hidden = false;
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
    $$('[data-ship-days]').forEach(e => e.textContent = `${S.shipping?.minDays}-${S.shipping?.maxDays}`);
    const eta = $('#shipEta'); if (eta && S.shipping) eta.textContent = `Llega en ${S.shipping.minDays}-${S.shipping.maxDays} días laborables`;
    $$('.use__art').forEach(el => { const k = [...el.classList].find(c => c.startsWith('use__art--'))?.slice(10); if (ART[k]) el.innerHTML = ART[k]; });
    const els = $$('.section .section__head, .use, .step, .specs-grid > *, .faq, .table-wrap, .compare, .guarantee');
    els.forEach(e => e.classList.add('reveal'));
    const io = new IntersectionObserver(en => en.forEach(x => { if (x.isIntersecting) { x.target.classList.add('is-in'); io.unobserve(x.target); } }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach(e => io.observe(e));
  }

  function initProduct() {
    if (!$('#buyBtn')) return;
    renderSwatches(); renderBundles(); renderSpecs(); renderDevice(); update();
    $('#buyBtn').addEventListener('click', buy);
    $('#stickyBtn').addEventListener('click', buy);
    const b = B();
    fire('ViewContent', { value: b.price, currency: 'EUR', content_ids: [`${b.id}-${state.color}`], content_name: S.brand?.productName, content_type: 'product' });
    loadStock(); loadReviews();
  }

  // duplica el contenido del anuncio para un marquee continuo en móvil
  const tr = $('.announce__track'); if (tr) tr.innerHTML += '<span class="dup" aria-hidden="true">·</span>' + tr.innerHTML.replace(/<span( aria-hidden="true")?>/g, '<span class="dup" aria-hidden="true">');
  window.LissoDevice = deviceSVG;
  setTextures();
  initChrome();
  initConsent();
  initProduct();
  initCompare();
})();
