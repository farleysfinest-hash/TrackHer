import { startTransition, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/** Tab switches stay responsive — heavy inactive trees update as a transition. */
export function useTabNavigate() {
  const navigate = useNavigate();
  return useCallback(
    (to: string) => {
      startTransition(() => {
        navigate(to);
      });
    },
    [navigate],
  );
}
