const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Conexión a MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Sistema Online y Seguro'))
  .catch(err => console.error('❌ Error de conexión:', err));

// Esquema de datos para el Barbero
const BarberoSchema = new mongoose.Schema({
  nombreNegocio: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  whatsapp: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  fechaRegistro: { type: Date, default: Date.now }
});

const Barbero = mongoose.model('Barbero', BarberoSchema);

// --- RUTAS DE LA API ---

// 1. Registro de nuevo barbero (con encriptación)
app.post('/api/registrar', async (req, res) => {
  try {
    const { nombreNegocio, email, whatsapp, password } = req.body;
    
    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHashed = await bcrypt.hash(password, salt);

    const nuevo = new Barbero({
      nombreNegocio,
      email,
      whatsapp,
      password: passwordHashed
    });

    await nuevo.save();
    res.status(201).json({ mensaje: "✅ Registro exitoso. Ya puedes iniciar sesión." });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: "❌ El email o WhatsApp ya existen." });
    } else {
      res.status(400).json({ error: "❌ Error en el registro." });
    }
  }
});

// 2. Login de barbero (con validación de seguridad)
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const barbero = await Barbero.findOne({ email });
    
    if (!barbero) return res.status(400).json({ error: "Usuario no encontrado" });

    const esValida = await bcrypt.compare(password, barbero.password);
    if (!esValida) return res.status(400).json({ error: "Contraseña incorrecta" });

    // Generar Token de sesión (24 horas)
    const token = jwt.sign({ id: barbero._id }, 'SECRETO_TECNICO_V2', { expiresIn: '24h' });
    
    res.json({ 
      mensaje: "¡Bienvenido!", 
      token, 
      nombre: barbero.nombreNegocio 
    });
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// --- INTERFAZ VISUAL (HTML Dinámico) ---
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>BookBarber V2 - Acceso</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .card { background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); width: 100%; max-width: 350px; text-align: center; }
        h2 { color: #333; margin-bottom: 30px; }
        input { width: 100%; padding: 12px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 10px; box-sizing: border-box; font-size: 16px; }
        button { width: 100%; padding: 12px; border: none; border-radius: 10px; font-size: 16px; font-weight: bold; cursor: pointer; transition: 0.3s; }
        .btn-login { background-color: #007bff; color: white; }
        .btn-register { background-color: #28a745; color: white; }
        .link { margin-top: 20px; font-size: 14px; color: #666; }
        .link a { color: #007bff; text-decoration: none; font-weight: bold; }
        #mensaje { margin-top: 20px; font-weight: bold; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>BookBarber V2</h2>
        <div id="auth-container">
          <div id="login-view">
            <input id="l-email" type="email" placeholder="Correo electrónico">
            <input id="l-pass" type="password" placeholder="Contraseña">
            <button class="btn-login" onclick="ejecutarLogin()">Entrar al Panel</button>
            <div class="link">¿No tienes cuenta? <a href="#" onclick="mostrarRegistro()">Regístrate aquí</a></div>
          </div>
        </div>
        <div id="mensaje"></div>
        <p style="margin-top: 30px; color: #ccc; font-size: 12px;">MedinSur Dev &copy; 2026</p>
      </div>

      <script>
        const mensajeDiv = document.getElementById('mensaje');

        function mostrarRegistro() {
          document.getElementById('auth-container').innerHTML = \`
            <div id="register-view">
              <input id="r-negocio" type="text" placeholder="Nombre de la Barbería">
              <input id="r-email" type="email" placeholder="Email">
              <input id="r-wa" type="tel" placeholder="WhatsApp (Ej: 549...)">
              <input id="r-pass" type="password" placeholder="Contraseña segura">
              <button class="btn-register" onclick="ejecutarRegistro()">Crear Cuenta Blindada</button>
              <div class="link">¿Ya tienes cuenta? <a href="#" onclick="location.reload()">Inicia sesión</a></div>
            </div>
          \`;
        }

        async function ejecutarRegistro() {
          const datos = {
            nombreNegocio: document.getElementById('r-negocio').value,
            email: document.getElementById('r-email').value,
            whatsapp: document.getElementById('r-wa').value,
            password: document.getElementById('r-pass').value
          };
          
          const res = await fetch('/api/registrar', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(datos)
          });
          const result = await res.json();
          mensajeDiv.innerText = result.mensaje || result.error;
          mensajeDiv.style.color = result.mensaje ? "green" : "red";
          if(result.mensaje) setTimeout(() => location.reload(), 2500);
        }

        async function ejecutarLogin() {
          const email = document.getElementById('l-email').value;
          const password = document.getElementById('l-pass').value;
          
          const res = await fetch('/api/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email, password })
          });
          const result = await res.json();
          
          if(result.token) {
            localStorage.setItem('token', result.token);
            document.getElementById('auth-container').innerHTML = \`
              <h3 style="color: #28a745;">¡Bienvenido, \${result.nombre}!</h3>
              <p>Has iniciado sesión de forma segura.</p>
              <button onclick="location.reload()" style="background:#f0f0f0; color:#333;">Cerrar Sesión</button>
            \`;
          }
          mensajeDiv.innerText = result.mensaje || result.error;
          mensajeDiv.style.color = result.token ? "green" : "red";
        }
      </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => console.log('🚀 Servidor corriendo'));
