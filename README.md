# cursoragent-test

Sitio del Mundial FIFA 2026: cuenta regresiva, fixture de fase de grupos y **pronósticos** con cuenta de usuario.

## Funcionalidades

- **Cuenta regresiva** al debut de Argentina (Grupo J)
- **Fixture** con los 12 grupos y 72 partidos (hora Argentina)
- **Registro e inicio de sesión** (email + contraseña)
- **Guardar pronósticos** de resultado (goles local : visitante) por partido
- **Panel de administración**: ver todos los pronósticos, cargar resultados reales y ranking de aciertos

## Requisitos

- Node.js 18+

## Cómo correr

```bash
npm install
npm start
```

Abrí http://localhost:8080

> El servidor Express sirve la web estática y la API (`/api/auth`, `/api/predictions`). Los datos se guardan en SQLite (`data/mundial.db`).

### Variables de entorno (opcional)

| Variable | Descripción |
|----------|-------------|
| `PORT` | Puerto (default `8080`) |
| `JWT_SECRET` | Secreto para tokens JWT (cambiar en producción) |
| `ADMIN_EMAIL` | Email del admin (default `admin@mundial.local`) |
| `ADMIN_PASSWORD` | Contraseña del admin (default `admin123456`) |
| `ADMIN_NAME` | Nombre visible del admin |

### Cuenta administrador (desarrollo)

Por defecto se crea o promueve un admin al iniciar el servidor:

- **Email:** `admin@mundial.local`
- **Contraseña:** `admin123456`

Iniciá sesión y abrí la pestaña **Administración**.

## API

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Crear cuenta |
| POST | `/api/auth/login` | Iniciar sesión |
| GET | `/api/auth/me` | Usuario actual (Bearer token) |
| GET | `/api/predictions` | Listar pronósticos del usuario |
| PUT | `/api/predictions/:matchId` | Guardar/actualizar pronóstico |
| DELETE | `/api/predictions/:matchId` | Borrar pronóstico |

### API Admin (requiere usuario admin)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/admin/dashboard` | Stats + ranking |
| GET | `/api/admin/predictions` | Todos los pronósticos con puntos |
| GET | `/api/admin/results` | Resultados reales + partidos |
| PUT | `/api/admin/results/:matchId` | Cargar resultado real |
| GET | `/api/admin/leaderboard` | Ranking de pronosticadores |

**Puntuación:** 3 pts resultado exacto · 1 pt acierto de ganador o empate.

## Archivos principales

| Archivo | Descripción |
|---------|-------------|
| `server/` | API Express + SQLite |
| `api.js` | Cliente HTTP |
| `auth-ui.js` | Login, registro y barra de usuario |
| `fixture.js` | Fixture + formularios de pronóstico |
| `fixture-data.js` | Grupos, partidos e IDs |
