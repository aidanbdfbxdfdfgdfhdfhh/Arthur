const BASE_URL = 'https://backend-67bt.onrender.com';

let currentUser = null;
let cart = [];
let products = [];

/* ===================== TOAST ===================== */
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  setTimeout(() => (toast.className = 'toast hidden'), 2500);
}

/* ===================== AUTH ===================== */
async function signUp(username, password) {
  const res = await fetch(`${BASE_URL}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) return showToast('Sign up failed', 'error');

  currentUser = await res.json();
  localStorage.setItem('currentUser', JSON.stringify(currentUser));
  closeAuthModal();
  updateUI();
  loadCart();
}

async function signIn(username, password) {
  const res = await fetch(`${BASE_URL}/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) return showToast('Sign in failed', 'error');

  currentUser = await res.json();
  localStorage.setItem('currentUser', JSON.stringify(currentUser));
  closeAuthModal();
  updateUI();
  loadCart();
}

function signOut() {
  currentUser = null;
  cart = [];
  localStorage.removeItem('currentUser');
  updateUI();
  showToast('Signed out');
}

/* ===================== PRODUCTS ===================== */
async function fetchProducts() {
  const res = await fetch(`${BASE_URL}/products`);
  products = await res.json();
  renderProducts();
}

function renderProducts() {
  const list = document.getElementById('product-list');
  list.innerHTML = '';

  products.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = p.id;

    card.innerHTML = `
      <img src="${p.img}" onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'">
      <h3>${p.name}</h3>
      <p class="price">$${p.price.toFixed(2)}</p>
      <button class="add-to-cart">Add to cart</button>
      ${currentUser?.isAdmin ? `<button class="remove-product">Remove product</button>` : ''}
    `;

    list.appendChild(card);
  });
}

/* ===================== CART ===================== */
async function loadCart() {
  if (!currentUser) {
    cart = [];
    renderCart();
    return;
  }

  const res = await fetch(`${BASE_URL}/cart/${currentUser.id}`);
  cart = await res.json();
  renderCart();
}

function renderCart() {
  const items = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  items.innerHTML = '';

  if (!cart.length) {
    items.innerHTML = '<p>Your cart is empty.</p>';
    totalEl.textContent = '0.00';
    document.getElementById('cart-count').textContent = '0';
    return;
  }

  const grouped = {};
  cart.forEach(p => {
    if (!grouped[p.productId]) grouped[p.productId] = { ...p, qty: 0 };
    grouped[p.productId].qty++;
  });

  Object.values(grouped).forEach(item => {
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.dataset.cartId = item.id;
    div.dataset.productId = item.productId;

    div.innerHTML = `
      <img src="${item.img}">
      <div>
        <strong>${item.name}</strong><br>
        $${item.price} × ${item.qty}
      </div>
      <div>
        <button class="remove-one">Remove 1</button>
        <button class="remove-all">Remove all</button>
      </div>
    `;

    items.appendChild(div);
  });

  totalEl.textContent = cart.reduce((s, p) => s + p.price, 0).toFixed(2);
  document.getElementById('cart-count').textContent = cart.length;
}

async function addToCart(productId) {
  if (!currentUser) return showToast('Sign in first', 'error');

  await fetch(`${BASE_URL}/cart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: currentUser.id, productId })
  });

  loadCart();
}

async function removeOne(cartId) {
  await fetch(`${BASE_URL}/cart/${cartId}`, { method: 'DELETE' });
  loadCart();
}

async function removeAll(productId) {
  const items = cart.filter(c => c.productId == productId);
  await Promise.all(items.map(i =>
    fetch(`${BASE_URL}/cart/${i.id}`, { method: 'DELETE' })
  ));
  loadCart();
}

/* ===================== ADMIN ===================== */
async function addProduct(name, price, img) {
  await fetch(`${BASE_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, price, img, admin: true })
  });

  closeAdminModal();
  fetchProducts();
}

async function deleteProduct(id) {
  await fetch(`${BASE_URL}/products/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ admin: true })
  });

  fetchProducts();
}

/* ===================== MODALS ===================== */
function openAuthModal() { document.getElementById('auth-modal').classList.remove('hidden'); }
function closeAuthModal() { document.getElementById('auth-modal').classList.add('hidden'); }
function openAdminModal() { document.getElementById('admin-modal').classList.remove('hidden'); }
function closeAdminModal() { document.getElementById('admin-modal').classList.add('hidden'); }
function openCartModal() { document.getElementById('cart-modal').classList.remove('hidden'); }
function closeCartModal() { document.getElementById('cart-modal').classList.add('hidden'); }

/* ===================== UI ===================== */
function updateUI() {
  document.getElementById('auth-btn').style.display = currentUser ? 'none' : 'inline-block';
  document.getElementById('signout-btn').style.display = currentUser ? 'inline-block' : 'none';
  document.getElementById('admin-add-btn').style.display = currentUser?.isAdmin ? 'inline-block' : 'none';

  const banner = document.getElementById('current-user-banner');
  banner.style.display = currentUser ? 'inline-block' : 'none';
  banner.textContent = currentUser ? `Hello ${currentUser.username}` : '';

  renderProducts();
  renderCart();
}

/* ===================== EVENTS ===================== */
document.addEventListener('DOMContentLoaded', () => {
  currentUser = JSON.parse(localStorage.getItem('currentUser'));
  updateUI();
  fetchProducts();
  loadCart();

  document.getElementById('auth-btn').onclick = openAuthModal;
  document.getElementById('signout-btn').onclick = signOut;
  document.getElementById('admin-add-btn').onclick = openAdminModal;
  document.getElementById('cart-button').onclick = openCartModal;
  document.getElementById('cart-close').onclick = closeCartModal;
  document.getElementById('auth-close').onclick = closeAuthModal;
  document.getElementById('admin-close').onclick = closeAdminModal;

  document.getElementById('auth-form').onsubmit = e => {
    e.preventDefault();
    const u = document.getElementById('auth-username').value;
    const p = document.getElementById('auth-password').value;
    const mode = document.getElementById('auth-submit').textContent;
    mode === 'Sign up' ? signUp(u, p) : signIn(u, p);
  };

  document.getElementById('auth-toggle').onclick = e => {
    if (e.target.id !== 'toggle-link') return;
    const title = document.getElementById('auth-title');
    const submit = document.getElementById('auth-submit');
    const isSignIn = title.textContent === 'Sign in';
    title.textContent = isSignIn ? 'Sign up' : 'Sign in';
    submit.textContent = title.textContent;
  };

  document.getElementById('product-list').onclick = e => {
    const card = e.target.closest('.card');
    if (!card) return;
    const id = Number(card.dataset.id);
    if (e.target.classList.contains('add-to-cart')) addToCart(id);
    if (e.target.classList.contains('remove-product')) deleteProduct(id);
  };

  document.getElementById('cart-items').onclick = e => {
    const item = e.target.closest('.cart-item');
    if (!item) return;
    if (e.target.classList.contains('remove-one')) removeOne(item.dataset.cartId);
    if (e.target.classList.contains('remove-all')) removeAll(item.dataset.productId);
  };
});
