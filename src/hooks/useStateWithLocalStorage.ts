import { useState, useEffect } from "react";

export function useStateWithLocalStorage<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [state, setState] = useState<T>(() => {
    const savedValue = localStorage.getItem(key);
    if (savedValue) {
      try {
        return JSON.parse(savedValue);
      } catch {
        return defaultValue;
      }
    }
    return defaultValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState];
}
