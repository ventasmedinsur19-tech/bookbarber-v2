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

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ DB Conectada'))
  .catch(err => console.error('❌ Error DB:', err));

// --- MODELOS DE DATOS ---

const BarberoOwner = mongoose.model('BarberoOwner', new mongoose.Schema({
  nombreNegocio: String, 
  email: { type: String, unique: true }, 
  whatsapp: String, 
  password: String, 
  planActivo: { type: Boolean, default: true },
  fechaRegistro: { type: Date, default: Date.now }
}));

const Sucursal = mongoose.model('Sucursal', new mongoose.Schema({
  ownerId: mongoose.Schema.Types.ObjectId,
  nombre: String,
  direccion: String,
  isMadre: { type: Boolean, default: false }
}));

// --- RUTAS DE API ---

app.post('/api/registrar', async (req, res) => {
  try {
    const { nombreNegocio, email, whatsapp, password } = req.body;
    const passwordHashed = await bcrypt.hash(password, 10);
    const nuevo = new BarberoOwner({ nombreNegocio, email, whatsapp, password: passwordHashed });
    await nuevo.save();
    res.status(201).json({ mensaje: "✅ Registro exitoso." });
  } catch (error) { res.status(400).json({ error: "❌ Error: El email ya existe." }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await BarberoOwner.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: "Email o clave incorrectos" });
    }
    const token = jwt.sign({ id: user._id, nombre: user.nombreNegocio }, SECRET_KEY, { expiresIn: '24h' });
    res.json({ token, nombre: user.nombreNegocio });
  } catch (error) { res.status(500).json({ error: "Error interno" }); }
});

// Guardar Sucursal
app.post('/api/sucursales', async (req, res) => {
  try {
    const { token, nombre, direccion } = req.body;
    const decoded = jwt.verify(token, SECRET_KEY);
    const nueva = new Sucursal({ ownerId: decoded.id, nombre, direccion });
    await nueva.save();
    res.json({ mensaje: "✅ Sucursal guardada" });
  } catch (error) { res.status(401).json({ error: "Sesión expirada" }); }
});

// Obtener Sucursales
app.get('/api/sucursales/:token', async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, SECRET_KEY);
    const lista = await Sucursal.find({ ownerId: decoded.id });
    res.json(lista);
  } catch (error) { res.status(401).json({ error: "Error de token" }); }
});

// --- INTERFAZ FRONTEND ---

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>BookBarber V2 - MedinSur Dev</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
      <style>
        :root { --primary: #2563eb; --dark: #121212; --bg: #f8fafc; --text-muted: #64748b; }
        body { font-family: 'Segoe UI', sans-serif; margin: 0; background: var(--bg); color: var(--dark); }
        
        .navbar { background: var(--dark); color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 100; }
        .menu-btn { font-size: 22px; cursor: pointer; background: none; border: none; color: white; }
        
        .mobile-menu { position: fixed; top: 0; left: -100%; width: 280px; height: 100%; background: white; box-shadow: 10px 0 30px rgba(0,0,0,0.2); transition: 0.3s; z-index: 200; display: flex; flex-direction: column; }
        .mobile-menu.active { left: 0; }
        .menu-header { padding: 30px 20px; background: var(--dark); color: white; font-weight: bold; font-size: 20px; }
        .nav-link { display: flex; align-items: center; padding: 15px 20px; color: var(--dark); text-decoration: none; border-bottom: 1px solid #f1f5f9; cursor: pointer; }
        .nav-link i { margin-right: 15px; width: 20px; text-align: center; color: var(--primary); }

        .container { padding: 20px; max-width: 800px; margin: auto; }
        .status-card { background: #fff; border-radius: 16px; padding: 20px; border-top: 5px solid #ef4444; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom: 25px; }
        .btn-pay { background: #ef4444; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: bold; width: 100%; margin-top: 10px; cursor: pointer; }
        
        .auth-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #121212; z-index: 300; display: flex; justify-content: center; align-items: center; padding: 20px; }
        .auth-box { background: white; padding: 35px; border-radius: 20px; width: 100%; max-width: 400px; text-align: center; }
        input { width: 100%; padding: 14px; margin-bottom: 12px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 16px; }
        .btn-main { background: var(--dark); color: white; border: none; width: 100%; padding: 15px; border-radius: 10px; font-weight: bold; cursor: pointer; }
        
        .footer-copy { padding: 20px; font-size: 12px; color: var(--text-muted); text-align: center; margin-top: auto; border-top: 1px solid #eee; }
        .sucursal-item { background: white; padding: 15px; border-radius: 10px; margin-bottom: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border-left: 4px solid var(--primary); }
      </style>
    </head>
    <body>

      <div id="auth-screen" class="auth-overlay">
        <div class="auth-box">
          <h1 style="font-size: 24px; margin-bottom: 30px;">BookBarber V2</h1>
          <div id="inputs">
            <input id="email" type="email" placeholder="Email institucional">
            <input id="pass" type="password" placeholder="Contraseña">
          </div>
          <button class="btn-main" onclick="handleAuth()">Entrar al Panel</button>
          <p id="msg" style="margin-top: 15px; font-size: 13px;"></p>
          <div style="margin-top: 25px; font-size: 14px;">
             ¿No tienes cuenta? <a href="#" onclick="toggleAuth()" style="color: var(--primary); font-weight: bold;">Registrar Barbería</a>
          </div>
        </div>
      </div>

      <div id="dashboard" style="display:none;">
        <nav class="navbar">
          <button class="menu-btn" onclick="toggleMenu()"><i class="fas fa-bars"></i></button>
          <span id="user-title">Mi Barbería</span>
          <div style="width: 22px;"></div>
        </nav>

        <div id="side-menu" class="mobile-menu">
          <div class="menu-header">BookBarber V2</div>
          <div class="nav-link" onclick="loadView('sucursales')"><i class="fas fa-map-marker-alt"></i> Sucursales</div>
          <div class="nav-link" onclick="loadView('equipo')"><i class="fas fa-users"></i> Equipo / Barberos</div>
          <div class="nav-link" onclick="loadView('horarios')"><i class="fas fa-clock"></i> Horarios de Atención</div>
          <div class="nav-link" onclick="loadView('servicios')"><i class="fas fa-cut"></i> Menú de Servicios</div>
          <div class="nav-link" onclick="loadView('turnos')"><i class="fas fa-calendar-check"></i> Turnos de Hoy</div>
          <div class="nav-link" onclick="loadView('metricas')"><i class="fas fa-chart-line"></i> Caja y Ranking</div>
          <div class="nav-link" onclick="loadView('links')"><i class="fas fa-link"></i> Enlaces de Reserva</div>
          
          <div style="padding: 20px;">
            <a id="link-mejora" href="#" target="_blank" style="color: #10b981; font-size: 13px; text-decoration: none; font-weight: bold;">
              <i class="fas fa-rocket"></i> Solicita una mejora
            </a>
          </div>
          <div class="footer-copy">MedinSur Dev © 2026<br><button onclick="location.reload()" style="color:red; background:none; border:none; margin-top:10px;">Cerrar Sesión</button></div>
        </div>

        <div class="container">
          <div class="status-card">
            <span style="font-size: 12px; font-weight: bold; color: var(--text-muted);">PLAN ACTUAL</span>
            <div style="font-size: 20px; font-weight: bold; margin: 8px 0;">30 Días de Prueba Gratis</div>
            <button id="btn-suscripcion" class="btn-pay">QUIERO SUSCRIBIRME ($15.000)</button>
          </div>
          <div id="content-area"></div>
        </div>
      </div>

      <script>
        let isLogin = true;
        const toggleMenu = () => document.getElementById('side-menu').classList.toggle('active');

        function toggleAuth() {
          isLogin = !isLogin;
          document.getElementById('inputs').innerHTML = isLogin ? 
            '<input id="email" type="email" placeholder="Email"><input id="pass" type="password" placeholder="Clave">' :
            '<input id="negocio" type="text" placeholder="Barbería"><input id="email" type="email" placeholder="Email"><input id="wa" type="tel" placeholder="WhatsApp"><input id="pass" type="password" placeholder="Clave">';
        }

        async function handleAuth() {
          const body = isLogin ? { email: email.value, password: pass.value } : 
                       { nombreNegocio: negocio.value, email: email.value, whatsapp: wa.value, password: pass.value };
          const res = await fetch(isLogin ? '/api/login' : '/api/registrar', {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)
          });
          const data = await res.json();
          if(data.token) {
            localStorage.setItem('token', data.token);
            document.getElementById('auth-screen').style.display = 'none';
            document.getElementById('dashboard').style.display = 'block';
            document.getElementById('user-title').innerText = data.nombre;
            
            // Configurar WhatsApps
            document.getElementById('link-mejora').href = \`https://wa.me/5493513009673?text=Hola MedinSur Dev! Soy el dueño de \${data.nombre} y solicito una mejora.\`;
            document.getElementById('btn-suscripcion').onclick = () => window.open(\`https://wa.me/5493515920795?text=Hola! Mi prueba finalizó en \${data.nombre} y quiero suscribirme.\`);
            
            loadView('sucursales');
          } else { alert(data.error); }
        }

        async function loadView(view) {
          if(document.getElementById('side-menu').classList.contains('active')) toggleMenu();
          const area = document.getElementById('content-area');
          const token = localStorage.getItem('token');

          if(view === 'sucursales') {
            const res = await fetch('/api/sucursales/' + token);
            const sucursales = await res.json();
            
            let html = \`<h2>📍 Mis Sucursales</h2>
                        <p style="font-size:13px; color:gray;">La primera es tu Sucursal Madre. Adicionales: $5.000 c/u.</p>
                        <div id="sucursal-lista">\`;
            
            sucursales.forEach(s => {
              html += \`<div class="sucursal-item"><b>\${s.nombre}</b><br><small>\${s.direccion}</small></div>\`;
            });

            html += \`</div><hr>
                     <h4>+ Agregar Sucursal</h4>
                     <input id="s-nombre" placeholder="Nombre (Ej: Central, Sucursal Norte)">
                     <input id="s-dir" placeholder="Dirección Completa">
                     <button class="btn-main" onclick="guardarSucursal()">Guardar Sucursal</button>\`;
            area.innerHTML = html;
          } else {
            area.innerHTML = '<h2>Próximamente</h2><p>Sección en desarrollo por MedinSur Dev.</p>';
          }
        }

        async function guardarSucursal() {
          const token = localStorage.getItem('token');
          const nombre = document.getElementById('s-nombre').value;
          const direccion = document.getElementById('s-dir').value;

          const res = await fetch('/api/sucursales', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ token, nombre, direccion })
          });
          if(res.ok) loadView('sucursales');
        }
      </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => console.log('🚀 BookBarber V2 Online'));
