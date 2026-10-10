// Núcleo compartido: formato de precios, carrito, header/footer y cajón del carrito.
// El carrito vive en sessionStorage: sobrevive entre páginas, se borra al cerrar la pestaña
// y también al recargar (F5) la página.

const money = n => new Intl.NumberFormat(CONFIG.locale, { style: 'currency', currency: CONFIG.currency, maximumFractionDigits: 0 }).format(n);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const DEFAULTS = { brand: CONFIG.brand, brandSuffix: CONFIG.brandSuffix };
// Nombre de marca personalizado desde el panel de estilos (solo en esta pestaña).
try {
  const custom = sessionStorage.getItem('brandName');
  if (custom) { CONFIG.brand = custom.toUpperCase(); CONFIG.brandSuffix = ''; }
} catch {}

const MARK = '<svg class="mk" aria-hidden="true"><use href="#mark"/></svg>';

function comboPrice(combo, prices) {
  const sum = prices.reduce((a, b) => a + b, 0);
  if (combo.type === 'xy') {
    const sorted = [...prices].sort((a, b) => b - a);
    return sorted.slice(0, combo.pay).reduce((a, b) => a + b, 0);
  }
  return Math.round(sum * (1 - combo.pct));
}

const Cart = {
  KEY: 'cart',
  get() {
    try { return JSON.parse(sessionStorage.getItem(this.KEY)) || []; } catch { return []; }
  },
  save(lines) {
    try { sessionStorage.setItem(this.KEY, JSON.stringify(lines)); } catch {}
    renderCart();
  },
  add(line) {
    const lines = this.get();
    const found = lines.find(l => l.key === line.key);
    if (found) found.qty += 1; else lines.push({ ...line, qty: 1 });
    this.save(lines);
  },
  setQty(key, qty) {
    const lines = this.get().map(l => l.key === key ? { ...l, qty } : l).filter(l => l.qty > 0);
    this.save(lines);
  },
  clear() { this.save([]); },
  count() { return this.get().reduce((n, l) => n + l.qty, 0); },
  subtotal() { return this.get().reduce((n, l) => n + l.price * l.qty, 0); }
};

// Recargar la página vacía el carrito.
(function () {
  const nav = performance.getEntriesByType('navigation')[0];
  if (nav && nav.type === 'reload') { try { sessionStorage.removeItem(Cart.KEY); } catch {} }
})();

function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), 2200);
}

function productImg(p) {
  return `<div class="img i${p.tone}${p.img ? ' has-img' : ''}">${p.img ? `<img src="${imgUrl(p.img)}" alt="${esc(p.name)}" loading="lazy" onerror="this.remove()">` : ''}${p.tag ? `<span class="tag">${esc(p.tag)}</span>` : ''}</div>`;
}

function buildLayout() {
  const page = document.body.dataset.page;
  const link = (href, label, key) => `<a href="${href}"${page === key ? ' class="on"' : ''}>${label}</a>`;
  document.body.insertAdjacentHTML('afterbegin', `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="mark" viewBox="0 0 48 48">
    <path d="M24 3 45 24 24 45 3 24Z" fill="none" stroke="currentColor" stroke-width="3"/>
    <path d="M15 14h4v7l9-7h6l-11 10 11 11h-6l-9-8v8h-4Z" fill="currentColor"/>
  </symbol>
</svg>
<div class="topbar">
  <span>${CONFIG.cashDiscount * 100}% OFF en efectivo o transferencia</span><span>·</span>
  <span>${esc(COMBOS[0].label)}</span><span>·</span><span>Retiro gratis en el local</span>
</div>
<header class="nav">
  <a class="logo" href="index.html">${MARK}${esc(CONFIG.brand)}${CONFIG.brandSuffix ? `<b>${esc(CONFIG.brandSuffix)}</b>` : ''}</a>
  <nav>
    ${link('index.html', 'Inicio', 'home')}
    ${link('catalogo.html', 'Catálogo', 'catalog')}
    ${link('combos.html', 'Combos', 'combos')}
    ${link('local.html', 'Local', 'local')}
  </nav>
  <button class="cart-btn" id="cartOpen" aria-label="Abrir carrito">Carrito <span id="cartCount">0</span></button>
</header>`);

  document.body.insertAdjacentHTML('beforeend', `
<footer>
  <span class="logo">${MARK}${esc(CONFIG.brand)}${CONFIG.brandSuffix ? `<b>${esc(CONFIG.brandSuffix)}</b>` : ''}</span>
  <span>${esc(CONFIG.address)} · ${esc(CONFIG.instagram)}</span>
  <span>© ${new Date().getFullYear()} ${esc(CONFIG.brand)} ${esc(CONFIG.brandSuffix)}</span>
</footer>
<div class="overlay" id="overlay"></div>
<aside class="drawer" id="drawer" aria-label="Carrito">
  <div class="drawer-head"><h3>Tu carrito</h3><button id="cartClose" aria-label="Cerrar">✕</button></div>
  <div class="drawer-body" id="drawerBody"></div>
  <div class="drawer-foot" id="drawerFoot"></div>
</aside>`);

  const hb = document.getElementById('heroBg');
  if (hb) hb.textContent = (CONFIG.brand + ' ' + CONFIG.brandSuffix).trim();
  buildThemePanel();
  document.getElementById('cartOpen').onclick = () => toggleDrawer(true);
  document.getElementById('cartClose').onclick = () => toggleDrawer(false);
  document.getElementById('overlay').onclick = () => toggleDrawer(false);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') toggleDrawer(false); });
  document.getElementById('drawerBody').addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const line = Cart.get().find(l => l.key === b.dataset.key);
    if (!line) return;
    Cart.setQty(line.key, line.qty + (b.dataset.act === 'inc' ? 1 : -1));
  });
}

function setTheme(id) {
  document.documentElement.dataset.theme = id === 'oscuro' ? '' : id;
  try { id === 'oscuro' ? sessionStorage.removeItem('theme') : sessionStorage.setItem('theme', id); } catch {}
  document.querySelectorAll('.theme-opt').forEach(b => b.classList.toggle('on', b.dataset.theme === id));
}

// Cambia el nombre en logos y hero sin recargar (recargar vaciaría el carrito).
function applyBrand(name) {
  if (name) { CONFIG.brand = name.toUpperCase(); CONFIG.brandSuffix = ''; }
  else { CONFIG.brand = DEFAULTS.brand; CONFIG.brandSuffix = DEFAULTS.brandSuffix; }
  document.querySelectorAll('.logo').forEach(l => {
    l.innerHTML = `${MARK}${esc(CONFIG.brand)}${CONFIG.brandSuffix ? `<b>${esc(CONFIG.brandSuffix)}</b>` : ''}`;
  });
  const hb = document.getElementById('heroBg');
  if (hb) hb.textContent = (CONFIG.brand + ' ' + CONFIG.brandSuffix).trim();
}

function buildThemePanel() {
  const cur = document.documentElement.dataset.theme || 'oscuro';
  document.body.insertAdjacentHTML('beforeend', `
<div class="seal"><span>${esc(DEMO.seal)}</span><a href="${DEMO.url}" target="_blank" rel="noopener">${esc(DEMO.cta)} →</a></div>
<div class="themehint" id="themeHint" role="note">¡Probá otros estilos de tienda!<button type="button" aria-label="Cerrar aviso" id="hintClose">✕</button></div>
<button class="themebtn" id="themeToggle" aria-expanded="false" aria-controls="themePanel"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20c1.4 0 2-1 2-2 0-1.6-1.4-1.8-1.4-3 0-1 .8-1.6 1.9-1.6H17a5 5 0 0 0 5-5C22 6 17.5 2 12 2Zm-5.5 11a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3.5 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"/></svg>Cambiar estilo</button>
<div class="themepanel" id="themePanel" role="dialog" aria-label="Probar estilos">
  <h4>Estilo de la tienda</h4>
  <div class="themes">
    ${THEMES.map(([id, name, c]) => `<button type="button" class="theme-opt${id === cur ? ' on' : ''}" data-theme="${id}"><span class="dots">${c.map(x => `<i style="background:${x}"></i>`).join('')}</span>${esc(name)}</button>`).join('')}
  </div>
  <form class="namebox" id="nameForm">
    <label for="brandInput">Nombre de la tienda (vista previa)</label>
    <div class="row2"><input id="brandInput" maxlength="24" placeholder="Ej: Mi Tienda" autocomplete="off"><button>Aplicar</button><button type="button" class="alt" id="nameReset">Reset</button></div>
  </form>
</div>`);
  const panel = document.getElementById('themePanel');
  const tgl = document.getElementById('themeToggle');
  const hint = document.getElementById('themeHint');
  const hideHint = () => { hint.remove(); try { sessionStorage.setItem('hintSeen', '1'); } catch {} };
  let seen = false;
  try { seen = sessionStorage.getItem('hintSeen') === '1'; } catch {}
  if (seen) hint.remove(); else { document.getElementById('hintClose').onclick = hideHint; setTimeout(() => hint.remove(), 12000); }
  tgl.onclick = () => { if (hint.isConnected) hideHint(); const o = panel.classList.toggle('open'); tgl.setAttribute('aria-expanded', o); };
  panel.addEventListener('click', e => { const b = e.target.closest('.theme-opt'); if (b) setTheme(b.dataset.theme); });
  document.getElementById('nameForm').addEventListener('submit', e => {
    e.preventDefault();
    const v = document.getElementById('brandInput').value.trim();
    try { v ? sessionStorage.setItem('brandName', v) : sessionStorage.removeItem('brandName'); } catch {}
    applyBrand(v);
  });
  document.getElementById('nameReset').onclick = () => {
    try { sessionStorage.removeItem('brandName'); } catch {}
    document.getElementById('brandInput').value = '';
    applyBrand('');
  };
}

function toggleDrawer(open) {
  document.getElementById('drawer').classList.toggle('open', open);
  document.getElementById('overlay').classList.toggle('open', open);
}

function renderCart() {
  const count = document.getElementById('cartCount');
  if (!count) return;
  const lines = Cart.get();
  count.textContent = Cart.count();
  const body = document.getElementById('drawerBody');
  const foot = document.getElementById('drawerFoot');
  if (!lines.length) {
    body.innerHTML = '<p class="empty">Tu carrito está vacío.<br><a class="btn btn-sm" href="catalogo.html">Ver catálogo</a></p>';
    foot.innerHTML = '';
  } else {
    body.innerHTML = lines.map(l => `
      <div class="line">
        <div>
          <strong>${esc(l.name)}</strong>
          ${l.size ? `<small>Talle ${esc(l.size)}</small>` : ''}
          ${l.detail ? `<small>${esc(l.detail)}</small>` : ''}
          <small>${money(l.price)}</small>
        </div>
        <div class="qty">
          <button data-act="dec" data-key="${esc(l.key)}" aria-label="Quitar uno">−</button>
          <span>${l.qty}</span>
          <button data-act="inc" data-key="${esc(l.key)}" aria-label="Agregar uno">+</button>
        </div>
      </div>`).join('');
    foot.innerHTML = `
      <div class="row"><span>Subtotal</span><b>${money(Cart.subtotal())}</b></div>
      <small>${CONFIG.cashDiscount * 100}% OFF extra pagando en efectivo o transferencia (se aplica al pagar).</small>
      <a class="btn" href="checkout.html">Ir a pagar</a>`;
  }
  document.dispatchEvent(new CustomEvent('cart:change'));
}

document.addEventListener('DOMContentLoaded', () => {
  buildLayout();
  renderCart();
  if (typeof initPage === 'function') initPage(document.body.dataset.page);
});
