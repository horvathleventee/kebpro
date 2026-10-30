/** In-memory state; view publication and persistence are handled by the caller. */
export function createApplicationState<T extends object>(initial: T) {
  const state = {...initial};
  return {
    state,
    read: (): T => state,
    patch(changes: Partial<T>): void { Object.assign(state, changes); }
  };
}
