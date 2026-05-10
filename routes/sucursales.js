const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Esquema de Sucursal
const SucursalSchema = new mongoose.Schema({
  ownerEmail: String,
  nombre: String,
  direccion: String,
  logoUrl: { type: String, default: "" },
  fotoLocalUrl: { type: String, default: "" },
  esPrincipal: { type: Boolean, default: false },
  creadoEn: { type: Date, default: Date.now }
});

const Sucursal = mongoose.model('Sucursal', SucursalSchema);

// Listar sucursales
router.get('/', async (req, res) => {
  const sedes = await Sucursal.find({ ownerEmail: req.query.token });
  res.json(sedes);
});

// Guardar nueva sucursal
router.post('/', async (req, res) => {
  try {
    const { token, nombre, direccion, logo, foto } = req.body;
    
    // Si es la primera, es la Principal
    const yaTienePrincipal = await Sucursal.findOne({ ownerEmail: token });
    
    const nueva = new Sucursal({ 
      ownerEmail: token, 
      nombre, 
      direccion, 
      logoUrl: logo, 
      fotoLocalUrl: foto,
      esPrincipal: !yaTienePrincipal 
    });
    
    await nueva.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar la sucursal' });
  }
});

module.exports = router;
