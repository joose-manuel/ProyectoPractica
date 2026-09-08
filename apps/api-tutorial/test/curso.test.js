/**
 * Pruebas automáticas del curso.
 * Usa el test runner nativo de Node:  node --test test/
 * (No necesitas instalar nada; fetch y node:test son nativos en Node 18+)
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PUERTO = 3100;
const URL_BASE = `http://localhost:${PUERTO}`;

const ARCHIVO_BD = path.join(__dirname, '..', 'datos.json');
const ARCHIVO_DB_SQL = path.join(__dirname, '..', 'database.db');

// Copia de seguridad de datos.json para restaurarlo al terminar (lo modifica la lección 5)
const backupJSON = fs.readFileSync(ARCHIVO_BD, 'utf-8');

// Levanta el server de la lección indicada y cierra el anterior si existe.
// Todas las lecciones ocupan el puerto 3000, así que se prueban en serie.
let actual = null;
async function levantar(modulo) {
  await cerrar();
  delete require.cache[require.resolve(modulo)];
  process.env.PORT = String(PUERTO); // cada lección lee su puerto de PORT
  const server = require(modulo);
  await new Promise((resolve) => {
    if (server.listening) return resolve();
    server.once('listening', resolve);
  });
  actual = server;
  return server;
}

async function cerrar() {
  if (!actual) return;
  await new Promise((resolve) => actual.close(resolve));
  actual = null;
}

test('Lección 1 - servidor HTTP básico', async () => {
  await levantar(path.join(__dirname, '..', '01-servidor-basico.js'));
  const res = await fetch(`${URL_BASE}/`);
  assert.equal(res.status, 200);
  const texto = await res.text();
  assert.match(texto, /Hola mundo/);
});

test('Lección 2 - rutas, métodos y estados', async () => {
  await levantar(path.join(__dirname, '..', '02-rutas-metodos.js'));
  const hola = await fetch(`${URL_BASE}/hola`);
  assert.equal(hola.status, 200);
  const fuera = await fetch(`${URL_BASE}/no-existe`);
  assert.equal(fuera.status, 404);
});

test('Lección 3 - JSON con datos en memoria', async () => {
  await levantar(path.join(__dirname, '..', '03-respuestas-json.js'));
  const todos = await fetch(`${URL_BASE}/usuarios`);
  assert.equal(todos.status, 200);
  const lista = await todos.json();
  assert.equal(Array.isArray(lista), true);
  assert.equal(lista.length, 2);
  assert.equal(lista[0].nombre, 'Ana');

  const uno = await fetch(`${URL_BASE}/usuarios/1`);
  const usuario = await uno.json();
  assert.equal(usuario.email, 'ana@ejemplo.com');

  const falta = await fetch(`${URL_BASE}/usuarios/999`);
  assert.equal(falta.status, 404);
});

test('Lección 4 - archivo JSON como base de datos', async () => {
  await levantar(path.join(__dirname, '..', '04-archivo-json.js'));
  const todos = await fetch(`${URL_BASE}/usuarios`);
  const lista = await todos.json();
  assert.equal(lista.length, 3); // datos.json tiene 3 usuarios
  assert.ok(lista.some((u) => u.nombre === 'Carla'));
});

test('Lección 5 - CRUD sobre archivo JSON', async () => {
  await levantar(path.join(__dirname, '..', '05-crud-json.js'));

  const antes = await (await fetch(`${URL_BASE}/usuarios`)).json();
  const totalInicial = antes.length;

  // CREAR (POST)
  const creadoRes = await fetch(`${URL_BASE}/usuarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: 'Pedro', email: 'pedro@x.com' }),
  });
  assert.equal(creadoRes.status, 201);
  const creado = await creadoRes.json();
  assert.equal(creado.nombre, 'Pedro');

  // VALIDACIÓN: sin email -> 400
  const invalido = await fetch(`${URL_BASE}/usuarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: 'X' }),
  });
  assert.equal(invalido.status, 400);

  // ACTUALIZAR (PUT)
  const actualizadoRes = await fetch(`${URL_BASE}/usuarios/${creado.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'pedroNuevo@x.com' }),
  });
  assert.equal(actualizadoRes.status, 200);
  assert.equal((await actualizadoRes.json()).email, 'pedroNuevo@x.com');

  // BORRAR (DELETE)
  const borrado = await fetch(`${URL_BASE}/usuarios/${creado.id}`, { method: 'DELETE' });
  assert.equal(borrado.status, 200);

  // El 404 al borrar algo inexistente
  const doble = await fetch(`${URL_BASE}/usuarios/${creado.id}`, { method: 'DELETE' });
  assert.equal(doble.status, 404);

  const despues = await (await fetch(`${URL_BASE}/usuarios`)).json();
  assert.equal(despues.length, totalInicial); // todo volvió a la normalidad
});

test('Lección 6 - base de datos SQLite', async () => {
  // Empezamos con una base limpia para que la prueba sea repetible
  if (fs.existsSync(ARCHIVO_DB_SQL)) fs.rmSync(ARCHIVO_DB_SQL);

  await levantar(path.join(__dirname, '..', '06-sqlite.js'));

  const todos = await (await fetch(`${URL_BASE}/usuarios`)).json();
  assert.equal(todos.length, 2); // datos de ejemplo

  // CREATE
  const creadoRes = await fetch(`${URL_BASE}/usuarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: 'Sofia', email: 'sofia@x.com' }),
  });
  assert.equal(creadoRes.status, 201);
  const creado = await creadoRes.json();
  assert.ok(creado.id);

  // Leer el que creamos (SELECT ... WHERE)
  const leido = await (await fetch(`${URL_BASE}/usuarios/${creado.id}`)).json();
  assert.equal(leido.nombre, 'Sofia');

  // UPDATE
  const actualizado = await fetch(`${URL_BASE}/usuarios/${creado.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: 'Sofia Editada', email: 'sofia@x.com' }),
  });
  assert.equal((await actualizado.json()).nombre, 'Sofia Editada');

  // DELETE
  const borrado = await fetch(`${URL_BASE}/usuarios/${creado.id}`, { method: 'DELETE' });
  assert.equal(borrado.status, 200);

  // 404 en SQLite cuando no existe
  const inexistente = await fetch(`${URL_BASE}/usuarios/99999`);
  assert.equal(inexistente.status, 404);

  // Apagamos el servidor (esto cierra la conexión a SQLite) para poder borrar el archivo .db
  await cerrar();
  fs.rmSync(ARCHIVO_DB_SQL, { force: true }); // limpiamos la base al terminar
});

// Restauramos datos.json a su estado original después de la lección 5
process.on('exit', () => {
  fs.writeFileSync(ARCHIVO_BD, backupJSON, 'utf-8');
});