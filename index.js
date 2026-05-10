// ... (Todo el código anterior de la API se mantiene igual) ...

app.get('/', (req, res) => {
  res.send(`
    <div style="font-family: sans-serif; max-width: 400px; margin: 50px auto; border: 1px solid #eee; padding: 30px; border-radius: 15px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
      <h2 style="margin-bottom: 25px;">BookBarber V2</h2>
      
      <div id="auth-box">
        <div id="login-form">
          <input id="email" type="email" placeholder="Email" style="width: 100%; padding: 12px; margin-bottom: 10px; border-radius: 8px; border: 1px solid #ddd;">
          <input id="pass" type="password" placeholder="Contraseña" style="width: 100%; padding: 12px; margin-bottom: 15px; border-radius: 8px; border: 1px solid #ddd;">
          <button onclick="login()" style="width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">Entrar al Panel</button>
          <p style="margin-top: 20px; font-size: 14px;">¿No tienes cuenta? <a href="#" onclick="mostrarRegistro()" style="color: #007bff; text-decoration: none;">Regístrate aquí</a></p>
        </div>
      </div>

      <p id="mensaje" style="margin-top: 15px; font-weight: bold; min-height: 20px;"></p>
    </div>

    <script>
      function mostrarRegistro() {
        document.getElementById('auth-box').innerHTML = \`
          <input id="reg-negocio" type="text" placeholder="Nombre Barbería" style="width: 100%; padding: 12px; margin-bottom: 10px; border-radius: 8px; border: 1px solid #ddd;">
          <input id="reg-email" type="email" placeholder="Email" style="width: 100%; padding: 12px; margin-bottom: 10px; border-radius: 8px; border: 1px solid #ddd;">
          <input id="reg-wa" type="tel" placeholder="WhatsApp (Ej: 549351...)" style="width: 100%; padding: 12px; margin-bottom: 10px; border-radius: 8px; border: 1px solid #ddd;">
          <input id="reg-pass" type="password" placeholder="Contraseña segura" style="width: 100%; padding: 12px; margin-bottom: 15px; border-radius: 8px; border: 1px solid #ddd;">
          <button onclick="ejecutarRegistro()" style="width: 100%; padding: 12px; background: #28a745; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">Crear Cuenta Blindada</button>
          <p style="margin-top: 20px; font-size: 14px;"><a href="/" style="color: #666; text-decoration: none;">Volver al Login</a></p>
        \`;
      }

      async function ejecutarRegistro() {
        const datos = {
          nombreNegocio: document.getElementById('reg-negocio').value,
          email: document.getElementById('reg-email').value,
          whatsapp: document.getElementById('reg-wa').value,
          password: document.getElementById('reg-pass').value
        };
        const res = await fetch('/api/registrar', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(datos)
        });
        const data = await res.json();
        document.getElementById('mensaje').innerText = data.mensaje || data.error;
        if(data.mensaje) setTimeout(() => location.reload(), 2000);
      }

      async function login() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('pass').value;
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if(data.token) {
          document.getElementById('auth-box').innerHTML = "<h3 style='color: #28a745;'>✅ ¡Hola, " + data.nombre + "!</h3><p>Sesión segura iniciada correctamente.</p>";
          localStorage.setItem('token', data.token);
        }
        document.getElementById('mensaje').innerText = data.mensaje || data.error;
        document.getElementById('mensaje').style.color = data.token ? "green" : "red";
      }
    </script>
  `);
});

app.listen(3000);
