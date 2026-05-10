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

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ DB Conectada'))
  .catch(err => console.error('❌ Error DB:', err));

// --- MODELOS ---
const BarberoOwner = mongoose.model('BarberoOwner', new mongoose.Schema({
  nombreNegocio: String, email: String, whatsapp: String, password: String, planActivo: { type: Boolean, default: true }
}));

// --- API ---
app.post('/api/registrar', async (req, res) => {
  try {
    const { nombreNegocio, email, whatsapp, password } = req.body;
    const passwordHashed = await bcrypt.hash(password, 10);
    const nuevo = new BarberoOwner({ nombreNegocio, email, whatsapp, password: passwordHashed });
    await nuevo.save();
    res.status(201).json({ mensaje: "✅ Registro exitoso." });
  } catch (error) { res.status(400).json({ error: "❌ Error en registro." }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await BarberoOwner.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(400).json({ error: "Credenciales inválidas" });
    const token = jwt.sign({ id: user._id, nombre: user.nombreNegocio }, SECRET_KEY, { expiresIn: '24h' });
    res.json({ token, nombre: user.nombreNegocio });
  } catch (error) { res.status(500).json({ error: "Error de servidor" }); }
});

// --- INTERFAZ RECREADA (SIN MENÚ INVASIVO) ---
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>BookBarber Pro</title>
      <style>
        :root { --primary: #2563eb; --dark: #0f172a; --bg: #f8fafc; }
        body { font-family: 'Inter', sans-serif; margin: 0; background: var(--bg); color: var(--dark); }
        
        /* Navbar Superior */
        .navbar { background: var(--dark); color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 100; }
        .menu-btn { font-size: 24px; cursor: pointer; background: none; border: none; color: white; }
        
        /* Menú Desplegable (Hidden by default) */
        .mobile-menu { position: fixed; top: 60px; left: -100%; width: 80%; height: 100%; background: white; box-shadow: 10px 0 20px rgba(0,0,0,0.1); transition: 0.4s; z-index: 99; padding: 20px; }
        .mobile-menu.active { left: 0; }
        .nav-link { display: block; padding: 15px; color: var(--dark); text-decoration: none; border-bottom: 1px solid #f1f5f9; font-weight: 500; }

        /* Contenido */
        .container { padding: 20px; max-width: 800px; margin: auto; }
        .status-card { background: #fff; border-radius: 12px; padding: 20px; border-top: 4px solid #ef4444; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .btn-pay { background: #ef4444; color: white; border: none; padding: 10px 15px; border-radius: 6px; font-weight: bold; width: 100%; margin-top: 10px; cursor: pointer; }
        
        /* Auth Screen */
        .auth-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: var(--bg); z-index: 200; display: flex; justify-content: center; align-items: center; padding: 20px; }
        .auth-box { background: white; padding: 30px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); width: 100%; max-width: 380px; text-align: center; }
        input { width: 100%; padding: 12px; margin-bottom: 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 16px; }
        .btn-main { background: var(--primary); color: white; border: none; width: 100%; padding: 14px; border-radius: 8px; font-weight: bold; cursor: pointer; }
      </style>
    </head>
    <body>

      <div id="auth-screen" class="auth-overlay">
        <div class="auth-box">
          <h2 style="margin-bottom: 5px;">BookBarber V2</h2>
          <p style="color: #64748b; font-size: 14px; margin-bottom: 25px;">Gestión profesional para tu salón</p>
          <div id="inputs">
            <input id="email" type="email" placeholder="Email">
            <input id="pass" type="password" placeholder="Contraseña">
          </div>
          <button class="btn-main" onclick="handleAuth()">Ingresar al Sistema</button>
          <p id="msg" style="margin-top: 15px; font-size: 13px;"></p>
          <div style="margin-top: 20px; font-size: 14px; color: #64748b;">
             ¿Nuevo barbero? <a href="#" onclick="toggleAuth()" style="color: var(--primary); font-weight: 600;">Regístrate gratis</a>
          </div>
        </div>
      </div>

      <div id="dashboard" style="display:none;">
        <nav class="navbar">
          <button class="menu-btn" onclick="toggleMenu()">☰</button>
          <span id="user-title" style="font-weight: bold;">Panel Control</span>
          <div style="width: 24px;"></div>
        </nav>

        <div id="side-menu" class="mobile-menu">
          <a href="#" class="nav-link" onclick="loadView('sucursales')">📍 Sucursales</a>
          <a href="#" class="nav-link" onclick="loadView('equipo')">👥 Equipo / Barberos</a>
          <a href="#" class="nav-link" onclick="loadView('horarios')">🕒 Horarios de Atención</a>
          <a href="#" class="nav-link" onclick="loadView('servicios')">✂️ Menú de Servicios</a>
          <a href="#" class="nav-link" onclick="loadView('turnos')">📅 Turnos de Hoy</a>
          <a href="#" class="nav-link" onclick="loadView('metricas')">📊 Reportes y Caja</a>
          <a href="#" class="nav-link" onclick="loadView('links')">🔗 Enlaces de Reserva</a>
          <br>
          <a href="https://wa.me/5493513009673" style="color: #25d366; text-decoration: none; font-size: 14px;">💬 Soporte MedinSur Dev</a>
          <br><br>
          <button onclick="location.reload()" style="background: #f1f5f9; border: none; padding: 10px; width: 100%; border-radius: 8px;">Cerrar Sesión</button>
        </div>

        <div class="container">
          <div class="status-card">
            <span style="font-size: 14px; color: #64748b;">ESTADO DEL PLAN</span>
            <div style="font-size: 18px; font-weight: bold; margin: 5px 0;">30 Días de Prueba Gratis</div>
            <button class="btn-pay" onclick="window.open('https://wa.me/5493515920795')">Activar Suscripción ($15.000)</button>
          </div>

          <div id="content-area">
             <h3>Hola! Listo para empezar?</h3>
             <p style="color: #64748b;">Toca el menú (☰) para configurar tu primera sucursal.</p>
          </div>
        </div>
      </div>

      <script>
        let isLogin = true;
        function toggleMenu() { document.getElementById('side-menu').classList.toggle('active'); }
        function toggleAuth() {
          isLogin = !isLogin;
          const inputs = document.getElementById('inputs');
          inputs.innerHTML = isLogin ? 
            '<input id="email" type="email" placeholder="Email"><input id="pass" type="password" placeholder="Contraseña">' :
            '<input id="negocio" type="text" placeholder="Nombre Barbería"><input id="email" type="email" placeholder="Email"><input id="wa" type="tel" placeholder="WhatsApp"><input id="pass" type="password" placeholder="Contraseña">';
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
          } else { msg.innerText = data.error; msg.style.color = "red"; }
        }

        function loadView(view) {
          toggleMenu();
          const area = document.getElementById('content-area');
          const content = {
            'sucursales': '<h2>📍 Sucursales</h2><p>Agrega tus locales. Cada sucursal extra cuesta $5.000 adicionales.</p><button class="btn-main">+ Nueva Sucursal</button>',
            'metricas': '<h2>📊 Métricas</h2><div style="background:#fff; padding:20px; border-radius:8px; border:1px solid #e2e8f0;">Recaudación de hoy: $0.00</div>'
          };
          area.innerHTML = content[view] || '<h2>Próximamente</h2><p>Estamos desarrollando esta función.</p>';
        }
      </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => console.log('🚀 Sistema Online'));
