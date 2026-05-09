const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuración de la conexión a MongoDB
// Usará la variable MONGO_URI que configuraste en el panel de Hostinger
const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI)
  .then(() => {
    console.log('✅ Conexión exitosa a MongoDB Atlas');
  })
  .catch((err) => {
    console.error('❌ Error al conectar a MongoDB:', err.message);
  });

// Ruta principal para verificar el estado
app.get('/', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "CONECTADA ✅" : "DESCONECTADA ❌";
  
  res.send(`
    <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
      <h1>Servidor de BookBarber V2</h1>
      <p style="font-size: 1.2em;">Estado de la Base de Datos: <b style="color: ${dbStatus.includes('✅') ? 'green' : 'red'};">${dbStatus}</b></p>
      <hr style="width: 50%; margin: 20px auto;">
      <p style="color: gray;">MedinSur Dev &copy; 2026</p>
    </div>
  `);
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
