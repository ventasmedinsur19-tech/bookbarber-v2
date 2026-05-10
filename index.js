const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'MEDINSUR_V2_PRO';

app.use(cors());
app.use(express.json());

// Conexión con log de error específico
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.log('❌ Error de conexión DB. ¿Pusiste 0.0.0.0/0 en Atlas?:', err.message));

// Modelo de Usuario
const User = mongoose.model('User', new mongoose.Schema({
  negocio: String,
  email: { type: String, unique: true },
  pass: String,
  wa: String
}));

// API: Registro
app.post('/api/registrar', async (req, res) => {
  try {
    const { negocio, email, pass, wa } = req.body;
    const mail = email.toLowerCase().trim();
    
    const existe = await User.findOne({ email: mail });
    if (existe) return res.json({ error: "El email ya existe" });

    const hash = await bcrypt.hash(pass, 10);
    const nuevo = new User({ negocio, email: mail, pass: hash, wa });
    await nuevo.save();
    
    res.json({ ok: true });
  } catch (e) {
    res.json({ error: "Error de base de datos: Verifica el acceso IP en Atlas." });
  }
});

// API: Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, pass } = req.body;
    const u = await User.findOne({ email: email.toLowerCase().trim() });
    if (!u) return res.json({ error: "Usuario no encontrado" });

    const match = await bcrypt.compare(pass, u.pass);
    if (!match) return res.json({ error: "Contraseña incorrecta" });

    const token = jwt.sign({ id: u._id, n: u.negocio }, SECRET_KEY);
    res.json({ token, negocio: u.negocio });
  } catch (e) { res.json({ error: "Error en el servidor" }); }
});

// Interfaz
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>BookBarber V2</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
      <style>
        body { font-family: sans-serif; background: #f1f5f9; margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        .box { background: white; padding: 30px; border-radius: 20px; box-shadow: 0 10px 20px rgba(0,0,0,0.1); width: 90%; max-width: 350px; text-align: center; }
        input { width: 100%; padding: 12px; margin: 8px 0; border: 1px solid #ddd; border-radius: 10px; box-sizing: border-box; }
        button { width: 100%; padding: 12px; background: #1e293b; color: white; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; margin-top: 10px; }
        .link { color: #2563eb; cursor: pointer; text-decoration: none; font-weight: bold; }
      </style>
    </head>
    <body>
      <div id="app" class="box">
        <h2>BookBarber V2</h2>
        <div id="fields">
          <input id="e" type="email" placeholder="Email">
          <input id="p" type="password" placeholder="Contraseña">
        </div>
        <button onclick="auth()" id="btn">Entrar al Panel</button>
        <p id="footer" style="font-size:14px; margin-top:15px;">¿No tienes cuenta? <span class="link" onclick="viewReg()">Registrarme</span></p>
      </div>

      <script>
        let isLogin = true;
        function viewReg() {
          isLogin = false;
          document.getElementById('fields').innerHTML = '<input id="n" placeholder="Negocio"><input id="e" placeholder="Email"><input id="w" placeholder="WhatsApp"><input id="p" type="password" placeholder="Clave">';
          document.getElementById('btn').innerText = "Crear Cuenta";
          document.getElementById('footer').innerHTML = '¿Ya tienes cuenta? <span class="link" onclick="location.reload()">Inicia Sesión</span>';
        }

        async function auth() {
          const body = isLogin ? 
            { email: e.value, pass: p.value } : 
            { negocio: n.value, email: e.value, wa: w.value, pass: p.value };
          
          const res = await fetch(isLogin ? '/api/login' : '/api/registrar', {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)
          });
          const data = await res.json();
          
          if (data.ok) { alert("¡Registro exitoso! Ya puedes entrar."); location.reload(); }
          else if (data.token) {
            localStorage.setItem('tk', data.token);
            document.body.innerHTML = '<h2 style="text-align:center; margin-top:50px;">Bienvenido a ' + data.negocio + '</h2><p style="text-align:center;">Cargando panel profesional...</p>';
          } else { alert(data.error || "Error desconocido"); }
        }
      </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => console.log('Servidor listo'));
