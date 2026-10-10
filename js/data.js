// Configuración de la marca y datos de ejemplo.
// Para un cliente nuevo: editar CONFIG, PRODUCTS y COMBOS (y --red en styles.css).
const CONFIG = {
  brand: 'KORION',
  brandSuffix: 'WEAR',
  instagram: '@korionwear',
  whatsapp: '5490000000000',
  address: 'Av. Siempreviva 1234, Ciudad Ejemplo',
  hours: [['Lunes a Viernes', '10:00 – 20:00'], ['Sábados', '10:00 – 14:00'], ['Domingos', 'Cerrado']],
  cashDiscount: 0.2,     // descuento por efectivo / transferencia
  shippingCost: 3500,    // envío a domicilio
  locale: 'es-AR',
  currency: 'ARS'
};

// Fotos de Unsplash (solo el ID; se cargan por URL, no hay archivos locales).
const imgUrl = id => `https://images.unsplash.com/photo-${id}?fm=jpg&q=70&w=700&h=933&auto=format&fit=crop`;

const SIZES = ['S', 'M', 'L', 'XL'];

// cat: remeras | buzos | pantalones | accesorios — fit: classic | over | boxy (solo remeras)
const PRODUCTS = [
  { id: 'r1', img: '1626781309887-cdfb9f258c64', name: 'Remera Classic Negra', cat: 'remeras', fit: 'classic', price: 18000, tag: 'Nuevo',        tone: 1, featured: true,  desc: 'Corte clásico, algodón premium.' },
  { id: 'r2', img: '1623596305214-19f21cbf48ee', name: 'Remera Classic Blanca', cat: 'remeras', fit: 'classic', price: 18000, tag: '',            tone: 2, featured: false, desc: 'Básica de todos los días.' },
  { id: 'r3', img: '1588117260148-b47818741c74', name: 'Remera Oversize Grafito', cat: 'remeras', fit: 'over',  price: 21000, tag: 'Más vendida', tone: 3, featured: true,  desc: 'Caída ancha, estampa frontal.' },
  { id: 'r4', img: '1636047250452-6772f6144b3d', name: 'Remera Oversize Arena', cat: 'remeras', fit: 'over',    price: 21000, tag: '',            tone: 4, featured: false, desc: 'Oversize con estampa en espalda.' },
  { id: 'r5', img: '1635650804263-1a1941e14df5', name: 'Remera Boxy Negra', cat: 'remeras', fit: 'boxy',        price: 22000, tag: 'Nuevo',       tone: 1, featured: true,  desc: 'Corta, ancha, hombros caídos.' },
  { id: 'r6', img: '1635650804483-2a77a8c9e728', name: 'Remera Boxy Gris', cat: 'remeras', fit: 'boxy',         price: 22000, tag: '',            tone: 3, featured: false, desc: 'Boxy lavada, efecto vintage.' },
  { id: 'b1', img: '1508216310976-c518daae0cdc', name: 'Buzo Signature', cat: 'buzos', fit: '',                 price: 48000, tag: 'Nuevo',       tone: 2, featured: true,  desc: 'Frisa pesada, logo bordado.' },
  { id: 'b2', img: '1523398002811-999ca8dec234', name: 'Campera Parka', cat: 'buzos', fit: '',                  price: 72000, tag: '',            tone: 4, featured: false, desc: 'Abrigada, interior polar.' },
  { id: 'p1', img: '1611955874253-78c6c3959c41', name: 'Jogger Cargo', cat: 'pantalones', fit: '',              price: 39000, tag: '',            tone: 1, featured: false, desc: 'Bolsillos laterales, puño ajustado.' },
  { id: 'p2', img: '1721713168896-11db10d9740b', name: 'Pantalón Wide', cat: 'pantalones', fit: '',             price: 42000, tag: '',            tone: 3, featured: false, desc: 'Tiro alto, pierna ancha.' },
  { id: 'a1', img: '1578854955076-970394ef2512', name: 'Gorra Dad Hat', cat: 'accesorios', fit: '',             price: 12000, tag: '',            tone: 2, featured: false, desc: 'Logo bordado, regulable.', oneSize: true },
  { id: 'a2', img: '1721637686340-de9f8cebda5a', name: 'Tote Bag', cat: 'accesorios', fit: '',                  price: 9000,  tag: '',            tone: 4, featured: false, desc: 'Lona resistente.', oneSize: true }
];

const CATEGORIES = [['todo', 'Todo'], ['remeras', 'Remeras'], ['buzos', 'Buzos y camperas'], ['pantalones', 'Pantalones'], ['accesorios', 'Accesorios']];
const FITS = [['classic', 'Classic'], ['over', 'Over'], ['boxy', 'Boxy']];

// type 'xy': llevás `qty` y pagás `pay` (se regalan las más baratas). type 'pct': `pct` de descuento llevando `qty`.
const COMBOS = [
  { id: 'trio', name: 'Combo Trío', qty: 3, type: 'xy', pay: 1, label: '3 remeras al precio de 1', desc: 'Elegí 3 remeras y pagás solo la más cara.' },
  { id: 'duo', name: 'Combo Dúo', qty: 2, type: 'pct', pct: 0.25, label: '2 remeras con 25% OFF', desc: 'Llevá 2 remeras y ahorrá un 25%.' }
];

// Temas de la maqueta: [id, nombre, [colores de muestra]]
const THEMES = [
  ['oscuro', 'Oscuro streetwear', ['#0a0a0a', '#f4f4f2', '#d1262b']],
  ['minimal', 'Minimalista claro', ['#fafaf8', '#141414', '#dcdcd5']],
  ['boutique', 'Boutique elegante', ['#f3ece2', '#2e2418', '#8a4b2d']],
  ['deportivo', 'Deportivo vibrante', ['#0d0d0d', '#ffffff', '#ffd400']],
  ['pastel', 'Pastel juvenil', ['#fff6fa', '#2d2250', '#ff5c9a']]
];
const DEMO = { seal: 'Maqueta por Korion Systems', url: 'https://ulisescena.com.ar', cta: 'Solicitar demo' };
