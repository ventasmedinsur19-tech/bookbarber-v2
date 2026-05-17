const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const session = require('express-session');
require('dotenv').config();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');

// Servir archivos estáticos
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

// --- DASHBOARD ---
app.get('/dashboard', isAuth, async (req, res) => {
  try {
    const [user] = await db.query('SELECT * FROM usuarios WHERE id = ?', [req.session.userId]);
    const [sucursales] = await db.query('SELECT * FROM sucursales WHERE usuario_id = ?', [req.session.userId]);
    
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
  try {
    const [sucursales] = await db.query('SELECT * FROM sucursales WHERE usuario_id = ?', [req.session.userId]);
    res.render('sucursales_gestion', { sucursales });
  } catch (e) { res.status(500).send(e.message); }
});

app.post('/sucursales/guardar', isAuth, async (req, res) => {
  try {
    const { nombre, direccion, logo_url, foto_url } = req.body;
    await db.query('INSERT INTO sucursales (usuario_id, nombre, direccion, logo_url, foto_url) VALUES (?, ?, ?, ?, ?)', 
    [req.session.userId, nombre, direccion, logo_url, foto_url]);
    res.redirect('/sucursales');
  } catch (e) { res.status(500).send(e.message); }
});

// --- GESTIÓN DE STAFF ---
app.get('/staff', isAuth, async (req, res) => {
  try {
    const [sucursales] = await db.query('SELECT * FROM sucursales WHERE usuario_id = ?', [req.session.userId]);
    const [barberos] = await db.query('SELECT b.*, s.nombre as sucursal_nombre FROM barberos b JOIN sucursales s ON b.sucursal_id = s.id WHERE s.usuario_id = ?', [req.session.userId]);
    res.render('staff', { sucursales, barberos });
  } catch (e) { res.status(500).send(e.message); }
});

app.post('/staff/guardar', isAuth, async (req, res) => {
  try {
    const { sucursal_id, nombre, foto_url } = req.body;
    await db.query('INSERT INTO barberos (sucursal_id, nombre, foto_url) VALUES (?, ?, ?)', [sucursal_id, nombre, foto_url]);
    res.redirect('/staff');
  } catch (e) { res.status(500).send(e.message); }
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
  try {
    const { sucursal_id, nombre, precio, duracion } = req.body;
    await db.query('INSERT INTO servicios (sucursal_id, nombre, precio, duracion) VALUES (?, ?, ?, ?)', [sucursal_id, nombre, precio, duracion]);
    res.redirect('/servicios');
  } catch (e) { res.status(500).send(e.message); }
});

// --- GESTIÓN DE HORARIOS ---
app.get('/horarios', isAuth, async (req, res) => {
  try {
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

// --- GESTIÓN DE TURNOS ---
app.get('/turnos', isAuth, async (req, res) => {
  try {
    const [barberos] = await db.query(`
      SELECT b.id, b.nombre, s.nombre as sucursal_nombre 
      FROM barberos b 
      JOIN sucursales s ON b.sucursal_id = s.id 
      WHERE s.usuario_id = ?`, [req.session.userId]);

    const [servicios] = await db.query(`
      SELECT ser.id, ser.nombre, ser.precio, s.nombre as sucursal_nombre 
      FROM servicios ser 
      JOIN sucursales s ON ser.sucursal_id = s.id 
      WHERE s.usuario_id = ?`, [req.session.userId]);

    const [turnos] = await db.query(`
      SELECT t.*, b.nombre as barbero_nombre, ser.nombre as servicio_nombre, ser.precio, s.nombre as sucursal_nombre 
      FROM turnos t
      JOIN barberos b ON t.barbero_id = b.id
      JOIN servicios ser ON t.servicio_id = ser.id
      JOIN sucursales s ON b.sucursal_id = s.id
      WHERE s.usuario_id = ?
      ORDER BY t.fecha ASC, t.hora ASC`, [req.session.userId]);

    res.render('turnos', { barberos, servicios, turnos });
  } catch (e) { res.status(500).send("Error al cargar turnos: " + e.message); }
});

app.post('/turnos/guardar', isAuth, async (req, res) => {
  try {
    const { barbero_id, servicio_id, cliente_nombre, cliente_whatsapp, fecha, hora } = req.body;
    await db.query(`
      INSERT INTO turnos (barbero_id, servicio_id, cliente_nombre, cliente_whatsapp, fecha, hora, estado) 
      VALUES (?, ?, ?, ?, ?, ?, 'pendiente')`, 
      [barbero_id, servicio_id, cliente_nombre, cliente_whatsapp, fecha, hora]);
    res.redirect('/turnos');
  } catch (e) { res.status(500).send(e.message); }
});

app.post('/turnos/estado', isAuth, async (req, res) => {
  try {
    const { turno_id, nuevo_estado } = req.body;
    await db.query('UPDATE turnos SET estado = ? WHERE id = ?', [nuevo_estado, turno_id]);
    res.redirect('/turnos');
  } catch (e) { res.status(500).send(e.message); }
});

// --- SECCIÓN CAJA (PROVISIONAL) ---
app.get('/caja', isAuth, (req, res) => res.render('caja'));

// --- RUTA PÚBLICA DE RESERVA ---
app.get('/b/:id', async (req, res) => {
  try {
    const sucursalId = req.params.id;
    const [sucursales] = await db.query('SELECT * FROM sucursales WHERE id = ?', [sucursalId]);
    if(sucursales.length === 0) return res.status(404).send('Barbería no encontrada');
    
    const [barberos] = await db.query('SELECT * FROM barberos WHERE sucursal_id = ?', [sucursalId]);
    const [servicios] = await db.query('SELECT * FROM servicios WHERE sucursal_id = ?', [sucursalId]);
    
    res.render('reserva_publica', { sucursal: sucursales[0], barberos, servicios });
  } catch (e) { res.status(500).send(e.message); }
});

// --- AUTH POST ---
app.post('/auth/registro', async (req, res) => {
  try {
    const { whatsapp, password, nombre_barberia } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const [u] = await db.query('INSERT INTO usuarios (whatsapp, password) VALUES (?, ?)', [whatsapp, hash]);
    await db.query('INSERT INTO sucursales (usuario_id, nombre) VALUES (?, ?)', [u.insertId, nombre_barberia]);
    req.session.userId = u.insertId;
    res.redirect('/dashboard');
  } catch (e) { res.status(500).send(e.message); }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { whatsapp, password } = req.body;
    const [u] = await db.query('SELECT * FROM usuarios WHERE whatsapp = ?', [whatsapp]);
    if (u.length > 0 && await bcrypt.compare(password, u[0].password)) {
      req.session.userId = u[0].id;
      return res.redirect('/dashboard');
    }
    res.render('login', { error: 'WhatsApp o contraseña incorrectos.' });
  } catch (e) { res.status(500).send(e.message); }
});

app.listen(process.env.PORT || 3000, () => console.log("Servidor BookBarber Activo"));
