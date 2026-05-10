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

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Base de Datos Conectada'))
  .catch(err => console.error('❌ Error DB:', err));

// --- MODELOS DE DATOS ---

const BarberoOwner = mongoose.model('BarberoOwner', new mongoose.Schema({
  nombreNegocio: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  whatsapp: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  planActivo: { type: Boolean, default: true },
  fechaRegistro: { type: Date, default: Date.now }
}));

const Sucursal = mongoose.model('Sucursal', new mongoose.Schema({
  ownerId: mongoose.Schema.Types.ObjectId,
  nombre: String,
  direccion: String,
  logo: String,
  fotoLocal: String
}));

const Empleado = mongoose.model('Empleado', new mongoose.Schema({
  sucursalId: mongoose.Schema.Types.ObjectId,
  nombre: String,
  foto: String,
  horarios: String // Ejemplo: "Lun-Vie 10-13 y 17-21"
}));

const Servicio = mongoose.model('Servicio', new mongoose.Schema({
  sucursalId: mongoose.Schema.Types.ObjectId,
  nombre: String,
  precio: Number,
  duracion: Number
}));

// --- RUTAS DE API ---

app.post('/api/registrar', async (req, res) => {
  try {
    const { nombreNegocio, email, whatsapp, password } = req.body;
    const salt = await bcrypt.genSalt(10);
    const passwordHashed = await bcrypt.hash(password, salt);
    const nuevo = new BarberoOwner({ nombreNegocio, email, whatsapp, password: passwordHashed });
    await nuevo.save();
    res.status(201).json({ mensaje: "✅ Registro exitoso." });
  } catch (error) {
    res.status(400).json({ error: "❌ Error: Datos duplicados o inválidos." });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await BarberoOwner.findOne({ email });
    if (!user) return res.status(400).json({ error: "Usuario no encontrado" });
    const esValida = await bcrypt.compare(password, user.password);
    if (!esValida) return res.status(400).json({ error: "Clave incorrecta" });
    const token = jwt.sign({ id: user._id, nombre: user.nombreNegocio }, SECRET_KEY, { expiresIn: '24h' });
    res.json({ token, nombre: user.nombreNegocio });
  } catch (error) {
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// --- INTERFAZ COMPLETA (FRONTEND) ---

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>BookBarber V2 - MedinSur Dev</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; margin: 0; background: #f4f7f6; display: flex; flex-direction: column; height: 100vh; }
        
        /* Login Styles */
        .auth-card { background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); width: 100%; max-width: 350px; margin: auto; text-align: center; }
        input { width: 100%; padding: 12px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 8px; }
        button { width: 100%; padding: 12px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.3s; }
        .btn-blue { background: #007bff; color: white; }
        
        /* Dashboard Styles */
        #dashboard { display: none; height: 100vh; width: 100%; }
        .sidebar { width: 260px; background: #121212; color: #fff; display: flex; flex-direction: column; }
        .nav-item { padding: 15px 25px; cursor: pointer; border-bottom: 1px solid #1f1f1f; font-size: 14px; }
        .nav-item:hover { background: #1f1f1f; color: #007bff; }
        .main-content { flex: 1; padding: 30px; overflow-y: auto; }
        .top-banner { background: #fff; padding: 20px; border-radius: 12px; border-left: 6px solid #ff4757; margin-bottom: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
        .wa-dev { background: #25d366; color: white; padding: 10px; text-decoration: none; border-radius: 8px; font-size: 12px; display: inline-block; margin-top: 10px; }
      </style>
    </head>
    <body>

      <div id="auth-screen" style="display: flex; height: 100%;">
        <div class="auth-card">
          <h2 id="auth-title">Iniciar Sesión</h2>
          <div id="auth-inputs">
            <input id="email" type="email" placeholder="Correo electrónico">
            <input id="pass" type="password" placeholder="Contraseña">
          </div>
          <button class="btn-blue" onclick="handleAuth()">Entrar al Panel</button>
          <p id="msg" style="font-size: 12px; margin-top: 10px;"></p>
          <div id="auth-toggle" style="margin-top: 20px; font-size: 13px;">
            ¿No tienes cuenta? <a href="#" onclick="toggleMode()">Regístrate aquí</a>
          </div>
        </div>
      </div>

      <div id="dashboard">
        <div class="sidebar">
          <div style="padding: 25px; font-weight: bold; font-size: 18px; color: #007bff;">BOOKBARBER V2</div>
          <div class="nav-item" onclick="loadView('sucursales')">📍 Sucursales</div>
          <div class="nav-item" onclick="loadView('equipo')">👥 Barberos</div>
          <div class="nav-item" onclick="loadView('horarios')">🕒 Horarios</div>
          <div class="nav-item" onclick="loadView('servicios')">✂️ Servicios</div>
          <div class="nav-item" onclick="loadView('turnos')">📅 Turnos del Día</div>
          <div class="nav-item" onclick="loadView('metricas')">📈 Métricas y Caja</div>
          <div class="nav-item" onclick="loadView('links')">🔗 Links de Reserva</div>
          
          <div style="margin-top: auto; padding: 20px;">
            <a href="https://wa.me/5493513009673" class="wa-dev">Solicitar mejora al desarrollador</a>
            <button onclick="location.reload()" style="margin-top: 10px; background: #333; color: white; font-size: 12px;">Cerrar Sesión</button>
          </div>
        </div>

        <div class="main-content">
          <div class="top-banner">
            <strong>Prueba gratuita: 30 días activados</strong> | Suscripción mensual: $15.000<br>
            <a href="https://wa.me/5493515920795" style="color: #ff4757; font-weight: bold; text-decoration: none;">PAGAR SUSCRIPCIÓN AQUÍ</a>
          </div>
          <div id="view-container">
            <h1>Bienvenido a tu Panel de Gestión</h1>
            <p>Selecciona una opción a la izquierda para empezar.</p>
          </div>
        </div>
      </div>

      <script>
        let isLogin = true;
        const msg = document.getElementById('msg');

        function toggleMode() {
          isLogin = !isLogin;
          document.getElementById('auth-title').innerText = isLogin ? "Iniciar Sesión" : "Crear Cuenta";
          document.getElementById('auth-toggle').innerHTML = isLogin ? 
            '¿No tienes cuenta? <a href="#" onclick="toggleMode()">Regístrate aquí</a>' :
            '¿Ya tienes cuenta? <a href="#" onclick="toggleMode()">Inicia sesión</a>';
          
          if (!isLogin) {
            document.getElementById('auth-inputs').innerHTML += \`
              <input id="negocio" type="text" placeholder="Nombre de la Barbería">
              <input id="wa" type="tel" placeholder="WhatsApp (Ej: 549...)">
            \`;
          } else {
            document.getElementById('auth-inputs').innerHTML = \`
              <input id="email" type="email" placeholder="Correo electrónico">
              <input id="pass" type="password" placeholder="Contraseña">
            \`;
          }
        }

        async function handleAuth() {
          const email = document.getElementById('email').value;
          const password = document.getElementById('pass').value;
          const endpoint = isLogin ? '/api/login' : '/api/registrar';
          
          const body = isLogin ? { email, password } : {
            email, password,
            nombreNegocio: document.getElementById('negocio').value,
            whatsapp: document.getElementById('wa').value
          };

          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body)
          });

          const data = await res.json();
          if (data.token) {
            localStorage.setItem('token', data.token);
            document.getElementById('auth-screen').style.display = 'none';
            document.getElementById('dashboard').style.display = 'flex';
          }
          msg.innerText = data.mensaje || data.error || "";
          msg.style.color = data.error ? "red" : "green";
        }

        function loadView(view) {
          const container = document.getElementById('view-container');
          const views = {
            'sucursales': '<h2>Mis Sucursales</h2><p>Agregar una nueva sucursal tiene un costo de <b>$5.000</b> adicionales.</p><button class="btn-blue">+ Agregar Sucursal</button>',
            'equipo': '<h2>Equipo de Barberos</h2><p>Aquí verás la lista de barberos por sucursal y sus fotos.</p>',
            'horarios': '<h2>Gestión de Horarios</h2><p>Configura el margen de turnos. Ej: 10hs a 13hs.</p>',
            'metricas': '<h2>Métricas y Caja</h2><p>Ranking de barberos y recaudación diaria/mensual.</p>',
            'links': '<h2>Links de Reservas</h2><p>Copia el link de cada sucursal para tus clientes.</p>'
          };
          container.innerHTML = views[view] || '<h2>Próximamente</h2><p>Estamos trabajando en esta sección.</p>';
        }
      </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => console.log('🚀 Dashboard BookBarber Corriendo'));
