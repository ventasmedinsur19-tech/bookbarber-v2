const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'SECRETO_MEDINSUR_2026';

app.use(cors());
app.use(express.json());

// --- CONEXIÓN A MONGODB ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Conectado'))
  .catch(err => console.log('❌ Error DB:', err.message));

// --- MODELOS ---
const BarberoOwner = mongoose.model('BarberoOwner', new mongoose.Schema({
  nombreNegocio: String, email: { type: String, unique: true }, whatsapp: String, password: { type: String }
}));
const Sucursal = mongoose.model('Sucursal', new mongoose.Schema({
  ownerId: mongoose.Schema.Types.ObjectId, nombre: String, direccion: String
}));

// --- API AUTH ---
app.post('/api/registrar', async (req, res) => {
  try {
    const { nombreNegocio, email, whatsapp, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const nuevo = new BarberoOwner({ nombreNegocio, email: email.toLowerCase(), whatsapp, password: hash });
    await nuevo.save();
    res.json({ ok: true });
  } catch (e) { res.json({ error: "Error al registrar." }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await BarberoOwner.findOne({ email: email.toLowerCase() });
    if (!user || !await bcrypt.compare(password, user.password)) return res.json({ error: "Credenciales inválidas" });
    const token = jwt.sign({ id: user._id, nombre: user.nombreNegocio }, SECRET_KEY);
    res.json({ token, nombre: user.nombreNegocio });
  } catch (e) { res.json({ error: "Error login" }); }
});

app.get('/api/sucursales/:token', async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, SECRET_KEY);
    const lista = await Sucursal.find({ ownerId: decoded.id });
    res.json(lista);
  } catch (e) { res.json([]); }
});

app.post('/api/sucursales', async (req, res) => {
  try {
    const { token, nombre, direccion } = req.body;
    const decoded = jwt.verify(token, SECRET_KEY);
    await new Sucursal({ ownerId: decoded.id, nombre, direccion }).save();
    res.json({ ok: true });
  } catch (e) { res.json({ error: "Error" }); }
});

// --- FRONTEND ---
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>BookBarber V2</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
      <style>
        :root { --primary: #2563eb; --dark: #0f172a; --bg: #f8fafc; --text-muted: #64748b; }
        body { font-family: 'Segoe UI', sans-serif; margin: 0; background: var(--bg); }
        .auth-screen { height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box; }
        .auth-card { background: white; padding: 30px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); width: 100%; max-width: 380px; text-align: center; }
        input { width: 100%; padding: 12px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 10px; box-sizing: border-box; font-size: 16px; }
        .btn-black { background: var(--dark); color: white; border: none; width: 100%; padding: 14px; border-radius: 10px; font-weight: bold; cursor: pointer; }
        
        /* NAVBAR Y SIDEBAR */
        .navbar { background: var(--dark); color: white; padding: 15px; display: flex; align-items: center; position: sticky; top: 0; z-index: 100; }
        .sidebar { position: fixed; top: 0; left: -100%; width: 280px; height: 100%; background: white; z-index: 1000; transition: 0.3s; box-shadow: 5px 0 20px rgba(0,0,0,0.1); display: flex; flex-direction: column; }
        .sidebar.active { left: 0; }
        .sidebar-header { padding: 20px; background: var(--dark); color: white; font-weight: 800; display: flex; justify-content: space-between; }
        
        .nav-items { flex-grow: 1; overflow-y: auto; padding: 10px 0; }
        .nav-item { padding: 14px 20px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; color: var(--dark); text-decoration: none; font-weight: 500; cursor: pointer; }
        .nav-item i { margin-right: 15px; width: 20px; text-align: center; color: var(--primary); font-size: 18px; }
        
        /* FOOTER MENU */
        .sidebar-footer { padding: 20px; border-top: 1px solid #eee; background: #fdfdfd; }
        .btn-wa { display: flex; align-items: center; justify-content: center; gap: 8px; color: #10b981; font-weight: bold; text-decoration: none; font-size: 14px; margin-bottom: 15px; }
        .copy { font-size: 11px; color: var(--text-muted); text-align: center; margin-bottom: 15px; }
        .btn-out { background: none; border: 1px solid #ef4444; color: #ef4444; width: 100%; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; }

        .container { padding: 20px; max-width: 600px; margin: auto; }
        .plan-card { background: white; border-radius: 15px; padding: 20px; border-left: 5px solid #ef4444; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-bottom: 20px; }
      </style>
    </head>
    <body>

      <div id="auth-ui" class="auth-screen">
        <div class="auth-card">
          <h2 id="a-t">BookBarber V2</h2>
          <div id="a-f">
            <input id="e" type="email" placeholder="Email">
            <input id="p" type="password" placeholder="Contraseña">
          </div>
          <button class="btn-black" onclick="auth()" id="btn-a">Entrar al Panel</button>
          <p style="margin-top:20px; font-size:14px;">¿No tienes cuenta? <a href="javascript:tAuth()" style="color:var(--primary); font-weight:700;">Regístrate</a></p>
        </div>
      </div>

      <div id="dash-ui" style="display:none;">
        <div class="navbar">
          <i class="fas fa-bars" onclick="tMenu()" style="font-size:20px; margin-right:15px; cursor:pointer;"></i>
          <span id="b-n" style="font-weight:700;">Panel</span>
        </div>

        <div id="menu" class="sidebar">
          <div class="sidebar-header">
            <span>BOOKBARBER V2</span>
            <i class="fas fa-times" onclick="tMenu()" style="cursor:pointer;"></i>
          </div>
          
          <div class="nav-items">
            <div class="nav-item" onclick="load('sucursales')"><i class="fas fa-store"></i> Mis sucursales</div>
            <div class="nav-item" onclick="load('staff')"><i class="fas fa-users"></i> Staff</div>
            <div class="nav-item" onclick="load('horarios')"><i class="fas fa-clock"></i> Horarios</div>
            <div class="nav-item" onclick="load('servicios')"><i class="fas fa-cut"></i> Servicios</div>
            <div class="nav-item" onclick="load('turnos')"><i class="fas fa-calendar-check"></i> Turnos</div>
            <div class="nav-item" onclick="load('caja')"><i class="fas fa-wallet"></i> Caja y Ranking</div>
            <div class="nav-item" onclick="load('enlaces')"><i class="fas fa-link"></i> Enlaces de reservas</div>
          </div>

          <div class="sidebar-footer">
            <a href="https://wa.me/5493513009673" target="_blank" class="btn-wa">
              <i class="fab fa-whatsapp"></i> Solicita una mejora
            </a>
            <div class="copy">MedinSur Dev © 2026</div>
            <button class="btn-out" onclick="logout()">Cerrar sesión</button>
          </div>
        </div>

        <div class="container">
          <div class="plan-card">
            <small style="font-weight:800; color:var(--text-muted);">ESTADO DEL PLAN</small>
            <h3 style="margin:5px 0;">30 Días de Prueba Gratis</h3>
            <button id="pago" class="btn-black" style="background:#ef4444; padding:10px; font-size:14px;">Activar Suscripción ($15.000)</button>
          </div>
          <div id="main"></div>
        </div>
      </div>

      <script>
        let isL = true;
        const tMenu = () => document.getElementById('menu').classList.toggle('active');

        window.onload = () => {
          const tk = localStorage.getItem('token');
          if(tk) show(tk, localStorage.getItem('nombre'));
        };

        function tAuth() {
          isL = !isL;
          document.getElementById('a-t').innerText = isL ? "BookBarber V2" : "Nueva Cuenta";
          document.getElementById('a-f').innerHTML = isL ? 
            '<input id="e" type="email" placeholder="Email"><input id="p" type="password" placeholder="Contraseña">' :
            '<input id="n" placeholder="Nombre Negocio"><input id="e" type="email" placeholder="Email"><input id="w" placeholder="WhatsApp"><input id="p" type="password" placeholder="Contraseña">';
        }

        async function auth() {
          const body = isL ? { email: e.value, password: p.value } : { nombreNegocio: n.value, email: e.value, whatsapp: w.value, password: p.value };
          const r = await fetch(isL ? '/api/login' : '/api/registrar', {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)
          });
          const d = await r.json();
          if(d.token) {
            localStorage.setItem('token', d.token);
            localStorage.setItem('nombre', d.nombre);
            show(d.token, d.nombre);
          } else if(d.ok) { alert("¡Listo! Ya puedes entrar."); location.reload(); }
          else alert(d.error);
        }

        function show(tk, nom) {
          document.getElementById('auth-ui').style.display = 'none';
          document.getElementById('dash-ui').style.display = 'block';
          document.getElementById('b-n').innerText = nom;
          load('sucursales');
        }

        function logout() { localStorage.clear(); location.reload(); }

        async function load(v) {
          if(document.getElementById('menu').classList.contains('active')) tMenu();
          const main = document.getElementById('main');
          const tk = localStorage.getItem('token');
          
          if(v === 'sucursales') {
            const r = await fetch('/api/sucursales/' + tk);
            const data = await r.json();
            const costo = 15000 + (Math.max(0, data.length - 1) * 5000);
            document.getElementById('pago').innerText = \`Activar Suscripción ($\${costo.toLocaleString()})\`;
            
            let h = '<h2>📍 Mis sucursales</h2>';
            data.forEach(s => h += \`<div style="background:white; padding:15px; border-radius:12px; margin-bottom:10px; border:1px solid #eee;"><b>\${s.nombre}</b><br><small>\${s.direccion}</small></div>\`);
            h += \`<div style="margin-top:20px; border-top:1px solid #ddd; padding-top:20px;">
              <h3>\${data.length === 0 ? '+ Configurar Principal' : '+ Sucursal Extra'}</h3>
              <input id="sn" placeholder="Nombre"><input id="sd" placeholder="Dirección">
              <button class="btn-black" style="background:var(--primary)" onclick="saveS()">Guardar</button>
            </div>\`;
            main.innerHTML = h;
          } else {
            main.innerHTML = \`<h2>🚧 \${v.toUpperCase()}</h2><p>MedinSur Dev está configurando esta sección...</p>\`;
          }
        }

        async function saveS() {
          await fetch('/api/sucursales', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ token: localStorage.getItem('token'), nombre: sn.value, direccion: sd.value })
          });
          load('sucursales');
        }
      </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => console.log('🚀 BookBarber V2 Online'));
