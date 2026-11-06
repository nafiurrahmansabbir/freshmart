// FreshMart server — zero dependencies. Run: node server.js
const http=require("http"),fs=require("fs"),path=require("path");
const PORT=process.env.PORT||3000, PASS=process.env.ADMIN_PASSWORD||"admin123", FREE_OVER=+process.env.FREE_OVER||1000;
const DATA=path.join(__dirname,"data"), F=path.join(DATA,"db.json"), UP=path.join(DATA,"uploads"), PUB=path.join(__dirname,"public");
fs.mkdirSync(UP,{recursive:true});
let db={products:[],orders:[]};try{db=JSON.parse(fs.readFileSync(F,"utf8"))}catch(e){}
const save=()=>fs.writeFileSync(F,JSON.stringify(db,null,1));
const MIME={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".png":"image/png",".jpg":"image/jpeg",".webp":"image/webp",".svg":"image/svg+xml",".ico":"image/x-icon"};
const send=(res,c,o)=>{res.writeHead(c,{"Content-Type":"application/json"});res.end(JSON.stringify(o))};
const body=(req,max=1e6)=>new Promise(r=>{let b="";req.on("data",c=>{b+=c;if(b.length>max)req.destroy()});req.on("end",()=>{try{r(JSON.parse(b||"{}"))}catch(e){r({})}})});
const s=(v,n=300)=>String(v==null?"":v).slice(0,n);
const cleanP=b=>({name:s(b.name,150),cat:s(b.cat,60)||"Uncategorized",price:+b.price||0,oldPrice:+b.oldPrice||0,unit:s(b.unit,30),stock:Math.max(0,+b.stock||0),desc:s(b.desc,4000),flash:!!b.flash,featured:!!b.featured,
  images:(Array.isArray(b.images)?b.images:[]).filter(x=>/^uploads\/[\w.-]+$/.test(x)).slice(0,6),createdAt:+b.createdAt||Date.now()});
const rmImgs=p=>(p.images||[]).forEach(x=>{try{fs.unlinkSync(path.join(DATA,x))}catch(e){}});
const serve=(res,f,root)=>{f=path.normalize(f);if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end("Not found")}
  res.writeHead(200,{"Content-Type":MIME[path.extname(f).toLowerCase()]||"application/octet-stream","Cache-Control":root===UP?"public,max-age=31536000":"no-cache"});fs.createReadStream(f).pipe(res)};
http.createServer(async(req,res)=>{
  const u=new URL(req.url,"http://x"),p=u.pathname,m=req.method,admin=req.headers["x-admin"]===PASS;
  if(p.startsWith("/uploads/"))return serve(res,path.join(UP,p.slice(9)),UP);
  if(p.startsWith("/api/")){
    const [,r,id]=p.split("/").filter(Boolean);
    if(r==="login"&&m==="POST"){const b=await body(req);return send(res,b.password===PASS?200:401,{ok:b.password===PASS})}
    if(r==="track"&&m==="GET"){const o=db.orders.find(x=>x.id===u.searchParams.get("id")&&x.phone===u.searchParams.get("phone"));return o?send(res,200,o):send(res,404,{error:"Not found"})}
    if(r==="upload"&&m==="POST"){
      if(!admin)return send(res,401,{error:"Admin only"});
      const b=await body(req,8e6),mt=/^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(b.data||"");if(!mt)return send(res,400,{error:"Bad image"});
      const name=Date.now().toString(36)+Math.random().toString(36).slice(2,7)+"."+(mt[1]==="jpeg"?"jpg":mt[1]);
      fs.writeFileSync(path.join(UP,name),Buffer.from(mt[2],"base64"));return send(res,200,{url:"uploads/"+name})}
    if(r==="products"){
      if(m==="GET")return send(res,200,db.products);
      if(!admin)return send(res,401,{error:"Admin only"});
      const b=await body(req);
      if(m==="POST"){const x={id:"p"+Date.now().toString(36)+Math.random().toString(36).slice(2,5),...cleanP(b)};db.products.push(x);save();return send(res,200,x)}
      const i=db.products.findIndex(x=>x.id===id);if(i<0)return send(res,404,{error:"Not found"});
      if(m==="PUT"){const old=db.products[i],n=cleanP(b);(old.images||[]).filter(x=>!n.images.includes(x)).forEach(x=>rmImgs({images:[x]}));db.products[i]={id,...n};save();return send(res,200,db.products[i])}
      if(m==="DELETE"){rmImgs(db.products[i]);db.products.splice(i,1);save();return send(res,200,{ok:1})}
    }
    if(r==="orders"){
      if(m==="POST"){const b=await body(req),items=[];
        for(const i of (Array.isArray(b.items)?b.items:[]).slice(0,60)){const pr=db.products.find(x=>x.id===i.id),qty=Math.max(1,Math.min(99,+i.qty||1));
          if(!pr)continue;if(pr.stock<qty)return send(res,400,{error:`Only ${pr.stock} left: ${pr.name}`});items.push({id:pr.id,name:pr.name,unit:pr.unit,price:pr.price,qty})}
        if(!items.length||!s(b.name)||!/^01\d{9}$/.test(s(b.phone))||s(b.address).length<8)return send(res,400,{error:"Invalid order"});
        const subtotal=items.reduce((a,i)=>a+i.price*i.qty,0),delivery=subtotal>=FREE_OVER?0:(+b.delivery===120?120:60);
        items.forEach(i=>{db.products.find(x=>x.id===i.id).stock-=i.qty});
        const o={id:"ORD-"+Date.now().toString(36).toUpperCase(),name:s(b.name,80),phone:s(b.phone,11),address:s(b.address,300),zone:s(b.zone,60),note:s(b.note),payment:b.payment==="bkash"?"bkash":"cod",trx:s(b.trx,40),items,subtotal,delivery,total:subtotal+delivery,status:"pending",createdAt:Date.now()};
        db.orders.push(o);save();return send(res,200,o)}
      if(!admin)return send(res,401,{error:"Admin only"});
      if(m==="GET")return send(res,200,db.orders);
      if(m==="PATCH"){const b=await body(req),o=db.orders.find(x=>x.id===id);if(!o)return send(res,404,{error:"Not found"});
        if(["pending","confirmed","shipped","delivered","cancelled"].includes(b.status))o.status=b.status;save();return send(res,200,o)}
    }
    return send(res,404,{error:"Not found"});
  }
  serve(res,path.join(PUB,p==="/"?"index.html":p),PUB);
}).listen(PORT,()=>console.log(`FreshMart running → http://localhost:${PORT}  (admin: /#admin, password: ${PASS})`));
