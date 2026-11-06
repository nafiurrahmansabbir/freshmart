// ================= CONFIG (edit these) =================
const CFG = {
  store: "FreshMart", tagline: "Best Online Grocery Store in Bangladesh", bkash: "01XXXXXXXXX", whatsapp: "8801XXXXXXXXX", freeOver: 1000,
  zones: [{ n: "Inside Chattogram", f: 60 }, { n: "Outside Chattogram", f: 120 }],
  phone: "+880 1XXX-XXXXXX", email: "hello@freshmart.com", address: "GEC Circle, Chattogram, Bangladesh", hours: "Open daily 8:00 AM – 10:00 PM",
  social: { Facebook: "#", Instagram: "#", TikTok: "#" }
};
const SLIDES = [
  { t: "Fresh & Genuine Products", s: "Fast home delivery with Cash on Delivery", c: "from-green-700 to-emerald-400", e: "🛒" },
  { t: "Big Savings Every Day", s: "Grab the best price on everyday essentials", c: "from-orange-500 to-amber-400", e: "🏷️" },
  { t: "Free Delivery over ৳1000", s: "Shop more, save more. Delivered nationwide", c: "from-sky-600 to-cyan-400", e: "🚚" }];
const PAGES = {
  about: ["About us", `${CFG.store} is an online store focused on quality products at fair prices. We deliver across Bangladesh with Cash on Delivery and bKash payment.`],
  terms: ["Terms & Conditions", "By placing an order you agree to provide correct contact and delivery details. Prices and stock may change without notice. We may cancel orders that cannot be fulfilled."],
  privacy: ["Privacy Policy", "We only use your name, phone number and address to process and deliver your order. We never sell your personal information."],
  returns: ["Return & Refund Policy", "If you receive a damaged or wrong product, contact us within 3 days of delivery with photos. We will replace the product or refund you after verification."],
  contact: ["Contact us", `Phone: ${CFG.phone}\nEmail: ${CFG.email}\nAddress: ${CFG.address}\n${CFG.hours}`],
  faq: ["FAQ", "How long does delivery take?\nInside Chattogram 1 day, outside 2–4 days.\n\nCan I pay on delivery?\nYes, Cash on Delivery is available. bKash is also accepted.\n\nHow do I track my order?\nUse the Track order page with your order ID and phone number."]
};
const STATUS = { pending: "bg-amber-100 text-amber-800", confirmed: "bg-blue-100 text-blue-800", shipped: "bg-purple-100 text-purple-800", delivered: "bg-green-100 text-green-800", cancelled: "bg-red-100 text-red-800" };
const INP = "w-full bg-white text-gray-900 placeholder-gray-400 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500";

// ================= HELPERS =================
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const tk = n => "৳" + Number(n || 0).toLocaleString("en-IN");
const ls = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "[]"); localStorage.setItem(k, JSON.stringify(v)) } catch (e) { return [] } };
const isAdmin = () => location.hash.startsWith("#admin");
const off = p => p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.remove("hidden"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.add("hidden"), 2800) }
function readImg(file) {
  return new Promise((res, rej) => {
    const r = new FileReader(); r.onerror = rej; r.onload = () => {
      const im = new Image(); im.onerror = rej; im.onload = () => {
        const sv = DB.mode === "server", mx = sv ? 900 : 560, k = Math.min(1, mx / Math.max(im.width, im.height)), c = document.createElement("canvas"); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL("image/jpeg", sv ? .82 : .62))
      }; im.src = r.result
    }; r.readAsDataURL(file)
  })
}

// ================= DATA LAYER (3 modes) =================
// claude = Claude artifact database | server = node server.js (/api) | local = browser localStorage demo
const DB = {
  mode: "local", admin: false, pw: "", pf: null, of: null,
  async init() {
    if (window.claude && claude.use) {
      try { const u = await claude.use("user"), d = await claude.use("db"); if (d) { this.mode = "claude"; this.d = d; this.admin = !!(u && u.canEdit && u.canEdit()); return } } catch (e) { }
      this.mode = "signedout"; return
    }
    try {
      const r = await fetch("api/products");
      if (r.ok && /json/.test(r.headers.get("content-type") || "")) {
        this.mode = "server";
        const pw = sessionStorage.getItem("fm_pw");
        if (pw) { const l = await fetch("api/login", { method: "POST", body: JSON.stringify({ password: pw }) }); if (l.ok) { this.pw = pw; this.admin = true } } return
      }
    } catch (e) { }
    this.mode = "local"; this.admin = true
  },
  async api(m, u, b) {
    const r = await fetch("api/" + u, { method: m, headers: { "Content-Type": "application/json", "x-admin": this.pw }, body: b ? JSON.stringify(b) : undefined });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || r.status); return j
  },
  refresh() { this.pf && this.pf(); this.of && this.of() },
  async refreshProducts() { if (this.pf) await this.pf() },
  subProducts(cb) {
    if (this.mode === "claude") return this.d.collection("products").onSnapshot(s => cb(s.docs.map(x => ({ id: x.id, ...x.data() }))), () => cb([]));
    if (this.mode === "server") { const f = () => this.api("GET", "products").then(cb).catch(() => { }); this.pf = f; f(); setInterval(f, 15000) }
    if (this.mode === "local") { this.pf = () => cb(ls("fm_products")); this.pf(); addEventListener("storage", () => this.refresh()) }
  },
  subOrders(cb) {
    const srt = l => l.sort((a, b) => b.createdAt - a.createdAt);
    if (this.mode === "claude") return this.d.collection("orders").onSnapshot(s => cb(srt(s.docs.map(x => x.data()))), () => { });
    if (this.mode === "server") { const f = () => this.api("GET", "orders").then(l => cb(srt(l))).catch(() => { }); this.of = f; f(); setInterval(f, 4000) }
    if (this.mode === "local") { this.of = () => cb(srt(ls("fm_orders"))); this.of() }
  },
  async upload(data) { if (this.mode === "server") return (await this.api("POST", "upload", { data })).url; return data },
  async place(o) {
    if (this.mode === "claude") return this.d.collection("orders").doc(o.id).set(o);
    if (this.mode === "server") return this.api("POST", "orders", o);
    if (this.mode === "local") { ls("fm_orders", [...ls("fm_orders"), o]); this.refresh(); return }
    throw new Error("Please sign in first")
  },
  async track(id, phone) {
    if (this.mode === "claude") { const s = await this.d.collection("orders").doc(id).get(), o = s.exists && s.data(); return o && o.phone === phone ? o : null }
    if (this.mode === "server") { try { return await this.api("GET", "track?id=" + encodeURIComponent(id) + "&phone=" + phone) } catch (e) { return null } }
    return ls("fm_orders").find(o => o.id === id && o.phone === phone) || null
  },
  async status(id, s) {
    if (this.mode === "claude") return this.d.collection("orders").doc(id).update({ status: s });
    if (this.mode === "server") return this.api("PATCH", "orders/" + id, { status: s });
    ls("fm_orders", ls("fm_orders").map(o => o.id === id ? { ...o, status: s } : o)); this.refresh()
  },
  async addP(p) {
    if (this.mode === "claude") return this.d.collection("products").add(p);
    if (this.mode === "server") { const r = await this.api("POST", "products", p); await this.refreshProducts(); return r }
    ls("fm_products", [...ls("fm_products"), { ...p, id: "p" + Date.now() + Math.random().toString(36).slice(2, 5) }]); this.refresh()
  },
  async saveP(id, p) {
    if (this.mode === "claude") return this.d.collection("products").doc(id).set(p);
    if (this.mode === "server") { const r = await this.api("PUT", "products/" + id, p); await this.refreshProducts(); return r }
    ls("fm_products", ls("fm_products").map(x => x.id === id ? { ...p, id } : x)); this.refresh()
  },
  async delP(id) {
    if (this.mode === "claude") return this.d.collection("products").doc(id).delete();
    if (this.mode === "server") { const r = await this.api("DELETE", "products/" + id); await this.refreshProducts(); return r }
    ls("fm_products", ls("fm_products").filter(p => p.id !== id)); this.refresh()
  }
};

// ================= STATE =================
let prods = [], orders = [], cart = ls("fm_cart"); if (Array.isArray(cart)) cart = {};
let ready = false, cat = "All", q = "", sort = "new", atab = "orders", ofilter = "all", oq = "", pay = "cod", zone = 0, si = 0, known = null, subbed = false;
let pi = 0, pq = 1, lastPid = null, pf = { images: [] }, delArm = null, trk = null, skipSync = false;
function resetForm(p) { pf = p; skipSync = true; render() }
const P = () => prods;
const cats = () => [...new Set(prods.map(p => p.cat).filter(Boolean))].sort();
const saveCart = () => ls("fm_cart", cart);
const cartItems = () => Object.entries(cart).map(([id, qty]) => { const p = prods.find(x => x.id === id); return p ? { ...p, qty } : null }).filter(Boolean);
const sub = () => cartItems().reduce((s, i) => s + i.price * i.qty, 0);
const fee = () => sub() === 0 || sub() >= CFG.freeOver ? 0 : CFG.zones[zone].f;
const img = (p, c) => p.images && p.images[0] ? `<img src="${esc(p.images[0])}" alt="${esc(p.name)}" loading="lazy" class="${c}">` : `<div class="w-full h-full grid place-items-center text-4xl text-gray-300">🛍️</div>`;

// ================= CART =================
function add(id, n = 1) { const p = prods.find(x => x.id === id); if (!p || p.stock <= 0) return; cart[id] = Math.min((cart[id] || 0) + n, p.stock); saveCart(); badge(); toast("Added to cart ✓") }
function chg(id, d) { const p = prods.find(x => x.id === id); cart[id] = Math.min((cart[id] || 0) + d, p ? p.stock : 99); if (cart[id] <= 0) delete cart[id]; saveCart(); badge(); drawer() }
function badge() { const n = Object.values(cart).reduce((a, b) => a + b, 0); document.querySelectorAll(".cb").forEach(b => { b.textContent = n; b.classList.toggle("hidden", !n) }) }
function toggleCart(o) { $("#drawer").classList.toggle("hidden", !o); if (o) drawer() }
function buyNow(id) { add(id, pq); toggleCart(true); drawer("checkout") }
function drawer(step) {
  const it = cartItems(), el = $("#drawerBody");
  const head = `<div class="p-4 border-b flex justify-between items-center"><h2 class="font-bold text-lg">${step === "checkout" ? "Checkout" : "🛒 Your Cart"}</h2><button onclick="toggleCart(false)" class="text-3xl leading-none px-2 text-gray-500">×</button></div>`;
  if (!it.length) { el.innerHTML = head + `<div class="flex-1 grid place-items-center text-gray-500 p-6 text-center"><div><div class="text-6xl mb-2">🛒</div>Your cart is empty<br><a href="#/shop" onclick="toggleCart(false)" class="inline-block mt-4 bg-green-600 text-white px-5 py-2 rounded-xl text-sm">Start shopping</a></div></div>`; return }
  const tot = `<div class="text-sm space-y-1 mb-3"><div class="flex justify-between"><span>Subtotal</span><b>${tk(sub())}</b></div><div class="flex justify-between"><span>Delivery ${fee() ? "" : "(free)"}</span><b>${tk(fee())}</b></div><div class="flex justify-between text-base border-t pt-2"><span>Total</span><b class="text-green-700">${tk(sub() + fee())}</b></div></div>`;
  if (step === "checkout") {
    const k = ["f_name", "f_phone", "f_addr", "f_note"].map(i => ($("#" + i) || {}).value || "");
    el.innerHTML = head + `<div class="flex-1 overflow-y-auto p-4 space-y-3">
      <input id="f_name" class="${INP}" placeholder="Full name" value="${esc(k[0])}">
      <input id="f_phone" class="${INP}" placeholder="Phone (01XXXXXXXXX)" inputmode="tel" value="${esc(k[1])}">
      <textarea id="f_addr" rows="2" class="${INP}" placeholder="Full delivery address">${esc(k[2])}</textarea>
      <select class="${INP}" onchange="zone=+this.value;drawer('checkout')">${CFG.zones.map((z, i) => `<option value="${i}" ${i === zone ? "selected" : ""}>${z.n} (${tk(z.f)})</option>`).join("")}</select>
      <input id="f_note" class="${INP}" placeholder="Order note (optional)" value="${esc(k[3])}">
      <div class="grid grid-cols-2 gap-2 text-sm">
        <label class="border-2 rounded-xl p-3 cursor-pointer ${pay === "cod" ? "border-green-600 bg-green-50" : "border-gray-200"}"><input type="radio" name="pay" ${pay === "cod" ? "checked" : ""} onchange="pay='cod';drawer('checkout')"> 💵 Cash on Delivery</label>
        <label class="border-2 rounded-xl p-3 cursor-pointer ${pay === "bkash" ? "border-pink-500 bg-pink-50" : "border-gray-200"}"><input type="radio" name="pay" ${pay === "bkash" ? "checked" : ""} onchange="pay='bkash';drawer('checkout')"> 📱 bKash</label></div>
      ${pay === "bkash" ? `<div class="text-xs bg-pink-50 border border-pink-200 rounded-xl p-3 text-gray-700">Send <b>${tk(sub() + fee())}</b> to bKash <b>${CFG.bkash}</b> (Send Money), then enter the TrxID.<input id="f_trx" class="${INP} mt-2" placeholder="bKash TrxID"></div>` : ""}
    </div><div class="p-4 border-t">${tot}<button id="pb" onclick="place()" class="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl">Place Order</button><button onclick="drawer()" class="w-full text-sm text-gray-500 mt-2">← Back to cart</button></div>`;
    return
  }
  el.innerHTML = head + `<div class="flex-1 overflow-y-auto p-4 space-y-3">${it.map(i => `<div class="flex items-center gap-3 bg-gray-50 rounded-xl p-2"><div class="w-14 h-14 rounded-lg overflow-hidden bg-white shrink-0">${img(i, "w-full h-full object-cover")}</div><div class="flex-1 min-w-0"><div class="font-medium text-sm line-clamp-2">${esc(i.name)}</div><div class="text-xs text-gray-500">${tk(i.price)}</div></div><div class="flex items-center gap-2"><button onclick="chg('${i.id}',-1)" class="w-7 h-7 rounded-full border bg-white">−</button><b class="text-sm w-5 text-center">${i.qty}</b><button onclick="chg('${i.id}',1)" class="w-7 h-7 rounded-full border bg-white">+</button></div></div>`).join("")}</div>
  <div class="p-4 border-t">${tot}${sub() < CFG.freeOver ? `<div class="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-3">Add ${tk(CFG.freeOver - sub())} more for free delivery 🚚</div>` : ""}<button onclick="drawer('checkout')" class="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl">Proceed to Checkout</button></div>`;
}
async function place() {
  const v = id => ($("#" + id) || { value: "" }).value.trim(), phone = v("f_phone").replace(/\D/g, "");
  if (!v("f_name") || !/^01\d{9}$/.test(phone) || v("f_addr").length < 8) return toast("Enter valid name, phone (11 digits) and address");
  if (pay === "bkash" && !v("f_trx")) return toast("Please enter bKash TrxID");
  const id = "ORD-" + Date.now().toString(36).toUpperCase();
  const o = {
    id, name: v("f_name"), phone, address: v("f_addr"), zone: CFG.zones[zone].n, note: v("f_note"), payment: pay, trx: v("f_trx"),
    items: cartItems().map(i => ({ id: i.id, name: i.name, unit: i.unit, price: i.price, qty: i.qty })), subtotal: sub(), delivery: fee(), total: sub() + fee(), status: "pending", createdAt: Date.now()
  };
  const b = $("#pb"); b.disabled = true; b.textContent = "Placing...";
  try {
    const r = await DB.place(o); const oid = (r && r.id && String(r.id).startsWith("ORD-")) ? r.id : id; cart = {}; saveCart(); badge();
    $("#drawerBody").innerHTML = `<div class="flex-1 grid place-items-center text-center p-8"><div><div class="text-6xl mb-3">✅</div><h2 class="text-xl font-bold">Order placed!</h2><p class="text-gray-600 mt-2">Your order ID</p><div class="font-mono font-bold text-lg bg-green-50 rounded-lg py-2 px-4 mt-1">${oid}</div><p class="text-sm text-gray-500 mt-3">We will call you shortly to confirm.<br>Total: <b>${tk(o.total)}</b></p><a href="#/track" onclick="toggleCart(false)" class="inline-block mt-5 text-green-700 text-sm underline">Track this order</a><br><button onclick="toggleCart(false)" class="mt-4 bg-green-600 text-white px-6 py-2.5 rounded-xl">Continue shopping</button></div></div>`;
  } catch (e) { b.disabled = false; b.textContent = "Place Order"; toast("Could not place order: " + (e.message || "error")) }
}

// ================= STOREFRONT =================
function slider() {
  return `<div id="sl" class="relative overflow-hidden rounded-2xl shadow" ontouchstart="this._x=event.touches[0].clientX" ontouchend="const d=event.changedTouches[0].clientX-this._x;if(Math.abs(d)>40)go(si+(d<0?1:-1))">
   <div id="slt" class="flex transition-transform duration-500 ease-out" style="transform:translateX(-${si * 100}%)">${SLIDES.map(s => `<div class="min-w-full bg-gradient-to-r ${s.c} text-white px-7 py-9 sm:px-14 sm:py-14 flex items-center justify-between gap-4">
     <div><div class="text-xs uppercase tracking-[.25em] opacity-80">${CFG.store}</div><h2 class="text-2xl sm:text-5xl font-extrabold mt-2 leading-tight">${s.t}</h2><p class="mt-2 sm:text-lg opacity-90">${s.s}</p>
     <a href="#/shop" class="inline-block mt-5 bg-white text-gray-900 font-semibold text-sm px-6 py-2.5 rounded-full shadow hover:scale-105 transition">Shop now →</a></div>
     <div class="text-7xl sm:text-9xl drop-shadow-lg select-none">${s.e}</div></div>`).join("")}</div>
   <button onclick="go(si-1)" class="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-gray-800 shadow">‹</button>
   <button onclick="go(si+1)" class="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-gray-800 shadow">›</button>
   <div class="absolute bottom-3 left-0 right-0 flex justify-center gap-2">${SLIDES.map((_, i) => `<button onclick="go(${i})" class="sd h-2 rounded-full transition-all ${i === si ? "w-6 bg-white" : "w-2 bg-white/50"}"></button>`).join("")}</div></div>`;
}
function go(n) {
  si = (n + SLIDES.length) % SLIDES.length; const t = $("#slt"); if (!t) return; t.style.transform = `translateX(-${si * 100}%)`;
  document.querySelectorAll(".sd").forEach((d, i) => d.className = "sd h-2 rounded-full transition-all " + (i === si ? "w-6 bg-white" : "w-2 bg-white/50"))
}
setInterval(() => { if ($("#slt")) go(si + 1) }, 4500);
setInterval(() => {
  const e = new Date(); e.setHours(23, 59, 59, 999); const s = Math.max(0, Math.floor((e - Date.now()) / 1000));
  const t = [s / 3600 | 0, (s / 60 | 0) % 60, s % 60].map(n => String(n).padStart(2, "0")).join(":"); document.querySelectorAll(".cd").forEach(x => x.textContent = t)
}, 1000);

function card(p, w = "") {
  const o = off(p); return `<a href="#/product/${p.id}" class="card group bg-white rounded-xl border border-gray-100 overflow-hidden flex flex-col ${w}">
 <div class="relative aspect-square bg-gray-100 overflow-hidden">${img(p, "w-full h-full object-cover group-hover:scale-105 transition duration-300")}
 ${o ? `<span class="absolute top-2 left-2 bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded">-${o}%</span>` : ""}${p.flash ? `<span class="absolute top-2 right-2 bg-amber-400 text-gray-900 text-[10px] font-bold px-2 py-0.5 rounded">⚡ FLASH</span>` : ""}
 ${p.stock <= 0 ? `<div class="absolute inset-0 bg-white/60 grid place-items-center text-sm font-semibold text-gray-600">Out of stock</div>` : ""}</div>
 <div class="p-3 flex-1 flex flex-col"><div class="text-[11px] text-gray-400">${esc(p.cat)}</div><h3 class="text-sm font-medium line-clamp-2 min-h-[2.5rem]">${esc(p.name)}</h3>
 <div class="mt-2 flex items-baseline gap-2 flex-wrap"><b class="text-green-700">${tk(p.price)}</b>${o ? `<s class="text-xs text-gray-400">${tk(p.oldPrice)}</s>` : ""}</div>
 ${o ? `<div class="text-[11px] text-red-500">You save ${tk(p.oldPrice - p.price)}</div>` : ""}
 <div class="mt-auto pt-3"><button onclick="event.preventDefault();add('${p.id}')" ${p.stock > 0 ? "" : "disabled"} class="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-xs font-semibold rounded-lg py-2">${p.stock > 0 ? "Add to cart" : "Out of stock"}</button></div></div></a>`
}
const sec = (t, link, inner, extra = "") => `<section class="mt-8"><div class="flex items-center justify-between mb-3"><h2 class="text-lg sm:text-xl font-bold flex items-center gap-3">${t}${extra}</h2>${link ? `<a href="${link}" class="text-sm text-green-700 font-medium">View all →</a>` : ""}</div>${inner}</section>`;
const gridOf = l => `<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">${l.map(p => card(p)).join("")}</div>`;

function home() {
  if (!ready) return `<div class="py-24 text-center text-gray-400">Loading...</div>`;
  const perks = [["🚚", "Fast delivery", "Nationwide"], ["✅", "Genuine products", "Quality checked"], ["💳", "Easy payment", "COD & bKash"], ["💬", "24/7 support", "WhatsApp & phone"]];
  const flash = prods.filter(p => p.flash && p.stock > 0), feat = prods.filter(p => p.featured), fresh = [...prods].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 10);
  const cs = cats();
  return `${slider()}
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">${perks.map(p => `<div class="bg-white rounded-xl border p-3 flex items-center gap-3"><div class="text-2xl">${p[0]}</div><div><div class="font-semibold text-sm">${p[1]}</div><div class="text-xs text-gray-500">${p[2]}</div></div></div>`).join("")}</div>
  ${!prods.length ? `<div class="text-center py-20 bg-white border rounded-2xl mt-8"><div class="text-6xl">📦</div><h2 class="font-bold text-lg mt-3">Products coming soon</h2><p class="text-sm text-gray-500 mt-1">${DB.mode === "signedout" ? "Please sign in to continue." : "Add your first product from the Admin panel."}</p><a href="#admin" class="inline-block mt-4 bg-green-600 text-white px-5 py-2 rounded-xl text-sm">Open Admin</a></div>` : ""}
  ${flash.length ? sec("⚡ Flash Deal", "#/shop", gridOf(flash.slice(0, 5)), `<span class="text-xs font-semibold bg-red-500 text-white rounded-md px-2 py-1">Ends in <span class="cd font-mono">--:--:--</span></span>`) : ""}
  ${cs.length ? sec("Shop by category", "#/shop", `<div class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">${cs.map(c => { const p = prods.find(x => x.cat === c && x.images && x.images[0]); return `<a href="#/category/${encodeURIComponent(c)}" class="card bg-white border rounded-xl p-3 text-center"><div class="w-16 h-16 mx-auto rounded-full overflow-hidden bg-green-50 grid place-items-center">${p ? img(p, "w-full h-full object-cover") : `<span class="text-2xl">🛍️</span>`}</div><div class="text-xs font-medium mt-2 line-clamp-2">${esc(c)}</div></a>` }).join("")}</div>`) : ""}
  ${feat.length ? sec("Featured products", "#/shop", gridOf(feat.slice(0, 10))) : ""}
  ${fresh.length ? sec("New arrivals", "#/shop", gridOf(fresh)) : ""}`;
}
function plist() {
  const el = $("#plist"); if (!el) return;
  let l = prods.filter(p => (cat === "All" || p.cat === cat) && (p.name + " " + p.cat).toLowerCase().includes(q.toLowerCase()));
  l.sort(sort === "low" ? (a, b) => a.price - b.price : sort === "high" ? (a, b) => b.price - a.price : (a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const c = $("#pcount"); if (c) c.textContent = l.length + " products";
  el.innerHTML = l.length ? gridOf(l) : `<div class="text-center text-gray-500 py-20 bg-white border rounded-2xl">No products found 😕</div>`
}
function shopPage() {
  if (!ready) return `<div class="py-24 text-center text-gray-400">Loading...</div>`;
  const link = (c, l) => `<a href="${c === "All" ? "#/shop" : "#/category/" + encodeURIComponent(c)}" class="block px-3 py-2 rounded-lg text-sm ${c === cat ? "bg-green-600 text-white" : "hover:bg-green-50"}">${esc(l || c)}</a>`;
  return `<div class="text-xs text-gray-500 mb-3"><a href="#" class="hover:text-green-700">Home</a> › Shop${cat !== "All" ? " › " + esc(cat) : ""}</div>
  <div class="grid lg:grid-cols-[14rem_1fr] gap-6"><aside class="hidden lg:block bg-white border rounded-2xl p-3 h-fit sticky top-24"><div class="font-semibold text-sm px-3 pb-2">Categories</div>${link("All", "All products")}${cats().map(c => link(c)).join("")}</aside>
  <div><div class="flex items-center justify-between mb-3 bg-white border rounded-xl px-4 py-2.5"><span id="pcount" class="text-sm text-gray-600"></span>
   <select onchange="sort=this.value;plist()" class="${INP} !w-auto !py-1.5"><option value="new" ${sort === "new" ? "selected" : ""}>Newest</option><option value="low" ${sort === "low" ? "selected" : ""}>Price: low to high</option><option value="high" ${sort === "high" ? "selected" : ""}>Price: high to low</option></select></div>
   <div id="plist"></div></div></div>`;
}
function setQty(d, max) { pq = Math.max(1, Math.min(max, pq + d)); $("#pqv").textContent = pq }
function share(t, id) {
  const u = encodeURIComponent(location.href);
  if (t === "copy") { try { navigator.clipboard.writeText(location.href); toast("Link copied") } catch (e) { toast("Copy failed") } return }
  open(t === "wa" ? "https://wa.me/?text=" + u : "https://www.facebook.com/sharer/sharer.php?u=" + u, "_blank")
}
function productPage(id) {
  if (!ready) return `<div class="py-24 text-center text-gray-400">Loading...</div>`;
  const p = prods.find(x => x.id === id);
  if (!p) return `<div class="text-center py-24 text-gray-500"><div class="text-5xl">😕</div><p class="mt-2">Product not found</p><a href="#/shop" class="text-green-700 underline text-sm">Back to shop</a></div>`;
  if (lastPid !== id) { lastPid = id; pi = 0; pq = 1 }
  const im = p.images || [], o = off(p), rel = prods.filter(x => x.cat === p.cat && x.id !== p.id).slice(0, 5), max = Math.max(1, p.stock);
  document.title = p.name + " – " + CFG.store;
  return `<div class="text-xs text-gray-500 mb-3"><a href="#" class="hover:text-green-700">Home</a> › <a href="#/category/${encodeURIComponent(p.cat)}" class="hover:text-green-700">${esc(p.cat)}</a> › ${esc(p.name)}</div>
  <div class="bg-white border rounded-2xl p-4 sm:p-6 grid md:grid-cols-2 gap-8">
   <div><div class="aspect-square rounded-xl overflow-hidden bg-gray-100 relative">${im.length ? `<img src="${esc(im[Math.min(pi, im.length - 1)])}" alt="${esc(p.name)}" class="w-full h-full object-contain bg-white">` : `<div class="w-full h-full grid place-items-center text-7xl text-gray-300">🛍️</div>`}${o ? `<span class="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded">-${o}%</span>` : ""}</div>
    ${im.length > 1 ? `<div class="flex gap-2 mt-3 overflow-x-auto">${im.map((s, i) => `<button onclick="pi=${i};render()" class="w-16 h-16 shrink-0 rounded-lg overflow-hidden border-2 ${i === pi ? "border-green-600" : "border-transparent"}"><img src="${esc(s)}" class="w-full h-full object-cover"></button>`).join("")}</div>` : ""}</div>
   <div><div class="text-xs text-gray-400">${esc(p.cat)}</div><h1 class="text-xl sm:text-2xl font-bold mt-1 leading-snug">${esc(p.name)}</h1>
    <div class="flex items-baseline gap-3 mt-3 flex-wrap"><span class="text-3xl font-extrabold text-green-700">${tk(p.price)}</span>${o ? `<s class="text-gray-400">${tk(p.oldPrice)}</s><span class="text-sm text-red-500 font-medium">You save ${tk(p.oldPrice - p.price)}</span>` : ""}</div>
    <div class="mt-3 text-sm">${p.stock > 0 ? `<span class="text-green-700 bg-green-50 px-2.5 py-1 rounded-full">● In stock${p.stock <= 10 ? ` (only ${p.stock} left)` : ""}</span>` : `<span class="text-red-600 bg-red-50 px-2.5 py-1 rounded-full">● Out of stock</span>`}${p.unit ? ` <span class="text-gray-500 ml-2">${esc(p.unit)}</span>` : ""}</div>
    ${p.stock > 0 ? `<div class="flex items-center gap-3 mt-5"><div class="flex items-center border rounded-xl"><button onclick="setQty(-1,${max})" class="w-10 h-10 text-lg">−</button><span id="pqv" class="w-8 text-center font-semibold">${Math.min(pq, max)}</span><button onclick="setQty(1,${max})" class="w-10 h-10 text-lg">+</button></div>
     <button onclick="add('${p.id}',pq)" class="flex-1 border-2 border-green-600 text-green-700 hover:bg-green-50 font-semibold rounded-xl py-2.5">Add to cart</button>
     <button onclick="buyNow('${p.id}')" class="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl py-3">Buy now</button></div>` : ""}
    <div class="grid grid-cols-2 gap-2 mt-5 text-xs text-gray-600"><div class="bg-gray-50 rounded-lg p-3">🚚 Fast home delivery</div><div class="bg-gray-50 rounded-lg p-3">💵 Cash on Delivery</div><div class="bg-gray-50 rounded-lg p-3">↩️ Easy returns</div><div class="bg-gray-50 rounded-lg p-3">💬 24/7 support</div></div>
    <div class="flex items-center gap-2 mt-5 text-xs text-gray-500">Share: <button onclick="share('wa')" class="px-3 py-1.5 rounded-full border hover:bg-green-50">WhatsApp</button><button onclick="share('fb')" class="px-3 py-1.5 rounded-full border hover:bg-blue-50">Facebook</button><button onclick="share('copy')" class="px-3 py-1.5 rounded-full border hover:bg-gray-50">Copy link</button></div></div></div>
  ${p.desc ? `<div class="bg-white border rounded-2xl p-5 sm:p-6 mt-5"><h2 class="font-bold text-lg mb-3">Product details</h2><div class="text-sm text-gray-700 whitespace-pre-line leading-relaxed">${esc(p.desc)}</div></div>` : ""}
  ${rel.length ? sec("Related products", `#/category/${encodeURIComponent(p.cat)}`, gridOf(rel)) : ""}`;
}
function trackPage() {
  const steps = ["pending", "confirmed", "shipped", "delivered"], o = trk;
  return `<div class="max-w-xl mx-auto"><div class="bg-white border rounded-2xl p-6"><h1 class="text-xl font-bold">📦 Track your order</h1><p class="text-sm text-gray-500 mt-1">Enter your order ID and the phone number used for the order.</p>
   <input id="t_id" class="${INP} mt-4 uppercase" placeholder="Order ID (ORD-XXXXXXXX)"><input id="t_ph" class="${INP} mt-3" placeholder="Phone number" inputmode="tel"><button onclick="doTrack()" class="w-full mt-3 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl">Track order</button></div>
   ${o === false ? `<div class="bg-red-50 text-red-700 rounded-xl p-4 mt-4 text-sm text-center">Order not found. Please check the ID and phone number.</div>` : ""}
   ${o ? `<div class="bg-white border rounded-2xl p-6 mt-4"><div class="flex justify-between items-center"><b class="font-mono">${esc(o.id)}</b><span class="text-xs font-semibold px-3 py-1 rounded-full ${STATUS[o.status]}">${o.status}</span></div>
    ${o.status === "cancelled" ? `<p class="text-sm text-red-600 mt-4">This order was cancelled.</p>` : `<div class="flex mt-6">${steps.map((s, i) => { const d = i <= steps.indexOf(o.status); return `<div class="flex-1 text-center"><div class="mx-auto w-8 h-8 rounded-full grid place-items-center text-sm ${d ? "bg-green-600 text-white" : "bg-gray-200 text-gray-400"}">${d ? "✓" : i + 1}</div><div class="text-[11px] mt-1 capitalize ${d ? "text-green-700 font-medium" : "text-gray-400"}">${s}</div></div>` }).join("")}</div>`}
    <div class="mt-5 text-sm space-y-1">${(o.items || []).map(i => `<div class="flex justify-between"><span>${i.qty}× ${esc(i.name)}</span><span>${tk(i.price * i.qty)}</span></div>`).join("")}<div class="flex justify-between font-bold border-t pt-2"><span>Total</span><span>${tk(o.total)}</span></div></div></div>` : ""}</div>`;
}
async function doTrack() {
  const id = $("#t_id").value.trim().toUpperCase(), ph = $("#t_ph").value.replace(/\D/g, ""); if (!id || !ph) return toast("Enter order ID and phone");
  try { trk = (await DB.track(id, ph)) || false } catch (e) { trk = false } render()
}
function infoPage(k) { const pg = PAGES[k] || PAGES.about; document.title = pg[0] + " – " + CFG.store; return `<div class="max-w-3xl mx-auto bg-white border rounded-2xl p-6 sm:p-8"><h1 class="text-2xl font-bold mb-4">${pg[0]}</h1><div class="text-gray-700 whitespace-pre-line leading-relaxed">${esc(pg[1])}</div></div>` }

function footer() {
  const a = "block hover:text-white py-1", h = "font-semibold text-white mb-3";
  return `<section class="bg-white border-t mt-10"><div class="max-w-7xl mx-auto px-4 py-8"><h2 class="text-xl font-bold text-center">Online support, 24/7</h2>
   <div class="grid sm:grid-cols-3 gap-3 mt-5 text-sm">
    <a href="tel:${CFG.phone.replace(/\s/g, "")}" class="border rounded-xl p-4 hover:bg-green-50"><div class="text-xs text-gray-500">📞 Call us</div><b>${CFG.phone}</b></a>
    <a href="https://wa.me/${CFG.whatsapp}" target="_blank" class="border rounded-xl p-4 hover:bg-green-50"><div class="text-xs text-gray-500">💬 Chat on WhatsApp</div><b>Reply within minutes</b></a>
    <a href="mailto:${CFG.email}" class="border rounded-xl p-4 hover:bg-green-50"><div class="text-xs text-gray-500">✉️ Email us</div><b>${CFG.email}</b></a></div></div></section>
  <footer class="bg-gray-900 text-gray-400 text-sm"><div class="max-w-7xl mx-auto px-4 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
   <div><div class="text-2xl font-extrabold text-white">🥬 ${CFG.store}</div><p class="mt-3 leading-relaxed">${CFG.tagline}. Quality products and best value, delivered to your door.</p>
    <div class="flex gap-2 mt-4 flex-wrap">${Object.entries(CFG.social).map(([n, u]) => `<a href="${u}" target="_blank" class="px-3 py-1.5 rounded-full bg-gray-800 hover:bg-green-600 hover:text-white text-xs">${n}</a>`).join("")}</div></div>
   <div><div class="${h}">Company</div>${["about", "terms", "privacy", "returns"].map(k => `<a href="#/page/${k}" class="${a}">${PAGES[k][0]}</a>`).join("")}</div>
   <div><div class="${h}">Support</div><a href="#/track" class="${a}">Track order</a><a href="#/page/contact" class="${a}">Contact us</a><a href="#/page/faq" class="${a}">FAQ</a><a href="#/shop" class="${a}">Shop</a></div>
   <div><div class="${h}">Contact</div><p class="py-1">📍 ${CFG.address}</p><p class="py-1">📞 ${CFG.phone}</p><p class="py-1">✉️ ${CFG.email}</p><p class="py-1">🕗 ${CFG.hours}</p></div></div>
   <div class="border-t border-gray-800"><div class="max-w-7xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"><span>© ${new Date().getFullYear()} ${CFG.store}. All rights reserved.</span>
    <div class="flex gap-2">${["bKash", "Cash on Delivery"].map(s => `<span class="px-3 py-1 rounded bg-gray-800 text-gray-300">${s}</span>`).join("")}</div><a href="#admin" class="hover:text-white">Admin login</a></div></div></footer>
  <a href="https://wa.me/${CFG.whatsapp}" target="_blank" class="fixed right-4 bottom-4 z-40 w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white text-2xl grid place-items-center shadow-lg" title="Chat on WhatsApp">💬</a>`;
}
function shell(inner) {
  const cs = cats();
  return `<div class="bg-green-800 text-green-50 text-xs"><div class="max-w-7xl mx-auto px-4 py-2 flex justify-between"><span>🚚 Free delivery on orders over ${tk(CFG.freeOver)}</span><span class="hidden sm:inline">📞 ${CFG.phone} &nbsp;|&nbsp; <a href="#/track" class="underline">Track order</a></span></div></div>
  <header class="bg-white/95 backdrop-blur border-b sticky z-30" style="top:env(safe-area-inset-top,0px)"><div class="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
   <a href="#" class="text-xl font-extrabold text-green-700 whitespace-nowrap">🥬 ${CFG.store}</a>
   <input id="q" oninput="q=this.value;plist()" onkeydown="if(event.key==='Enter'&&!location.hash.startsWith('#/shop')&&!location.hash.startsWith('#/category')){cat='All';location.hash='#/shop'}" value="${esc(q)}" placeholder="🔍  Search products..." class="${INP} !rounded-full flex-1 min-w-0">
   <a href="#/track" class="hidden md:block text-sm text-gray-600 hover:text-green-700 whitespace-nowrap">Track order</a>
   <button onclick="toggleCart(true)" class="relative bg-green-600 hover:bg-green-700 text-white rounded-full px-4 py-2.5 text-sm font-semibold whitespace-nowrap">🛒 Cart<span class="cb hidden absolute -top-1.5 -right-1.5 bg-red-500 text-[11px] rounded-full min-w-5 h-5 grid place-items-center px-1"></span></button></div>
   <nav class="border-t bg-white"><div class="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto no-scrollbar text-sm"><a href="#/shop" class="px-3 py-2.5 whitespace-nowrap font-medium text-green-700">All products</a>${cs.map(c => `<a href="#/category/${encodeURIComponent(c)}" class="px-3 py-2.5 whitespace-nowrap text-gray-600 hover:text-green-700">${esc(c)}</a>`).join("")}</div></nav></header>
  ${DB.mode === "signedout" ? `<div class="bg-amber-50 text-amber-800 text-sm text-center py-2">Please sign in to your Claude account to place orders.</div>` : ""}
  ${DB.mode === "local" ? `<div class="bg-blue-50 text-blue-800 text-xs text-center py-1.5">Demo mode: running without server, data is saved only in this browser. Run <b>node server.js</b> for the real shop.</div>` : ""}
  <main class="max-w-7xl mx-auto px-4 py-5 min-h-[60vh]">${inner}</main>${footer()}`;
}
function pageHTML() {
  const [a, b] = location.hash.replace(/^#\/?/, "").split("/");
  document.title = CFG.store + " – " + CFG.tagline;
  if (a === "shop") { cat = "All"; return shopPage() }
  if (a === "category") { cat = decodeURIComponent(b || "") || "All"; document.title = cat + " – " + CFG.store; return shopPage() }
  if (a === "product") return productPage(b);
  if (a === "track") return trackPage();
  if (a === "page") return infoPage(b);
  return home();
}

// ================= BOOT =================
function render() {
  if (isAdmin() && atab === "products" && $("#pf_name") && !skipSync) pf = readForm();
  skipSync = false;
  $("#app").innerHTML = isAdmin() ? adminView() : shell(pageHTML());
  if (!isAdmin()) { plist(); badge() }
}
addEventListener("hashchange", () => { render(); scrollTo(0, 0); if (isAdmin()) startAdmin() });
render();
DB.init().then(() => {
  DB.subProducts(l => {
    prods = l; ready = true;
    if (document.activeElement && document.activeElement.id === "q") plist(); else if (!isAdmin() || atab === "products" && !(document.activeElement && /^pf_/.test(document.activeElement.id || ""))) render()
  });
  if (DB.mode === "signedout") ready = true; startAdmin(); render()
});
