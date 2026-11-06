// ================= ADMIN =================
async function login() { const pw = $("#pw").value; try { await DB.api("POST", "login", { password: pw }); DB.pw = pw; DB.admin = true; sessionStorage.setItem("fm_pw", pw); startAdmin(); render() } catch (e) { toast("Wrong password") } }
function logout() { sessionStorage.removeItem("fm_pw"); DB.pw = ""; DB.admin = false; location.hash = ""; location.reload() }
function startAdmin() {
  if (subbed || !DB.admin || DB.mode === "signedout") return; subbed = true;
  DB.subOrders(l => { if (known !== null && l.length > known) toast("🔔 New order received!") ; known = l.length; orders = l; if (isAdmin() && atab === "orders") render() })
}
function adminView() {
  const top = `<header class="bg-gray-900 text-white sticky z-30" style="top:env(safe-area-inset-top,0px)"><div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between"><b>⚙️ ${CFG.store} Admin</b><div class="flex gap-4 text-sm"><a href="#" class="text-gray-300 hover:text-white">← View shop</a>${DB.mode === "server" && DB.admin ? `<button onclick="logout()" class="text-gray-300 hover:text-white">Logout</button>` : ""}</div></div></header>`;
  if (!DB.admin) {
    if (DB.mode === "server") return top + `<div class="max-w-sm mx-auto mt-16 bg-white rounded-2xl border p-8 text-center"><div class="text-5xl">🔐</div><h2 class="font-bold text-lg mt-2">Admin Login</h2><input id="pw" type="password" class="${INP} mt-4" placeholder="Admin password" onkeydown="if(event.key==='Enter')login()"><button onclick="login()" class="w-full mt-3 bg-green-600 text-white font-semibold py-2.5 rounded-xl">Login</button></div>`;
    return top + `<div class="max-w-md mx-auto mt-16 text-center bg-white rounded-2xl border p-8"><div class="text-5xl">🔒</div><h2 class="font-bold text-lg mt-2">Admin only</h2><p class="text-sm text-gray-500 mt-1">Only the site owner or editors can open this panel.</p></div>`
  }
  const pend = orders.filter(o => o.status === "pending").length, rev = orders.filter(o => o.status === "delivered").reduce((s, o) => s + o.total, 0), act = orders.filter(o => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);
  const stat = (a, b, c, i) => `<div class="bg-white border rounded-2xl p-4 flex items-center gap-3"><div class="text-3xl">${i}</div><div><div class="text-xs text-gray-500">${a}</div><div class="text-xl font-extrabold ${c}">${b}</div></div></div>`;
  const tab = (k, l) => `<button onclick="atab='${k}';render()" class="px-4 py-2 text-sm font-semibold rounded-lg ${atab === k ? "bg-green-600 text-white" : "bg-white border"}">${l}</button>`;
  return top + `<main class="max-w-6xl mx-auto px-4 py-5"><div class="grid grid-cols-2 sm:grid-cols-4 gap-3">${stat("Total orders", orders.length, "", "📦")}${stat("Pending", pend, "text-amber-600", "⏳")}${stat("Active sales", tk(act), "", "💰")}${stat("Delivered revenue", tk(rev), "text-green-700", "✅")}</div>
  <div class="flex gap-2 mt-5">${tab("orders", "📦 Orders")}${tab("products", "🛍️ Products (" + prods.length + ")")}<span class="ml-auto text-xs text-green-600 self-center">● Live</span></div><div class="mt-4">${atab === "orders" ? ordersView() : productsView()}</div></main>`;
}
function ordersView() {
  const fl = ["all", ...Object.keys(STATUS)], s = oq.toLowerCase(), l = orders.filter(o => (ofilter === "all" || o.status === ofilter) && (!s || (o.id + o.name + o.phone).toLowerCase().includes(s)));
  return `<div class="flex flex-wrap gap-2 items-center pb-3"><input id="oq" value="${esc(oq)}" oninput="oq=this.value;render();const e=$('#oq');e.focus();e.setSelectionRange(oq.length,oq.length)" placeholder="Search order ID, name, phone" class="${INP} !w-64 !py-1.5"><div class="flex gap-2 overflow-x-auto no-scrollbar">${fl.map(s => `<button onclick="ofilter='${s}';render()" class="whitespace-nowrap px-3 py-1.5 rounded-full text-xs border ${ofilter === s ? "bg-gray-900 text-white" : "bg-white"}">${s} (${s === "all" ? orders.length : orders.filter(o => o.status === s).length})</button>`).join("")}</div></div>
  <div class="space-y-3">${l.length ? l.map(o => `<div class="bg-white border rounded-2xl p-4"><div class="flex flex-wrap items-center gap-2 justify-between"><div><b class="font-mono">${esc(o.id)}</b> <span class="text-xs text-gray-500">${new Date(o.createdAt).toLocaleString()}</span></div>
   <select onchange="setStatus('${esc(o.id)}',this.value)" class="text-xs font-semibold rounded-full px-3 py-1.5 border-0 ${STATUS[o.status] || ""}">${Object.keys(STATUS).map(s => `<option ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}</select></div>
   <div class="grid sm:grid-cols-2 gap-3 mt-3 text-sm"><div><div class="font-semibold">${esc(o.name)}</div><a class="text-green-700" href="tel:${esc(o.phone)}">📞 ${esc(o.phone)}</a><div class="text-gray-600">📍 ${esc(o.address)}${o.zone ? ` <span class="text-xs text-gray-400">(${esc(o.zone)})</span>` : ""}</div>${o.note ? `<div class="text-xs text-gray-500 mt-1">Note: ${esc(o.note)}</div>` : ""}<div class="text-xs mt-1">Payment: <b>${o.payment === "bkash" ? "bKash (TrxID: " + esc(o.trx) + ")" : "Cash on Delivery"}</b></div></div>
   <div class="bg-gray-50 rounded-xl p-3 text-xs space-y-1.5">${(o.items || []).map(i => { const p = prods.find(x => x.id === i.id); return `<div class="flex items-center gap-2"><div class="w-8 h-8 rounded overflow-hidden bg-white shrink-0">${p ? img(p, "w-full h-full object-cover") : ""}</div><span class="flex-1">${i.qty}× ${esc(i.name)}</span><span>${tk(i.price * i.qty)}</span></div>` }).join("")}<div class="flex justify-between text-gray-500 border-t pt-1"><span>Delivery</span><span>${tk(o.delivery)}</span></div><div class="flex justify-between font-bold text-sm"><span>Total</span><span>${tk(o.total)}</span></div></div></div></div>`).join("") : `<div class="text-center text-gray-500 py-16 bg-white border rounded-2xl">No orders found. New orders appear here instantly.</div>`}</div>`;
}
const maxImg = () => DB.mode === "server" ? 6 : 3;
function prevHTML() { return (pf.images || []).map((s, i) => `<div class="relative w-20 h-20 rounded-lg overflow-hidden border"><img src="${esc(s)}" class="w-full h-full object-cover"><button onclick="rmImg(${i})" class="absolute top-0.5 right-0.5 bg-black/60 text-white w-5 h-5 rounded-full text-xs leading-none">×</button>${i === 0 ? `<span class="absolute bottom-0 inset-x-0 bg-green-600 text-white text-[9px] text-center">MAIN</span>` : ""}</div>`).join("") }
function rmImg(i) { pf.images.splice(i, 1); $("#prev").innerHTML = prevHTML() }
async function addImgs(inp) {
  const files = [...inp.files]; inp.value = "";
  for (const f of files) {
    if (pf.images.length >= maxImg()) { toast("Max " + maxImg() + " images" + (DB.mode === "server" ? "" : " in this mode")); break }
    try { const d = await readImg(f); pf.images.push(await DB.upload(d)); $("#prev").innerHTML = prevHTML() } catch (e) { toast("Image upload failed: " + (e.message || "")) }
  }
}
function readForm() {
  const v = i => ($("#" + i) || {}).value || "", c = i => !!($("#" + i) || {}).checked;
  return { ...pf, name: v("pf_name").trim(), cat: v("pf_cat").trim(), price: v("pf_price"), oldPrice: v("pf_old"), unit: v("pf_unit"), stock: v("pf_stock"), desc: v("pf_desc"), flash: c("pf_flash"), featured: c("pf_feat") }
}
function productsView() {
  const i2 = INP + " !py-2", lb = "text-xs font-medium text-gray-600 mb-1 block";
  return `<div class="bg-white border rounded-2xl p-4 sm:p-5 mb-4"><div class="font-bold mb-3">${pf.id ? "✏️ Edit product" : "➕ Add new product"}</div>
   <div class="grid sm:grid-cols-2 gap-3"><div class="sm:col-span-2"><label class="${lb}">Product name *</label><input id="pf_name" class="${i2}" value="${esc(pf.name || "")}"></div>
    <div><label class="${lb}">Category</label><input id="pf_cat" list="cl" class="${i2}" placeholder="e.g. Vegetables" value="${esc(pf.cat || "")}"><datalist id="cl">${cats().map(c => `<option value="${esc(c)}">`).join("")}</datalist></div>
    <div><label class="${lb}">Unit / size</label><input id="pf_unit" class="${i2}" placeholder="1 kg, 500 ml, 1 pc" value="${esc(pf.unit || "")}"></div>
    <div><label class="${lb}">Sale price (৳) *</label><input id="pf_price" type="number" class="${i2}" value="${esc(pf.price || "")}"></div>
    <div><label class="${lb}">Regular price (৳) <span class="text-gray-400">for discount badge</span></label><input id="pf_old" type="number" class="${i2}" value="${esc(pf.oldPrice || "")}"></div>
    <div><label class="${lb}">Stock quantity</label><input id="pf_stock" type="number" class="${i2}" placeholder="50" value="${esc(pf.stock == null ? "" : pf.stock)}"></div>
    <div class="flex items-end gap-5 pb-2 text-sm"><label class="flex items-center gap-2"><input id="pf_flash" type="checkbox" ${pf.flash ? "checked" : ""}> ⚡ Flash deal</label><label class="flex items-center gap-2"><input id="pf_feat" type="checkbox" ${pf.featured ? "checked" : ""}> ⭐ Featured</label></div>
    <div class="sm:col-span-2"><label class="${lb}">Description</label><textarea id="pf_desc" rows="4" class="${i2}">${esc(pf.desc || "")}</textarea></div>
    <div class="sm:col-span-2"><label class="${lb}">Product images (first image is the main image, max ${maxImg()})</label><div class="flex flex-wrap gap-2 items-center"><div id="prev" class="flex flex-wrap gap-2">${prevHTML()}</div>
     <label class="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 grid place-items-center text-gray-400 text-xs text-center cursor-pointer hover:border-green-500 hover:text-green-600">＋ Add<br>photo<input type="file" accept="image/*" multiple class="hidden" onchange="addImgs(this)"></label></div></div></div>
   <div class="flex gap-2 mt-4"><button onclick="saveP()" class="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg px-5 py-2.5">${pf.id ? "Update product" : "Add product"}</button>${pf.id ? `<button onclick="resetForm({images:[]})" class="border text-sm rounded-lg px-4 py-2.5">Cancel</button>` : ""}</div></div>
  <div class="bg-white border rounded-2xl divide-y">${[...prods].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map(p => `<div class="flex items-center gap-3 p-3 text-sm"><div class="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 shrink-0">${img(p, "w-full h-full object-cover")}</div>
   <div class="flex-1 min-w-0"><div class="font-medium truncate">${esc(p.name)}</div><div class="text-xs text-gray-500">${esc(p.cat)} · ${tk(p.price)}${off(p) ? ` <s>${tk(p.oldPrice)}</s>` : ""} · Stock: <b class="${p.stock <= 0 ? "text-red-500" : ""}">${p.stock}</b> ${p.flash ? "⚡" : ""}${p.featured ? "⭐" : ""}</div></div>
   <button onclick="editP('${p.id}')" class="text-green-700 text-xs border border-green-200 rounded-lg px-3 py-1.5">Edit</button><button onclick="delP('${p.id}')" class="text-xs rounded-lg px-3 py-1.5 border ${delArm === p.id ? "bg-red-600 text-white border-red-600" : "text-red-500 border-red-200"}">${delArm === p.id ? "Sure?" : "Delete"}</button></div>`).join("") || `<div class="p-8 text-center text-gray-500 text-sm">No products yet. Add your first product above.</div>`}</div>`;
}
const wrap = f => async (...a) => { try { await f(...a) } catch (e) { toast("Failed: " + (e.message || "error")) } };
const setStatus = wrap(async (id, s) => { await DB.status(id, s); toast("Order " + id + " → " + s) });
function editP(id) { const p = { ...prods.find(x => x.id === id) }; p.images = [...(p.images || [])]; atab = "products"; resetForm(p); scrollTo(0, 0) }
const delP = wrap(async id => { if (delArm === id) { delArm = null; await DB.delP(id); toast("Deleted") } else { delArm = id; render(); setTimeout(() => { if (delArm === id) { delArm = null; if (isAdmin()) render() } }, 3000) } });
const saveP = wrap(async () => {
  const f = readForm(); if (!f.name || !(+f.price > 0)) return toast("Name and sale price are required");
  const p = { name: f.name, cat: f.cat || "Uncategorized", price: +f.price, oldPrice: +f.oldPrice || 0, unit: f.unit, stock: f.stock === "" ? 50 : +f.stock, desc: f.desc, flash: f.flash, featured: f.featured, images: f.images || [], createdAt: f.createdAt || Date.now() };
  if (f.id) await DB.saveP(f.id, p); else await DB.addP(p);
  toast(f.id ? "Product updated ✓" : "Product added ✓"); resetForm({ images: [] })
});
