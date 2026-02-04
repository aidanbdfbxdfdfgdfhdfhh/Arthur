const BASE_URL = 'https://backend-67bt.onrender.com'; // your Render backend

let currentUser = null;
let cart = [];
let products = [];

// --- Utilities ---
async function fetchProducts() {
  try {
    const res = await fetch(`${BASE_URL}/products`);
    products = await res.json();
    renderProducts();
  } catch (e) {
    showToast('Failed to load products', 'error');
  }
}

async function loadCart() {
  if (!currentUser) {
    cart = [];
    renderCart();
    return;
  }
  try {
    const res = await fetch(`${BASE_URL}/cart/${currentUser.id}`);
    cart = await res.json();
    renderCart();
  } catch (e) {
    showToast('Failed to load cart', 'error');
  }
}

// --- Toast ---
function showToast(msg, type='info') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.className = 'toast hidden', 2500);
}

// --- Auth ---
async function signUp(username, password) {
  try {
    const res = await fetch(`${BASE_URL}/signup`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({username,password})
    });
    if (!res.ok) return showToast('Sign up failed', 'error');
    currentUser = await res.json();
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    loadCart();
    updateUI();
    closeAuthModal();
    showToast(`Signed up as ${currentUser.username}`, 'success');
  } catch(e) { showToast('Sign up error', 'error'); }
}

async function signIn(username, password) {
  try {
    const res = await fetch(`${BASE_URL}/signin`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({username,password})
    });
    if (!res.ok) return showToast('Sign in failed', 'error');
    currentUser = await res.json();
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    loadCart();
    updateUI();
    closeAuthModal();
    showToast(`Signed in as ${currentUser.username}`, 'success');
  } catch(e) { showToast('Sign in error', 'error'); }
}

function signOut() {
  currentUser = null;
  cart = [];
  localStorage.removeItem('currentUser');
  updateUI();
  showToast('Signed out', 'info');
}

// --- Render Products ---
function renderProducts() {
  const list = document.getElementById('product-list');
  list.innerHTML = '';
  products.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = p.id;
    card.innerHTML = `
      <img src="${p.img}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'">
      <h3>${p.name}</h3>
      <p class="price">$${p.price.toFixed(2)}</p>
      <button class="add-to-cart">Add to cart</button>
      ${currentUser?.isAdmin ? `<button class="remove-product">Remove product</button>` : ''}
    `;
    list.appendChild(card);
  });
}

// --- Render Cart ---
function renderCart() {
  const cartContainer = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  cartContainer.innerHTML = '';

  if (!cart.length) {
    cartContainer.innerHTML = '<p>Your cart is empty.</p>';
    totalEl.textContent = '0.00';
    document.getElementById('cart-count').textContent = 0;
    return;
  }

  const grouped = {};
  cart.forEach(p => grouped[p.productId] = grouped[p.productId] ? {...grouped[p.productId], qty: grouped[p.productId].qty+1} : {...p, qty:1});
  Object.values(grouped).forEach(item => {
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.dataset.cartId = item.id;
    div.dataset.productId = item.productId;
    div.innerHTML = `
      <img src="${item.img}" alt="${item.name}">
      <div class="cart-item-info">
        <div class="name">${item.name}</div>
        <div class="meta">$${item.price.toFixed(2)} × ${item.qty} = $${(item.price*item.qty).toFixed(2)}</div>
      </div>
      <div class="cart-item-actions">
        <button class="remove-one">Remove 1</button>
        <button class="remove-all">Remove all</button>
      </div>
    `;
    cartContainer.appendChild(div);
  });

  const total = cart.reduce((sum,p)=>sum+p.price,0);
  totalEl.textContent = total.toFixed(2);
  document.getElementById('cart-count').textContent = cart.length;
}

// --- Cart actions ---
async function addToCart(productId) {
  if (!currentUser) return showToast('Sign in first', 'error');
  await fetch(`${BASE_URL}/cart`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({userId: currentUser.id, productId})
  });
  loadCart();
}

async function removeOne(cartId) {
  await fetch(`${BASE_URL}/cart/${cartId}`, {method:'DELETE'});
  loadCart();
}

async function removeAll(productId) {
  const toDelete = cart.filter(c => c.productId === productId);
  await Promise.all(toDelete.map(c => fetch(`${BASE_URL}/cart/${c.id}`, {method:'DELETE'})));
  loadCart();
}

// --- Product actions ---
async function deleteProduct(id) {
  if (!currentUser?.isAdmin) return showToast('Admin only', 'error');
  await fetch(`${BASE_URL}/products/${id}`, {
    method:'DELETE',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({admin:true})
  });
  fetchProducts();
}

async function addProduct(name, price, img) {
  if (!currentUser?.isAdmin) return showToast('Admin only', 'error');
  const res = await fetch(`${BASE_URL}/products`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({name, price, img, admin:true})
  });
  if (!res.ok) return showToast('Failed to add product', 'error');
  fetchProducts();
  closeAdminModal();
  showToast(`Added ${name}`, 'success');
}

// --- Modals ---
function openAuthModal() { document.getElementById('auth-modal').classList.remove('hidden'); }
function closeAuthModal() { document.getElementById('auth-modal').classList.add('hidden'); }
function openAdminModal() { document.getElementById('admin-modal').classList.remove('hidden'); }
function closeAdminModal() { document.getElementById('admin-modal').classList.add('hidden'); }
function openCartModal() { document.getElementById('cart-modal').classList.remove('hidden'); }
function closeCartModal() { document.getElementById('cart-modal').classList.add('hidden'); }

// --- UI Updates ---
function updateUI() {
  document.getElementById('auth-btn').style.display = currentUser ? 'none' : 'inline-block';
  document.getElementById('admin-add-btn').style.display = (currentUser?.isAdmin) ? 'inline-block' : 'none';
  document.getElementById('current-user-banner').style.display = currentUser ? 'inline-block' : 'none';
  document.getElementById('current-user-banner').textContent = currentUser ? `Hello ${currentUser.username}` : '';
  renderProducts();
  renderCart();
}

// --- Event Delegation ---
document.addEventListener('DOMContentLoaded', () => {
  currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
  updateUI();
  fetchProducts();
  loadCart();

  // Header buttons
  document.getElementById('auth-btn').addEventListener('click', openAuthModal);
  document.getElementById('admin-add-btn').addEventListener('click', openAdminModal);
  document.getElementById('cart-button').addEventListener('click', openCartModal);

  // Auth modal
  document.getElementById('auth-close').addEventListener('click', closeAuthModal);
  document.getElementById('auth-form').addEventListener('submit', e => {
    e.preventDefault();
    const username = document.getElementById('auth-username').value;
    const password = document.getElementById('auth-password').value;
    const submit = document.getElementById('auth-submit').textContent;
    if (submit.includes('Sign up')) signUp(username,password);
    else signIn(username,password);
  });
  document.getElementById('toggle-link').addEventListener('click', e => {
    e.preventDefault();
    const title = document.getElementById('auth-title');
    const submit = document.getElementById('auth-submit');
    if (title.textContent === 'Sign in') {
      title.textContent = 'Sign up';
      submit.textContent = 'Sign up';
      document.getElementById('auth-toggle').innerHTML = 'Already have an account? <a href="#" id="toggle-link">Sign in</a>';
    } else {
      title.textContent = 'Sign in';
      submit.textContent = 'Sign in';
      document.getElementById('auth-toggle').innerHTML = 'Don\'t have an account? <a href="#" id="toggle-link">Create one</a>';
    }
    // Reattach toggle listener
    document.getElementById('toggle-link').addEventListener('click', e => { e.preventDefault(); document.getElementById('toggle-link').click(); });
  });

  // Admin modal
  document.getElementById('admin-close').addEventListener('click', closeAdminModal);
  document.getElementById('admin-form').addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('admin-name').value;
    const price = parseFloat(document.getElementById('admin-price').value);
    const img = document.getElementById('admin-img').value || 'https://via.placeholder.com/400x300';
    addProduct(name, price, img);
  });

  // Cart modal
  document.getElementById('cart-close').addEventListener('click', closeCartModal);
  document.getElementById('clear-cart').addEventListener('click', async () => {
    if (!currentUser) return;
    await Promise.all(cart.map(c => fetch(`${BASE_URL}/cart/${c.id}`, {method:'DELETE'})));
    loadCart();
  });

  // Event delegation for dynamic buttons
  document.getElementById('product-list').addEventListener('click', e => {
    const card = e.target.closest('.card');
    if (!card) return;
    const productId = parseInt(card.dataset.id);
    if (e.target.classList.contains('add-to-cart')) addToCart(productId);
    if (e.target.classList.contains('remove-product')) deleteProduct(productId);
  });

  document.getElementById('cart-items').addEventListener('click', e => {
    const item = e.target.closest('.cart-item');
    if (!item) return;
    const cartId = parseInt(item.dataset.cartId);
    const productId = parseInt(item.dataset.productId);
    if (e.target.classList.contains('remove-one')) removeOne(cartId);
    if (e.target.classList.contains('remove-all')) removeAll(productId);
  });
});
