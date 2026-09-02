const http = require("node:http"); //Modulo para activar el servidor

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Hola mundo desde mi primera API con Node nativo!");
});








server.listen(3000, () => {console.log("Servidor escuchando en http://localhost:3000")});