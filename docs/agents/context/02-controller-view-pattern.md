# Controller-View Pattern (Agent Reference)

This is the **primary design pattern** for all feature modules. Every new page or complex component MUST follow this pattern.

## Quick Decision: Which Level?

```
Does it fetch data from API or use Server Actions?
├── YES → Level 1 (Page-Level)
│   └── Does it have a form with validation?
│       ├── YES → Level 1 + formHandler
│       └── NO  → Level 1 (standard)
├── NO, but has local UI state (tabs, toggles, etc.)?
│   └── YES → Level 2 (Sub-Component)
└── NO state at all?
    └── Pure View (no controller, just props)
```

## Level 1: Page-Level (Full)

```
featurePage/
├── controller/
│   ├── controller.ts              # Orchestrator — composes hooks, returns flat API
│   ├── actions.ts                 # Server Actions ('use server') → ActionResult<T>
│   └── hooks/
│       ├── queryHandler.ts        # useQuery/useLazyQuery calls
│       ├── globalState.ts         # useState + derived state
│       └── handler.ts             # Event handlers (calls actions, updates state)
├── views/                         # Presentation-only components (flat props)
│   └── someView/
├── types.ts                       # ALL types for every layer — single source of truth
├── featurePage.tsx                 # Pure wiring: controller → views
└── index.ts
```

**Hook dependency chain (ALWAYS one direction, NEVER circular):**
```
globalState ──→ queryHandler ──→ handler
```

## Level 1 + formHandler (Forms with Validation)

When a page/dialog includes a form with Zod validation, add `formHandler.ts` at the **top** of the chain:

```
featureDialog/
├── controller/
│   ├── controller.ts              # Orchestrator — composes ALL hooks
│   ├── actions.ts                 # Server Actions (if needed)
│   └── hooks/
│       ├── formHandler.ts         # ← NEW: useForm + Zod schema, owns form state
│       ├── queryHandler.ts        # Fetches data (can depend on form values)
│       ├── globalState.ts         # UI state (tabs, pagination, selections)
│       └── handler.ts             # Event handlers (reads form via getValues/trigger)
├── views/
├── types.ts
├── featureDialog.tsx
└── index.ts
```

**Hook dependency chain with formHandler:**
```
formHandler ──→ globalState ──→ queryHandler ──→ handler
(react-hook-form   (UI state:      (fetches data     (event handlers,
 + zod schema,      tabs, search,   using form +      reads form via
 owns form data)    pagination)     globalState)      getValues/trigger)
```

### formHandler.ts — Complete Pattern

**Reference:** `src/modules/releases/views/releasesListPage/views/createReleaseDialog/controller/hooks/formHandler.ts`

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect } from 'react'

// 1. Define Zod schema
export const createReleaseSchema = z.object({
  name: z.string().min(1, 'Required'),
  version: z.string().min(1, 'Required'),
  description: z.string().optional().default(''),
})

// 2. Infer type from schema
export type CreateReleaseFormValues = z.infer<typeof createReleaseSchema>

// 3. Hook owns useForm + handles reset on mode change
export function useCreateReleaseFormHandler(props: Props) {
  const form = useForm<CreateReleaseFormValues>({
    resolver: zodResolver(createReleaseSchema),
    defaultValues: { name: '', version: '', description: '' },
  })

  // Reset form when dialog opens/closes or mode changes (create vs edit)
  useEffect(() => {
    if (props.open) {
      if (props.mode === 'edit' && props.initialValues) {
        form.reset(props.initialValues)
      } else {
        form.reset({ name: '', version: '', description: '' })
      }
    }
  }, [props.open, props.mode])

  return { form }
}
```

### Key formHandler Rules

1. **formHandler owns ALL form state** — the Zod schema, `useForm()` call, and default values
2. **formHandler resets on mode change** — use `useEffect` to reset when dialog opens/switches between create/edit
3. **handler reads form via `getValues`/`trigger`** — handler does NOT own form state, it reads from formHandler
4. **queryHandler can depend on form values** — e.g., fetch suggestions based on form input
5. **Only one formHandler per controller** — if you need multiple forms, consider splitting into sub-components

## Level 2: Sub-Component

```
editorContent/
├── controller/
│   ├── controller.ts
│   └── hooks/
│       ├── globalState.ts         # Local UI state only
│       └── handler.ts             # UI event handlers
├── editorContent.tsx
├── types.ts
└── index.ts
```

**Simpler chain (no queryHandler, no actions.ts):**
```
globalState ──→ handler
```

## Controller Pattern Templates

### controller.ts (Page-Level)
```typescript
export function useFeaturePageController(id: string) {
  const globalState = useGlobalState(id)
  const query = useQueryHandler(id, { globalState })
  const handler = useHandler({ id, globalState })
  return { globalState, query, handler }
}
```

### controller.ts (with formHandler)
```typescript
export function useCreateDialogController(props: Props) {
  const { form } = useFormHandler(props)
  const globalState = useGlobalState()
  const query = useQueryHandler(props.open, { form, globalState })
  const handler = useHandler({ props, form, globalState, query })
  return { form, globalState, query, handler }
}
```

### actions.ts (Server Actions)
```typescript
'use server'
type ActionResult<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string; errorCode?: string }

export async function myAction(params: Params): Promise<ActionResult<ResponseType>> {
  try {
    const result = await mutationInstances.resource.method(params)
    return { success: true, data: result, error: null }
  } catch (e) {
    return { success: false, data: null, error: String(e) }
  }
}
```

### Main component (pure wiring)
```typescript
export function FeaturePage({ id }: Props) {
  const { globalState, query, handler } = useFeaturePageController(id)
  return (
    <SomeView
      data={query.data}
      isLoading={query.isLoading}
      onAction={handler.handleAction}
    />
  )
}
```

## Key Rules Checklist

- [ ] `types.ts` is the single source of truth — every layer's contract lives here
- [ ] **ALL types** (hook props, return types, controller types) MUST be defined in `types.ts` — NEVER define types inline in hook files or controller files. Hook files should `import type { ... } from '../../types'`
- [ ] Handler props use `Pick<GlobalState, ...>` to declare exact dependencies
- [ ] Views receive flat props only — no controller/store awareness
- [ ] Hook chain flows one direction — never circular
- [ ] Server Actions return `ActionResult<T>`
- [ ] Main component is pure wiring — destructure controller, pass to views
- [ ] Sub-components can nest their own controller when they have local state

## When to Use What (Quick Matrix)

| Situation | Pattern | Has formHandler? | Has queryHandler? | Has actions.ts? |
|-----------|---------|:----------------:|:-----------------:|:---------------:|
| Page with API calls + mutations | Level 1 (full) | No | Yes | Yes |
| Form dialog with validation + API calls | Level 1 + formHandler | Yes | Yes | No (uses parent) |
| Complex component with Zustand store access | Level 1 (no actions) | No | No | No |
| Sub-component with local UI state | Level 2 | No | No | No |
| Simple presentational view | No controller | No | No | No |

## Nested Structure (Real Example)

Page-level and sub-component-level controllers compose recursively:

```
workflowDetailPage/                        ← Level 1 (page)
├── controller/
│   ├── actions.ts                         ← Server Actions
│   ├── hooks/queryHandler.ts              ← Data fetching
│   ├── hooks/globalState.ts               ← State + derived data
│   └── hooks/handler.ts                   ← Handlers call actions
├── views/
│   └── draftsTab/                         ← Presentation view

releaseDetailPage/                         ← Level 1 (page)
├── controller/
│   ├── hooks/queryHandler.ts              ← getReleaseDetail, verify, publish
│   ├── hooks/globalState.ts               ← release, artifacts, dialog states
│   └── hooks/handler.ts                   ← handleVerify, handlePublish, handleExport
└── views/
    ├── workflowsTab/                      ← Artifact list
    └── verificationTab/                   ← Nested controller
        ├── controller/hooks/globalState.ts ← { expandedArtifacts }
        └── views/checkStatusBadge.tsx     ← Pure view

releasesListPage/                          ← Level 1 (page)
├── controller/
│   ├── actions.ts                         ← CRUD releases
│   ├── hooks/queryHandler.ts              ← getReleases (paginated)
│   └── hooks/handler.ts                   ← handleCreate, handleDelete
└── views/
    └── createReleaseDialog/               ← Level 1 + formHandler (multi-step)
        ├── controller/
        │   ├── hooks/formHandler.ts       ← Zod validation
        │   ├── hooks/globalState.ts       ← step, selectedArtifacts
        │   ├── hooks/queryHandler.ts      ← Fetch artifacts for selection
        │   └── hooks/handler.ts           ← handleNext, handleBack, handleSubmit
        └── views/selectableItemTable.tsx  ← Checkbox table

nodeConfigPanel/                           ← Level 1 (page)
├── controller/hooks/globalState.ts        ← activeTab, fullscreen, editorRefs
├── views/
│   └── inputTab/views/
│       └── inputMappingEditor/            ← Owns refs, registers providers
│           └── views/
│               ├── editorContent/         ← Level 2 (sub-component)
│               │   ├── controller/hooks/globalState.ts  ← { showVariables }
│               │   └── controller/hooks/handler.ts      ← { handleToggle }
│               └── fullscreenDialog/      ← Pure view (no controller)
```

## Real Examples in Codebase

| Module | Pattern | Reference Path |
|--------|---------|---------------|
| Workflow Detail | Level 1 (full) | `src/modules/workflows/views/workflowDetailPage/` |
| Create Release Dialog | Level 1 + formHandler | `src/modules/releases/views/releasesListPage/views/createReleaseDialog/` |
| Release Detail | Level 1 (full) | `src/modules/releases/views/releaseDetailPage/` |
| Releases List | Level 1 (full) | `src/modules/releases/views/releasesListPage/` |
| Deployment Page | Level 1 (tabbed) | `src/modules/deployment/views/deploymentPage/` |
| Deployment Tab | Level 1 (no actions) | `src/modules/deployment/views/deploymentPage/views/deploymentTab/` |
| Deployment Detail | Level 1 (full) | `src/modules/deployment/views/deploymentDetailPage/` |
| Editor Content | Level 2 | `.../nodeConfigPanel/views/inputTab/views/inputMappingEditor/views/editorContent/` |
| Fullscreen Dialog | Pure view | `.../inputMappingEditor/views/fullscreenDialog/` |
