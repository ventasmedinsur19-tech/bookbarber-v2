const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Definición del Esquema
const SucursalSchema = new mongoose.Schema({
  ownerEmail: String,
  nombre: String,
  direccion: String,
  logoUrl: { type: String, default: "" },      // Aquí se guarda el String Base64
  fotoLocalUrl: { type: String, default: "" }, // Aquí se guarda el String Base64
  esPrincipal: { type: Boolean, default: false },
  fechaRegistro: { type: Date, default: Date.now }
});

const Sucursal = mongoose.model('Sucursal', SucursalSchema);

// Obtener sucursales de un usuario
router.get('/', async (req, res) => {
  const sucursales = await Sucursal.find({ ownerEmail: req.query.token });
  res.json(sucursales);
});

// Guardar nueva sucursal
router.post('/', async (req, res) => {
  try {
    const { token, nombre, direccion, logoBase64, fotoBase64 } = req.body;
    
    // Verificamos si ya tiene una principal para marcar las siguientes como extras
    const tienePrincipal = await Sucursal.findOne({ ownerEmail: token, esPrincipal: true });
    
    const nueva = new Sucursal({ 
      ownerEmail: token, 
      nombre, 
      direccion, 
      logoUrl: logoBase64, 
      fotoLocalUrl: fotoBase64,
      esPrincipal: !tienePrincipal // Si no tiene ninguna, esta es la principal
    });
    
    await nueva.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar sucursal' });
  }
});

module.exports = router;
