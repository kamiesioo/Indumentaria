// Inventario compartido entre la tienda y el panel de administración (admin.html).
// Los precios y el stock editados en el panel viven en localStorage del navegador:
// no hay backend, así que los cambios solo se ven en el navegador donde se hicieron.
// Debe cargarse después de data.js y antes de app.js.
const Inventory = {
  KEY: 'korion_inventory_v1',
  DEFAULT_QTY: 10,
  DEFAULT_LOW: 8,

  sizesOf(p) { return p.oneSize ? ['Único'] : SIZES; },
  defaultStock(p) {
    const q = p.oneSize ? this.DEFAULT_QTY * 2 : this.DEFAULT_QTY;
    return Object.fromEntries(this.sizesOf(p).map(s => [s, q]));
  },
  // 'out' | 'low' | 'ok' según el umbral configurado en el panel.
  status(p) {
    const t = this.total(p), db = this.read();
    const low = Number.isFinite(db.lowStock) ? db.lowStock : this.DEFAULT_LOW;
    return t === 0 ? 'out' : t <= low ? 'low' : 'ok';
  },
  total(p) { return Object.values(p.stock).reduce((a, b) => a + b, 0); },

  read() {
    try {
      const d = JSON.parse(localStorage.getItem(this.KEY));
      return d && typeof d === 'object' ? d : {};
    } catch { return {}; }
  },
  write(db) {
    try { localStorage.setItem(this.KEY, JSON.stringify(db)); return true; } catch { return false; }
  },

  // Aplica lo guardado sobre PRODUCTS: p.price, p.stock y p.basePrice (precio original de data.js).
  apply() {
    const items = this.read().items || {};
    PRODUCTS.forEach(p => {
      const o = items[p.id] || {};
      p.basePrice = p.price;
      if (Number.isFinite(o.price) && o.price >= 0) p.price = Math.round(o.price);
      p.stock = this.defaultStock(p);
      for (const s of this.sizesOf(p)) {
        const n = o.stock && o.stock[s];
        if (Number.isFinite(n) && n >= 0) p.stock[s] = Math.floor(n);
      }
    });
  },

  // Descuenta stock por una venta. items: [{ id, size, qty }]
  consume(items) {
    const db = this.read();
    db.items = db.items || {};
    const log = db.log || [];
    items.forEach(({ id, size, qty }) => {
      const p = PRODUCTS.find(x => x.id === id);
      if (!p || !(size in p.stock)) return;
      const from = p.stock[size];
      p.stock[size] = Math.max(0, from - qty);
      db.items[id] = { price: p.price, stock: { ...p.stock } };
      log.unshift({ t: Date.now(), id, name: p.name, src: 'venta', changes: [{ k: 'stock', size, from, to: p.stock[size] }] });
    });
    db.log = log.slice(0, 200);
    this.write(db);
  }
};
Inventory.apply();
