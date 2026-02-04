const API = 'https://backend-67bt.onrender.com';

let currentUser = null;
let products = [];
let cart = [];

// ------------------- UTILITIES -------------------
function showToast(message, type='info') {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = message;
  t.className = `toast show ${type}`;
  clearTimeout(t._hideTimer);
  t._hideTimer = setTimeout(() => { t.className = 'toast hidden'; }, 3000);
}

function updateCartCount() {
  const el = document.getElementById('cart-count');
  if (el) el.textContent = cart.length;
}

function displayNameFor(user) {
  return user.displayName || user.username;
}

// ------------------- AUTH -------------------
async function signIn(username, password) {
  try {
    const res = await fetch(`${API}/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.error) { showToast(data.error, 'error'); return false; }
    currentUser = data;
    localStorage.setItem('pcstore-current-user', JSON.stringify(currentUser));
    showToast(`Welcome back, ${displayNameFor(currentUser)}!`, 'success');
    await loadUserCart();
    updateUserUI();
    renderProducts();
    return true;
  } catch(e) { showToast('Sign in failed', 'error'); console.error(e); return false; }
}

async function signUp(username, password) {
  try {
    const res = await fetch(`${API}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.error) { showToast(data.error, 'error'); return false; }
    currentUser = data;
    localStorage.setItem('pcstore-current-user', JSON.stringify(currentUser));
    showToast(`Account created — welcome, ${displayNameFor(currentUser)}!`, 'success');
    await loadUserCart();
    updateUserUI();
    renderProducts();
    return true;
  } catch(e) { showToast('Sign up failed', 'error'); console.error(e); return false; }
}

function signOut() {
  currentUser = null;
  localStorage.removeItem('pcstore-current-user');
  cart = [];
  updateCartCount();
  updateUserUI();
  renderProducts();
  showToast('Signed out', 'info');
}

function updateUserUI() {
  const authBtn = document.getElementById('auth-btn');
  const adminBtn = document.getElementById('admin-add-btn');
  const banner = document.getElementById('current-user-banner');

  if (currentUser) {
    if (authBtn) authBtn.style.display = 'none';
    if (banner) { banner.textContent = `Signed in: ${displayNameFor(currentUser)}`; banner.classList.remove('hidden'); }
    if (adminBtn) { adminBtn.style.display = currentUser.isAdmin ? 'inline-block' : 'none'; }
  } else {
    if (authBtn) authBtn.style.display = 'inline-block';
    if (banner) { banner.textContent = ''; banner.classList.add('hidden'); }
    if (adminBtn) { adminBtn.style.display = 'none'; }
  }
}

// ------------------- PRODUCTS -------------------
async function fetchProducts() {
  try {
    const res = await fetch(`${API}/products`);
    products = await res.json();
    renderProducts();
  } catch(e) { showToast('Failed to fetch products', 'error'); console.error(e); }
}

async function addProduct(name, price, img) {
  if (!currentUser || !currentUser.isAdmin) { showToast('Only admins can add products', 'error'); return; }
  try {
    const res = await fetch(`${API}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, price, img })
    });
    const newProduct = await res.json();
    products.push(newProduct);
    renderProducts();
    showToast('Product added', 'success');
  } catch(e) { showToast('Failed to add product', 'error'); console.error(e); }
}

async function removeProduct(id) {
  if (!currentUser || !currentUser.isAdmin) { showToast('Only admins can remove products', 'error'); return; }
  try {
    await fetch(`${API}/products/${id}`, { method: 'DELETE' });
    products = products.filter(p => p.id !== id);
    renderProducts();
    await loadUserCart(); // reload cart from server
    showToast('Product removed', 'info');
  } catch(e) { showToast('Failed to remove product', 'error'); console.error(e); }
}

function renderProducts() {
  const list = document.getElementById('product-list');
  if (!list) return;
  list.innerHTML = '';
  products.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${p.img || 'https://via.placeholder.com/400x300?text=No+Image'}" alt="${p.name}">
      <h3>${p.name}</h3>
      <p class="price">$${p.price.toFixed(2)}</p>
      <div class="card-actions"></div>
    `;
    list.appendChild(card);
    const actions = card.querySelector('.card-actions');
    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add to cart';
    addBtn.addEventListener('click', () => addToCart(p.id));
    actions.appendChild(addBtn);

    if (currentUser && currentUser.isAdmin) {
      const rmBtn = document.createElement('button');
      rmBtn.textContent = 'Remove product';
      rmBtn.className = 'remove-product';
      rmBtn.addEventListener('click', () => removeProduct(p.id));
      actions.appendChild(rmBtn);
    }
  });
}

// ------------------- CART -------------------
async function loadUserCart() {
  if (!currentUser) { cart = []; updateCartCount(); return; }
  try {
    const res = await fetch(`${API}/cart?userId=${currentUser.id}`);
    cart = await res.json();
    updateCartCount();
  } catch(e) { showToast('Failed to load cart', 'error'); console.error(e); }
}

async function addToCart(productId) {
  if (!currentUser) { openAuthModal('signin'); return; }
  try {
    const res = await fetch(`${API}/cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, productId })
    });
    cart = await res.json();
    updateCartCount();
    showToast('Added to cart', 'success');
  } catch(e) { showToast('Failed to add to cart', 'error'); console.error(e); }
}

async function removeFromCart(productId, count=1) {
  if (!currentUser) return;
  try {
    const res = await fetch(`${API}/cart`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, productId, count })
    });
    cart = await res.json();
    renderCart();
    updateCartCount();
    showToast('Cart updated', 'info');
  } catch(e) { showToast('Failed to remove from cart', 'error'); console.error(e); }
}

function renderCart() {
  const container = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  if (!container || !totalEl) return;
  container.innerHTML = '';
  if (!cart || cart.length === 0) {
    container.innerHTML = '<p>Your cart is empty.</p>';
    totalEl.textContent = '0.00';
    return;
  }
  const groups = {};
  cart.forEach(p => {
    if (!groups[p.id]) groups[p.id] = { ...p, qty: 0 };
    groups[p.id].qty++;
  });
  const fragment = document.createDocumentFragment();
  Object.values(groups).forEach(item => {
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <img src="${item.img}" alt="${item.name}">
      <div class="cart-item-info">
        <div class="name">${item.name}</div>
        <div class="meta">$${item.price.toFixed(2)} × ${item.qty} = $${(item.price*item.qty).toFixed(2)}</div>
      </div>
      <div class="cart-item-actions">
        <button data-id="${item.id}" class="remove-one">Remove 1</button>
        <button data-id="${item.id}" class="remove-all">Remove all</button>
      </div>
    `;
    fragment.appendChild(div);
  });
  container.appendChild(fragment);

  const total = cart.reduce((s,p)=> s+p.price,0);
  totalEl.textContent = total.toFixed(2);

  container.querySelectorAll('.remove-one').forEach(btn => btn.addEventListener('click', e => {
    removeFromCart(Number(e.target.dataset.id), 1);
  }));
  container.querySelectorAll('.remove-all').forEach(btn => btn.addEventListener('click', e => {
    removeFromCart(Number(e.target.dataset.id), Infinity);
  }));
}

// ------------------- MODALS -------------------
function openAuthModal(mode='signin') {
  const authModal = document.getElementById('auth-modal');
  const authTitle = document.getElementById('auth-title');
  const authSubmit = document.getElementById('auth-submit');
  const authToggleText = document.getElementById('auth-toggle');
  authModal.classList.remove('hidden');
  authTitle.textContent = mode === 'signin' ? 'Sign in' : 'Create account';
  authSubmit.textContent = mode === 'signin' ? 'Sign in' : 'Create account';
  authToggleText.innerHTML = mode === 'signin' 
    ? `Don't have an account? <a href="#" id="toggle-link">Create one</a>` 
    : `Have an account? <a href="#" id="toggle-link">Sign in</a>`;
  document.getElementById('toggle-link').onclick = e => {
    e.preventDefault();
    openAuthModal(mode==='signin' ? 'signup':'signin');
  };
}

function closeAuthModal() {
  const authModal = document.getElementById('auth-modal');
  authModal.classList.add('hidden');
  document.getElementById('auth-form').reset();
}

function openCartModal() { document.getElementById('cart-modal').classList.remove('hidden'); renderCart(); }
function closeCartModal() { document.getElementById('cart-modal').classList.add('hidden'); }

// ------------------- INIT -------------------
document.addEventListener('DOMContentLoaded', async () => {
  // restore user
  const saved = localStorage.getItem('pcstore-current-user');
  if (saved) currentUser = JSON.parse(saved);

  await fetchProducts();
  await loadUserCart();
  updateUserUI();

  // AUTH bindings
  document.getElementById('auth-btn').addEventListener('click', () => openAuthModal('signin'));
  document.getElementById('auth-close').addEventListener('click', closeAuthModal);
  document.getElementById('auth-form').addEventListener('submit', async e => {
    e.preventDefault();
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value;
    const mode = document.getElementById('auth-submit').textContent.toLowerCase().includes('create') ? 'signup' : 'signin';
    if (mode==='signin') await signIn(username,password);
    else await signUp(username,password);
    closeAuthModal();
  });

  document.getElementById('user-area').addEventListener('click', e => {
    if (e.target.id==='logout-btn') signOut();
  });

  // ADMIN bindings
  document.getElementById('admin-add-btn').addEventListener('click', () => {
    const name = prompt('Product name:');
    const price = parseFloat(prompt('Price:'));
    const img = prompt('Image URL (optional):');
    if (name && !isNaN(price)) addProduct(name, price, img);
  });

  // CART bindings
  document.getElementById('cart-button').addEventListener('click', openCartModal);
  document.getElementById('cart-close').addEventListener('click', closeCartModal);
  document.getElementById('clear-cart').addEventListener('click', async () => {
    for (const p of cart) await removeFromCart(p.id, Infinity);
    showToast('Cart cleared', 'info');
  });
  document.getElementById('checkout-btn').addEventListener('click', () => showToast('Checkout not implemented', 'info'));
});
