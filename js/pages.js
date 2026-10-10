// Lógica específica de cada página.

function productCard(p) {
  const sizes = Inventory.sizesOf(p);
  const soldOut = Inventory.total(p) === 0;
  return `
  <article class="card" data-id="${p.id}">
    ${productImg(p)}
    <h3>${esc(p.name)}</h3>
    <p>${esc(p.desc)}</p>
    <div class="sizes" role="group" aria-label="Talle">
      ${sizes.map(s => `<button type="button" class="size${p.oneSize && p.stock[s] > 0 ? ' sel' : ''}" data-size="${s}"${p.stock[s] <= 0 ? ' disabled title="Sin stock"' : ''}>${s}</button>`).join('')}
    </div>
    <div class="stockline ${Inventory.status(p)}">
      <span class="stockline-lbl">${{ ok: 'En stock', low: '¡Últimas unidades!', out: 'Agotado' }[Inventory.status(p)]} · ${Inventory.total(p)} u.</span>
      ${sizes.length > 1 ? `<small>${sizes.map(z => `${z}: ${p.stock[z]}`).join(' · ')}</small>` : ''}
    </div>
    <div class="buy"><b>${money(p.price)}</b><button type="button" class="btn btn-sm" data-add${soldOut ? ' disabled' : ''}>${soldOut ? 'Agotado' : 'Agregar'}</button></div>
  </article>`;
}

function bindProductCards(root) {
  root.addEventListener('click', e => {
    const card = e.target.closest('.card');
    if (!card) return;
    const size = e.target.closest('.size');
    if (size) {
      card.querySelectorAll('.size').forEach(b => b.classList.remove('sel'));
      size.classList.add('sel');
      return;
    }
    if (e.target.closest('[data-add]')) {
      const sel = card.querySelector('.size.sel');
      if (!sel) { toast('Elegí un talle primero'); return; }
      const p = PRODUCTS.find(x => x.id === card.dataset.id);
      const s = sel.dataset.size;
      const key = p.id + '-' + s;
      const inCart = (Cart.get().find(l => l.key === key) || {}).qty || 0;
      if (inCart >= p.stock[s]) { toast('No hay más stock de ese talle'); return; }
      Cart.add({ key, id: p.id, name: p.name, size: s, price: p.price });
      toast('Agregado al carrito');
    }
  });
}

function initPage(page) {
  ({ home: initHome, catalog: initCatalog, combos: initCombos, checkout: initCheckout, local: initLocal }[page] || (() => {}))();
}

/* ---------- Inicio ---------- */
function initHome() {
  const grid = document.getElementById('featured');
  grid.innerHTML = PRODUCTS.filter(p => p.featured).map(productCard).join('');
  bindProductCards(grid);
  document.getElementById('comboTeasers').innerHTML = COMBOS.map(c => `
    <a class="combo-card" href="combos.html#${c.id}"><small>${esc(c.name)}</small><b>${esc(c.label)}</b><span>Armar combo →</span></a>`).join('');
}

/* ---------- Catálogo ---------- */
function initCatalog() {
  const params = new URLSearchParams(location.search);
  const state = { cat: params.get('cat') || 'todo', fit: params.get('fit') || '', sort: 'default' };
  const catEl = document.getElementById('catChips');
  const fitEl = document.getElementById('fitChips');
  const grid = document.getElementById('grid');

  const chip = (label, val, on, attr) => `<button type="button" class="chip${on ? ' on' : ''}" data-${attr}="${val}">${label}</button>`;

  function draw() {
    catEl.innerHTML = CATEGORIES.map(([v, l]) => chip(l, v, state.cat === v, 'cat')).join('');
    const showFits = state.cat === 'todo' || state.cat === 'remeras';
    fitEl.hidden = !showFits;
    fitEl.innerHTML = chip('Todos los fits', '', !state.fit, 'fit') + FITS.map(([v, l]) => chip(l, v, state.fit === v, 'fit')).join('');
    let list = PRODUCTS.filter(p => (state.cat === 'todo' || p.cat === state.cat) && (!state.fit || !showFits || p.fit === state.fit));
    if (state.sort === 'asc') list.sort((a, b) => a.price - b.price);
    if (state.sort === 'desc') list.sort((a, b) => b.price - a.price);
    document.getElementById('resultCount').textContent = `${list.length} producto${list.length === 1 ? '' : 's'}`;
    grid.innerHTML = list.length ? list.map(productCard).join('') : '<p class="empty">No hay productos con ese filtro.</p>';
  }

  catEl.addEventListener('click', e => { const b = e.target.closest('[data-cat]'); if (b) { state.cat = b.dataset.cat; if (state.cat !== 'todo' && state.cat !== 'remeras') state.fit = ''; draw(); } });
  fitEl.addEventListener('click', e => { const b = e.target.closest('[data-fit]'); if (b) { state.fit = b.dataset.fit; draw(); } });
  document.getElementById('sort').addEventListener('change', e => { state.sort = e.target.value; draw(); });
  bindProductCards(grid);
  draw();
}

/* ---------- Combos ---------- */
function initCombos() {
  const tees = PRODUCTS.filter(p => p.cat === 'remeras');
  const root = document.getElementById('combosRoot');
  root.innerHTML = COMBOS.map(c => `
  <section class="builder" id="${c.id}" data-combo="${c.id}">
    <div class="builder-head">
      <p class="eyebrow">${esc(c.name)}</p>
      <h2>${esc(c.label)}</h2>
      <p class="lead">${esc(c.desc)}</p>
    </div>
    <div class="slots">
      ${Array.from({ length: c.qty }, (_, i) => `
      <div class="slot">
        <span>Remera ${i + 1}</span>
        <select data-slot="prod" aria-label="Remera ${i + 1}">
          ${tees.map(p => `<option value="${p.id}">${esc(p.name)} — ${money(p.price)}</option>`).join('')}
        </select>
        <select data-slot="size" aria-label="Talle remera ${i + 1}">
          ${SIZES.map(s => `<option>${s}</option>`).join('')}
        </select>
      </div>`).join('')}
    </div>
    <div class="builder-sum">
      <div><small>Precio normal</small><s data-full></s></div>
      <div><small>Precio combo</small><b data-total></b></div>
      <div><small>Ahorrás</small><em data-save></em></div>
      <button type="button" class="btn" data-add-combo>Agregar combo</button>
    </div>
  </section>`).join('');

  function read(sec) {
    const combo = COMBOS.find(c => c.id === sec.dataset.combo);
    const items = [...sec.querySelectorAll('.slot')].map(s => {
      const p = PRODUCTS.find(x => x.id === s.querySelector('[data-slot=prod]').value);
      return { p, size: s.querySelector('[data-slot=size]').value };
    });
    const prices = items.map(i => i.p.price);
    const full = prices.reduce((a, b) => a + b, 0);
    return { combo, items, full, total: comboPrice(combo, prices) };
  }
  function update(sec) {
    const r = read(sec);
    sec.querySelector('[data-full]').textContent = money(r.full);
    sec.querySelector('[data-total]').textContent = money(r.total);
    sec.querySelector('[data-save]').textContent = money(r.full - r.total);
  }
  // Deshabilita los talles sin stock de la remera elegida en cada slot.
  function syncSizes(slot) {
    const p = PRODUCTS.find(x => x.id === slot.querySelector('[data-slot=prod]').value);
    const sel = slot.querySelector('[data-slot=size]');
    [...sel.options].forEach(o => { o.disabled = p.stock[o.value] <= 0; });
    if (sel.selectedOptions[0]?.disabled) { const ok = [...sel.options].find(o => !o.disabled); if (ok) sel.value = ok.value; }
  }
  root.querySelectorAll('.slot').forEach(syncSizes);
  root.querySelectorAll('.builder').forEach(update);
  root.addEventListener('change', e => {
    const slot = e.target.closest('.slot');
    if (slot && e.target.matches('[data-slot=prod]')) syncSizes(slot);
    update(e.target.closest('.builder'));
  });
  root.addEventListener('click', e => {
    if (!e.target.closest('[data-add-combo]')) return;
    const r = read(e.target.closest('.builder'));
    const detail = r.items.map(i => `${i.p.name} (${i.size})`).join(' + ');
    const need = {};
    r.items.forEach(i => { const k = i.p.id + '-' + i.size; need[k] = (need[k] || 0) + 1; });
    if (r.items.some(i => need[i.p.id + '-' + i.size] > i.p.stock[i.size])) { toast('No hay stock suficiente para esa combinación'); return; }
    Cart.add({ key: 'combo-' + r.combo.id + '-' + r.items.map(i => i.p.id + i.size).join('-'), name: r.combo.name, price: r.total, detail, items: r.items.map(i => ({ id: i.p.id, size: i.size })) });
    toast('Combo agregado al carrito');
  });
  if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
}

/* ---------- Pago ---------- */
function initCheckout() {
  const form = document.getElementById('checkoutForm');
  const sum = document.getElementById('summary');
  const addr = document.getElementById('addrField');

  function totals() {
    const sub = Cart.subtotal();
    const pay = form.pay.value;
    const ship = form.delivery.value === 'envio' ? CONFIG.shippingCost : 0;
    const disc = pay === 'tarjeta' ? 0 : Math.round(sub * CONFIG.cashDiscount);
    return { sub, ship, disc, total: sub - disc + ship };
  }
  function draw() {
    const lines = Cart.get();
    document.getElementById('checkoutBody').hidden = !lines.length;
    document.getElementById('checkoutEmpty').hidden = !!lines.length;
    addr.hidden = form.delivery.value !== 'envio';
    form.address.required = form.delivery.value === 'envio';
    const card = form.pay.value === 'tarjeta';
    document.getElementById('cardBox').hidden = !card;
    document.getElementById('installField').hidden = !(card && form.cardtype.value === 'credito');
    ['cardnum', 'cardname', 'cardexp', 'cardcvv'].forEach(n => { form[n].required = card; });
    const t = totals();
    sum.innerHTML = lines.map(l => `
      <div class="line"><div><strong>${esc(l.name)}</strong>${l.size ? `<small>Talle ${esc(l.size)}</small>` : ''}${l.detail ? `<small>${esc(l.detail)}</small>` : ''}<small>x${l.qty}</small></div><b>${money(l.price * l.qty)}</b></div>`).join('') + `
      <div class="row"><span>Subtotal</span><span>${money(t.sub)}</span></div>
      ${t.disc ? `<div class="row save"><span>Descuento efectivo/transferencia</span><span>−${money(t.disc)}</span></div>` : ''}
      <div class="row"><span>Envío</span><span>${t.ship ? money(t.ship) : 'Gratis'}</span></div>
      <div class="row total"><span>Total</span><b>${money(t.total)}</b></div>`;
  }
  form.addEventListener('change', draw);
  document.addEventListener('cart:change', draw);
  form.addEventListener('submit', e => {
    e.preventDefault();
    const t = totals();
    const order = 'PED-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    // Descuenta el stock de lo vendido (visible en el panel de administración).
    const sold = [];
    Cart.get().forEach(l => (l.items || [{ id: l.id, size: l.size }]).forEach(i => i.id && sold.push({ id: i.id, size: i.size, qty: l.qty })));
    Inventory.consume(sold);
    Cart.clear();
    document.getElementById('checkoutBody').hidden = true;
    const ok = document.getElementById('checkoutOk');
    ok.hidden = false;
    ok.innerHTML = `<p class="eyebrow">Pedido recibido</p><h2>¡Gracias, ${esc(form.name.value)}!</h2>
      <p class="lead">Tu pedido <b>${order}</b> por <b>${money(t.total)}</b> quedó registrado. Te vamos a contactar por WhatsApp o mail para coordinar el pago y la entrega.</p>
      <p class="note"><b>Demostración:</b> todo es ficticio. No se procesó ningún pago real y no se guardó ningún dato.</p>
      <a class="btn" href="catalogo.html">Seguir comprando</a>`;
    scrollTo(0, 0);
  });
  draw();
}

/* ---------- Local ---------- */
function initLocal() {
  document.getElementById('addr').textContent = CONFIG.address;
  document.getElementById('hours').innerHTML = CONFIG.hours.map(([d, h]) => `<li><b>${esc(d)}</b> ${esc(h)}</li>`).join('');
  document.getElementById('wa').href = 'https://wa.me/' + CONFIG.whatsapp;
  document.getElementById('ig').textContent = CONFIG.instagram;
}
