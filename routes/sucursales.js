const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const SucursalSchema = new mongoose.Schema({
  ownerEmail: String,
  nombre: String,
  direccion: String,
  logoUrl: String,
  fotoLocalUrl: String,
  esPrincipal: Boolean,
  fecha: { type: Date, default: Date.now }
});

const Sucursal = mongoose.model('Sucursal', SucursalSchema);

// GET: Obtener sucursales
router.get('/', async (req, res) => {
  try {
    const data = await Sucursal.find({ ownerEmail: req.query.token });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Guardar sucursal (Principal o Extra)
router.post('/', async (req, res) => {
  try {
    const { token, nombre, direccion, logo, foto } = req.body;
    
    // Verificamos si es la primera
    const cuenta = await Sucursal.countDocuments({ ownerEmail: token });
    
    const nueva = new Sucursal({
      ownerEmail: token,
      nombre,
      direccion,
      logoUrl: logo,
      fotoLocalUrl: foto,
      esPrincipal: (cuenta === 0)
    });

    await nueva.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
