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
  saveUninitialized: true
}));

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306
}).promise();

// --- MIDDLEWARE DE PROTECCIÓN ---
const isAuth = (req, res, next) => {
  if (req.session.userId) return next();
  res.redirect('/login');
};

// --- RUTAS DE NAVEGACIÓN ---
app.get('/', (req, res) => res.redirect('/dashboard'));
app.get('/login', (req, res) => res.render('login'));
app.get('/registro', (req, res) => res.render('registro'));
app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/login'); });

// --- DASHBOARD PRINCIPAL ---
app.get('/dashboard', isAuth, async (req, res) => {
  try {
    const [user] = await db.query('SELECT * FROM usuarios WHERE id = ?', [req.session.userId]);
    const [sucursales] = await db.query('SELECT * FROM sucursales WHERE usuario_id = ?', [req.session.userId]);
    
    const fechaReg = new Date(user[0].fecha_registro);
    const diasPasados = Math.floor((new Date() - fechaReg) / (1000 * 60 * 60 * 24));
    const diasRestantes = Math.max(0, 30 - diasPasados);

    res.render('dashboard', { user: user[0], sucursales, diasRestantes, pagina: 'inicio' });
  } catch (e) { res.status(500).send(e.message); }
});

// --- RUTAS DE SECCIONES (A completar archivos .ejs luego) ---
app.get('/sucursales', isAuth, (req, res) => res.render('sucursales_gestion'));
app.get('/staff', isAuth, (req, res) => res.render('staff'));
app.get('/horarios', isAuth, (req, res) => res.render('horarios'));
app.get('/servicios', isAuth, (req, res) => res.render('servicios'));
app.get('/turnos', isAuth, (req, res) => res.render('turnos'));
app.get('/caja', isAuth, (req, res) => res.render('caja'));

// --- LÓGICA DE AUTENTICACIÓN ---
app.post('/auth/registro', async (req, res) => {
  const { whatsapp, password, nombre_barberia } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const [u] = await db.query('INSERT INTO usuarios (whatsapp, password) VALUES (?, ?)', [whatsapp, hash]);
    await db.query('INSERT INTO sucursales (usuario_id, nombre) VALUES (?, ?)', [u.insertId, nombre_barberia]);
    req.session.userId = u.insertId;
    res.redirect('/dashboard');
  } catch (e) { res.status(500).send("Error: " + e.message); }
});

app.post('/auth/login', async (req, res) => {
  const { whatsapp, password } = req.body;
  const [u] = await db.query('SELECT * FROM usuarios WHERE whatsapp = ?', [whatsapp]);
  if (u.length > 0 && await bcrypt.compare(password, u[0].password)) {
    req.session.userId = u[0].id;
    return res.redirect('/dashboard');
  }
  res.send("Credenciales incorrectas");
});

app.listen(process.env.PORT || 3000, () => console.log("MedinSur Dev Ready"));
