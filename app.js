const grid = document.getElementById('grid');
const filter = document.getElementById('categoryFilter');
const search = document.getElementById('search');
const viewCartBtn = document.getElementById('viewCartBtn');
const cartCount = document.getElementById('cartCount');
const cartDialog = document.getElementById('cartDialog');
const cartItems = document.getElementById('cartItems');
const subtotalEl = document.getElementById('subtotal');
const deliveryEl = document.getElementById('delivery');
const grandEl = document.getElementById('grand');
const closeCart = document.getElementById('closeCart');
const checkoutForm = document.getElementById('checkoutForm');

// === WhatsApp settings ===
const WHATSAPP_NUMBER = (window.WHATSAPP_NUMBER || '').replace(/[^0-9]/g,'') || '79000000000';
const WHATSAPP_BASE = window.WHATSAPP_BASE || 'https://wa.me';

let products = [];
let cart = {}; // id -> qty

async function loadProducts() {
  try{
    const res = await fetch('products.json', { cache: 'no-store' });
    if(!res.ok) throw new Error('fetch failed');
    products = await res.json();
  } catch(e){
    products = [];
  }
  renderGrid();
  updateCartBadge();
}

function imgFor(p){
  return p.img || 'https://dummyimage.com/1200x800/0f1322/e7e9ee&text=' + encodeURIComponent(p.name);
}
function formatRub(n){ return new Intl.NumberFormat('ru-RU').format(Math.round(n)); }

function renderGrid() {
  const q = (search.value || '').toLowerCase().trim();
  const cat = filter.value;
  grid.innerHTML = '';
  products
    .filter(p => (cat === 'all' || p.category === cat))
    .filter(p => p.name.toLowerCase().includes(q))
    .forEach(p => {
      const el = document.createElement('div');
      el.className = 'card';
      el.innerHTML = `
        <img src="${imgFor(p)}" alt="${p.name}">
        <h3>${p.name}</h3>
        <div class="muted">${p.category === 'fish' ? 'Рыба' : 'Курица'} • ${p.unit}</div>
        <div class="row">
          <strong class="price">${formatRub(p.price)} ₽</strong>
          <button data-id="${p.id}">В корзину</button>
        </div>
      `;
      el.querySelector('button').addEventListener('click', () => addToCart(p.id));
      grid.appendChild(el);
    });
}

function addToCart(id, qty = 1) {
  cart[id] = (cart[id] || 0) + qty;
  updateCartBadge();
}

function updateCartBadge() {
  const count = Object.values(cart).reduce((a,b)=>a+b,0);
  cartCount.textContent = count;
}

function openCart() {
  renderCart();
  cartDialog.showModal();
}

function renderCart() {
  cartItems.innerHTML = '';
  let subtotal = 0;
  for (const [id, qty] of Object.entries(cart)) {
    const p = products.find(x => x.id === id);
    if (!p) continue;
    const lineTotal = p.price * qty;
    subtotal += lineTotal;
    const line = document.createElement('div');
    line.className = 'line';
    line.innerHTML = `
      <div>${p.name}</div>
      <div class="price">${formatRub(p.price)} ₽ × <input type="number" min="0" step="1" value="${qty}" data-id="${id}"></div>
      <div><strong class="price">${formatRub(lineTotal)} ₽</strong></div>
      <button aria-label="Удалить" data-del="${id}">✕</button>
    `;
    line.querySelector('input').addEventListener('change', (e) => {
      const v = Math.max(0, parseInt(e.target.value||'0',10));
      if (v === 0) delete cart[id]; else cart[id] = v;
      renderCart();
      updateCartBadge();
    });
    line.querySelector('button').addEventListener('click', () => {
      delete cart[id];
      renderCart();
      updateCartBadge();
    });
    cartItems.appendChild(line);
  }
  const delivery = subtotal >= 3000 ? 0 : 299;
  const grand = subtotal + delivery;
  subtotalEl.textContent = formatRub(subtotal);
  deliveryEl.textContent = formatRub(delivery);
  grandEl.textContent = formatRub(grand);
}

function genOrderId(){
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s=''; for(let i=0;i<10;i++){ s += alphabet[Math.floor(Math.random()*alphabet.length)]; }
  return s;
}

function composeWhatsAppMessage({ order, subtotal, deliveryFee, total }) {
  const lines = [
    `Заявка с сайта Рыба и Куры`,
    `Заказ № ${order.id}`,
    `Имя: ${order.customer.name}`,
    `Тел: ${order.customer.phone}`,
    `Адрес: ${order.customer.address}`,
    `— Позиции —`,
    ...order.lines.map(l => `${l.name} — ${l.price} ₽ × ${l.qty} = ${l.total} ₽`),
    `Сумма: ${subtotal} ₽`,
    `Доставка: ${deliveryFee} ₽`,
    `Итого: ${total} ₽`,
    order.note ? `Комментарий: ${order.note}` : null
  ].filter(Boolean);
  return lines.join('\n');
}

function openWhatsAppWith(text) {
  const msg = text.length > 1800 ? text.slice(0, 1800) + '\n…(сокращено)' : text;
  const url = `${WHATSAPP_BASE}/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

async function submitOrder(e) {
  e.preventDefault();
  const items = Object.entries(cart).map(([id, qty]) => ({ id, qty }));
  if (items.length === 0) { alert('Корзина пуста'); return; }
  const form = new FormData(checkoutForm);
  const order = {
    id: genOrderId(),
    createdAt: new Date().toISOString(),
    customer: {
      name: form.get('name'),
      phone: form.get('phone'),
      address: form.get('address')
    },
    note: form.get('note') || '',
    lines: items.map(({ id, qty }) => {
      const p = products.find(x => x.id === id);
      return {
        id,
        name: p.name,
        price: Math.round(p.price),
        unit: p.unit,
        qty,
        total: Math.round(p.price * qty)
      };
    })
  };
  const subtotal = order.lines.reduce((a,b) => a + b.total, 0);
  const deliveryFee = subtotal >= 3000 ? 0 : 299;
  const total = subtotal + deliveryFee;

  // Локальный чек (для пользователя)
  const receipt = [
    `Заказ № ${order.id}`,
    `Дата: ${new Date(order.createdAt).toLocaleString('ru-RU')}`,
    `Имя: ${order.customer.name}`,
    `Тел: ${order.customer.phone}`,
    `Адрес: ${order.customer.address}`,
    `--- Позиции ---`,
    ...order.lines.map(l => `${l.name} — ${l.price} ₽ × ${l.qty} = ${l.total} ₽`),
    `Сумма: ${subtotal} ₽`,
    `Доставка: ${deliveryFee} ₽`,
    `Итого: ${total} ₽`,
    order.note ? `Комментарий: ${order.note}` : null
  ].filter(Boolean).join('\n');
  alert(receipt);

  // Отправка заявки в WhatsApp
  const waText = composeWhatsAppMessage({ order, subtotal, deliveryFee, total });
  openWhatsAppWith(waText);

  // Очистка
  cart = {};
  updateCartBadge();
  cartDialog.close();
  checkoutForm.reset();
}

// UI wiring
filter.addEventListener('change', renderGrid);
search.addEventListener('input', renderGrid);
viewCartBtn.addEventListener('click', openCart);
closeCart.addEventListener('click', () => cartDialog.close());
checkoutForm.addEventListener('submit', submitOrder);

// init
loadProducts();
