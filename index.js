const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'SECRETO_MEDINSUR_2026';

// Middleware
app.use(cors());
app.use(express.json());

// --- CONEXIÓN A MONGODB ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Conectado'))
  .catch(err => console.log('❌ Error DB:', err.message));

// --- MODELOS ---
const BarberoOwner = mongoose.model('BarberoOwner', new mongoose.Schema({
  nombreNegocio: String, 
  email: { type: String, unique: true, required: true }, 
  whatsapp: String, 
  password: { type: String, required: true },
  fechaRegistro: { type: Date, default: Date.now }
}));

const Sucursal = mongoose.model('Sucursal', new mongoose.Schema({
  ownerId: mongoose.Schema.Types.ObjectId,
  nombre: String,
  direccion: String
}));

// --- RUTAS API ---
app.post('/api/registrar', async (req, res) => {
  try {
    const { nombreNegocio, email, whatsapp, password } = req.body;
    if (!email || !password) return res.json({ error: "Faltan datos." });

    const mail = email.toLowerCase().trim();
    const existe = await BarberoOwner.findOne({ email: mail });
    if (existe) return res.json({ error: "El email ya existe." });

    const hash = await bcrypt.hash(password, 10);
    const nuevo = new BarberoOwner({ nombreNegocio, email: mail, whatsapp, password: hash });
    await nuevo.save();
    
    res.json({ ok: true, mensaje: "Registro exitoso" });
  } catch (e) {
    res.json({ error: "Error de servidor." });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await BarberoOwner.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) return res.json({ error: "Usuario no encontrado." });
    
    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.json({ error: "Contraseña incorrecta." });

    const token = jwt.sign({ id: user._id, nombre: user.nombreNegocio }, SECRET_KEY);
    res.json({ token, nombre: user.nombreNegocio });
  } catch (error) {
    res.json({ error: "Error en el login." });
  }
});

app.get('/api/sucursales/:token', async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, SECRET_KEY);
    const lista = await Sucursal.find({ ownerId: decoded.id });
    res.json(lista);
  } catch (error) { res.json([]); }
});

app.post('/api/sucursales', async (req, res) => {
  try {
    const { token, nombre, direccion } = req.body;
    const decoded = jwt.verify(token, SECRET_KEY);
    const nueva = new Sucursal({ ownerId: decoded.id, nombre, direccion });
    await nueva.save();
    res.json({ ok: true });
  } catch (error) { res.json({ error: "Error" }); }
});

// --- FRONTEND COMPLETO ---
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
        :root { --primary: #2563eb; --dark: #0f172a; --bg: #f8fafc; }
        body { font-family: 'Segoe UI', Roboto, sans-serif; margin: 0; background: var(--bg); display: flex; flex-direction: column; min-height: 100vh; }
        
        .auth-screen { flex: 1; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .auth-card { background: white; padding: 40px 30px; border-radius: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); width: 100%; max-width: 380px; text-align: center; }
        h2 { margin-bottom: 8px; color: var(--dark); }
        input { width: 100%; padding: 14px; margin-bottom: 12px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 16px; box-sizing: border-box; }
        .btn-primary { background: var(--primary); color: white; border: none; width: 100%; padding: 15px; border-radius: 12px; font-weight: 600; cursor: pointer; font-size: 16px; }
        
        .navbar { background: #1e293b; color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; }
        .sidebar { position: fixed; top: 0; left: -100%; width: 280px; height: 100%; background: white; z-index: 1000; transition: 0.3s; box-shadow: 10px 0 30px rgba(0,0,0,0.1); }
        .sidebar.active { left: 0; }
        .nav-item { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; color: var(--dark); text-decoration: none; font-weight: 500; cursor: pointer; }
        .nav-item i { margin-right: 15px; color: var(--primary); width: 20px; text-align: center; }
        .dashboard-container { padding: 20px; max-width: 800px; margin: auto; width: 100%; box-sizing: border-box; }
        .plan-card { background: white; border-radius: 20px; padding: 20px; border-left: 6px solid #ef4444; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
      </style>
    </head>
    <body>

      <div id="auth-ui" class="auth-screen">
        <div class="auth-card">
          <h2 id="t-p">BookBarber V2</h2>
          <p style="color: #64748b; margin-bottom: 20px;">Panel de gestión profesional</p>
          <div id="auth-fields">
            <input id="log-email" type="email" placeholder="Email institucional">
            <input id="log-pass" type="password" placeholder="Contraseña">
          </div>
          <button class="btn-primary" onclick="procesarAuth()" id="btn-t">Entrar al Panel</button>
          <p style="font-size: 14px; margin-top: 20px;">
            <span id="f-t">¿No tienes cuenta?</span> <a href="javascript:toggleV()" id="l-t" style="color:var(--primary); font-weight:700; text-decoration:none;">Registrarme</a>
          </p>
        </div>
      </div>

      <div id="dash-ui" style="display:none;">
        <div class="navbar">
          <i class="fas fa-bars" onclick="openMenu()" style="font-size:20px; cursor:pointer;"></i>
          <span id="b-name" style="font-weight:700;">Panel</span>
          <div style="width:20px;"></div>
        </div>

        <div id="menu" class="sidebar">
          <div style="padding:25px; background:var(--dark); color:white; font-weight:800;">
            <span id="sidebar-name">BOOKBARBER</span>
            <i class="fas fa-times" onclick="openMenu()" style="float:right; cursor:pointer;"></i>
          </div>
          <a class="nav-item" onclick="load('sucursales')"><i class="fas fa-store"></i> Sucursales</a>
          <a class="nav-item" onclick="load('equipo')"><i class="fas fa-users"></i> Equipo / Barberos</a>
          <a class="nav-item" onclick="load('servicios')"><i class="fas fa-cut"></i> Servicios</a>
          
          <div style="padding: 20px; text-align:center; margin-top: 20px; border-top: 1px solid #eee;">
             <button onclick="cerrarSesion()" style="background:none; border:none; color:red; font-weight:bold; cursor:pointer;">Cerrar Sesión</button>
          </div>
        </div>

        <div class="dashboard-container">
          <div class="plan-card">
            <small style="font-weight:800; color:#64748b;">ESTADO DEL SISTEMA</small>
            <h3 style="margin:5px 0;">Prueba Gratis: 30 Días</h3>
          </div>
          <div id="view-content"></div>
        </div>
      </div>

      <script>
        let mode = 'login';
        const openMenu = () => document.getElementById('menu').classList.toggle('active');

        window.onload = () => {
          const tk = localStorage.getItem('token');
          const nom = localStorage.getItem('nombreNegocio');
          if(tk && nom) { renderDash(tk, nom); }
        };

        function toggleV() {
          mode = (mode === 'login') ? 'reg' : 'login';
          const fields = document.getElementById('auth-fields');
          if(mode === 'reg') {
            fields.innerHTML = \`<input id="r-n" placeholder="Nombre de Barbería"><input id="r-e" type="email" placeholder="Email"><input id="r-w" placeholder="WhatsApp"><input id="r-p" type="password" placeholder="Contraseña">\`;
            document.getElementById('btn-t').innerText = "Crear mi Cuenta";
            document.getElementById('f-t').innerText = "¿Ya eres cliente?";
            document.getElementById('l-t').innerText = "Inicia Sesión";
          } else { location.reload(); }
        }

        async function procesarAuth() {
          const body = (mode === 'login') ? 
            { email: document.getElementById('log-email').value, password: document.getElementById('log-pass').value } :
            { nombreNegocio: document.getElementById('r-n').value, email: document.getElementById('r-e').value, whatsapp: document.getElementById('r-w').value, password: document.getElementById('r-p').value };

          const res = await fetch(mode === 'login' ? '/api/login' : '/api/registrar', {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)
          });
          const data = await res.json();
          
          if(data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('nombreNegocio', data.nombre);
            renderDash(data.token, data.nombre);
          } else if (data.ok) {
            alert("Registro exitoso. Inicia sesión ahora.");
            location.reload();
          } else { 
            alert(data.error); 
          }
        }

        function renderDash(tk, nom) {
          document.getElementById('auth-ui').style.display = 'none';
          document.getElementById('dash-ui').style.display = 'block';
          document.getElementById('b-name').innerText = nom;
          document.getElementById('sidebar-name').innerText = nom.toUpperCase();
          load('sucursales');
        }

        function cerrarSesion() {
          localStorage.removeItem('token');
          localStorage.removeItem('nombreNegocio');
          location.reload();
        }

        async function load(v) {
          if(document.getElementById('menu').classList.contains('active')) openMenu();
          const content = document.getElementById('view-content');
          const tk = localStorage.getItem('token');

          if(v === 'sucursales') {
            const r = await fetch('/api/sucursales/' + tk);
            const list = await r.json();
            let h = '<h2>📍 Mis Sucursales</h2><div id="list">';
            if(list.length === 0) h += '<p style="color:#64748b;">No tienes sucursales registradas.</p>';
            list.forEach(s => h += \`<div style="background:white; padding:15px; border-radius:12px; margin-bottom:10px; box-shadow:0 2px 4px rgba(0,0,0,0.05);"><b>\${s.nombre}</b><br><small>\${s.direccion}</small></div>\`);
            h += '</div><hr><h4>+ Nueva Sucursal</h4><input id="sn" placeholder="Nombre (Ej: Centro)"><input id="sd" placeholder="Dirección"><button class="btn-primary" onclick="saveS()">Guardar</button>';
            content.innerHTML = h;
          } else { content.innerHTML = '<h3>🚧 Sección en construcción</h3>'; }
        }

        async function saveS() {
          const sn = document.getElementById('sn').value;
          const sd = document.getElementById('sd').value;
          if(!sn || !sd) return alert('Completa los campos');
          
          await fetch('/api/sucursales', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ token: localStorage.getItem('token'), nombre: sn, direccion: sd })
          });
          load('sucursales');
        }
      </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => console.log('🚀 Servidor V2 corriendo en puerto ' + PORT));
