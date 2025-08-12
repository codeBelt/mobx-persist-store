### MobX Persist Store — Performance Review and Refactor Plan

#### Scope

Assessed core modules: `PersistStore`, `makePersistable`, `StorageAdapter`, `serializableProperty`, wrappers in `src/*`, and utils.

---

### High-impact issues (top to bottom)

- **Redundant writes due to reaction data shape**
  - The reaction in `PersistStore.startPersisting` builds a new object each run and serializes all tracked properties every time, triggering the effect even when data hasn’t changed.
  - There’s no structural equality comparator, so even identical snapshots will cause writes.
  - Effect is `async` without coalescing; multiple rapid updates can enqueue overlapping `setItem` calls.

- **Heavy serialization and double cloning**
  - Inside the reaction, properties are serialized per-run, and `toJS` is called multiple times, including once on already-converted arrays (Maps/Sets), leading to redundant deep cloning.

- **ObservableMap/ObservableSet hydration replaces instances**
  - Hydration reassigns containers instead of mutating existing `ObservableMap`/`ObservableSet` instances, potentially breaking observability and causing avoidable GC churn.

- **Duplicate store name handling is dev-only and O(n)**
  - Dev builds iterate `PersistStoreMap` to stop previous stores with the same `storageName`. In prod, duplicates can persist concurrently and thrash the same storage key.

- **Per-run metadata checks**
  - `isComputedProp`/`isAction` are recomputed on each reaction evaluation instead of being determined once per tracked property.

- **StorageAdapter: parse path uses exceptions for control flow**
  - `getItem` always tries `JSON.parse` and falls back on exception. When `stringify === false`, this throws on every read.

- **Default reaction options are write-heavy**
  - `fireImmediately: true` and no default `delay` lead to immediate and frequent writes during initialization and rapid change bursts.

- **Error handling and resilience**
  - Storage operations aren’t wrapped with error handling; failures can surface as unhandled rejections and leave state unclear.

- **Micro-optimizations in utils**
  - `hasTimestampExpired` and some guards can be simplified to reduce overhead in hot paths.

---

### Recommended changes

- **Add structural equality and coalesced writes**
  - Use MobX reaction options with structural equality (e.g., `equals: comparer.structural`) to prevent unnecessary effects when the snapshot hasn’t changed.
  - Add a simple write queue in `PersistStore` to serialize writes and coalesce multiple rapid updates into the last snapshot.

- **Avoid redundant `toJS` and heavy clones**
  - After converting `ObservableMap` to an array and `ObservableSet` to an array of `toJS` elements, skip the final `toJS(propertyData)` — assign the already-plain value.
  - Consider shallow cloning for plain objects/arrays when `stringify: true` (JSON.stringify already clones/serializes).

- **Preserve observable container instances on hydration**
  - For `ObservableMap`/`ObservableSet`, mutate in place rather than reassign. Use `.replace` where available or `.clear()` + repopulate to keep the observable instance and subscriptions intact.

- **Enforce unique `storageName` in all builds**
  - Maintain an auxiliary `Map<string, PersistStore>` keyed by `storageName`. On initialization, stop previous and replace in both maps in O(1), regardless of `NODE_ENV`.

- **Cache property metadata**
  - Precompute `isComputed`/`isAction` once per property in the constructor and reuse in the reaction loop.

- **Smarter `getItem` parsing**
  - If `options.stringify === false` or `typeof storageData !== 'string'`, skip JSON.parse.
  - If `stringify` is true and `typeof storageData === 'string'`, parse; otherwise treat as plain.

- **Safer, less chatty defaults**
  - Default `reaction` options: `fireImmediately: false`, `delay: 50–150ms` to batch bursts. Keep current behavior behind an opt-in flag for backward compatibility.

- **Error handling**
  - Wrap storage reads/writes in try/catch and log via `consoleDebug`/`console.warn` in debug mode. Optionally expose hooks for error reporting.

- **Utils micro-optimizations and minor correctness**
  - `hasTimestampExpired(milliseconds): return milliseconds <= Date.now()`.
  - `serializableProperty` validation should check `typeof obj[key] !== 'undefined'` for each required field; optionally validate that `serialize`/`deserialize` are functions.

---

### Concrete refactor plan (phased)

- **Phase 1: Low risk, high ROI**
  - Add write queue to `PersistStore` effect: serialize writes and coalesce to the latest snapshot.
  - Remove redundant `toJS` on already-plain values; minimize deep cloning.
  - Cache `isComputed`/`isAction` per property.
  - Update `StorageAdapter.getItem` to avoid try/catch for non-JSON cases; add light error handling.
  - Mutate `ObservableMap`/`ObservableSet` in place during hydration.

- **Phase 2: Behavioral improvements (opt-in defaults)**
  - Add `equals: comparer.structural` to reaction options; expose as configurable and default it to structural when a new config flag (e.g., `optimizeWrites: true`) is enabled.
  - Introduce `defaultDelay` and `defaultFireImmediately` in `configurePersistable`; set conservative defaults when `optimizeWrites` is on.

- **Phase 3: Robustness and scalability**
  - Introduce `PersistStoreNameMap: Map<string, PersistStore>` and enforce unique `storageName` across envs (replace previous automatically).
  - Optional: per-property reactions to avoid re-serializing all properties on single-property changes. Only pursue if profiling shows the single reaction remains a hot spot.

---

### Change sketches (illustrative)

- **Write queue in `PersistStore` effect**

```ts
let pendingWrite: Promise<void> | null = null;
let enqueuedData: any | null = null;

const enqueueWrite = (data: any) => {
  enqueuedData = data;
  if (pendingWrite) return;
  pendingWrite = (async () => {
    while (enqueuedData) {
      const next = enqueuedData;
      enqueuedData = null;
      try {
        await this.storageAdapter!.setItem(this.storageName, next);
      } catch (e) {
        consoleDebug(this.debugMode, `${this.storageName} - setItem failed`, e);
      }
    }
    pendingWrite = null;
  })();
};
```

- **Hydration preserving observable containers**

```ts
if (target[key] instanceof ObservableMap && isArrayForMap(propertyData)) {
  const map = target[key] as ObservableMap<any, any>;
  map.clear();
  for (const [k, v] of propertyData) map.set(k, property.deserialize(v));
  return; // do not reassign
}
if (target[key] instanceof ObservableSet && isArrayForSet(propertyData)) {
  const set = target[key] as ObservableSet<any>;
  set.replace(propertyData.map((v) => property.deserialize(v)));
  return;
}
```

- **Smarter parse in `StorageAdapter.getItem`**

```ts
const raw = await this.options.storage?.getItem(key);
let parsed: any = raw as any;
if (this.options.stringify !== false && typeof raw === 'string') {
  try {
    parsed = JSON.parse(raw);
  } catch {
    /* keep raw */
  }
}
```

- **Reducer: avoid double `toJS`**

```ts
if (propertyData instanceof ObservableMap) {
  const arr: any[] = [];
  propertyData.forEach((v, k) => arr.push([k, toJS(v)]));
  propertiesToWatch[property.key] = arr; // no extra toJS
} else if (propertyData instanceof ObservableSet) {
  propertiesToWatch[property.key] = Array.from(propertyData).map(toJS);
} else {
  propertiesToWatch[property.key] = toJS(propertyData);
}
```

---

### Acceptance criteria

- Fewer storage writes under unchanged state and rapid updates (verify by spying on `setItem`).
- Preserved observability for `ObservableMap`/`ObservableSet` after hydration.
- No unhandled promise rejections during storage operations.
- No behavioral regressions in existing tests; add targeted tests for the above.

---

### Suggested new tests

- Verify structural equality prevents extra writes when values are identical.
- Validate write queue coalesces multiple rapid updates to a single final write.
- Ensure Maps/Sets remain observable and retain observers after hydration.
- Ensure `getItem` without stringify does not throw and returns expected shapes.

---

### Summary

This plan prioritizes eliminating redundant work in the reaction pipeline, preserving observable containers during hydration, and preventing write thrashing. Phase 1 provides immediate wins with minimal risk; subsequent phases improve defaults and robustness. Profiling after Phase 1 will guide whether per-property reactions are warranted.
