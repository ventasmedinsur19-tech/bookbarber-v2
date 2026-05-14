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
  secret: 'medinsur_secret_key',
  resave: false,
  saveUninitialized: true
}));

// Conexión a Base de Datos
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}).promise();

// --- RUTAS DE VISTA ---

app.get('/', (req, res) => {
  res.redirect(req.session.userId ? '/dashboard' : '/login');
});

app.get('/registro', (req, res) => {
  res.render('registro');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// --- LÓGICA DE AUTENTICACIÓN ---

// Registro
app.post('/auth/registro', async (req, res) => {
  const { whatsapp, password, nombre_barberia } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [userResult] = await db.query(
      'INSERT INTO usuarios (whatsapp, password, estado) VALUES (?, ?, "prueba")',
      [whatsapp, hashedPassword]
    );
    const userId = userResult.insertId;

    await db.query(
      'INSERT INTO sucursales (usuario_id, nombre) VALUES (?, ?)',
      [userId, nombre_barberia]
    );

    req.session.userId = userId;
    res.redirect('/dashboard');
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).send("Error: Este WhatsApp ya está registrado.");
    }
    res.status(500).send(`Error interno: ${error.message}`);
  }
});

// Login
app.post('/auth/login', async (req, res) => {
  const { whatsapp, password } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM usuarios WHERE whatsapp = ?', [whatsapp]);
    if (rows.length === 0) return res.status(401).send("Error: Usuario no encontrado.");

    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).send("Error: Contraseña incorrecta.");

    req.session.userId = user.id;
    res.redirect('/dashboard');
  } catch (error) {
    res.status(500).send("Error en el login: " + error.message);
  }
});

// --- DASHBOARD (Protegido) ---

app.get('/dashboard', async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  
  try {
    const [userRows] = await db.query('SELECT * FROM usuarios WHERE id = ?', [req.session.userId]);
    const [sucursales] = await db.query('SELECT * FROM sucursales WHERE usuario_id = ?', [req.session.userId]);
    
    if (userRows.length === 0) return res.redirect('/login');

    const user = userRows[0];
    const fechaReg = new Date(user.fecha_registro);
    const hoy = new Date();
    const diasPasados = Math.floor((hoy - fechaReg) / (1000 * 60 * 60 * 24));
    const diasRestantes = Math.max(0, 30 - diasPasados);

    res.render('dashboard', { user, sucursales, diasRestantes });
  } catch (error) {
    res.status(500).send("Error al cargar el panel: " + error.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
