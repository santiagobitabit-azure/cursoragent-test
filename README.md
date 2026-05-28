# cursoragent-test

Sitio del Mundial FIFA 2026 con cuenta regresiva al debut de Argentina y fixture completo de la fase de grupos.

## Secciones

### Cuenta regresiva
- **Partido:** Argentina vs Argelia (Grupo J)
- **Fecha:** martes 16 de junio de 2026, 22:00 (hora Argentina)
- **Sede:** Kansas City Stadium

### Fixture · Grupos
- Los **12 grupos** (A–L) con sus **4 equipos**
- Los **72 partidos** de fase de grupos (11–27 de junio)
- **Horarios en hora Argentina**
- Filtro por grupo (incluye vista “Todos”)
- Partidos de Argentina resaltados en el Grupo J

## Ver en local

```bash
python3 -m http.server 8080
```

Luego visitar http://localhost:8080

## Archivos

| Archivo | Descripción |
|---------|-------------|
| `index.html` | Página principal con pestañas |
| `app.js` | Cuenta regresiva y navegación |
| `fixture-data.js` | Datos de grupos y partidos |
| `fixture.js` | Render del fixture |
| `styles.css` | Estilos |
