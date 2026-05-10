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

// Conexión a MongoDB con reintento
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Base de Datos Conectada'))
  .catch(err => console.error('❌ Error de conexión:', err));

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

// --- API ---

// Registro Corregido: Ahora verifica si el correo existe antes de intentar guardar
app.post('/api/registrar', async (req, res) => {
  try {
    const { nombreNegocio, email, whatsapp, password } = req.body;
    
    const existe = await BarberoOwner.findOne({ email: email.toLowerCase() });
    if (existe) {
      return res.status(400).json({ error: "Este correo ya está registrado." });
    }

    const passwordHashed = await bcrypt.hash(password, 10);
    const nuevo = new BarberoOwner({ 
      nombreNegocio, 
      email: email.toLowerCase(), 
      whatsapp, 
      password: passwordHashed 
    });
    
    await nuevo.save();
    res.status(201).json({ mensaje: "✅ Registro exitoso. Ahora puedes iniciar sesión." });
  } catch (error) {
    res.status(500).json({ error: "Error interno al registrar." });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await BarberoOwner.findOne({ email: email.toLowerCase() });
    
    if (!user) return res.status(400).json({ error: "El usuario no existe." });
    
    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(400).json({ error: "Contraseña incorrecta." });

    const token = jwt.sign({ id: user._id, nombre: user.nombreNegocio }, SECRET_KEY, { expiresIn: '24h' });
    res.json({ token, nombre: user.nombreNegocio });
  } catch (error) {
    res.status(500).json({ error: "Error en el servidor." });
  }
});

// Obtener Sucursales
app.get('/api/sucursales/:token', async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, SECRET_KEY);
    const lista = await Sucursal.find({ ownerId: decoded.id });
    res.json(lista);
  } catch (error) { res.status(401).json({ error: "Sesión no válida" }); }
});

app.post('/api/sucursales', async (req, res) => {
  try {
    const { token, nombre, direccion } = req.body;
    const decoded = jwt.verify(token, SECRET_KEY);
    const nueva = new Sucursal({ ownerId: decoded.id, nombre, direccion });
    await nueva.save();
    res.json({ mensaje: "Sucursal agregada" });
  } catch (error) { res.status(401).json({ error: "Error de permisos" }); }
});

// --- INTERFAZ ---
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
        :root { --primary: #2563eb; --dark: #1e293b; --bg: #f1f5f9; }
        body { font-family: 'Inter', sans-serif; margin: 0; background: var(--bg); color: var(--dark); }
        
        /* Centralización del Auth */
        .auth-container { 
          display: flex; justify-content: center; align-items: center; 
          min-height: 100vh; padding: 20px; box-sizing: border-box;
        }
        .auth-box { 
          background: white; padding: 40px; border-radius: 24px; 
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); 
          width: 100%; max-width: 400px; text-align: center;
        }
        
        input { 
          width: 100%; padding: 14px; margin-bottom: 15px; 
          border: 1px solid #e2e8f0; border-radius: 12px; 
          font-size: 16px; box-sizing: border-box;
        }
        
        .btn-main { 
          background: var(--dark); color: white; border: none; 
          width: 100%; padding: 16px; border-radius: 12px; 
          font-weight: 700; cursor: pointer; transition: 0.3s;
        }
        .btn-main:hover { opacity: 0.9; transform: translateY(-1px); }

        /* Dashboard */
        .navbar { 
          background: white; padding: 15px 20px; display: flex; 
          justify-content: space-between; align-items: center; 
          border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; 
        }
        .mobile-menu { 
          position: fixed; top: 0; left: -100%; width: 280px; height: 100%; 
          background: white; z-index: 200; transition: 0.3s; 
          box-shadow: 15px 0 30px rgba(0,0,0,0.05); 
        }
        .mobile-menu.active { left: 0; }
        .nav-link { 
          display: flex; align-items: center; padding: 16px 24px; 
          color: var(--dark); text-decoration: none; font-weight: 500;
          border-bottom: 1px solid #f8fafc;
        }
        .nav-link i { margin-right: 15px; color: var(--primary); }

        .card { 
          background: white; border-radius: 16px; padding: 20px; 
          margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }
        .footer { 
          text-align: center; font-size: 12px; color: #94a3b8; 
          padding: 20px; border-top: 1px solid #f1f5f9; margin-top: auto;
        }
      </style>
    </head>
    <body>

      <div id="auth-screen" class="auth-container">
        <div class="auth-box">
          <h2 id="auth-title">BookBarber V2</h2>
          <p id="auth-subtitle" style="color:#64748b; font-size:14px; margin-bottom:30px;">Inicia sesión para gestionar tu salón</p>
          
          <div id="inputs-container">
            <input id="email" type="email" placeholder="Correo electrónico">
            <input id="pass" type="password" placeholder="Contraseña">
          </div>

          <button class="btn-main" onclick="ejecutarAuth()" id="btn-auth">Entrar al Panel</button>
          
          <p style="margin-top: 25px; font-size: 14px;">
            <span id="auth-footer-text">¿No tienes cuenta?</span> 
            <a href="javascript:void(0)" onclick="alternarVista()" id="auth-link" style="color: var(--primary); font-weight:700; text-decoration:none;">Registrarme</a>
          </p>
        </div>
      </div>

      <div id="dashboard" style="display:none;">
        <nav class="navbar">
          <button onclick="toggleMenu()" style="background:none; border:none; font-size:20px; cursor:pointer;"><i class="fas fa-bars"></i></button>
          <span id="header-nombre" style="font-weight:700;">Panel de Control</span>
          <div style="width:20px;"></div>
        </nav>

        <div id="side-menu" class="mobile-menu">
          <div style="padding:30px 24px; font-weight:800; font-size:20px; border-bottom:1px solid #f1f5f9;">BookBarber</div>
          <div class="nav-link" onclick="cargarVista('sucursales')"><i class="fas fa-store"></i> Sucursales</div>
          <div class="nav-link" onclick="cargarVista('equipo')"><i class="fas fa-user-friends"></i> Equipo / Barberos</div>
          <div class="nav-link" onclick="cargarVista('turnos')"><i class="fas fa-calendar-alt"></i> Turnos de Hoy</div>
          <div class="nav-link" onclick="cargarVista('caja')"><i class="fas fa-wallet"></i> Caja y Ranking</div>
          
          <div style="padding:24px;">
            <a id="wa-mejora" href="#" target="_blank" style="color:#10b981; text-decoration:none; font-size:14px; font-weight:700;">
              <i class="fas fa-rocket"></i> Solicita una mejora
            </a>
          </div>

          <div class="footer">
            MedinSur Dev © 2026<br>
            <a href="javascript:location.reload()" style="color:#ef4444; text-decoration:none; display:block; margin-top:10px;">Cerrar Sesión</a>
          </div>
        </div>

        <div style="padding:20px; max-width:600px; margin:auto;">
          <div class="card" style="border-left: 5px solid #ef4444;">
            <small style="color:#64748b; font-weight:700;">ESTADO DEL PLAN</small>
            <h3 style="margin: 5px 0;">30 Días de Prueba Gratis</h3>
            <button id="wa-pago" class="btn-main" style="background:#ef4444; padding:10px; margin-top:10px;">Suscribirme ($15.000)</button>
          </div>

          <div id="main-content"></div>
        </div>
      </div>

      <script>
        let esLogin = true;

        function alternarVista() {
          esLogin = !esLogin;
          const container = document.getElementById('inputs-container');
          const title = document.getElementById('auth-title');
          const subtitle = document.getElementById('auth-subtitle');
          const btn = document.getElementById('btn-auth');
          const footerText = document.getElementById('auth-footer-text');
          const link = document.getElementById('auth-link');

          if(!esLogin) {
            title.innerText = "Crear Cuenta";
            subtitle.innerText = "Registra tu barbería y empieza hoy";
            container.innerHTML = \`
              <input id="reg-negocio" type="text" placeholder="Nombre de la Barbería">
              <input id="reg-email" type="email" placeholder="Correo electrónico">
              <input id="reg-wa" type="tel" placeholder="WhatsApp (Ej: 549351...)">
              <input id="reg-pass" type="password" placeholder="Crea una contraseña">
            \`;
            btn.innerText = "Finalizar Registro";
            footerText.innerText = "¿Ya tienes cuenta?";
            link.innerText = "Inicia Sesión";
          } else {
            location.reload();
          }
        }

        async function ejecutarAuth() {
          const body = esLogin ? 
            { email: email.value, password: pass.value } :
            { nombreNegocio: document.getElementById('reg-negocio').value, 
              email: document.getElementById('reg-email').value, 
              whatsapp: document.getElementById('reg-wa').value, 
              password: document.getElementById('reg-pass').value };

          const ruta = esLogin ? '/api/login' : '/api/registrar';
          
          try {
            const res = await fetch(ruta, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(body)
            });
            const data = await res.json();

            if (data.token) {
              localStorage.setItem('token', data.token);
              localStorage.setItem('nombre', data.nombre);
              entrarAlSistema(data.token, data.nombre);
            } else {
              alert(data.error || "Error desconocido");
            }
          } catch (e) { alert("Error de conexión"); }
        }

        function entrarAlSistema(token, nombre) {
          document.getElementById('auth-screen').style.display = 'none';
          document.getElementById('dashboard').style.display = 'block';
          document.getElementById('header-nombre').innerText = nombre;
          
          document.getElementById('wa-mejora').href = \`https://wa.me/5493513009673?text=Hola MedinSur Dev! Soy dueño de \${nombre} y quiero una mejora.\`;
          document.getElementById('wa-pago').onclick = () => window.open(\`https://wa.me/5493515920795?text=Hola! Mi prueba en \${nombre} terminó y quiero pagar.\`);
          
          cargarVista('sucursales');
        }

        function toggleMenu() { document.getElementById('side-menu').classList.toggle('active'); }

        async function cargarVista(vista) {
          toggleMenu();
          const content = document.getElementById('main-content');
          const token = localStorage.getItem('token');

          if(vista === 'sucursales') {
            const res = await fetch('/api/sucursales/' + token);
            const sucursales = await res.json();
            let html = \`<h2>📍 Mis Sucursales</h2>\`;
            sucursales.forEach(s => {
              html += \`<div class="card"><b>\${s.nombre}</b><br><small>\${s.direccion}</small></div>\`;
            });
            html += \`
              <hr style="border:0; border-top:1px solid #e2e8f0; margin:20px 0;">
              <h4>Agregar Nueva</h4>
              <input id="new-n" placeholder="Nombre (Ej: Sucursal Centro)">
              <input id="new-d" placeholder="Dirección">
              <button class="btn-main" onclick="guardarS()">Guardar Sucursal</button>
            \`;
            content.innerHTML = html;
          } else {
            content.innerHTML = "<h2>Próximamente</h2><p>Estamos trabajando en esta sección.</p>";
          }
        }

        async function guardarS() {
          const body = {
            token: localStorage.getItem('token'),
            nombre: document.getElementById('new-n').value,
            direccion: document.getElementById('new-d').value
          };
          await fetch('/api/sucursales', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body)
          });
          cargarVista('sucursales');
        }
      </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => console.log('🚀 BookBarber V2 Online'));
