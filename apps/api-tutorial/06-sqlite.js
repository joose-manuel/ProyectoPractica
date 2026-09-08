/**
 * LECCIÓN 6 - Conexión a una base de datos real: SQLite
 * -------------------------------------------------------
 * Node.js 22+ incluye SQLite NATIVO en el módulo "node:sqlite".
 * No instalas nada. SQLite es una base de datos en un solo archivo
 * (aquí "database.db") y es la más usada para aprender.
 *
 * ¿En qué mejora a datos.json?
 *   - Soportar consultas tipo SQL (SELECT, INSERT, UPDATE, DELETE)
 *   - Manejar concurrencia (varias peticiones a la vez)
 *   - Escalar a MySQL/PostgreSQL más adelante: el lenguaje SQL es el mismo.
 *
 * Para probar (PowerShell):
 *   Invoke-RestMethod http://localhost:3000/usuarios
 *   curl.exe -X POST http://localhost:3000/usuarios -H "Content-Type: application/json" -d "{\"nombre\":\"Sofia\",\"email\":\"sofia@x.com\"}"
 */

const http = require('node:http');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

// ---------- 1) CONECTAR A LA BASE DE DATOS ----------
// Si database.db no existe, se crea automáticamente.
const db = new DatabaseSync(path.join(__dirname, 'database.db'));

// ---------- 2) CREAR LA TABLA (si no existe) ----------
db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,  -- id se autogenera
    nombre TEXT    NOT NULL,
    email  TEXT    NOT NULL UNIQUE
  )
`);

// ---------- 3) DATOS DE PRUEBA (la primera vez) ----------
const filas = db.prepare('SELECT COUNT(*) AS total FROM usuarios').get();
if (filas.total === 0) {
  const insertar = db.prepare('INSERT INTO usuarios (nombre, email) VALUES (?, ?)');
  insertar.run('Ana', 'ana@ejemplo.com');
  insertar.run('Luis', 'luis@ejemplo.com');
  console.log('Base de datos creada con datos de ejemplo.');
}

// ---------- HELPER ----------
function responderJSON(res, status, datos) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(datos, null, 2));
}

async function leerCuerpo(req) {
  const trozos = [];
  for await (const trozo of req) trozos.push(trozo);
  const texto = Buffer.concat(trozos).toString('utf-8');
  return texto ? JSON.parse(texto) : {};
}

// ---------- ENDPOINTS ----------
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    const match = pathname.match(/^\/usuarios\/(\d+)$/);

    // Leer todos:  SELECT
    if (req.method === 'GET' && pathname === '/usuarios') {
      const usuarios = db.prepare('SELECT * FROM usuarios').all();
      return responderJSON(res, 200, usuarios);
    }

    // Leer uno:   SELECT ... WHERE
    if (req.method === 'GET' && match) {
      const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(Number(match[1]));
      if (!usuario) return responderJSON(res, 404, { error: `No existe el usuario ${match[1]}` });
      return responderJSON(res, 200, usuario);
    }

    // Crear:      INSERT
    if (req.method === 'POST' && pathname === '/usuarios') {
      const cuerpo = await leerCuerpo(req);
      if (!cuerpo.nombre || !cuerpo.email) {
        return responderJSON(res, 400, { error: 'Faltan campos: nombre y email son obligatorios' });
      }
      // El "?" son PARÁMETROS. Nunca pegues variables directamente en SQL
      // (eso se llama inyección SQL y es un agujero de seguridad).
      const resultado = db.prepare('INSERT INTO usuarios (nombre, email) VALUES (?, ?)')
        .run(cuerpo.nombre, cuerpo.email);
      const nuevo = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(resultado.lastInsertRowid);
      return responderJSON(res, 201, nuevo);
    }

    // Actualizar: UPDATE
    if (req.method === 'PUT' && match) {
      const id = Number(match[1]);
      const cuerpo = await leerCuerpo(req);
      const resultado = db.prepare('UPDATE usuarios SET nombre = ?, email = ? WHERE id = ?')
        .run(cuerpo.nombre || '', cuerpo.email || '', id);

      if (resultado.changes === 0) {
        return responderJSON(res, 404, { error: `No existe el usuario ${id}` });
      }
      const actualizado = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
      return responderJSON(res, 200, actualizado);
    }

    // Borrar:     DELETE
    if (req.method === 'DELETE' && match) {
      const id = Number(match[1]);
      const resultado = db.prepare('DELETE FROM usuarios WHERE id = ?').run(id);
      if (resultado.changes === 0) {
        return responderJSON(res, 404, { error: `No existe el usuario ${id}` });
      }
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
  console.log(`API con SQLite corriendo en http://localhost:${PORT}`);
});

// Al apagar el servidor, cerramos también la conexión a la base de datos.
// (Una conexión abierta mantiene vivo el proceso de Node, como viste en el test.)
server.on('close', () => db.close());

module.exports = server;