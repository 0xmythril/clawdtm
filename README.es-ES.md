# ClawdTM

**Construido por [@0xmythril](https://x.com/0xmythril)** · Basado en [OpenClaw](https://openclaw.ai/) · [Clawdhub](https://clawdhub.com)

---

**Habilidades verificadas para tu OpenClaw** — una aplicación web para explorar, buscar e instalar habilidades comunitarias desde [Clawdhub](https://clawdhub.com) para [OpenClaw](https://openclaw.ai/).

**Qué es:** Un directorio e instalador de habilidades curado para OpenClaw. Las habilidades son complementos creados por la comunidad (herramientas, flujos de trabajo, integraciones). Esta aplicación sincroniza el catálogo de Clawdhub, añade escaneo de seguridad y moderación, y permite a los usuarios buscar y filtrar por categoría, etiquetas, valoraciones y nivel de seguridad. Piensa en ello como un "npm para OpenClaw" con una capa de seguridad añadida.

- **Stack:** Next.js 16 (App Router), React 19, Convex, Tailwind 4
- **Datos:** Habilidades sincronizadas desde la API de Clawdhub hacia Convex; categorías/etiquetas; búsqueda de texto completo; puntuaciones de seguridad y niveles de riesgo.
- **UI:** Filtros laterales (valoraciones, seguridad, etiquetas), barra de búsqueda, vista de tarjeta/lista, modal de instalación, navegación inferior móvil, sección Acerca de (aprender).
- **API:** API HTTP pública en `/api/v1/skills/search` y `/api/v1/skills/install` para el Skill Advisor; la búsqueda excluye riesgos altos/críticos por defecto; la instalación bloquea habilidades con puntuación baja a menos que `acknowledge_risk=true`.

## Inicio rápido

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Convex (requerido)

1. Cuenta y proyecto de [Convex](https://convex.dev)
2. `npx convex dev` en una terminal separada (o `npx convex deploy` para producción)
3. Env: `.env.local` con `NEXT_PUBLIC_CONVEX_URL` (y cualquier variable de entorno de Convex que necesites)

La aplicación lee únicamente de Convex; sin Convex = sin datos de habilidades. La sincronización desde Clawdhub se ejecuta mediante crons de Convex.

## Scripts

| Comando        | Descripción                    |
|----------------|--------------------------------|
| `npm run dev`  | Servidor de desarrollo Next.js |
| `npm run build`| Build de producción            |
| `npm run start`| Ejecutar servidor de producción|
| `npm run lint` | ESLint                         |

Ejecuta el CLI de Convex desde la raíz del proyecto: `npx convex dev`, `npx convex deploy`, `npx convex dashboard`, etc.

## Estructura del proyecto

```
src/
  app/           # Next App Router: páginas, layouts, rutas de API (v1 skills, advisor, review)
  components/   # Sidebar, SearchBar, SkillCard, InstallModal, nav móvil, primitivas de UI
  lib/          # analíticas (GA4), utilidades
convex/
  clawdhubSync.ts   # Sincronización de API de Clawdhub, sync de autores de GitHub, detección de habilidades eliminadas, CRUD de habilidades cacheadas
  categorization.ts # Asignación de categorías/etiquetas basada en lógica (cron)
  security.ts      # Escaneo de seguridad con IA, puntuación de riesgo, ocultado automático de habilidades con baja puntuación, estado de re-escaneo
  crons.ts         # Sincronización (2h), categorización (4h), sync de autores de GitHub (2h), escaneo de seguridad (5m), chequeo de commits (15m)
  schema.ts        # Esquema de Convex (cachedSkills, clawdhubSyncState, securityRescanState, etc.)
  lib/             # openrouter (escaneo IA), virustotal, embeddings
public/         # Favicons, logo, activos estáticos
```

## Arquitectura

- **Frontend:** Página principal de habilidades con estado de URL para `q`, `category`, `sort`, `tags`, `security`; Convex `useQuery` para categorías, etiquetas, estado de sincronización, lista de habilidades paginada y búsqueda. Sección Acerca de (aprender) para documentación; panel de administración para el tablero de seguridad, autores y moderación.
- **Backend:** Tablas de Convex `cachedSkills`, `clawdhubSyncState`, `securityRescanState`, `securityScanLogs`, etc. Las habilidades se sincronizan desde Clawdhub; los autores se enriquecen desde el árbol de habilidades de GitHub de OpenClaw; las habilidades eliminadas de ese árbol se ocultan automáticamente. El escaneo de seguridad (IA + VirusTotal opcional) califica cada habilidad del 0 al 100; las habilidades por debajo de 50 se ocultan automáticamente. API pública de Convex: `getCategories`, `getTags`, `getSyncStatus`, `listCachedSkillsWithFilters`, `searchCachedSkills` (ver [convex/README.md](convex/README.md)). API HTTP pública: `/api/v1/skills/search`, `/api/v1/skills/install` (por defecto: excluye riesgos altos/críticos; la instalación bloquea puntuaciones bajas a menos que `acknowledge_risk=true`).

## Analíticas

GA4 a través de `@next/third-parties` y `src/lib/analytics.ts`. Eventos: búsqueda, filtros de categoría/etiqueta, orden, modo de vista, cargar más, instalación de habilidad, enlaces externos. Configura `NEXT_PUBLIC_GA_MEASUREMENT_ID` si utilizas GA4.

## Despliegue

- **Frontend:** Vercel (o cualquier host de Next.js). Apunta a tu despliegue de Convex.
- **Backend:** Convex (`npx convex deploy`). Los crons y el entorno se configuran en el panel de Convex.

No confirmes (commit) `.env*`; `.notes/` está en el gitignore para notas locales/privadas.

---

**Autor / Créditos** — Construido por [@0xmythril](https://x.com/0xmythril)
