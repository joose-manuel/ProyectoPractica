# Arquitectura ETM Core App

> Documento de arquitectura del sistema **ETM Core** (Sistema de Gestión de Mantenimiento de Flota de Vehículos). Este documento describe los componentes, diagramas, flujos y cómo replicar la estructura en un nuevo proyecto.

---

## 1. Resumen Ejecutivo

**ETM Core** es una plataforma full-stack para la gestión del mantenimiento de una flota de buses. Permite planear mantenimientos, generar órdenes de trabajo, gestionar repuestos e inventario, aprobar solicitudes (reparaciones, nuevos ítems, repuestos), y registrar la actividad de mecánicos mediante tarjetas **NFC**.

Es un **monorepo NX 21** que agrupa:

| Capa | Tecnología | App |
|------|-----------|-----|
| Frontend Web | **Angular 18** + NG-ZORRO + PrimeNG | `apps/etm-frontend` |
| Backend API | **NestJS 10** + TypeORM | `apps/etm-backend` |
| Base de datos | **PostgreSQL** | `apps/etm-database` |
| Puente NFC (desktop) | **Node.js** + WebSocket + tarjetas | `apps/etm-nfc-bridge` |
| Lectura NFC (móvil) | **Android / Kotlin** | `apps/etm-nfc-bridge-mobile` |
| CI/CD + Infra | **GitHub Actions + Terraform / AWS** | `scripts/` |

---

## 2. Diagrama de Arquitectura General

```mermaid
flowchart TB
    subgraph Cliente["🌐 Clientes"]
        B["🧑 Usuario: Navegador Web<br/>(Angular SPA)"]
        T["📡 Lectores / Puerto NFC<br/>(NFC Bridge - Desktop Node)"]
        M["📱 App Android NFC<br/>(etm-nfc-bridge-mobile)"]
    end

    subgraph CDN["AWS - Capa de Presentación"]
        CF["CloudFront (CDN)"]
        S3F["S3 - Frontend<br/>(Angular estático)"]
        ALB["Application Load Balancer<br/>(endpoint estable /api)"]
    end

    subgraph Compute["AWS - Capa de Aplicación"]
        ECS["ECS Fargate<br/>Backend NestJS (Docker)"]
        SUBDIR["WS + Socket.io<br/>Notificaciones/tiempo real"]
        ECR["ECR - Registro de imágenes"]
    end

    subgraph Data["AWS - Capa de Datos"]
        RDS["RDS - PostgreSQL<br/>(privado)"]
        S3S["S3 - Estado Terraform +<br/>db_state.log"]
    end

    subgraph Ext["Integraciones Externas"]
        SIESA["SIESA - ERP (API)<br/>Solicitudes/Órdenes de repuestos"]
        SMTP["Servidor SMTP<br/>(correo / invitaciones)"]
        QZ["QZ Tray - Impresión<br/>Stickers / etiquetas"]
    end

    B --> CF
    CF --> S3F
    B --> ALB
    ALB --> ECS
    T -->|WebSocket NFC| ECS
    M -->|WebSocket / HTTP NFC| ECS

    ECS --> RDS
    ECS --> SIESA
    ECS --> SMTP
    ECS --> QZ
    ECS --> S3S

    ECR --> ECS
```

---

## 3. Diagrama de Arquitectura por Capas (Backend + Frontend)

```mermaid
flowchart LR
    subgraph Frontend["FRONTEND - Angular 18 (apps/etm-frontend)"]
        direction TB
        PUB["components/public/auth<br/>Login, Forgot, SetPassword, Welcome"]
        LAY["components/layout<br/>Sidebar, Topbar, Menu, Pages"]
        PAGES["components/layout/pages/<br/>~40 módulos de negocio"]
        SHARED["components/shared<br/>filtros, tablas, calendar, sticker-print..."]
        SVC["common/services<br/>auth, websocket, image-compression, siesa..."]
        INT["interceptors / guards / directives"]
        ENV["environments/<br/>dev, stage, prod"]
    end

    subgraph Backend["BACKEND - NestJS 10 (apps/etm-backend)"]
        direction TB
        AUC["auth/<br/>JWT Strategy, Guards, Login-NFC"]
        COM["common/<br/>dtos, entities, middleware, services"]
        MODS["Módulos de negocio<br/>(task, vehicle, spares-order, service-order...)"]
        CRON["cron/"]
        INTG["integrations/siesa"]
        UTIL["util/report<br/>pdf, excel"]
        ORM["TypeORM (postgres)"]
    end

    subgraph DB["POSTGRES (apps/etm-database)"]
        SQL["SQL scripts 01-26<br/>ddl + dml"]
    end

    PUB --> LAY
    LAY --> PAGES
    PAGES --> SHARED
    PAGES --> SVC
    SVC --> INT

    Frontend --"HTTP /api + WebSocket"--> Backend
    AUC --> MODS
    COM --> MODS
    CRON --> MODS
    INTG --> MODS
    UTIL --> MODS
    MODS --> ORM
    ORM --> DB
```

---

## 4. Diagrama de Componentes del Backend

```mermaid
flowchart TB
    subgraph API["Apps/etm-backend"]
        GW["Controller (REST /api)"]
        MID["DecryptionMiddleware<br/>auth/login · auth/nfc-login"]
        VAL["ValidationPipe +<br/>ClassSerializerInterceptor"]
        GA["JwtAuthGuard (APP_GUARD global)"]
        SVC["Services de negocio"]
        REPO["TypeORM Repositories / Entities"]
    end

    CL["Cliente (Frontend)"] -->|"POST /api/auth/login"| MID
    MID --> VAL --> GA --> GW
    GW --> SVC
    SVC --> REPO
    REPO --> DB["PostgreSQL"]
```

**Notas clave del backend:**
- Prefijo global: `/api`
- Guard de autenticación JWT **global** (`APP_GUARD`) — todas las rutas protegidas salvo las públicas.
- Middleware de cifrado/descifrado en login (`DecryptionMiddleware`).
- `ValidationPipe` estricto (`whitelist`, `forbidNonWhitelisted`, transform).
- Body limit 50mb (para imágenes en Base64).
- `synchronize: false` → las migraciones se controlan con scripts SQL / TypeORM migrations.
- WebSockets + Socket.io para notificaciones en tiempo real.

---

## 5. Diagrama de Flujo con NFC

```mermaid
sequenceDiagram
    participant M as Mecánico
    participant MOB as App Android NFC
    participant BR as NFC Bridge (Desktop)
    participant FE as Frontend Angular
    participant BE as Backend NestJS
    participant DB as PostgreSQL

    M->>MOB: Toca tarjeta NFC
    MOB->>BR: Envía lectura NFC (WebSocket)
    BR->>BR: Lee tarjeta / UID
    BR->>BE: POST /api/auth/nfc-login (cifrado)
    BE->>DB: Valida usuario-tarjeta
    BE-->>BR: Token JWT (respuesta)
    BR-->>MOB: Token
    MOB-->>FE: Autenticado
    FE->>BE: /api/task/* (JWT)
    BE-->>FE: Datos de tareas / órdenes
    FE->>BE: WS / Socket.io (tiempo real)
    BE-->>FE: Notificaciones y actualizaciones
```

---

## 6. Diagrama de Despliegue (AWS + CI/CD)

```mermaid
flowchart LR
    subgraph GitHub["GitHub (deploy-main.yml)"]
        CI["Pipeline CI/CD"]
    end

    subgraph AWS["Amazon Web Services (Terraform)"]
        subgraph L1["Capa RDS+VPC (manual)"]
            VPC["VPC<br/>subnets pub/priv, NAT"]
            RDS["RDS PostgreSQL<br/>(Dev t3.micro / Stage t3.small / Prod t3.medium)"]
        end
        subgraph L2["Capa Aplicación (automática)"]
            ECR["ECR"]
            ALB2["ALB"]
            ECS2["ECS Fargate"]
            S3B["S3 Frontend"]
            CF2["CloudFront"]
        end
    end

    CI -->|1 build backend| ECR
    CI -->|2 Docker push| ECR
    ECR -->|3 tarea| ECS2
    CI -->|4 build frontend| S3B
    S3B --> CF2
    CI -->|5 estados tfstate| S3["S3 backend<br/>terraform.tfstate"]
    ALB2 --> ECS2
    ECS2 --> RDS
    CF2 --> ALB2
    S3B --> DBLOG["db_state.log"]
    CI --> DBLOG
```

**Ramas → Entornos:**
- `main` → **prod**
- `stage` → **stage**
- otras → **dev**

**Pipeline (GitHub Actions):**
1. Deploy infraestructura (`scripts/infra`)
2. Deploy base de datos (`apps/etm-database`)
3. Deploy backend (Docker → ECR → ECS)
4. Deploy frontend (build → S3 sync → CloudFront invalidation)

---

## 7. Diagrama de la Base de Datos (módulos principales)

```mermaid
erDiagram
    USER ||--o{ USER_ROLES : "tiene"
    ROLE ||--o{ USER_ROLES : "asignado a"
    ROLE ||--o{ ROLE_PERMISSIONS : "contiene"
    PERMISSION ||--o{ ROLE_PERMISSIONS : "incluye"
    USER ||--o{ NFC : "porta tarjeta"
    VEHICLE ||--o{ MAINTENANCE_TRACKING : "mantiene"
    VEHICLE ||--o{ INGRESO_VEHICULOS : "entra/sale"
    TASK ||--o{ TASKS_HISTORY : "registra"
    TASK }o--|| SERVICE_ORDER : "pertenece a"
    SPARES_ORDER ||--o{ SPARES_DELIVERY : "entrega"
    SPARES_ORDER ||--o{ SPARES_RECEIVER : "recibe"
    MAINTENANCE_RULE ||--o{ MAINTENANCE_RULE_SPARE : "usa"
```

> Los scripts SQL se encuentran versionados en `apps/etm-database/sql_scripts/01-26` (DDL de creación de tablas + DML de datos semilla e índices de rendimiento).

---

## 8. Estructura de Carpetas (para replicar en otro proyecto)

### 8.1 Raíz del monorepo

```txt
etm-core-app/
├── package.json              # NX 21 · Angular 18 · NestJS 10
├── nx.json
├── tsconfig.base.json
├── eslint.config.js / jest.config.ts / jest.preset.js
├── dockerfile / entrypoint.sh / DOCKER.md
├── .env / .gitignore / README.md
├── apps/
└── scripts/
```

### 8.2 Apps

```txt
apps/
├── etm-backend/                  # NestJS + TypeORM + PostgreSQL
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts         # importa ~40 módulos + TypeORM
│   │   ├── typeorm.config.ts
│   │   ├── assets/
│   │   └── app/
│   │       ├── auth/             # decorators, dtos, entities, guards,
│   │       │                     #   services, strategies, utils
│   │       ├── common/           # config, constants, dtos, entities,
│   │       │                     #   interfaces, middleware, services
│   │       ├── cron/
│   │       ├── config/
│   │       ├── excel/
│   │       ├── integrations/siesa/
│   │       ├── util/report/      # pdf, excel
│   │       └── <dominio>/*       # cada: *.module.ts, *.controller.ts,
│   │                             #   *.service.ts, entities/, dtos/, interfaces/
│   ├── migrations/
│   ├── project.json
│   └── tsconfig*.json
│
├── etm-frontend/                 # Angular 18 SPA
│   ├── src/
│   │   ├── main.ts, app.routes.ts, app.config.ts
│   │   ├── environments/         # env.ts, .dev, .stage, .prod
│   │   ├── assets/               # styles, themes, qz-certs
│   │   └── app/
│   │       ├── common/           # components, config, constants, enums,
│   │       │                     #   interfaces, services, utils
│   │       ├── components/
│   │       │   ├── layout/       # sidebar, topbar, menu, nfc-session-overlay
│   │       │   │   └── pages/    # <página>/{constants, interfaces, services}
│   │       │   ├── public/auth/  # login, set-password, welcome...
│   │       │   └── shared/       # filter, simple-table, sticker-print...
│   │       ├── directives/ guards/ interceptors/ model/ service/ utils/
│   ├── public/
│   └── project.json
│
├── etm-database/                 # SQL PostgreSQL
│   ├── sql_scripts/              # 01-26: DDL + DML versionados
│   ├── env/{dev,stage,prod}.sh
│   ├── connect.sh / createDatabase.sh
│   └── README.md
│
├── etm-nfc-bridge/               # Puente NFC desktop (Node.js)
│   ├── src/                      # index, nfc-reader, nfc-worker,
│   │                             #   websocket-server, service-installer,
│   │                             #   nfc-mac.py, nfc-winscard.ps1
│   └── scripts/
│
└── etm-nfc-bridge-mobile/        # App Android NFC (Kotlin/Gradle)
    └── app/src/
```

### 8.3 Scripts / Infra

```txt
scripts/
├── infra/                        # Terraform AWS - Aplicación
│   ├── provider.tf, variables.tf, outputs.tf
│   ├── vpc.tf, securityGroups.tf, s3.tf, cloudfront.tf
│   ├── ecr.tf, alb.tf, ecs.tf, ecsService.tf
│   └── environments/{dev,stage,prod}/env.tfvars
├── rds/                          # Terraform AWS - Base de datos
│   ├── rds.tf, vpc.tf, s3.tf, outputs.tf, variables.tf
│   └── environments/{dev,stage,prod}/env.tfvars
└── dev-proxy/
```

---

## 9. Patrón por Módulo (receta para agregar funcionalidad)

### Backend — agregar un módulo de dominio
1. Crear carpeta `apps/etm-backend/src/app/<dominio>/` con:
   - `<dominio>.module.ts` → registra controller + service + TypeOrmModule.forFeature([Entity])
   - `<dominio>.controller.ts` → rutas REST bajo `/api/<dominio>`
   - `<dominio>.service.ts` → lógica de negocio
   - `entities/` → entidades TypeORM
   - `dtos/`, `interfaces/`, `enums/`
2. Importar el módulo en `app.module.ts`.

### Frontend — agregar una página
1. Crear `apps/etm-frontend/src/app/components/layout/pages/<página>/` con:
   - `<página>.component.ts/.html/.scss/.spec.ts`
   - `constants/` (mensajes/opciones)
   - `inputs-table-config/` (configuración de tablas)
   - `interfaces/`, `services/`
2. Registrar la ruta en `app.routes.ts`.

---

## 10. Comandos Útiles

| Comando | Descripción |
|---------|-------------|
| `nx serve etm-frontend` | Levanta frontend (dev) |
| `nx serve etm-backend` | Levanta backend (dev) |
| `nx build etm-frontend` | Compila frontend |
| `nx build etm-backend` | Compila backend |
| `nx test etm-frontend` / `nx test etm-backend` | Tests |
| `npm run typeorm:run` | Ejecuta migraciones TypeORM |
| `npm run apply --env=dev` | Aplica infraestructura dev (Terraform) |
| `npm run rds:apply --env=dev` | Aplica RDS dev |

---

## 11. Variables de Entorno Principales

| Grupo | Variables |
|-------|-----------|
| Base de datos | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`, `DB_SCHEMA`, `DB_SSL` |
| Aplicación | `NODE_ENV`, `PORT`, `TZ` |
| Autenticación | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `PASSWORD_RESET_MINUTES`, `PASSWORD_INVITE_MINUTES` |
| Correo | `FRONT_BASE_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` |
| Integración SIESA | `SIESA_CONNIKEY`, `SIESA_CONNITOKEN`, `SIESA_COMPANY_ID`, `BASE_URL`, `BASE_URL_POST`, etc. |
| Frontend | `apiBaseUrl`, `baseUrl`, `websocketUrl`, `production`, `withCredentials` |

---

*Documento generado a partir del repositorio `etm-core-app`. Para más detalle: `docs/DEPLOYMENT_FLOW.md`, `scripts/infra/INFRASTRUCTURE.md`, `DOCKER.md`.*
