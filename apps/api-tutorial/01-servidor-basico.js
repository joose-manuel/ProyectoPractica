/**
 * LECCIÓN 1 - Tu primer servidor HTTP con Node.js
 * ------------------------------------------------
 * Node tiene un módulo nativo llamado "http" que permite crear servidores web
 * sin instalar NADA. Es lo mismo que hace Express por debajo.
 *
 * ¿Qué es una API?
 * - Una API es un programa que recibe peticiones (requests) por internet
 *   y devuelve respuestas (responses).
 * - HTTP define cómo se envían esas peticiones: el cliente pide algo a una
 *   URL y el servidor responde.
 *
 * Para ejecutar esta lección:  node 01-servidor-basico.js
 * Luego abre el navegador en:   http://localhost:3000
 */

// 1) Importamos el módulo nativo http (no es una librería de terceros)
const http = require('node:http');

// 2) Creamos el servidor. La función recibe una REQUEST (lo que pide el cliente)
//    y una RESPONSE (donde escribimos lo que le contestamos).
const server = http.createServer((req, res) => {
  // req.method  -> el verbo HTTP: GET, POST, PUT, DELETE...
  // req.url     -> la ruta que pidió:  "/", "/hola", "/usuarios"...
  console.log(`Petición recibida: ${req.method} ${req.url}`);

  // Escribimos una respuesta de texto plano
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Hola mundo desde mi primera API con Node nativo!');
});

// 3) El servidor "escucha" en un puerto. El 3000 es el habitual en desarrollo.
//    localhost = tu propia máquina. Puerto = la "puerta" de entrada.
// El puerto se lee de la variable de entorno PORT (o usa 3000 por defecto).
// Así no "chocamos" con otros programas:  PORT=3100 node 01-servidor-basico.js
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// Exportamos el servidor para poder probarlo con test/test-runner.js
module.exports = server;