const API_BASE = 'https://backend-67bt.onrender.com';
let currentUser = null;
let authToken = null;
let products = [];
let cart = [];

// ---------------------------
// Toast helper
function showToast(msg, type='info'){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  clearTimeout(t._hide);
  t._hide = setTimeout(()=> t.className='toast hidden',3000);
}

// ---------------------------
// Fetch products from backend
async function loadProducts(){
  try{
    const res = await fetch(`${API_BASE}/products`);
    products = await res.json();
    renderProducts();
  }catch(e){
    showToast('Could not load products','error');
  }
}

// ---------------------------
// Render products
function renderProducts(){
  const list = document.getElementById('product-list');
  list.innerHTML='';
  products.forEach(p=>{
    const card = document.createElement('div');
    card.className='card';
    card.innerHTML=`
      <img src="${p.img}" alt="${p.name}">
      <h3>${p.name}</h3>
      <p class="price">$${p.price.toFixed(2)}</p>
      <div class="card-actions"></div>
    `;
    list.appendChild(card);
    const actions = card.querySelector('.card-actions');

    const addBtn = document.createElement('button');
    addBtn.textContent='Add to cart';
    addBtn.addEventListener('click',()=>addToCart(p.id));
    actions.appendChild(addBtn);

    if(currentUser?.isAdmin){
      const rm = document.createElement('button');
      rm.textContent='Remove product';
      rm.className='remove-product';
      rm.addEventListener('click',()=>removeProduct(p.id));
      actions.appendChild(rm);
    }
  });
}

// ---------------------------
// Auth
async function signIn(username,password){
  try{
    const res = await fetch(`${API_BASE}/auth/signin`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({username,password})
    });
    if(!res.ok) throw new Error('Sign in failed');
    const data = await res.json();
    currentUser = data.user;
    authToken = data.token;
    updateUserUI();
    loadCart();
    showToast(`Welcome, ${currentUser.username}`,'success');
    closeAuthModal();
  }catch(e){
    showToast(e.message,'error');
  }
}

async function signUp(username,password){
  try{
    const res = await fetch(`${API_BASE}/auth/signup`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({username,password})
    });
    if(!res.ok) throw new Error('Sign up failed');
    const data = await res.json();
    currentUser = data.user;
    authToken = data.token;
    updateUserUI();
    loadCart();
    showToast(`Account created, welcome ${currentUser.username}`,'success');
    closeAuthModal();
  }catch(e){
    showToast(e.message,'error');
  }
}

function signOut(){
  currentUser=null;
  authToken=null;
  cart=[];
  updateUserUI();
  showToast('Signed out','info');
  renderProducts();
}

// ---------------------------
// Update UI
function updateUserUI(){
  const authBtn=document.getElementById('auth-btn');
  const banner=document.getElementById('current-user-banner');
  const adminBtn=document.getElementById('admin-add-btn');

  if(currentUser){
    authBtn.style.display='none';
    banner.textContent=`Signed in: ${currentUser.username}`;
    banner.classList.remove('hidden');
    if(currentUser.isAdmin) adminBtn.classList.remove('hidden');
    else adminBtn.classList.add('hidden');
  }else{
    authBtn.style.display='inline-block';
    banner.classList.add('hidden');
    adminBtn.classList.add('hidden');
  }
}

// ---------------------------
// Cart functions
async function loadCart(){
  if(!currentUser) return;
  try{
    const res=await fetch(`${API_BASE}/cart`,{
      headers:{'Authorization':`Bearer ${authToken}`}
    });
    cart=await res.json();
    updateCartCount();
  }catch(e){
    showToast('Could not load cart','error');
  }
}

async function addToCart(productId){
  if(!currentUser){ openAuthModal(); return; }
  try{
    await fetch(`${API_BASE}/cart/add`,{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${authToken}`},
      body:JSON.stringify({productId})
    });
    await loadCart();
    showToast('Added to cart','success');
  }catch(e){ showToast('Failed to add','error'); }
}

async function removeFromCart(productId){
  try{
    await fetch(`${API_BASE}/cart/remove`,{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${authToken}`},
      body:JSON.stringify({productId, qty:1})
    });
    await loadCart();
  }catch(e){}
}

async function clearCart(){
  try{
    await fetch(`${API_BASE}/cart/clear`,{
      method:'POST',
      headers:{'Authorization':`Bearer ${authToken}`}
    });
    await loadCart();
  }catch(e){}
}

// ---------------------------
// Admin functions
async function addProduct(name,price,img){
  try{
    const res = await fetch(`${API_BASE}/products`,{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${authToken}`},
      body:JSON.stringify({name,price,img})
    });
    if(!res.ok) throw new Error('Failed');
    await loadProducts();
    showToast('Product added','success');
  }catch(e){ showToast(e.message,'error'); }
}

async function removeProduct(id){
  try{
    const res = await fetch(`${API_BASE}/products/${id}`,{
      method:'DELETE',
      headers:{'Authorization':`Bearer ${authToken}`}
    });
    if(!res.ok) throw new Error('Failed');
    await loadProducts();
    showToast('Product removed','info');
  }catch(e){ showToast(e.message,'error'); }
}

// ---------------------------
// Modals
function openAuthModal(){ document.getElementById('auth-modal').classList.remove('hidden'); }
function closeAuthModal(){ document.getElementById('auth-modal').classList.add('hidden'); }
function openAdminModal(){ document.getElementById('admin-modal').classList.remove('hidden'); }
function closeAdminModal(){ document.getElementById('admin-modal').classList.add('hidden'); }
function openCartModal(){ document.getElementById('cart-modal').classList.remove('hidden'); renderCartModal(); }
function closeCartModal(){ document.getElementById('cart-modal').classList.add('hidden'); }

function renderCartModal(){
  const container = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  container.innerHTML='';
  if(cart.length===0){ container.innerHTML='<p>Your cart is empty</p>'; totalEl.textContent='0.00'; return; }
  let total=0;
  cart.forEach(item=>{
    total+=item.price;
    const div=document.createElement('div');
    div.className='cart-item';
    div.innerHTML=`
      <img src="${item.img}" alt="${item.name}">
      <div class="cart-item-info">
        <div class="name">${item.name}</div>
        <div class="meta">$${item.price.toFixed(2)}</div>
      </div>
      <div class="cart-item-actions">
        <button data-id="${item.id}" class="remove-one">Remove 1</button>
      </div>
    `;
    container.appendChild(div);
  });
  totalEl.textContent=total.toFixed(2);
  container.querySelectorAll('.remove-one').forEach(btn=>{
    btn.addEventListener('click',()=> removeFromCart(Number(btn.dataset.id)));
  });
}

// ---------------------------
// Event listeners
document.addEventListener('DOMContentLoaded',()=>{
  loadProducts();

  // auth
  const authBtn=document.getElementById('auth-btn');
  authBtn.addEventListener('click',openAuthModal);
  document.getElementById('auth-close').addEventListener('click',closeAuthModal);
  document.getElementById('auth-form').addEventListener('submit',e=>{
    e.preventDefault();
    const username=document.getElementById('auth-username').value.trim();
    const password=document.getElementById('auth-password').value;
    const mode=document.getElementById('auth-submit').textContent.toLowerCase();
    if(mode==='sign in') signIn(username,password);
    else signUp(username,password);
  });

  // toggle sign up / sign in
  document.getElementById('toggle-link').addEventListener('click',e=>{
    e.preventDefault();
    const title=document.getElementById('auth-title');
    const submit=document.getElementById('auth-submit');
    if(submit.textContent==='Sign in'){
      title.textContent='Sign up';
      submit.textContent='Sign up';
    }else{
      title.textContent='Sign in';
      submit.textContent='Sign in';
    }
  });

  // admin add product
  const adminBtn=document.getElementById('admin-add-btn');
  adminBtn.addEventListener('click',openAdminModal);
  document.getElementById('admin-close').addEventListener('click',closeAdminModal);
  document.getElementById('admin-form').addEventListener('submit',e=>{
    e.preventDefault();
    const name=document.getElementById('admin-name').value.trim();
    const price=Number(document.getElementById('admin-price').value);
    const img=document.getElementById('admin-img').value.trim() || 'https://via.placeholder.com/200x150';
    addProduct(name,price,img);
    closeAdminModal();
  });

  // cart
  document.getElementById('cart-button').addEventListener('click',openCartModal);
  document.getElementById('cart-close').addEventListener('click',closeCartModal);
  document.getElementById('clear-cart').addEventListener('click',clearCart);
  document.getElementById('checkout-btn').addEventListener('click',()=>{ showToast('Checkout complete','success'); clearCart(); });

  // sign out
  const signOutBtn=document.createElement('button');
  signOutBtn.textContent='Sign out';
  signOutBtn.addEventListener('click',signOut);
  document.getElementById('user-area').appendChild(signOutBtn);
});

// update cart counter
function updateCartCount(){
  document.getElementById('cart-count').textContent=cart.length;
}
