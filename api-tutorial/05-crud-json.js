/**
 * LECCIÓN 5 - CRUD completo sobre el archivo JSON
 * -------------------------------------------------
 * CRUD significa: Create (crear), Read (leer), Update (actualizar), Delete (borrar).
 * Es lo mínimo que hará cualquier API de verdad.
 *
 *  GET    /usuarios         -> leer todos
 *  GET    /usuarios/:id     -> leer uno
 *  POST   /usuarios         -> crear  (el nuevo usuario viaja en el CUERPO de la petición)
 *  PUT    /usuarios/:id     -> actualizar
 *  DELETE /usuarios/:id     -> borrar
 *
 * NOVEDAD de esta lección: aprenderás a LEER el cuerpo (body) de la petición.
 * El cuerpo viaja "por trocitos" (chunks), así que lo juntamos con un for await.
 *
 * Probar (PowerShell):
 *   Invoke-RestMethod -Method Post -Uri http://localhost:3000/usuarios `
 *     -ContentType 'application/json' -Body '{"nombre":"Pedro","email":"pedro@x.com"}'
 *   Invoke-RestMethod -Method Delete -Uri http://localhost:3000/usuarios/1
 */

const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const ARCHIVO_BD = path.join(__dirname, 'datos.json');

function responderJSON(res, status, datos) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(datos, null, 2));
}

// Lee el cuerpo de la petición (el JSON que manda el cliente) y lo convierte a objeto.
async function leerCuerpo(req) {
  const trozos = [];
  for await (const trozo of req) {
    trozos.push(trozo); // cada trozo es un Buffer
  }
  const texto = Buffer.concat(trozos).toString('utf-8');
  return texto ? JSON.parse(texto) : {}; // si no hay cuerpo, devolvemos {}
}

// Lee el archivo y lo devuelve como array
async function leerUsuarios() {
  const contenido = await fs.readFile(ARCHIVO_BD, 'utf-8');
  return JSON.parse(contenido);
}

// Escribe el array de nuevo en el archivo
async function guardarUsuarios(usuarios) {
  await fs.writeFile(ARCHIVO_BD, JSON.stringify(usuarios, null, 2), 'utf-8');
}

// Como leer el archivo es asíncrono, necesitamos marcar el handler como async
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    const match = pathname.match(/^\/usuarios\/(\d+)$/);

    // ================= leer todos =================
    if (req.method === 'GET' && pathname === '/usuarios') {
      const usuarios = await leerUsuarios();
      return responderJSON(res, 200, usuarios);
    }

    // ================= leer uno =================
    if (req.method === 'GET' && match) {
      const id = Number(match[1]);
      const usuarios = await leerUsuarios();
      const usuario = usuarios.find((u) => u.id === id);
      if (!usuario) return responderJSON(res, 404, { error: `No existe el usuario ${id}` });
      return responderJSON(res, 200, usuario);
    }

    // ================= crear =================
    if (req.method === 'POST' && pathname === '/usuarios') {
      const cuerpo = await leerCuerpo(req);

      // Validación básica: fíjate cómo ante datos malos respondemos 400
      if (!cuerpo.nombre || !cuerpo.email) {
        return responderJSON(res, 400, { error: 'Faltan campos: se requiere nombre y email' });
      }

      const usuarios = await leerUsuarios();
      // El id nuevo es el siguiente número (máximo actual + 1)
      const nuevoId = usuarios.length > 0 ? Math.max(...usuarios.map((u) => u.id)) + 1 : 1;
      const nuevoUsuario = { id: nuevoId, nombre: cuerpo.nombre, email: cuerpo.email };

      usuarios.push(nuevoUsuario);
      await guardarUsuarios(usuarios);

      return responderJSON(res, 201, nuevoUsuario); // 201 = "Created"
    }

    // ================= actualizar =================
    if (req.method === 'PUT' && match) {
      const id = Number(match[1]);
      const cuerpo = await leerCuerpo(req);

      const usuarios = await leerUsuarios();
      const usuario = usuarios.find((u) => u.id === id);
      if (!usuario) return responderJSON(res, 404, { error: `No existe el usuario ${id}` });

      // Actualizamos solo los campos que vengan en el cuerpo
      if (cuerpo.nombre) usuario.nombre = cuerpo.nombre;
      if (cuerpo.email) usuario.email = cuerpo.email;

      await guardarUsuarios(usuarios);
      return responderJSON(res, 200, usuario);
    }

    // ================= borrar =================
    if (req.method === 'DELETE' && match) {
      const id = Number(match[1]);
      const usuarios = await leerUsuarios();
      const index = usuarios.findIndex((u) => u.id === id);
      if (index === -1) return responderJSON(res, 404, { error: `No existe el usuario ${id}` });

      usuarios.splice(index, 1); // quita el elemento de la posición index
      await guardarUsuarios(usuarios);
      return responderJSON(res, 200, { mensaje: `Usuario ${id} borrado` });
    }

    return responderJSON(res, 404, { error: `Ruta no encontrada: ${req.method} ${pathname}` });
  } catch (error) {
    console.error(error);
    return responderJSON(res, 500, { error: 'Error interno del servidor' });
  }
});

// El puerto se lee de la variable de entorno PORT (o usa 3000 por defecto).
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
server.listen(PORT, () => {
  console.log(`CRUD corriendo en http://localhost:${PORT}`);
});

module.exports = server;