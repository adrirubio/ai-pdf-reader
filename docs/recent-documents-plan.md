# Development Plan: Recent Documents & Persistent Chats

**Project:** AI PDF Reader
**Feature:** Recent Documents with Persistent AI Chat Sessions
**Date:** May 15, 2025
**Version:** 1.0

## 1. Goal

To enhance user experience by allowing users to quickly re-open up to the last 10 recently accessed PDF documents. For each re-opened document, all associated AI chat sessions, including their messages and context (like highlight IDs), should be restored.

## 2. Key Features

* Maintain a list of the 10 most recently opened PDF file paths.
* Persist this list and associated chat data across application sessions.
* Display the list of recent documents on the Landing Page.
* Allow users to open a document by clicking its entry in the recent list.
* When a document is opened (either newly or from the recent list), its specific chat sessions are loaded into the AI Panel.
* New chat sessions created while a document is open are saved and associated with that document.
* If a document is removed from the recent list (e.g., due to the list limit or manual removal if implemented later), its chat data might also be purged or orphaned (decision needed, recommend purging for simplicity for now).

## 3. Detailed Plan

### Phase 1: Data Storage & Persistence Strategy

**Task 1.1: Choose and Set Up a Persistent Storage Solution**
* **Description:** Implement a robust way to store application data persistently. `electron-store` is highly recommended as it simplifies storing JSON-like data.
* **Implementation:**
    * Add `electron-store` to project dependencies: `npm install electron-store` or `yarn add electron-store`.
    * Initialize `electron-store` in the main process (`src/main/main.js`) or a dedicated store utility module.
    * Define a schema for the stored data.

**Task 1.2: Define Data Structures**
* **Description:** Define how recent documents and their associated chat sessions will be structured in the persistent store.
* **Proposed Structure:**
    ```json
    {
      "recentDocuments": [ // Ordered list, most recent first
        { "path": "/path/to/doc1.pdf", "name": "doc1.pdf", "lastAccessed": "timestamp" },
        { "path": "/path/to/doc2.pdf", "name": "doc2.pdf", "lastAccessed": "timestamp" }
        // Up to 10 documents
      ],
      "documentSpecificData": {
        "/path/to/doc1.pdf": {
          "chatSessions": [
            { "id": "uuid1", "title": "Chat 1", "messages": [], "highlightId": "uuidHighlight1", "createdAt": "timestamp" },
            { "id": "uuid2", "title": "Follow-up on Topic X", "messages": [], "highlightId": null, "createdAt": "timestamp" }
          ],
          "highlights": [ // Consider moving PDFViewer's sessionStorage highlights here too
            { "id": "uuidHighlight1", "pageNumber": 1, "text": "selected text", "rectsOnPage": [...] }
          ]
          // Potentially other per-document settings like last viewed page, scale, etc.
        },
        "/path/to/doc2.pdf": { /* ... similar structure ... */ }
      }
    }
    ```
    * `recentDocuments`: Stores metadata for the quick list. `name` can be derived from `path`.
    * `documentSpecificData`: A dictionary where keys are document file paths. Each entry contains chat sessions and potentially other document-related data like highlights.

**Task 1.3: Implement Helper Functions for Data Access**
* **Description:** Create utility functions (likely in the main process, exposed via IPC, or within Redux middleware/thunks if state is synced) to manage this data.
* **Functions:**
    * `addRecentDocument(filePath)`: Adds a document to the list, updates `lastAccessed`, ensures the list doesn't exceed 10 items (oldest is removed).
    * `getRecentDocuments()`: Retrieves the list.
    * `getDocumentChats(filePath)`: Retrieves chat sessions for a specific document.
    * `saveDocumentChats(filePath, sessions)`: Saves/updates chat sessions for a document.
    * `removeDocumentData(filePath)`: Removes a document and its associated data (e.g., when it falls off the recent list).
    * `loadInitialApplicationData()`: Loads all persisted data on app startup.
    * `saveApplicationData()`: Saves all data (can be called on change or on quit).

### Phase 2: State Management (Redux) Modifications

**Task 2.1: Enhance `pdfSlice.js`**
* **Description:** Modify `pdfSlice` to handle the new structure for recent documents and integrate with the persistence layer.
* **Changes:**
    * The existing `recentDocuments` array in the state should now store objects like `{ path: string, name: string, lastAccessed: string }` instead of just paths.
    * **New Actions:**
        * `loadRecentDocuments(documents)`: To populate the state from persistent storage on startup.
        * `addOrUpdateRecentDocument(documentInfo)`: When a PDF is opened, this action updates the `recentDocuments` list in the Redux state. This will also trigger saving the updated list to persistent store (perhaps via a middleware or thunk).
    * **Logic:** When `setPdfPath` is called, dispatch `addOrUpdateRecentDocument`.

**Task 2.2: Refactor `chatSlice.js` for Document-Specific Chats**
* **Description:** This is a significant change. The `chatSlice` currently manages global chat sessions. It needs to manage sessions for the *currently loaded PDF*.
* **Strategy Options:**
    1.  **Dynamic Slice Content:** `chatSlice` state (`sessions`, `currentSessionIndex`, etc.) is cleared and re-populated whenever a new PDF is loaded.
    2.  **Session Cache in `chatSlice`:** `chatSlice` could hold a cache of `documentChats` (e.g., `state.chatsByDocument: { [filePath]: sessionsArray }`) and an `activeDocumentPath` selector. Reducers would operate on `state.chatsByDocument[state.activeDocumentPath]`. This seems more complex to manage with Redux Toolkit's slice model directly.
* **Recommended Approach (Option 1 - Dynamic Slice Content):**
    * **State:** Keep the existing `sessions`, `currentSessionIndex`, `isTyping`, `selectedStyle`, `customPrompt`, `sessionCount` structure within `chatSlice`.
    * **New State Field:** `activeDocumentPath: string | null`.
    * **New Actions:**
        * `setActiveDocument(filePath, initialSessions)`: Called when a PDF is opened. It sets `activeDocumentPath`, clears existing global sessions in the slice, and populates `sessions` with `initialSessions` (fetched from persistent storage for `filePath`). If no sessions exist for the document, it initializes with one default empty chat.
        * `clearActiveDocument()`: Called when PDF is closed or user goes to landing. Resets chat state to initial global state (or an empty state).
    * **Existing Reducers (`addSession`, `removeSession`, `addUserMessage`, etc.):** These reducers will implicitly operate on the sessions of the `activeDocumentPath`. They will need to trigger saving the updated sessions for the `activeDocumentPath` to persistent storage (e.g., via middleware or thunks listening to these actions).

**Task 2.3: Redux Middleware/Thunks for Persistence**
* **Description:** Implement middleware or thunks to handle communication with the persistence layer.
* **Logic:**
    * On app startup, dispatch an action to load recent documents and potentially chats for the last opened document (if the app should reopen the last session).
    * When `pdfSlice/addOrUpdateRecentDocument` is dispatched, save the updated `recentDocuments` list.
    * When any action in `chatSlice` modifies the `sessions` for the `activeDocumentPath` (e.g., `addUserMessage`, `addSession`), save the updated chat sessions for that document.
    * Consider debouncing save operations to avoid excessive writes.

### Phase 3: UI Implementation

**Task 3.1: Modify `LandingPage.jsx`**
* **Description:** Display the list of recent documents.
* **Implementation:**
    * Connect to the Redux store to get the `recentDocuments` list from `pdfSlice`.
    * Render a list/grid of recent documents. Each item should display the document name and perhaps `lastAccessed` time.
    * Make each item clickable. Clicking should trigger opening that PDF.

**Task 3.2: Update `App.jsx` for Recent Document Opening**
* **Description:** Handle the logic for opening a PDF from the recent documents list.
* **Implementation:**
    * The click handler for a recent document item on the `LandingPage` will call a function in `App.jsx` (similar to `handleOpenPDF` but taking a path).
    * This function will:
        1.  Set the `pdfPath` state.
        2.  Inform Redux (e.g., dispatch `pdfSlice/addOrUpdateRecentDocument` to mark it as most recent).
        3.  Dispatch `chatSlice/setActiveDocument` with the `pdfPath` and its loaded chat sessions (fetched from persistent storage).
        4.  Navigate away from the landing page to the PDF viewer.

**Task 3.3: Visual Cues and Styling**
* **Description:** Style the recent documents list for good UX.
* **Considerations:** Hover effects, clear indication of clickable items, handling of long file names, placeholder if no recent documents.

### Phase 4: Core Logic for Loading/Saving Document-Specific Chats

**Task 4.1: Update `AIPanel.jsx`**
* **Description:** Adapt `AIPanel` to work with document-specific chats loaded from `chatSlice`.
* **Changes:**
    * `AIPanel` will primarily consume chat state (`sessions`, `currentIdx`) from the `chatSlice` as it does now.
    * The key difference is that this state will now represent chats for the *currently active document*.
    * When `selectedText` leads to a new explanation:
        * The new chat session (or message within an existing session) will be saved by `chatSlice` actions, which in turn will trigger persistence for the current `activeDocumentPath`.
        * The `selectedLocation.id` (highlight ID) association with a chat session will be saved as part of the chat session data.

**Task 4.2: Modify `PDFViewer.jsx` for Per-Document Highlights (Optional but Recommended)**
* **Description:** Currently, `PDFViewer.jsx` uses `sessionStorage` for `pdfPersistentHighlights`. This should be integrated with the new per-document persistent storage.
* **Implementation:**
    * When a PDF is loaded, fetch its highlights from the `documentSpecificData[filePath].highlights` in the persistent store.
    * When highlights are created/removed, update them in the persistent store for the current document.
    * This might involve new Redux actions and state in `pdfSlice` to manage current document highlights, or direct interaction with the persistence utilities.

### Phase 5: Integration and Testing

**Task 5.1: Thorough Testing**
* **Scenarios:**
    * Opening a new PDF: Ensure it's added to recent list, new chat sessions are blank.
    * Creating chats for a PDF: Ensure they are saved.
    * Closing and reopening app: Ensure recent list and associated chats are restored.
    * Opening a PDF from recent list: Ensure correct PDF and its specific chats load.
    * Reaching the 10-document limit: Ensure oldest document is correctly removed (and its data purged if that's the design).
    * Opening a file, then another, then re-opening the first: Ensure chats are distinct and correctly restored.
    * Handling cases where a recent file path is no longer accessible (e.g., file deleted or moved): Gracefully handle this, perhaps by offering to remove it from the list.
    * Edge cases: Empty chat sessions, quickly switching documents.
    * Interaction between highlights and chat session `highlightId` if highlights are also made per-document.

**Task 5.2: Refinement and Bug Fixing**
* Address any issues found during testing.
* Optimize performance, especially around data loading/saving.

## 4. File Modifications Summary (Anticipated)

* **`src/main/main.js`**: Initialize `electron-store`, potentially add IPC handlers for data access if not solely managed by renderer via Redux.
* **`package.json`**: Add `electron-store` dependency.
* **`src/state/store.js`**: Potentially add middleware for persistence.
* **`src/state/slices/pdfSlice.js`**: Update `recentDocuments` structure, add new actions for loading/managing persistent recent documents.
* **`src/state/slices/chatSlice.js`**: Major refactor to handle `activeDocumentPath` and load/save document-specific chat sessions.
* **`src/renderer/components/App.jsx`**: Logic to handle opening from recent list, orchestrate state updates for PDF and Chats.
* **`src/renderer/components/LandingPage.jsx`**: UI to display recent documents list, dispatch actions on click.
* **`src/renderer/components/AIPanel.jsx`**: Ensure it correctly reflects chats for the active document via `chatSlice`.
* **`src/renderer/components/PDFViewer.jsx`**: (Optional) Integrate highlight persistence.
* **New Files**: Possibly a `src/main/services/storageService.js` or `src/utils/persistentStore.js` to encapsulate `electron-store` logic.

## 5. Considerations & Potential Challenges

* **Data Migration:** If there's any existing user data (e.g., from `sessionStorage`), a one-time migration strategy might be needed. (Not applicable here as `sessionStorage` is transient).
* **File Path Stability:** File paths can change if users move or rename files. The feature will rely on exact paths. Handling moved/deleted files will require checking file existence before attempting to load.
* **Storage Limits:** `electron-store` uses a JSON file. If chat histories become extremely long and numerous, the JSON file could grow large, impacting load/save times. For this scale (10 documents, typical chat usage), it should be fine.
* **Atomicity of Saves:** Ensure that saving different parts of the state (recent docs, chats for doc A, chats for doc B) doesn't lead to inconsistent states if the app quits unexpectedly during a save. `electron-store` handles atomic writes for its file.
* **UI for Missing Files:** If a recent file is not found, the UI should indicate this gracefully and perhaps offer an option to remove it from the list.
* **Performance:** Reading/writing to disk should ideally be asynchronous or handled in a way that doesn't block the UI, especially on app startup or when switching documents frequently. Redux middleware can help manage this.
* **Synchronization:** If main process directly handles storage and renderer accesses it via IPC, ensure proper synchronization. If renderer-side Redux state is the source of truth and a middleware syncs it to `electron-store`, this is generally simpler for the renderer.

This plan provides a comprehensive roadmap. Each task can be further broken down into smaller sub-tasks during implementation.
