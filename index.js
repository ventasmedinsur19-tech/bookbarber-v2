const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Base de datos lista'))
  .catch(err => console.error('❌ Error:', err));

// --- MODELO DE DATOS ---
const BarberoSchema = new mongoose.Schema({
  nombreNegocio: String,
  email: { type: String, unique: true, required: true },
  telefono: String,
  password: { type: String, required: true },
  fechaRegistro: { type: Date, default: Date.now }
});

const Barbero = mongoose.model('Barbero', BarberoSchema);

// --- RUTAS (API) ---

// 1. Ver estado
app.get('/', (req, res) => {
  res.send('<h1>Servidor BookBarber V2 Online</h1><p>Base de datos: CONECTADA ✅</p>');
});

// 2. Ruta para registrar un barbero (Prueba)
app.post('/api/registrar', async (req, res) => {
  try {
    const nuevoBarbero = new Barbero(req.body);
    await nuevoBarbero.save();
    res.status(201).json({ mensaje: "¡Barbero registrado con éxito!", id: nuevoBarbero._id });
  } catch (error) {
    res.status(400).json({ error: "Error al registrar: " + error.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Puerto: ${PORT}`));
