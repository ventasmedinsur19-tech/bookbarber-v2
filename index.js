const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para entender datos JSON
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('Servidor de BookBarber V2 funcionando con éxito');
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});

