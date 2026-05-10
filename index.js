const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ DB Conectada'))
  .catch(err => console.error('❌ Error DB:', err));

// MODELO DE DATOS
const Barbero = mongoose.model('Barbero', new mongoose.Schema({
  nombreNegocio: String,
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  fechaRegistro: { type: Date, default: Date.now }
}));

// RUTA PARA VER EL FORMULARIO
app.get('/', (req, res) => {
  res.send(`
    <div style="font-family: sans-serif; max-width: 400px; margin: 50px auto; text-align: center; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
      <h2>Registro BookBarber V2</h2>
      <input id="negocio" type="text" placeholder="Nombre de la Barbería" style="width: 90%; padding: 10px; margin: 5px;"><br>
      <input id="email" type="email" placeholder="Email" style="width: 90%; padding: 10px; margin: 5px;"><br>
      <input id="pass" type="password" placeholder="Contraseña" style="width: 90%; padding: 10px; margin: 5px;"><br>
      <button onclick="registrar()" style="width: 95%; padding: 10px; background: #222; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 10px;">Crear Cuenta</button>
      <p id="mensaje"></p>
    </div>

    <script>
      async function registrar() {
        const datos = {
          nombreNegocio: document.getElementById('negocio').value,
          email: document.getElementById('email').value,
          password: document.getElementById('pass').value
        };
        
        const res = await fetch('/api/registrar', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(datos)
        });
        
        const resultado = await res.json();
        document.getElementById('mensaje').innerText = resultado.mensaje || resultado.error;
      }
    </script>
  `);
});

// RUTA PARA GUARDAR EN MONGO
app.post('/api/registrar', async (req, res) => {
  try {
    const nuevo = new Barbero(req.body);
    await nuevo.save();
    res.status(201).json({ mensaje: "✅ ¡Barbero guardado en MongoDB Atlas!" });
  } catch (error) {
    res.status(400).json({ error: "❌ Error: " + error.message });
  }
});

app.listen(PORT, () => console.log('🚀 Server listo'));
