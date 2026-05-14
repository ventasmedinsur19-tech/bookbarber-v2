const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const session = require('express-session');
require('dotenv').config();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');

app.use(session({
  secret: 'medinsur_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 horas
}));

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306
}).promise();

// Middleware de Protección
const isAuth = (req, res, next) => {
  if (req.session.userId) return next();
  res.redirect('/login');
};

// --- RUTAS DE NAVEGACIÓN BÁSICA ---
app.get('/', (req, res) => res.redirect('/dashboard'));
app.get('/login', (req, res) => res.render('login'));
app.get('/registro', (req, res) => res.render('registro'));
app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/login'); });

// --- DASHBOARD ---
app.get('/dashboard', isAuth, async (req, res) => {
  try {
    const [user] = await db.query('SELECT * FROM usuarios WHERE id = ?', [req.session.userId]);
    const [sucursales] = await db.query('SELECT * FROM sucursales WHERE usuario_id = ?', [req.session.userId]);
    const fechaReg = new Date(user[0].fecha_registro);
    const diasRestantes = Math.max(0, 30 - Math.floor((new Date() - fechaReg) / (1000 * 60 * 60 * 24)));
    res.render('dashboard', { user: user[0], sucursales, diasRestantes });
  } catch (e) { res.status(500).send(e.message); }
});

// --- GESTIÓN DE SUCURSALES ---
app.get('/sucursales', isAuth, async (req, res) => {
  const [sucursales] = await db.query('SELECT * FROM sucursales WHERE usuario_id = ?', [req.session.userId]);
  res.render('sucursales_gestion', { sucursales });
});

app.post('/sucursales/guardar', isAuth, async (req, res) => {
  const { nombre, direccion, logo_url, foto_url } = req.body;
  await db.query('INSERT INTO sucursales (usuario_id, nombre, direccion, logo_url, foto_url) VALUES (?, ?, ?, ?, ?)', 
  [req.session.userId, nombre, direccion, logo_url, foto_url]);
  res.redirect('/sucursales');
});

// --- GESTIÓN DE STAFF (BARBEROS) ---
app.get('/staff', isAuth, async (req, res) => {
  const [sucursales] = await db.query('SELECT * FROM sucursales WHERE usuario_id = ?', [req.session.userId]);
  const [barberos] = await db.query('SELECT b.*, s.nombre as sucursal_nombre FROM barberos b JOIN sucursales s ON b.sucursal_id = s.id WHERE s.usuario_id = ?', [req.session.userId]);
  res.render('staff', { sucursales, barberos });
});

app.post('/staff/guardar', isAuth, async (req, res) => {
  const { sucursal_id, nombre, foto_url } = req.body;
  await db.query('INSERT INTO barberos (sucursal_id, nombre, foto_url) VALUES (?, ?, ?)', [sucursal_id, nombre, foto_url]);
  res.redirect('/staff');
});

// --- GESTIÓN DE SERVICIOS ---
app.get('/servicios', isAuth, async (req, res) => {
  const [sucursales] = await db.query('SELECT * FROM sucursales WHERE usuario_id = ?', [req.session.userId]);
  const [servicios] = await db.query('SELECT ser.*, s.nombre as sucursal_nombre FROM servicios ser JOIN sucursales s ON ser.sucursal_id = s.id WHERE s.usuario_id = ?', [req.session.userId]);
  res.render('servicios', { sucursales, servicios });
});

app.post('/servicios/guardar', isAuth, async (req, res) => {
  const { sucursal_id, nombre, precio, duracion } = req.body;
  await db.query('INSERT INTO servicios (sucursal_id, nombre, precio, duracion) VALUES (?, ?, ?, ?)', [sucursal_id, nombre, precio, duracion]);
  res.redirect('/servicios');
});

// --- GESTIÓN DE HORARIOS Y TURNOS ---
app.get('/horarios', isAuth, (req, res) => res.render('horarios'));
app.get('/turnos', isAuth, (req, res) => res.render('turnos'));
app.get('/caja', isAuth, (req, res) => res.render('caja'));

// --- AUTENTICACIÓN ---
app.post('/auth/registro', async (req, res) => {
  const { whatsapp, password, nombre_barberia } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const [u] = await db.query('INSERT INTO usuarios (whatsapp, password) VALUES (?, ?)', [whatsapp, hash]);
  await db.query('INSERT INTO sucursales (usuario_id, nombre) VALUES (?, ?)', [u.insertId, nombre_barberia]);
  req.session.userId = u.insertId;
  res.redirect('/dashboard');
});

app.post('/auth/login', async (req, res) => {
  const { whatsapp, password } = req.body;
  const [u] = await db.query('SELECT * FROM usuarios WHERE whatsapp = ?', [whatsapp]);
  if (u.length > 0 && await bcrypt.compare(password, u[0].password)) {
    req.session.userId = u[0].id;
    return res.redirect('/dashboard');
  }
  res.send("WhatsApp o contraseña incorrectos.");
});

app.listen(process.env.PORT || 3000, () => console.log("Servidor MedinSur Dev Activo"));
