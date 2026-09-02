const NotesUtils = {
    // ক্যাশিং মেকানিজম
    cache: {
        dates: new Map(),
        html: new Map()
    },

    // উপলব্ধ কালার অপশন
    colors: [
        'default',
        'red',
        'orange',
        'yellow',
        'green',
        'teal',
        'blue',
        'purple',
        'pink',
        'brown',
        'gray'
    ],

    // মেমোরি লিক প্রতিরোধের জন্য ক্যাশ ক্লিয়ার
    clearCache() {
        this.cache.dates.clear();
        this.cache.html.clear();
    },

    // অপ্টিমাইজড আইডি জেনারেশন
    generateId() {
        return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 8)}-${performance.now().toString(36)}`;
    },

    // ক্যাশিং সহ ডেট ফরম্যাট
    formatDate(dateString) {
        if (this.cache.dates.has(dateString)) {
            return this.cache.dates.get(dateString);
        }

        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        let result;
        if (diffMins < 1) result = 'Just now';
        else if (diffMins < 60) result = `${diffMins}m ago`;
        else if (diffHours < 24) result = `${diffHours}h ago`;
        else if (diffDays === 1) result = 'Yesterday';
        else if (diffDays < 7) result = `${diffDays}d ago`;
        else {
            result = date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric'
            });
        }

        if (this.cache.dates.size < 100) {
            this.cache.dates.set(dateString, result);
        }
        
        return result;
    },

    // অপ্টিমাইজড HTML এস্কেপ (শিরোনামের জন্য)
    escapeHtml(text) {
        if (!text) return '';
        
        if (this.cache.html.has(text)) {
            return this.cache.html.get(text);
        }

        const div = document.createElement('div');
        div.textContent = text;
        const result = div.innerHTML;

        if (this.cache.html.size < 200) {
            this.cache.html.set(text, result);
        }

        return result;
    },

    // ট্রাঙ্কেট ফাংশন (HTML স্ট্রিপ করে)
    truncate(html, length = 150) {
        if (!html) return '';
        
        // Strip HTML tags
        const div = document.createElement('div');
        div.innerHTML = html;
        const text = div.textContent || div.innerText || '';
        
        if (text.length <= length) return text;
        
        const truncated = text.substr(0, length);
        const lastSpace = truncated.lastIndexOf(' ');
        
        if (lastSpace > length * 0.8) {
            return truncated.substr(0, lastSpace) + '...';
        }
        return truncated + '...';
    },

    // স্টোরেজ সাইজ ক্যালকুলেশন
    calculateStorageSize(notes) {
        try {
            const jsonString = JSON.stringify(notes);
            const bytes = new Blob([jsonString]).size;
            
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
            return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
        } catch {
            return '0 KB';
        }
    },

    // ডাটা ভ্যালিডেশন (পিন এবং লিস্ট সহ)
    validateNote(note) {
        if (!note || typeof note !== 'object') return false;
        
        const sanitizedNote = {
            id: note.id && typeof note.id === 'string' ? note.id : this.generateId(),
            title: note.title && typeof note.title === 'string' ? note.title.substring(0, 1000) : '',
            content: note.content && typeof note.content === 'string' ? note.content.substring(0, 100000) : '',
            color: note.color && this.colors.includes(note.color) ? note.color : 'default',
            pinned: note.pinned === true ? true : false,
            createdAt: this.validateDate(note.createdAt),
            updatedAt: this.validateDate(note.updatedAt)
        };

        if (!sanitizedNote.createdAt) {
            sanitizedNote.createdAt = new Date().toISOString();
        }
        if (!sanitizedNote.updatedAt) {
            sanitizedNote.updatedAt = sanitizedNote.createdAt;
        }

        return sanitizedNote;
    },

    // ডেট ভ্যালিডেশন
    validateDate(date) {
        if (!date) return null;
        const d = new Date(date);
        return !isNaN(d.getTime()) ? d.toISOString() : null;
    },

    // নোট খালি কিনা চেক
    isNoteEmpty(note) {
        const textContent = note.content ? note.content.replace(/<[^>]*>/g, '').trim() : '';
        return !note.title?.trim() && !textContent;
    },

    // ডুপ্লিকেট চেক
    findDuplicate(notes, newNote) {
        return notes.some(n => 
            n.title === newNote.title && 
            n.content === newNote.content &&
            Math.abs(new Date(n.updatedAt) - new Date(newNote.updatedAt)) < 1000
        );
    },

    // এক্সপোর্ট ফাংশন (পিন এবং লিস্ট সহ)
    exportNotes(notes) {
        try {
            const data = {
                version: '4.6',
                exportDate: new Date().toISOString(),
                totalNotes: notes.length,
                app: 'Keep Notes Glass',
                notes: notes.map(n => ({
                    ...n,
                    title: n.title?.trim() || '',
                    content: n.content || '',
                    color: n.color || 'default',
                    pinned: n.pinned || false
                }))
            };

            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            a.href = url;
            a.download = `notes-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            return true;
        } catch (error) {
            console.error('Export error:', error);
            return false;
        }
    },

    // ইমপোর্ট ফাংশন (পিন এবং লিস্ট সহ)
    async importNotes(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    let importedNotes = [];
                    
                    if (Array.isArray(data)) {
                        importedNotes = data;
                    } else if (data.notes && Array.isArray(data.notes)) {
                        importedNotes = data.notes;
                    } else if (data.data && Array.isArray(data.data)) {
                        importedNotes = data.data;
                    } else {
                        reject(new Error('Invalid file format'));
                        return;
                    }

                    importedNotes = importedNotes
                        .map(note => this.validateNote(note))
                        .filter(note => note !== false)
                        .map(note => ({
                            ...note,
                            id: this.generateId(),
                            importedAt: new Date().toISOString()
                        }));

                    // ডুপ্লিকেট রিমুভ
                    const uniqueNotes = [];
                    const seen = new Set();
                    for (const note of importedNotes) {
                        const key = `${note.title}|${note.content}`;
                        if (!seen.has(key)) {
                            seen.add(key);
                            uniqueNotes.push(note);
                        }
                    }

                    resolve(uniqueNotes);
                } catch (error) {
                    reject(new Error('Failed to parse file: ' + error.message));
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file, 'utf-8');
        });
    },

    // ডাউনলোড ফাংশন (HTML স্ট্রিপ করে)
    downloadNote(note) {
        try {
            const title = note.title?.trim() || 'Untitled';
            
            // Strip HTML from content
            const div = document.createElement('div');
            div.innerHTML = note.content || '';
            const plainContent = div.textContent || div.innerText || '';
            
            const color = note.color || 'default';
            const pinned = note.pinned ? 'Yes' : 'No';
            const date = new Date().toLocaleString();
            
            const text = [
                title,
                '='.repeat(Math.min(title.length, 50)),
                '',
                plainContent,
                '',
                '---',
                `Pinned: ${pinned}`,
                `Color: ${color}`,
                `Created: ${new Date(note.createdAt).toLocaleString()}`,
                `Last modified: ${new Date(note.updatedAt).toLocaleString()}`,
                `Downloaded: ${date}`
            ].join('\n');
            
            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            const filename = title
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '_')
                .replace(/_+/g, '_')
                .substring(0, 50) || 'note';
            
            a.href = url;
            a.download = `${filename}.txt`;
            a.click();
            
            setTimeout(() => URL.revokeObjectURL(url), 100);
            return true;
        } catch (error) {
            console.error('Download error:', error);
            return false;
        }
    },

    // ডিবাউন্স ফাংশন
    debounce(func, wait) {
        let timeout;
        let lastCall = 0;
        
        return function(...args) {
            const now = Date.now();
            const context = this;
            
            if (now - lastCall < wait) {
                clearTimeout(timeout);
            }
            
            lastCall = now;
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    },

    // থ্রটল ফাংশন
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // টোস্ট মেসেজ
    showToast(message, duration = 2000, type = 'info') {
        const toast = document.getElementById('toast');
        if (!toast) return;
        
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
        }
        
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');
        
        this.toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    },

    // ডিবাগ মোড
    debug: false,
    
    log(...args) {
        if (this.debug) {
            console.log('[NotesUtils]', ...args);
        }
    },

    error(...args) {
        console.error('[NotesUtils]', ...args);
    }
};

// পিরিয়ডিক ক্যাশ ক্লিয়ার
setInterval(() => {
    if (NotesUtils.cache.dates.size > 100) {
        NotesUtils.cache.dates.clear();
    }
    if (NotesUtils.cache.html.size > 200) {
        NotesUtils.cache.html.clear();
    }
}, 60000);

window.NotesUtils = NotesUtils;