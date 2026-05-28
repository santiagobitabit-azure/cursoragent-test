# cursoragent-test

Sitio del Mundial FIFA 2026: cuenta regresiva, fixture de fase de grupos y **pronósticos** con cuenta de usuario.

## Funcionalidades

- **Cuenta regresiva** al debut de Argentina (Grupo J)
- **Fixture** con los 12 grupos y 72 partidos (hora Argentina)
- **Registro e inicio de sesión** (email + contraseña)
- **Guardar pronósticos** de resultado (goles local : visitante) por partido

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

## API

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Crear cuenta |
| POST | `/api/auth/login` | Iniciar sesión |
| GET | `/api/auth/me` | Usuario actual (Bearer token) |
| GET | `/api/predictions` | Listar pronósticos del usuario |
| PUT | `/api/predictions/:matchId` | Guardar/actualizar pronóstico |
| DELETE | `/api/predictions/:matchId` | Borrar pronóstico |

## Archivos principales

| Archivo | Descripción |
|---------|-------------|
| `server/` | API Express + SQLite |
| `api.js` | Cliente HTTP |
| `auth-ui.js` | Login, registro y barra de usuario |
| `fixture.js` | Fixture + formularios de pronóstico |
| `fixture-data.js` | Grupos, partidos e IDs |
