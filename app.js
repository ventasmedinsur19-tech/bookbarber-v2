const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('<h1>BookBarber Online v2 en funcionamiento</h1><p>El servidor de Node.js está activo y conectado a GitHub.</p>');
});

app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});

