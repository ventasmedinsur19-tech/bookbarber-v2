const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const session = require('express-session');
require('dotenv').config();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');

// Configuración de Sesión
app.use(session({
  secret: 'medinsur_secret_key',
  resave: false,
  saveUninitialized: true
}));

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
}).promise();

// RUTA: Pantalla de Registro
app.get('/registro', (req, res) => {
  res.render('registro');
});

// LÓGICA: Procesar Registro
app.post('/auth/registro', async (req, res) => {
  const { whatsapp, password, nombre_barberia } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    // 1. Crear el usuario
    const [userResult] = await db.query(
      'INSERT INTO usuarios (whatsapp, password, estado) VALUES (?, ?, "prueba")',
      [whatsapp, hashedPassword]
    );
    const userId = userResult.insertId;

    // 2. Crear la sucursal madre automáticamente
    await db.query(
      'INSERT INTO sucursales (usuario_id, nombre) VALUES (?, ?)',
      [userId, nombre_barberia]
    );

    req.session.userId = userId;
    res.redirect('/dashboard');
  } catch (error) {
    res.send("Error al registrar: El WhatsApp ya existe.");
  }
});

// RUTA: Dashboard (Protegido)
app.get('/dashboard', async (req, res) => {
  if (!req.session.userId) return res.redirect('/registro');
  
  const [user] = await db.query('SELECT * FROM usuarios WHERE id = ?', [req.session.userId]);
  const [sucursales] = await db.query('SELECT * FROM sucursales WHERE usuario_id = ?', [req.session.userId]);
  
  // Cálculo de días restantes (30 días de prueba)
  const fechaReg = new Date(user[0].fecha_registro);
  const hoy = new Date();
  const diasPasados = Math.floor((hoy - fechaReg) / (1000 * 60 * 60 * 24));
  const diasRestantes = Math.max(0, 30 - diasPasados);

  res.render('dashboard', { user: user[0], sucursales, diasRestantes });
});

app.listen(process.env.PORT || 3000, () => console.log("BookBarber corriendo..."));
// Redirigir la raíz al registro para que no de error
app.get('/', (req, res) => {
  res.redirect('/registro');
});
