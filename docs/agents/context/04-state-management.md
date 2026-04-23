# State Management (Agent Reference)

## Zustand + Immer

All stores use Zustand with Immer middleware, allowing direct mutations in `set()` callbacks.

## Workflow Store (8 slices)

Location: `src/stores/workflow/`

```typescript
const useWorkflowStore = create<WorkflowStore>()(
  immer((...a) => ({
    ...createDisplayModeSlice(...a),   // displayMode: edit | view | view-only
    ...createGraphSlice(...a),         // nodes[], edges[]
    ...createSelectionSlice(...a),     // selectedNodeIds, inspector panel
    ...createGlobalStateSlice(...a),   // variables[], appConfigKeys[]
    ...createRuntimeSlice(...a),       // isRunning, errors, validation
    ...createHistorySlice(...a),       // undo/redo snapshots (max 50)
    ...createPersistenceSlice(...a),   // isDirty, lastSavedAt
    ...createWorkflowMetaSlice(...a),  // name, description, schemas
  }))
);
```

### Slice Quick Reference

| Slice | Key State | Key Actions |
|-------|-----------|-------------|
| **graph** | `nodes`, `edges` | `addNode`, `removeNode`, `updateNodeData`, `onConnect`, `loadWorkflow` |
| **selection** | `selectedNodeIds`, `activeNodeId`, `inspector` | `selectNode`, `openInspector`, `closeInspector` |
| **globalState** | `variables`, `appConfigKeys` | `addGlobalVariable`, `updateGlobalVariable`, `removeGlobalVariable` |
| **runtime** | `isRunning`, `errorsByNodeId`, `workflowErrors` | `run`, `validateGraph`, `buildRunPayload` |
| **history** | `past[]`, `future[]` | `saveToHistory`, `undo`, `redo`, `clearHistory` |
| **persistence** | `isDirty`, `lastSavedAt` | `markAsDirty`, `markAsSaved` |
| **workflowMeta** | `name`, `description`, `inputSchema`, `outputSchema` | `setWorkflowName`, `setWorkflowDescription` |
| **displayMode** | `displayMode` | `setDisplayMode` |

### Creating a New Slice

```typescript
// src/stores/workflow/slices/mySlice.ts
export const createMySlice: StateCreator<
  WorkflowStoreState,
  [["zustand/immer", never]], [], MySlice
> = (set, get) => ({
  myData: [],
  updateMyData: (id, data) => set((state) => {
    const item = state.myData.find(x => x.id === id);
    if (item) Object.assign(item, data); // Immer allows direct mutation
  }),
});
```

### Selection Slice: Mutually Exclusive Panels

Inspector and workflowConfig panels are mutually exclusive:
- Opening inspector closes workflowConfig
- Opening workflowConfig closes inspector

## Other Stores

| Store | Location | Purpose |
|-------|----------|---------|
| `configStore` | `src/stores/config/` | App config + DB connections |
| `sidebarStore` | `src/stores/sidebar/` | Sidebar collapse/expand |
| `toastStore` | `src/stores/toast/` | Toast notifications |
| `dialogStore` | `src/stores/dialog/` | Dialog open/close |
| `userStore` | `src/stores/user/` | Current user, isAuthenticated |

## Node Data Types in Store

The workflow store manages nodes with specific data types per kind. Two complex types worth understanding:

### Switch Node (`SwitchNodeData`)

Location: `src/stores/workflow/types.ts`

```typescript
type SwitchNodeData = BaseNodeData & {
  kind: 'switch'
  cases: SwitchCase[]       // Ordered list of conditions
  defaultCase: SwitchDefaultCase
}

type SwitchCase = {
  id: string                // "case_1", "case_2", ...
  order: number             // Sequential from 1
  condition: string         // JavaScript expression
  target?: string
  targetPort?: string
}

type SwitchDefaultCase = {
  id: 'default'
  target?: string
}
```

**Key behaviors:**
- Output handles are **dynamic** — computed from `node.data.cases` at render time (NOT static like other nodes)
- Routes to the first matching condition
- Default case is always last and non-removable
- Cases can be reordered via drag-and-drop
- Conditions are JavaScript expressions (evaluated in backend sandbox)

### Decision Table Node (`DecisionNodeData`)

Location: `src/stores/workflow/types.ts`

```typescript
type DecisionNodeData = BaseNodeData & {
  kind: 'decision_table'
  decisionTableId?: string      // UUID of selected table
  decisionTableName?: string    // URL-safe name (shown on canvas)
  version?: number              // Pinned published version
  revision?: number             // Pinned published revision
}
```

**Key behaviors:**
- References a **published** decision table by ID, name, and version
- Config UI: combobox to select table, then select version
- Version displayed as "version.revision" format (e.g., "1.0")
- Requires both a decision table AND a version selection
- Config path: `.../nodeSpecificConfig/views/decisionNodeConfig/`

## Debug Access

```typescript
// Browser console or E2E tests
window.__WORKFLOW_STORE__.getState()
window.__WORKFLOW_STORE__.getState().graph.nodes
window.__WORKFLOW_STORE__.getState().runtime.errorsByNodeId
```
