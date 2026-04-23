# Data Layer (Agent Reference)

## Golden Rule

**ALL API calls MUST go through `src/services/adapter/`** — never call fetch/axios directly from components.

## Request Flow

```
Component → Server Action / Hook → Query/Mutation Instance → Links Client → Backend API
                                                                              ↓
Component ← Type-safe Data ← Zod Validation ← Response ←────────────────────┘
```

## When to Use What

| Scenario | Pattern | File Location |
|----------|---------|---------------|
| Initial page load (SSR) | `async` server page | `app/.../page.tsx` |
| Auto-fetch on mount | `useQuery` hook | `controller/hooks/queryHandler.ts` |
| User-triggered fetch (search, pagination) | `useLazyQuery` hook | `controller/hooks/queryHandler.ts` |
| Simple mutations (delete, toggle) | `useMutation` hook | `controller/hooks/handler.ts` |
| Complex mutations (save, publish) | Server Action | `controller/actions.ts` |

## Adding a New API Endpoint (Step-by-Step)

### 1. Add endpoint config
```typescript
// src/services/adapter/config.ts
export const API_CONFIG = {
  myResource: {
    list: { path: '/my-resource', tags: ['my-resource'], revalidate: 60 },
    detail: { path: '/my-resource/:id', tags: ['my-resource'] },
    create: { path: '/my-resource', tags: ['my-resource'] },
  },
};
```

### 2. Create types
```typescript
// src/shared/types/adapter/myResource/types.ts
export type MyResource = { id: string; name: string };
export type GetMyResourcesResponse = { items: MyResource[]; total: number };
```

### 3. Create Zod schema
```typescript
// src/services/adapter/queries/myResource/schema.ts
import { z } from 'zod';

export const getMyResourcesSchema = z.object({
  items: z.array(z.object({ id: z.string(), name: z.string() })),
  total: z.number(),
});
```

### 4. Create Query/Mutation class
```typescript
// src/services/adapter/queries/myResource/myResource.ts
export class MyResourceQuery extends BaseQuery {
  async list(params?: ListParams): Promise<GetMyResourcesResponse> {
    return this.get(API_CONFIG.myResource.list.path, {
      params,
      schema: getMyResourcesSchema,
    });
  }
}
```

### 5. Export from adapter index
```typescript
// src/services/adapter/index.ts
export const queryInstances = { ..., myResource: new MyResourceQuery() };
```

### 6. Use in Server Action or hook
```typescript
// Server Action
'use server';
export async function getMyResources(params: ListParams) {
  return queryInstances.myResource.list(params);
}

// Or in queryHandler.ts
const { data, isLoading } = useQuery({
  queryKey: ['myResource'],
  action: () => getMyResources(),
});
```

## Adapter Directory Structure

```
src/services/adapter/
├── config.ts              # Endpoint configs (paths, tags, revalidate)
├── links/                 # HTTP client wrapper (fetch-based)
├── instance/              # Singleton Query/Mutation instances
├── queries/               # GET operations (Query classes)
│   └── [resource]/
│       ├── resource.ts    # Query class implementation
│       ├── schema.ts      # Zod response schema
│       ├── types.ts       # Request/response types
│       └── index.ts
├── mutations/             # POST/PUT/DELETE operations (Mutation classes)
│   └── [resource]/
│       ├── resource.ts    # Mutation class implementation
│       ├── schema.ts      # Zod response schema
│       ├── types.ts       # Request/response types
│       └── index.ts
└── index.ts               # Export all instances
```

## Data Fetching Pattern Examples

### Pattern 1: Server-Side Fetch (SSR)
```typescript
// app/workflows/[name]/page.tsx
export default async function WorkflowPage({ params }: Props) {
  const workflow = await getWorkflowByName(params.name); // Server Action
  return <WorkflowEditor initialData={workflow} />;
}
```

### Pattern 2: useQuery (Auto-Fetch on Mount)
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['dbConnections'],
  action: () => getDbConnections(),
});
```

### Pattern 3: useLazyQuery (Manual Trigger)
```typescript
const { data, isLoading, fetch } = useLazyQuery({
  action: (params) => searchWorkflows(params),
});
// Trigger: fetch({ search: 'my-workflow', page: 1 })
```

### Pattern 4: useMutation (Client Mutation)
```typescript
const { mutate, isLoading } = useMutation({
  action: (id) => deleteWorkflow(id),
  onSuccess: () => { revalidateTag('workflows'); },
});
```

### Combining Patterns (Real-World)

Workflow list page uses `useLazyQuery` + debounce for search:
```typescript
const { data, fetch } = useLazyQuery({ action: searchWorkflows });
const debouncedFetch = useDebouncedCallback(fetch, 300);
// On search input change: debouncedFetch({ search: value })
```

## Key Rules

- Use `:param` syntax for dynamic URL segments (e.g., `/users/:id`)
- All responses validated with Zod schemas
- Links client handles auth headers, error responses, and 401 redirects automatically
- Server Actions are preferred over client-side mutations for complex operations
