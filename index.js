const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Conexión
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Sistema Online y Seguro'))
  .catch(err => console.error('❌ Error:', err));

// Modelo
const Barbero = mongoose.model('Barbero', new mongoose.Schema({
  nombreNegocio: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  whatsapp: { type: String, unique: true, required: true },
  password: { type: String, required: true }
}));

// --- RUTAS DE LA API ---

// Registro (Ya lo tienes, se mantiene igual)
app.post('/api/registrar', async (req, res) => {
  try {
    const { nombreNegocio, email, whatsapp, password } = req.body;
    const salt = await bcrypt.genSalt(10);
    const passwordHashed = await bcrypt.hash(password, salt);
    const nuevo = new Barbero({ nombreNegocio, email, whatsapp, password: passwordHashed });
    await nuevo.save();
    res.status(201).json({ mensaje: "✅ Registro exitoso." });
  } catch (error) {
    res.status(400).json({ error: "❌ Error al registrar." });
  }
});

// Login Profesional
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const barbero = await Barbero.findOne({ email });
    if (!barbero) return res.status(400).json({ error: "Usuario no encontrado" });

    const esValida = await bcrypt.compare(password, barbero.password);
    if (!esValida) return res.status(400).json({ error: "Contraseña incorrecta" });

    // Crear el "Pase VIP" (Token) que dura 24 horas
    const token = jwt.sign({ id: barbero._id }, 'SECRETO_MUY_SEGURO', { expiresIn: '24h' });
    res.json({ mensaje: "¡Bienvenido!", token, nombre: barbero.nombreNegocio });
  } catch (error) {
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// Interfaz Visual (Actualizada con Login)
app.get('/', (req, res) => {
  res.send(`
    <div style="font-family: sans-serif; max-width: 400px; margin: 50px auto; border: 1px solid #eee; padding: 30px; border-radius: 15px; text-align: center;">
      <h2>BookBarber V2</h2>
      <div id="auth-box">
        <input id="email" type="email" placeholder="Email" style="width: 100%; padding: 12px; margin-bottom: 10px; border-radius: 8px; border: 1px solid #ddd;">
        <input id="pass" type="password" placeholder="Contraseña" style="width: 100%; padding: 12px; margin-bottom: 15px; border-radius: 8px; border: 1px solid #ddd;">
        <button onclick="login()" style="width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 8px; cursor: pointer;">Entrar al Panel</button>
      </div>
      <p id="mensaje" style="margin-top: 15px; font-weight: bold;"></p>
    </div>
    <script>
      async function login() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('pass').value;
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if(data.token) {
          document.getElementById('auth-box').innerHTML = "<h3>Hola, " + data.nombre + "</h3><p>Ya estás logueado con seguridad.</p>";
          localStorage.setItem('token', data.token); // Guardamos el pase VIP en el navegador
        }
        document.getElementById('mensaje').innerText = data.mensaje || data.error;
      }
    </script>
  `);
});

app.listen(3000);
