# cursoragent-test

Sitio del Mundial FIFA 2026: cuenta regresiva, fixture de fase de grupos y **pronósticos** con cuenta de usuario.

## Funcionalidades

- **Cuenta regresiva** al debut de Argentina (Grupo J)
- **Fixture** con los 12 grupos y 72 partidos (hora Argentina)
- **Registro e inicio de sesión** (email + contraseña)
- **Guardar pronósticos** de resultado (goles local : visitante) por partido
- **Panel de administración**: ver todos los pronósticos, consultar resultados de la API y ranking de aciertos

## Requisitos

- Node.js 18+

## Cómo correr

```bash
docker compose up -d
npm install
npm start
```

Abrí http://localhost:8080

> El servidor Express sirve la web estática y la API (`/api/auth`, `/api/predictions`). Los datos se guardan en **PostgreSQL**.

### Base de datos local

```bash
docker compose up -d
npm install
npm start
```

Por defecto la app usa `postgresql://mundial:mundial@localhost:5432/mundial`. Podés cambiarla con `DATABASE_URL`.

### Variables de entorno (opcional)

| Variable | Descripción |
|----------|-------------|
| `PORT` | Puerto (default `8080`) |
| `JWT_SECRET` | Secreto para tokens JWT (cambiar en producción) |
| `DATABASE_URL` | Cadena de conexión PostgreSQL |
| `PGSSLMODE` | `disable` para desactivar SSL (desarrollo local) |
| `WORLDCUP_API_BASE_URL` | Base URL de la API de resultados (default `https://worldcup26.ir`) |
| `LIVE_SYNC_ENABLED` | `false` para desactivar sync automático |
| `LIVE_SYNC_WATCH_INTERVAL_MS` | Intervalo de detección pre-live (default 60000) |
| `LIVE_SYNC_LIVE_INTERVAL_MS` | Intervalo durante partido en juego (default 60000) |
| `LIVE_SYNC_MATCH_WINDOW_HOURS` | Ventana máxima post-kickoff para polling (default 2.5) |
| `LOG_LEVEL` | Nivel de log: `debug`, `info`, `warn`, `error` (default `info` en prod, `debug` en dev) |
| `LOG_PRETTY` | `true` para salida legible en consola; en producción dejar sin definir (JSON a stdout) |

### Administradores

El rol de administrador vive en la base de datos (`users.is_admin`). El JWT solo identifica al usuario; los permisos se consultan en cada petición contra PostgreSQL.

1. Registrate en la app con el email que quieras usar como admin.
2. Promové ese usuario:

```bash
npm run set-admin -- tu@email.com
```

Para quitar permisos:

```bash
npm run set-admin -- tu@email.com --revoke
```

También podés actualizar la fila directamente en PostgreSQL:

```sql
UPDATE users SET is_admin = TRUE WHERE email = 'tu@email.com';
```

Iniciá sesión de nuevo (o abrí **Administración** para refrescar el perfil) y verás la pestaña de administración.

## API

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Crear cuenta |
| POST | `/api/auth/login` | Iniciar sesión |
| GET | `/api/auth/me` | Usuario actual (Bearer token) |
| GET | `/api/predictions` | Listar pronósticos del usuario |
| PUT | `/api/predictions/:matchId` | Guardar/actualizar pronóstico |
| DELETE | `/api/predictions/:matchId` | Borrar pronóstico |

### Resultados en vivo y ranking (público)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/matches/live` | Marcadores y estado de partidos (desde BD local) |
| GET | `/api/leaderboard` | Ranking público de pronosticadores |

Los resultados se sincronizan automáticamente desde [worldcup26.ir](https://worldcup26.ir/api-docs/#/) durante la ventana de cada partido (un poller por partido activo, cada 60 s). No hay carga manual por administrador.

### API Admin (requiere usuario admin)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/admin/dashboard` | Stats + ranking |
| GET | `/api/admin/predictions` | Todos los pronósticos con puntos |
| GET | `/api/admin/results` | Consulta de resultados reales + partidos (solo lectura) |
| GET | `/api/admin/leaderboard` | Ranking de pronosticadores |

**Puntuación:** 3 pts resultado exacto · 1 pt acierto de ganador o empate.

## Archivos principales

| Archivo | Descripción |
|---------|-------------|
| `server/` | API Express + PostgreSQL |
| `public/` | Frontend estático (HTML, CSS, JS del navegador) |
| `docker-compose.yml` | PostgreSQL local para desarrollo |
| `public/api.js` | Cliente HTTP |
| `public/auth-ui.js` | Login, registro y barra de usuario |
| `public/fixture.js` | Fixture + formularios de pronóstico |
| `public/fixture-data.js` | Grupos, partidos e IDs |

## Deploy en Azure

La app se despliega en **Azure Container Apps** con **Azure Database for PostgreSQL Flexible Server**. El CI/CD corre con **GitHub Actions** (OIDC, sin contraseñas en el repo).

### Archivos de infraestructura

| Archivo | Descripción |
|---------|-------------|
| `Dockerfile` | Imagen de producción (Node 20) |
| `infra/main.bicep` | Container Apps, ACR, PostgreSQL, Log Analytics |
| `infra/main.parameters.json` | Parámetros de ejemplo (editar `jwtSecret` y `postgresAdminPassword`) |
| `.github/workflows/azure-deploy.yml` | Build en ACR + deploy automático |

### 1. Prerrequisitos

- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) (`az`) logueado: `az login`
- Suscripción activa con permisos para crear recursos
- Repo en GitHub

### 2. Crear infraestructura

```bash
# Variables (ajustá a tu entorno)
RESOURCE_GROUP="rg-mundial2026"
LOCATION="westeurope"
JWT_SECRET="$(openssl rand -base64 48)"
POSTGRES_PASSWORD="$(openssl rand -base64 24)"

az group create --name "$RESOURCE_GROUP" --location "$LOCATION"

az deployment group create \
  --name main \
  --resource-group "$RESOURCE_GROUP" \
  --template-file infra/main.bicep \
  --parameters baseName=mundial2026 location="$LOCATION" jwtSecret="$JWT_SECRET" postgresAdminPassword="$POSTGRES_PASSWORD"
```

Guardá los outputs del deploy:

```bash
az deployment group show \
  --resource-group "$RESOURCE_GROUP" \
  --name main \
  --query properties.outputs
```

> La primera vez la Container App arranca con una imagen placeholder de Microsoft (sin `/api/health`). El workflow de GitHub la reemplaza en el primer deploy con tu app real.

### 3. Configurar GitHub Actions (OIDC)

Creá una App Registration y federación con GitHub:

```bash
APP_NAME="github-mundial2026-deploy"
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)
GITHUB_ORG="TU_USUARIO_O_ORG"
GITHUB_REPO="TU_REPO"

APP_ID=$(az ad app create --display-name "$APP_NAME" --query appId -o tsv)
az ad sp create --id "$APP_ID"

az ad app federated-credential create \
  --id "$APP_ID" \
  --parameters "{\"name\":\"github-main\",\"issuer\":\"https://token.actions.githubusercontent.com\",\"subject\":\"repo:${GITHUB_ORG}/${GITHUB_REPO}:ref:refs/heads/main\",\"audiences\":[\"api://AzureADTokenExchange\"]}"

az role assignment create \
  --assignee "$APP_ID" \
  --role Contributor \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP"

ACR_ID=$(az acr show --resource-group "$RESOURCE_GROUP" --name "$(az deployment group show -g "$RESOURCE_GROUP" -n main --query properties.outputs.acrName.value -o tsv)" --query id -o tsv)

az role assignment create \
  --assignee "$APP_ID" \
  --role "AcrPush" \
  --scope "$ACR_ID"
```

En GitHub → **Settings → Secrets and variables → Actions**:

**Secrets:**

| Secret | Valor |
|--------|-------|
| `AZURE_CLIENT_ID` | App ID del paso anterior |
| `AZURE_TENANT_ID` | `$TENANT_ID` |
| `AZURE_SUBSCRIPTION_ID` | `$SUBSCRIPTION_ID` |

**Variables** (repository variables):

| Variable | Valor (desde outputs del deploy) |
|----------|----------------------------------|
| `AZURE_RESOURCE_GROUP` | `rg-mundial2026` |
| `AZURE_ACR_NAME` | output `acrName` |
| `AZURE_CONTAINER_APP_NAME` | output `containerAppName` |

### 4. Primer deploy

Hacé push a `main` o ejecutá el workflow manualmente (**Actions → Deploy to Azure Container Apps → Run workflow**).

Al terminar, la URL estará en el output `containerAppUrl` del deploy Bicep o en:

```bash
az containerapp show \
  --name "$AZURE_CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn -o tsv
```

### Logs en Azure Log Analytics

El servidor escribe logs estructurados (JSON) a stdout. Container Apps los envía al workspace de Log Analytics definido en Bicep.

Consultas KQL de ejemplo:

```kusto
ContainerAppConsoleLogs_CL
| where TimeGenerated > ago(1h)
| extend parsed = parse_json(Log_s)
| where isnotempty(parsed.component)
| project TimeGenerated, parsed.component, parsed.level, parsed.msg, parsed.matchId
| order by TimeGenerated desc
```

Errores y warnings del sync en vivo:

```kusto
ContainerAppConsoleLogs_CL
| where TimeGenerated > ago(24h)
| extend parsed = parse_json(Log_s)
| where parsed.component == "live-sync" and parsed.level >= 40
| project TimeGenerated, parsed.msg, parsed.matchId, parsed.err
```

> En producción no uses `LOG_PRETTY=true`: cada línea debe ser JSON válido para que `parse_json` funcione.

### 5. Promover administrador en producción

Registrate en la app desplegada y luego:

```bash
az containerapp exec \
  --name "$AZURE_CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --command "node scripts/set-admin.js tu@email.com"
```

### Desarrollo local con Docker

```bash
docker compose up -d
docker build -t mundial-2026 .
docker run --rm -p 8080:8080 \
  --network github-test_default \
  -e JWT_SECRET=dev-secret \
  -e DATABASE_URL=postgresql://mundial:mundial@db:5432/mundial \
  -e PGSSLMODE=disable \
  mundial-2026
```

> Ajustá `--network` al nombre que muestre `docker compose ps` si difiere del proyecto.
