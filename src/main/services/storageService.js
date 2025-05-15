const Store = require('electron-store');

/**
 * StorageService provides a persistent storage solution for the application
 * using electron-store. It manages recent documents and their associated chat sessions.
 */
class StorageService {
  constructor() {
    // Define the schema for data validation
    const schema = {
      recentDocuments: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            name: { type: 'string' },
            lastAccessed: { type: 'string' }
          },
          required: ['path', 'name', 'lastAccessed']
        },
        default: []
      },
      documentSpecificData: {
        type: 'object',
        default: {}
      }
    };

    // Initialize the store with the schema
    this.store = new Store({ schema });
    console.log('StorageService initialized with electron-store');
  }

  /**
   * Gets the list of recent documents
   * @returns {Array} List of recent documents
   */
  getRecentDocuments() {
    return this.store.get('recentDocuments', []);
  }

  /**
   * Adds a document to the recent documents list
   * @param {string} filePath - Path to the document
   * @returns {Array} Updated list of recent documents
   */
  addRecentDocument(filePath) {
    // Get current list
    const recentDocs = this.getRecentDocuments();
    
    // Extract filename from path
    const name = filePath.split('/').pop();
    
    // Create document info object
    const docInfo = {
      path: filePath,
      name,
      lastAccessed: new Date().toISOString()
    };
    
    // Remove if already exists
    const filteredDocs = recentDocs.filter(doc => doc.path !== filePath);
    
    // Add to the beginning of the list
    const updatedDocs = [docInfo, ...filteredDocs].slice(0, 10);
    
    // Save to store
    this.store.set('recentDocuments', updatedDocs);
    return updatedDocs;
  }

  /**
   * Gets chat sessions for a specific document
   * @param {string} filePath - Path to the document
   * @returns {Object} Document data including chat sessions
   */
  getDocumentData(filePath) {
    const documentData = this.store.get(`documentSpecificData.${filePath}`, {
      chatSessions: [],
      highlights: []
    });
    return documentData;
  }

  /**
   * Saves chat sessions for a document
   * @param {string} filePath - Path to the document
   * @param {Array} chatSessions - Chat sessions to save
   * @returns {Object} Updated document data
   */
  saveDocumentChats(filePath, chatSessions) {
    // Get existing document data or create new
    const documentData = this.getDocumentData(filePath);
    
    // Update chat sessions
    documentData.chatSessions = chatSessions;
    
    // Save to store
    this.store.set(`documentSpecificData.${filePath}`, documentData);
    return documentData;
  }

  /**
   * Saves highlights for a document
   * @param {string} filePath - Path to the document
   * @param {Array} highlights - Highlights to save
   * @returns {Object} Updated document data
   */
  saveDocumentHighlights(filePath, highlights) {
    // Get existing document data or create new
    const documentData = this.getDocumentData(filePath);
    
    // Update highlights
    documentData.highlights = highlights;
    
    // Save to store
    this.store.set(`documentSpecificData.${filePath}`, documentData);
    return documentData;
  }

  /**
   * Removes a document and its associated data
   * @param {string} filePath - Path to the document to remove
   * @returns {boolean} Success status
   */
  removeDocumentData(filePath) {
    // Remove from recent documents
    const recentDocs = this.getRecentDocuments();
    const updatedDocs = recentDocs.filter(doc => doc.path !== filePath);
    this.store.set('recentDocuments', updatedDocs);
    
    // Remove document specific data
    this.store.delete(`documentSpecificData.${filePath}`);
    return true;
  }
}

module.exports = new StorageService(); 