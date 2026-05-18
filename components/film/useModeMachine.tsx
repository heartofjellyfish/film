/**
 * useModeMachine — React integration for ModeMachine.
 *
 * Provides:
 *   <ModeMachineProvider machine={...}>  — owns the ModeMachine instance lifecycle
 *   useModeMachine()                     — hook to access the machine in any child
 *
 * FilmRoot creates the ModeMachine with createModeMachine(deps) and passes it in.
 * This gives FilmRoot direct access to machine.start() / machine.depthRef before
 * the Provider is even mounted — essential for the EntryCeremony onStart gesture
 * that must call machine.start() synchronously.
 *
 * This is NOT a state library. It is pure dependency injection via React Context.
 * No zustand, jotai, redux, or similar libraries are used.
 *
 * The machine itself manages the scroll listener lifecycle. The Provider's
 * useEffect cleanup calls machine.dispose() to remove listeners on unmount.
 */
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import type { ModeMachineV2 } from './ModeMachine';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ModeMachineContext = createContext<ModeMachineV2 | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface ModeMachineProviderProps {
  /** Pre-constructed ModeMachine instance. FilmRoot creates it with createModeMachine(). */
  machine: ModeMachineV2;
  children: ReactNode;
}

export function ModeMachineProvider({ machine, children }: ModeMachineProviderProps) {
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
 * Returns the ModeMachineV2 instance from the nearest <ModeMachineProvider>.
 * Must be called inside the provider's subtree.
 */
export function useModeMachine(): ModeMachineV2 {
  const machine = useContext(ModeMachineContext);
  if (!machine) {
    throw new Error('useModeMachine must be used inside <ModeMachineProvider>');
  }
  return machine;
}
