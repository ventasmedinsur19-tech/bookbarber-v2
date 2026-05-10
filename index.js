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

// --- CONEXIÓN ROBUSTA A MONGODB ---
const conectarDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("La variable MONGO_URI no está definida en el archivo .env");
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Conectado con éxito');
  } catch (err) {
    console.error('❌ ERROR CRÍTICO DB:', err.message);
  }
};
conectarDB();

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
    
    // Validación básica
    if (!email || !password) {
      return res.status(400).json({ error: "Email y contraseña son obligatorios." });
    }

    const emailLcase = email.toLowerCase().trim();
    const existe = await BarberoOwner.findOne({ email: emailLcase });
    
    if (existe) {
      return res.status(400).json({ error: "Este correo ya está registrado." });
    }

    const passwordHashed = await bcrypt.hash(password, 10);
    const nuevo = new BarberoOwner({ 
      nombreNegocio, 
      email: emailLcase, 
      whatsapp, 
      password: passwordHashed 
    });
    
    await nuevo.save();
    console.log(`🆕 Nuevo registro: ${emailLcase}`);
    res.status(201).json({ mensaje: "✅ Registro exitoso." });
  } catch (error) {
    console.error("❌ Error en registro:", error);
    res.status(500).json({ error: "Error interno: Revisa la conexión a la base de datos." });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await BarberoOwner.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) return res.status(400).json({ error: "El usuario no existe." });
    
    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(400).json({ error: "Contraseña incorrecta." });

    const token = jwt.sign({ id: user._id, nombre: user.nombreNegocio }, SECRET_KEY, { expiresIn: '24h' });
    res.json({ token, nombre: user.nombreNegocio });
  } catch (error) {
    res.status(500).json({ error: "Error en el login." });
  }
});

// Sucursales
app.get('/api/sucursales/:token', async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, SECRET_KEY);
    const lista = await Sucursal.find({ ownerId: decoded.id });
    res.json(lista);
  } catch (error) { res.status(401).json({ error: "Token inválido" }); }
});

app.post('/api/sucursales', async (req, res) => {
  try {
    const { token, nombre, direccion } = req.body;
    const decoded = jwt.verify(token, SECRET_KEY);
    const nueva = new Sucursal({ ownerId: decoded.id, nombre, direccion });
    await nueva.save();
    res.json({ mensaje: "OK" });
  } catch (error) { res.status(401).json({ error: "Error" }); }
});

// --- FRONTEND (DISEÑO LIMPIO Y CENTRADO) ---
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>BookBarber V2 | MedinSur Dev</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
      <style>
        :root { --primary: #2563eb; --dark: #0f172a; --bg: #f8fafc; }
        body { font-family: 'Segoe UI', Roboto, sans-serif; margin: 0; background: var(--bg); display: flex; flex-direction: column; min-height: 100vh; }
        
        .auth-screen { flex: 1; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .auth-card { background: white; padding: 40px 30px; border-radius: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); width: 100%; max-width: 380px; text-align: center; }
        
        h2 { margin-bottom: 8px; color: var(--dark); }
        .subtitle { color: #64748b; font-size: 14px; margin-bottom: 30px; }

        input { width: 100%; padding: 14px; margin-bottom: 12px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 16px; box-sizing: border-box; }
        .btn-primary { background: var(--primary); color: white; border: none; width: 100%; padding: 15px; border-radius: 12px; font-weight: 600; cursor: pointer; font-size: 16px; }
        
        .navbar { background: #1e293b; color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; }
        .sidebar { position: fixed; top: 0; left: -100%; width: 280px; height: 100%; background: white; z-index: 1000; transition: 0.3s; box-shadow: 10px 0 30px rgba(0,0,0,0.1); }
        .sidebar.active { left: 0; }
        .nav-item { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; color: var(--dark); text-decoration: none; font-weight: 500; }
        .nav-item i { margin-right: 15px; color: var(--primary); width: 20px; text-align: center; }

        .dashboard-container { padding: 20px; max-width: 800px; margin: auto; width: 100%; box-sizing: border-box; }
        .plan-card { background: white; border-radius: 20px; padding: 20px; border-left: 6px solid #ef4444; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; margin-top: auto; }
      </style>
    </head>
    <body>

      <div id="auth-ui" class="auth-screen">
        <div class="auth-card">
          <h2 id="t-p">BookBarber V2</h2>
          <p id="s-p" class="subtitle">Panel de gestión profesional</p>
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
          <i class="fas fa-bars" onclick="openMenu()" style="font-size:20px;"></i>
          <span id="b-name" style="font-weight:700;">Panel</span>
          <div style="width:20px;"></div>
        </div>

        <div id="menu" class="sidebar">
          <div style="padding:25px; background:var(--dark); color:white; font-weight:800;">BOOKBARBER</div>
          <a class="nav-item" onclick="load('sucursales')"><i class="fas fa-store"></i> Sucursales</a>
          <a class="nav-item" onclick="load('equipo')"><i class="fas fa-users"></i> Equipo / Barberos</a>
          <a class="nav-item" onclick="load('servicios')"><i class="fas fa-cut"></i> Servicios</a>
          <a class="nav-item" onclick="load('turnos')"><i class="fas fa-calendar-check"></i> Turnos</a>
          
          <div style="padding: 20px;">
            <a id="wa-dev" href="#" target="_blank" style="color:#10b981; font-size:13px; font-weight:700; text-decoration:none;">
              <i class="fab fa-whatsapp"></i> Soporte MedinSur Dev
            </a>
          </div>
          <div class="footer">
             MedinSur Dev © 2026<br>
             <button onclick="location.reload()" style="margin-top:10px; border:none; background:none; color:red; cursor:pointer;">Cerrar Sesión</button>
          </div>
        </div>

        <div class="dashboard-container">
          <div class="plan-card">
            <small style="font-weight:800; color:#64748b;">ESTADO DEL SISTEMA</small>
            <h3 style="margin:5px 0;">Prueba Gratis: 30 Días</h3>
            <button id="wa-pay" style="background:#ef4444; color:white; border:none; padding:10px 15px; border-radius:8px; width:100%; font-weight:700; margin-top:10px;">Activar Suscripción ($15.000)</button>
          </div>
          <div id="view-content"></div>
        </div>
      </div>

      <script>
        let mode = 'login';
        const openMenu = () => document.getElementById('menu').classList.toggle('active');

        function toggleV() {
          mode = (mode === 'login') ? 'reg' : 'login';
          const fields = document.getElementById('auth-fields');
          if(mode === 'reg') {
            fields.innerHTML = \`<input id="r-n" placeholder="Nombre de Barbería"><input id="r-e" placeholder="Email"><input id="r-w" placeholder="WhatsApp"><input id="r-p" placeholder="Contraseña">\`;
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
            renderDash(data.token, data.nombre);
          } else { alert(data.error); }
        }

        function renderDash(tk, nom) {
          document.getElementById('auth-ui').style.display = 'none';
          document.getElementById('dash-ui').style.display = 'block';
          document.getElementById('b-name').innerText = nom;
          document.getElementById('wa-dev').href = \`https://wa.me/5493513009673?text=Hola MedinSur! Soy dueño de \${nom}\`;
          document.getElementById('wa-pay').onclick = () => window.open(\`https://wa.me/5493515920795?text=Quiero pagar la suscripción de \${nom}\`);
          load('sucursales');
        }

        async function load(v) {
          if(document.getElementById('menu').classList.contains('active')) openMenu();
          const content = document.getElementById('view-content');
          const tk = localStorage.getItem('token');

          if(v === 'sucursales') {
            const r = await fetch('/api/sucursales/' + tk);
            const list = await r.json();
            let h = '<h2>📍 Mis Sucursales</h2><div id="list">';
            list.forEach(s => h += \`<div style="background:white; padding:15px; border-radius:12px; margin-bottom:10px; box-shadow:0 2px 4px rgba(0,0,0,0.05);"><b>\${s.nombre}</b><br><small>\${s.direccion}</small></div>\`);
            h += '</div><hr><h4>+ Nueva Sucursal</h4><input id="sn"><input id="sd"><button class="btn-primary" onclick="saveS()">Guardar</button>';
            content.innerHTML = h;
          } else { content.innerHTML = '<h3>En construcción</h3>'; }
        }

        async function saveS() {
          await fetch('/api/sucursales', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ token: localStorage.getItem('token'), nombre: document.getElementById('sn').value, direccion: document.getElementById('sd').value })
          });
          load('sucursales');
        }
      </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => console.log('🚀 Servidor BookBarber V2 en puerto ' + PORT));
