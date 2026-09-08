/**
 * LECCIÓN 3 - Respuestas JSON y datos en memoria
 * ------------------------------------------------
 * Hasta ahora respondimos texto. Las APIs modernas responden JSON porque es
 * el formato que JavaScript entiende de forma natural y que cualquier otro
 * lenguaje puede leer.
 *
 * Aquí además guardamos datos en "memoria" (un array). Es la semilla de lo
 * que más adelante será una base de datos.
 *
 * Para probar:  node 03-respuestas-json.js
 *   Invoke-RestMethod http://localhost:3000/usuarios     (PowerShell)
 *   curl http://localhost:3000/usuarios                   (Git Bash / Linux)
 */

const http = require('node:http');

// Nuestro "almacén" temporal: un array de objetos en memoria.
const usuarios = [
  { id: 1, nombre: 'Ana', email: 'ana@ejemplo.com' },
  { id: 2, nombre: 'Luis', email: 'luis@ejemplo.com' },
];

// Función auxiliar para responder JSON siempre igual:
//   - pone el Content-Type correcto
//   - convierte el objeto JS a texto JSON con JSON.stringify
function responderJSON(res, status, datos) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(datos, null, 2)); // null, 2 = indentación bonita
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  // GET /usuarios -> devuelve TODO el array como JSON
  if (req.method === 'GET' && path === '/usuarios') {
    return responderJSON(res, 200, usuarios);
  }

  // GET /usuarios/1 -> devuelve UN solo usuario.
  // "match" usa una expresión regular: un número al final de la ruta.
  const match = path.match(/^\/usuarios\/(\d+)$/);
  if (req.method === 'GET' && match) {
    const id = Number(match[1]);              // el número viene como texto, lo pasamos a número
    const usuario = usuarios.find((u) => u.id === id);

    if (!usuario) {
      return responderJSON(res, 404, { error: `No existe el usuario con id ${id}` });
    }
    return responderJSON(res, 200, usuario);
  }

  // Cualquier otra cosa -> 404
  return responderJSON(res, 404, { error: `Ruta no encontrada: ${req.method} ${path}` });
});

// El puerto se lee de la variable de entorno PORT (o usa 3000 por defecto).
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log('Prueba:  Invoke-RestMethod http://localhost:3000/usuarios/1');
});

module.exports = server;