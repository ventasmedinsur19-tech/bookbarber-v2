const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs'); // Librería de seguridad
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ DB Conectada y Segura'))
  .catch(err => console.error('❌ Error DB:', err));

// MODELO EVOLUCIONADO
const BarberoSchema = new mongoose.Schema({
  nombreNegocio: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  whatsapp: { type: String, unique: true, required: true }, // Nuevo: Seguro para recuperación
  password: { type: String, required: true },
  fechaRegistro: { type: Date, default: Date.now }
});

const Barbero = mongoose.model('Barbero', BarberoSchema);

// RUTA DE REGISTRO BLINDADA
app.post('/api/registrar', async (req, res) => {
  try {
    const { nombreNegocio, email, whatsapp, password } = req.body;

    // 1. Encriptar la contraseña (10 niveles de seguridad)
    const salt = await bcrypt.genSalt(10);
    const passwordHashed = await bcrypt.hash(password, salt);

    // 2. Guardar el usuario con la clave encriptada
    const nuevo = new Barbero({
      nombreNegocio,
      email,
      whatsapp,
      password: passwordHashed
    });

    await nuevo.save();
    res.status(201).json({ mensaje: "✅ Registro seguro completado." });

  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: "❌ El email o WhatsApp ya están registrados." });
    } else {
      res.status(400).json({ error: "❌ Error: " + error.message });
    }
  }
});

// Mantener la ruta principal para ver el formulario actualizado
app.get('/', (req, res) => {
  res.send(`
    <div style="font-family: sans-serif; max-width: 400px; margin: 50px auto; border: 1px solid #eee; padding: 30px; border-radius: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
      <h2 style="text-align: center;">Registro Blindado V2</h2>
      <input id="negocio" type="text" placeholder="Nombre Barbería" style="width: 100%; padding: 12px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 8px;">
      <input id="email" type="email" placeholder="Email institucional" style="width: 100%; padding: 12px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 8px;">
      <input id="wa" type="tel" placeholder="WhatsApp (Ej: 549351...)" style="width: 100%; padding: 12px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 8px;">
      <input id="pass" type="password" placeholder="Contraseña segura" style="width: 100%; padding: 12px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 8px;">
      <button onclick="registrar()" style="width: 100%; padding: 12px; background: #000; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">Finalizar Registro</button>
      <p id="mensaje" style="text-align: center; margin-top: 15px; font-weight: bold;"></p>
    </div>
    <script>
      async function registrar() {
        const btn = event.target;
        btn.disabled = true;
        btn.innerText = "Protegiendo datos...";
        
        const datos = {
          nombreNegocio: document.getElementById('negocio').value,
          email: document.getElementById('email').value,
          whatsapp: document.getElementById('wa').value,
          password: document.getElementById('pass').value
        };
        
        try {
          const res = await fetch('/api/registrar', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(datos)
          });
          const result = await res.json();
          document.getElementById('mensaje').innerText = result.mensaje || result.error;
          document.getElementById('mensaje').style.color = result.mensaje ? "green" : "red";
        } catch (e) {
          document.getElementById('mensaje').innerText = "Error de conexión";
        }
        btn.disabled = false;
        btn.innerText = "Finalizar Registro";
      }
    </script>
  `);
});

app.listen(3000);
