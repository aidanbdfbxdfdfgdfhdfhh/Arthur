const BASE_URL = 'https://backend-67bt.onrender.com'; // your Render backend

let currentUser = null;
let cart = [];
let products = [];

// --- Utilities ---
async function fetchProducts() {
  const res = await fetch(`${BASE_URL}/products`);
  products = await res.json();
  renderProducts();
}

async function renderCart() {
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
      <img src="${item.img}" alt="${item.name}">
      <div>
        <div>${item.name}</div>
        <div>$${item.price.toFixed(2)} × ${item.qty} = $${(item.price*item.qty).toFixed(2)}</div>
      </div>
      <div>
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
  const res = await fetch(`${BASE_URL}/signup`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username,password}) });
  if (!res.ok) return alert('Sign up failed');
  currentUser = await res.json();
  localStorage.setItem('currentUser', JSON.stringify(currentUser));
  loadCart();
  updateUI();
}

async function signIn(username,password) {
  const res = await fetch(`${BASE_URL}/signin`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username,password}) });
  if (!res.ok) return alert('Sign in failed');
  currentUser = await res.json();
  localStorage.setItem('currentUser', JSON.stringify(currentUser));
  loadCart();
  updateUI();
}

function signOut() {
  currentUser = null;
  cart = [];
  localStorage.removeItem('currentUser');
  updateUI();
}

// --- Cart actions ---
async function loadCart() {
  if (!currentUser) return;
  const res = await fetch(`${BASE_URL}/cart/${currentUser.id}`);
  cart = await res.json();
  renderCart();
}

async function addToCart(productId) {
  if (!currentUser) return alert('Sign in first');
  await fetch(`${BASE_URL}/cart`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({userId:currentUser.id,productId}) });
  loadCart();
}

// --- Render products ---
function renderProducts() {
  const list = document.getElementById('product-list');
  list.innerHTML = '';
  products.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${p.img}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'">
      <h3>${p.name}</h3>
      <p>$${p.price.toFixed(2)}</p>
      <button onclick="addToCart(${p.id})">Add to cart</button>
      ${currentUser?.isAdmin ? `<button onclick="deleteProduct(${p.id})">Remove product</button>` : ''}
    `;
    list.appendChild(card);
  });
}

async function deleteProduct(id) {
  if (!currentUser?.isAdmin) return;
  await fetch(`${BASE_URL}/products/${id}`, { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({admin:true}) });
  fetchProducts();
}

// --- UI updates ---
function updateUI() {
  document.getElementById('auth-btn').style.display = currentUser ? 'none' : 'inline-block';
  document.getElementById('user-greeting').textContent = currentUser ? `Hello ${currentUser.username}` : '';
  fetchProducts();
  loadCart();
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
  updateUI();
});
