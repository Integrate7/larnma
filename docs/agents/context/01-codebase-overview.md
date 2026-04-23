# Codebase Overview (Agent Reference)

## Setup

### Prerequisites
- Node.js >= 20.9.0, npm >= 9.0.0, Git >= 2.30.0

### Quick Start
```bash
git clone <repository-url>
cd frontend-workflow-builder-service
npm install
cp .env.example .env.local
npm run dev    # → http://localhost:3000
```

### Environment Variables
```env
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_WORKFLOW_ENGINE_API_URL=http://localhost:8000/
```

### Commands
| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run lint` | Biome linter + TypeScript check |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run type-check` | TypeScript check only |
| `npm test` | Unit tests (Jest) |
| `npm run test:e2e` | E2E tests (Playwright, headless) |
| `npm run test:e2e:ui` | E2E with Playwright UI |
| `npm run docker:up` | Start Docker containers |

---

## Tech Stack (exact versions matter)

| Technology | Version | Notes |
|-----------|---------|-------|
| Next.js | 16.1.6 | App Router, Turbopack dev |
| React | 19 | Server Components supported |
| TypeScript | 5.7 | Strict mode, no implicit `any` |
| @xyflow/react | 12 | Workflow canvas |
| Zustand | 5 | With Immer middleware |
| TanStack Query | 5 | Via custom hooks |
| Monaco Editor | 4 | Custom completion providers |
| Tailwind CSS | 4 | With shadcn/ui + Radix UI |
| Biome | — | Linter + formatter (NOT ESLint) |
| Playwright | — | E2E testing |
| Zod | 4 | Schema validation |
| Ajv | — | JSON Schema validation |

## Architecture Layers

```
Browser
├── React Components (shadcn/ui + Radix)
├── Workflow Canvas (@xyflow/react)
├── Code Editor (Monaco)
├── State Management (Zustand + Immer, 8 slices)
└── API Layer (TanStack Query + Adapter)
      ↓
API Gateway → Workflow API (Backend) + Auth Service (OAuth)
```

## Directory Map

```
src/
├── app/                    # Next.js App Router pages
│   ├── workflows/          # /workflows/[name] pages
│   ├── decision-tables/    # /decision-tables/[name] pages
│   ├── releases/           # /releases, /releases/[id] pages
│   ├── deployment/         # /deployment page (import, history)
│   ├── activity/           # Execution history pages
│   ├── auth/               # Login, callback, logout
│   └── config/             # App & DB configuration
├── modules/                # Feature modules (business logic) ← MOST WORK HAPPENS HERE
│   ├── workflow/           # Main workflow editor (largest module)
│   ├── workflows/          # Workflow list/management
│   ├── releases/           # Release management
│   ├── deployment/         # Deployment (import, rollback, history)
│   ├── decision/           # Decision table editor
│   ├── config/             # Configuration UI
│   ├── activity/           # Execution viewer
│   └── auth/               # Auth components
├── services/               # API layer ← ALL API CALLS GO THROUGH HERE
│   ├── adapter/            # Centralized API adapters
│   │   ├── config.ts       # Endpoint configs
│   │   ├── links/          # HTTP client (fetch wrapper)
│   │   ├── queries/        # GET operations
│   │   └── mutations/      # POST/PUT/DELETE operations
│   ├── useQuery/           # Auto-fetch on mount hook
│   ├── useLazyQuery/       # Manual trigger fetch hook
│   └── useMutation/        # Mutation hook
├── stores/                 # Zustand stores
│   ├── workflow/           # 8-slice workflow store (graph, selection, runtime, history, etc.)
│   ├── config/             # App config + DB connections
│   ├── sidebar/            # Sidebar collapse state
│   ├── toast/              # Toast notifications
│   ├── dialog/             # Dialog state
│   └── user/               # User/auth state
├── components/             # Shared UI components ← ALWAYS USE THESE, NEVER NATIVE HTML
│   ├── atom/               # Atomic wrappers (Button, Input, Dialog, etc.)
│   └── molecules/          # Composed components (AppLayout, Sidebar, Toast, etc.)
├── shared/                 # Shared types, helpers, hooks
│   ├── types/adapter/      # API type definitions
│   ├── helpers/            # Utility functions
│   └── hooks/              # useAuth, useTokenRefresh
├── providers/              # React context providers
├── config/                 # Route permissions, constants
└── hooks/                  # Global hooks
```

## Component Usage Rules

**NEVER use native HTML elements directly** — always use wrapped components from `src/components/`.

**NEVER import from `@radix-ui/` directly in application code** — only `src/components/atom/` files may import Radix primitives. Application code (modules, pages) must import from `@/components/atom/` or `@/components/molecules/`.

### Component Hierarchy

```
@radix-ui/* (Radix primitives)
    ↓ (imported ONLY by atom components)
src/components/atom/        ← Wrapped Radix components with styling + variants
    ↓ (imported by molecules and application code)
src/components/molecules/   ← Composed components (layout, sidebar, toast, etc.)
    ↓ (imported by application code)
src/modules/, src/app/      ← Application code — ONLY imports from @/components/
```

### Available Atom Components

| Component | Wraps | Import |
|-----------|-------|--------|
| `Button` | `@radix-ui/react-slot` | `@/components/atom/button` |
| `Input` | native input (styled) | `@/components/atom/input` |
| `Textarea` | native textarea (styled) | `@/components/atom/textarea` |
| `Label` | `@radix-ui/react-label` | `@/components/atom/label` |
| `Dialog` | `@radix-ui/react-dialog` | `@/components/atom/dialog` |
| `Popover` | `@radix-ui/react-popover` | `@/components/atom/popover` |
| `RadioGroup` | `@radix-ui/react-radio-group` | `@/components/atom/radioGroup` |
| `CheckboxGroup` | `@radix-ui/react-checkbox` | `@/components/atom/checkboxGroup` |
| `Combobox` | Button + Popover + Command | `@/components/atom/combobox` |
| `Command` | `cmdk` | `@/components/atom/command` |
| `Calendar` | — | `@/components/atom/calendar` |
| `DatePicker` | Calendar + Popover | `@/components/atom/datePicker` |
| `Card` | styled div | `@/components/atom/card` |
| `Table` | styled table | `@/components/atom/table` |
| `Link` | next/link (styled) | `@/components/atom/link` |
| `Skeleton` | — | `@/components/atom/skeleton` |
| `CodeEditor` | Monaco Editor | `@/components/atom/codeEditor` |
| `IfElement` | conditional render | `@/components/atom/ifElement` |
| `EachElement` | list render | `@/components/atom/eachElement` |
| `Select` | styled select | `@/components/atom/select` |
| `ResizablePanel` | resizable layout | `@/components/atom/resizablePanel` |
| `Info` | info display | `@/components/atom/info` |

### Molecules

| Component | Purpose |
|-----------|---------|
| `AppLayout` | Main app layout with sidebar |
| `Sidebar` | Navigation sidebar with controllers |
| `Navbar` | Top navigation bar |
| `Dialog` (molecule) | Higher-level composed dialog |
| `Toast` | Toast notifications |
| `LoadingSpinner` | Loading indicator |
| `ThemeToggle` | Dark/light mode toggle |
| `RouteGuard` | Client-side route protection |

---

## Critical Rules

See full list in `CLAUDE.md` (12 rules). Key ones for this doc:
- Always use `@/components/` — never native HTML or `@radix-ui/` directly
- All API calls go through `src/services/adapter/`
- Use `type` over `interface`

---

## Feature Status

### Implemented
- Visual Canvas: drag-and-drop, pan, zoom, minimap, edge validation, error indicators, node palette, drop-on-edge insert
- All 12 Node Types: Start, End, Code, HTTP, DB, If, Switch, Response, Error, Sub-Workflow, Webhook, Decision
- Monaco Editor: syntax highlighting, IntelliSense, reserved variables autocomplete, fullscreen, auto-save (400ms debounce)
- Global State: workflow-level variables, globalState API (get/set/has/getAll), visual editor
- Workflow Management: create, save, publish, delete, draft/published versioning, list, detail, import/export
- Schema System: JSON Schema 2020-12, visual schema editor, Ajv validation, sample data validation
- Undo/Redo: graph snapshots (max 50), Ctrl+Z / Ctrl+Shift+Z
- Auth & RBAC: OAuth 2.0 (Microsoft), cookie sessions, middleware protection, 5 roles
- Execution: workflow run with validation, node status tracking, error collection, execution history
- UI/UX: shadcn/ui, Tailwind dark mode, toast, dialog, i18n, responsive layout
- Release Management: create, verify, publish, export releases with artifact selection
- Deployment: import packages, rollback, deployment history
- Decision Tables: spreadsheet-like grid editor, versioning, draft management

### In Progress
- Enhanced webhook node configuration
- Workflow execution details improvements

### Planned
- Python language support for code nodes
- Schedule triggers (cron)
- Event-based triggers
- Workflow templates
- Team collaboration features
- Audit logging UI

---

## Key Design Decisions

- **Feature-based modules** over traditional atomic design for business logic
- **Zustand + Immer** over Redux for simpler, less boilerplate state management
- **Server Actions** (primary) for mutations; client hooks (legacy) still supported
- **Monaco Editor** for all code/JSON/SQL editing with custom completion providers
- **@xyflow/react** for workflow canvas with custom node components
- **Biome** over ESLint+Prettier for faster linting/formatting
- **Cookie-based auth** with OAuth 2.0 (Microsoft) — no JWT in frontend
