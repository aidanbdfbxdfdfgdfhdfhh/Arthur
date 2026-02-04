// pc-store.js - fixed full version

let products = [
  { id: 1, name: "Gaming PC - Ryzen 7", price: 1299, img: "https://via.placeholder.com/400x300?text=Gaming+PC" },
  { id: 2, name: "Workstation - Intel Xeon", price: 1899, img: "https://via.placeholder.com/400x300?text=Workstation" },
  { id: 3, name: "Mini PC - NUC", price: 499, img: "https://via.placeholder.com/400x300?text=Mini+PC" }
];

const PRODUCTS_KEY = 'pcstore-products';
const USERS_KEY = 'pcstore-users';
const CURRENT_USER_KEY = 'pcstore-current-user';

let authMode = 'signin';
let cart = [];

// -------------------
// LocalStorage Helpers
// -------------------
function loadProducts() {
  const raw = localStorage.getItem(PRODUCTS_KEY);
  if (raw) {
    try { products = JSON.parse(raw); } catch(e) { console.error('loadProducts parse error', e); }
  } else saveProducts();
}
function saveProducts() { localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products)); }

function getUsers() { return JSON.parse(localStorage.getItem(USERS_KEY) || '{}'); }
function saveUsers(u) { localStorage.setItem(USERS_KEY, JSON.stringify(u)); }

function getCurrentUser() { return localStorage.getItem(CURRENT_USER_KEY); }
function setCurrentUser(username) {
  if (username) {
    localStorage.setItem(CURRENT_USER_KEY, username);
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
  updateUserUI();
  loadUserCart();
}

// -------------------
// Cart Helpers
// -------------------
function cartKeyForUser(username) { return `pcstore-cart-${username}`; }

function loadUserCart() {
  const user = getCurrentUser();
  if (user) {
    cart = JSON.parse(localStorage.getItem(cartKeyForUser(user)) || '[]');
  } else cart = [];
  updateCartCount();
}

function saveCart() {
  const user = getCurrentUser();
  if (user) localStorage.setItem(cartKeyForUser(user), JSON.stringify(cart));
}

function updateCartCount() {
  const el = document.getElementById('cart-count');
  if (el) el.textContent = cart.length;
}

// -------------------
// User Helpers
// -------------------
function normalizeUsername(raw) { return (raw || '').trim().toLowerCase(); }
function displayNameFor(username) {
  const users = getUsers();
  return (users[username] && users[username].displayName) ? users[username].displayName : username;
}

function isAdminUser() {
  const user = getCurrentUser();
  if (!user) return false;
  const users = getUsers();
  return users[user] && users[user].isAdmin;
}

// -------------------
// Auth Functions
// -------------------
function signUp(username, password) {
  const users = getUsers();
  const normalized = normalizeUsername(username);
  if (!normalized) { showToast('Please enter a username', 'error'); return false; }
  if (users[normalized]) { showToast('Username exists', 'error'); return false; }
  users[normalized] = { password, displayName: username.trim() };
  if (normalized === 'aidan') users[normalized].isAdmin = true; // admin
  saveUsers(users);
  localStorage.setItem(cartKeyForUser(normalized), JSON.stringify([]));
  setCurrentUser(normalized);
  return true;
}

function signIn(username, password) {
  const users = getUsers();
  const normalized = normalizeUsername(username);
  if (users[normalized] && users[normalized].password === password) {
    setCurrentUser(normalized);
    return true;
  }
  return false;
}

// -------------------
// Product Functions
// -------------------
function nextProductId() { return products.reduce((m,p)=> Math.max(m,p.id), 0) + 1; }

function addProduct(name, price, img) {
  const id = nextProductId();
  const product = { id, name, price: Number(price), img: img || `https://via.placeholder.com/400x300?text=${encodeURIComponent(name)}` };
  products.push(product);
  saveProducts();
  renderProducts();
  showToast('Product added', 'success');
}

function removeProduct(id) {
  products = products.filter(p => p.id !== id);
  saveProducts();
  // remove from all user carts
  const users = getUsers();
  Object.keys(users).forEach(u => {
    const key = cartKeyForUser(u);
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const arr = JSON.parse(raw);
      localStorage.setItem(key, JSON.stringify(arr.filter(item => item.id !== id)));
    } catch(e) {}
  });
  // update current cart if needed
  cart = cart.filter(p => p.id !== id);
  saveCart();
  updateCartCount();
  renderProducts();
  renderCart();
  showToast('Product removed', 'info');
}

// -------------------
// Cart UI
// -------------------
function addToCart(id) {
  if (!getCurrentUser()) { openAuthModal('signin'); return; }
  const p = products.find(x => x.id === id);
  if (p) { cart.push(p); saveCart(); updateCartCount(); showToast(`${p.name} added to cart`, 'success'); }
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
      <img src="${item.img || 'https://via.placeholder.com/64x48?text=No+Image'}" 
           alt="${item.name}" 
           onerror="this.src='https://via.placeholder.com/64x48?text=No+Image'" 
           style="width:64px;height:48px;object-fit:cover;border-radius:4px;">
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

  const total = cart.reduce((s, p) => s + p.price, 0);
  totalEl.textContent = total.toFixed(2);

  container.querySelectorAll('.remove-one').forEach(btn => btn.addEventListener('click', e => {
    const id = Number(e.target.dataset.id);
    removeFromCart(id, 1);
  }));
  container.querySelectorAll('.remove-all').forEach(btn => btn.addEventListener('click', e => {
    const id = Number(e.target.dataset.id);
    removeFromCart(id, Infinity);
  }));
}

function removeFromCart(id,count=1) {
  if (count===Infinity) cart = cart.filter(p=>p.id!==id);
  else {
    let removed=0;
    cart = cart.filter(p=>{ if(p.id===id && removed<count){ removed++; return false } return true });
  }
  saveCart();
  updateCartCount();
  renderCart();
  showToast('Cart updated', 'info');
}

function clearCart() { cart=[]; saveCart(); updateCartCount(); renderCart(); showToast('Cart cleared','info'); }
function checkoutCart() { showToast('Checkout not implemented in demo','info'); }

// -------------------
// Auth UI
// -------------------
function openAuthModal(modeIn='signin') {
  authMode = modeIn;
  const modal = document.getElementById('auth-modal');
  const title = document.getElementById('auth-title');
  const submit = document.getElementById('auth-submit');
  const toggleText = document.getElementById('auth-toggle');
  if (!modal || !title || !submit || !toggleText) return;
  title.textContent = authMode==='signin'?'Sign in':'Create account';
  submit.textContent = authMode==='signin'?'Sign in':'Create account';
  toggleText.innerHTML = authMode==='signin'
    ? `Don't have an account? <a href="#" id="toggle-link">Create one</a>`
    : `Have an account? <a href="#" id="toggle-link">Sign in</a>`;
  const toggleLink = document.getElementById('toggle-link');
  if (toggleLink) toggleLink.onclick=e=>{ e.preventDefault(); openAuthModal(authMode==='signin'?'signup':'signin'); };
  modal.classList.remove('hidden');
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  const form = document.getElementById('auth-form');
  if (modal) modal.classList.add('hidden');
  if (form) form.reset();
}

// -------------------
// User UI
// -------------------
function updateUserUI() {
  const ua = document.getElementById('user-area');
  if (!ua) return;
  const user = getCurrentUser();
  const authBtn = document.getElementById('auth-btn');
  const adminBtn = document.getElementById('admin-add-btn');
  const banner = document.getElementById('current-user-banner');

  if (user) {
    if(authBtn) authBtn.style.display='none';
    if(banner){ banner.textContent=`Signed in: ${displayNameFor(user)}`; banner.classList.remove('hidden'); }
    if(isAdminUser() && adminBtn) adminBtn.classList.remove('hidden');
    else if(adminBtn) adminBtn.classList.add('hidden');
  } else {
    if(authBtn) authBtn.style.display='inline-block';
    if(banner) { banner.textContent=''; banner.classList.add('hidden'); }
    if(adminBtn) adminBtn.classList.add('hidden');
  }
}

// -------------------
// Toast
// -------------------
function showToast(msg,type='info'){
  let t=document.getElementById('toast');
  if(!t){ t=document.createElement('div'); t.id='toast'; document.body.appendChild(t);}
  t.textContent=msg; t.className=`toast show ${type}`;
  clearTimeout(t._hideTimer);
  t._hideTimer=setTimeout(()=>{ t.className='toast hidden'; },3000);
}

// -------------------
// Render Products
// -------------------
function renderProducts() {
  const list = document.getElementById('product-list');
  if(!list) return;
  list.innerHTML='';
  products.forEach(p=>{
    const card=document.createElement('div'); card.className='card';
    card.innerHTML=`
      <img src="${p.img}" alt="${p.name}">
      <h3>${p.name}</h3>
      <p class="price">$${p.price.toFixed(2)}</p>
      <div class="card-actions"></div>
    `;
    const actions = card.querySelector('.card-actions');
    const addBtn = document.createElement('button'); addBtn.textContent='Add to cart';
    addBtn.addEventListener('click',()=>addToCart(p.id));
    actions.appendChild(addBtn);

    if(isAdminUser()){
      const rm = document.createElement('button'); rm.textContent='Remove product';
      rm.className='remove-product';
      rm.addEventListener('click',()=>removeProduct(p.id));
      actions.appendChild(rm);
    }
    list.appendChild(card);
  });
}

// -------------------
// Event Listeners
// -------------------
document.addEventListener('DOMContentLoaded',()=>{
  loadProducts();
  renderProducts();
  updateUserUI();
  loadUserCart();

  // Auth
  const authBtn=document.getElementById('auth-btn');
  const authClose=document.getElementById('auth-close');
  const authForm=document.getElementById('auth-form');
  authBtn && authBtn.addEventListener('click',()=>openAuthModal('signin'));
  authClose && authClose.addEventListener('click',closeAuthModal);
  authForm && authForm.addEventListener('submit',e=>{
    e.preventDefault();
    const username=document.getElementById('auth-username').value.trim();
    const password=document.getElementById('auth-password').value;
    if(!username||!password){ showToast('Fill both fields','error'); return; }
    if(authMode==='signin'){
      if(signIn(username,password)){ closeAuthModal(); showToast(`Welcome back, ${username}!`,'success'); renderProducts(); }
      else showToast('Sign in failed','error');
    } else {
      if(signUp(username,password)){ closeAuthModal(); showToast(`Account created, ${username}!`,'success'); renderProducts(); }
    }
  });

  // Logout
  ua=document.getElementById('user-area');
  ua.addEventListener('click',e=>{
    if(e.target && e.target.id==='logout-btn'){ setCurrentUser(null); showToast('Signed out','info'); renderProducts(); }
  });

  // Cart
  const cartBtn=document.getElementById('cart-button');
  const cartClose=document.getElementById('cart-close');
  const clearBtn=document.getElementById('clear-cart');
  const checkoutBtn=document.getElementById('checkout-btn');
  cartBtn && cartBtn.addEventListener('click',()=>{ renderCart(); document.getElementById('cart-modal').classList.remove('hidden'); });
  cartClose && cartClose.addEventListener('click',()=>{ document.getElementById('cart-modal').classList.add('hidden'); });
  clearBtn && clearBtn.addEventListener('click',clearCart);
  checkoutBtn && checkoutBtn.addEventListener('click',checkoutCart);

  // Admin add
  const adminBtn=document.getElementById('admin-add-btn');
  const adminModal=document.getElementById('admin-modal');
  const adminClose=document.getElementById('admin-close');
  const adminForm=document.getElementById('admin-form');
  adminBtn && adminBtn.addEventListener('click',()=>{ if(!isAdminUser()){ showToast('Only admins','error'); return; } adminModal.classList.remove('hidden'); document.getElementById('admin-name').focus(); });
  adminClose && adminClose.addEventListener('click',()=>{ adminModal.classList.add('hidden'); adminForm.reset(); });
  adminForm && adminForm.addEventListener('submit',e=>{
    e.preventDefault();
    const name=document.getElementById('admin-name').value.trim();
    const price=parseFloat(document.getElementById('admin-price').value);
    const img=document.getElementById('admin-img').value.trim();
    if(!name||!price||isNaN(price)||price<=0){ showToast('Provide valid name & price','error'); return; }
    addProduct(name,price,img);
    adminModal.classList.add('hidden'); adminForm.reset();
  });
});
