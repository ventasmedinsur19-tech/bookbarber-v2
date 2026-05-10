// ... (Importaciones iniciales iguales: express, mongoose, bcrypt, jwt, etc.)

// --- MODELOS PROFESIONALES ---
const SucursalSchema = new mongoose.Schema({
    ownerId: mongoose.Schema.Types.ObjectId,
    nombre: String,
    direccion: String,
    foto: String,
    logo: String
});
const Sucursal = mongoose.model('Sucursal', SucursalSchema);

// --- RUTA DEL DASHBOARD (HTML) ---
app.get('/dashboard', (req, res) => {
    // Aquí serviremos la interfaz con Sidebar
    res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Panel BookBarber</title>
        <style>
            body { margin: 0; display: flex; font-family: sans-serif; background: #f0f2f5; }
            .sidebar { width: 250px; height: 100vh; background: #1a1a1a; color: white; position: fixed; }
            .content { margin-left: 250px; padding: 20px; width: 100%; }
            .nav-item { padding: 15px 20px; cursor: pointer; border-bottom: 1px solid #333; transition: 0.3s; }
            .nav-item:hover { background: #333; }
            .header-info { background: #fff; padding: 15px; border-radius: 10px; margin-bottom: 20px; border-left: 5px solid #ff4757; }
            .card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
            .btn-wa { background: #25d366; color: white; padding: 10px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px; }
        </style>
    </head>
    <body>
        <div class="sidebar">
            <div style="padding: 20px; text-align: center; font-weight: bold; border-bottom: 1px solid #333;">BOOKBARBER V2</div>
            <div class="nav-item" onclick="show('sucursales')">📍 Sucursales</div>
            <div class="nav-item" onclick="show('equipo')">👥 Barberos</div>
            <div class="nav-item" onclick="show('horarios')">🕒 Horarios</div>
            <div class="nav-item" onclick="show('servicios')">✂️ Servicios</div>
            <div class="nav-item" onclick="show('turnos')">📅 Agenda de Turnos</div>
            <div class="nav-item" onclick="show('links')">🔗 Links de Reserva</div>
            <div class="nav-item" onclick="show('metricas')">📈 Métricas</div>
            <div style="position: absolute; bottom: 0; width: 100%; border-top: 1px solid #333;">
                <div class="nav-item" style="color: #00d2ff;" onclick="window.open('https://wa.me/5493513009673')">💬 Soporte Técnico</div>
            </div>
        </div>

        <div class="content">
            <div class="header-info">
                <strong>Prueba gratis: 25 días restantes</strong><br>
                <small>Suscripción mensual: $15.000</small><br>
                <a href="https://wa.me/5493515920795" class="btn-wa">Pagar Suscripción</a>
            </div>

            <div id="main-view" class="card">
                <h2>Bienvenido a tu Panel</h2>
                <p>Selecciona una opción del menú para comenzar a configurar tu barbería.</p>
            </div>
        </div>

        <script>
            function show(view) {
                const views = {
                    'sucursales': '<h2>Mis Sucursales</h2><p style="color:red">Añadir nueva sucursal tiene un costo de $5.000 extra.</p><button>+ Nueva Sucursal</button>',
                    'equipo': '<h2>Equipo de Barberos</h2><p>Selecciona sucursal para gestionar personal.</p>',
                    'horarios': '<h2>Horarios</h2><p>Ej: Lun a Vie 10hs a 13hs y 17hs a 21hs</p>',
                    'links': '<h2>Tus Enlaces de Reserva</h2><p>Copia estos links y pégalos en tu Instagram o WhatsApp.</p>'
                };
                document.getElementById('main-view').innerHTML = views[view] || '<h2>Próximamente</h2>';
            }
        </script>
    </body>
    </html>
    `);
});
