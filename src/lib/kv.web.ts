// localStorage stand-in for expo-sqlite/kv-store. On web, expo-sqlite needs
// cross-origin isolation headers, which static hosts like GitHub Pages can't send.
const Storage = {
  getItemSync: (key: string) => localStorage.getItem(key),
  setItemSync: (key: string, value: string) => localStorage.setItem(key, value),
  removeItemSync: (key: string) => localStorage.removeItem(key),
};

export default Storage;
