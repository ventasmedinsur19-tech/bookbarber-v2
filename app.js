const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const session = require('express-session');
require('dotenv').config();

const app = express();

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');

// Configuración de Sesión
app.use(session({
  secret: 'medinsur_secret_key', // Firma de MedinSur Dev
  resave: false,
  saveUninitialized: true
}));

// Conexión a Base de Datos (Pool de conexiones)
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306, // Puerto MySQL
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}).promise();

// --- RUTAS DE VISTA ---

// Redirigir la raíz al registro
app.get('/', (req, res) => {
  res.redirect('/registro');
});

app.get('/registro', (req, res) => {
  res.render('registro');
});

// --- LÓGICA DE AUTENTICACIÓN ---

app.post('/auth/registro', async (req, res) => {
  const { whatsapp, password, nombre_barberia } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // 1. Intentar crear el usuario
    const [userResult] = await db.query(
      'INSERT INTO usuarios (whatsapp, password, estado) VALUES (?, ?, "prueba")',
      [whatsapp, hashedPassword]
    );
    const userId = userResult.insertId;

    // 2. Crear la sucursal automáticamente
    await db.query(
      'INSERT INTO sucursales (usuario_id, nombre) VALUES (?, ?)',
      [userId, nombre_barberia]
    );

    // Iniciar sesión y dirigir al Dashboard
    req.session.userId = userId;
    res.redirect('/dashboard');

  } catch (error) {
    console.error("Error detectado:", error);

    // Si el error es por duplicado (Código MySQL ER_DUP_ENTRY)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).send("Error: Este número de WhatsApp ya está registrado.");
    }

    // Para cualquier otro error (Conexión, nombres de tablas, etc.)
    res.status(500).send(`Error interno del servidor: ${error.message}`);
  }
});

// --- DASHBOARD (Protegido) ---

app.get('/dashboard', async (req, res) => {
  if (!req.session.userId) return res.redirect('/registro');
  
  try {
    const [userRows] = await db.query('SELECT * FROM usuarios WHERE id = ?', [req.session.userId]);
    const [sucursales] = await db.query('SELECT * FROM sucursales WHERE usuario_id = ?', [req.session.userId]);
    
    if (userRows.length === 0) return res.redirect('/registro');

    const user = userRows[0];

    // Lógica de días de prueba (30 días)
    const fechaReg = new Date(user.fecha_registro);
    const hoy = new Date();
    const diasPasados = Math.floor((hoy - fechaReg) / (1000 * 60 * 60 * 24));
    const diasRestantes = Math.max(0, 30 - diasPasados);

    res.render('dashboard', { user, sucursales, diasRestantes });
  } catch (error) {
    res.status(500).send("Error al cargar el panel: " + error.message);
  }
});

// --- INICIO DEL SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`BookBarber en línea en el puerto ${PORT}...`);
});

