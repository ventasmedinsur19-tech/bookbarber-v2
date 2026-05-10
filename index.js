const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); 

// Conexión a Base de Datos
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ DB Conectada correctamente'))
  .catch(err => console.log('❌ Error al conectar DB:', err));

// Rutas (Importamos el archivo de sucursales)
const sucursalesRoutes = require('./routes/sucursales');
app.use('/api/sucursales', sucursalesRoutes);

// Servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor MedinSur Dev corriendo en puerto ${PORT}`);
});
