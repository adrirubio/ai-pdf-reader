/**
 * Utilities for safely passing data through IPC
 */

/**
 * Safely clone a value for IPC communication, removing circular references
 * and non-serializable values.
 * 
 * @param {*} value Value to clean for IPC
 * @returns {*} Cleaned value safe for IPC
 */
export function cleanForIpc(value) {
  try {
    // Simple case - primitives
    if (
      value === null || 
      value === undefined || 
      typeof value === 'boolean' || 
      typeof value === 'number' || 
      typeof value === 'string'
    ) {
      return value;
    }
    
    // Use JSON.stringify/parse for a deep clone without circular references
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    console.error('Error cleaning value for IPC:', error);
    
    // For arrays, try to clean each element
    if (Array.isArray(value)) {
      return value.map(item => {
        try {
          return cleanForIpc(item);
        } catch (e) {
          console.warn('Could not clean array item for IPC, using null instead');
          return null;
        }
      }).filter(item => item !== null);
    }
    
    // For objects, try to clean each property
    if (typeof value === 'object') {
      const result = {};
      
      // Only process own enumerable properties
      for (const key of Object.keys(value)) {
        try {
          const cleanValue = cleanForIpc(value[key]);
          if (cleanValue !== undefined) {
            result[key] = cleanValue;
          }
        } catch (e) {
          console.warn(`Could not clean property ${key} for IPC, skipping`);
        }
      }
      
      return result;
    }
    
    // If all else fails, return null
    console.warn('Could not clean value for IPC, returning null');
    return null;
  }
}

/**
 * Safely clean document path to ensure it's a string
 * 
 * @param {*} path Path to clean
 * @returns {string} Sanitized path
 */
export function sanitizeFilePath(path) {
  if (typeof path === 'string') {
    return path;
  }
  
  if (path && typeof path === 'object' && path.path && typeof path.path === 'string') {
    return path.path;
  }
  
  // Try to convert to string if possible
  try {
    return String(path);
  } catch (e) {
    console.error('Could not sanitize file path:', e);
    return '';
  }
}