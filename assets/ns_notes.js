class KeepNotesApp {
    constructor() {
        this.notes = [];
        this.currentNoteId = null;
        this.currentColorNoteId = null;
        this.searchQuery = '';
        this.viewMode = this.loadViewMode();
        this.isLoading = false;
        
        this.debouncedRender = NotesUtils.debounce(this.renderNotes.bind(this), 100);
        this.throttledSave = NotesUtils.throttle(this.saveNotes.bind(this), 1000);
        
        this.renderCount = 0;
        this.lastRenderTime = 0;
        
        this.init();
    }

    loadViewMode() {
        try {
            const saved = localStorage.getItem('keepNotesViewMode');
            return saved === 'list' ? 'list' : 'grid';
        } catch {
            return 'grid';
        }
    }

    saveViewMode(mode) {
        try {
            localStorage.setItem('keepNotesViewMode', mode);
        } catch (error) {
            NotesUtils.error('Error saving view mode:', error);
        }
    }

    async init() {
        try {
            this.showLoading(true);
            await this.loadNotes();
            this.setupEventListeners();
            this.updateViewButtons();
            this.renderNotes();
            this.updateStats();
            this.setupAutoCleanup();
            this.showLoading(false);
            
            NotesUtils.log('App initialized successfully');
        } catch (error) {
            NotesUtils.error('Initialization error:', error);
            NotesUtils.showToast('Error loading app', 3000, 'error');
            this.showLoading(false);
        }
    }

    async loadNotes() {
        try {
            const result = await chrome.storage.local.get(['notes']);
            const loadedNotes = result.notes || [];
            
            this.notes = loadedNotes
                .map(note => NotesUtils.validateNote(note))
                .filter(note => note !== false);
            
            NotesUtils.log(`Loaded ${this.notes.length} notes`);
        } catch (error) {
            NotesUtils.error('Error loading notes:', error);
            this.notes = [];
            throw error;
        }
    }

    async saveNotes() {
        if (this.isLoading) return;
        
        try {
            const startTime = performance.now();
            
            const notesToSave = this.notes.map(note => ({
                id: note.id,
                title: note.title?.trim() || '',
                content: note.content || '',
                color: note.color || 'default',
                pinned: note.pinned || false,
                createdAt: note.createdAt,
                updatedAt: note.updatedAt
            }));
            
            await chrome.storage.local.set({ notes: notesToSave });
            
            const endTime = performance.now();
            NotesUtils.log(`Saved ${this.notes.length} notes in ${(endTime - startTime).toFixed(2)}ms`);
            
            this.updateStats();
        } catch (error) {
            NotesUtils.error('Error saving notes:', error);
            NotesUtils.showToast('Error saving notes', 2000, 'error');
        }
    }

    setupEventListeners() {
        this.setupHeaderEvents();
        this.setupModalEvents();
        this.setupKeyboardEvents();
        this.setupVisibilityEvents();
        this.setupColorPickerEvents();
        this.setupFormattingEvents();
    }

    setupHeaderEvents() {
        document.getElementById('gridViewBtn').addEventListener('click', () => {
            this.setViewMode('grid');
        });

        document.getElementById('listViewBtn').addEventListener('click', () => {
            this.setViewMode('list');
        });

        document.getElementById('createNoteBtn').addEventListener('click', () => {
            this.openCreateModal();
        });

        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.debouncedRender();
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                this.searchQuery = '';
                this.renderNotes();
            }
        });

        document.getElementById('importBtn').addEventListener('click', () => {
            this.openImportModal();
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            if (this.notes.length === 0) {
                NotesUtils.showToast('No notes to export', 2000, 'warning');
                return;
            }
            
            const success = NotesUtils.exportNotes(this.notes);
            if (success) {
                NotesUtils.showToast('Notes exported', 2000, 'success');
            } else {
                NotesUtils.showToast('Export failed', 2000, 'error');
            }
        });
    }

    setupFormattingEvents() {
        // Create modal formatting
        this.setupModalFormatting('create');
        
        // Edit modal formatting
        this.setupModalFormatting('edit');
    }

    setupModalFormatting(modalType) {
        const editorId = `${modalType}ContentInput`;
        const undoBtn = document.getElementById(`${modalType}UndoBtn`);
        const redoBtn = document.getElementById(`${modalType}RedoBtn`);
        
        // Undo
        if (undoBtn) {
            undoBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                document.execCommand('undo', false, null);
                this.triggerAutoSave(modalType);
            });
        }
        
        // Redo
        if (redoBtn) {
            redoBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                document.execCommand('redo', false, null);
                this.triggerAutoSave(modalType);
            });
        }
        
        // Format buttons
        document.querySelectorAll(`#${modalType}Modal .format-btn[data-format]`).forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const format = btn.dataset.format;
                this.applyFormat(editorId, format);
                this.triggerAutoSave(modalType);
            });
        });
    }

    applyFormat(editorId, format) {
        const editor = document.getElementById(editorId);
        if (!editor) return;

        editor.focus();

        switch(format) {
            case 'bold':
                document.execCommand('bold', false, null);
                break;
            case 'italic':
                document.execCommand('italic', false, null);
                break;
            case 'underline':
                document.execCommand('underline', false, null);
                break;
            case 'h1':
                document.execCommand('formatBlock', false, '<h1>');
                break;
            case 'h2':
                document.execCommand('formatBlock', false, '<h2>');
                break;
            case 'p':
                document.execCommand('formatBlock', false, '<p>');
                break;
            case 'bullet':
                document.execCommand('insertUnorderedList', false, null);
                break;
            case 'number':
                document.execCommand('insertOrderedList', false, null);
                break;
            case 'letter':
                // For letter list, we use ordered list with custom style
                document.execCommand('insertOrderedList', false, null);
                // Add class for letter styling
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const listItems = range.commonAncestorContainer.parentElement.closest('ol');
                    if (listItems) {
                        listItems.style.listStyleType = 'lower-alpha';
                    }
                }
                break;
        }
    }

    triggerAutoSave(modalType) {
        if (modalType === 'edit' && this.currentNoteId) {
            this.autoSaveDebounced();
        }
    }

    setupModalEvents() {
        // Create Modal
        const createModal = document.getElementById('createModal');
        document.getElementById('closeCreateModal').addEventListener('click', () => {
            this.closeCreateModal();
        });

        createModal.addEventListener('click', (e) => {
            if (e.target === createModal) {
                this.saveAndCloseCreateModal();
            }
        });

        // Edit Modal
        const editModal = document.getElementById('editModal');
        document.getElementById('closeEditModal').addEventListener('click', () => {
            this.closeEditModal();
        });

        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) {
                this.saveAndCloseEditModal();
            }
        });

        document.getElementById('pinNoteBtn').addEventListener('click', () => {
            this.togglePinCurrentNote();
        });

        document.getElementById('downloadNoteBtn').addEventListener('click', () => {
            this.downloadCurrentNote();
        });

        document.getElementById('deleteNoteBtn').addEventListener('click', () => {
            this.confirmDeleteCurrentNote();
        });

        // Auto-save on input in edit modal
        document.getElementById('editTitleInput').addEventListener('input', () => {
            if (this.currentNoteId) {
                this.autoSaveDebounced();
            }
        });

        document.getElementById('editContentInput').addEventListener('input', () => {
            if (this.currentNoteId) {
                this.autoSaveDebounced();
            }
        });

        // Import Modal
        const importModal = document.getElementById('importModal');
        document.getElementById('closeImportModal').addEventListener('click', () => {
            this.closeImportModal();
        });

        importModal.addEventListener('click', (e) => {
            if (e.target === importModal) {
                this.closeImportModal();
            }
        });

        document.getElementById('importFile').addEventListener('change', (e) => {
            this.previewImport(e.target.files[0]);
        });

        document.getElementById('confirmImportBtn').addEventListener('click', () => {
            this.importNotes();
        });

        // Confirmation Modal
        const confirmModal = document.getElementById('confirmModal');
        document.getElementById('closeConfirmModal').addEventListener('click', () => {
            this.closeConfirmModal();
        });

        confirmModal.addEventListener('click', (e) => {
            if (e.target === confirmModal) {
                this.closeConfirmModal();
            }
        });

        document.getElementById('confirmNoBtn').addEventListener('click', () => {
            this.closeConfirmModal();
        });

        document.getElementById('confirmYesBtn').addEventListener('click', () => {
            this.executeConfirmedAction();
        });
    }

    setupColorPickerEvents() {
        // Color Picker Modal
        const colorPickerModal = document.getElementById('colorPickerModal');
        document.getElementById('closeColorPicker').addEventListener('click', () => {
            this.closeColorPicker();
        });

        colorPickerModal.addEventListener('click', (e) => {
            if (e.target === colorPickerModal) {
                this.closeColorPicker();
            }
        });

        // Color Options
        document.querySelectorAll('.color-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const color = btn.dataset.color;
                this.setNoteColor(this.currentColorNoteId, color);
            });
        });
    }

    setupKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'z':
                        e.preventDefault();
                        if (this.isCreateModalOpen()) {
                            document.execCommand('undo', false, null);
                        } else if (this.isEditModalOpen()) {
                            document.execCommand('undo', false, null);
                            this.autoSaveDebounced();
                        }
                        break;
                    case 'y':
                        e.preventDefault();
                        if (this.isCreateModalOpen()) {
                            document.execCommand('redo', false, null);
                        } else if (this.isEditModalOpen()) {
                            document.execCommand('redo', false, null);
                            this.autoSaveDebounced();
                        }
                        break;
                    case 'n':
                        e.preventDefault();
                        this.openCreateModal();
                        break;
                    case 'f':
                        e.preventDefault();
                        document.getElementById('searchInput').focus();
                        break;
                    case 's':
                        e.preventDefault();
                        if (this.currentNoteId) {
                            this.saveAndCloseEditModal();
                        }
                        break;
                    case '1':
                        e.preventDefault();
                        this.setViewMode('grid');
                        break;
                    case '2':
                        e.preventDefault();
                        this.setViewMode('list');
                        break;
                }
            }

            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    setupVisibilityEvents() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                NotesUtils.clearCache();
            }
        });
    }

    setupAutoCleanup() {
        setInterval(() => {
            this.autoCleanup();
        }, 300000);
    }

    autoCleanup() {
        const now = Date.now();
        const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
        
        const oldNotes = this.notes.filter(n => 
            new Date(n.updatedAt).getTime() < oneMonthAgo
        );
        
        if (oldNotes.length > 0) {
            NotesUtils.log(`${oldNotes.length} notes older than 1 month`);
        }
    }

    showLoading(show) {
        this.isLoading = show;
    }

    setViewMode(mode) {
        if (mode === this.viewMode) return;
        
        this.viewMode = mode;
        this.saveViewMode(mode);
        this.updateViewButtons();
        this.renderNotes();
        
        NotesUtils.showToast(`${mode === 'grid' ? 'Grid' : 'List'} view`, 1000, 'info');
    }

    updateViewButtons() {
        const gridBtn = document.getElementById('gridViewBtn');
        const listBtn = document.getElementById('listViewBtn');
        
        if (this.viewMode === 'grid') {
            gridBtn.classList.add('active');
            listBtn.classList.remove('active');
        } else {
            gridBtn.classList.remove('active');
            listBtn.classList.add('active');
        }
    }

    // Pin Methods
    togglePinCurrentNote() {
        if (this.currentNoteId) {
            this.togglePin(this.currentNoteId);
        }
    }

    togglePin(noteId) {
        const index = this.notes.findIndex(n => n.id === noteId);
        if (index !== -1) {
            this.notes[index].pinned = !this.notes[index].pinned;
            this.notes[index].updatedAt = new Date().toISOString();
            
            // Update pin button in modal
            const pinBtn = document.getElementById('pinNoteBtn');
            if (pinBtn) {
                pinBtn.classList.toggle('active', this.notes[index].pinned);
            }
            
            this.throttledSave();
            this.renderNotes();
            
            NotesUtils.showToast(
                this.notes[index].pinned ? 'Note pinned' : 'Note unpinned', 
                1000, 
                'success'
            );
        }
    }

    // Color Picker Methods
    openColorPicker(noteId, currentColor) {
        this.currentColorNoteId = noteId;
        
        document.querySelectorAll('.color-option').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.color === currentColor);
        });
        
        document.getElementById('colorPickerModal').style.display = 'block';
    }

    closeColorPicker() {
        document.getElementById('colorPickerModal').style.display = 'none';
        this.currentColorNoteId = null;
    }

    setNoteColor(noteId, color) {
        if (!noteId) return;
        
        const index = this.notes.findIndex(n => n.id === noteId);
        if (index !== -1) {
            this.notes[index].color = color;
            this.notes[index].updatedAt = new Date().toISOString();
            
            this.throttledSave();
            this.debouncedRender();
            this.closeColorPicker();
            
            NotesUtils.showToast('Color updated', 1000, 'success');
        }
    }

    // Auto Save
    autoSaveDebounced = NotesUtils.debounce(function() {
        if (this.currentNoteId) {
            this.autoSave();
        }
    }, 800);

    async autoSave() {
        if (!this.currentNoteId) return;

        const title = document.getElementById('editTitleInput').value.trim();
        const content = document.getElementById('editContentInput').innerHTML.trim();

        const index = this.notes.findIndex(n => n.id === this.currentNoteId);
        if (index !== -1) {
            // If both title and content are empty, delete the note
            if (!title && !content.replace(/<[^>]*>/g, '').trim()) {
                await this.deleteNote(this.currentNoteId, true);
                this.closeEditModal();
                return;
            }

            this.notes[index] = {
                ...this.notes[index],
                title: title || 'Untitled',
                content: content,
                updatedAt: new Date().toISOString()
            };
            
            await this.throttledSave();
            this.debouncedRender();
            
            // Show auto-save indicator
            const indicator = document.getElementById('autoSaveIndicator');
            indicator.style.opacity = '1';
            setTimeout(() => {
                indicator.style.opacity = '0';
            }, 1000);
        }
    }

    // Create Modal Methods
    openCreateModal() {
        document.getElementById('createTitleInput').value = '';
        const createEditor = document.getElementById('createContentInput');
        createEditor.innerHTML = '';
        document.getElementById('createModal').style.display = 'block';
        
        setTimeout(() => {
            createEditor.focus();
        }, 100);
    }

    closeCreateModal() {
        document.getElementById('createModal').style.display = 'none';
    }

    isCreateModalOpen() {
        return document.getElementById('createModal').style.display === 'block';
    }

    async saveAndCloseCreateModal() {
        const title = document.getElementById('createTitleInput').value.trim();
        const content = document.getElementById('createContentInput').innerHTML.trim();

        if (title || content) {
            const newNote = { title, content };
            if (NotesUtils.findDuplicate(this.notes, newNote)) {
                NotesUtils.showToast('Duplicate note detected', 2000, 'warning');
                this.closeCreateModal();
                return;
            }

            const now = new Date().toISOString();
            const note = {
                id: NotesUtils.generateId(),
                title: title || 'Untitled',
                content: content || '',
                color: 'default',
                pinned: false,
                createdAt: now,
                updatedAt: now
            };

            this.notes.unshift(note);
            await this.throttledSave();
            this.renderNotes();
            NotesUtils.showToast('Note created', 1500, 'success');
        }
        
        this.closeCreateModal();
    }

    // Edit Modal Methods
    openEditModal(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (!note) return;

        this.currentNoteId = noteId;
        document.getElementById('editTitleInput').value = note.title || '';
        document.getElementById('editContentInput').innerHTML = note.content || '';
        
        // Update pin button state
        const pinBtn = document.getElementById('pinNoteBtn');
        pinBtn.classList.toggle('active', note.pinned);
        
        document.getElementById('editModal').style.display = 'block';
        document.getElementById('autoSaveIndicator').style.opacity = '0';
        
        setTimeout(() => {
            document.getElementById('editContentInput').focus();
        }, 100);
    }

    closeEditModal() {
        document.getElementById('editModal').style.display = 'none';
        this.currentNoteId = null;
    }

    isEditModalOpen() {
        return document.getElementById('editModal').style.display === 'block';
    }

    async saveAndCloseEditModal() {
        if (!this.currentNoteId) {
            this.closeEditModal();
            return;
        }

        const title = document.getElementById('editTitleInput').value.trim();
        const content = document.getElementById('editContentInput').innerHTML.trim();

        const index = this.notes.findIndex(n => n.id === this.currentNoteId);
        if (index !== -1) {
            if (!title && !content.replace(/<[^>]*>/g, '').trim()) {
                await this.deleteNote(this.currentNoteId, true);
                this.closeEditModal();
                return;
            }

            const oldNote = this.notes[index];
            if (oldNote.title === title && oldNote.content === content) {
                this.closeEditModal();
                return;
            }

            this.notes[index] = {
                ...oldNote,
                title: title || 'Untitled',
                content: content,
                updatedAt: new Date().toISOString()
            };
            
            await this.throttledSave();
            this.debouncedRender();
            NotesUtils.showToast('Note saved', 1000, 'success');
        }
        
        this.closeEditModal();
    }

    // Import Modal Methods
    openImportModal() {
        document.getElementById('importFile').value = '';
        document.getElementById('importPreview').innerHTML = '';
        document.getElementById('confirmImportBtn').disabled = true;
        document.getElementById('importModal').style.display = 'block';
    }

    closeImportModal() {
        document.getElementById('importModal').style.display = 'none';
        this.pendingImport = null;
    }

    // Confirmation Modal Methods
    openConfirmModal(title, message, action) {
        this.pendingAction = action;
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        document.getElementById('confirmModal').style.display = 'block';
    }

    closeConfirmModal() {
        document.getElementById('confirmModal').style.display = 'none';
        this.pendingAction = null;
    }

    executeConfirmedAction() {
        if (this.pendingAction) {
            try {
                this.pendingAction();
            } catch (error) {
                NotesUtils.error('Action error:', error);
            }
            this.pendingAction = null;
        }
        this.closeConfirmModal();
    }

    closeAllModals() {
        document.getElementById('createModal').style.display = 'none';
        document.getElementById('editModal').style.display = 'none';
        document.getElementById('importModal').style.display = 'none';
        document.getElementById('confirmModal').style.display = 'none';
        document.getElementById('colorPickerModal').style.display = 'none';
        this.currentNoteId = null;
        this.currentColorNoteId = null;
        this.pendingAction = null;
    }

    // Note Operations
    async deleteNote(noteId, silent = false) {
        const index = this.notes.findIndex(n => n.id === noteId);
        if (index === -1) return;

        this.notes.splice(index, 1);
        await this.throttledSave();
        this.renderNotes();
        
        if (!silent) {
            NotesUtils.showToast('Note deleted', 1500, 'info');
        }
    }

    confirmDeleteCurrentNote() {
        if (this.currentNoteId) {
            this.openConfirmModal(
                'Delete Note?',
                'This action cannot be undone.',
                () => {
                    this.deleteNote(this.currentNoteId);
                    this.closeEditModal();
                }
            );
        }
    }

    downloadCurrentNote() {
        if (this.currentNoteId) {
            const note = this.notes.find(n => n.id === this.currentNoteId);
            if (note) {
                const success = NotesUtils.downloadNote(note);
                if (success) {
                    NotesUtils.showToast('Download started', 1500, 'success');
                } else {
                    NotesUtils.showToast('Download failed', 1500, 'error');
                }
            }
        }
    }

    downloadNote(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (note) {
            const success = NotesUtils.downloadNote(note);
            if (success) {
                NotesUtils.showToast('Download started', 1500, 'success');
            }
        }
    }

    async previewImport(file) {
        if (!file) return;

        try {
            this.showLoading(true);
            const importedNotes = await NotesUtils.importNotes(file);
            const preview = document.getElementById('importPreview');
            
            if (importedNotes.length === 0) {
                preview.innerHTML = '<span class="error">No valid notes found</span>';
                document.getElementById('confirmImportBtn').disabled = true;
                return;
            }

            const previewHtml = [
                `<strong>Found ${importedNotes.length} notes:</strong><br>`,
                ...importedNotes.slice(0, 5).map(n => 
                    `• ${NotesUtils.escapeHtml(n.title || 'Untitled')}`
                )
            ];
            
            if (importedNotes.length > 5) {
                previewHtml.push(`<br>... and ${importedNotes.length - 5} more`);
            }
            
            preview.innerHTML = previewHtml.join('<br>');
            document.getElementById('confirmImportBtn').disabled = false;
            this.pendingImport = importedNotes;
            
        } catch (error) {
            NotesUtils.showToast('Invalid file format', 2000, 'error');
            document.getElementById('confirmImportBtn').disabled = true;
        } finally {
            this.showLoading(false);
        }
    }

    async importNotes() {
        if (!this.pendingImport || this.pendingImport.length === 0) return;

        this.openConfirmModal(
            `Import ${this.pendingImport.length} Notes?`,
            'Existing notes will be preserved.',
            async () => {
                try {
                    this.showLoading(true);
                    
                    const newNotes = this.pendingImport.filter(newNote => 
                        !NotesUtils.findDuplicate(this.notes, newNote)
                    );
                    
                    if (newNotes.length === 0) {
                        NotesUtils.showToast('No new notes to import', 2000, 'info');
                    } else {
                        this.notes = [...newNotes, ...this.notes];
                        await this.saveNotes();
                        this.renderNotes();
                        NotesUtils.showToast(`${newNotes.length} notes imported`, 2000, 'success');
                    }
                    
                } catch (error) {
                    NotesUtils.error('Import error:', error);
                    NotesUtils.showToast('Import failed', 2000, 'error');
                } finally {
                    this.showLoading(false);
                    this.closeImportModal();
                    this.pendingImport = null;
                }
            }
        );
    }

    filterNotes() {
        if (!this.searchQuery) return this.notes;
        
        const query = this.searchQuery.toLowerCase();
        return this.notes.filter(note => 
            (note.title || '').toLowerCase().includes(query) ||
            (note.content || '').toLowerCase().includes(query)
        );
    }

    renderNotes() {
        const startTime = performance.now();
        const filteredNotes = this.filterNotes();

        // Separate pinned and other notes
        const pinnedNotes = filteredNotes.filter(note => note.pinned);
        const otherNotes = filteredNotes.filter(note => !note.pinned);

        // Sort each group by updated date
        const sortByDate = (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt);
        const sortedPinned = pinnedNotes.sort(sortByDate);
        const sortedOthers = otherNotes.sort(sortByDate);

        // Update pinned section visibility
        const pinnedSection = document.getElementById('pinnedSection');
        if (sortedPinned.length > 0) {
            pinnedSection.style.display = 'block';
            document.getElementById('pinnedCount').textContent = `(${sortedPinned.length})`;
            this.renderNotesGrid('pinnedContainer', sortedPinned);
        } else {
            pinnedSection.style.display = 'none';
        }

        // Render other notes
        document.getElementById('otherCount').textContent = `(${sortedOthers.length})`;
        this.renderNotesGrid('otherContainer', sortedOthers);

        // Update section headers based on view mode
        const gridClass = this.viewMode === 'grid' ? 'grid-view' : 'list-view';
        document.getElementById('pinnedContainer').className = `notes-grid ${gridClass}`;
        document.getElementById('otherContainer').className = `notes-grid ${gridClass}`;
        
        const endTime = performance.now();
        this.renderCount++;
        this.lastRenderTime = endTime - startTime;
        
        NotesUtils.log(`Render #${this.renderCount} took ${this.lastRenderTime.toFixed(2)}ms (${this.viewMode} view)`);
    }

    renderNotesGrid(containerId, notes) {
        const container = document.getElementById(containerId);
        
        if (notes.length === 0) {
            container.innerHTML = '';
            return;
        }

        const batchSize = 50;
        let html = '';
        
        for (let i = 0; i < notes.length; i += batchSize) {
            const batch = notes.slice(i, i + batchSize);
            html += batch.map(note => this.renderNoteCard(note)).join('');
        }

        container.innerHTML = html;
        this.attachNoteCardEvents(containerId);
    }

    renderNoteCard(note) {
        const title = NotesUtils.escapeHtml(note.title || 'Untitled');
        const content = note.content || '';
        const date = NotesUtils.formatDate(note.updatedAt);
        const colorClass = note.color || 'default';
        const pinnedClass = note.pinned ? 'pinned' : '';
        
        return `
            <div class="note-card ${colorClass} ${pinnedClass}" data-note-id="${note.id}" data-color="${colorClass}">
                <div class="note-card-header">
                    <h3 class="note-card-title">${title}</h3>
                    <div class="note-card-actions">
                        <button class="note-card-action pin ${note.pinned ? 'active' : ''}" data-action="pin" title="${note.pinned ? 'Unpin' : 'Pin'} note">
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path fill="currentColor" d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6h2v-6h5v-2l-2-2z"/>
                            </svg>
                        </button>
                        <button class="note-card-action download" data-action="download" title="Download note">
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                            </svg>
                        </button>
                        <button class="note-card-action delete" data-action="delete" title="Delete note">
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="note-card-content">${content}</div>
                <div class="note-card-footer">
                    <span>${date}</span>
                    <button class="color-button" data-action="color" title="Change color">🎨</button>
                </div>
            </div>
        `;
    }

    attachNoteCardEvents(containerId) {
        const container = document.getElementById(containerId);
        
        container.querySelectorAll('.note-card').forEach(card => {
            const noteId = card.dataset.noteId;
            
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.note-card-action') && !e.target.closest('.color-button')) {
                    this.openEditModal(noteId);
                }
            });

            const pinBtn = card.querySelector('[data-action="pin"]');
            if (pinBtn) {
                pinBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.togglePin(noteId);
                });
            }

            const downloadBtn = card.querySelector('[data-action="download"]');
            if (downloadBtn) {
                downloadBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.downloadNote(noteId);
                });
            }

            const deleteBtn = card.querySelector('[data-action="delete"]');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.openConfirmModal(
                        'Delete Note?',
                        'This action cannot be undone.',
                        () => this.deleteNote(noteId)
                    );
                });
            }

            const colorBtn = card.querySelector('[data-action="color"]');
            if (colorBtn) {
                colorBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const note = this.notes.find(n => n.id === noteId);
                    if (note) {
                        this.openColorPicker(noteId, note.color || 'default');
                    }
                });
            }
        });
    }

    updateStats() {
        const totalNotes = this.notes.length;
        const storageUsed = NotesUtils.calculateStorageSize(this.notes);
        
        document.getElementById('totalNotes').textContent = totalNotes;
        document.getElementById('storageUsed').textContent = storageUsed;
    }
}

// অ্যাপ ইনিশিয়ালাইজ
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.app = new KeepNotesApp();
    } catch (error) {
        NotesUtils.error('Fatal error:', error);
        NotesUtils.showToast('Error loading app', 3000, 'error');
    }
});