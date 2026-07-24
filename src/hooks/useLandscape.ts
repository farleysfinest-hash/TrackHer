import { useEffect, useState } from 'react';

/** True when the viewport is in landscape orientation. */
export function useLandscape(): boolean {
  const [landscape, setLandscape] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(orientation: landscape)').matches
      : false,
  );

  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape)');
    const update = () => setLandscape(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return landscape;
}
