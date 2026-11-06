# FreshMart – Grocery E-commerce (HTML + Tailwind CSS)

## Run (real shop with admin)
1. Install Node.js (v16+).
2. In this folder: `node server.js`  (or `npm start`)
3. Shop:  http://localhost:3000     Admin: http://localhost:3000/#admin
4. Admin password: `admin123`. Change it:  `ADMIN_PASSWORD=mypass node server.js`
   (Windows: `set ADMIN_PASSWORD=mypass && node server.js`)

Orders are saved in `data/db.json`. Admin page polls every 4s and beeps on new orders.

## Add products with photos
Admin → Products tab → fill the form, click **＋ Add photo** (up to 6 images, auto-resized) → Add product. Set Regular price higher than Sale price to show a discount badge. Tick ⚡ Flash deal / ⭐ Featured to show on home page. Stock reduces automatically when orders arrive. Images are saved in `data/uploads/`.

## Pages
Home, Shop (sort + category), Product details, Track order, About/Terms/Privacy/Returns/Contact/FAQ (text in `PAGES` in app.js).

## Demo without server
Open `public/index.html` directly in browser → works in demo mode (data saved in your browser only).

## Edit
- `public/app.js` top: store name, bKash number, delivery fee, phone, email, address, carousel slides, default products.
- `public/style.css`: colors / fonts.   `public/index.html`: page skeleton.

## Go live
Deploy folder to any Node host (Render, Railway, VPS). Set env `ADMIN_PASSWORD` and `PORT`.
For high traffic use a real database (SQLite/Postgres) instead of JSON file.
# freshmart
