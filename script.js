const BASE_URL = 'https://backend-67bt.onrender.com';

let currentUser = null;
let cart = [];
let products = [];

// --- Utilities ---
async function fetchProducts() {
  const res = await fetch(`${BASE_URL}/products`);
  products = await res.json();
  renderProducts();
}

async function loadCart() {
  if (!currentUser) return;
  const res = await fetch(`${BASE_URL}/cart/${currentUser.id}`);
  cart = await res.json();
  renderCart();
}

function renderCart() {
  const cartContainer = document.getElementById('cart-items');
  if (!cartContainer) return;
  cartContainer.innerHTML = '';
  if (!cart.length) return cartContainer.innerHTML = '<p>Your cart is empty.</p>';

  const grouped = {};
  cart.forEach(p => grouped[p.productId] = grouped[p.productId] ? {...grouped[p.productId], qty: grouped[p.productId].qty+1} : {...p, qty:1});
  Object.values(grouped).forEach(item => {
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <img src="${item.img}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/64x48?text=No+Image'">
      <div class="cart-item-info">
        <div class="name">${item.name}</div>
        <div class="meta">$${item.price.toFixed(2)} × ${item.qty} = $${(item.price*item.qty).toFixed(2)}</div>
      </div>
      <div class="cart-item-actions">
        <button onclick="removeOne(${item.id})">Remove 1</button>
        <button onclick="removeAll(${item.id})">Remove all</button>
      </div>
    `;
    cartContainer.appendChild(div);
  });

  document.getElementById('cart-total').textContent = cart.reduce((sum,p)=>sum+p.price,0).toFixed(2);
}

// --- Auth ---
async function signUp(username,password) {
  const res = await fetch(`${BASE_URL}/signup`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({username,password})
  });
  if (!res.ok) return alert('Sign up failed');
  currentUser = await res.json();
  sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
  updateUI();
}

async function signIn(username,password) {
  const res = await fetch(`${BASE_URL}/signin`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({username,password})
  });
  if (!res.ok) return alert('Sign in failed');
  currentUser = await res.json();
  sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
  updateUI();
}

function signOut() {
  currentUser = null;
  cart = [];
  sessionStorage.removeItem('currentUser');
  updateUI();
}

// --- Cart actions ---
async function addToCart(productId) {
  if (!currentUser) return alert('Sign in first');
  await fetch(`${BASE_URL}/cart`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({userId: currentUser.id, productId})
  });
  await loadCart();
}

async function removeOne(cartId) {
  await fetch(`${BASE_URL}/cart/${cartId}`, { method:'DELETE' });
  await loadCart();
}

async function removeAll(cartId) {
  await fetch(`${BASE_URL}/cart/${cartId}`, { method:'DELETE' });
  await loadCart();
}

// --- Admin actions ---
async function addProduct(name,price,img) {
  if (!currentUser?.isAdmin) return;
  await fetch(`${BASE_URL}/products`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({name,price,img,admin:true})
  });
  await fetchProducts();
}

async function deleteProduct(id) {
  if (!currentUser?.isAdmin) return;
  await fetch(`${BASE_URL}/products/${id}`, {
    method:'DELETE',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({admin:true})
  });
  await fetchProducts();
}

// --- UI ---
function renderProducts() {
  const list = document.getElementById('product-list');
  list.innerHTML = '';
  products.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${p.img}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'">
      <h3>${p.name}</h3>
      <p class="price">$${p.price.toFixed(2)}</p>
      <button onclick="addToCart(${p.id})">Add to cart</button>
      ${currentUser?.isAdmin ? `<button class="remove-product" onclick="deleteProduct(${p.id})">Remove product</button>` : ''}
    `;
    list.appendChild(card);
  });
}

function updateUI() {
  document.getElementById('auth-btn').style.display = currentUser ? 'none' : 'inline-block';
  const banner = document.getElementById('current-user-banner');
  if (currentUser) {
    banner.textContent = `Hello ${currentUser.username}`;
    banner.classList.remove('hidden');
    document.getElementById('admin-add-btn').classList.toggle('hidden', !currentUser.isAdmin);
    loadCart();
  } else {
    banner.textContent = '';
    banner.classList.add('hidden');
    document.getElementById('admin-add-btn').classList.add('hidden');
    cart = [];
    renderCart();
  }
  fetchProducts();
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || null;

  updateUI();

  // Auth modal
  const authBtn = document.getElementById('auth-btn');
  const authModal = document.getElementById('auth-modal');
  const authClose = document.getElementById('auth-close');
  const authForm = document.getElementById('auth-form');
  const toggleLink = document.getElementById('toggle-link');
  const authTitle = document.getElementById('auth-title');
  const authSubmit = document.getElementById('auth-submit');
  let signupMode = false;

  authBtn.addEventListener('click', () => authModal.classList.remove('hidden'));
  authClose.addEventListener('click', () => authModal.classList.add('hidden'));

  toggleLink.addEventListener('click', e => {
    e.preventDefault();
    signupMode = !signupMode;
    authTitle.textContent = signupMode ? 'Sign up' : 'Sign in';
    authSubmit.textContent = signupMode ? 'Sign up' : 'Sign in';
  });

  authForm.addEventListener('submit', async e => {
    e.preventDefault();
    const username = document.getElementById('auth-username').value;
    const password = document.getElementById('auth-password').value;
    if (signupMode) await signUp(username,password);
    else await signIn(username,password);
    authModal.classList.add('hidden');
  });

  // Sign out button
  const signOutBtn = document.createElement('button');
  signOutBtn.textContent = 'Sign out';
  signOutBtn.onclick = signOut;
  document.getElementById('user-area').appendChild(signOutBtn);

  // Admin add product modal
  const adminBtn = document.getElementById('admin-add-btn');
  const adminModal = document.getElementById('admin-modal');
  const adminClose = document.getElementById('admin-close');
  const adminForm = document.getElementById('admin-form');

  adminBtn.addEventListener('click', () => adminModal.classList.remove('hidden'));
  adminClose.addEventListener('click', () => adminModal.classList.add('hidden'));
  adminForm.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('admin-name').value;
    const price = parseFloat(document.getElementById('admin-price').value);
    const img = document.getElementById('admin-img').value || 'https://via.placeholder.com/400x300?text=No+Image';
    await addProduct(name,price,img);
    adminModal.classList.add('hidden');
    adminForm.reset();
  });

  // Cart modal
  const cartBtn = document.getElementById('cart-button');
  const cartModal = document.getElementById('cart-modal');
  const cartClose = document.getElementById('cart-close');
  cartBtn.addEventListener('click', () => cartModal.classList.remove('hidden'));
  cartClose.addEventListener('click', () => cartModal.classList.add('hidden'));

  document.getElementById('clear-cart').addEventListener('click', async () => {
    for (let item of cart) await removeAll(item.id);
  });
});
