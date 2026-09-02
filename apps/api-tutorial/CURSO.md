# Curso de APIs con Node.js nativo (sin frameworks)

Aprende a crear APIs usando **solo los módulos que Node trae de fábrica**:
nada de Express, nada de npm install. Así entiendes qué está pasando realmente.

## Cómo usar este curso

Cada archivo es una lección que sube de nivel. Leelas en orden:

| Archivo | Qué aprendes |
|---|---|
| `01-servidor-basico.js` | Crear un servidor con el módulo `http` |
| `02-rutas-metodos.js` | Rutas (URLs), métodos (GET/POST/...) y códigos de estado |
| `03-respuestas-json.js` | Devolver JSON y guardar datos en memoria |
| `04-archivo-json.js` | Leer datos desde un archivo `datos.json` (tu primera "BD") |
| `05-crud-json.js` | CRUD completo (crear, leer, actualizar, borrar) sobre el JSON |
| `06-sqlite.js` | Conectar a una **base de datos real** (SQLite nativo) |

### Para ejecutar una lección

```
node 01-servidor-basico.js
```

El puerto por defecto es `3000`, pero si está ocupado por otro programa puedes
cambiarlo con la variable de entorno `PORT`:

```
PORT=3100 node 01-servidor-basico.js
```

> En PowerShell escribirías: `$env:PORT=3100; node 01-servidor-basico.js`

Luego, desde otra terminal, prueba la API. En **PowerShell (Windows)**:

```powershell
Invoke-RestMethod http://localhost:3000/usuarios
```

En **Git Bash / Linux / macOS**:

```bash
curl http://localhost:3000/usuarios
```

### Para probar TODAS las lecciones automáticamente

```
node --test test/curso.test.js
```

## Conceptos clave antes de empezar

### 1. ¿Qué es una API?
Una **API** es un intermediario: un programa que responde peticiones por
internet. Tú mandas una petición (ej. "dame la lista de usuarios") y te
devuelve una respuesta (ej. la lista en JSON).

### 2. ¿Qué es HTTP? ¿Qué son request y response?
HTTP es el protocolo de comunicación de la web. Una **request** (petición)
tiene: un **método** (qué acción quieres) y una **URL** (a qué recurso).
El servidor responde con una **response**: un **código de estado** y unos
**datos** (texto, HTML o JSON).

### 3. Métodos HTTP (los 4 de CRUD)
| Método | Qué hace | Equivale a |
|---|---|---|
| `GET` | Leer | Leer |
| `POST` | Crear un recurso nuevo | Create |
| `PUT` | Actualizar un recurso completo | Update |
| `DELETE` | Borrar un recurso | Delete |

### 4. Códigos de estado más comunes
- `200 OK` — salió bien
- `201 Created` — se creó algo
- `400 Bad Request` — el cliente mandó datos inválidos
- `404 Not Found` — la ruta no existe
- `405 Method Not Allowed` — la ruta existe pero no acepta ese método

### 5. JSON como base de datos vs SQLite
- **`datos.json`**: simple pero lento y no soporta concurrencia. Bueno para aprender.
- **`SQLite`**: una base de datos en un archivo `.db`. Soporta SQL, concurrencia
  y es el primer paso antes de MySQL/PostgreSQL. Viene **nativo** en Node 22+.

## Qué sigue después del curso

1. Separar el código en módulos (carpetas `routes/`, `controllers/`, `database/`).
2. Aprender `async/await`, validación de datos y manejo de errores.
3. Introducir Express (hace más corto todo lo que escribimos a mano).
4. Cambiar `node:sqlite` por MySQL (con `mysql2`) o PostgreSQL (con `pg`). El SQL que ya aprendiste se reutiliza.