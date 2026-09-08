/**
 * LECCIÓN 2 - Rutas y métodos HTTP
 * ---------------------------------
 * Una API se organiza con RUTAS (URLs) y MÉTODOS (verbos).
 *
 *   GET    /usuarios        -> me da la lista de usuarios
 *   GET    /usuarios/1      -> me da solo el usuario con id = 1
 *   POST   /usuarios        -> crea un usuario nuevo
 *   PUT    /usuarios/1      -> actualiza el usuario 1
 *   DELETE /usuarios/1      -> borra el usuario 1
 *
 * CÓDIGOS DE ESTADO (los más usados):
 *   200 OK                -> todo salió bien
 *   201 Created           -> se creó algo (POST)
 *   400 Bad Request       -> el cliente mandó datos inválidos
 *   404 Not Found         -> la ruta no existe
 *   405 Method Not Allowed-> la ruta existe pero no acepta ese método
 *   500 Internal Error    -> algo explotó en el servidor
 */

const http = require('node:http');

const server = http.createServer((req, res) => {
  // Desarmamos la URL: separamos la ruta de los "query params" (?nombre=...)
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  // ---------- "Router" hecho a mano con if/else ----------
  if (req.method === 'GET' && path === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bienvenido a la API. Rutas disponibles: /hola y /usuarios');

  } else if (req.method === 'GET' && path === '/hola') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Hola! Estás usando el método GET sobre la ruta /hola');

  } else if (req.method === 'GET' && path === '/usuarios') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Aquí irá la lista de usuarios');

  } else {
    // Ruta que no existe: respondemos con 404
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`404 - La ruta ${req.method} ${path} no existe en esta API`);
  }
});

// El puerto se lee de la variable de entorno PORT (o usa 3000 por defecto).
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log('Prueba con:  curl http://localhost:3000/usuarios');
});

module.exports = server;

/** CÓMO PROBARLO (abre otra terminal y escribe):
 *
 * curl http://localhost:3000/hola         -> 200, texto de saludo
 * curl http://localhost:3000/noexiste     -> 404 "no existe"
 * PowerShell (Windows) usa:  Invoke-RestMethod http://localhost:3000/hola
 * También puedes probar desde el navegador: solo soporta GET.
 */