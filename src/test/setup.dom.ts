import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/** jsdom / component project only — do not load this from the node unit suite. */
afterEach(() => {
  cleanup();
});
