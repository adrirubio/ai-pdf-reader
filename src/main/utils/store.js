// This file provides a bridge to use the ESM electron-store module in CommonJS
// Using dynamic import for ESM module
module.exports = async function createStore(options) {
  try {
    // Dynamic import of the ESM module
    const { default: Store } = await import('electron-store');
    return new Store(options);
  } catch (error) {
    console.error('Error creating Store:', error);
    // Fallback to a simple in-memory store
    return {
      get: (key, defaultValue) => defaultValue,
      set: () => {},
      delete: () => {},
      clear: () => {},
      has: () => false,
      onDidChange: () => ({ unsubscribe: () => {} })
    };
  }
};
EOF < /dev/null