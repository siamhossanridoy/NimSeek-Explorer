document.addEventListener('DOMContentLoaded', () => {
    let websites = [];
    let editingIndex = null;
    let cachedFavicons = new Map();
    let dragStartIndex = null;

    // Helper function to get data from chrome.storage as a Promise
function getStorageData(keys = []) {
    return new Promise((resolve) => {
        chrome.storage.sync.get(keys, resolve);
    });
}

async function loadWebsites(filter = '', sortOption = null) {
    try {
        const result = await getStorageData(['websites', 'sortOption']);

        // Use stored websites or fallback to empty array
        websites = Array.isArray(result.websites) ? result.websites : [];

        // Determine the sort option
        const savedSortOption = sortOption || result.sortOption || 'a-z';
        const sortSelect = document.getElementById('sortOptions');
        if (sortSelect) sortSelect.value = savedSortOption;

        // Cache websites in session storage for quick access
        sessionStorage.setItem('cachedWebsites', JSON.stringify(websites));

        // Render websites according to filter and sort
        renderWebsites(filter, savedSortOption);

        return websites;
    } catch (error) {
        console.error('Error loading websites:', error);
        showNotification('Failed to load websites!');
        return [];
    }
}


    function renderWebsites(filter = '', sortOption = 'a-z') {
    const websiteGrid = document.getElementById('websiteGrid');
    if (!websiteGrid) return [];

    // Determine edit mode
    const editMode = document.getElementById('editMode')?.checked || false;

    // Filter websites
    const filterLower = filter.toLowerCase().trim();
    let filteredWebsites = filterLower
        ? websites.filter(site =>
            site.name.toLowerCase().includes(filterLower) ||
            site.url.toLowerCase().includes(filterLower)
        )
        : [...websites];

    // Sort websites if not custom
    if (sortOption !== 'custom') {
        sortWebsites(filteredWebsites, sortOption);
    }

    // Clear existing website cards (fast way)
    websiteGrid.innerHTML = '';

    // Use DocumentFragment for performance
    const fragment = document.createDocumentFragment();
    filteredWebsites.forEach((site, index) => {
        fragment.appendChild(createWebsiteCard(site, editMode, index));
    });
    websiteGrid.appendChild(fragment);

    // Initialize lazy loading and drag-drop
    initLazyLoading();
    initDragAndDrop();

    return filteredWebsites;
}


   function sortWebsites(websiteArray, sortOption = 'a-z') {
    if (!Array.isArray(websiteArray) || websiteArray.length === 0) return;

    const compareOptions = { sensitivity: 'base', numeric: true };

    const sortStrategies = {
        'a-z': (a, b) => a.name.localeCompare(b.name, 'en', compareOptions),
        'z-a': (a, b) => b.name.localeCompare(a.name, 'en', compareOptions),
        'date-asc': (a, b) => (a.date || 0) - (b.date || 0),
        'date-desc': (a, b) => (b.date || 0) - (a.date || 0),
    };

    const comparator = sortStrategies[sortOption] || sortStrategies['a-z'];

    websiteArray.sort(comparator);
}


   function createWebsiteCard(site, editMode = false, index = 0) {
    if (!site || !site.name || !site.url) return document.createElement('div');

    // নিরাপদ URL ফরম্যাট
    let formattedUrl;
    try {
        formattedUrl = new URL(site.url.startsWith('http') ? site.url : `https://${site.url}`).href;
    } catch {
        formattedUrl = '#';
    }

    // Favicon সেট করা
    const faviconUrl = cachedFavicons.get(site.url) ||
        `https://www.google.com/s2/favicons?domain=${formattedUrl}&sz=64`;

    // Card element তৈরি
    const card = document.createElement('div');
    card.className = 'website-card';
    card.draggable = true;
    card.dataset.index = index;

    // HTML কন্টেন্ট
    card.innerHTML = `
        <img src="data:image/gif;base64,R0lGODlhEAAQAPIAAP///wAAAMLCwkJCQmZmZjY2NoaGhlZWVgAAAAAAAAAAACH5BAEAAAEALAAAAAAQABAAAAM6CLrc/jDKSau9OOvNu/9gKI5yAUAOw=="
             data-src="${faviconUrl}"
             alt="${escapeHTML(site.name)} favicon"
             class="lazy-image">
        <a href="${formattedUrl}" target="_blank" rel="noopener noreferrer">${escapeHTML(site.name)}</a>
        <div class="website-actions ${editMode ? 'show' : ''}">
            <button class="edit-btn" data-id="${site.id}" aria-label="Edit ${escapeHTML(site.name)}">✎</button>
            <button class="delete-btn" data-id="${site.id}" aria-label="Delete ${escapeHTML(site.name)}">×</button>
        </div>
    `;

    // Event handling
    card.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (btn?.classList.contains('delete-btn')) {
            e.stopPropagation();
            deleteWebsiteById(Number(btn.dataset.id));
        } else if (btn?.classList.contains('edit-btn')) {
            e.stopPropagation();
            editWebsiteById(Number(btn.dataset.id));
        } else if (e.target.tagName !== 'BUTTON') {
            window.open(formattedUrl, '_blank', 'noopener');
        }
    });

    return card;
}

// HTML escaping helper
function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
}


    function initDragAndDrop() {
    const websiteGrid = document.getElementById('websiteGrid');
    const sortSelect = document.getElementById('sortOptions');
    let dragStartIndex = null;

    if (!websiteGrid || !sortSelect) return; // সেফটি চেক

    websiteGrid.querySelectorAll('.website-card').forEach(card => {
        card.addEventListener('dragstart', (e) => {
            dragStartIndex = parseInt(card.dataset.index, 10);
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', dragStartIndex);

            // ড্র্যাগ শুরুর সময় 'custom' সোর্ট মোড সেট করা
            if (sortSelect.value !== 'custom') {
                sortSelect.value = 'custom';
            }
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
        });

        card.addEventListener('dragover', (e) => {
            e.preventDefault(); // ড্রপের অনুমতি দেওয়া
        });

        card.addEventListener('drop', (e) => {
            e.preventDefault();
            const dragEndIndex = parseInt(card.dataset.index, 10);
            if (!isNaN(dragStartIndex) && dragStartIndex !== dragEndIndex) {
                reorderWebsites(dragStartIndex, dragEndIndex);
                saveWebsites(); // নতুন অর্ডার সেভ করা
            }
            dragStartIndex = null;
        });
    });

    websiteGrid.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(websiteGrid, e.clientY);
        const draggingCard = websiteGrid.querySelector('.dragging');

        if (draggingCard) {
            if (!afterElement) {
                websiteGrid.appendChild(draggingCard);
            } else {
                websiteGrid.insertBefore(draggingCard, afterElement);
            }
        }
    });
}

/**
 * মাউস পজিশনের ভিত্তিতে কোন এলিমেন্টের পরে ড্রপ হবে সেটা বের করা
 * @param {HTMLElement} container - মূল কন্টেইনার
 * @param {number} mouseY - মাউসের Y কো-অর্ডিনেট
 * @returns {HTMLElement|null} - টার্গেট এলিমেন্ট (না পেলে null)
 */
function getDragAfterElement(container, mouseY) {
    if (!container) return null;

    // ড্র্যাগ হচ্ছে না এমন কার্ডগুলো নিলাম
    const elements = Array.from(container.querySelectorAll('.website-card:not(.dragging)'));
    if (!elements.length) return null;

    let closestElement = null;
    let closestOffset = Number.NEGATIVE_INFINITY;

    for (const el of elements) {
        const rect = el.getBoundingClientRect();
        const offset = mouseY - rect.top - rect.height / 2;

        // শুধু উপরে থাকা এলিমেন্ট এবং সবচেয়ে কাছেরটাকে সিলেক্ট করা
        if (offset < 0 && offset > closestOffset) {
            closestOffset = offset;
            closestElement = el;
        }
    }

    return closestElement;
}





    /**
 * ওয়েবসাইট লিস্টে এক আইটেমের পজিশন পরিবর্তন করে
 * @param {number} fromIndex - যেখান থেকে মুভ হবে
 * @param {number} toIndex - যেখানে মুভ হবে
 */
function reorderWebsites(fromIndex, toIndex) {
    // সেফটি চেক
    if (!Array.isArray(websites) || websites.length === 0) return;
    if (fromIndex === toIndex) return;
    if (
        fromIndex < 0 || fromIndex >= websites.length ||
        toIndex < 0 || toIndex > websites.length
    ) return;

    // আইটেম মুভ করা
    const [movedItem] = websites.splice(fromIndex, 1);
    websites.splice(toIndex, 0, movedItem);

    // কাস্টম অর্ডার সংরক্ষণ
    document.getElementById('sortOptions').value = 'custom';
    saveWebsites();

    // ফিল্টার সহ রি-রেন্ডার
    const filterValue = document.getElementById('searchBar')?.value || '';
    renderWebsites(filterValue, 'custom');
}


    /**
 * ইমেজ লোড হবে তখনই যখন স্ক্রিনে আসবে (Lazy Loading)
 */
function initLazyLoading() {
    const lazyImages = document.querySelectorAll('.lazy-image');
    if (!lazyImages.length) return; // ইমেজ না থাকলে কিছু করার দরকার নেই

    const loadImage = (img) => {
        if (!img || !img.dataset?.src) return;
        img.src = img.dataset.src;
        img.classList.add('loaded');

        // কার্ড এবং URL খুঁজে ফেভিকন ক্যাশে রাখা
        const card = img.closest('.website-card');
        const url = card?.querySelector('a')?.href;
        if (url) {
            cachedFavicons.set(url, img.dataset.src);
        }
    };

    // আধুনিক ব্রাউজারে IntersectionObserver
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver(
            (entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        loadImage(entry.target);
                        observer.unobserve(entry.target);
                    }
                });
            },
            {
                rootMargin: '100px 0px', // আগে থেকেই লোড করার জন্য মার্জিন বাড়ানো
                threshold: 0.1
            }
        );

        lazyImages.forEach(img => imageObserver.observe(img));

    } else {
        // ফালব্যাক: পুরোনো ব্রাউজারে সরাসরি লোড
        lazyImages.forEach(loadImage);
    }
}


    /**
 * ওয়েবসাইট লিস্টে নতুন আইটেম যোগ বা এডিট করা
 */
function addWebsite() {
    const nameInput = document.getElementById('websiteName');
    const urlInput = document.getElementById('websiteUrl');
    const searchBar = document.getElementById('searchBar');
    const sortOptions = document.getElementById('sortOptions');
    const addBtn = document.getElementById('addWebsiteBtn');

    if (!nameInput || !urlInput || !searchBar || !sortOptions || !addBtn) {
        console.error("Required DOM elements are missing");
        return;
    }

    const name = nameInput.value.trim();
    const url = urlInput.value.trim();

    // ইনপুট চেক
    if (!name || !url) {
        showNotification('Please enter both name and URL');
        return;
    }

    const normalizedUrl = normalizeUrl(url);

    // ডুপ্লিকেট চেক
    const duplicate = websites.some((site, idx) =>
        site.url.toLowerCase() === normalizedUrl.toLowerCase() && idx !== editingIndex
    );
    if (duplicate) {
        showNotification('This URL already exists!');
        return;
    }

    const websiteData = {
        id: editingIndex !== null ? websites[editingIndex].id : Date.now(),
        name,
        url: normalizedUrl,
        date: Date.now()
    };

    if (editingIndex !== null) {
        // আপডেট
        websites[editingIndex] = { ...websites[editingIndex], ...websiteData };
        editingIndex = null;
        addBtn.textContent = '✔';
        showNotification('Website updated!');
    } else {
        // নতুন যোগ
        websites.push(websiteData);
        showNotification('Website added!');
    }

    saveWebsites();

    // ইনপুট রিসেট
    nameInput.value = '';
    urlInput.value = '';

    // রেন্ডার রিফ্রেশ
    loadWebsites(searchBar.value, sortOptions.value);
}


    /**
 * ইউজারের দেওয়া URL কে একটি স্ট্যান্ডার্ড ফরম্যাটে কনভার্ট করে
 * - প্রোটোকল না থাকলে ডিফল্ট হিসেবে https যোগ করে
 * - ডোমেইন পার্ট লোয়ারকেসে কনভার্ট করে
 * - অতিরিক্ত স্পেস এবং স্ল্যাশ সরায়
 * @param {string} url - ইউজারের দেওয়া ইনপুট
 * @returns {string} - নরমালাইজড URL
 */
function normalizeUrl(url) {
    if (!url || typeof url !== 'string') return '';

    let trimmedUrl = url.trim();

    // ফাঁকা হলে রিটার্ন
    if (!trimmedUrl) return '';

    // প্রোটোকল যোগ করা
    if (!/^https?:\/\//i.test(trimmedUrl)) {
        if (trimmedUrl.includes('.') && !trimmedUrl.includes(' ')) {
            trimmedUrl = `https://${trimmedUrl}`;
        } else {
            return trimmedUrl; // URL না হলে 그대로 ফেরত
        }
    }

    try {
        const urlObj = new URL(trimmedUrl);

        // ডোমেইন লোয়ারকেস
        urlObj.hostname = urlObj.hostname.toLowerCase();

        // শেষের স্ল্যাশ সরানো (যদি পাথ ফাঁকা থাকে)
        if (urlObj.pathname === '/' && !urlObj.search && !urlObj.hash) {
            urlObj.pathname = '';
        }

        return urlObj.toString();
    } catch {
        // ইনভ্যালিড URL হলে 그대로 ফেরত
        return url.trim();
    }
}


   /**
 * একটি ওয়েবসাইট এডিট মোডে সেট করা
 * @param {number} id - ওয়েবসাইটের ইউনিক আইডি
 */
function editWebsiteById(id) {
    if (!Array.isArray(websites) || websites.length === 0) return;

    const siteIndex = websites.findIndex(site => site.id === id);
    if (siteIndex === -1) return; // ID না পাওয়া গেলে কিছু হবে না

    const site = websites[siteIndex];

    // DOM এলিমেন্ট সেফলি গেট করা
    const nameInput = document.getElementById('websiteName');
    const urlInput = document.getElementById('websiteUrl');
    const addBtn = document.getElementById('addWebsiteBtn');

    if (!nameInput || !urlInput || !addBtn) {
        console.error('Required DOM elements are missing');
        return;
    }

    // ইনপুট ফিল্ড পূরণ করা
    nameInput.value = site.name;
    urlInput.value = site.url;

    // এডিট মোড সেট
    editingIndex = siteIndex;
    addBtn.textContent = '✔️';

    // ইউজার ফোকাস ওয়েবসাইট নাম ফিল্ডে
    nameInput.focus();
    nameInput.select(); // টেক্সট হাইলাইট করা, যাতে সহজে এডিট করা যায়
}


    /**
 * ওয়েবসাইট লিস্ট থেকে একটি আইটেম ডিলিট করা
 * @param {number} id - ওয়েবসাইটের ইউনিক আইডি
 */
function deleteWebsiteById(id) {
    if (!Array.isArray(websites) || websites.length === 0) return;

    const siteIndex = websites.findIndex(site => site.id === id);
    if (siteIndex === -1) {
        console.warn(`Website with ID ${id} not found.`);
        return;
    }

    // আইটেম মুছে ফেলা
    websites.splice(siteIndex, 1);

    // ওয়েবসাইট সেভ
    saveWebsites();

    // DOM এলিমেন্ট সেফলি গেট করা
    const searchBar = document.getElementById('searchBar');
    const sortOptions = document.getElementById('sortOptions');
    if (searchBar && sortOptions) {
        loadWebsites(searchBar.value, sortOptions.value);
    }

    // নোটিফিকেশন দেখানো
    showNotification('Website deleted!');
}


    /**
 * ওয়েবসাইট লিস্ট এবং সোর্ট অপশন ক্রোম স্টোরেজে সেভ করা
 * @returns {Promise<void>}
 */
function saveWebsites() {
    const sortSelect = document.getElementById('sortOptions');
    const sortOption = sortSelect ? sortSelect.value : 'a-z'; // DOM না থাকলে ডিফল্ট

    return new Promise((resolve, reject) => {
        try {
            chrome.storage.sync.set({ websites, sortOption }, () => {
                if (chrome.runtime.lastError) {
                    console.error('Error saving websites:', chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                } else {
                    // Optional: console.log('Websites saved successfully');
                    resolve();
                }
            });
        } catch (error) {
            console.error('Unexpected error while saving websites:', error);
            reject(error);
        }
    });
}


    function exportWebsites() {
        const dataStr = JSON.stringify(websites, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'NimSeek_Dashboard.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showNotification('Websites exported successfully!');
    }

    /**
 * JSON ফাইল থেকে ওয়েবসাইট লিস্ট ইমপোর্ট করা
 * @param {Event} event - ফাইল ইনপুট চেঞ্জ ইভেন্ট
 */
function importWebsites(event) {
    if (!event?.target?.files?.length) return;

    const file = event.target.files[0];

    // ফাইল এক্সটেনশন চেক
    if (!file.name.toLowerCase().endsWith('.json')) {
        showNotification('Please select a valid JSON file!');
        return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);

            // ফরম্যাট ভ্যালিডেশন
            if (!Array.isArray(importedData)) {
                showNotification('Invalid JSON format!');
                return;
            }

            const isValidData = importedData.every(site =>
                site &&
                typeof site.id === 'number' &&
                typeof site.name === 'string' &&
                typeof site.url === 'string' &&
                typeof site.date === 'number'
            );

            if (!isValidData) {
                showNotification('Invalid website data format!');
                return;
            }

            // ডুপ্লিকেট চেক
            const existingUrls = new Set(websites.map(site => site.url.toLowerCase()));
            const newWebsites = importedData.filter(site => !existingUrls.has(site.url.toLowerCase()));

            if (newWebsites.length === 0) {
                showNotification('No new websites to import!');
                return;
            }

            websites = [...websites, ...newWebsites];

            // সেভ এবং রেন্ডার
            saveWebsites()
                .then(() => {
                    const searchBar = document.getElementById('searchBar');
                    const sortOptions = document.getElementById('sortOptions');
                    loadWebsites(searchBar?.value || '', sortOptions?.value || 'a-z');
                    showNotification('Websites imported successfully!');
                })
                .catch(err => {
                    console.error('Error saving imported websites:', err);
                    showNotification('Failed to save imported websites!');
                });

        } catch (error) {
            console.error('Error parsing JSON file:', error);
            showNotification('Error importing JSON file!');
        }
    };

    reader.readAsText(file);

    // ইনপুট ফিল্ড রিসেট
    event.target.value = '';
}


    async function handleSearchEnter() {
        const searchBar = document.getElementById('searchBar');
        const searchTerm = searchBar.value.trim();
        if (!searchTerm) return;

        if (isUrl(searchTerm)) {
            const normalizedUrl = normalizeUrl(searchTerm);
            window.open(normalizedUrl, '_blank');
            return;
        }

        const filteredSites = await loadWebsites(searchTerm);
        const matches = filteredSites.filter(site =>
            site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            site.url.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (matches.length === 1) {
            const formattedUrl = matches[0].url.startsWith('http') ? matches[0].url : `https://${matches[0].url}`;
            window.open(formattedUrl, '_blank');
            return;
        }

        const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}`;
        window.open(googleSearchUrl, '_blank');
    }

    function isUrl(text) {
        return (
            text.includes('.') &&
            !text.includes(' ') &&
            (text.startsWith('http') || /^[a-zA-Z0-9][-a-zA-Z0-9.]+\.[a-zA-Z]{2,}/.test(text))
        );
    }

    function showNotification(message) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.classList.add('show');
        setTimeout(() => notification.classList.remove('show'), 3000);
    }

    function initializePopup() {
        const cachedData = sessionStorage.getItem('cachedWebsites');
        if (cachedData) {
            websites = JSON.parse(cachedData);
            renderWebsites(document.getElementById('searchBar').value, document.getElementById('sortOptions').value);
            setTimeout(() => {
                loadWebsites(document.getElementById('searchBar').value, document.getElementById('sortOptions').value);
            }, 100);
        } else {
            loadWebsites();
        }
        setTimeout(() => {
            document.getElementById('searchBar').focus();
        }, 0);
    }

    let searchTimeout;
    document.getElementById('searchBar').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadWebsites(e.target.value, document.getElementById('sortOptions').value);
        }, 300);
    });

    document.getElementById('searchBar').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearchEnter();
        }
    });

    document.getElementById('addWebsiteBtn').addEventListener('click', addWebsite);

    document.getElementById('websiteName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const urlField = document.getElementById('websiteUrl');
            if (!urlField.value.trim()) {
                urlField.focus();
            } else {
                addWebsite();
            }
        }
    });

    document.getElementById('websiteUrl').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const nameField = document.getElementById('websiteName');
            if (!nameField.value.trim()) {
                nameField.focus();
            } else {
                addWebsite();
            }
        }
    });

    document.getElementById('sortOptions').addEventListener('change', (e) => {
        const newSortOption = e.target.value;
        saveWebsites();
        loadWebsites(document.getElementById('searchBar').value, newSortOption);
    });

    document.getElementById('editMode').addEventListener('change', () => {
        loadWebsites(document.getElementById('searchBar').value, document.getElementById('sortOptions').value);
    });

    document.getElementById('exportBtn').addEventListener('click', exportWebsites);

    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });

    document.getElementById('importFile').addEventListener('change', importWebsites);

    initializePopup();
});


// popup.js

document.getElementById('openSidePanelButton').addEventListener('click', () => {
  // ব্যাকগ্রাউন্ড স্ক্রিপ্টে বার্তা পাঠানো হচ্ছে
  chrome.runtime.sendMessage({
    method: 'open-side-panel', // নতুন মেসেজ মেথড
  }, (response) => {
    // এখানে বার্তা পাঠানোর পরে যদি কোনো প্রতিক্রিয়া আসে, তা হ্যান্ডেল করতে পারেন
    if (chrome.runtime.lastError) {
      console.error('Error sending message:', chrome.runtime.lastError.message);
    } else {
      console.log('Message sent to background script. Response:', response);
    }
  });
});