/**
 * useModeMachine — React integration for ModeMachine.
 *
 * Provides:
 *   <ModeMachineProvider deps={...}>  — creates and owns the ModeMachine instance
 *   useModeMachine()                  — hook to access the machine in any child
 *
 * This is NOT a state library. It is pure dependency injection via React Context.
 * No zustand, jotai, redux, or similar libraries are used.
 *
 * The machine itself manages the scroll listener lifecycle. The Provider's
 * useEffect cleanup calls machine.dispose() to remove listeners on unmount.
 */
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { createModeMachine, type ModeMachine, type ModeMachineDeps } from './ModeMachine';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ModeMachineContext = createContext<ModeMachine | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface ModeMachineProviderProps {
  deps: ModeMachineDeps;
  children: ReactNode;
}

export function ModeMachineProvider({ deps, children }: ModeMachineProviderProps) {
  // Create the machine once on mount. deps is expected to be stable (constructed
  // in FilmRoot with useMemo or at module scope) — we don't re-create on dep change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const machine = useMemo(() => createModeMachine(deps), []);

  useEffect(() => {
    // Clean up scroll listener and subscribers on unmount.
    return () => {
      machine.dispose();
    };
    // machine reference is stable for the lifetime of this Provider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <ModeMachineContext.Provider value={machine}>{children}</ModeMachineContext.Provider>;
}

// ---------------------------------------------------------------------------
// Consumer hook
// ---------------------------------------------------------------------------

/**
 * Returns the ModeMachine instance from the nearest <ModeMachineProvider>.
 * Must be called inside the provider's subtree.
 */
export function useModeMachine(): ModeMachine {
  const machine = useContext(ModeMachineContext);
  if (!machine) {
    throw new Error('useModeMachine must be used inside <ModeMachineProvider>');
  }
  return machine;
}
