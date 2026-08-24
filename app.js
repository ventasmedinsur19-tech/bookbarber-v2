const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// ======================================================
// CONFIGURACIÓN GENERAL
// ======================================================

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set('view engine', 'ejs');

app.use(express.static('public'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'medinsur_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// ======================================================
// BASE DE DATOS
// ======================================================

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

// ======================================================
// PRECIOS BOOKBARBER
// ======================================================

const PRECIO_BASE = 20000;
const PRECIO_SUCURSAL_EXTRA = 5000;

// ======================================================
// SUBIDA DE IMÁGENES
// ======================================================

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 8 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {

    const permitidos = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp'
    ];

    if (!permitidos.includes(file.mimetype)) {
      return cb(
        new Error(
          'Solo se permiten imágenes JPG, PNG o WEBP.'
        )
      );
    }

    cb(null, true);
  }
});

// ======================================================
// IMÁGENES DE SUCURSALES
// ======================================================

async function guardarImagenSucursal(
  buffer,
  sucursalId,
  tipo
) {

  const carpeta = path.join(
    __dirname,
    'public',
    'uploads',
    'sucursales',
    String(sucursalId)
  );

  await fs.promises.mkdir(
    carpeta,
    { recursive: true }
  );

  const nombreArchivo =
    tipo === 'logo'
      ? 'logo.webp'
      : 'local.webp';

  const rutaFisica = path.join(
    carpeta,
    nombreArchivo
  );

  if (tipo === 'logo') {

    await sharp(buffer)
      .rotate()
      .resize({
        width: 500,
        height: 500,
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({
        quality: 75
      })
      .toFile(rutaFisica);

  } else {

    await sharp(buffer)
      .rotate()
      .resize({
        width: 1400,
        height: 1000,
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({
        quality: 75
      })
      .toFile(rutaFisica);
  }

  return `/uploads/sucursales/${sucursalId}/${nombreArchivo}`;
}

// ======================================================
// IMÁGENES DE BARBEROS
// ======================================================

async function guardarImagenBarbero(
  buffer,
  barberoId
) {

  const carpeta = path.join(
    __dirname,
    'public',
    'uploads',
    'staff',
    String(barberoId)
  );

  await fs.promises.mkdir(
    carpeta,
    { recursive: true }
  );

  const rutaFisica = path.join(
    carpeta,
    'perfil.webp'
  );

  await sharp(buffer)
    .rotate()
    .resize({
      width: 600,
      height: 600,
      fit: 'cover',
      position: 'centre',
      withoutEnlargement: true
    })
    .webp({
      quality: 78
    })
    .toFile(rutaFisica);

  return `/uploads/staff/${barberoId}/perfil.webp`;
}

// ======================================================
// MIDDLEWARE LOGIN
// ======================================================

const isAuth = (req, res, next) => {

  if (req.session.userId) {
    return next();
  }

  return res.redirect('/login');
};

// ======================================================
// PANEL MASTER
// ======================================================

const isAdmin = (req, res, next) => {

  if (req.session.isAdmin) {
    return next();
  }

  const key = req.query.key;

  if (
    process.env.ADMIN_KEY &&
    key &&
    key === process.env.ADMIN_KEY
  ) {

    req.session.isAdmin = true;

    return res.redirect('/admin');
  }

  return res.status(403).send(
    'Acceso no autorizado al panel administrador.'
  );
};

// ======================================================
// FUNCIONES AUXILIARES
// ======================================================

async function obtenerUsuario(userId) {

  const [usuarios] = await db.query(
    `
    SELECT *
    FROM usuarios
    WHERE id = ?
    LIMIT 1
    `,
    [userId]
  );

  return usuarios.length > 0
    ? usuarios[0]
    : null;
}

async function sucursalPerteneceUsuario(
  sucursalId,
  userId
) {

  const [rows] = await db.query(
    `
    SELECT id
    FROM sucursales
    WHERE id = ?
    AND usuario_id = ?
    LIMIT 1
    `,
    [
      sucursalId,
      userId
    ]
  );

  return rows.length > 0;
}

async function barberoPerteneceUsuario(
  barberoId,
  userId
) {

  const [rows] = await db.query(
    `
    SELECT b.id
    FROM barberos b

    INNER JOIN sucursales s
      ON b.sucursal_id = s.id

    WHERE b.id = ?
    AND s.usuario_id = ?

    LIMIT 1
    `,
    [
      barberoId,
      userId
    ]
  );

  return rows.length > 0;
}

// ======================================================
// FUNCIONES DE HORARIOS
// ======================================================

const DIAS_VALIDOS = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo'
];

const MAPA_DIAS = {
  Lun: 'Lunes',
  Mar: 'Martes',
  Mie: 'Miércoles',
  Mié: 'Miércoles',
  Jue: 'Jueves',
  Vie: 'Viernes',
  Sab: 'Sábado',
  Sáb: 'Sábado',
  Dom: 'Domingo'
};

function normalizarDia(dia) {

  const diaCompleto =
    MAPA_DIAS[dia] || dia;

  return DIAS_VALIDOS.includes(diaCompleto)
    ? diaCompleto
    : null;
}

function horaValida(hora) {

  if (!hora) {
    return false;
  }

  return /^([01]\d|2[0-3]):[0-5]\d$/.test(
    hora.substring(0, 5)
  );
}

function rangoValido(inicio, fin) {

  if (
    !horaValida(inicio) ||
    !horaValida(fin)
  ) {
    return false;
  }

  return inicio.substring(0, 5) <
         fin.substring(0, 5);
}

function rangosSeSuperponen(
  inicioA,
  finA,
  inicioB,
  finB
) {

  return (
    inicioA < finB &&
    finA > inicioB
  );
}

async function existeSuperposicionHorario(
  connection,
  barberoId,
  dia,
  horaInicio,
  horaFin,
  excluirId = null
) {

  let sql = `
    SELECT id
    FROM horarios
    WHERE barbero_id = ?
    AND dia = ?
    AND hora_inicio < ?
    AND hora_fin > ?
  `;

  const params = [
    barberoId,
    dia,
    horaFin,
    horaInicio
  ];

  if (excluirId) {

    sql += `
      AND id <> ?
    `;

    params.push(excluirId);
  }

  sql += `
    LIMIT 1
  `;

  const [rows] =
    await connection.query(
      sql,
      params
    );

  return rows.length > 0;
}

// ======================================================
// RUTAS BÁSICAS
// ======================================================

app.get('/', (req, res) => {

  if (req.session.userId) {
    return res.redirect('/dashboard');
  }

  return res.redirect('/login');
});

app.get('/login', (req, res) => {

  if (req.session.userId) {
    return res.redirect('/dashboard');
  }

  res.render('login', {
    error: null
  });
});

app.get('/registro', (req, res) => {

  if (req.session.userId) {
    return res.redirect('/dashboard');
  }

  res.render('registro');
});

app.get('/logout', (req, res) => {

  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// ======================================================
// DASHBOARD
// ======================================================

app.get(
  '/dashboard',
  isAuth,
  async (req, res) => {

    try {

      const user =
        await obtenerUsuario(
          req.session.userId
        );

      if (!user) {

        req.session.destroy(() => {
          res.redirect('/login');
        });

        return;
      }

      const [sucursales] =
        await db.query(
          `
          SELECT *
          FROM sucursales
          WHERE usuario_id = ?
          ORDER BY id ASC
          `,
          [req.session.userId]
        );

      const fechaReg =
        new Date(user.fecha_registro);

      const ahora =
        new Date();

      const diferencia =
        ahora.getTime() -
        fechaReg.getTime();

      const diasTranscurridos =
        Math.floor(
          diferencia /
          (1000 * 60 * 60 * 24)
        );

      const diasRestantes =
        Math.max(
          0,
          30 - diasTranscurridos
        );

      const baseSuscripcion =
        PRECIO_BASE;

      const extras =
        Math.max(
          0,
          sucursales.length - 1
        ) * PRECIO_SUCURSAL_EXTRA;

      const totalMensual =
        baseSuscripcion + extras;

      res.render(
        'dashboard',
        {
          user,
          sucursales,
          diasRestantes,
          totalMensual,
          baseSuscripcion,
          precioSucursalExtra:
            PRECIO_SUCURSAL_EXTRA
        }
      );

    } catch (error) {

      console.error(
        'Error Dashboard:',
        error
      );

      res.status(500).send(
        'Error en dashboard: ' +
        error.message
      );
    }
  }
);

// ======================================================
// LINKS
// ======================================================

app.get(
  '/links',
  isAuth,
  async (req, res) => {

    try {

      const user =
        await obtenerUsuario(
          req.session.userId
        );

      if (!user) {
        return res.redirect('/logout');
      }

      const [sucursales] =
        await db.query(
          `
          SELECT *
          FROM sucursales
          WHERE usuario_id = ?
          ORDER BY id ASC
          `,
          [req.session.userId]
        );

      res.render(
        'links',
        {
          user,
          sucursales
        }
      );

    } catch (error) {

      console.error(
        'Error cargando links:',
        error
      );

      res.status(500).send(
        'Error al cargar los links: ' +
        error.message
      );
    }
  }
);

// ======================================================
// SUCURSALES
// ======================================================

app.get(
  '/sucursales',
  isAuth,
  async (req, res) => {

    try {

      const user =
        await obtenerUsuario(
          req.session.userId
        );

      const [sucursales] =
        await db.query(
          `
          SELECT *
          FROM sucursales
          WHERE usuario_id = ?
          ORDER BY id ASC
          `,
          [req.session.userId]
        );

      res.render(
        'sucursales_gestion',
        {
          user,
          sucursales
        }
      );

    } catch (error) {

      console.error(
        'Error cargando sucursales:',
        error
      );

      res.status(500).send(
        'Error cargando sucursales: ' +
        error.message
      );
    }
  }
);

app.post(
  '/sucursales/guardar',
  isAuth,

  upload.fields([
    {
      name: 'logo',
      maxCount: 1
    },
    {
      name: 'foto_local',
      maxCount: 1
    }
  ]),

  async (req, res) => {

    try {

      const {
        nombre,
        direccion
      } = req.body;

      if (
        !nombre ||
        !nombre.trim()
      ) {

        return res.status(400).send(
          'El nombre de la sucursal es obligatorio.'
        );
      }

      const [resultado] =
        await db.query(
          `
          INSERT INTO sucursales
          (
            usuario_id,
            nombre,
            direccion,
            logo_url,
            foto_url
          )

          VALUES (?, ?, ?, NULL, NULL)
          `,
          [
            req.session.userId,
            nombre.trim(),
            direccion
              ? direccion.trim()
              : null
          ]
        );

      const sucursalId =
        resultado.insertId;

      let logoUrl = null;
      let fotoUrl = null;

      if (
        req.files &&
        req.files.logo &&
        req.files.logo[0]
      ) {

        logoUrl =
          await guardarImagenSucursal(
            req.files.logo[0].buffer,
            sucursalId,
            'logo'
          );
      }

      if (
        req.files &&
        req.files.foto_local &&
        req.files.foto_local[0]
      ) {

        fotoUrl =
          await guardarImagenSucursal(
            req.files.foto_local[0].buffer,
            sucursalId,
            'local'
          );
      }

      if (
        logoUrl ||
        fotoUrl
      ) {

        await db.query(
          `
          UPDATE sucursales

          SET
            logo_url = ?,
            foto_url = ?

          WHERE id = ?
          AND usuario_id = ?
          `,
          [
            logoUrl,
            fotoUrl,
            sucursalId,
            req.session.userId
          ]
        );
      }

      res.redirect('/sucursales');

    } catch (error) {

      console.error(
        'Error guardando sucursal:',
        error
      );

      res.status(500).send(
        'Error guardando sucursal: ' +
        error.message
      );
    }
  }
);

app.post(
  '/sucursales/editar/:id',
  isAuth,

  upload.fields([
    {
      name: 'logo',
      maxCount: 1
    },
    {
      name: 'foto_local',
      maxCount: 1
    }
  ]),

  async (req, res) => {

    try {

      const sucursalId =
        req.params.id;

      const autorizado =
        await sucursalPerteneceUsuario(
          sucursalId,
          req.session.userId
        );

      if (!autorizado) {

        return res.status(403).send(
          'Sucursal no autorizada.'
        );
      }

      const {
        nombre,
        direccion
      } = req.body;

      const [actuales] =
        await db.query(
          `
          SELECT *
          FROM sucursales
          WHERE id = ?
          AND usuario_id = ?
          LIMIT 1
          `,
          [
            sucursalId,
            req.session.userId
          ]
        );

      if (
        actuales.length === 0
      ) {

        return res.status(404).send(
          'Sucursal no encontrada.'
        );
      }

      let logoUrl =
        actuales[0].logo_url;

      let fotoUrl =
        actuales[0].foto_url;

      if (
        req.files &&
        req.files.logo &&
        req.files.logo[0]
      ) {

        logoUrl =
          await guardarImagenSucursal(
            req.files.logo[0].buffer,
            sucursalId,
            'logo'
          );
      }

      if (
        req.files &&
        req.files.foto_local &&
        req.files.foto_local[0]
      ) {

        fotoUrl =
          await guardarImagenSucursal(
            req.files.foto_local[0].buffer,
            sucursalId,
            'local'
          );
      }

      await db.query(
        `
        UPDATE sucursales

        SET
          nombre = ?,
          direccion = ?,
          logo_url = ?,
          foto_url = ?

        WHERE id = ?
        AND usuario_id = ?
        `,
        [
          nombre,
          direccion || null,
          logoUrl,
          fotoUrl,
          sucursalId,
          req.session.userId
        ]
      );

      res.redirect('/sucursales');

    } catch (error) {

      console.error(
        'Error editando sucursal:',
        error
      );

      res.status(500).send(
        'Error editando sucursal: ' +
        error.message
      );
    }
  }
);

app.post(
  '/sucursales/eliminar/:id',
  isAuth,
  async (req, res) => {

    try {

      const sucursalId =
        req.params.id;

      const autorizado =
        await sucursalPerteneceUsuario(
          sucursalId,
          req.session.userId
        );

      if (!autorizado) {

        return res.status(403).send(
          'Sucursal no autorizada.'
        );
      }

      await db.query(
        `
        DELETE FROM sucursales
        WHERE id = ?
        AND usuario_id = ?
        `,
        [
          sucursalId,
          req.session.userId
        ]
      );

      const carpeta =
        path.join(
          __dirname,
          'public',
          'uploads',
          'sucursales',
          String(sucursalId)
        );

      try {

        await fs.promises.rm(
          carpeta,
          {
            recursive: true,
            force: true
          }
        );

      } catch (errorCarpeta) {

        console.error(
          'No se pudo borrar carpeta:',
          errorCarpeta
        );
      }

      res.redirect('/sucursales');

    } catch (error) {

      console.error(
        'Error eliminando sucursal:',
        error
      );

      res.status(500).send(
        'Error eliminando sucursal: ' +
        error.message
      );
    }
  }
);

// ======================================================
// STAFF
// ======================================================

app.get(
  '/staff',
  isAuth,
  async (req, res) => {

    try {

      const user =
        await obtenerUsuario(
          req.session.userId
        );

      const [sucursales] =
        await db.query(
          `
          SELECT *
          FROM sucursales
          WHERE usuario_id = ?
          ORDER BY nombre ASC
          `,
          [req.session.userId]
        );

      const [barberos] =
        await db.query(
          `
          SELECT
            b.*,
            s.nombre AS sucursal_nombre

          FROM barberos b

          INNER JOIN sucursales s
            ON b.sucursal_id = s.id

          WHERE s.usuario_id = ?

          ORDER BY b.nombre ASC
          `,
          [req.session.userId]
        );

      res.render(
        'staff',
        {
          user,
          sucursales,
          barberos
        }
      );

    } catch (error) {

      console.error(
        'Error cargando Staff:',
        error
      );

      res.status(500).send(
        'Error cargando Staff: ' +
        error.message
      );
    }
  }
);

// ======================================================
// CREAR PROFESIONAL
// ======================================================

app.post(
  '/staff/guardar',
  isAuth,
  upload.single('foto'),
  async (req, res) => {

    try {

      const {
        sucursal_id,
        nombre,
        intervalo_minutos
      } = req.body;

      const autorizado =
        await sucursalPerteneceUsuario(
          sucursal_id,
          req.session.userId
        );

      if (!autorizado) {

        return res.status(403).send(
          'Sucursal no autorizada.'
        );
      }

      if (
        !nombre ||
        !nombre.trim()
      ) {

        return res.status(400).send(
          'El nombre del profesional es obligatorio.'
        );
      }

      const intervalosPermitidos = [
        15,
        20,
        30,
        45,
        60
      ];

      let intervalo =
        Number(intervalo_minutos);

      if (
        !intervalosPermitidos.includes(
          intervalo
        )
      ) {
        intervalo = 30;
      }

      const [resultado] =
        await db.query(
          `
          INSERT INTO barberos
          (
            sucursal_id,
            nombre,
            foto_url,
            intervalo_minutos
          )

          VALUES (?, ?, NULL, ?)
          `,
          [
            sucursal_id,
            nombre.trim(),
            intervalo
          ]
        );

      const barberoId =
        resultado.insertId;

      if (req.file) {

        const fotoUrl =
          await guardarImagenBarbero(
            req.file.buffer,
            barberoId
          );

        await db.query(
          `
          UPDATE barberos
          SET foto_url = ?
          WHERE id = ?
          `,
          [
            fotoUrl,
            barberoId
          ]
        );
      }

      res.redirect('/staff');

    } catch (error) {

      console.error(
        'Error guardando profesional:',
        error
      );

      res.status(500).send(
        'Error guardando profesional: ' +
        error.message
      );
    }
  }
);

// ======================================================
// EDITAR PROFESIONAL
// ======================================================

app.post(
  '/staff/editar/:id',
  isAuth,
  upload.single('foto'),
  async (req, res) => {

    try {

      const barberoId =
        req.params.id;

      const {
        sucursal_id,
        nombre,
        intervalo_minutos
      } = req.body;

      const barberoAutorizado =
        await barberoPerteneceUsuario(
          barberoId,
          req.session.userId
        );

      if (!barberoAutorizado) {

        return res.status(403).send(
          'Profesional no autorizado.'
        );
      }

      const sucursalAutorizada =
        await sucursalPerteneceUsuario(
          sucursal_id,
          req.session.userId
        );

      if (!sucursalAutorizada) {

        return res.status(403).send(
          'Sucursal no autorizada.'
        );
      }

      const [actuales] =
        await db.query(
          `
          SELECT b.*
          FROM barberos b

          INNER JOIN sucursales s
            ON b.sucursal_id = s.id

          WHERE b.id = ?
          AND s.usuario_id = ?

          LIMIT 1
          `,
          [
            barberoId,
            req.session.userId
          ]
        );

      if (
        actuales.length === 0
      ) {

        return res.status(404).send(
          'Profesional no encontrado.'
        );
      }

      const intervalosPermitidos = [
        15,
        20,
        30,
        45,
        60
      ];

      let intervalo =
        Number(intervalo_minutos);

      if (
        !intervalosPermitidos.includes(
          intervalo
        )
      ) {
        intervalo = 30;
      }

      let fotoUrl =
        actuales[0].foto_url;

      if (req.file) {

        fotoUrl =
          await guardarImagenBarbero(
            req.file.buffer,
            barberoId
          );
      }

      await db.query(
        `
        UPDATE barberos

        SET
          sucursal_id = ?,
          nombre = ?,
          foto_url = ?,
          intervalo_minutos = ?

        WHERE id = ?
        `,
        [
          sucursal_id,
          nombre.trim(),
          fotoUrl,
          intervalo,
          barberoId
        ]
      );

      res.redirect('/staff');

    } catch (error) {

      console.error(
        'Error editando profesional:',
        error
      );

      res.status(500).send(
        'Error editando profesional: ' +
        error.message
      );
    }
  }
);

// ======================================================
// ELIMINAR PROFESIONAL
// ======================================================

app.post(
  '/staff/eliminar/:id',
  isAuth,
  async (req, res) => {

    let connection;

    try {

      const barberoId =
        req.params.id;

      const autorizado =
        await barberoPerteneceUsuario(
          barberoId,
          req.session.userId
        );

      if (!autorizado) {

        return res.status(403).send(
          'Profesional no autorizado.'
        );
      }

      connection =
        await db.getConnection();

      await connection.beginTransaction();

      await connection.query(
        `
        DELETE FROM horarios
        WHERE barbero_id = ?
        `,
        [barberoId]
      );

      await connection.query(
        `
        DELETE b
        FROM barberos b

        INNER JOIN sucursales s
          ON b.sucursal_id = s.id

        WHERE b.id = ?
        AND s.usuario_id = ?
        `,
        [
          barberoId,
          req.session.userId
        ]
      );

      await connection.commit();

      connection.release();
      connection = null;

      const carpeta =
        path.join(
          __dirname,
          'public',
          'uploads',
          'staff',
          String(barberoId)
        );

      try {

        await fs.promises.rm(
          carpeta,
          {
            recursive: true,
            force: true
          }
        );

      } catch (errorCarpeta) {

        console.error(
          'No se pudo borrar la foto del profesional:',
          errorCarpeta
        );
      }

      res.redirect('/staff');

    } catch (error) {

      if (connection) {

        try {
          await connection.rollback();
        } catch (_) {}

        connection.release();
      }

      console.error(
        'Error eliminando profesional:',
        error
      );

      res.status(500).send(
        'Error eliminando profesional: ' +
        error.message
      );
    }
  }
);

// ======================================================
// SERVICIOS
// ======================================================

app.get(
  '/servicios',
  isAuth,
  async (req, res) => {

    try {

      const user =
        await obtenerUsuario(
          req.session.userId
        );

      const [sucursales] =
        await db.query(
          `
          SELECT *
          FROM sucursales
          WHERE usuario_id = ?
          ORDER BY nombre ASC
          `,
          [req.session.userId]
        );

      const [servicios] =
        await db.query(
          `
          SELECT
            ser.*,
            s.nombre AS sucursal_nombre

          FROM servicios ser

          INNER JOIN sucursales s
            ON ser.sucursal_id = s.id

          WHERE s.usuario_id = ?

          ORDER BY ser.nombre ASC
          `,
          [req.session.userId]
        );

      res.render(
        'servicios_gestion',
        {
          user,
          sucursales,
          servicios
        }
      );

    } catch (error) {

      console.error(error);

      res.status(500).send(
        'Error cargando servicios: ' +
        error.message
      );
    }
  }
);

app.post(
  '/servicios/guardar',
  isAuth,
  async (req, res) => {

    try {

      const {
        sucursal_id,
        nombre,
        precio
      } = req.body;

      const duracionMinutos =
        req.body.duracion_minutos ||
        req.body.duracion;

      const autorizado =
        await sucursalPerteneceUsuario(
          sucursal_id,
          req.session.userId
        );

      if (!autorizado) {

        return res.status(403).send(
          'Sucursal no autorizada.'
        );
      }

      await db.query(
        `
        INSERT INTO servicios
        (
          sucursal_id,
          nombre,
          precio,
          duracion_minutos
        )

        VALUES (?, ?, ?, ?)
        `,
        [
          sucursal_id,
          nombre,
          precio,
          duracionMinutos || null
        ]
      );

      res.redirect('/servicios');

    } catch (error) {

      console.error(error);

      res.status(500).send(
        'Error guardando servicio: ' +
        error.message
      );
    }
  }
);

app.post(
  '/servicios/editar/:id',
  isAuth,
  async (req, res) => {

    try {

      const {
        nombre,
        precio
      } = req.body;

      const duracionMinutos =
        req.body.duracion_minutos ||
        req.body.duracion;

      await db.query(
        `
        UPDATE servicios ser

        INNER JOIN sucursales s
          ON ser.sucursal_id = s.id

        SET
          ser.nombre = ?,
          ser.precio = ?,
          ser.duracion_minutos = ?

        WHERE ser.id = ?
        AND s.usuario_id = ?
        `,
        [
          nombre,
          precio,
          duracionMinutos || null,
          req.params.id,
          req.session.userId
        ]
      );

      res.redirect('/servicios');

    } catch (error) {

      console.error(error);

      res.status(500).send(
        'Error editando servicio: ' +
        error.message
      );
    }
  }
);

app.post(
  '/servicios/eliminar/:id',
  isAuth,
  async (req, res) => {

    try {

      await db.query(
        `
        DELETE ser

        FROM servicios ser

        INNER JOIN sucursales s
          ON ser.sucursal_id = s.id

        WHERE ser.id = ?
        AND s.usuario_id = ?
        `,
        [
          req.params.id,
          req.session.userId
        ]
      );

      res.redirect('/servicios');

    } catch (error) {

      console.error(error);

      res.status(500).send(
        'Error eliminando servicio: ' +
        error.message
      );
    }
  }
);

// ======================================================
// HORARIOS
// ======================================================

app.get(
  '/horarios',
  isAuth,
  async (req, res) => {

    try {

      const user =
        await obtenerUsuario(
          req.session.userId
        );

      const [barberos] =
        await db.query(
          `
          SELECT
            b.id,
            b.nombre,
            b.sucursal_id,
            b.intervalo_minutos,
            s.nombre AS sucursal_nombre

          FROM barberos b

          INNER JOIN sucursales s
            ON b.sucursal_id = s.id

          WHERE s.usuario_id = ?

          ORDER BY
            s.nombre ASC,
            b.nombre ASC
          `,
          [req.session.userId]
        );

      const [horarios] =
        await db.query(
          `
          SELECT
            h.*,
            b.nombre AS barbero_nombre,
            b.intervalo_minutos,
            s.id AS sucursal_id,
            s.nombre AS sucursal_nombre

          FROM horarios h

          INNER JOIN barberos b
            ON h.barbero_id = b.id

          INNER JOIN sucursales s
            ON b.sucursal_id = s.id

          WHERE s.usuario_id = ?

          ORDER BY
            s.nombre ASC,
            b.nombre ASC,
            FIELD(
              h.dia,
              'Lunes',
              'Martes',
              'Miércoles',
              'Jueves',
              'Viernes',
              'Sábado',
              'Domingo'
            ),
            h.hora_inicio ASC
          `,
          [req.session.userId]
        );

      res.render(
        'horarios',
        {
          user,
          barberos,
          horarios,
          error: req.query.error || null,
          ok: req.query.ok || null
        }
      );

    } catch (error) {

      console.error(
        'Error cargando horarios:',
        error
      );

      res.status(500).send(
        'Error cargando horarios: ' +
        error.message
      );
    }
  }
);

// ======================================================
// GUARDAR HORARIOS
// ======================================================

app.post(
  '/horarios/guardar',
  isAuth,
  async (req, res) => {

    let connection;

    try {

      const {
        barbero_id,
        dias,
        inicio_1,
        fin_1,
        inicio_2,
        fin_2
      } = req.body;

      const autorizado =
        await barberoPerteneceUsuario(
          barbero_id,
          req.session.userId
        );

      if (!autorizado) {

        return res.redirect(
          '/horarios?error=' +
          encodeURIComponent(
            'El profesional seleccionado no es válido.'
          )
        );
      }

      let diasSeleccionados = [];

      if (Array.isArray(dias)) {

        diasSeleccionados =
          dias;

      } else if (dias) {

        diasSeleccionados =
          [dias];
      }

      diasSeleccionados =
        diasSeleccionados
          .map(normalizarDia)
          .filter(Boolean);

      diasSeleccionados = [
        ...new Set(
          diasSeleccionados
        )
      ];

      if (
        diasSeleccionados.length === 0
      ) {

        return res.redirect(
          '/horarios?error=' +
          encodeURIComponent(
            'Seleccioná al menos un día de trabajo.'
          )
        );
      }

      if (
        !rangoValido(
          inicio_1,
          fin_1
        )
      ) {

        return res.redirect(
          '/horarios?error=' +
          encodeURIComponent(
            'El primer horario no es válido. La hora de salida debe ser posterior a la hora de entrada.'
          )
        );
      }

      const segundoIncompleto =
        (
          inicio_2 &&
          !fin_2
        ) ||
        (
          !inicio_2 &&
          fin_2
        );

      if (segundoIncompleto) {

        return res.redirect(
          '/horarios?error=' +
          encodeURIComponent(
            'Completá tanto el inicio como el fin del segundo horario.'
          )
        );
      }

      const tieneSegundoRango =
        Boolean(
          inicio_2 &&
          fin_2
        );

      if (
        tieneSegundoRango &&
        !rangoValido(
          inicio_2,
          fin_2
        )
      ) {

        return res.redirect(
          '/horarios?error=' +
          encodeURIComponent(
            'El segundo horario no es válido. La hora de salida debe ser posterior a la hora de entrada.'
          )
        );
      }

      if (
        tieneSegundoRango &&
        rangosSeSuperponen(
          inicio_1,
          fin_1,
          inicio_2,
          fin_2
        )
      ) {

        return res.redirect(
          '/horarios?error=' +
          encodeURIComponent(
            'El primer y segundo horario se superponen.'
          )
        );
      }

      connection =
        await db.getConnection();

      await connection.beginTransaction();

      for (
        const dia
        of diasSeleccionados
      ) {

        const existePrimerRango =
          await existeSuperposicionHorario(
            connection,
            barbero_id,
            dia,
            inicio_1,
            fin_1
          );

        if (existePrimerRango) {

          throw new Error(
            `${dia}: el horario ${inicio_1} - ${fin_1} se superpone con otro horario ya cargado.`
          );
        }

        if (tieneSegundoRango) {

          const existeSegundoRango =
            await existeSuperposicionHorario(
              connection,
              barbero_id,
              dia,
              inicio_2,
              fin_2
            );

          if (existeSegundoRango) {

            throw new Error(
              `${dia}: el horario ${inicio_2} - ${fin_2} se superpone con otro horario ya cargado.`
            );
          }
        }
      }

      for (
        const dia
        of diasSeleccionados
      ) {

        await connection.query(
          `
          INSERT INTO horarios
          (
            barbero_id,
            dia,
            hora_inicio,
            hora_fin
          )

          VALUES (?, ?, ?, ?)
          `,
          [
            barbero_id,
            dia,
            inicio_1,
            fin_1
          ]
        );

        if (tieneSegundoRango) {

          await connection.query(
            `
            INSERT INTO horarios
            (
              barbero_id,
              dia,
              hora_inicio,
              hora_fin
            )

            VALUES (?, ?, ?, ?)
            `,
            [
              barbero_id,
              dia,
              inicio_2,
              fin_2
            ]
          );
        }
      }

      await connection.commit();

      connection.release();
      connection = null;

      res.redirect(
        '/horarios?ok=' +
        encodeURIComponent(
          'Horarios guardados correctamente.'
        )
      );

    } catch (error) {

      if (connection) {

        try {
          await connection.rollback();
        } catch (_) {}

        connection.release();
      }

      console.error(
        'Error guardando horarios:',
        error
      );

      res.redirect(
        '/horarios?error=' +
        encodeURIComponent(
          error.message ||
          'No se pudieron guardar los horarios.'
        )
      );
    }
  }
);

// ======================================================
// EDITAR HORARIO
// ======================================================

app.post(
  '/horarios/editar/:id',
  isAuth,
  async (req, res) => {

    try {

      const horarioId =
        req.params.id;

      const {
        dia,
        hora_inicio,
        hora_fin
      } = req.body;

      const diaNormalizado =
        normalizarDia(dia);

      if (!diaNormalizado) {

        return res.redirect(
          '/horarios?error=' +
          encodeURIComponent(
            'El día seleccionado no es válido.'
          )
        );
      }

      if (
        !rangoValido(
          hora_inicio,
          hora_fin
        )
      ) {

        return res.redirect(
          '/horarios?error=' +
          encodeURIComponent(
            'La hora de salida debe ser posterior a la hora de entrada.'
          )
        );
      }

      const [horariosActuales] =
        await db.query(
          `
          SELECT
            h.id,
            h.barbero_id

          FROM horarios h

          INNER JOIN barberos b
            ON h.barbero_id = b.id

          INNER JOIN sucursales s
            ON b.sucursal_id = s.id

          WHERE h.id = ?
          AND s.usuario_id = ?

          LIMIT 1
          `,
          [
            horarioId,
            req.session.userId
          ]
        );

      if (
        horariosActuales.length === 0
      ) {

        return res.redirect(
          '/horarios?error=' +
          encodeURIComponent(
            'Horario no encontrado.'
          )
        );
      }

      const barberoId =
        horariosActuales[0].barbero_id;

      const existeConflicto =
        await existeSuperposicionHorario(
          db,
          barberoId,
          diaNormalizado,
          hora_inicio,
          hora_fin,
          horarioId
        );

      if (existeConflicto) {

        return res.redirect(
          '/horarios?error=' +
          encodeURIComponent(
            'Ese horario se superpone con otro rango ya cargado para el profesional.'
          )
        );
      }

      await db.query(
        `
        UPDATE horarios h

        INNER JOIN barberos b
          ON h.barbero_id = b.id

        INNER JOIN sucursales s
          ON b.sucursal_id = s.id

        SET
          h.dia = ?,
          h.hora_inicio = ?,
          h.hora_fin = ?

        WHERE h.id = ?
        AND s.usuario_id = ?
        `,
        [
          diaNormalizado,
          hora_inicio,
          hora_fin,
          horarioId,
          req.session.userId
        ]
      );

      res.redirect(
        '/horarios?ok=' +
        encodeURIComponent(
          'Horario actualizado correctamente.'
        )
      );

    } catch (error) {

      console.error(
        'Error editando horario:',
        error
      );

      res.redirect(
        '/horarios?error=' +
        encodeURIComponent(
          'No se pudo editar el horario.'
        )
      );
    }
  }
);

// ======================================================
// ELIMINAR HORARIO
// ======================================================

app.post(
  '/horarios/eliminar/:id',
  isAuth,
  async (req, res) => {

    try {

      const [resultado] =
        await db.query(
          `
          DELETE h

          FROM horarios h

          INNER JOIN barberos b
            ON h.barbero_id = b.id

          INNER JOIN sucursales s
            ON b.sucursal_id = s.id

          WHERE h.id = ?
          AND s.usuario_id = ?
          `,
          [
            req.params.id,
            req.session.userId
          ]
        );

      if (
        resultado.affectedRows === 0
      ) {

        return res.redirect(
          '/horarios?error=' +
          encodeURIComponent(
            'Horario no encontrado.'
          )
        );
      }

      res.redirect(
        '/horarios?ok=' +
        encodeURIComponent(
          'Horario eliminado.'
        )
      );

    } catch (error) {

      console.error(
        'Error eliminando horario:',
        error
      );

      res.redirect(
        '/horarios?error=' +
        encodeURIComponent(
          'No se pudo eliminar el horario.'
        )
      );
    }
  }
);

// ======================================================
// TURNOS
// ======================================================

app.get(
  '/turnos',
  isAuth,
  async (req, res) => {

    try {

      const user =
        await obtenerUsuario(
          req.session.userId
        );

      const [barberos] =
        await db.query(
          `
          SELECT
            b.id,
            b.nombre,
            b.sucursal_id,
            s.nombre AS sucursal_nombre

          FROM barberos b

          INNER JOIN sucursales s
            ON b.sucursal_id = s.id

          WHERE s.usuario_id = ?

          ORDER BY b.nombre ASC
          `,
          [req.session.userId]
        );

      const [servicios] =
        await db.query(
          `
          SELECT
            ser.id,
            ser.nombre,
            ser.precio,
            ser.duracion_minutos,
            ser.sucursal_id,
            s.nombre AS sucursal_nombre

          FROM servicios ser

          INNER JOIN sucursales s
            ON ser.sucursal_id = s.id

          WHERE s.usuario_id = ?

          ORDER BY ser.nombre ASC
          `,
          [req.session.userId]
        );

      const [turnos] =
        await db.query(
          `
          SELECT
            t.*,
            b.nombre AS barbero_nombre,
            ser.nombre AS servicio_nombre,
            ser.precio,
            ser.duracion_minutos,
            s.nombre AS sucursal_nombre

          FROM turnos t

          INNER JOIN barberos b
            ON t.barbero_id = b.id

          INNER JOIN servicios ser
            ON t.servicio_id = ser.id

          INNER JOIN sucursales s
            ON b.sucursal_id = s.id

          WHERE s.usuario_id = ?

          ORDER BY
            t.fecha DESC,
            t.hora DESC,
            t.id DESC
          `,
          [req.session.userId]
        );

      res.render(
        'turnos',
        {
          user,
          barberos,
          servicios,
          turnos
        }
      );

    } catch (error) {

      console.error(error);

      res.status(500).send(
        'Error al cargar turnos: ' +
        error.message
      );
    }
  }
);

app.post(
  '/turnos/guardar',
  isAuth,
  async (req, res) => {

    try {

      const {
        barbero_id,
        servicio_id,
        cliente_nombre,
        cliente_whatsapp,
        fecha,
        hora
      } = req.body;

      const [validacion] =
        await db.query(
          `
          SELECT
            b.id AS barbero_id,
            b.sucursal_id AS sucursal_barbero,
            ser.id AS servicio_id,
            ser.sucursal_id AS sucursal_servicio

          FROM barberos b

          INNER JOIN sucursales s
            ON b.sucursal_id = s.id

          INNER JOIN servicios ser
            ON ser.id = ?

          WHERE b.id = ?
          AND s.usuario_id = ?

          LIMIT 1
          `,
          [
            servicio_id,
            barbero_id,
            req.session.userId
          ]
        );

      if (
        validacion.length === 0
      ) {

        return res.status(403).send(
          'Barbero o servicio no autorizado.'
        );
      }

      if (
        Number(
          validacion[0].sucursal_barbero
        ) !==
        Number(
          validacion[0].sucursal_servicio
        )
      ) {

        return res.status(400).send(
          'El barbero y el servicio deben pertenecer a la misma sucursal.'
        );
      }

      await db.query(
        `
        INSERT INTO turnos
        (
          barbero_id,
          servicio_id,
          cliente_nombre,
          cliente_whatsapp,
          fecha,
          hora,
          fecha_hora,
          estado
        )

        VALUES
        (
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          CONCAT(?, ' ', ?),
          'pendiente'
        )
        `,
        [
          barbero_id,
          servicio_id,
          cliente_nombre,
          cliente_whatsapp || null,
          fecha,
          hora,
          fecha,
          hora
        ]
      );

      res.redirect('/turnos');

    } catch (error) {

      console.error(error);

      res.status(500).send(
        'Error guardando turno: ' +
        error.message
      );
    }
  }
);

app.post(
  '/turnos/estado',
  isAuth,
  async (req, res) => {

    try {

      const {
        turno_id,
        nuevo_estado
      } = req.body;

      let estado =
        nuevo_estado;

      if (
        estado === 'completado' ||
        estado === 'completo' ||
        estado === 'finalizado'
      ) {

        estado = 'exito';
      }

      const estadosPermitidos = [
        'pendiente',
        'exito',
        'cancelado'
      ];

      if (
        !estadosPermitidos.includes(
          estado
        )
      ) {

        return res.status(400).send(
          'Estado de turno inválido.'
        );
      }

      await db.query(
        `
        UPDATE turnos t

        INNER JOIN barberos b
          ON t.barbero_id = b.id

        INNER JOIN sucursales s
          ON b.sucursal_id = s.id

        SET t.estado = ?

        WHERE t.id = ?
        AND s.usuario_id = ?
        `,
        [
          estado,
          turno_id,
          req.session.userId
        ]
      );

      res.redirect('/turnos');

    } catch (error) {

      console.error(error);

      res.status(500).send(
        'Error cambiando estado: ' +
        error.message
      );
    }
  }
);

app.post(
  '/turnos/eliminar/:id',
  isAuth,
  async (req, res) => {

    try {

      await db.query(
        `
        DELETE t

        FROM turnos t

        INNER JOIN barberos b
          ON t.barbero_id = b.id

        INNER JOIN sucursales s
          ON b.sucursal_id = s.id

        WHERE t.id = ?
        AND s.usuario_id = ?
        `,
        [
          req.params.id,
          req.session.userId
        ]
      );

      res.redirect('/turnos');

    } catch (error) {

      console.error(error);

      res.status(500).send(
        'Error eliminando turno: ' +
        error.message
      );
    }
  }
);

// ======================================================
// CAJA Y RANKING
// ======================================================

app.get(
  '/caja',
  isAuth,
  async (req, res) => {

    try {

      const user =
        await obtenerUsuario(
          req.session.userId
        );

      const [resultados] =
        await db.query(
          `
          SELECT

            t.id,
            t.fecha,
            t.hora,
            t.fecha_hora,
            t.estado,

            suc.id AS sucursal_id,
            suc.nombre AS sucursal_nombre,

            b.id AS barbero_id,
            b.nombre AS barbero_nombre,

            ser.id AS servicio_id,
            ser.nombre AS servicio_nombre,
            ser.precio

          FROM turnos t

          INNER JOIN barberos b
            ON t.barbero_id = b.id

          INNER JOIN sucursales suc
            ON b.sucursal_id = suc.id

          INNER JOIN servicios ser
            ON t.servicio_id = ser.id

          WHERE t.estado = 'exito'
          AND suc.usuario_id = ?

          ORDER BY
            t.fecha DESC,
            t.hora DESC,
            t.id DESC
          `,
          [req.session.userId]
        );

      const sucursales = [
        ...new Set(
          resultados.map(
            resultado =>
              resultado.sucursal_nombre
          )
        )
      ];

      res.render(
        'caja_ranking',
        {
          user,
          turnosFacturados: resultados,
          sucursales
        }
      );

    } catch (error) {

      console.error(
        'Error Caja:',
        error
      );

      res.status(500).send(
        'Error en Caja: ' +
        error.message
      );
    }
  }
);

// ======================================================
// RESERVA PÚBLICA
// ======================================================

app.get(
  '/b/:id',
  async (req, res) => {

    try {

      const sucursalId =
        req.params.id;

      const [sucursales] =
        await db.query(
          `
          SELECT *
          FROM sucursales
          WHERE id = ?
          LIMIT 1
          `,
          [sucursalId]
        );

      if (
        sucursales.length === 0
      ) {

        return res.status(404).send(
          'Barbería no encontrada.'
        );
      }

      const [barberos] =
        await db.query(
          `
          SELECT *
          FROM barberos
          WHERE sucursal_id = ?
          ORDER BY nombre ASC
          `,
          [sucursalId]
        );

      const [servicios] =
        await db.query(
          `
          SELECT *
          FROM servicios
          WHERE sucursal_id = ?
          ORDER BY nombre ASC
          `,
          [sucursalId]
        );

      res.render(
        'reserva_publica',
        {
          sucursal:
            sucursales[0],
          barberos,
          servicios
        }
      );

    } catch (error) {

      console.error(
        'Error reserva pública:',
        error
      );

      res.status(500).send(
        'Error cargando barbería: ' +
        error.message
      );
    }
  }
);

// ======================================================
// REGISTRO
// ======================================================

app.post(
  '/auth/registro',
  async (req, res) => {

    let connection;

    try {

      const {
        whatsapp,
        password,
        nombre_barberia
      } = req.body;

      if (
        !whatsapp ||
        !password ||
        !nombre_barberia
      ) {

        return res.status(400).send(
          'Todos los campos obligatorios deben completarse.'
        );
      }

      connection =
        await db.getConnection();

      await connection.beginTransaction();

      const [existentes] =
        await connection.query(
          `
          SELECT id
          FROM usuarios
          WHERE whatsapp = ?
          LIMIT 1
          `,
          [whatsapp]
        );

      if (
        existentes.length > 0
      ) {

        await connection.rollback();

        connection.release();
        connection = null;

        return res.status(400).send(
          'Ese WhatsApp ya está registrado.'
        );
      }

      const hash =
        await bcrypt.hash(
          password,
          10
        );

      const [resultadoUsuario] =
        await connection.query(
          `
          INSERT INTO usuarios
          (
            whatsapp,
            password
          )

          VALUES (?, ?)
          `,
          [
            whatsapp,
            hash
          ]
        );

      await connection.query(
        `
        INSERT INTO sucursales
        (
          usuario_id,
          nombre
        )

        VALUES (?, ?)
        `,
        [
          resultadoUsuario.insertId,
          nombre_barberia
        ]
      );

      await connection.commit();

      connection.release();
      connection = null;

      req.session.userId =
        resultadoUsuario.insertId;

      res.redirect('/dashboard');

    } catch (error) {

      if (connection) {

        try {
          await connection.rollback();
        } catch (_) {}

        connection.release();
      }

      console.error(
        'Error Registro:',
        error
      );

      res.status(500).send(
        'Error al registrar usuario: ' +
        error.message
      );
    }
  }
);

// ======================================================
// LOGIN
// ======================================================

app.post(
  '/auth/login',
  async (req, res) => {

    try {

      const {
        whatsapp,
        password
      } = req.body;

      const [usuarios] =
        await db.query(
          `
          SELECT *
          FROM usuarios
          WHERE whatsapp = ?
          LIMIT 1
          `,
          [whatsapp]
        );

      if (
        usuarios.length === 0
      ) {

        return res.render(
          'login',
          {
            error:
              'WhatsApp o contraseña incorrectos.'
          }
        );
      }

      const usuario =
        usuarios[0];

      if (
        usuario.estado ===
        'bloqueado'
      ) {

        return res.render(
          'login',
          {
            error:
              'Esta cuenta se encuentra bloqueada. Contactá con BookBarber.'
          }
        );
      }

      const passwordCorrecta =
        await bcrypt.compare(
          password,
          usuario.password
        );

      if (!passwordCorrecta) {

        return res.render(
          'login',
          {
            error:
              'WhatsApp o contraseña incorrectos.'
          }
        );
      }

      req.session.userId =
        usuario.id;

      res.redirect('/dashboard');

    } catch (error) {

      console.error(
        'Error Login:',
        error
      );

      res.status(500).send(
        'Error iniciando sesión: ' +
        error.message
      );
    }
  }
);

// ======================================================
// ADMIN
// ======================================================

app.get(
  '/admin',
  isAdmin,
  async (req, res) => {

    try {

      const [usuarios] =
        await db.query(
          `
          SELECT

            u.*,

            (
              SELECT COUNT(*)
              FROM sucursales s
              WHERE s.usuario_id = u.id
            ) AS total_sucursales,

            (
              SELECT s2.nombre
              FROM sucursales s2
              WHERE s2.usuario_id = u.id
              ORDER BY s2.id ASC
              LIMIT 1
            ) AS barberia_principal

          FROM usuarios u

          ORDER BY u.id DESC
          `
        );

      res.render(
        'admin',
        {
          usuarios,
          precioBase:
            PRECIO_BASE,
          precioSucursalExtra:
            PRECIO_SUCURSAL_EXTRA
        }
      );

    } catch (error) {

      console.error(
        'Error Admin:',
        error
      );

      res.status(500).send(
        'Error cargando panel administrador: ' +
        error.message
      );
    }
  }
);

app.post(
  '/admin/usuarios/:id/estado',
  isAdmin,
  async (req, res) => {

    try {

      const usuarioId =
        req.params.id;

      const {
        estado
      } = req.body;

      const estadosPermitidos = [
        'prueba',
        'activo',
        'bloqueado'
      ];

      if (
        !estadosPermitidos.includes(
          estado
        )
      ) {

        return res.status(400).send(
          'Estado de usuario inválido.'
        );
      }

      const [resultado] =
        await db.query(
          `
          UPDATE usuarios
          SET estado = ?
          WHERE id = ?
          `,
          [
            estado,
            usuarioId
          ]
        );

      if (
        resultado.affectedRows === 0
      ) {

        return res.status(404).send(
          'Usuario no encontrado.'
        );
      }

      res.redirect('/admin');

    } catch (error) {

      console.error(
        'Error cambiando estado:',
        error
      );

      res.status(500).send(
        'Error actualizando usuario: ' +
        error.message
      );
    }
  }
);

app.get(
  '/admin/logout',
  (req, res) => {

    req.session.isAdmin = false;

    res.redirect('/login');
  }
);

// ======================================================
// ERRORES DE SUBIDA
// ======================================================

app.use(
  (error, req, res, next) => {

    if (
      error instanceof
      multer.MulterError
    ) {

      if (
        error.code ===
        'LIMIT_FILE_SIZE'
      ) {

        return res.status(400).send(
          'La imagen es demasiado pesada. Máximo permitido: 8 MB.'
        );
      }

      return res.status(400).send(
        'Error subiendo imagen: ' +
        error.message
      );
    }

    if (
      error &&
      error.message &&
      error.message.includes(
        'Solo se permiten imágenes'
      )
    ) {

      return res.status(400).send(
        error.message
      );
    }

    next(error);
  }
);

// ======================================================
// 404
// ======================================================

app.use(
  (req, res) => {

    res.status(404).send(
      'Página no encontrada.'
    );
  }
);

// ======================================================
// SERVIDOR
// ======================================================

const PORT =
  process.env.PORT || 3000;

app.listen(
  PORT,
  () => {

    console.log(
      `BookBarber V2 activo en puerto ${PORT}`
    );
  }
);
