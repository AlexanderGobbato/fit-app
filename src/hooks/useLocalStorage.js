import { useState, useEffect, useRef } from 'react';

/**
 * A hook that works like useState but persists the value to localStorage.
 * 
 * @param {string} key The localStorage key
 * @param {any} initialValue The initial value if no value is found in localStorage
 * @param {number} debounceMs Time in ms to wait before writing to localStorage (default 500ms)
 */
export function useLocalStorage(key, initialValue, debounceMs = 500) {
  // Read from localStorage on initialization
  const [state, setState] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const timerRef = useRef(null);

  // Update localStorage when state changes (with debouncing)
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Set a new timer to write to localStorage
    timerRef.current = setTimeout(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify(state));
      } catch (error) {
        console.warn(`Error writing to localStorage key "${key}":`, error);
      }
    }, debounceMs);

    // Cleanup timer on unmount or when dependencies change
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [key, state, debounceMs]);

  return [state, setState];
}
