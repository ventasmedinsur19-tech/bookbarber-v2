const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Definición del esquema (Asegúrate de que coincida con tu DB)
const SucursalSchema = new mongoose.Schema({
  ownerEmail: String,
  nombre: String,
  direccion: String,
  logoUrl: String,
  fotoLocalUrl: String,
  esPrincipal: Boolean,
  fechaRegistro: { type: Date, default: Date.now }
});

// Evita errores de re-compilación de modelo en desarrollo
const Sucursal = mongoose.models.Sucursal || mongoose.model('Sucursal', SucursalSchema);

// GET: Obtener sucursales del usuario
router.get('/', async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) return res.status(400).json({ error: "Token requerido" });
    
    const sedes = await Sucursal.find({ ownerEmail: token }).sort({ fechaRegistro: 1 });
    res.json(sedes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Guardar o crear sucursal
router.post('/', async (req, res) => {
  try {
    const { token, nombre, direccion, logo, foto } = req.body;
    
    // Verificamos si ya tiene una principal para marcar esta como extra si es necesario
    const cuentaPrevia = await Sucursal.countDocuments({ ownerEmail: token });
    
    const nuevaSucursal = new Sucursal({
      ownerEmail: token,
      nombre: nombre,
      direccion: direccion,
      logoUrl: logo, // Aquí llega el Base64 de la imagen
      fotoLocalUrl: foto,
      esPrincipal: cuentaPrevia === 0
    });

    await nuevaSucursal.save();
    console.log("Sucursal guardada para:", token);
    res.status(200).json({ ok: true, mensaje: "Guardado exitoso" });
  } catch (err) {
    console.error("Error en POST sucursales:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
