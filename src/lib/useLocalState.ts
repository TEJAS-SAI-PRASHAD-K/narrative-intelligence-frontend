import { useCallback, useState } from 'react';
import { readLocal, writeLocal } from './storage';

/** `useState` that survives a reload. For preferences only -- never for filters. */
export function useLocalState<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => readLocal(key, initial));
  const set = useCallback(
    (next: T) => {
      setValue(next);
      writeLocal(key, next);
    },
    [key],
  );
  return [value, set];
}
