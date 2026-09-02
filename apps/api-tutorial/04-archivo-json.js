/**
 * LECCIÓN 4 - Un archivo JSON como base de datos
 * ------------------------------------------------
 * El hack más sencillo para guardar datos SIN instalar ninguna base de datos:
 * un archivo .json en el disco. Es limitado (lento, no soporta muchas
 * consultas), pero perfecto para aprender antes de pasar a SQLite/MySQL.
 *
 * Para leer el archivo usamos el módulo nativo "fs" (filesystem) con
 * "fs.promises", que nos da funciones asíncronas: la lectura NO bloquea el
 * servidor, y por eso la API puede seguir atendiendo otras peticiones.
 *
 * IMPORTANTE: NOTA cómo todo lo que va tras await se ejecuta al finalizar la
 * lectura del disco. Mientras tanto, el servidor sigue escuchando.
 */

const http = require('node:http');
const fs = require('node:fs/promises'); // versión asíncrona de fs
const path = require('node:path');

const ARCHIVO_BD = path.join(__dirname, 'datos.json');

function responderJSON(res, status, datos) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(datos, null, 2));
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // 1) Leemos el archivo "datos.json" del disco
    const contenido = await fs.readFile(ARCHIVO_BD, 'utf-8');
    // 2) Parseamos el texto JSON -> objeto/array de JavaScript
    const usuarios = JSON.parse(contenido);

    // GET /usuarios -> toda la lista
    if (req.method === 'GET' && pathname === '/usuarios') {
      return responderJSON(res, 200, usuarios);
    }

    // GET /usuarios/ID -> uno solo
    const match = pathname.match(/^\/usuarios\/(\d+)$/);
    if (req.method === 'GET' && match) {
      const id = Number(match[1]);
      const usuario = usuarios.find((u) => u.id === id);
      if (!usuario) {
        return responderJSON(res, 404, { error: `No existe el usuario ${id}` });
      }
      return responderJSON(res, 200, usuario);
    }

    return responderJSON(res, 404, { error: `Ruta no encontrada: ${req.method} ${pathname}` });
  } catch (error) {
    // Si algo falla (por ejemplo, el archivo no existe), respondemos 500
    console.error(error);
    return responderJSON(res, 500, { error: 'Error interno del servidor' });
  }
});

// El puerto se lee de la variable de entorno PORT (o usa 3000 por defecto).
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log('Sirve los datos del archivo datos.json del disco.');
});

module.exports = server;