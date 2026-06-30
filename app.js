// Supabase Configuration
const SUPABASE_URL = "https://izbnffyqvbbbggfzdibe.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6Ym5mZnlxdmJiYmdnZnpkaWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwMjA0MDMsImV4cCI6MjA5NzU5NjQwM30._xV3h067QE3pkSlWuGSCmt7ZmDIECkfxftwETuDMaCU";

const { createClient } = window.supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State Management
let currentTab = 'contents';
let currentSubTab = 'tvchannels';
let cachedGenres = [];
let cachedLanguages = [];
let cachedActors = [];

// DOM Elements
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const sidebarMenu = document.querySelector('.sidebar-menu');
const tabTitle = document.getElementById('tab-title');
const tabActions = document.getElementById('tab-actions');

// Modal Elements
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalCloseBtn = document.getElementById('modal-close-btn');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    setupEventListeners();
});

function checkSession() {
    const session = localStorage.getItem('flixy_admin_session');
    if (session) {
        showDashboard();
    } else {
        showLogin();
    }
}

function showLogin() {
    loginContainer.style.display = 'flex';
    dashboardContainer.style.display = 'none';
}

function showDashboard() {
    loginContainer.style.display = 'none';
    dashboardContainer.style.display = 'flex';
    switchTab(currentTab);
    loadGlobalCache();
}

async function loadGlobalCache() {
    try {
        const { data: genres } = await _supabase.from('genres').select('*').order('id', { ascending: true });
        const { data: languages } = await _supabase.from('languages').select('*').order('id', { ascending: true });
        const { data: actors } = await _supabase.from('actors').select('*').order('fullname', { ascending: true });
        cachedGenres = genres || [];
        cachedLanguages = languages || [];
        cachedActors = actors || [];
    } catch (e) {
        console.error("Error loading cache:", e);
    }
}

// Event Listeners
function setupEventListeners() {
    // Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.textContent = '';
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const { data, error } = await _supabase
                .from('admin_user')
                .select('*')
                .eq('user_name', username)
                .eq('user_password', password)
                .single();

            if (error || !data) {
                loginError.textContent = 'Invalid username or password.';
            } else {
                localStorage.setItem('flixy_admin_session', JSON.stringify(data));
                showDashboard();
            }
        } catch (err) {
            loginError.textContent = 'Connection error. Please try again.';
        }
    });

    // Logout
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('flixy_admin_session');
        showLogin();
    });

    // Sidebar tab clicks
    sidebarMenu.addEventListener('click', (e) => {
        const menuLink = e.target.closest('.menu-item');
        if (!menuLink) return;
        e.preventDefault();
        
        document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
        menuLink.classList.add('active');
        
        switchTab(menuLink.dataset.tab);
    });

    // Sub tabs inside Live TV
    document.querySelectorAll('.sub-nav-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.sub-nav-item').forEach(el => el.classList.remove('active'));
            e.target.classList.add('active');
            
            document.querySelectorAll('.subtab-section').forEach(sec => sec.classList.remove('active'));
            currentSubTab = e.target.dataset.subtab;
            document.getElementById(`subtab-${currentSubTab}`).classList.add('active');
            
            loadSubTab(currentSubTab);
        });
    });

    // Modal Close
    modalCloseBtn.addEventListener('click', hideModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) hideModal();
    });

    // Filters inside contents
    document.getElementById('search-contents').addEventListener('input', () => loadContents());
    document.getElementById('filter-content-type').addEventListener('change', () => loadContents());
}

// Tab router
function switchTab(tabId) {
    currentTab = tabId;
    
    // Hide all tab sections
    document.querySelectorAll('.tab-section').forEach(sec => sec.classList.remove('active'));
    
    // Show target section
    const activeSec = document.getElementById(`tab-${tabId}`);
    if (activeSec) activeSec.classList.add('active');

    // Title and actions mapping
    tabActions.innerHTML = '';
    
    switch (tabId) {
        case 'contents':
            tabTitle.textContent = 'Movies & Series';
            tabActions.innerHTML = `<button class="btn-primary" id="btn-add-content"><i class="fa-solid fa-plus"></i> Add New</button>`;
            document.getElementById('btn-add-content').addEventListener('click', () => showAddContentModal());
            loadContents();
            break;
        case 'genres':
            tabTitle.textContent = 'Genres';
            loadGenres();
            break;
        case 'languages':
            tabTitle.textContent = 'Languages';
            loadLanguages();
            break;
        case 'actors':
            tabTitle.textContent = 'Actors';
            loadActors();
            break;
        case 'livetv':
            tabTitle.textContent = 'Live TV Categories & Channels';
            loadSubTab(currentSubTab);
            break;
        case 'ads':
            tabTitle.textContent = 'Custom Ad Campaigns';
            loadAds();
            break;
        case 'settings':
            tabTitle.textContent = 'App Config Settings';
            loadSettings();
            break;
        case 'users':
            tabTitle.textContent = 'Registered Users';
            loadUsers();
            break;
    }
}

function loadSubTab(subTabId) {
    if (subTabId === 'tvchannels') {
        loadTVChannels();
    } else {
        loadTVCategories();
    }
}

// Modal helper methods
function showModal(title, bodyHtml) {
    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHtml;
    modalOverlay.classList.add('active');
}

function hideModal() {
    modalOverlay.classList.remove('active');
    modalBody.innerHTML = '';
}

// Supabase File Upload Helper
async function uploadToSupabase(fileInput, bucketPath) {
    if (!fileInput.files || fileInput.files.length === 0) return null;
    const file = fileInput.files[0];
    const extension = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${extension}`;
    
    const { data, error } = await _supabase.storage
        .from('flixy')
        .upload(`${bucketPath}/${fileName}`, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        throw error;
    }

    const { data: publicData } = _supabase.storage
        .from('flixy')
        .getPublicUrl(`${bucketPath}/${fileName}`);

    return publicData.publicUrl;
}

// ==========================================
// SECTION 1: MOVIES & SERIES MANAGEMENT
// ==========================================
async function loadContents() {
    const listContainer = document.getElementById('contents-list');
    listContainer.innerHTML = `<tr><td colspan="8" style="text-align:center;">Loading contents...</td></tr>`;
    
    const searchVal = document.getElementById('search-contents').value.trim();
    const typeVal = document.getElementById('filter-content-type').value;

    try {
        let query = _supabase.from('contents').select('*');
        
        if (searchVal) {
            query = query.or(`title.ilike.%${searchVal}%,description.ilike.%${searchVal}%`);
        }
        
        if (typeVal !== 'all') {
            query = query.eq('type', parseInt(typeVal));
        }

        const { data, error } = await query.order('id', { ascending: false });

        if (error) throw error;
        
        if (!data || data.length === 0) {
            listContainer.innerHTML = `<tr><td colspan="8" style="text-align:center;">No movies or series found.</td></tr>`;
            return;
        }

        listContainer.innerHTML = '';
        data.forEach(item => {
            const row = document.createElement('tr');
            const genreNames = item.genre_ids ? item.genre_ids.split(',').map(id => cachedGenres.find(g => g.id == id)?.title || id).join(', ') : 'None';
            const langName = cachedLanguages.find(l => l.id == item.language_id)?.title || 'Unknown';

            row.innerHTML = `
                <td><img src="${item.vertical_poster || 'placeholder.jpg'}" class="table-thumbnail" onerror="this.src='./assets/img/placeholder-image.png'"></td>
                <td>
                    <strong>${escapeHtml(item.title)}</strong>
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">${genreNames}</div>
                </td>
                <td><span class="badge ${item.type === 1 ? 'badge-series' : 'badge-movie'}">${item.type === 1 ? 'Series' : 'Movie'}</span></td>
                <td>${item.release_year}</td>
                <td>${langName}</td>
                <td>
                    <button class="table-toggle-btn ${item.is_featured === 1 ? 'active' : 'inactive'}" onclick="toggleFeatured(${item.id}, ${item.is_featured})">
                        <i class="fa-solid ${item.is_featured === 1 ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                    </button>
                </td>
                <td>
                    <button class="table-toggle-btn ${item.is_show === 1 ? 'active' : 'inactive'}" onclick="toggleShow(${item.id}, ${item.is_show})">
                        <i class="fa-solid ${item.is_show === 1 ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                    </button>
                </td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon" title="Edit details" onclick="showEditContentModal(${item.id})"><i class="fa-solid fa-pen"></i></button>
                        ${item.type === 0 
                            ? `<button class="btn-icon" title="Manage Video Sources" onclick="manageMovieSources(${item.id}, '${escapeHtml(item.title)}')"><i class="fa-solid fa-link"></i></button>`
                            : `<button class="btn-icon" title="Manage Seasons & Episodes" onclick="manageSeasons(${item.id}, '${escapeHtml(item.title)}')"><i class="fa-solid fa-folder-tree"></i></button>`
                        }
                        <button class="btn-icon" title="Manage Subtitles" onclick="manageMovieSubtitles(${item.id}, '${escapeHtml(item.title)}')"><i class="fa-solid fa-closed-captioning"></i></button>
                        <button class="btn-icon" title="Manage Cast members" onclick="manageMovieCast(${item.id}, '${escapeHtml(item.title)}')"><i class="fa-solid fa-user-plus"></i></button>
                        <button class="btn-icon btn-icon-danger" title="Delete content" onclick="deleteContent(${item.id})"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            `;
            listContainer.appendChild(row);
        });
    } catch (e) {
        listContainer.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--danger)">Error: ${e.message}</td></tr>`;
    }
}

async function toggleFeatured(id, val) {
    const newVal = val === 1 ? 0 : 1;
    await _supabase.from('contents').update({ is_featured: newVal }).eq('id', id);
    loadContents();
}

async function toggleShow(id, val) {
    const newVal = val === 1 ? 0 : 1;
    await _supabase.from('contents').update({ is_show: newVal }).eq('id', id);
    loadContents();
}

function getGenresCheckboxes(selectedIds = []) {
    let html = '';
    cachedGenres.forEach(genre => {
        const checked = selectedIds.includes(genre.id.toString()) ? 'checked' : '';
        html += `
            <label style="display:inline-flex; align-items:center; gap:8px; margin: 5px 15px 5px 0; cursor:pointer;">
                <input type="checkbox" name="genres_checkbox" value="${genre.id}" ${checked}>
                <span>${genre.title}</span>
            </label>
        `;
    });
    return html;
}

function showAddContentModal() {
    const bodyHtml = `
        <form id="add-content-form" class="form-grid-2">
            <div class="form-group form-group-full">
                <label>Title</label>
                <input type="text" id="add-c-title" placeholder="Content title" required>
            </div>
            <div class="form-group form-group-full">
                <label>Description</label>
                <textarea id="add-c-description" rows="3" placeholder="Enter description..." required></textarea>
            </div>
            <div class="form-group">
                <label>Type</label>
                <select id="add-c-type">
                    <option value="0">Movie</option>
                    <option value="1">Series</option>
                </select>
            </div>
            <div class="form-group">
                <label>Release Year</label>
                <input type="number" id="add-c-year" value="2026" required>
            </div>
            <div class="form-group">
                <label>Duration / Runtime (e.g. 2h 15m or 10 Seasons)</label>
                <input type="text" id="add-c-duration" placeholder="e.g. 2h 15m">
            </div>
            <div class="form-group">
                <label>Rating (0.0 - 10.0)</label>
                <input type="number" id="add-c-rating" step="0.1" value="0.0" min="0" max="10">
            </div>
            <div class="form-group">
                <label>VJ / Language</label>
                <select id="add-c-language">
                    ${cachedLanguages.map(l => `<option value="${l.id}">${l.title}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Trailer URL</label>
                <input type="text" id="add-c-trailer" placeholder="Youtube or direct mp4 URL">
            </div>
            <div class="form-group form-group-full">
                <label>Genres</label>
                <div class="genres-selection-container" style="background:rgba(0,0,0,0.2); padding:10px; border-radius:10px; border:1px solid var(--border-color)">
                    ${getGenresCheckboxes()}
                </div>
            </div>
            <div class="form-group form-group-full">
                <label>Vertical Poster Image</label>
                <input type="file" id="add-c-v-poster" accept="image/*">
            </div>
            <div class="form-group form-group-full">
                <label>Horizontal Poster Image</label>
                <input type="file" id="add-c-h-poster" accept="image/*">
            </div>
            <div class="form-group form-group-full">
                <label>Logo Poster (Optional)</label>
                <input type="file" id="add-c-logo" accept="image/*">
            </div>
            <div class="modal-actions form-group-full">
                <button type="button" class="btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn-primary">Save Content</button>
            </div>
        </form>
    `;
    showModal('Add New Content', bodyHtml);
    
    document.getElementById('add-content-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        
        try {
            // Upload posters
            const vPosterUrl = await uploadToSupabase(document.getElementById('add-c-v-poster'), 'posters');
            const hPosterUrl = await uploadToSupabase(document.getElementById('add-c-h-poster'), 'posters');
            const logoUrl = await uploadToSupabase(document.getElementById('add-c-logo'), 'posters');

            const genresChecked = Array.from(document.querySelectorAll('input[name="genres_checkbox"]:checked')).map(el => el.value).join(',');

            const insertData = {
                title: document.getElementById('add-c-title').value,
                description: document.getElementById('add-c-description').value,
                type: parseInt(document.getElementById('add-c-type').value),
                release_year: parseInt(document.getElementById('add-c-year').value),
                duration: document.getElementById('add-c-duration').value || null,
                ratings: parseFloat(document.getElementById('add-c-rating').value),
                language_id: parseInt(document.getElementById('add-c-language').value),
                trailer_url: document.getElementById('add-c-trailer').value || null,
                vertical_poster: vPosterUrl,
                horizontal_poster: hPosterUrl,
                logo_url: logoUrl,
                genre_ids: genresChecked,
                is_featured: 0,
                is_show: 1
            };

            const { error } = await _supabase.from('contents').insert([insertData]);
            if (error) throw error;
            
            hideModal();
            loadContents();
        } catch (err) {
            alert('Error adding content: ' + err.message);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Content';
        }
    });
}

async function showEditContentModal(id) {
    const { data: item, error } = await _supabase.from('contents').select('*').eq('id', id).single();
    if (error || !item) {
        alert('Error loading content details');
        return;
    }

    const selectedGenres = item.genre_ids ? item.genre_ids.split(',') : [];

    const bodyHtml = `
        <form id="edit-content-form" class="form-grid-2">
            <div class="form-group form-group-full">
                <label>Title</label>
                <input type="text" id="edit-c-title" value="${escapeHtml(item.title)}" required>
            </div>
            <div class="form-group form-group-full">
                <label>Description</label>
                <textarea id="edit-c-description" rows="3" required>${escapeHtml(item.description)}</textarea>
            </div>
            <div class="form-group">
                <label>Type</label>
                <select id="edit-c-type">
                    <option value="0" ${item.type === 0 ? 'selected' : ''}>Movie</option>
                    <option value="1" ${item.type === 1 ? 'selected' : ''}>Series</option>
                </select>
            </div>
            <div class="form-group">
                <label>Release Year</label>
                <input type="number" id="edit-c-year" value="${item.release_year}" required>
            </div>
            <div class="form-group">
                <label>Duration / Runtime</label>
                <input type="text" id="edit-c-duration" value="${escapeHtml(item.duration || '')}" placeholder="e.g. 2h 15m">
            </div>
            <div class="form-group">
                <label>Rating (0.0 - 10.0)</label>
                <input type="number" id="edit-c-rating" step="0.1" value="${item.ratings}" min="0" max="10">
            </div>
            <div class="form-group">
                <label>VJ / Language</label>
                <select id="edit-c-language">
                    ${cachedLanguages.map(l => `<option value="${l.id}" ${l.id === item.language_id ? 'selected' : ''}>${l.title}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Trailer URL</label>
                <input type="text" id="edit-c-trailer" value="${escapeHtml(item.trailer_url || '')}" placeholder="Youtube or direct mp4 URL">
            </div>
            <div class="form-group form-group-full">
                <label>Genres</label>
                <div class="genres-selection-container" style="background:rgba(0,0,0,0.2); padding:10px; border-radius:10px; border:1px solid var(--border-color)">
                    ${getGenresCheckboxes(selectedGenres)}
                </div>
            </div>
            <div class="form-group form-group-full">
                <label>Vertical Poster Image</label>
                <div class="image-preview-container">
                    <div class="image-preview-box"><img src="${item.vertical_poster || ''}" onerror="this.src='./assets/img/placeholder-image.png'"></div>
                    <input type="file" id="edit-c-v-poster" accept="image/*">
                </div>
            </div>
            <div class="form-group form-group-full">
                <label>Horizontal Poster Image</label>
                <div class="image-preview-container">
                    <div class="image-preview-box"><img src="${item.horizontal_poster || ''}" onerror="this.src='./assets/img/placeholder-image.png'"></div>
                    <input type="file" id="edit-c-h-poster" accept="image/*">
                </div>
            </div>
            <div class="form-group form-group-full">
                <label>Logo Poster (Optional)</label>
                <div class="image-preview-container">
                    <div class="image-preview-box"><img src="${item.logo_url || ''}" onerror="this.src='./assets/img/placeholder-image.png'"></div>
                    <input type="file" id="edit-c-logo" accept="image/*">
                </div>
            </div>
            <div class="modal-actions form-group-full">
                <button type="button" class="btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn-primary">Update Content</button>
            </div>
        </form>
    `;
    showModal(`Edit: ${item.title}`, bodyHtml);
    
    document.getElementById('edit-content-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';
        
        try {
            const vPosterUrl = await uploadToSupabase(document.getElementById('edit-c-v-poster'), 'posters') || item.vertical_poster;
            const hPosterUrl = await uploadToSupabase(document.getElementById('edit-c-h-poster'), 'posters') || item.horizontal_poster;
            const logoUrl = await uploadToSupabase(document.getElementById('edit-c-logo'), 'posters') || item.logo_url;

            const genresChecked = Array.from(document.querySelectorAll('input[name="genres_checkbox"]:checked')).map(el => el.value).join(',');

            const updateData = {
                title: document.getElementById('edit-c-title').value,
                description: document.getElementById('edit-c-description').value,
                type: parseInt(document.getElementById('edit-c-type').value),
                release_year: parseInt(document.getElementById('edit-c-year').value),
                duration: document.getElementById('edit-c-duration').value || null,
                ratings: parseFloat(document.getElementById('edit-c-rating').value),
                language_id: parseInt(document.getElementById('edit-c-language').value),
                trailer_url: document.getElementById('edit-c-trailer').value || null,
                vertical_poster: vPosterUrl,
                horizontal_poster: hPosterUrl,
                logo_url: logoUrl,
                genre_ids: genresChecked,
                updated_at: new Date().toISOString()
            };

            const { error: errUpdate } = await _supabase.from('contents').update(updateData).eq('id', id);
            if (errUpdate) throw errUpdate;
            
            hideModal();
            loadContents();
        } catch (err) {
            alert('Error updating content: ' + err.message);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Update Content';
        }
    });
}

async function deleteContent(id) {
    if (!confirm('Are you sure you want to delete this movie/series? This will permanently delete its sources, cast associations, seasons, and episodes!')) return;
    
    try {
        await _supabase.from('content_sources').delete().eq('content_id', id);
        await _supabase.from('content_cast').delete().eq('content_id', id);
        
        // Find seasons of this series
        const { data: seasons } = await _supabase.from('seasons').select('id').eq('content_id', id);
        if (seasons && seasons.length > 0) {
            for (const s of seasons) {
                const { data: episodes } = await _supabase.from('episodes').select('id').eq('season_id', s.id);
                if (episodes && episodes.length > 0) {
                    for (const ep of episodes) {
                        await _supabase.from('episode_sources').delete().eq('episode_id', ep.id);
                        await _supabase.from('episode_subtitles').delete().eq('episode_id', ep.id);
                    }
                    await _supabase.from('episodes').delete().eq('season_id', s.id);
                }
            }
            await _supabase.from('seasons').delete().eq('content_id', id);
        }
        
        await _supabase.from('contents').delete().eq('id', id);
        loadContents();
    } catch (e) {
        alert('Error deleting content: ' + e.message);
    }
}

// ==========================================
// MOVIE SOURCES MANAGEMENT
// ==========================================
async function manageMovieSources(contentId, movieTitle) {
    const loadSourcesList = async () => {
        const { data: sources, error } = await _supabase.from('content_sources').select('*').eq('content_id', contentId).order('id', { ascending: true });
        if (error) return 'Error loading sources';
        
        let html = '';
        if (!sources || sources.length === 0) {
            html = '<div style="text-align:center; padding:15px; color:var(--text-muted);">No video source files linked yet.</div>';
        } else {
            sources.forEach(src => {
                html += `
                    <div style="background:rgba(0,0,0,0.2); border:1px solid var(--border-color); border-radius:10px; padding:12px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <strong>${escapeHtml(src.title)}</strong> (${escapeHtml(src.quality)})
                            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px; word-break:break-all;">${escapeHtml(src.source)}</div>
                        </div>
                        <div class="action-btns">
                            <button class="btn-icon btn-icon-danger" onclick="deleteSource(${src.id}, ${contentId}, '${escapeHtml(movieTitle)}')"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                `;
            });
        }
        return html;
    };

    const sourcesListHtml = await loadSourcesList();

    const bodyHtml = `
        <div style="margin-bottom:20px; font-weight:500;">Current sources for: <span style="color:var(--primary)">${movieTitle}</span></div>
        <div id="sources-list-container" style="max-height:300px; overflow-y:auto; margin-bottom:20px; border-bottom:1px solid var(--border-color); padding-bottom:15px;">
            ${sourcesListHtml}
        </div>
        <form id="add-source-form" style="display:flex; flex-direction:column; gap:15px; border-top:1px solid var(--border-color); padding-top:15px;">
            <h4>Add Video Source</h4>
            <div class="form-grid-2">
                <div class="form-group">
                    <label>Title (e.g. Stream Server 1)</label>
                    <input type="text" id="src-title" placeholder="Stream Title" required>
                </div>
                <div class="form-group">
                    <label>Quality (e.g. 1080p, 720p)</label>
                    <input type="text" id="src-quality" placeholder="e.g. 1080p" required>
                </div>
                <div class="form-group">
                    <label>Access Type</label>
                    <select id="src-access">
                        <option value="0">Free</option>
                        <option value="1">Premium</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Video URL / Embed Link</label>
                    <input type="text" id="src-link" placeholder="Video URL (m3u8, mp4) or Youtube video ID" required>
                </div>
            </div>
            <div style="display:flex; justify-content:flex-end;">
                <button type="submit" class="btn-primary"><i class="fa-solid fa-plus"></i> Add Video Source</button>
            </div>
        </form>
    `;
    showModal('Manage Video Sources', bodyHtml);

    document.getElementById('add-source-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const insertData = {
                content_id: contentId,
                title: document.getElementById('src-title').value,
                quality: document.getElementById('src-quality').value,
                access_type: parseInt(document.getElementById('src-access').value),
                source: document.getElementById('src-link').value,
                size: 'N/A',
                is_download: 0,
                type: 0 // 0 for url, 1 for youtube id
            };

            const { error } = await _supabase.from('content_sources').insert([insertData]);
            if (error) throw error;
            
            // Reload source view
            manageMovieSources(contentId, movieTitle);
        } catch (err) {
            alert('Error adding source: ' + err.message);
            submitBtn.disabled = false;
        }
    });
}

async function deleteSource(id, contentId, movieTitle) {
    if (!confirm('Are you sure you want to delete this video source?')) return;
    const { error } = await _supabase.from('content_sources').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else manageMovieSources(contentId, movieTitle);
}

// ==========================================
// SUBTITLES MANAGEMENT
// ==========================================
async function manageMovieSubtitles(contentId, movieTitle) {
    const loadSubtitlesList = async () => {
        const { data: subs, error } = await _supabase.from('subtitles').select('*').eq('content_id', contentId.toString()).order('id', { ascending: true });
        if (error) return 'Error loading subtitles';
        
        let html = '';
        if (!subs || subs.length === 0) {
            html = '<div style="text-align:center; padding:15px; color:var(--text-muted);">No subtitles attached.</div>';
        } else {
            subs.forEach(sub => {
                const langName = cachedLanguages.find(l => l.id == sub.language_id)?.title || 'Unknown';
                html += `
                    <div style="background:rgba(0,0,0,0.2); border:1px solid var(--border-color); border-radius:10px; padding:12px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <strong>${langName} Subtitle</strong>
                            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px; word-break:break-all;">File: ${escapeHtml(sub.file)}</div>
                        </div>
                        <div class="action-btns">
                            <button class="btn-icon btn-icon-danger" onclick="deleteSubtitle(${sub.id}, ${contentId}, '${escapeHtml(movieTitle)}')"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                `;
            });
        }
        return html;
    };

    const subsListHtml = await loadSubtitlesList();

    const bodyHtml = `
        <div style="margin-bottom:20px; font-weight:500;">Subtitles for: <span style="color:var(--primary)">${movieTitle}</span></div>
        <div id="subtitles-list-container" style="max-height:300px; overflow-y:auto; margin-bottom:20px; border-bottom:1px solid var(--border-color); padding-bottom:15px;">
            ${subsListHtml}
        </div>
        <form id="add-subtitle-form" style="display:flex; flex-direction:column; gap:15px; border-top:1px solid var(--border-color); padding-top:15px;">
            <h4>Add Subtitle File</h4>
            <div class="form-grid-2">
                <div class="form-group">
                    <label>Language</label>
                    <select id="sub-language" required>
                        ${cachedLanguages.map(l => `<option value="${l.id}">${l.title}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Subtitle File (.srt or .vtt)</label>
                    <input type="file" id="sub-file" accept=".srt,.vtt" required>
                </div>
            </div>
            <div style="display:flex; justify-content:flex-end;">
                <button type="submit" class="btn-primary"><i class="fa-solid fa-plus"></i> Add Subtitle</button>
            </div>
        </form>
    `;
    showModal('Manage Subtitles', bodyHtml);

    document.getElementById('add-subtitle-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const subFileUrl = await uploadToSupabase(document.getElementById('sub-file'), 'subtitles');
            if (!subFileUrl) throw new Error("File upload failed.");

            const insertData = {
                content_id: contentId.toString(),
                language_id: parseInt(document.getElementById('sub-language').value),
                file: subFileUrl
            };

            const { error } = await _supabase.from('subtitles').insert([insertData]);
            if (error) throw error;
            
            manageMovieSubtitles(contentId, movieTitle);
        } catch (err) {
            alert('Error adding subtitle: ' + err.message);
            submitBtn.disabled = false;
        }
    });
}

async function deleteSubtitle(id, contentId, movieTitle) {
    if (!confirm('Are you sure you want to delete this subtitle?')) return;
    const { error } = await _supabase.from('subtitles').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else manageMovieSubtitles(contentId, movieTitle);
}

// ==========================================
// CAST MEMBERS MANAGEMENT
// ==========================================
async function manageMovieCast(contentId, movieTitle) {
    const loadCastList = async () => {
        const { data: casts, error } = await _supabase.from('content_cast').select('*').eq('content_id', contentId).order('id', { ascending: true });
        if (error) return 'Error loading cast';
        
        let html = '';
        if (!casts || casts.length === 0) {
            html = '<div style="text-align:center; padding:15px; color:var(--text-muted);">No cast members added.</div>';
        } else {
            casts.forEach(cast => {
                const actor = cachedActors.find(a => a.id == cast.actor_id);
                const actorName = actor ? actor.fullname : 'Unknown Actor';
                const actorImg = actor ? actor.profile_image : '';
                html += `
                    <div style="background:rgba(0,0,0,0.2); border:1px solid var(--border-color); border-radius:10px; padding:12px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap:15px;">
                            <img src="${actorImg}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;" onerror="this.src='./assets/img/placeholder-image.png'">
                            <div>
                                <strong>${escapeHtml(actorName)}</strong>
                                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">As: ${escapeHtml(cast.character_name)}</div>
                            </div>
                        </div>
                        <div class="action-btns">
                            <button class="btn-icon btn-icon-danger" onclick="deleteCast(${cast.id}, ${contentId}, '${escapeHtml(movieTitle)}')"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                `;
            });
        }
        return html;
    };

    const castListHtml = await loadCastList();

    const bodyHtml = `
        <div style="margin-bottom:20px; font-weight:500;">Cast for: <span style="color:var(--primary)">${movieTitle}</span></div>
        <div id="cast-list-container" style="max-height:300px; overflow-y:auto; margin-bottom:20px; border-bottom:1px solid var(--border-color); padding-bottom:15px;">
            ${castListHtml}
        </div>
        <form id="add-cast-form" style="display:flex; flex-direction:column; gap:15px; border-top:1px solid var(--border-color); padding-top:15px;">
            <h4>Add Cast Member</h4>
            <div class="form-grid-2">
                <div class="form-group">
                    <label>Select Actor</label>
                    <select id="cast-actor-id" required>
                        ${cachedActors.map(a => `<option value="${a.id}">${a.fullname}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Character / Role Name</label>
                    <input type="text" id="cast-char-name" placeholder="Character Role Name" required>
                </div>
            </div>
            <div style="display:flex; justify-content:flex-end;">
                <button type="submit" class="btn-primary"><i class="fa-solid fa-plus"></i> Add Cast Member</button>
            </div>
        </form>
    `;
    showModal('Manage Cast Members', bodyHtml);

    document.getElementById('add-cast-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const insertData = {
                content_id: contentId,
                actor_id: parseInt(document.getElementById('cast-actor-id').value),
                character_name: document.getElementById('cast-char-name').value
            };

            const { error } = await _supabase.from('content_cast').insert([insertData]);
            if (error) throw error;
            
            manageMovieCast(contentId, movieTitle);
        } catch (err) {
            alert('Error adding cast member: ' + err.message);
            submitBtn.disabled = false;
        }
    });
}

async function deleteCast(id, contentId, movieTitle) {
    if (!confirm('Are you sure you want to delete this cast member association?')) return;
    const { error } = await _supabase.from('content_cast').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else manageMovieCast(contentId, movieTitle);
}

// ==========================================
// SERIES SEASONS & EPISODES
// ==========================================
async function manageSeasons(contentId, seriesTitle) {
    const { data: seasons, error } = await _supabase.from('seasons').select('*').eq('content_id', contentId).order('id', { ascending: true });
    
    let seasonsTabsHtml = '';
    let seasonsContentHtml = '';

    if (error || !seasons || seasons.length === 0) {
        seasonsContentHtml = `
            <div style="text-align:center; padding:30px; color:var(--text-muted);" id="no-seasons-alert">
                No seasons created yet for this series.
            </div>
        `;
    } else {
        seasons.forEach((season, idx) => {
            seasonsTabsHtml += `<button class="sub-nav-item ${idx === 0 ? 'active' : ''}" data-season-id="${season.id}">${escapeHtml(season.title)}</button>`;
            seasonsContentHtml += `
                <div class="season-ep-panel ${idx === 0 ? 'active' : ''}" id="season-panel-${season.id}" style="display: ${idx === 0 ? 'block' : 'none'};">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                        <strong>Episodes List</strong>
                        <div style="display:flex; gap:10px;">
                            <button class="manage-sub-btn" onclick="addEpisodeModal(${season.id}, ${contentId}, '${escapeHtml(seriesTitle)}')"><i class="fa-solid fa-plus"></i> Add Episode</button>
                            <button class="btn-logout" style="border-color:var(--danger); color:var(--danger); padding:4px 10px;" onclick="deleteSeason(${season.id}, ${contentId}, '${escapeHtml(seriesTitle)}')"><i class="fa-solid fa-trash"></i> Delete Season</button>
                        </div>
                    </div>
                    <div id="episodes-container-${season.id}">
                        Loading episodes...
                    </div>
                </div>
            `;
        });
    }

    const bodyHtml = `
        <div style="margin-bottom:20px; font-weight:500; display:flex; justify-content:space-between; align-items:center;">
            <span>Series: <span style="color:var(--primary)">${seriesTitle}</span></span>
            <button class="btn-primary" onclick="addSeasonModal(${contentId}, '${escapeHtml(seriesTitle)}')"><i class="fa-solid fa-plus"></i> Create Season</button>
        </div>
        <div class="tab-sub-navigation" id="seasons-tabs" style="margin-bottom:15px;">
            ${seasonsTabsHtml}
        </div>
        <div id="seasons-panels" style="min-height:200px;">
            ${seasonsContentHtml}
        </div>
    `;
    showModal('Manage Seasons & Episodes', bodyHtml);

    // Setup tab listeners for season panels
    const tabContainer = document.getElementById('seasons-tabs');
    if (tabContainer) {
        tabContainer.addEventListener('click', (e) => {
            const tabBtn = e.target.closest('.sub-nav-item');
            if (!tabBtn) return;
            document.querySelectorAll('#seasons-tabs .sub-nav-item').forEach(btn => btn.classList.remove('active'));
            tabBtn.classList.add('active');

            const seasonId = tabBtn.dataset.seasonId;
            document.querySelectorAll('#seasons-panels .season-ep-panel').forEach(panel => {
                panel.style.display = 'none';
            });
            const targetPanel = document.getElementById(`season-panel-${seasonId}`);
            if (targetPanel) targetPanel.style.display = 'block';
        });
    }

    // Load episodes for each season
    if (seasons && seasons.length > 0) {
        seasons.forEach(s => loadEpisodesForSeason(s.id));
    }
}

async function loadEpisodesForSeason(seasonId) {
    const container = document.getElementById(`episodes-container-${seasonId}`);
    if (!container) return;

    try {
        const { data: episodes, error } = await _supabase.from('episodes').select('*').eq('season_id', seasonId).order('number', { ascending: true });
        if (error) throw error;

        if (!episodes || episodes.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:15px; color:var(--text-muted); font-size:0.85rem;">No episodes added yet.</div>`;
            return;
        }

        let html = '';
        episodes.forEach(ep => {
            html += `
                <div style="background:rgba(0,0,0,0.15); border:1px solid var(--border-color); border-radius:10px; padding:12px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:15px;">
                        <img src="${ep.thumbnail || ''}" style="width:60px; height:45px; object-fit:cover; border-radius:6px;" onerror="this.src='./assets/img/placeholder-image.png'">
                        <div>
                            <strong>Ep ${ep.number}: ${escapeHtml(ep.title)}</strong>
                            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">Duration: ${escapeHtml(ep.duration)} | Views: ${ep.total_view || 0}</div>
                        </div>
                    </div>
                    <div class="action-btns">
                        <button class="btn-icon" title="Episode Video Sources" onclick="manageEpisodeSources(${ep.id}, '${escapeHtml(ep.title)}')"><i class="fa-solid fa-link"></i></button>
                        <button class="btn-icon" title="Episode Subtitles" onclick="manageEpisodeSubtitles(${ep.id}, '${escapeHtml(ep.title)}')"><i class="fa-solid fa-closed-captioning"></i></button>
                        <button class="btn-icon btn-icon-danger" onclick="deleteEpisode(${ep.id}, ${seasonId})"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (err) {
        container.innerHTML = `<div style="color:var(--danger)">Error loading episodes</div>`;
    }
}

function addSeasonModal(contentId, seriesTitle) {
    const parentModalTitle = modalTitle.textContent;
    const parentModalBody = modalBody.innerHTML;

    const bodyHtml = `
        <form id="add-season-form" style="display:flex; flex-direction:column; gap:15px;">
            <div class="form-group">
                <label>Season Title (e.g. Season 1)</label>
                <input type="text" id="new-season-title" placeholder="e.g. Season 1" required>
            </div>
            <div class="form-group">
                <label>Trailer URL (Optional)</label>
                <input type="text" id="new-season-trailer" placeholder="Youtube trailer or direct MP4 URL">
            </div>
            <div class="modal-actions">
                <button type="button" class="btn-secondary" id="cancel-season-btn">Back</button>
                <button type="submit" class="btn-primary">Create Season</button>
            </div>
        </form>
    `;
    showModal('Create New Season', bodyHtml);

    document.getElementById('cancel-season-btn').addEventListener('click', () => {
        showModal(parentModalTitle, parentModalBody);
        manageSeasons(contentId, seriesTitle);
    });

    document.getElementById('add-season-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const insertData = {
                content_id: contentId,
                title: document.getElementById('new-season-title').value,
                trailer_url: document.getElementById('new-season-trailer').value || null
            };

            const { error } = await _supabase.from('seasons').insert([insertData]);
            if (error) throw error;

            showModal(parentModalTitle, parentModalBody);
            manageSeasons(contentId, seriesTitle);
        } catch (err) {
            alert('Error creating season: ' + err.message);
            submitBtn.disabled = false;
        }
    });
}

async function deleteSeason(seasonId, contentId, seriesTitle) {
    if (!confirm('Are you sure you want to delete this season? This will permanently delete all episodes, sources, and subtitles inside it!')) return;
    
    try {
        const { data: episodes } = await _supabase.from('episodes').select('id').eq('season_id', seasonId);
        if (episodes && episodes.length > 0) {
            for (const ep of episodes) {
                await _supabase.from('episode_sources').delete().eq('episode_id', ep.id);
                await _supabase.from('episode_subtitles').delete().eq('episode_id', ep.id);
            }
            await _supabase.from('episodes').delete().eq('season_id', seasonId);
        }
        await _supabase.from('seasons').delete().eq('id', seasonId);
        manageSeasons(contentId, seriesTitle);
    } catch (e) {
        alert('Error: ' + e.message);
    }
}

function addEpisodeModal(seasonId, contentId, seriesTitle) {
    const parentModalTitle = modalTitle.textContent;
    const parentModalBody = modalBody.innerHTML;

    const bodyHtml = `
        <form id="add-episode-form" class="form-grid-2">
            <div class="form-group">
                <label>Episode Number</label>
                <input type="number" id="ep-number" min="1" value="1" required>
            </div>
            <div class="form-group">
                <label>Episode Title</label>
                <input type="text" id="ep-title" placeholder="Episode Title" required>
            </div>
            <div class="form-group">
                <label>Duration / Runtime (e.g. 45m)</label>
                <input type="text" id="ep-duration" placeholder="e.g. 45m" required>
            </div>
            <div class="form-group">
                <label>Thumbnail Image</label>
                <input type="file" id="ep-thumbnail" accept="image/*" required>
            </div>
            <div class="form-group form-group-full">
                <label>Episode Description</label>
                <textarea id="ep-description" rows="3" placeholder="Enter description..." required></textarea>
            </div>
            <div class="modal-actions form-group-full">
                <button type="button" class="btn-secondary" id="cancel-ep-btn">Back</button>
                <button type="submit" class="btn-primary">Save Episode</button>
            </div>
        </form>
    `;
    showModal('Add Episode', bodyHtml);

    document.getElementById('cancel-ep-btn').addEventListener('click', () => {
        showModal(parentModalTitle, parentModalBody);
        manageSeasons(contentId, seriesTitle);
    });

    document.getElementById('add-episode-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const thumbnailUrl = await uploadToSupabase(document.getElementById('ep-thumbnail'), 'episodes');
            if (!thumbnailUrl) throw new Error("Thumbnail upload failed.");

            const insertData = {
                season_id: seasonId,
                number: parseInt(document.getElementById('ep-number').value),
                title: document.getElementById('ep-title').value,
                duration: document.getElementById('ep-duration').value,
                description: document.getElementById('ep-description').value,
                thumbnail: thumbnailUrl,
                total_view: 0,
                total_download: 0
            };

            const { error } = await _supabase.from('episodes').insert([insertData]);
            if (error) throw error;

            showModal(parentModalTitle, parentModalBody);
            manageSeasons(contentId, seriesTitle);
        } catch (err) {
            alert('Error adding episode: ' + err.message);
            submitBtn.disabled = false;
        }
    });
}

async function deleteEpisode(episodeId, seasonId) {
    if (!confirm('Are you sure you want to delete this episode?')) return;
    
    try {
        await _supabase.from('episode_sources').delete().eq('episode_id', episodeId);
        await _supabase.from('episode_subtitles').delete().eq('episode_id', episodeId);
        await _supabase.from('episodes').delete().eq('id', episodeId);
        loadEpisodesForSeason(seasonId);
    } catch (e) {
        alert('Error: ' + e.message);
    }
}

// ==========================================
// EPISODE VIDEO SOURCES & SUBTITLES
// ==========================================
async function manageEpisodeSources(episodeId, epTitle) {
    const loadEpSourcesList = async () => {
        const { data: sources, error } = await _supabase.from('episode_sources').select('*').eq('episode_id', episodeId).order('id', { ascending: true });
        if (error) return 'Error loading sources';
        
        let html = '';
        if (!sources || sources.length === 0) {
            html = '<div style="text-align:center; padding:15px; color:var(--text-muted);">No video sources linked.</div>';
        } else {
            sources.forEach(src => {
                html += `
                    <div style="background:rgba(0,0,0,0.2); border:1px solid var(--border-color); border-radius:10px; padding:12px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <strong>${escapeHtml(src.title)}</strong> (${escapeHtml(src.quality)})
                            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px; word-break:break-all;">${escapeHtml(src.source)}</div>
                        </div>
                        <div class="action-btns">
                            <button class="btn-icon btn-icon-danger" onclick="deleteEpSource(${src.id}, ${episodeId}, '${escapeHtml(epTitle)}')"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                `;
            });
        }
        return html;
    };

    const epSourcesHtml = await loadEpSourcesList();

    const bodyHtml = `
        <div style="margin-bottom:20px; font-weight:500;">Sources for: <span style="color:var(--primary)">${epTitle}</span></div>
        <div id="epsources-list-container" style="max-height:250px; overflow-y:auto; margin-bottom:20px; border-bottom:1px solid var(--border-color); padding-bottom:15px;">
            ${epSourcesHtml}
        </div>
        <form id="add-epsource-form" style="display:flex; flex-direction:column; gap:15px; border-top:1px solid var(--border-color); padding-top:15px;">
            <h4>Add Episode Source</h4>
            <div class="form-grid-2">
                <div class="form-group">
                    <label>Title (Server Name)</label>
                    <input type="text" id="epsrc-title" placeholder="Server Name" required>
                </div>
                <div class="form-group">
                    <label>Quality (e.g. 720p)</label>
                    <input type="text" id="epsrc-quality" placeholder="e.g. 720p" required>
                </div>
                <div class="form-group">
                    <label>Access Type</label>
                    <select id="epsrc-access">
                        <option value="0">Free</option>
                        <option value="1">Premium</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Source Video link / Embed URL</label>
                    <input type="text" id="epsrc-source" placeholder="Video URL (m3u8, mp4, etc.)" required>
                </div>
            </div>
            <div style="display:flex; justify-content:flex-end;">
                <button type="submit" class="btn-primary"><i class="fa-solid fa-plus"></i> Add Source</button>
            </div>
        </form>
    `;
    showModal('Episode Video Sources', bodyHtml);

    document.getElementById('add-epsource-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const insertData = {
                episode_id: episodeId,
                title: document.getElementById('epsrc-title').value,
                quality: document.getElementById('epsrc-quality').value,
                access_type: parseInt(document.getElementById('epsrc-access').value),
                source: document.getElementById('epsrc-source').value,
                size: 'N/A',
                is_download: 0,
                type: 0
            };

            const { error } = await _supabase.from('episode_sources').insert([insertData]);
            if (error) throw error;
            
            manageEpisodeSources(episodeId, epTitle);
        } catch (err) {
            alert('Error adding source: ' + err.message);
            submitBtn.disabled = false;
        }
    });
}

async function deleteEpSource(id, episodeId, epTitle) {
    if (!confirm('Are you sure you want to delete this source?')) return;
    const { error } = await _supabase.from('episode_sources').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else manageEpisodeSources(episodeId, epTitle);
}

async function manageEpisodeSubtitles(episodeId, epTitle) {
    const loadEpSubsList = async () => {
        const { data: subs, error } = await _supabase.from('episode_subtitles').select('*').eq('episode_id', episodeId).order('id', { ascending: true });
        if (error) return 'Error loading subtitles';
        
        let html = '';
        if (!subs || subs.length === 0) {
            html = '<div style="text-align:center; padding:15px; color:var(--text-muted);">No subtitles linked.</div>';
        } else {
            subs.forEach(sub => {
                const langName = cachedLanguages.find(l => l.id == sub.language_id)?.title || 'Unknown';
                html += `
                    <div style="background:rgba(0,0,0,0.2); border:1px solid var(--border-color); border-radius:10px; padding:12px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <strong>${langName} Subtitle</strong>
                            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px; word-break:break-all;">File: ${escapeHtml(sub.file)}</div>
                        </div>
                        <div class="action-btns">
                            <button class="btn-icon btn-icon-danger" onclick="deleteEpSubtitle(${sub.id}, ${episodeId}, '${escapeHtml(epTitle)}')"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                `;
            });
        }
        return html;
    };

    const epSubsHtml = await loadEpSubsList();

    const bodyHtml = `
        <div style="margin-bottom:20px; font-weight:500;">Subtitles for: <span style="color:var(--primary)">${epTitle}</span></div>
        <div id="epsubs-list-container" style="max-height:250px; overflow-y:auto; margin-bottom:20px; border-bottom:1px solid var(--border-color); padding-bottom:15px;">
            ${epSubsHtml}
        </div>
        <form id="add-epsubtitle-form" style="display:flex; flex-direction:column; gap:15px; border-top:1px solid var(--border-color); padding-top:15px;">
            <h4>Add Subtitle File</h4>
            <div class="form-grid-2">
                <div class="form-group">
                    <label>Language</label>
                    <select id="epsub-language" required>
                        ${cachedLanguages.map(l => `<option value="${l.id}">${l.title}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Subtitle File (.srt or .vtt)</label>
                    <input type="file" id="epsub-file" accept=".srt,.vtt" required>
                </div>
            </div>
            <div style="display:flex; justify-content:flex-end;">
                <button type="submit" class="btn-primary"><i class="fa-solid fa-plus"></i> Add Subtitle</button>
            </div>
        </form>
    `;
    showModal('Episode Subtitles', bodyHtml);

    document.getElementById('add-epsubtitle-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const subFileUrl = await uploadToSupabase(document.getElementById('epsub-file'), 'subtitles');
            if (!subFileUrl) throw new Error("File upload failed.");

            const insertData = {
                episode_id: episodeId,
                language_id: parseInt(document.getElementById('epsub-language').value),
                file: subFileUrl
            };

            const { error } = await _supabase.from('episode_subtitles').insert([insertData]);
            if (error) throw error;
            
            manageEpisodeSubtitles(episodeId, epTitle);
        } catch (err) {
            alert('Error adding subtitle: ' + err.message);
            submitBtn.disabled = false;
        }
    });
}

async function deleteEpSubtitle(id, episodeId, epTitle) {
    if (!confirm('Are you sure you want to delete this subtitle?')) return;
    const { error } = await _supabase.from('episode_subtitles').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else manageEpisodeSubtitles(episodeId, epTitle);
}

// ==========================================
// SECTION 2: GENRES MANAGEMENT
// ==========================================
async function loadGenres() {
    const listContainer = document.getElementById('genres-list');
    listContainer.innerHTML = `<tr><td colspan="3" style="text-align:center;">Loading genres...</td></tr>`;

    try {
        const { data, error } = await _supabase.from('genres').select('*').order('id', { ascending: false });
        if (error) throw error;

        if (!data || data.length === 0) {
            listContainer.innerHTML = `<tr><td colspan="3" style="text-align:center;">No genres found.</td></tr>`;
            return;
        }

        listContainer.innerHTML = '';
        data.forEach(genre => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${genre.id}</td>
                <td><strong>${escapeHtml(genre.title)}</strong></td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon" title="Edit Genre" onclick="editGenreModal(${genre.id}, '${escapeHtml(genre.title)}')"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-icon btn-icon-danger" title="Delete Genre" onclick="deleteGenre(${genre.id})"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            `;
            listContainer.appendChild(row);
        });

        // Set action button
        tabActions.innerHTML = `<button class="btn-primary" id="btn-add-genre-action"><i class="fa-solid fa-plus"></i> Add Genre</button>`;
        document.getElementById('btn-add-genre-action').addEventListener('click', () => addGenreModal());
    } catch (e) {
        listContainer.innerHTML = `<tr><td colspan="3" style="text-align:center;color:var(--danger)">Error: ${e.message}</td></tr>`;
    }
}

function addGenreModal() {
    const bodyHtml = `
        <form id="genre-form" style="display:flex; flex-direction:column; gap:15px;">
            <div class="form-group">
                <label>Genre Title</label>
                <input type="text" id="genre-title" placeholder="Genre Title" required>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn-primary">Add Genre</button>
            </div>
        </form>
    `;
    showModal('Add Genre', bodyHtml);

    document.getElementById('genre-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const { error } = await _supabase.from('genres').insert([{ title: document.getElementById('genre-title').value }]);
        if (error) alert('Error: ' + error.message);
        else {
            hideModal();
            loadGenres();
            loadGlobalCache();
        }
    });
}

function editGenreModal(id, currentTitle) {
    const bodyHtml = `
        <form id="edit-genre-form" style="display:flex; flex-direction:column; gap:15px;">
            <div class="form-group">
                <label>Genre Title</label>
                <input type="text" id="edit-genre-title" value="${currentTitle}" required>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn-primary">Update Genre</button>
            </div>
        </form>
    `;
    showModal('Edit Genre', bodyHtml);

    document.getElementById('edit-genre-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const { error } = await _supabase.from('genres').update({ title: document.getElementById('edit-genre-title').value }).eq('id', id);
        if (error) alert('Error: ' + error.message);
        else {
            hideModal();
            loadGenres();
            loadGlobalCache();
        }
    });
}

async function deleteGenre(id) {
    if (!confirm('Are you sure you want to delete this genre?')) return;
    const { error } = await _supabase.from('genres').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else {
        loadGenres();
        loadGlobalCache();
    }
}

// ==========================================
// SECTION 3: LANGUAGES MANAGEMENT
// ==========================================
async function loadLanguages() {
    const listContainer = document.getElementById('languages-list');
    listContainer.innerHTML = `<tr><td colspan="4" style="text-align:center;">Loading languages...</td></tr>`;

    try {
        const { data, error } = await _supabase.from('languages').select('*').order('id', { ascending: false });
        if (error) throw error;

        if (!data || data.length === 0) {
            listContainer.innerHTML = `<tr><td colspan="4" style="text-align:center;">No VJ / languages found.</td></tr>`;
            return;
        }

        listContainer.innerHTML = '';
        data.forEach(lang => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${lang.id}</td>
                <td><strong>${escapeHtml(lang.title)}</strong></td>
                <td><code style="background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px;">${escapeHtml(lang.code)}</code></td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon" title="Edit Language" onclick="editLanguageModal(${lang.id}, '${escapeHtml(lang.title)}', '${escapeHtml(lang.code)}')"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-icon btn-icon-danger" title="Delete Language" onclick="deleteLanguage(${lang.id})"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            `;
            listContainer.appendChild(row);
        });

        // Set action button
        tabActions.innerHTML = `<button class="btn-primary" id="btn-add-language-action"><i class="fa-solid fa-plus"></i> Add Language</button>`;
        document.getElementById('btn-add-language-action').addEventListener('click', () => addLanguageModal());
    } catch (e) {
        listContainer.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--danger)">Error: ${e.message}</td></tr>`;
    }
}

function addLanguageModal() {
    const bodyHtml = `
        <form id="lang-form" style="display:flex; flex-direction:column; gap:15px;">
            <div class="form-group">
                <label>Language / VJ Name (e.g. VJ Junior)</label>
                <input type="text" id="lang-title" placeholder="Language / VJ Name" required>
            </div>
            <div class="form-group">
                <label>Language Code (e.g. en, ug)</label>
                <input type="text" id="lang-code" placeholder="Code" required>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn-primary">Add Language</button>
            </div>
        </form>
    `;
    showModal('Add Language', bodyHtml);

    document.getElementById('lang-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const { error } = await _supabase.from('languages').insert([{ 
            title: document.getElementById('lang-title').value,
            code: document.getElementById('lang-code').value
        }]);
        if (error) alert('Error: ' + error.message);
        else {
            hideModal();
            loadLanguages();
            loadGlobalCache();
        }
    });
}

function editLanguageModal(id, currentTitle, currentCode) {
    const bodyHtml = `
        <form id="edit-lang-form" style="display:flex; flex-direction:column; gap:15px;">
            <div class="form-group">
                <label>Language / VJ Name</label>
                <input type="text" id="edit-lang-title" value="${currentTitle}" required>
            </div>
            <div class="form-group">
                <label>Language Code</label>
                <input type="text" id="edit-lang-code" value="${currentCode}" required>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn-primary">Update Language</button>
            </div>
        </form>
    `;
    showModal('Edit Language', bodyHtml);

    document.getElementById('edit-lang-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const { error } = await _supabase.from('languages').update({ 
            title: document.getElementById('edit-lang-title').value,
            code: document.getElementById('edit-lang-code').value
        }).eq('id', id);
        if (error) alert('Error: ' + error.message);
        else {
            hideModal();
            loadLanguages();
            loadGlobalCache();
        }
    });
}

async function deleteLanguage(id) {
    if (!confirm('Are you sure you want to delete this language/VJ?')) return;
    const { error } = await _supabase.from('languages').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else {
        loadLanguages();
        loadGlobalCache();
    }
}

// ==========================================
// SECTION 4: ACTORS MANAGEMENT
// ==========================================
async function loadActors() {
    const listContainer = document.getElementById('actors-list');
    listContainer.innerHTML = `<tr><td colspan="5" style="text-align:center;">Loading actors...</td></tr>`;

    try {
        const { data, error } = await _supabase.from('actors').select('*').order('id', { ascending: false });
        if (error) throw error;

        if (!data || data.length === 0) {
            listContainer.innerHTML = `<tr><td colspan="5" style="text-align:center;">No actors found.</td></tr>`;
            return;
        }

        listContainer.innerHTML = '';
        data.forEach(actor => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><img src="${actor.profile_image || ''}" class="table-avatar" onerror="this.src='./assets/img/placeholder-image.png'"></td>
                <td><strong>${escapeHtml(actor.fullname)}</strong></td>
                <td>${escapeHtml(actor.dob)}</td>
                <td style="max-width:300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(actor.bio)}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon" title="Edit Actor" onclick="editActorModal(${actor.id})"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-icon btn-icon-danger" title="Delete Actor" onclick="deleteActor(${actor.id})"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            `;
            listContainer.appendChild(row);
        });

        // Set action button
        tabActions.innerHTML = `<button class="btn-primary" id="btn-add-actor-action"><i class="fa-solid fa-plus"></i> Add Actor</button>`;
        document.getElementById('btn-add-actor-action').addEventListener('click', () => addActorModal());
    } catch (e) {
        listContainer.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--danger)">Error: ${e.message}</td></tr>`;
    }
}

function addActorModal() {
    const bodyHtml = `
        <form id="actor-form" class="form-grid-2">
            <div class="form-group">
                <label>Full Name</label>
                <input type="text" id="actor-fullname" placeholder="Actor Name" required>
            </div>
            <div class="form-group">
                <label>Date of Birth (e.g. 1985-05-12)</label>
                <input type="text" id="actor-dob" placeholder="YYYY-MM-DD" required>
            </div>
            <div class="form-group form-group-full">
                <label>Profile Image</label>
                <input type="file" id="actor-image" accept="image/*" required>
            </div>
            <div class="form-group form-group-full">
                <label>Biography</label>
                <textarea id="actor-bio" rows="4" placeholder="Actor details biography..." required></textarea>
            </div>
            <div class="modal-actions form-group-full">
                <button type="button" class="btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn-primary">Add Actor</button>
            </div>
        </form>
    `;
    showModal('Add Actor', bodyHtml);

    document.getElementById('actor-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const imgUrl = await uploadToSupabase(document.getElementById('actor-image'), 'actors');
            if (!imgUrl) throw new Error("Image upload failed.");

            const insertData = {
                fullname: document.getElementById('actor-fullname').value,
                dob: document.getElementById('actor-dob').value,
                bio: document.getElementById('actor-bio').value,
                profile_image: imgUrl
            };

            const { error } = await _supabase.from('actors').insert([insertData]);
            if (error) throw error;

            hideModal();
            loadActors();
            loadGlobalCache();
        } catch (err) {
            alert('Error adding actor: ' + err.message);
            submitBtn.disabled = false;
        }
    });
}

async function editActorModal(id) {
    const { data: actor, error } = await _supabase.from('actors').select('*').eq('id', id).single();
    if (error || !actor) {
        alert('Error loading actor details');
        return;
    }

    const bodyHtml = `
        <form id="edit-actor-form" class="form-grid-2">
            <div class="form-group">
                <label>Full Name</label>
                <input type="text" id="edit-actor-fullname" value="${escapeHtml(actor.fullname)}" required>
            </div>
            <div class="form-group">
                <label>Date of Birth</label>
                <input type="text" id="edit-actor-dob" value="${escapeHtml(actor.dob)}" required>
            </div>
            <div class="form-group form-group-full">
                <label>Profile Image</label>
                <div class="image-preview-container">
                    <div class="image-preview-box"><img src="${actor.profile_image || ''}" onerror="this.src='./assets/img/placeholder-image.png'"></div>
                    <input type="file" id="edit-actor-image" accept="image/*">
                </div>
            </div>
            <div class="form-group form-group-full">
                <label>Biography</label>
                <textarea id="edit-actor-bio" rows="4" required>${escapeHtml(actor.bio)}</textarea>
            </div>
            <div class="modal-actions form-group-full">
                <button type="button" class="btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn-primary">Update Actor</button>
            </div>
        </form>
    `;
    showModal(`Edit Actor: ${actor.fullname}`, bodyHtml);

    document.getElementById('edit-actor-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const imgUrl = await uploadToSupabase(document.getElementById('edit-actor-image'), 'actors') || actor.profile_image;

            const updateData = {
                fullname: document.getElementById('edit-actor-fullname').value,
                dob: document.getElementById('edit-actor-dob').value,
                bio: document.getElementById('edit-actor-bio').value,
                profile_image: imgUrl
            };

            const { error: errUp } = await _supabase.from('actors').update(updateData).eq('id', id);
            if (errUp) throw errUp;

            hideModal();
            loadActors();
            loadGlobalCache();
        } catch (err) {
            alert('Error updating actor: ' + err.message);
            submitBtn.disabled = false;
        }
    });
}

async function deleteActor(id) {
    if (!confirm('Are you sure you want to delete this actor?')) return;
    const { error } = await _supabase.from('actors').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else {
        loadActors();
        loadGlobalCache();
    }
}

// ==========================================
// SECTION 5: LIVE TV (CHANNELS & CATEGORIES)
// ==========================================
async function loadTVChannels() {
    const listContainer = document.getElementById('tvchannels-list');
    listContainer.innerHTML = `<tr><td colspan="7" style="text-align:center;">Loading channels...</td></tr>`;

    try {
        const { data: channels, error } = await _supabase.from('tv_channels').select('*').order('id', { ascending: false });
        const { data: categories } = await _supabase.from('tv_categories').select('*');
        
        if (error) throw error;

        if (!channels || channels.length === 0) {
            listContainer.innerHTML = `<tr><td colspan="7" style="text-align:center;">No Live TV channels linked yet.</td></tr>`;
            return;
        }

        listContainer.innerHTML = '';
        channels.forEach(ch => {
            const row = document.createElement('tr');
            
            const catNames = ch.category_ids 
                ? ch.category_ids.split(',').map(id => categories?.find(c => c.id == id)?.title || id).join(', ') 
                : 'None';
                
            const streamType = ch.type === 1 ? 'Youtube ID' : 'M3U8 Stream';

            row.innerHTML = `
                <td><img src="${ch.thumbnail || ''}" style="width:40px; height:40px; border-radius:6px; object-fit:cover;" onerror="this.src='./assets/img/placeholder-image.png'"></td>
                <td><strong>${escapeHtml(ch.title)}</strong></td>
                <td>${catNames}</td>
                <td><span class="badge badge-movie">${streamType}</span></td>
                <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"><code>${escapeHtml(ch.source)}</code></td>
                <td>${ch.total_view || 0}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon" title="Edit Channel" onclick="editTVChannelModal(${ch.id})"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-icon btn-icon-danger" title="Delete Channel" onclick="deleteTVChannel(${ch.id})"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            `;
            listContainer.appendChild(row);
        });

        // Set action button
        tabActions.innerHTML = `<button class="btn-primary" id="btn-add-tvchannel-action"><i class="fa-solid fa-plus"></i> Add Channel</button>`;
        document.getElementById('btn-add-tvchannel-action').addEventListener('click', () => addTVChannelModal());
    } catch (e) {
        listContainer.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--danger)">Error: ${e.message}</td></tr>`;
    }
}

async function addTVChannelModal() {
    const { data: categories } = await _supabase.from('tv_categories').select('*');

    const getCategoriesCheckboxes = () => {
        let html = '';
        categories?.forEach(cat => {
            html += `
                <label style="display:inline-flex; align-items:center; gap:8px; margin: 5px 15px 5px 0; cursor:pointer;">
                    <input type="checkbox" name="tv_categories_checkbox" value="${cat.id}">
                    <span>${cat.title}</span>
                </label>
            `;
        });
        return html || 'No categories available.';
    };

    const bodyHtml = `
        <form id="tv-channel-form" class="form-grid-2">
            <div class="form-group">
                <label>Channel Name</label>
                <input type="text" id="ch-title" placeholder="Channel Name" required>
            </div>
            <div class="form-group">
                <label>Stream Type</label>
                <select id="ch-type">
                    <option value="0">M3U8 Stream URL</option>
                    <option value="1">Youtube Video ID</option>
                </select>
            </div>
            <div class="form-group form-group-full">
                <label>Stream Source (Link or Youtube ID)</label>
                <input type="text" id="ch-source" placeholder="Stream Link / ID" required>
            </div>
            <div class="form-group form-group-full">
                <label>Category Placements</label>
                <div style="background:rgba(0,0,0,0.2); padding:10px; border-radius:10px; border:1px solid var(--border-color)">
                    ${getCategoriesCheckboxes()}
                </div>
            </div>
            <div class="form-group">
                <label>Access Type</label>
                <select id="ch-access">
                    <option value="0">Free</option>
                    <option value="1">Premium</option>
                </select>
            </div>
            <div class="form-group">
                <label>Thumbnail Image</label>
                <input type="file" id="ch-thumbnail" accept="image/*" required>
            </div>
            <div class="modal-actions form-group-full">
                <button type="button" class="btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn-primary">Add Channel</button>
            </div>
        </form>
    `;
    showModal('Add TV Channel', bodyHtml);

    document.getElementById('tv-channel-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const thumbUrl = await uploadToSupabase(document.getElementById('ch-thumbnail'), 'livetv');
            if (!thumbUrl) throw new Error("Thumbnail upload failed.");

            const catsSelected = Array.from(document.querySelectorAll('input[name="tv_categories_checkbox"]:checked')).map(el => el.value).join(',');

            const insertData = {
                title: document.getElementById('ch-title').value,
                source: document.getElementById('ch-source').value,
                type: parseInt(document.getElementById('ch-type').value),
                access_type: parseInt(document.getElementById('ch-access').value),
                category_ids: catsSelected,
                thumbnail: thumbUrl,
                total_view: 0,
                total_share: 0
            };

            const { error } = await _supabase.from('tv_channels').insert([insertData]);
            if (error) throw error;

            hideModal();
            loadTVChannels();
        } catch (err) {
            alert('Error adding TV channel: ' + err.message);
            submitBtn.disabled = false;
        }
    });
}

async function editTVChannelModal(id) {
    const { data: ch, error } = await _supabase.from('tv_channels').select('*').eq('id', id).single();
    const { data: categories } = await _supabase.from('tv_categories').select('*');
    if (error || !ch) {
        alert('Error loading channel details');
        return;
    }

    const selectedCats = ch.category_ids ? ch.category_ids.split(',') : [];

    const getCategoriesCheckboxes = () => {
        let html = '';
        categories?.forEach(cat => {
            const checked = selectedCats.includes(cat.id.toString()) ? 'checked' : '';
            html += `
                <label style="display:inline-flex; align-items:center; gap:8px; margin: 5px 15px 5px 0; cursor:pointer;">
                    <input type="checkbox" name="tv_categories_checkbox" value="${cat.id}" ${checked}>
                    <span>${cat.title}</span>
                </label>
            `;
        });
        return html || 'No categories available.';
    };

    const bodyHtml = `
        <form id="edit-tv-channel-form" class="form-grid-2">
            <div class="form-group">
                <label>Channel Name</label>
                <input type="text" id="edit-ch-title" value="${escapeHtml(ch.title)}" required>
            </div>
            <div class="form-group">
                <label>Stream Type</label>
                <select id="edit-ch-type">
                    <option value="0" ${ch.type === 0 ? 'selected' : ''}>M3U8 Stream URL</option>
                    <option value="1" ${ch.type === 1 ? 'selected' : ''}>Youtube Video ID</option>
                </select>
            </div>
            <div class="form-group form-group-full">
                <label>Stream Source (Link or Youtube ID)</label>
                <input type="text" id="edit-ch-source" value="${escapeHtml(ch.source)}" required>
            </div>
            <div class="form-group form-group-full">
                <label>Category Placements</label>
                <div style="background:rgba(0,0,0,0.2); padding:10px; border-radius:10px; border:1px solid var(--border-color)">
                    ${getCategoriesCheckboxes()}
                </div>
            </div>
            <div class="form-group">
                <label>Access Type</label>
                <select id="edit-ch-access">
                    <option value="0" ${ch.access_type === 0 ? 'selected' : ''}>Free</option>
                    <option value="1" ${ch.access_type === 1 ? 'selected' : ''}>Premium</option>
                </select>
            </div>
            <div class="form-group">
                <label>Thumbnail Image</label>
                <div class="image-preview-container">
                    <div class="image-preview-box"><img src="${ch.thumbnail || ''}" onerror="this.src='./assets/img/placeholder-image.png'"></div>
                    <input type="file" id="edit-ch-thumbnail" accept="image/*">
                </div>
            </div>
            <div class="modal-actions form-group-full">
                <button type="button" class="btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn-primary">Update Channel</button>
            </div>
        </form>
    `;
    showModal(`Edit Channel: ${ch.title}`, bodyHtml);

    document.getElementById('edit-tv-channel-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const thumbUrl = await uploadToSupabase(document.getElementById('edit-ch-thumbnail'), 'livetv') || ch.thumbnail;

            const catsSelected = Array.from(document.querySelectorAll('input[name="tv_categories_checkbox"]:checked')).map(el => el.value).join(',');

            const updateData = {
                title: document.getElementById('edit-ch-title').value,
                source: document.getElementById('edit-ch-source').value,
                type: parseInt(document.getElementById('edit-ch-type').value),
                access_type: parseInt(document.getElementById('edit-ch-access').value),
                category_ids: catsSelected,
                thumbnail: thumbUrl,
                updated_at: new Date().toISOString()
            };

            const { error: errUp } = await _supabase.from('tv_channels').update(updateData).eq('id', id);
            if (errUp) throw errUp;

            hideModal();
            loadTVChannels();
        } catch (err) {
            alert('Error updating TV channel: ' + err.message);
            submitBtn.disabled = false;
        }
    });
}

async function deleteTVChannel(id) {
    if (!confirm('Are you sure you want to delete this TV channel?')) return;
    const { error } = await _supabase.from('tv_channels').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else loadTVChannels();
}

async function loadTVCategories() {
    const listContainer = document.getElementById('tvcategories-list');
    listContainer.innerHTML = `<tr><td colspan="3" style="text-align:center;">Loading categories...</td></tr>`;

    try {
        const { data, error } = await _supabase.from('tv_categories').select('*').order('id', { ascending: false });
        if (error) throw error;

        if (!data || data.length === 0) {
            listContainer.innerHTML = `<tr><td colspan="3" style="text-align:center;">No TV categories found.</td></tr>`;
            return;
        }

        listContainer.innerHTML = '';
        data.forEach(cat => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><img src="${cat.image || ''}" style="width:40px; height:40px; border-radius:6px; object-fit:cover;" onerror="this.src='./assets/img/placeholder-image.png'"></td>
                <td><strong>${escapeHtml(cat.title)}</strong></td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon" title="Edit Category" onclick="editTVCategoryModal(${cat.id})"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-icon btn-icon-danger" title="Delete Category" onclick="deleteTVCategory(${cat.id})"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            `;
            listContainer.appendChild(row);
        });

        // Set action button
        tabActions.innerHTML = `<button class="btn-primary" id="btn-add-tvcategory-action"><i class="fa-solid fa-plus"></i> Add Category</button>`;
        document.getElementById('btn-add-tvcategory-action').addEventListener('click', () => addTVCategoryModal());
    } catch (e) {
        listContainer.innerHTML = `<tr><td colspan="3" style="text-align:center;color:var(--danger)">Error: ${e.message}</td></tr>`;
    }
}

function addTVCategoryModal() {
    const bodyHtml = `
        <form id="tv-category-form" style="display:flex; flex-direction:column; gap:15px;">
            <div class="form-group">
                <label>Category Title</label>
                <input type="text" id="cat-title" placeholder="Category Title" required>
            </div>
            <div class="form-group">
                <label>Category Icon / Image</label>
                <input type="file" id="cat-image" accept="image/*" required>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn-primary">Add Category</button>
            </div>
        </form>
    `;
    showModal('Add TV Category', bodyHtml);

    document.getElementById('tv-category-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const imgUrl = await uploadToSupabase(document.getElementById('cat-image'), 'livetv');
            if (!imgUrl) throw new Error("Image upload failed.");

            const { error } = await _supabase.from('tv_categories').insert([{ 
                title: document.getElementById('cat-title').value,
                image: imgUrl
            }]);
            if (error) throw error;

            hideModal();
            loadTVCategories();
        } catch (err) {
            alert('Error adding TV category: ' + err.message);
            submitBtn.disabled = false;
        }
    });
}

async function editTVCategoryModal(id) {
    const { data: cat, error } = await _supabase.from('tv_categories').select('*').eq('id', id).single();
    if (error || !cat) {
        alert('Error loading category details');
        return;
    }

    const bodyHtml = `
        <form id="edit-tv-category-form" style="display:flex; flex-direction:column; gap:15px;">
            <div class="form-group">
                <label>Category Title</label>
                <input type="text" id="edit-cat-title" value="${escapeHtml(cat.title)}" required>
            </div>
            <div class="form-group">
                <label>Category Icon / Image</label>
                <div class="image-preview-container">
                    <div class="image-preview-box"><img src="${cat.image || ''}" onerror="this.src='./assets/img/placeholder-image.png'"></div>
                    <input type="file" id="edit-cat-image" accept="image/*">
                </div>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn-primary">Update Category</button>
            </div>
        </form>
    `;
    showModal(`Edit Category: ${cat.title}`, bodyHtml);

    document.getElementById('edit-tv-category-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const imgUrl = await uploadToSupabase(document.getElementById('edit-cat-image'), 'livetv') || cat.image;

            const { error: errUp } = await _supabase.from('tv_categories').update({ 
                title: document.getElementById('edit-cat-title').value,
                image: imgUrl
            }).eq('id', id);
            if (errUp) throw errUp;

            hideModal();
            loadTVCategories();
        } catch (err) {
            alert('Error updating TV category: ' + err.message);
            submitBtn.disabled = false;
        }
    });
}

async function deleteTVCategory(id) {
    if (!confirm('Are you sure you want to delete this TV category?')) return;
    const { error } = await _supabase.from('tv_categories').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else loadTVCategories();
}

// ==========================================
// SECTION 6: CUSTOM AD CAMPAIGNS
// ==========================================
async function loadAds() {
    const listContainer = document.getElementById('ads-list');
    listContainer.innerHTML = `<tr><td colspan="9" style="text-align:center;">Loading ads...</td></tr>`;

    try {
        const { data: ads, error } = await _supabase.from('custom_ads').select('*').order('id', { ascending: false });
        if (error) throw error;

        if (!ads || ads.length === 0) {
            listContainer.innerHTML = `<tr><td colspan="9" style="text-align:center;">No custom ad campaigns created yet.</td></tr>`;
            return;
        }

        listContainer.innerHTML = '';
        ads.forEach(ad => {
            const row = document.createElement('tr');
            
            const platforms = [];
            if (ad.is_android === 1) platforms.push('Android');
            if (ad.is_ios === 1) platforms.push('iOS');
            const platformText = platforms.join(', ') || 'None';

            row.innerHTML = `
                <td><img src="${ad.brand_logo || ''}" style="width:40px; height:40px; border-radius:6px; object-fit:cover;" onerror="this.src='./assets/img/placeholder-image.png'"></td>
                <td>
                    <strong>${escapeHtml(ad.title)}</strong>
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">Brand: ${escapeHtml(ad.brand_name)}</div>
                </td>
                <td>${platformText}</td>
                <td>${ad.start_date || 'Immediate'}</td>
                <td>${ad.end_date || 'No Expiry'}</td>
                <td>${ad.views || 0}</td>
                <td>${ad.clicks || 0}</td>
                <td>
                    <button class="table-toggle-btn ${ad.status === 1 ? 'active' : 'inactive'}" onclick="toggleAdStatus(${ad.id}, ${ad.status})">
                        <i class="fa-solid ${ad.status === 1 ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                    </button>
                </td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon" title="Manage Ad Media sources" onclick="manageAdSources(${ad.id}, '${escapeHtml(ad.title)}')"><i class="fa-solid fa-photo-film"></i></button>
                        <button class="btn-icon" title="Edit Ad Details" onclick="editAdModal(${ad.id})"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-icon btn-icon-danger" title="Delete Ad" onclick="deleteAd(${ad.id})"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            `;
            listContainer.appendChild(row);
        });

        // Set action button
        tabActions.innerHTML = `<button class="btn-primary" id="btn-add-ad-action"><i class="fa-solid fa-plus"></i> Add Campaign</button>`;
        document.getElementById('btn-add-ad-action').addEventListener('click', () => addAdModal());
    } catch (e) {
        listContainer.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--danger)">Error: ${e.message}</td></tr>`;
    }
}

async function toggleAdStatus(id, val) {
    const newVal = val === 1 ? 0 : 1;
    await _supabase.from('custom_ads').update({ status: newVal }).eq('id', id);
    loadAds();
}

function addAdModal() {
    const bodyHtml = `
        <form id="ad-form" class="form-grid-2">
            <div class="form-group">
                <label>Campaign Title</label>
                <input type="text" id="ad-title" placeholder="Ad Title" required>
            </div>
            <div class="form-group">
                <label>Brand / Advertiser Name</label>
                <input type="text" id="ad-brand-name" placeholder="Advertiser Name" required>
            </div>
            <div class="form-group">
                <label>Action Button Text (e.g. Install, Learn More)</label>
                <input type="text" id="ad-btn-text" placeholder="Call to Action Button" value="Learn More" required>
            </div>
            <div class="form-group">
                <label>Android Destination URL</label>
                <input type="text" id="ad-android-link" placeholder="Play Store link or Website link">
            </div>
            <div class="form-group">
                <label>iOS Destination URL</label>
                <input type="text" id="ad-ios-link" placeholder="App Store link or Website link">
            </div>
            <div class="form-group">
                <label>Brand Logo Image</label>
                <input type="file" id="ad-logo" accept="image/*" required>
            </div>
            <div class="form-group">
                <label>Start Date (Optional)</label>
                <input type="date" id="ad-start">
            </div>
            <div class="form-group">
                <label>End Date (Optional)</label>
                <input type="date" id="ad-end">
            </div>
            <div class="form-group toggle-group">
                <label>Target Android Platform</label>
                <input type="checkbox" id="ad-target-android" class="ios-toggle" checked>
            </div>
            <div class="form-group toggle-group">
                <label>Target iOS Platform</label>
                <input type="checkbox" id="ad-target-ios" class="ios-toggle">
            </div>
            <div class="modal-actions form-group-full">
                <button type="button" class="btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn-primary">Create Campaign</button>
            </div>
        </form>
    `;
    showModal('Add Custom Ad Campaign', bodyHtml);

    document.getElementById('ad-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const logoUrl = await uploadToSupabase(document.getElementById('ad-logo'), 'ads');
            if (!logoUrl) throw new Error("Logo upload failed.");

            const insertData = {
                title: document.getElementById('ad-title').value,
                brand_name: document.getElementById('ad-brand-name').value,
                button_text: document.getElementById('ad-btn-text').value,
                android_link: document.getElementById('ad-android-link').value || null,
                ios_link: document.getElementById('ad-ios-link').value || null,
                brand_logo: logoUrl,
                start_date: document.getElementById('ad-start').value || null,
                end_date: document.getElementById('ad-end').value || null,
                is_android: document.getElementById('ad-target-android').checked ? 1 : 0,
                is_ios: document.getElementById('ad-target-ios').checked ? 1 : 0,
                status: 1,
                views: 0,
                clicks: 0
            };

            const { error } = await _supabase.from('custom_ads').insert([insertData]);
            if (error) throw error;

            hideModal();
            loadAds();
        } catch (err) {
            alert('Error adding ad campaign: ' + err.message);
            submitBtn.disabled = false;
        }
    });
}

async function editAdModal(id) {
    const { data: ad, error } = await _supabase.from('custom_ads').select('*').eq('id', id).single();
    if (error || !ad) {
        alert('Error loading campaign details');
        return;
    }

    const bodyHtml = `
        <form id="edit-ad-form" class="form-grid-2">
            <div class="form-group">
                <label>Campaign Title</label>
                <input type="text" id="edit-ad-title" value="${escapeHtml(ad.title)}" required>
            </div>
            <div class="form-group">
                <label>Brand / Advertiser Name</label>
                <input type="text" id="edit-ad-brand-name" value="${escapeHtml(ad.brand_name)}" required>
            </div>
            <div class="form-group">
                <label>Action Button Text</label>
                <input type="text" id="edit-ad-btn-text" value="${escapeHtml(ad.button_text)}" required>
            </div>
            <div class="form-group">
                <label>Android Destination URL</label>
                <input type="text" id="edit-ad-android-link" value="${escapeHtml(ad.android_link || '')}">
            </div>
            <div class="form-group">
                <label>iOS Destination URL</label>
                <input type="text" id="edit-ad-ios-link" value="${escapeHtml(ad.ios_link || '')}">
            </div>
            <div class="form-group">
                <label>Brand Logo Image</label>
                <div class="image-preview-container">
                    <div class="image-preview-box"><img src="${ad.brand_logo || ''}" onerror="this.src='./assets/img/placeholder-image.png'"></div>
                    <input type="file" id="edit-ad-logo" accept="image/*">
                </div>
            </div>
            <div class="form-group">
                <label>Start Date</label>
                <input type="date" id="edit-ad-start" value="${ad.start_date || ''}">
            </div>
            <div class="form-group">
                <label>End Date</label>
                <input type="date" id="edit-ad-end" value="${ad.end_date || ''}">
            </div>
            <div class="form-group toggle-group">
                <label>Target Android Platform</label>
                <input type="checkbox" id="edit-ad-target-android" class="ios-toggle" ${ad.is_android === 1 ? 'checked' : ''}>
            </div>
            <div class="form-group toggle-group">
                <label>Target iOS Platform</label>
                <input type="checkbox" id="edit-ad-target-ios" class="ios-toggle" ${ad.is_ios === 1 ? 'checked' : ''}>
            </div>
            <div class="modal-actions form-group-full">
                <button type="button" class="btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn-primary">Update Campaign</button>
            </div>
        </form>
    `;
    showModal(`Edit Campaign: ${ad.title}`, bodyHtml);

    document.getElementById('edit-ad-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const logoUrl = await uploadToSupabase(document.getElementById('edit-ad-logo'), 'ads') || ad.brand_logo;

            const updateData = {
                title: document.getElementById('edit-ad-title').value,
                brand_name: document.getElementById('edit-ad-brand-name').value,
                button_text: document.getElementById('edit-ad-btn-text').value,
                android_link: document.getElementById('edit-ad-android-link').value || null,
                ios_link: document.getElementById('edit-ad-ios-link').value || null,
                brand_logo: logoUrl,
                start_date: document.getElementById('edit-ad-start').value || null,
                end_date: document.getElementById('edit-ad-end').value || null,
                is_android: document.getElementById('edit-ad-target-android').checked ? 1 : 0,
                is_ios: document.getElementById('edit-ad-target-ios').checked ? 1 : 0,
                updated_at: new Date().toISOString()
            };

            const { error: errUp } = await _supabase.from('custom_ads').update(updateData).eq('id', id);
            if (errUp) throw errUp;

            hideModal();
            loadAds();
        } catch (err) {
            alert('Error updating ad campaign: ' + err.message);
            submitBtn.disabled = false;
        }
    });
}

async function deleteAd(id) {
    if (!confirm('Are you sure you want to delete this ad campaign?')) return;
    try {
        await _supabase.from('custom_ad_sources').delete().eq('custom_ad_id', id);
        await _supabase.from('custom_ads').delete().eq('id', id);
        loadAds();
    } catch (e) {
        alert('Error: ' + e.message);
    }
}

// ==========================================
// AD MEDIA SOURCES
// ==========================================
async function manageAdSources(adCampaignId, campaignTitle) {
    const loadAdSourcesList = async () => {
        const { data: sources, error } = await _supabase.from('custom_ad_sources').select('*').eq('custom_ad_id', adCampaignId).order('id', { ascending: true });
        if (error) return 'Error loading ad sources';
        
        let html = '';
        if (!sources || sources.length === 0) {
            html = '<div style="text-align:center; padding:15px; color:var(--text-muted);">No ad media assets uploaded.</div>';
        } else {
            sources.forEach(src => {
                const mediaPreview = src.type === 0 
                    ? `<img src="${src.content}" style="width:50px; height:50px; border-radius:6px; object-fit:cover;">`
                    : `<div style="width:50px; height:50px; border-radius:6px; background:rgba(255,255,255,0.05); display:flex; justify-content:center; align-items:center;"><i class="fa-solid fa-video"></i></div>`;
                    
                html += `
                    <div style="background:rgba(0,0,0,0.2); border:1px solid var(--border-color); border-radius:10px; padding:12px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap:15px;">
                            ${mediaPreview}
                            <div>
                                <strong>${escapeHtml(src.headline)}</strong>
                                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">Type: ${src.type === 1 ? 'Video' : 'Banner Image'} | Skip time: ${src.show_time || 0}s</div>
                            </div>
                        </div>
                        <div class="action-btns">
                            <button class="btn-icon btn-icon-danger" onclick="deleteAdSource(${src.id}, ${adCampaignId}, '${escapeHtml(campaignTitle)}')"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                `;
            });
        }
        return html;
    };

    const adSourcesHtml = await loadAdSourcesList();

    const bodyHtml = `
        <div style="margin-bottom:20px; font-weight:500;">Assets for Campaign: <span style="color:var(--primary)">${campaignTitle}</span></div>
        <div id="adsources-list-container" style="max-height:250px; overflow-y:auto; margin-bottom:20px; border-bottom:1px solid var(--border-color); padding-bottom:15px;">
            ${adSourcesHtml}
        </div>
        <form id="add-adsource-form" style="display:flex; flex-direction:column; gap:15px; border-top:1px solid var(--border-color); padding-top:15px;">
            <h4>Add Ad Media Asset</h4>
            <div class="form-grid-2">
                <div class="form-group">
                    <label>Ad Type</label>
                    <select id="adsrc-type">
                        <option value="0">Banner Image Ad</option>
                        <option value="1">Video Interstitial Ad</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Ad Headline / Catchphrase</label>
                    <input type="text" id="adsrc-headline" placeholder="Ad Headline" required>
                </div>
                <div class="form-group">
                    <label>Skip Time (seconds)</label>
                    <input type="number" id="adsrc-skip-time" value="5" min="0" required>
                </div>
                <div class="form-group">
                    <label>Media File</label>
                    <input type="file" id="adsrc-file" accept="image/*,video/*" required>
                </div>
                <div class="form-group form-group-full">
                    <label>Short Description</label>
                    <input type="text" id="adsrc-desc" placeholder="Ad description text..." required>
                </div>
            </div>
            <div style="display:flex; justify-content:flex-end;">
                <button type="submit" class="btn-primary"><i class="fa-solid fa-plus"></i> Add Media Asset</button>
            </div>
        </form>
    `;
    showModal('Campaign Media Assets', bodyHtml);

    document.getElementById('add-adsource-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const adType = parseInt(document.getElementById('adsrc-type').value);
            const mediaUrl = await uploadToSupabase(document.getElementById('adsrc-file'), 'ads');
            if (!mediaUrl) throw new Error("Media asset upload failed.");

            const insertData = {
                custom_ad_id: adCampaignId,
                type: adType,
                content: mediaUrl,
                headline: document.getElementById('adsrc-headline').value,
                description: document.getElementById('adsrc-desc').value,
                show_time: parseInt(document.getElementById('adsrc-skip-time').value),
                is_skippable: 1
            };

            const { error } = await _supabase.from('custom_ad_sources').insert([insertData]);
            if (error) throw error;
            
            manageAdSources(adCampaignId, campaignTitle);
        } catch (err) {
            alert('Error adding asset: ' + err.message);
            submitBtn.disabled = false;
        }
    });
}

async function deleteAdSource(id, adCampaignId, campaignTitle) {
    if (!confirm('Are you sure you want to delete this media asset?')) return;
    const { error } = await _supabase.from('custom_ad_sources').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else manageAdSources(adCampaignId, campaignTitle);
}

// ==========================================
// SECTION 7: GLOBAL SETTINGS
// ==========================================
async function loadSettings() {
    const form = document.getElementById('settings-form');
    
    try {
        const { data: set, error } = await _supabase.from('global_settings').select('*').eq('id', 1).single();
        if (error || !set) {
            alert('Error loading configuration settings.');
            return;
        }

        document.getElementById('setting-app-name').value = set.app_name || '';
        document.getElementById('setting-live-tv-enable').checked = set.is_live_tv_enable === 1;
        document.getElementById('setting-ad-skip-time').value = set.videoad_skip_time || 5;
        document.getElementById('setting-custom-android').checked = set.is_custom_android === 1;
        document.getElementById('setting-custom-ios').checked = set.is_custom_ios === 1;
        document.getElementById('setting-admob-android').checked = set.is_admob_android === 1;
        document.getElementById('setting-admob-ios').checked = set.is_admob_ios === 1;

        // Form Submit
        form.onsubmit = async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('.save-settings-btn');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

            try {
                const updateData = {
                    app_name: document.getElementById('setting-app-name').value,
                    is_live_tv_enable: document.getElementById('setting-live-tv-enable').checked ? 1 : 0,
                    videoad_skip_time: parseInt(document.getElementById('setting-ad-skip-time').value),
                    is_custom_android: document.getElementById('setting-custom-android').checked ? 1 : 0,
                    is_custom_ios: document.getElementById('setting-custom-ios').checked ? 1 : 0,
                    is_admob_android: document.getElementById('setting-admob-android').checked ? 1 : 0,
                    is_admob_ios: document.getElementById('setting-admob-ios').checked ? 1 : 0,
                    updated_at: new Date().toISOString()
                };

                const { error: errUp } = await _supabase.from('global_settings').update(updateData).eq('id', 1);
                if (errUp) throw errUp;

                alert('Settings updated successfully!');
            } catch (err) {
                alert('Error updating configuration: ' + err.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Save Settings';
            }
        };
    } catch (e) {
        alert('Connection error loading configuration: ' + e.message);
    }
}

// ==========================================
// SECTION 8: USERS LIST
// ==========================================
async function loadUsers() {
    const listContainer = document.getElementById('users-list');
    listContainer.innerHTML = `<tr><td colspan="6" style="text-align:center;">Loading users...</td></tr>`;

    try {
        const { data, error } = await _supabase.from('users').select('*').order('id', { ascending: false });
        if (error) throw error;

        if (!data || data.length === 0) {
            listContainer.innerHTML = `<tr><td colspan="6" style="text-align:center;">No users registered yet.</td></tr>`;
            return;
        }

        listContainer.innerHTML = '';
        data.forEach(u => {
            const row = document.createElement('tr');
            
            const signupDate = u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A';
            const devicePlatform = u.device_type === 1 ? 'Android' : (u.device_type === 2 ? 'iOS' : 'Web/Email');

            row.innerHTML = `
                <td><img src="${u.profile_image || ''}" class="table-avatar" onerror="this.src='./assets/img/placeholder-image.png'"></td>
                <td><strong>${escapeHtml(u.fullname || 'Anonymous')}</strong></td>
                <td>${escapeHtml(u.email || 'N/A')}</td>
                <td><span class="badge badge-movie" style="text-transform:capitalize;">${escapeHtml(u.login_type || 'Email')}</span></td>
                <td>
                    <span style="font-weight:500;">${devicePlatform}</span>
                    <div style="font-size:0.7rem; color:var(--text-muted); max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(u.device_token || '')}">${escapeHtml(u.device_token || 'No Device Token')}</div>
                </td>
                <td>${signupDate}</td>
            `;
            listContainer.appendChild(row);
        });
    } catch (e) {
        listContainer.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--danger)">Error: ${e.message}</td></tr>`;
    }
}

// Utility: HTML Escaper to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, function(m) { return map[m]; });
}
