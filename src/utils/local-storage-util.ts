// Utility functions for localStorage (assuming these exist in your utils)
export function loadFromLocalStorage(key: string): string | null {
  return localStorage.getItem(key);
}

export function saveToLocalStorage(key: string, value: string): void {
  localStorage.setItem(key, value);
}