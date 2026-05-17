const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const session = require('express-session');
require('dotenv').config();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');

// Servir archivos estáticos (css, imágenes locales)
app.use(express.static('public'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'medinsur_secret_key', 
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 horas
}));

// Pool de conexión Hostinger
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

// --- RUTAS BÁSICAS ---
app.get('/', (req, res) => res.redirect('/dashboard'));
app.get('/login', (req, res) => res.render('login', { error: null }));
app.get('/registro', (req, res) => res.render('registro'));
app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/login'); });

// --- DASHBOARD (MEJORADO CON PRECIOS) ---
app.get('/dashboard', isAuth, async (req, res) => {
  try {
    const [user] = await db.query('SELECT * FROM usuarios WHERE id = ?', [req.session.userId]);
    const [sucursales] = await db.query('SELECT * FROM sucursales WHERE usuario_id = ?', [req.session.userId]);
    
    // Cálculos de Suscripción (BookBarber Business Logic)
    const fechaReg = new Date(user[0].fecha_registro);
    const diasTranscurridos = Math.floor((new Date() - fechaReg) / (1000 * 60 * 60 * 24));
    const diasRestantes = Math.max(0, 30 - diasTranscurridos);
    
    const baseSuscripcion = 15000;
    const extras = Math.max(0, sucursales.length - 1) * 5000;
    const totalMensual = baseSuscripcion + extras;

    res.render('dashboard', { 
      user: user[0], 
      sucursales, 
      diasRestantes,
      totalMensual
    });
  } catch (e) { res.status(500).send("Error en dashboard: " + e.message); }
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

// --- GESTIÓN DE STAFF ---
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
  try {
    const [sucursales] = await db.query('SELECT * FROM sucursales WHERE usuario_id = ?', [req.session.userId]);
    const [servicios] = await db.query(`
      SELECT ser.*, s.nombre as sucursal_nombre 
      FROM servicios ser 
      JOIN sucursales s ON ser.sucursal_id = s.id 
      WHERE s.usuario_id = ?`, [req.session.userId]);
    res.render('servicios_gestion', { sucursales, servicios }); 
  } catch (e) { res.status(500).send(e.message); }
});

app.post('/servicios/guardar', isAuth, async (req, res) => {
  const { sucursal_id, nombre, precio, duracion } = req.body;
  await db.query('INSERT INTO servicios (sucursal_id, nombre, precio, duracion) VALUES (?, ?, ?, ?)', [sucursal_id, nombre, precio, duracion]);
  res.redirect('/servicios');
});

// --- GESTIÓN DE HORARIOS (CORREGIDO PARA USAR BARBERO_ID) ---
app.get('/horarios', isAuth, async (req, res) => {
  try {
    // Traemos barberos en lugar de sucursales para el formulario desplegable
    const [barberos] = await db.query(`
      SELECT b.id, b.nombre, s.nombre as sucursal_nombre 
      FROM barberos b 
      JOIN sucursales s ON b.sucursal_id = s.id 
      WHERE s.usuario_id = ?`, [req.session.userId]);

    const [horarios] = await db.query(`
      SELECT h.*, b.nombre as barbero_nombre, s.nombre as sucursal_nombre 
      FROM horarios h 
      JOIN barberos b ON h.barbero_id = b.id
      JOIN sucursales s ON b.sucursal_id = s.id 
      WHERE s.usuario_id = ?
      ORDER BY FIELD(h.dia, 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'), h.hora_inicio`, 
      [req.session.userId]);

    res.render('horarios', { barberos, horarios });
  } catch (e) { res.status(500).send(e.message); }
});

app.post('/horarios/guardar', isAuth, async (req, res) => {
  try {
    const { barbero_id, dia, hora_inicio, hora_fin } = req.body;
    await db.query('INSERT INTO horarios (barbero_id, dia, hora_inicio, hora_fin) VALUES (?, ?, ?, ?)', 
    [barbero_id, dia, hora_inicio, hora_fin]);
    res.redirect('/horarios');
  } catch (e) { res.status(500).send(e.message); }
});

// --- TURNOS Y CAJA ---
app.get('/turnos', isAuth, (req, res) => res.render('turnos'));
app.get('/caja', isAuth, (req, res) => res.render('caja'));

// ==========================================
// RUTA PÚBLICA (LO QUE VE EL CLIENTE)
// ==========================================
app.get('/b/:id', async (req, res) => {
  try {
    const sucursalId = req.params.id;
    const [sucursales] = await db.query('SELECT * FROM sucursales WHERE id = ?', [sucursalId]);
    
    if(sucursales.length === 0) return res.status(404).send('Barbería no encontrada');
    
    const [barberos] = await db.query('SELECT * FROM barberos WHERE sucursal_id = ?', [sucursalId]);
    const [servicios] = await db.query('SELECT * FROM servicios WHERE sucursal_id = ?', [sucursalId]);
    
    // Renderizamos la vista pública (que crearemos pronto)
    res.render('reserva_publica', { 
      sucursal: sucursales[0], 
      barberos, 
      servicios 
    });
  } catch (e) { res.status(500).send(e.message); }
});


// --- AUTH (REGISTRO Y LOGIN) ---
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
  res.render('login', { error: 'WhatsApp o contraseña incorrectos.' });
});

app.listen(process.env.PORT || 3000, () => console.log("Servidor BookBarber Activo"));
