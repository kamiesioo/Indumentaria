// Panel de administración: edición de precios y stock. Todo vive en el navegador (localStorage).
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const money = n => new Intl.NumberFormat(CONFIG.locale, { style: 'currency', currency: CONFIG.currency, maximumFractionDigits: 0 }).format(n);
  const num = n => new Intl.NumberFormat(CONFIG.locale).format(n);
  const when = t => new Intl.DateTimeFormat(CONFIG.locale, { dateStyle: 'short', timeStyle: 'short' }).format(t);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = o => JSON.parse(JSON.stringify(o));
  const int = (v, min = 0) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.max(min, Math.min(n, 9999999)) : min; };

  let db = Inventory.read();
  let saved = {};   // lo que está aplicado hoy en la tienda
  let draft = {};   // lo que se está editando
  const selected = new Set();
  const view = { q: '', cat: 'todo', status: 'all', sort: 'name' };
  const byId = id => PRODUCTS.find(p => p.id === id);

  function loadFromStore() {
    db = Inventory.read();
    Inventory.apply();
    saved = {}; draft = {};
    PRODUCTS.forEach(p => { saved[p.id] = { price: p.price, stock: { ...p.stock } }; });
    draft = clone(saved);
  }

  const low = () => Number.isFinite(db.lowStock) ? db.lowStock : Inventory.DEFAULT_LOW;
  const totalOf = id => Object.values(draft[id].stock).reduce((a, b) => a + b, 0);
  const statusOf = id => { const t = totalOf(id); return t === 0 ? 'out' : t <= low() ? 'low' : 'ok'; };
  const STATUS_LABEL = { ok: 'En stock', low: 'Stock bajo', out: 'Agotado' };
  const isDirty = p => {
    const s = saved[p.id], d = draft[p.id];
    return s.price !== d.price || Inventory.sizesOf(p).some(z => s.stock[z] !== d.stock[z]);
  };
  const dirtyCount = () => PRODUCTS.filter(isDirty).length;

  /* ---------- Render ---------- */
  function renderKpis() {
    const units = PRODUCTS.reduce((a, p) => a + totalOf(p.id), 0);
    const value = PRODUCTS.reduce((a, p) => a + totalOf(p.id) * draft[p.id].price, 0);
    const out = PRODUCTS.filter(p => statusOf(p.id) === 'out').length;
    const lows = PRODUCTS.filter(p => statusOf(p.id) === 'low').length;
    const cats = new Set(PRODUCTS.map(p => p.cat)).size;
    $('#kpis').innerHTML = `
      <div class="kpi good"><small>Productos</small><b>${PRODUCTS.length}</b><span>en ${cats} categorías</span></div>
      <div class="kpi"><small>Unidades en stock</small><b>${num(units)}</b><span>suma de todos los talles</span></div>
      <div class="kpi"><small>Valor del inventario</small><b>${money(value)}</b><span>a precio de venta actual</span></div>
      <div class="kpi${out + lows ? (out ? ' alert bad' : ' alert') : ''}"><small>Alertas</small><b>${out + lows}</b><span>${out} agotado${out === 1 ? '' : 's'} · ${lows} con stock bajo</span></div>`;
  }

  function visible() {
    const q = view.q.trim().toLowerCase();
    const list = PRODUCTS.filter(p =>
      (view.cat === 'todo' || p.cat === view.cat) &&
      (!q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)) &&
      (view.status === 'all' || (view.status === 'dirty' ? isDirty(p) : statusOf(p.id) === view.status)));
    const sorts = {
      name: (a, b) => a.name.localeCompare(b.name, CONFIG.locale),
      'price-asc': (a, b) => draft[a.id].price - draft[b.id].price,
      'price-desc': (a, b) => draft[b.id].price - draft[a.id].price,
      'stock-asc': (a, b) => totalOf(a.id) - totalOf(b.id),
      'stock-desc': (a, b) => totalOf(b.id) - totalOf(a.id)
    };
    return list.sort(sorts[view.sort]);
  }

  function rowHtml(p) {
    const d = draft[p.id];
    return `
    <tr data-id="${p.id}">
      <td class="c-sel"><input type="checkbox" data-sel aria-label="Seleccionar ${esc(p.name)}"${selected.has(p.id) ? ' checked' : ''}></td>
      <td><div class="prod"><span class="thumb" style="background-image:url('${imgUrl(p.img)}')"></span><div><b>${esc(p.name)}</b><small>${esc(p.id.toUpperCase())} · ${esc(p.cat)}</small></div></div></td>
      <td class="price-cell" data-l="Precio"><div class="money"><input type="number" data-price min="0" step="100" inputmode="numeric" value="${d.price}" aria-label="Precio de ${esc(p.name)}"></div><span class="delta" data-delta></span></td>
      <td data-l="Stock por talle"><div class="stocks">${Inventory.sizesOf(p).map(z => `
        <div class="stock"><label for="s-${p.id}-${z}">${z}</label><input id="s-${p.id}-${z}" type="number" data-size="${z}" min="0" step="1" inputmode="numeric" value="${d.stock[z]}" aria-label="Stock talle ${z} de ${esc(p.name)}"></div>`).join('')}</div></td>
      <td class="num" data-l="Total"><span class="total" data-total></span></td>
      <td data-l="Estado"><span class="st" data-st></span></td>
    </tr>`;
  }

  function paintRow(tr) {
    const p = byId(tr.dataset.id), d = draft[p.id], s = saved[p.id];
    tr.classList.toggle('dirty', isDirty(p));
    tr.classList.toggle('sel', selected.has(p.id));
    // delta de precio
    const dl = $('[data-delta]', tr);
    if (d.price !== s.price) {
      const pct = s.price ? Math.round((d.price - s.price) / s.price * 1000) / 10 : 0;
      dl.textContent = `antes ${money(s.price)} (${pct > 0 ? '+' : ''}${pct}%)`;
      dl.className = 'delta ' + (d.price > s.price ? 'up' : 'down');
    } else if (s.price !== p.basePrice) {
      dl.textContent = `precio base ${money(p.basePrice)}`;
      dl.className = 'delta';
    } else { dl.textContent = ''; dl.className = 'delta'; }
    // stock
    tr.querySelectorAll('[data-size]').forEach(inp => {
      const z = inp.dataset.size;
      inp.classList.toggle('zero', d.stock[z] === 0);
      inp.classList.toggle('chg', d.stock[z] !== s.stock[z]);
    });
    $('[data-total]', tr).textContent = num(totalOf(p.id));
    const st = statusOf(p.id), stEl = $('[data-st]', tr);
    stEl.textContent = STATUS_LABEL[st];
    stEl.className = 'st ' + st;
  }

  function renderTable() {
    const list = visible();
    $('#rows').innerHTML = list.map(rowHtml).join('');
    $('#rows').querySelectorAll('tr').forEach(paintRow);
    $('#empty').hidden = list.length > 0;
    $('#tbl').hidden = list.length === 0;
    const all = $('#selAll');
    all.checked = list.length > 0 && list.every(p => selected.has(p.id));
  }

  function renderBar() {
    const n = dirtyCount();
    $('#savebar').hidden = n === 0;
    $('#saveText').textContent = `${n} producto${n === 1 ? '' : 's'} con cambios sin guardar`;
    const pill = $('#syncState');
    pill.textContent = n ? `${n} sin guardar` : 'Todo guardado';
    pill.classList.toggle('dirty', n > 0);
    const c = selected.size;
    $('#bulk').hidden = c === 0;
    $('#bulkCount').textContent = `${c} producto${c === 1 ? '' : 's'} seleccionado${c === 1 ? '' : 's'}`;
  }

  function renderLog() {
    const log = db.log || [];
    const txt = c => c.k === 'price' ? `Precio ${money(c.from)} → ${money(c.to)}` : `Stock ${c.size}: ${num(c.from)} → ${num(c.to)}`;
    $('#logList').innerHTML = log.length ? log.slice(0, 60).map(e => `
      <li><time>${esc(when(e.t))}</time><span><b>${esc(e.name)}</b> — ${e.changes.map(c => esc(txt(c))).join(' · ')}</span><i class="${e.src === 'venta' ? 'venta' : ''}">${e.src === 'venta' ? 'Venta en tienda' : 'Panel'}</i></li>`).join('')
      : '<li><span class="none">Todavía no hay movimientos. Los cambios guardados y las ventas de la tienda aparecen acá.</span></li>';
  }

  const refresh = () => { renderKpis(); renderBar(); };
  const refreshAll = () => { renderKpis(); renderTable(); renderBar(); renderLog(); };

  /* ---------- Edición ---------- */
  $('#rows').addEventListener('input', e => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    const id = tr.dataset.id;
    if (e.target.matches('[data-price]')) draft[id].price = int(e.target.value);
    else if (e.target.matches('[data-size]')) draft[id].stock[e.target.dataset.size] = int(e.target.value);
    else return;
    paintRow(tr);
    refresh();
  });
  // Al salir del campo se normaliza el valor mostrado (vacío o negativo → 0).
  $('#rows').addEventListener('change', e => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    const id = tr.dataset.id;
    if (e.target.matches('[data-price]')) e.target.value = draft[id].price;
    else if (e.target.matches('[data-size]')) e.target.value = draft[id].stock[e.target.dataset.size];
    else if (e.target.matches('[data-sel]')) {
      e.target.checked ? selected.add(id) : selected.delete(id);
      paintRow(tr);
      $('#selAll').checked = visible().every(p => selected.has(p.id));
      renderBar();
    }
  });
  $('#selAll').addEventListener('change', e => {
    visible().forEach(p => e.target.checked ? selected.add(p.id) : selected.delete(p.id));
    renderTable(); renderBar();
  });
  $('#bulkClear').onclick = () => { selected.clear(); renderTable(); renderBar(); };

  /* ---------- Edición masiva ---------- */
  $('#bulkPrice').onclick = () => {
    const pct = Number($('#bulkPct').value);
    if (!Number.isFinite(pct) || pct <= -100) return toast('Ingresá un porcentaje válido', true);
    const round = $('#bulkRound').checked;
    selected.forEach(id => {
      let v = draft[id].price * (1 + pct / 100);
      v = round ? Math.round(v / 100) * 100 : Math.round(v);
      draft[id].price = Math.max(0, v);
    });
    renderTable(); refresh();
    toast(`Precio ajustado ${pct > 0 ? '+' : ''}${pct}% en ${selected.size} producto${selected.size === 1 ? '' : 's'} (sin guardar)`);
  };
  $('#bulkStock').onclick = () => {
    const q = Math.trunc(Number($('#bulkQty').value));
    if (!Number.isFinite(q)) return toast('Ingresá una cantidad válida', true);
    const set = $('#bulkMode').value === 'set';
    if (set && q < 0) return toast('Para fijar el stock usá un número positivo', true);
    selected.forEach(id => Object.keys(draft[id].stock).forEach(z => {
      draft[id].stock[z] = Math.max(0, set ? q : draft[id].stock[z] + q);
    }));
    renderTable(); refresh();
    toast(`Stock actualizado en ${selected.size} producto${selected.size === 1 ? '' : 's'} (sin guardar)`);
  };

  /* ---------- Guardar / descartar ---------- */
  function save() {
    const changed = PRODUCTS.filter(isDirty);
    if (!changed.length) return;
    const now = Date.now();
    const log = db.log || [];
    changed.forEach(p => {
      const s = saved[p.id], d = draft[p.id], changes = [];
      if (s.price !== d.price) changes.push({ k: 'price', from: s.price, to: d.price });
      Inventory.sizesOf(p).forEach(z => { if (s.stock[z] !== d.stock[z]) changes.push({ k: 'stock', size: z, from: s.stock[z], to: d.stock[z] }); });
      log.unshift({ t: now, id: p.id, name: p.name, src: 'panel', changes });
    });
    // Se relee por si la tienda registró ventas en otra pestaña; las ventas ya guardadas se conservan en el historial.
    const fresh = Inventory.read();
    const next = { ...fresh, v: 1, lowStock: db.lowStock, items: {}, log: mergeLog(fresh.log, log).slice(0, 200) };
    PRODUCTS.forEach(p => { next.items[p.id] = { price: draft[p.id].price, stock: { ...draft[p.id].stock } }; });
    if (!Inventory.write(next)) return toast('No se pudo guardar: el navegador bloqueó el almacenamiento', true);
    db = next;
    saved = clone(draft);
    PRODUCTS.forEach(p => { p.price = saved[p.id].price; p.stock = { ...saved[p.id].stock }; });
    refreshAll();
    toast(`Guardado: ${changed.length} producto${changed.length === 1 ? '' : 's'} actualizado${changed.length === 1 ? '' : 's'} en la tienda`);
  }
  const mergeLog = (a = [], b = []) => {
    const seen = new Set(), out = [];
    [...b, ...a].forEach(e => { const k = JSON.stringify(e); if (!seen.has(k)) { seen.add(k); out.push(e); } });
    return out.sort((x, y) => y.t - x.t);
  };
  $('#btnSave').onclick = save;
  $('#btnDiscard').onclick = () => {
    if (!confirm('¿Descartar todos los cambios sin guardar?')) return;
    draft = clone(saved); refreshAll(); toast('Cambios descartados');
  };
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
  });
  addEventListener('beforeunload', e => { if (dirtyCount()) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- Exportar / importar / restablecer ---------- */
  $('#btnExport').onclick = () => {
    const data = { app: 'korion-inventory', v: 1, exportedAt: new Date().toISOString(), lowStock: low(), items: {} };
    PRODUCTS.forEach(p => { data.items[p.id] = { price: saved[p.id].price, stock: saved[p.id].stock }; });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = `inventario-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Respaldo exportado (refleja lo guardado)');
  };
  $('#btnImport').onclick = () => $('#file').click();
  $('#file').addEventListener('change', async e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      if (f.size > 1e6) throw new Error('size');
      const data = JSON.parse(await f.text());
      if (!data || data.app !== 'korion-inventory' || typeof data.items !== 'object') throw new Error('format');
      let n = 0;
      PRODUCTS.forEach(p => {
        const o = data.items[p.id];
        if (!o || typeof o !== 'object') return;
        if (Number.isFinite(o.price) && o.price >= 0) draft[p.id].price = int(o.price);
        Inventory.sizesOf(p).forEach(z => { const v = o.stock && o.stock[z]; if (Number.isFinite(v) && v >= 0) draft[p.id].stock[z] = int(v); });
        n++;
      });
      if (Number.isFinite(data.lowStock) && data.lowStock >= 0) { db.lowStock = int(data.lowStock); $('#low').value = db.lowStock; }
      refreshAll();
      toast(n ? `Importados ${n} productos como borrador. Revisá y guardá.` : 'El archivo no tiene productos de este catálogo', !n);
    } catch { toast('Archivo inválido: usá un respaldo exportado desde este panel', true); }
  });
  $('#btnReset').onclick = () => {
    if (!confirm('Esto vuelve los precios originales y el stock inicial (como borrador). ¿Continuar?')) return;
    PRODUCTS.forEach(p => { draft[p.id] = { price: p.basePrice, stock: Inventory.defaultStock(p) }; });
    refreshAll();
    toast('Valores originales cargados. Guardá para aplicarlos.');
  };
  $('#logClear').onclick = () => {
    if (!(db.log || []).length || !confirm('¿Vaciar el historial de actividad?')) return;
    const fresh = Inventory.read(); fresh.log = []; db.log = [];
    Inventory.write(fresh); renderLog();
  };

  /* ---------- Filtros ---------- */
  $('#cat').innerHTML = CATEGORIES.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('');
  $('#q').addEventListener('input', e => { view.q = e.target.value; renderTable(); });
  ['cat', 'status', 'sort'].forEach(k => $('#' + k).addEventListener('change', e => { view[k] = e.target.value; renderTable(); }));
  $('#low').addEventListener('change', e => {
    db.lowStock = int(e.target.value);
    e.target.value = db.lowStock;
    const fresh = Inventory.read(); fresh.lowStock = db.lowStock; Inventory.write(fresh);
    refreshAll();
  });

  /* ---------- Aviso ---------- */
  function toast(msg, err) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.toggle('err', !!err);
    t.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.remove('show'), err ? 4200 : 2800);
  }

  // Si la tienda vende en otra pestaña, se actualiza solo cuando no hay ediciones en curso.
  addEventListener('storage', e => {
    if (e.key !== Inventory.KEY) return;
    if (dirtyCount()) return toast('La tienda registró cambios (ventas). Guardá o descartá para verlos.');
    loadFromStore(); refreshAll();
  });

  loadFromStore();
  $('#low').value = low();
  refreshAll();
})();
