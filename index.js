const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Esto busca el HTML en la carpeta /public

// Conexión a DB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ DB Conectada'))
  .catch(err => console.log('❌ Error DB:', err));

// Aquí iremos agregando las rutas de "Mis Sucursales", "Staff", etc.
// Por ahora, el servidor solo sirve para conectar la base de datos y mostrar la web.

app.listen(PORT, () => console.log('🚀 Servidor en puerto ' + PORT));
