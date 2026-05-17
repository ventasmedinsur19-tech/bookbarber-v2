<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agenda de Turnos | BookBarber Online</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap" rel="stylesheet">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: { sans: ['Inter', 'sans-serif'] },
                    colors: {
                        bbDark: '#0a0a0a',
                        bbCard: '#141414',
                        bbBorder: '#262626',
                        bbAccent: '#f97316'
                    }
                }
            }
        }
    </script>
    <style>
        body { background-color: #0a0a0a; color: #e5e5e5; }
        .glass-card { background: rgba(20, 20, 20, 0.7); backdrop-filter: blur(10px); border: 1px solid #262626; }
        select option { background-color: #141414; color: #fff; }
    </style>
</head>
<body class="font-sans antialiased min-h-screen p-4 md:p-8">
    <div class="max-w-6xl mx-auto">
        
        <div class="flex items-center gap-4 mb-10 border-b border-bbBorder pb-6">
            <a href="/dashboard" class="flex items-center justify-center w-10 h-10 rounded-xl bg-bbBorder text-gray-400 hover:text-bbAccent hover:bg-bbAccent/10 transition-all">
                <i class="fas fa-arrow-left"></i>
            </a>
            <div>
                <h1 class="text-2xl md:text-3xl font-black text-white">Agenda de Turnos</h1>
                <p class="text-xs text-gray-500 uppercase tracking-widest font-bold mt-1">Administración de citas y reservas diarios</p>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div class="lg:col-span-1">
                <div class="glass-card p-6 rounded-2xl sticky top-6 shadow-lg">
                    <div class="flex items-center gap-3 mb-6">
                        <div class="w-8 h-8 rounded-lg bg-bbAccent/10 flex items-center justify-center text-bbAccent">
                            <i class="fas fa-calendar-plus"></i>
                        </div>
                        <h2 class="text-lg font-bold text-white">Agendar Manual</h2>
                    </div>

                    <% if (barberos.length === 0 || servicios.length === 0) { %>
                        <div class="bg-orange-500/10 border border-bbAccent/30 text-bbAccent p-4 rounded-xl text-xs leading-relaxed">
                            <i class="fas fa-info-circle mr-1"></i> Asegúrate de registrar al menos un <b>Barbero</b> y un <b>Servicio</b> para agendar turnos manualmente.
                        </div>
                    <% } else { %>
                        <form action="/turnos/guardar" method="POST" class="space-y-4">
                            <div>
                                <label class="block text-[10px] text-gray-500 mb-1 font-bold uppercase tracking-wider">Nombre del Cliente</label>
                                <input type="text" name="cliente_nombre" required placeholder="Ej. Juan Pérez" class="w-full bg-bbDark border border-bbBorder rounded-xl p-3.5 text-sm text-white outline-none focus:border-bbAccent transition-all">
                            </div>

                            <div>
                                <label class="block text-[10px] text-gray-500 mb-1 font-bold uppercase tracking-wider">WhatsApp</label>
                                <input type="tel" name="cliente_whatsapp" required placeholder="Ej. 543513000000" class="w-full bg-bbDark border border-bbBorder rounded-xl p-3.5 text-sm text-white outline-none focus:border-bbAccent transition-all">
                            </div>

                            <div>
                                <label class="block text-[10px] text-gray-500 mb-1 font-bold uppercase tracking-wider">Seleccionar Barbero</label>
                                <select name="barbero_id" required class="w-full bg-bbDark border border-bbBorder rounded-xl p-3.5 text-sm text-white outline-none focus:border-bbAccent appearance-none">
                                    <% barberos.forEach(b => { %>
                                        <option value="<%= b.id %>"><%= b.nombre %> (<%= b.sucursal_nombre %>)</option>
                                    <% }) %>
                                </select>
                            </div>

                            <div>
                                <label class="block text-[10px] text-gray-500 mb-1 font-bold uppercase tracking-wider">Servicio Requerido</label>
                                <select name="servicio_id" required class="w-full bg-bbDark border border-bbBorder rounded-xl p-3.5 text-sm text-white outline-none focus:border-bbAccent appearance-none">
                                    <% servicios.forEach(s => { %>
                                        <option value="<%= s.id %>"><%= s.nombre %> — $<%= s.precio %></option>
                                    <% }) %>
                                </select>
                            </div>

                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-[10px] text-gray-500 mb-1 font-bold uppercase tracking-wider">Fecha</label>
                                    <input type="date" name="fecha" required class="w-full bg-bbDark border border-bbBorder rounded-xl p-3.5 text-xs text-white outline-none focus:border-bbAccent" style="color-scheme: dark;">
                                </div>
                                <div>
                                    <label class="block text-[10px] text-gray-500 mb-1 font-bold uppercase tracking-wider">Hora</label>
                                    <input type="time" name="hora" required class="w-full bg-bbDark border border-bbBorder rounded-xl p-3.5 text-xs text-white outline-none focus:border-bbAccent" style="color-scheme: dark;">
                                </div>
                            </div>

                            <button type="submit" class="w-full bg-bbAccent text-black font-black uppercase tracking-widest py-4 rounded-xl hover:bg-orange-600 transition-all shadow-[0_0_20px_rgba(249,115,22,0.15)] mt-2">
                                Confirmar Turno
                            </button>
                        </form>
                    <% } %>
                </div>
            </div>

            <div class="lg:col-span-2">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-xl font-bold text-white">Próximas Citas</h3>
                    <span class="bg-bbBorder text-gray-400 px-3 py-1 rounded-full text-xs font-bold"><%= turnos.length %> Totales</span>
                </div>

                <div class="space-y-4">
                    <% if (turnos.length === 0) { %>
                        <div class="glass-card p-12 flex flex-col items-center justify-center text-center rounded-2xl border-dashed border-2 border-bbBorder">
                            <i class="fas fa-calendar-check text-4xl text-gray-600 mb-4"></i>
                            <p class="text-gray-400 text-sm">No hay turnos agendados en el sistema.</p>
                            <p class="text-xs text-gray-600 mt-1">Los turnos tomados de forma manual o pública aparecerán listados aquí.</p>
                        </div>
                    <% } else { %>
                        <% turnos.forEach(t => { %>
                            <div class="glass-card p-5 rounded-2xl border-l-4 transition-all duration-300 
                                <%= t.estado === 'completado' ? 'border-green-500 bg-green-500/5' : t.estado === 'cancelado' ? 'border-red-500 bg-red-500/5' : 'border-bbAccent bg-bbCard/50' %>">
                                
                                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    
                                    <div class="space-y-2">
                                        <div class="flex items-center gap-2 flex-wrap">
                                            <span class="text-sm font-black text-white"><%= t.cliente_nombre %></span>
                                            <a href="https://wa.me/<%= t.cliente_whatsapp %>" target="_blank" class="text-xs text-green-500 hover:underline flex items-center gap-1">
                                                <i class="fab fa-whatsapp"></i> <%= t.cliente_whatsapp %>
                                            </a>
                                        </div>

                                        <div class="grid grid-cols-2 sm:flex sm:items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                                            <div><i class="fas fa-cut text-bbAccent mr-1"></i> <%= t.servicio_nombre %></div>
                                            <div class="font-bold text-white">$<%= t.precio.toLocaleString('es-AR') %></div>
                                            <div class="sm:border-l sm:border-bbBorder sm:pl-4"><i class="fas fa-user text-gray-500 mr-1"></i> <%= t.barbero_nombre %></div>
                                            <div class="text-[10px] uppercase text-gray-500 font-semibold">(<%= t.sucursal_nombre %>)</div>
                                        </div>

                                        <div class="flex items-center gap-4 text-xs font-semibold pt-1">
                                            <span class="text-bbAccent"><i class="far fa-calendar mr-1"></i> <%= new Date(t.fecha).toLocaleDateString('es-AR', {timeZone: 'UTC', day: '2-digit', month: '2-digit'}) %></span>
                                            <span class="text-white bg-bbBorder px-2 py-0.5 rounded"><i class="far fa-clock mr-1"></i> <%= t.hora.substring(0,5) %> hs</span>
                                        </div>
                                    </div>

                                    <div class="flex items-center gap-2 self-end sm:self-center">
                                        <% if (t.estado === 'pendiente') { %>
                                            <form action="/turnos/estado" method="POST">
                                                <input type="hidden" name="turno_id" value="<%= t.id %>">
                                                <input type="hidden" name="nuevo_estado" value="completado">
                                                <button type="submit" class="bg-green-500 hover:bg-green-600 text-black px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all">
                                                    <i class="fas fa-check"></i> Listo
                                                </button>
                                            </form>
                                            
                                            <form action="/turnos/estado" method="POST">
                                                <input type="hidden" name="turno_id" value="<%= t.id %>">
                                                <input type="hidden" name="nuevo_estado" value="cancelado">
                                                <button type="submit" class="bg-bbBorder hover:bg-red-950 text-red-500 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all">
                                                    Cancelar
                                                </button>
                                            </form>
                                        <% } else if (t.estado === 'completado') { %>
                                            <span class="bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest">
                                                <i class="fas fa-check-circle mr-1"></i> Completado
                                            </span>
                                        <% } else { %>
                                            <span class="bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest">
                                                <i class="fas fa-times-circle mr-1"></i> Cancelado
                                            </span>
                                        <% } %>
                                    </div>

                                </div>
                            </div>
                        <% }) %>
                    <% } %>
                </div>
            </div>

        </div>

    </div>
</body>
</html>
