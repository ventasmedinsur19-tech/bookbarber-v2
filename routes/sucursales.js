const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Esquema de Sucursal con Logo y Foto
const SucursalSchema = new mongoose.Schema({
  ownerEmail: String,
  nombre: String,
  direccion: String,
  logoUrl: { type: String, default: "" },      // URL del logo
  fotoLocalUrl: { type: String, default: "" }, // URL de la foto del local
  esPrincipal: { type: Boolean, default: false },
  fechaRegistro: { type: Date, default: Date.now }
});

const Sucursal = mongoose.model('Sucursal', SucursalSchema);

// Obtener todas las sucursales de un usuario
router.get('/:token', async (req, res) => {
  try {
    const sucursales = await Sucursal.find({ ownerEmail: req.params.token });
    res.json(sucursales);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener sucursales' });
  }
});

// Guardar nueva sucursal (Principal o Extra)
router.post('/', async (req, res) => {
  try {
    const { token, nombre, direccion, logoUrl, fotoLocalUrl } = req.body;
    
    // Verificamos si ya tiene una principal para marcar esta como extra o no
    const tienePrincipal = await Sucursal.findOne({ ownerEmail: token, esPrincipal: true });
    
    const nueva = new Sucursal({ 
      ownerEmail: token, 
      nombre, 
      direccion, 
      logoUrl, 
      fotoLocalUrl,
      esPrincipal: !tienePrincipal // Si no tiene, la primera es la principal
    });
    
    await nueva.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar' });
  }
});

module.exports = router;

