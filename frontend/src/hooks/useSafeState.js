import { useState, useRef, useCallback } from 'react';

export const useSafeState = (initialValue) => {
  const [state, setState] = useState(initialValue);
  const mountedRef = useRef(true);

  // Set mounted to false on unmount
  const cleanup = useCallback(() => {
    mountedRef.current = false;
  }, []);

  // Safe setState that only updates if component is mounted
  const safeSetState = useCallback((newValue) => {
    if (mountedRef.current) {
      setState(newValue);
    }
  }, []);

  return [state, safeSetState, cleanup];
}; 