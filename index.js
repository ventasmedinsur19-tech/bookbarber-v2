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

// --- MODELOS DE DATOS ---
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
    
    res.json({ ok: true });
  } catch (e) {
    res.json({ error: "Error interno al registrar." });
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
  } catch (error) { res.json({ error: "Error al guardar." }); }
});

// --- FRONTEND COMPLETO CON DISEÑO PRO ---
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>BookBarber V2 - Panel</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
      <style>
        :root { --primary: #2563eb; --dark: #0f172a; --bg: #f8fafc; --text-muted: #64748b; }
        body { font-family: 'Segoe UI', Roboto, sans-serif; margin: 0; background: var(--bg); display: flex; flex-direction: column; min-height: 100vh; overflow-x: hidden; }
        
        /* Auth Screen */
        .auth-screen { flex: 1; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .auth-card { background: white; padding: 40px 30px; border-radius: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); width: 100%; max-width: 380px; text-align: center; }
        h2 { margin-bottom: 8px; color: var(--dark); font-size: 24px; }
        input { width: 100%; padding: 14px; margin-bottom: 12px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 16px; box-sizing: border-box; }
        .btn-primary { background: var(--dark); color: white; border: none; width: 100%; padding: 15px; border-radius: 12px; font-weight: bold; cursor: pointer; font-size: 16px; transition: 0.3s; }
        .btn-primary:active { transform: scale(0.98); }
        
        /* Dashboard Navbar & Sidebar */
        .navbar { background: var(--dark); color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 100; }
        .sidebar { position: fixed; top: 0; left: -100%; width: 280px; height: 100%; background: white; z-index: 1000; transition: left 0.3s ease; box-shadow: 10px 0 30px rgba(0,0,0,0.15); display: flex; flex-direction: column; }
        .sidebar.active { left: 0; }
        
        .sidebar-header { padding: 25px 20px; background: var(--dark); color: white; font-weight: 800; display: flex; justify-content: space-between; align-items: center; font-size: 18px; }
        .nav-items-container { flex: 1; overflow-y: auto; padding-top: 10px; }
        .nav-item { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; color: var(--dark); text-decoration: none; font-weight: 500; cursor: pointer; }
        .nav-item:hover { background: #f8fafc; color: var(--primary); }
        .nav-item i { margin-right: 15px; color: var(--primary); width: 20px; text-align: center; font-size: 18px; }
        
        /* Dashboard Content */
        .dashboard-container { padding: 20px; max-width: 800px; margin: auto; width: 100%; box-sizing: border-box; }
        .plan-card { background: white; border-radius: 20px; padding: 20px; border-left: 6px solid #ef4444; margin-bottom: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        .sucursal-card { background: white; padding: 20px; border-radius: 16px; margin-bottom: 15px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        
        /* Footer Menu */
        .menu-footer { padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; background: #f8fafc; }
        .btn-wa-dev { display: flex; align-items: center; justify-content: center; gap: 8px; color: #10b981; font-weight: bold; text-decoration: none; font-size: 14px; margin-bottom: 15px; }
        .btn-logout { background: white; border: 1px solid #ef4444; color: #ef4444; padding: 10px; width: 100%; border-radius: 8px; font-weight: bold; cursor: pointer; }
      </style>
    </head>
    <body>

      <div id="auth-ui" class="auth-screen">
        <div class="auth-card">
          <h2 id="t-p">BookBarber V2</h2>
          <p style="color: var(--text-muted); margin-bottom: 25px; font-size: 14px;">Gestión profesional para Barberías</p>
          
          <div id="auth-fields">
            <input id="log-email" type="email" placeholder="Email institucional">
            <input id="log-pass" type="password" placeholder="Contraseña">
          </div>
          
          <button class="btn-primary" onclick="procesarAuth()" id="btn-t">Entrar al Panel</button>
          
          <p style="font-size: 14px; margin-top: 25px;">
            <span id="f-t">¿No tienes cuenta?</span> 
            <a href="javascript:toggleV()" id="l-t" style="color:var(--primary); font-weight:700; text-decoration:none;">Registrar Barbería</a>
          </p>
        </div>
      </div>

      <div id="dash-ui" style="display:none;">
        <div class="navbar">
          <i class="fas fa-bars" onclick="openMenu()" style="font-size:22px; cursor:pointer;"></i>
          <span id="header-name" style="font-weight:700; font-size:18px;">Cargando...</span>
          <div style="width:22px;"></div>
        </div>

        <div id="menu" class="sidebar">
          <div class="sidebar-header">
            <span>BOOKBARBER V2</span>
            <i class="fas fa-times" onclick="openMenu()" style="cursor:pointer;"></i>
          </div>
          
          <div class="nav-items-container">
            <div class="nav-item" onclick="load('sucursales')"><i class="fas fa-store"></i> Mis Sucursales</div>
            <div class="nav-item" onclick="load('equipo')"><i class="fas fa-users"></i> Equipo / Barberos</div>
            <div class="nav-item" onclick="load('horarios')"><i class="fas fa-clock"></i> Horarios de Atención</div>
            <div class="nav-item" onclick="load('servicios')"><i class="fas fa-cut"></i> Menú de Servicios</div>
            <div class="nav-item" onclick="load('turnos')"><i class="fas fa-calendar-check"></i> Turnos de Hoy</div>
            <div class="nav-item" onclick="load('metricas')"><i class="fas fa-wallet"></i> Caja y Ranking</div>
            <div class="nav-item" onclick="load('links')"><i class="fas fa-link"></i> Enlaces de Reserva</div>
          </div>

          <div class="menu-footer">
            <a id="wa-dev" href="#" target="_blank" class="btn-wa-dev">
              <i class="fab fa-whatsapp" style="font-size:18px;"></i> Solicita una mejora
            </a>
            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 15px;">MedinSur Dev © 2026</div>
            <button class="btn-logout" onclick="cerrarSesion()">Cerrar Sesión</button>
          </div>
        </div>

        <div class="dashboard-container">
          <div class="plan-card">
            <small style="font-weight:800; color:var(--text-muted);">ESTADO DEL SISTEMA</small>
            <h3 style="margin:5px 0 10px 0;">30 Días de Prueba Gratis</h3>
            <button id="wa-pay" class="btn-primary" style="background:#ef4444; border-radius:8px; padding:12px;">Activar Suscripción ($15.000)</button>
          </div>
          
          <div id="view-content"></div>
        </div>
      </div>

      <script>
        let mode = 'login';
        const openMenu = () => document.getElementById('menu').classList.toggle('active');

        // Autologin si ya hay token
        window.onload = () => {
          const tk = localStorage.getItem('token');
          const nom = localStorage.getItem('nombreNegocio');
          if(tk && nom) { renderDash(tk, nom); }
        };

        function toggleV() {
          mode = (mode === 'login') ? 'reg' : 'login';
          const fields = document.getElementById('auth-fields');
          if(mode === 'reg') {
            fields.innerHTML = \`<input id="r-n" type="text" placeholder="Nombre de la Barbería"><input id="r-e" type="email" placeholder="Email institucional"><input id="r-w" type="tel" placeholder="WhatsApp Dueño (549...)"><input id="r-p" type="password" placeholder="Contraseña">\`;
            document.getElementById('btn-t').innerText = "Finalizar Registro";
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
            alert("✅ Registro exitoso. Ahora por favor Inicia Sesión.");
            location.reload();
          } else { 
            alert("❌ " + data.error); 
          }
        }

        function renderDash(tk, nom) {
          document.getElementById('auth-ui').style.display = 'none';
          document.getElementById('dash-ui').style.display = 'block';
          
          // Actualizar nombres en la UI
          document.getElementById('header-name').innerText = nom;
          
          // Configurar WhatsApps con texto dinámico
          const msgDev = encodeURIComponent(\`Hola MedinSur Dev! Soy el dueño de \${nom} y me gustaría solicitar una mejora o actualización del sistema.\`);
          document.getElementById('wa-dev').href = \`https://wa.me/5493513009673?text=\${msgDev}\`;
          
          const msgPago = encodeURIComponent(\`Hola! Mi prueba gratuita de 30 días en BookBarber finalizó y quiero suscribirme al plan mensual de $15.000 para \${nom}.\`);
          document.getElementById('wa-pay').onclick = () => window.open(\`https://wa.me/5493515920795?text=\${msgPago}\`);

          load('sucursales'); // Cargar primera vista
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
            
            let h = '<h2 style="margin-bottom:20px; color:var(--dark);">📍 Mis Sucursales</h2>';
            if(list.length === 0) {
               h += '<p style="color:var(--text-muted); background:white; padding:15px; border-radius:10px; text-align:center;">No tienes sucursales registradas aún.</p>';
            }
            
            list.forEach(s => {
               h += \`<div class="sucursal-card">
                       <h3 style="margin:0 0 5px 0; color:var(--dark);">\${s.nombre}</h3>
                       <p style="margin:0; color:var(--text-muted); font-size:14px;"><i class="fas fa-map-marker-alt"></i> \${s.direccion}</p>
                     </div>\`;
            });
            
            h += \`
              <hr style="border:0; border-top:1px solid #e2e8f0; margin:25px 0;">
              <h3 style="color:var(--dark);">+ Agregar Nueva Sucursal</h3>
              <p style="font-size:13px; color:#ef4444; margin-top:-10px; margin-bottom:15px;">Recuerda: Cada sucursal adicional tiene un costo de $5.000 extra.</p>
              <input id="sn" placeholder="Nombre (Ej: Sucursal Centro)">
              <input id="sd" placeholder="Dirección Completa">
              <button class="btn-primary" onclick="saveS()">Guardar Sucursal</button>
            \`;
            content.innerHTML = h;
          } 
          else if(v === 'equipo') { content.innerHTML = '<h2>👥 Equipo / Barberos</h2><p style="color:var(--text-muted);">Aquí podrás cargar la foto y nombre de cada barbero por sucursal. En desarrollo.</p>'; }
          else if(v === 'horarios') { content.innerHTML = '<h2>🕒 Horarios de Atención</h2><p style="color:var(--text-muted);">Configura turnos cortados (Ej: 10hs a 13hs y 17hs a 21hs). En desarrollo.</p>'; }
          else if(v === 'metricas') { content.innerHTML = '<h2><i class="fas fa-wallet"></i> Caja y Ranking</h2><p style="color:var(--text-muted);">Visualiza lo recaudado en el día y el ranking de barberos (solo se contabilizan turnos). En desarrollo.</p>'; }
          else { content.innerHTML = '<h3 style="color:var(--dark);">🚧 Sección en construcción</h3><p style="color:var(--text-muted);">MedinSur Dev está trabajando en esta función.</p>'; }
        }

        async function saveS() {
          const sn = document.getElementById('sn').value;
          const sd = document.getElementById('sd').value;
          if(!sn || !sd) return alert('Por favor, completa el nombre y la dirección.');
          
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

app.listen(PORT, () => console.log('🚀 BookBarber V2 Full Online en puerto ' + PORT));
