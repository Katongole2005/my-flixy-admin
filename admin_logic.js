// Supabase Credentials
const SUPABASE_URL = "https://izbnffyqvbbbggfzdibe.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6Ym5mZnlxdmJiYmdnZnpkaWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwMjA0MDMsImV4cCI6MjA5NzU5NjQwM30._xV3h067QE3pkSlWuGSCmt7ZmDIECkfxftwETuDMaCU";

const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// â”€â”€ Toast Notification Helpers â”€â”€
function toast(msg, type = 'success') {
    if (window.iziToast) {
        window.iziToast[type]({ message: msg, position: 'topRight', timeout: 3500 });
    } else {
        console.log(`[${type}] ${msg}`);
    }
}
function toastSuccess(msg) { toast(msg, 'success'); }
function toastError(msg) { toast(msg, 'error'); }
function toastInfo(msg) { toast(msg, 'info'); }

// State
let currentTab = 'index';
let cachedGenres = [];
let cachedLanguages = [];
let cachedActors = [];

// DOM Elements
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');

// Modal Elements (matching new index.html IDs)
const staticModal = document.getElementById('flixy-modal');
const staticModalTitle = document.getElementById('flixy-modal-title');
const staticModalBody = document.getElementById('flixy-modal-body');
const staticModalCloseBtn = document.getElementById('flixy-modal-close');

// Also alias for backward-compat references inside modal bodies
const modalTitle = staticModalTitle;
const modalBody = staticModalBody;

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

// Sidebar hamburger toggle
function toggleSidebar() {
    const sidebar = document.querySelector('.main-sidebar');
    const mainContent = document.querySelector('.main-content');
    const navbar = document.querySelector('.navbar');
    if (!sidebar) return;
    if (sidebar.style.left === '-270px' || getComputedStyle(sidebar).left === '-270px') {
        sidebar.style.left = '0';
        if (mainContent) mainContent.style.paddingLeft = '295px';
        if (navbar) navbar.style.left = '270px';
    } else {
        sidebar.style.left = '-270px';
        if (mainContent) mainContent.style.paddingLeft = '30px';
        if (navbar) navbar.style.left = '0';
    }
}

function showLogin() {
    loginContainer.style.display = 'flex';
    dashboardContainer.style.display = 'none';
    document.getElementById('global-loader').style.display = 'none';
}

function showDashboard() {
    loginContainer.style.display = 'none';
    dashboardContainer.style.display = 'block';
    document.getElementById('global-loader').style.display = 'none';

    // Switch to active tab
    switchTab(currentTab);
    loadGlobalCache();
    
    // Initialise feather icons after a short delay
    setTimeout(() => {
        if (window.feather) window.feather.replace();
    }, 100);
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
        console.error("Cache load error:", e);
    }
}

function setupEventListeners() {
    // Login Submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.textContent = '';
        const btn = loginForm.querySelector('button[type="submit"]');
        btn.textContent = 'Logging in...';
        btn.disabled = true;
        const username = document.getElementById('user_name').value;
        const password = document.getElementById('user_password').value;

        try {
            const { data, error } = await _supabase
                .from('admin_user')
                .select('*')
                .eq('user_name', username)
                .eq('user_password', password)
                .single();

            if (error || !data) {
                loginError.textContent = 'Invalid username or password.';
                btn.textContent = 'Log In';
                btn.disabled = false;
            } else {
                localStorage.setItem('flixy_admin_session', JSON.stringify(data));
                showDashboard();
            }
        } catch (err) {
            loginError.textContent = 'Connection error. Please try again.';
            btn.textContent = 'Log In';
            btn.disabled = false;
        }
    });

    // Sidebar hamburger
    document.addEventListener('click', (e) => {
        const collapseBtn = e.target.closest('.collapse-btn');
        if (collapseBtn) { e.preventDefault(); toggleSidebar(); }
    });

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('flixy_admin_session');
            showLogin();
        });
    }

    // Sidebar tab routing â€” use .activeLi (matches original CSS)
    document.querySelectorAll('.sidebar-menu li[data-tab]').forEach(li => {
        li.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.sidebar-menu li').forEach(el => el.classList.remove('activeLi'));
            li.classList.add('activeLi');
            switchTab(li.dataset.tab);
        });
    });

    // Modal Close
    if (staticModalCloseBtn) staticModalCloseBtn.addEventListener('click', hideModal);
    
    // Close modal when clicking outside
    if (staticModal) {
        staticModal.addEventListener('click', (e) => {
            if (e.target === staticModal) hideModal();
        });
    }
}

function switchTab(tabId) {
    currentTab = tabId;
    
    // Hide all tabs
    document.querySelectorAll('.tab-section').forEach(sec => sec.classList.remove('active'));
    
    // Show active tab
    const activeSec = document.getElementById(`tab-${tabId}`);
    if (activeSec) activeSec.classList.add('active');

    switch (tabId) {
        case 'index':
            loadDashboardStats();
            break;
        case 'users':
            loadUsers();
            break;
        case 'contentList':
            loadMovies();
            loadSeries();
            loadContentCounts();
            document.getElementById('btn-add-content').onclick = () => showAddContentModal();
            break;
        case 'mediaGallery':
            loadMediaGallery();
            break;
        case 'topContents':
            loadTopContents();
            document.getElementById('btn-add-top-content').onclick = () => addTopContentModal();
            break;
        case 'actors':
            loadActors();
            document.getElementById('btn-add-actor').onclick = () => addActorModal();
            break;
        case 'genres':
            loadGenres();
            document.getElementById('btn-add-genre').onclick = () => addGenreModal();
            break;
        case 'languages':
            loadLanguages();
            document.getElementById('btn-add-language').onclick = () => addLanguageModal();
            break;
        case 'liveTvCategories':
            loadTVCategories();
            document.getElementById('btn-add-tv-category').onclick = () => addTVCategoryModal();
            break;
        case 'liveTvChannels':
            loadTVChannels();
            document.getElementById('btn-add-tv-channel').onclick = () => addTVChannelModal();
            break;
        case 'notification':
            loadNotifications();
            document.getElementById('btn-add-notification').onclick = () => addNotificationModal();
            break;
        case 'admob':
            loadAdmobConfig();
            break;
        case 'customAds':
            loadCustomAds();
            document.getElementById('btn-add-custom-ad').onclick = () => addCustomAdModal();
            break;
        case 'setting':
            loadSettings();
            break;
        case 'viewPrivacy':
            loadPrivacyPolicy();
            break;
        case 'viewTerms':
            loadTermsOfUse();
            break;
    }
}

// Modal actions helper
function showModal(title, bodyHtml) {
    staticModalTitle.textContent = title;
    staticModalBody.innerHTML = bodyHtml;
    staticModal.classList.add('show');
}

function hideModal() {
    staticModal.classList.remove('show');
    staticModalBody.innerHTML = '';
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
// SECTION 1: DASHBOARD STATS
// ==========================================
async function loadDashboardStats() {
    try {
        const [{ count: movies }, { count: series }, { count: actors }, { count: genres },
               { count: languages }, { count: tvCats }, { count: tvChannels },
               { count: notifications }, { count: admob }, { count: customAds }, { count: users }] = await Promise.all([
            _supabase.from('contents').select('*', { count: 'exact', head: true }).eq('type', 0),
            _supabase.from('contents').select('*', { count: 'exact', head: true }).eq('type', 1),
            _supabase.from('actors').select('*', { count: 'exact', head: true }),
            _supabase.from('genres').select('*', { count: 'exact', head: true }),
            _supabase.from('languages').select('*', { count: 'exact', head: true }),
            _supabase.from('tv_categories').select('*', { count: 'exact', head: true }),
            _supabase.from('tv_channels').select('*', { count: 'exact', head: true }),
            _supabase.from('notifications').select('*', { count: 'exact', head: true }),
            _supabase.from('admob').select('*', { count: 'exact', head: true }),
            _supabase.from('custom_ads').select('*', { count: 'exact', head: true }),
            _supabase.from('users').select('*', { count: 'exact', head: true }),
        ]);

        // Render original dashboard-blog cards
        const cards = [
            { icon: 'users', count: users || 0, label: 'Users', tab: 'users' },
            { icon: 'video', count: (movies || 0) + (series || 0), label: 'Contents', tab: 'contentList' },
            { icon: 'star', count: actors || 0, label: 'Actors', tab: 'actors' },
            { icon: 'package', count: genres || 0, label: 'Genres', tab: 'genres' },
            { icon: 'globe', count: languages || 0, label: 'Languages', tab: 'languages' },
            { icon: 'cast', count: tvCats || 0, label: 'Live TV Categories', tab: 'liveTvCategories' },
            { icon: 'airplay', count: tvChannels || 0, label: 'Live TV Channels', tab: 'liveTvChannels' },
            { icon: 'bell', count: notifications || 0, label: 'Notifications', tab: 'notification' },
            { icon: 'activity', count: admob || 0, label: 'Admob', tab: 'admob' },
            { icon: 'fast-forward', count: customAds || 0, label: 'Custom Ads', tab: 'customAds' },
            { icon: 'settings', count: '', label: 'Settings', tab: 'setting' },
        ];

        const container = document.getElementById('dash-cards');
        container.innerHTML = cards.map(c => `
            <div class="dashboard-blog" style="cursor:pointer" onclick="switchTab('${c.tab}');document.querySelectorAll('.sidebar-menu li').forEach(el=>el.classList.remove('activeLi'));document.querySelector('[data-tab=${c.tab}]')?.classList.add('activeLi');">
                <div class="dashboard-blog-content">
                    <div class="card-icon">
                        <i data-feather="${c.icon}"></i>
                    </div>
                    <div class="dashboard-blog-content-top">
                        <p>${c.count}</p>
                        <a href="#">${c.label} <i data-feather="arrow-up-right"></i></a>
                    </div>
                </div>
            </div>
        `).join('');

        setTimeout(() => { if (window.feather) window.feather.replace(); }, 50);
    } catch (e) {
        console.error("Dashboard stats error:", e);
    }
}

// ==========================================
// SECTION 2: USERS LIST
// ==========================================
async function loadUsers() {
    const listBody = document.getElementById('users-list-body');
    listBody.innerHTML = `<tr><td colspan="6" class="text-center">Loading users...</td></tr>`;

    try {
        const { data, error } = await _supabase.from('users').select('*').order('id', { ascending: false });
        if (error) throw error;

        if (!data || data.length === 0) {
            listBody.innerHTML = `<tr><td colspan="6" class="text-center">No users registered yet.</td></tr>`;
            return;
        }

        listBody.innerHTML = '';
        data.forEach(u => {
            const avatar = u.profile_image ? `<img src="${u.profile_image}" class="rounded-circle" width="40" height="40">` : `<i class="fa fa-user-circle fa-2x text-muted"></i>`;
            const dateStr = u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A';
            const platform = u.device_type === 1 ? 'Android' : (u.device_type === 2 ? 'iOS' : 'Web/Email');

            listBody.innerHTML += `
                <tr>
                    <td>${avatar}</td>
                    <td><strong>${escapeHtml(u.fullname || 'Anonymous')}</strong></td>
                    <td>${escapeHtml(u.email || 'N/A')}</td>
                    <td><span class="badge badge-primary">${escapeHtml(u.login_type || 'Email')}</span></td>
                    <td>${platform}</td>
                    <td>${dateStr}</td>
                </tr>
            `;
        });
    } catch (e) {
        listBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error: ${e.message}</td></tr>`;
    }
}

// // ==========================================
// SECTION 3: CONTENT (MOVIES & SERIES)
// ==========================================
async function loadContentCounts() {
    try {
        const [{ count: movies }, { count: series }] = await Promise.all([
            _supabase.from('contents').select('*', { count: 'exact', head: true }).eq('type', 0),
            _supabase.from('contents').select('*', { count: 'exact', head: true }).eq('type', 1),
        ]);
        const m = movies || 0, s = series || 0;
        document.getElementById('count-movies').textContent = m;
        document.getElementById('count-series').textContent = s;
        document.getElementById('count-all').textContent = m + s;
    } catch (e) { console.error(e); }
}

function buildContentRows(data, isMovie) {
    if (!data || data.length === 0) {
        const cols = 8;
        return `<tr><td colspan="${cols}" class="text-center">No ${isMovie ? 'movies' : 'series'} found.</td></tr>`;
    }
    return data.map(item => {
        const VJ = cachedLanguages.find(l => l.id == item.language_id)?.title || 'N/A';
        const isFeaturedChecked = item.is_featured === 1 ? 'checked' : '';
        const isShowChecked = item.is_show === 1 ? 'checked' : '';
        return `
            <tr>
                <td><img src="${item.vertical_poster || ''}" class="thumb" onerror="this.src='./assets/img/placeholder-image.png'"></td>
                <td><strong>${escapeHtml(item.title)}</strong></td>
                <td>${item.ratings || '0.0'}</td>
                <td>${item.release_year}</td>
                <td>${escapeHtml(VJ)}</td>
                <td>
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" id="feat-${item.id}" ${isFeaturedChecked} onchange="toggleContentFeatured(${item.id}, ${item.is_featured})">
                    </div>
                </td>
                <td>
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" id="show-${item.id}" ${isShowChecked} onchange="toggleContentShow(${item.id}, ${item.is_show})">
                    </div>
                </td>
                <td class="text-end">
                    <div class="d-flex justify-content-end gap-1">
                        <button class="btn btn-sm btn-primary text-light" onclick="showEditContentModal(${item.id})"><i class="fas fa-edit"></i></button>
                        ${isMovie
                            ? `<button class="btn btn-sm btn-success text-light" onclick="manageMovieSources(${item.id}, '${escapeHtml(item.title)}')" title="Sources"><i class="fas fa-link"></i></button>`
                            : `<button class="btn btn-sm btn-success text-light" onclick="manageSeasons(${item.id}, '${escapeHtml(item.title)}')" title="Seasons"><i class="fas fa-folder-open"></i></button>`
                        }
                        <button class="btn btn-sm btn-info text-light" onclick="manageMovieSubtitles(${item.id}, '${escapeHtml(item.title)}')" title="Subtitles"><i class="fas fa-closed-captioning"></i></button>
                        <button class="btn btn-sm btn-secondary text-light" onclick="manageMovieCast(${item.id}, '${escapeHtml(item.title)}')" title="Cast"><i class="fas fa-user-plus"></i></button>
                        <button class="btn btn-sm btn-danger text-light" onclick="deleteContent(${item.id})"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
    }).join('');
}

async function loadMovies() {
    const listBody = document.getElementById('movies-list-body');
    listBody.innerHTML = `<tr><td colspan="8" class="text-center">Loading movies...</td></tr>`;
    try {
        const { data, error } = await _supabase.from('contents').select('*').eq('type', 0).order('release_year', { ascending: false });
        if (error) throw error;
        listBody.innerHTML = buildContentRows(data, true);
    } catch (e) {
        listBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error: ${e.message}</td></tr>`;
    }
}

async function loadSeries() {
    const listBody = document.getElementById('series-list-body');
    listBody.innerHTML = `<tr><td colspan="8" class="text-center">Loading series...</td></tr>`;
    try {
        const { data, error } = await _supabase.from('contents').select('*').eq('type', 1).order('release_year', { ascending: false });
        if (error) throw error;
        listBody.innerHTML = buildContentRows(data, false);
    } catch (e) {
        listBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error: ${e.message}</td></tr>`;
    }
}

// Keep loadContents as a passthrough for compatibility
async function loadContents() { await loadMovies(); await loadSeries(); }

async function toggleContentFeatured(id, val) {
    const newVal = val === 1 ? 0 : 1;
    await _supabase.from('contents').update({ is_featured: newVal }).eq('id', id);
    loadContents();
}

async function toggleContentShow(id, val) {
    const newVal = val === 1 ? 0 : 1;
    await _supabase.from('contents').update({ is_show: newVal }).eq('id', id);
    loadContents();
}

function getGenresCheckboxes(selectedIds = []) {
    let html = '';
    cachedGenres.forEach(genre => {
        const checked = selectedIds.includes(genre.id.toString()) ? 'checked' : '';
        html += `
            <div class="custom-control custom-checkbox custom-control-inline" style="margin-bottom:8px;">
                <input type="checkbox" class="custom-control-input" id="genreCheck-${genre.id}" name="genres_checkbox" value="${genre.id}" ${checked}>
                <label class="custom-control-label" for="genreCheck-${genre.id}">${genre.title}</label>
            </div>
        `;
    });
    return html;
}

function showAddContentModal() {
    const bodyHtml = `
        <form id="add-content-form">
            <div class="row">
                <div class="col-md-12 form-group">
                    <label>Title</label>
                    <input type="text" class="form-control" id="add-c-title" required>
                </div>
                <div class="col-md-12 form-group">
                    <label>Description</label>
                    <textarea class="form-control" id="add-c-description" rows="3" required></textarea>
                </div>
                <div class="col-md-4 form-group">
                    <label>Type</label>
                    <select class="form-control" id="add-c-type">
                        <option value="0">Movie</option>
                        <option value="1">Series</option>
                    </select>
                </div>
                <div class="col-md-4 form-group">
                    <label>Release Year</label>
                    <input type="number" class="form-control" id="add-c-year" value="2026" required>
                </div>
                <div class="col-md-4 form-group">
                    <label>Duration / Runtime</label>
                    <input type="text" class="form-control" id="add-c-duration" placeholder="e.g. 2h 15m or 10 Seasons">
                </div>
                <div class="col-md-4 form-group">
                    <label>Rating (0.0 - 10.0)</label>
                    <input type="number" class="form-control" id="add-c-rating" step="0.1" value="0.0" min="0" max="10">
                </div>
                <div class="col-md-4 form-group">
                    <label>VJ / Language</label>
                    <select class="form-control" id="add-c-language">
                        ${cachedLanguages.map(l => `<option value="${l.id}">${l.title}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-4 form-group">
                    <label>Trailer URL</label>
                    <input type="text" class="form-control" id="add-c-trailer" placeholder="Youtube or video link">
                </div>
                <div class="col-md-12 form-group">
                    <label class="d-block">Genres</label>
                    <div style="background:#f8f9fa; padding:10px; border-radius:5px; border:1px solid #ced4da;">
                        ${getGenresCheckboxes()}
                    </div>
                </div>
                <div class="col-md-12 form-group">
                    <label>Vertical Poster Image</label>
                    <input type="file" class="form-control-file" id="add-c-v-poster" accept="image/*">
                </div>
                <div class="col-md-12 form-group">
                    <label>Horizontal Poster Image</label>
                    <input type="file" class="form-control-file" id="add-c-h-poster" accept="image/*">
                </div>
                <div class="col-md-12 form-group">
                    <label>Logo Poster (Optional)</label>
                    <input type="file" class="form-control-file" id="add-c-logo" accept="image/*">
                </div>
            </div>
            <div class="text-right">
                <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn btn-primary ml-2">Save Content</button>
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
            toastError('Error adding content: ' + err.message);
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
        <form id="edit-content-form">
            <div class="row">
                <div class="col-md-12 form-group">
                    <label>Title</label>
                    <input type="text" class="form-control" id="edit-c-title" value="${escapeHtml(item.title)}" required>
                </div>
                <div class="col-md-12 form-group">
                    <label>Description</label>
                    <textarea class="form-control" id="edit-c-description" rows="3" required>${escapeHtml(item.description)}</textarea>
                </div>
                <div class="col-md-4 form-group">
                    <label>Type</label>
                    <select class="form-control" id="edit-c-type">
                        <option value="0" ${item.type === 0 ? 'selected' : ''}>Movie</option>
                        <option value="1" ${item.type === 1 ? 'selected' : ''}>Series</option>
                    </select>
                </div>
                <div class="col-md-4 form-group">
                    <label>Release Year</label>
                    <input type="number" class="form-control" id="edit-c-year" value="${item.release_year}" required>
                </div>
                <div class="col-md-4 form-group">
                    <label>Duration / Runtime</label>
                    <input type="text" class="form-control" id="edit-c-duration" value="${escapeHtml(item.duration || '')}">
                </div>
                <div class="col-md-4 form-group">
                    <label>Rating (0.0 - 10.0)</label>
                    <input type="number" class="form-control" id="edit-c-rating" step="0.1" value="${item.ratings}" min="0" max="10">
                </div>
                <div class="col-md-4 form-group">
                    <label>VJ / Language</label>
                    <select class="form-control" id="edit-c-language">
                        ${cachedLanguages.map(l => `<option value="${l.id}" ${l.id === item.language_id ? 'selected' : ''}>${l.title}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-4 form-group">
                    <label>Trailer URL</label>
                    <input type="text" class="form-control" id="edit-c-trailer" value="${escapeHtml(item.trailer_url || '')}">
                </div>
                <div class="col-md-12 form-group">
                    <label class="d-block">Genres</label>
                    <div style="background:#f8f9fa; padding:10px; border-radius:5px; border:1px solid #ced4da;">
                        ${getGenresCheckboxes(selectedGenres)}
                    </div>
                </div>
                <div class="col-md-12 form-group">
                    <label>Vertical Poster Image</label>
                    <div><img src="${item.vertical_poster || ''}" class="img-thumbnail mb-2" style="max-height:80px;" onerror="this.src='./assets/img/placeholder-image.png'"></div>
                    <input type="file" class="form-control-file" id="edit-c-v-poster" accept="image/*">
                </div>
                <div class="col-md-12 form-group">
                    <label>Horizontal Poster Image</label>
                    <div><img src="${item.horizontal_poster || ''}" class="img-thumbnail mb-2" style="max-height:80px;" onerror="this.src='./assets/img/placeholder-image.png'"></div>
                    <input type="file" class="form-control-file" id="edit-c-h-poster" accept="image/*">
                </div>
                <div class="col-md-12 form-group">
                    <label>Logo Poster (Optional)</label>
                    <div><img src="${item.logo_url || ''}" class="img-thumbnail mb-2" style="max-height:80px;" onerror="this.src='./assets/img/placeholder-image.png'"></div>
                    <input type="file" class="form-control-file" id="edit-c-logo" accept="image/*">
                </div>
            </div>
            <div class="text-right">
                <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn btn-primary ml-2">Update Content</button>
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
            toastError('Error updating content: ' + err.message);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Update Content';
        }
    });
}

async function deleteContent(id) {
    if (!confirm('Are you sure you want to delete this content?')) return;
    try {
        await _supabase.from('content_sources').delete().eq('content_id', id);
        await _supabase.from('content_cast').delete().eq('content_id', id);
        
        const { data: seasons } = await _supabase.from('seasons').select('id').eq('content_id', id);
        if (seasons) {
            for (const s of seasons) {
                const { data: episodes } = await _supabase.from('episodes').select('id').eq('season_id', s.id);
                if (episodes) {
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
        toastError('Error: ' + e.message);
    }
}

// ==========================================
// MOVIE SOURCES MANAGEMENT
// ==========================================
async function manageMovieSources(contentId, movieTitle) {
    const loadSources = async () => {
        const { data, error } = await _supabase.from('content_sources').select('*').eq('content_id', contentId);
        if (error) return;
        
        let container = document.getElementById('sources-list-block');
        if (!data || data.length === 0) {
            container.innerHTML = '<li class="list-group-item text-center text-muted">No sources linked.</li>';
            return;
        }
        container.innerHTML = '';
        data.forEach(src => {
            container.innerHTML += `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${escapeHtml(src.title)}</strong> [${escapeHtml(src.quality)}]
                        <div style="font-size:0.75rem; color:#888;">URL: ${escapeHtml(src.source)}</div>
                    </div>
                    <button class="btn btn-sm btn-danger" onclick="deleteMovieSource(${src.id}, ${contentId}, '${escapeHtml(movieTitle)}')"><i class="fa fa-trash"></i></button>
                </li>
            `;
        });
    };

    const bodyHtml = `
        <h6>Sources for: ${movieTitle}</h6>
        <ul class="list-group mb-3" id="sources-list-block"></ul>
        <hr>
        <form id="add-src-form">
            <h6>Add Source URL</h6>
            <div class="row">
                <div class="col-md-6 form-group">
                    <label>Title</label>
                    <input type="text" class="form-control" id="src-title" placeholder="Server Name" required>
                </div>
                <div class="col-md-6 form-group">
                    <label>Quality</label>
                    <input type="text" class="form-control" id="src-quality" placeholder="1080p, 720p" required>
                </div>
                <div class="col-md-6 form-group">
                    <label>Access Type</label>
                    <select class="form-control" id="src-access">
                        <option value="0">Free</option>
                        <option value="1">Premium</option>
                    </select>
                </div>
                <div class="col-md-6 form-group">
                    <label>Source URL</label>
                    <input type="text" class="form-control" id="src-source" placeholder="m3u8, mp4 link" required>
                </div>
            </div>
            <button type="submit" class="btn btn-primary"><i class="fa fa-plus"></i> Add Source</button>
        </form>
    `;
    showModal('Video Sources', bodyHtml);
    loadSources();

    document.getElementById('add-src-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const insertData = {
                content_id: contentId,
                title: document.getElementById('src-title').value,
                quality: document.getElementById('src-quality').value,
                access_type: parseInt(document.getElementById('src-access').value),
                source: document.getElementById('src-source').value,
                size: 'N/A',
                is_download: 0,
                type: 0
            };
            const { error } = await _supabase.from('content_sources').insert([insertData]);
            if (error) throw error;
            manageMovieSources(contentId, movieTitle);
        } catch (err) {
            toastError('Error adding source: ' + err.message);
        }
    });
}

async function deleteMovieSource(id, contentId, movieTitle) {
    if (!confirm('Delete this source?')) return;
    await _supabase.from('content_sources').delete().eq('id', id);
    manageMovieSources(contentId, movieTitle);
}

// ==========================================
// MOVIE SUBTITLES MANAGEMENT
// ==========================================
async function manageMovieSubtitles(contentId, movieTitle) {
    const loadSubs = async () => {
        const { data } = await _supabase.from('subtitles').select('*').eq('content_id', contentId.toString());
        const container = document.getElementById('subtitles-list-block');
        if (!data || data.length === 0) {
            container.innerHTML = '<li class="list-group-item text-center text-muted">No subtitles linked.</li>';
            return;
        }
        container.innerHTML = '';
        data.forEach(sub => {
            const lang = cachedLanguages.find(l => l.id == sub.language_id)?.title || 'Unknown';
            container.innerHTML += `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${escapeHtml(lang)} Subtitle</strong>
                        <div style="font-size:0.75rem; color:#888;">File: ${escapeHtml(sub.file)}</div>
                    </div>
                    <button class="btn btn-sm btn-danger" onclick="deleteMovieSubtitle(${sub.id}, ${contentId}, '${escapeHtml(movieTitle)}')"><i class="fa fa-trash"></i></button>
                </li>
            `;
        });
    };

    const bodyHtml = `
        <h6>Subtitles for: ${movieTitle}</h6>
        <ul class="list-group mb-3" id="subtitles-list-block"></ul>
        <hr>
        <form id="add-sub-form">
            <h6>Add Subtitle</h6>
            <div class="row">
                <div class="col-md-6 form-group">
                    <label>Language</label>
                    <select class="form-control" id="sub-language">
                        ${cachedLanguages.map(l => `<option value="${l.id}">${l.title}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-6 form-group">
                    <label>Subtitle File (.srt, .vtt)</label>
                    <input type="file" class="form-control-file" id="sub-file" accept=".srt,.vtt" required>
                </div>
            </div>
            <button type="submit" class="btn btn-primary"><i class="fa fa-plus"></i> Upload Subtitle</button>
        </form>
    `;
    showModal('Movie Subtitles', bodyHtml);
    loadSubs();

    document.getElementById('add-sub-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const subUrl = await uploadToSupabase(document.getElementById('sub-file'), 'subtitles');
            const insertData = {
                content_id: contentId.toString(),
                language_id: parseInt(document.getElementById('sub-language').value),
                file: subUrl
            };
            const { error } = await _supabase.from('subtitles').insert([insertData]);
            if (error) throw error;
            manageMovieSubtitles(contentId, movieTitle);
        } catch (err) {
            toastError('Error adding subtitle: ' + err.message);
        }
    });
}

async function deleteMovieSubtitle(id, contentId, movieTitle) {
    if (!confirm('Delete this subtitle?')) return;
    await _supabase.from('subtitles').delete().eq('id', id);
    manageMovieSubtitles(contentId, movieTitle);
}

// ==========================================
// MOVIE CAST MANAGEMENT
// ==========================================
async function manageMovieCast(contentId, movieTitle) {
    const loadCasts = async () => {
        const { data } = await _supabase.from('content_cast').select('*').eq('content_id', contentId);
        const container = document.getElementById('cast-list-block');
        if (!data || data.length === 0) {
            container.innerHTML = '<li class="list-group-item text-center text-muted">No cast associations added.</li>';
            return;
        }
        container.innerHTML = '';
        data.forEach(c => {
            const actorName = cachedActors.find(a => a.id == c.actor_id)?.fullname || 'Unknown';
            container.innerHTML += `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${escapeHtml(actorName)}</strong> as <em>${escapeHtml(c.character_name)}</em>
                    </div>
                    <button class="btn btn-sm btn-danger" onclick="deleteMovieCast(${c.id}, ${contentId}, '${escapeHtml(movieTitle)}')"><i class="fa fa-trash"></i></button>
                </li>
            `;
        });
    };

    const bodyHtml = `
        <h6>Cast for: ${movieTitle}</h6>
        <ul class="list-group mb-3" id="cast-list-block"></ul>
        <hr>
        <form id="add-cast-form">
            <h6>Add Cast Member</h6>
            <div class="row">
                <div class="col-md-6 form-group">
                    <label>Select Actor</label>
                    <select class="form-control" id="cast-actor-id">
                        ${cachedActors.map(a => `<option value="${a.id}">${a.fullname}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-6 form-group">
                    <label>Character Name</label>
                    <input type="text" class="form-control" id="cast-character-name" placeholder="Role Name" required>
                </div>
            </div>
            <button type="submit" class="btn btn-primary"><i class="fa fa-plus"></i> Add Cast Member</button>
        </form>
    `;
    showModal('Manage Cast', bodyHtml);
    loadCasts();

    document.getElementById('add-cast-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const insertData = {
                content_id: contentId,
                actor_id: parseInt(document.getElementById('cast-actor-id').value),
                character_name: document.getElementById('cast-character-name').value
            };
            const { error } = await _supabase.from('content_cast').insert([insertData]);
            if (error) throw error;
            manageMovieCast(contentId, movieTitle);
        } catch (err) {
            toastError('Error adding cast member: ' + err.message);
        }
    });
}

async function deleteMovieCast(id, contentId, movieTitle) {
    if (!confirm('Remove this cast member?')) return;
    await _supabase.from('content_cast').delete().eq('id', id);
    manageMovieCast(contentId, movieTitle);
}

// ==========================================
// SERIES SEASONS & EPISODES
// ==========================================
async function manageSeasons(contentId, seriesTitle) {
    const { data: seasons } = await _supabase.from('seasons').select('*').eq('content_id', contentId).order('id', { ascending: true });

    let seasonTabs = '';
    let seasonPanels = '';

    if (!seasons || seasons.length === 0) {
        seasonPanels = '<div class="text-center text-muted py-4">No seasons created yet.</div>';
    } else {
        seasons.forEach((s, idx) => {
            seasonTabs += `
                <li class="nav-item">
                    <a class="nav-link ${idx === 0 ? 'active' : ''}" id="tab-s-${s.id}-link" data-toggle="tab" href="#panel-s-${s.id}">${escapeHtml(s.title)}</a>
                </li>
            `;
            seasonPanels += `
                <div class="tab-pane fade ${idx === 0 ? 'show active' : ''}" id="panel-s-${s.id}">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h6>Episodes</h6>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-primary" onclick="addEpisodeModal(${s.id}, ${contentId}, '${escapeHtml(seriesTitle)}')"><i class="fa fa-plus"></i> Add Episode</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteSeason(${s.id}, ${contentId}, '${escapeHtml(seriesTitle)}')"><i class="fa fa-trash"></i> Delete Season</button>
                        </div>
                    </div>
                    <div id="episodes-block-${s.id}">Loading episodes...</div>
                </div>
            `;
        });
    }

    const bodyHtml = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h5>Series: ${seriesTitle}</h5>
            <button class="btn btn-primary btn-sm" onclick="addSeasonModal(${contentId}, '${escapeHtml(seriesTitle)}')"><i class="fa fa-plus"></i> Create Season</button>
        </div>
        <ul class="nav nav-tabs mb-3">
            ${seasonTabs}
        </ul>
        <div class="tab-content" id="seasons-tab-content">
            ${seasonPanels}
        </div>
    `;
    showModal('Manage Seasons & Episodes', bodyHtml);
    
    if (seasons && seasons.length > 0) {
        seasons.forEach(s => loadEpisodes(s.id));
    }
}

async function loadEpisodes(seasonId) {
    const container = document.getElementById(`episodes-block-${seasonId}`);
    if (!container) return;

    try {
        const { data: eps } = await _supabase.from('episodes').select('*').eq('season_id', seasonId).order('number', { ascending: true });
        if (!eps || eps.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No episodes inside this season.</p>';
            return;
        }
        container.innerHTML = '';
        eps.forEach(ep => {
            container.innerHTML += `
                <div class="card card-body mb-2 border d-flex flex-row align-items-center justify-content-between p-2">
                    <div class="d-flex align-items-center">
                        <img src="${ep.thumbnail || ''}" class="img-thumbnail mr-3" style="width:60px; height:45px; object-fit:cover;" onerror="this.src='./assets/img/placeholder-image.png'">
                        <div>
                            <strong>Ep ${ep.number}: ${escapeHtml(ep.title)}</strong>
                            <div style="font-size:0.75rem; color:#888;">Duration: ${escapeHtml(ep.duration)} | Views: ${ep.total_view || 0}</div>
                        </div>
                    </div>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-success" title="Video links" onclick="manageEpisodeSources(${ep.id}, '${escapeHtml(ep.title)}')"><i class="fa fa-link"></i></button>
                        <button class="btn btn-sm btn-outline-info" title="Subtitles" onclick="manageEpisodeSubtitles(${ep.id}, '${escapeHtml(ep.title)}')"><i class="fa fa-cc"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteEpisode(${ep.id}, ${seasonId})"><i class="fa fa-trash"></i></button>
                    </div>
                </div>
            `;
        });
    } catch (e) {
        container.innerHTML = '<p class="text-danger">Error loading episodes.</p>';
    }
}

function addSeasonModal(contentId, seriesTitle) {
    const parentModalTitle = modalTitle.textContent;
    const parentModalBody = modalBody.innerHTML;

    const bodyHtml = `
        <form id="season-create-form">
            <div class="form-group">
                <label>Season Title</label>
                <input type="text" class="form-control" id="s-new-title" placeholder="e.g. Season 1" required>
            </div>
            <div class="form-group">
                <label>Trailer Link (Optional)</label>
                <input type="text" class="form-control" id="s-new-trailer" placeholder="Youtube URL">
            </div>
            <div class="text-right">
                <button type="button" class="btn btn-secondary" id="back-season-btn">Back</button>
                <button type="submit" class="btn btn-primary ml-2">Create Season</button>
            </div>
        </form>
    `;
    showModal('Create Season', bodyHtml);

    document.getElementById('back-season-btn').onclick = () => {
        showModal(parentModalTitle, parentModalBody);
        manageSeasons(contentId, seriesTitle);
    };

    document.getElementById('season-create-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const insertData = {
                content_id: contentId,
                title: document.getElementById('s-new-title').value,
                trailer_url: document.getElementById('s-new-trailer').value || null
            };
            const { error } = await _supabase.from('seasons').insert([insertData]);
            if (error) throw error;
            showModal(parentModalTitle, parentModalBody);
            manageSeasons(contentId, seriesTitle);
        } catch (err) {
            toastError('Error: ' + err.message);
        }
    });
}

async function deleteSeason(seasonId, contentId, seriesTitle) {
    if (!confirm('Delete this season and all its episodes/sources?')) return;
    try {
        const { data: eps } = await _supabase.from('episodes').select('id').eq('season_id', seasonId);
        if (eps) {
            for (const ep of eps) {
                await _supabase.from('episode_sources').delete().eq('episode_id', ep.id);
                await _supabase.from('episode_subtitles').delete().eq('episode_id', ep.id);
            }
            await _supabase.from('episodes').delete().eq('season_id', seasonId);
        }
        await _supabase.from('seasons').delete().eq('id', seasonId);
        manageSeasons(contentId, seriesTitle);
    } catch (e) {
        toastError('Error: ' + e.message);
    }
}

function addEpisodeModal(seasonId, contentId, seriesTitle) {
    const parentModalTitle = modalTitle.textContent;
    const parentModalBody = modalBody.innerHTML;

    const bodyHtml = `
        <form id="episode-create-form">
            <div class="row">
                <div class="col-md-6 form-group">
                    <label>Episode Number</label>
                    <input type="number" class="form-control" id="ep-new-num" value="1" min="1" required>
                </div>
                <div class="col-md-6 form-group">
                    <label>Episode Title</label>
                    <input type="text" class="form-control" id="ep-new-title" placeholder="Episode Title" required>
                </div>
                <div class="col-md-6 form-group">
                    <label>Duration</label>
                    <input type="text" class="form-control" id="ep-new-duration" placeholder="e.g. 45m" required>
                </div>
                <div class="col-md-6 form-group">
                    <label>Thumbnail Image</label>
                    <input type="file" class="form-control-file" id="ep-new-thumb" accept="image/*" required>
                </div>
                <div class="col-md-12 form-group">
                    <label>Description</label>
                    <textarea class="form-control" id="ep-new-desc" rows="3" required></textarea>
                </div>
            </div>
            <div class="text-right">
                <button type="button" class="btn btn-secondary" id="back-ep-btn">Back</button>
                <button type="submit" class="btn btn-primary ml-2">Save Episode</button>
            </div>
        </form>
    `;
    showModal('Add Episode', bodyHtml);

    document.getElementById('back-ep-btn').onclick = () => {
        showModal(parentModalTitle, parentModalBody);
        manageSeasons(contentId, seriesTitle);
    };

    document.getElementById('episode-create-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const thumbUrl = await uploadToSupabase(document.getElementById('ep-new-thumb'), 'episodes');
            const insertData = {
                season_id: seasonId,
                number: parseInt(document.getElementById('ep-new-num').value),
                title: document.getElementById('ep-new-title').value,
                duration: document.getElementById('ep-new-duration').value,
                description: document.getElementById('ep-new-desc').value,
                thumbnail: thumbUrl,
                total_view: 0,
                total_download: 0
            };
            const { error } = await _supabase.from('episodes').insert([insertData]);
            if (error) throw error;
            showModal(parentModalTitle, parentModalBody);
            manageSeasons(contentId, seriesTitle);
        } catch (err) {
            toastError('Error: ' + err.message);
            submitBtn.disabled = false;
        }
    });
}

async function deleteEpisode(id, seasonId) {
    if (!confirm('Delete this episode?')) return;
    await _supabase.from('episode_sources').delete().eq('episode_id', id);
    await _supabase.from('episode_subtitles').delete().eq('episode_id', id);
    await _supabase.from('episodes').delete().eq('id', id);
    loadEpisodes(seasonId);
}

// ==========================================
// EPISODE SOURCES & SUBTITLES
// ==========================================
async function manageEpisodeSources(episodeId, epTitle) {
    const loadEpSources = async () => {
        const { data } = await _supabase.from('episode_sources').select('*').eq('episode_id', episodeId);
        const container = document.getElementById('ep-sources-list-block');
        if (!data || data.length === 0) {
            container.innerHTML = '<li class="list-group-item text-center text-muted">No sources linked.</li>';
            return;
        }
        container.innerHTML = '';
        data.forEach(src => {
            container.innerHTML += `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${escapeHtml(src.title)}</strong> [${escapeHtml(src.quality)}]
                        <div style="font-size:0.75rem; color:#888;">URL: ${escapeHtml(src.source)}</div>
                    </div>
                    <button class="btn btn-sm btn-danger" onclick="deleteEpisodeSource(${src.id}, ${episodeId}, '${escapeHtml(epTitle)}')"><i class="fa fa-trash"></i></button>
                </li>
            `;
        });
    };

    const bodyHtml = `
        <h6>Sources for: ${epTitle}</h6>
        <ul class="list-group mb-3" id="ep-sources-list-block"></ul>
        <hr>
        <form id="add-epsrc-form">
            <h6>Add Source Link</h6>
            <div class="row">
                <div class="col-md-6 form-group">
                    <label>Title</label>
                    <input type="text" class="form-control" id="epsrc-title" placeholder="Server Name" required>
                </div>
                <div class="col-md-6 form-group">
                    <label>Quality</label>
                    <input type="text" class="form-control" id="epsrc-quality" placeholder="720p" required>
                </div>
                <div class="col-md-6 form-group">
                    <label>Access Type</label>
                    <select class="form-control" id="epsrc-access">
                        <option value="0">Free</option>
                        <option value="1">Premium</option>
                    </select>
                </div>
                <div class="col-md-6 form-group">
                    <label>Source URL</label>
                    <input type="text" class="form-control" id="epsrc-source" placeholder="m3u8, mp4 link" required>
                </div>
            </div>
            <button type="submit" class="btn btn-primary"><i class="fa fa-plus"></i> Add Source</button>
        </form>
    `;
    showModal('Episode Video Sources', bodyHtml);
    loadEpSources();

    document.getElementById('add-epsrc-form').addEventListener('submit', async (e) => {
        e.preventDefault();
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
            toastError('Error adding source: ' + err.message);
        }
    });
}

async function deleteEpisodeSource(id, episodeId, epTitle) {
    if (!confirm('Delete this source?')) return;
    await _supabase.from('episode_sources').delete().eq('id', id);
    manageEpisodeSources(episodeId, epTitle);
}

async function manageEpisodeSubtitles(episodeId, epTitle) {
    const loadEpSubs = async () => {
        const { data } = await _supabase.from('episode_subtitles').select('*').eq('episode_id', episodeId);
        const container = document.getElementById('ep-subs-list-block');
        if (!data || data.length === 0) {
            container.innerHTML = '<li class="list-group-item text-center text-muted">No subtitles linked.</li>';
            return;
        }
        container.innerHTML = '';
        data.forEach(sub => {
            const lang = cachedLanguages.find(l => l.id == sub.language_id)?.title || 'Unknown';
            container.innerHTML += `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${escapeHtml(lang)} Subtitle</strong>
                        <div style="font-size:0.75rem; color:#888;">File: ${escapeHtml(sub.file)}</div>
                    </div>
                    <button class="btn btn-sm btn-danger" onclick="deleteEpisodeSubtitle(${sub.id}, ${episodeId}, '${escapeHtml(epTitle)}')"><i class="fa fa-trash"></i></button>
                </li>
            `;
        });
    };

    const bodyHtml = `
        <h6>Subtitles for: ${epTitle}</h6>
        <ul class="list-group mb-3" id="ep-subs-list-block"></ul>
        <hr>
        <form id="add-epsub-form">
            <h6>Add Subtitle</h6>
            <div class="row">
                <div class="col-md-6 form-group">
                    <label>Language</label>
                    <select class="form-control" id="epsub-language">
                        ${cachedLanguages.map(l => `<option value="${l.id}">${l.title}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-6 form-group">
                    <label>Subtitle File (.srt, .vtt)</label>
                    <input type="file" class="form-control-file" id="epsub-file" accept=".srt,.vtt" required>
                </div>
            </div>
            <button type="submit" class="btn btn-primary"><i class="fa fa-plus"></i> Upload Subtitle</button>
        </form>
    `;
    showModal('Episode Subtitles', bodyHtml);
    loadEpSubs();

    document.getElementById('add-epsub-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const subUrl = await uploadToSupabase(document.getElementById('epsub-file'), 'subtitles');
            const insertData = {
                episode_id: episodeId,
                language_id: parseInt(document.getElementById('epsub-language').value),
                file: subUrl
            };
            const { error } = await _supabase.from('episode_subtitles').insert([insertData]);
            if (error) throw error;
            manageEpisodeSubtitles(episodeId, epTitle);
        } catch (err) {
            toastError('Error adding subtitle: ' + err.message);
        }
    });
}

async function deleteEpisodeSubtitle(id, episodeId, epTitle) {
    if (!confirm('Delete this subtitle?')) return;
    await _supabase.from('episode_subtitles').delete().eq('id', id);
    manageEpisodeSubtitles(episodeId, epTitle);
}

// ==========================================
// SECTION 4: MEDIA GALLERY
// ==========================================
async function loadMediaGallery() {
    const container = document.getElementById('media-gallery-grid');
    container.innerHTML = '<div class="col-12 text-center">Loading media storage assets...</div>';

    try {
        const { data, error } = await _supabase.storage.from('flixy').list('posters', {
            limit: 100,
            sortBy: { column: 'created_at', order: 'desc' }
        });

        if (error || !data || data.length === 0) {
            container.innerHTML = '<div class="col-12 text-center text-muted">No media files uploaded yet in the bucket.</div>';
            return;
        }

        container.innerHTML = '';
        data.forEach(file => {
            const { data: publicData } = _supabase.storage.from('flixy').getPublicUrl(`posters/${file.name}`);
            container.innerHTML += `
                <div class="col-md-2 col-sm-4 col-6 mb-3">
                    <div class="card border shadow-sm">
                        <img src="${publicData.publicUrl}" class="card-img-top" style="height:120px; object-fit:cover;" onerror="this.src='./assets/img/placeholder-image.png'">
                        <div class="card-body p-2 text-center">
                            <button class="btn btn-xs btn-outline-danger" onclick="deleteGalleryAsset('posters/${file.name}')"><i class="fa fa-trash"></i> Delete</button>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (e) {
        container.innerHTML = `<div class="col-12 text-center text-danger">Error: ${e.message}</div>`;
    }
}

async function deleteGalleryAsset(filePath) {
    if (!confirm('Delete this file from storage permanently?')) return;
    await _supabase.storage.from('flixy').remove([filePath]);
    loadMediaGallery();
}

// ==========================================
// SECTION 5: TOP CONTENTS (TOP 10)
// ==========================================
async function loadTopContents() {
    const listBody = document.getElementById('top-content-list-body');
    listBody.innerHTML = `<tr><td colspan="6" class="text-center">Loading Top 10 list...</td></tr>`;

    try {
        const { data, error } = await _supabase
            .from('top_contents')
            .select(`
                id,
                content_index,
                content_id,
                contents (
                    title,
                    type,
                    release_year,
                    vertical_poster
                )
            `)
            .order('content_index', { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
            listBody.innerHTML = `<tr><td colspan="6" class="text-center">No contents added to Top 10 yet.</td></tr>`;
            return;
        }

        listBody.innerHTML = '';
        data.forEach(item => {
            const c = item.contents;
            const title = c ? c.title : 'Deleted Content';
            const typeBadge = c ? (c.type === 1 ? '<span class="badge badge-warning">Series</span>' : '<span class="badge badge-info">Movie</span>') : 'N/A';
            const year = c ? c.release_year : 'N/A';
            const poster = c ? c.vertical_poster : '';

            listBody.innerHTML += `
                <tr>
                    <td><strong># ${item.content_index}</strong></td>
                    <td><img src="${poster}" class="rounded" width="35" height="50" onerror="this.src='./assets/img/placeholder-image.png'"></td>
                    <td><strong>${escapeHtml(title)}</strong></td>
                    <td>${typeBadge}</td>
                    <td>${year}</td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="deleteTopContent(${item.id})"><i class="fa fa-trash"></i> Remove</button>
                    </td>
                </tr>
            `;
        });
    } catch (e) {
        listBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error: ${e.message}</td></tr>`;
    }
}

async function addTopContentModal() {
    const { data: contents } = await _supabase.from('contents').select('id, title').order('title', { ascending: true });

    const bodyHtml = `
        <form id="add-top-form">
            <div class="form-group">
                <label>Select Content</label>
                <select class="form-control" id="top-c-id" required>
                    ${contents?.map(c => `<option value="${c.id}">${escapeHtml(c.title)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Position Index (e.g. 1 for Top #1, 2 for Top #2)</label>
                <input type="number" class="form-control" id="top-c-index" value="1" min="1" max="100" required>
            </div>
            <div class="text-right">
                <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn btn-primary ml-2">Add Content</button>
            </div>
        </form>
    `;
    showModal('Add to Top List', bodyHtml);

    document.getElementById('add-top-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const insertData = {
                content_id: parseInt(document.getElementById('top-c-id').value),
                content_index: parseInt(document.getElementById('top-c-index').value)
            };
            const { error } = await _supabase.from('top_contents').insert([insertData]);
            if (error) throw error;
            hideModal();
            loadTopContents();
        } catch (err) {
            toastError('Error: ' + err.message);
        }
    });
}

async function deleteTopContent(id) {
    if (!confirm('Remove from Top 10 list?')) return;
    await _supabase.from('top_contents').delete().eq('id', id);
    loadTopContents();
}

// ==========================================
// SECTION 6: ACTORS MANAGEMENT
// ==========================================
async function loadActors() {
    const listBody = document.getElementById('actors-list-body');
    listBody.innerHTML = `<tr><td colspan="5" class="text-center">Loading actors...</td></tr>`;

    try {
        const { data, error } = await _supabase.from('actors').select('*').order('id', { ascending: false });
        if (error) throw error;

        if (!data || data.length === 0) {
            listBody.innerHTML = `<tr><td colspan="5" class="text-center">No actors registered yet.</td></tr>`;
            return;
        }

        listBody.innerHTML = '';
        data.forEach(act => {
            listBody.innerHTML += `
                <tr>
                    <td><img src="${act.profile_image || ''}" class="rounded-circle" width="40" height="40" onerror="this.src='./assets/img/placeholder-image.png'"></td>
                    <td><strong>${escapeHtml(act.fullname)}</strong></td>
                    <td>${escapeHtml(act.dob)}</td>
                    <td style="max-width:250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(act.bio)}</td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-primary" onclick="editActorModal(${act.id})"><i class="fa fa-edit"></i></button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteActor(${act.id})"><i class="fa fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
    } catch (e) {
        listBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error: ${e.message}</td></tr>`;
    }
}

function addActorModal() {
    const bodyHtml = `
        <form id="add-actor-form">
            <div class="row">
                <div class="col-md-6 form-group">
                    <label>Full Name</label>
                    <input type="text" class="form-control" id="act-fullname" required>
                </div>
                <div class="col-md-6 form-group">
                    <label>DOB (YYYY-MM-DD)</label>
                    <input type="text" class="form-control" id="act-dob" placeholder="1990-10-15" required>
                </div>
                <div class="col-md-12 form-group">
                    <label>Profile Image</label>
                    <input type="file" class="form-control-file" id="act-img" accept="image/*" required>
                </div>
                <div class="col-md-12 form-group">
                    <label>Biography</label>
                    <textarea class="form-control" id="act-bio" rows="4" required></textarea>
                </div>
            </div>
            <div class="text-right">
                <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn btn-primary ml-2">Save Actor</button>
            </div>
        </form>
    `;
    showModal('Add Actor', bodyHtml);

    document.getElementById('add-actor-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const imgUrl = await uploadToSupabase(document.getElementById('act-img'), 'actors');
            const insertData = {
                fullname: document.getElementById('act-fullname').value,
                dob: document.getElementById('act-dob').value,
                bio: document.getElementById('act-bio').value,
                profile_image: imgUrl
            };
            const { error } = await _supabase.from('actors').insert([insertData]);
            if (error) throw error;
            hideModal();
            loadActors();
            loadGlobalCache();
        } catch (err) {
            toastError('Error adding actor: ' + err.message);
            submitBtn.disabled = false;
        }
    });
}

async function editActorModal(id) {
    const { data: act, error } = await _supabase.from('actors').select('*').eq('id', id).single();
    if (error || !act) return;

    const bodyHtml = `
        <form id="edit-actor-form">
            <div class="row">
                <div class="col-md-6 form-group">
                    <label>Full Name</label>
                    <input type="text" class="form-control" id="edit-act-fullname" value="${escapeHtml(act.fullname)}" required>
                </div>
                <div class="col-md-6 form-group">
                    <label>DOB (YYYY-MM-DD)</label>
                    <input type="text" class="form-control" id="edit-act-dob" value="${escapeHtml(act.dob)}" required>
                </div>
                <div class="col-md-12 form-group">
                    <label>Profile Image</label>
                    <div><img src="${act.profile_image || ''}" class="img-thumbnail mb-2" style="max-height:80px;" onerror="this.src='./assets/img/placeholder-image.png'"></div>
                    <input type="file" class="form-control-file" id="edit-act-img" accept="image/*">
                </div>
                <div class="col-md-12 form-group">
                    <label>Biography</label>
                    <textarea class="form-control" id="edit-act-bio" rows="4" required>${escapeHtml(act.bio)}</textarea>
                </div>
            </div>
            <div class="text-right">
                <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn btn-primary ml-2">Update Actor</button>
            </div>
        </form>
    `;
    showModal(`Edit Actor: ${act.fullname}`, bodyHtml);

    document.getElementById('edit-actor-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const imgUrl = await uploadToSupabase(document.getElementById('edit-act-img'), 'actors') || act.profile_image;
            const updateData = {
                fullname: document.getElementById('edit-act-fullname').value,
                dob: document.getElementById('edit-act-dob').value,
                bio: document.getElementById('edit-act-bio').value,
                profile_image: imgUrl
            };
            const { error: errUp } = await _supabase.from('actors').update(updateData).eq('id', id);
            if (errUp) throw errUp;
            hideModal();
            loadActors();
            loadGlobalCache();
        } catch (err) {
            toastError('Error updating actor: ' + err.message);
            submitBtn.disabled = false;
        }
    });
}

async function deleteActor(id) {
    if (!confirm('Delete this actor?')) return;
    await _supabase.from('actors').delete().eq('id', id);
    loadActors();
    loadGlobalCache();
}

// ==========================================
// SECTION 7: GENRES MANAGEMENT
// ==========================================
async function loadGenres() {
    const listBody = document.getElementById('genres-list-body');
    listBody.innerHTML = `<tr><td colspan="3" class="text-center">Loading genres...</td></tr>`;

    try {
        const { data, error } = await _supabase.from('genres').select('*').order('id', { ascending: false });
        if (error) throw error;

        if (!data || data.length === 0) {
            listBody.innerHTML = `<tr><td colspan="3" class="text-center">No genres registered.</td></tr>`;
            return;
        }

        listBody.innerHTML = '';
        data.forEach(g => {
            listBody.innerHTML += `
                <tr>
                    <td>${g.id}</td>
                    <td><strong>${escapeHtml(g.title)}</strong></td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-primary" onclick="editGenreModal(${g.id}, '${escapeHtml(g.title)}')"><i class="fa fa-edit"></i></button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteGenre(${g.id})"><i class="fa fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
    } catch (e) {
        listBody.innerHTML = `<tr><td colspan="3" class="text-center text-danger">Error: ${e.message}</td></tr>`;
    }
}

function addGenreModal() {
    const bodyHtml = `
        <form id="add-genre-form">
            <div class="form-group">
                <label>Genre Name</label>
                <input type="text" class="form-control" id="gen-new-title" required>
            </div>
            <div class="text-right">
                <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn btn-primary ml-2">Add Genre</button>
            </div>
        </form>
    `;
    showModal('Add Genre', bodyHtml);

    document.getElementById('add-genre-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const { error } = await _supabase.from('genres').insert([{ title: document.getElementById('gen-new-title').value }]);
        if (error) alert('Error: ' + error.message);
        else {
            hideModal();
            loadGenres();
            loadGlobalCache();
        }
    });
}

function editGenreModal(id, title) {
    const bodyHtml = `
        <form id="edit-genre-form">
            <div class="form-group">
                <label>Genre Name</label>
                <input type="text" class="form-control" id="gen-edit-title" value="${title}" required>
            </div>
            <div class="text-right">
                <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn btn-primary ml-2">Update Genre</button>
            </div>
        </form>
    `;
    showModal('Edit Genre', bodyHtml);

    document.getElementById('edit-genre-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const { error } = await _supabase.from('genres').update({ title: document.getElementById('gen-edit-title').value }).eq('id', id);
        if (error) alert('Error: ' + error.message);
        else {
            hideModal();
            loadGenres();
            loadGlobalCache();
        }
    });
}

async function deleteGenre(id) {
    if (!confirm('Delete this genre?')) return;
    await _supabase.from('genres').delete().eq('id', id);
    loadGenres();
    loadGlobalCache();
}

// ==========================================
// SECTION 8: LANGUAGES MANAGEMENT
// ==========================================
async function loadLanguages() {
    const listBody = document.getElementById('languages-list-body');
    listBody.innerHTML = `<tr><td colspan="4" class="text-center">Loading languages...</td></tr>`;

    try {
        const { data, error } = await _supabase.from('languages').select('*').order('id', { ascending: false });
        if (error) throw error;

        if (!data || data.length === 0) {
            listBody.innerHTML = `<tr><td colspan="4" class="text-center">No languages registered.</td></tr>`;
            return;
        }

        listBody.innerHTML = '';
        data.forEach(l => {
            listBody.innerHTML += `
                <tr>
                    <td>${l.id}</td>
                    <td><strong>${escapeHtml(l.title)}</strong></td>
                    <td><code>${escapeHtml(l.code)}</code></td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-primary" onclick="editLanguageModal(${l.id}, '${escapeHtml(l.title)}', '${escapeHtml(l.code)}')"><i class="fa fa-edit"></i></button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteLanguage(${l.id})"><i class="fa fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
    } catch (e) {
        listBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error: ${e.message}</td></tr>`;
    }
}

function addLanguageModal() {
    const bodyHtml = `
        <form id="add-lang-form">
            <div class="row">
                <div class="col-md-6 form-group">
                    <label>Title / VJ Name</label>
                    <input type="text" class="form-control" id="lang-new-title" required>
                </div>
                <div class="col-md-6 form-group">
                    <label>Language Code</label>
                    <input type="text" class="form-control" id="lang-new-code" required>
                </div>
            </div>
            <div class="text-right">
                <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn btn-primary ml-2">Add Language</button>
            </div>
        </form>
    `;
    showModal('Add Language', bodyHtml);

    document.getElementById('add-lang-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const { error } = await _supabase.from('languages').insert([{ 
            title: document.getElementById('lang-new-title').value,
            code: document.getElementById('lang-new-code').value
        }]);
        if (error) alert('Error: ' + error.message);
        else {
            hideModal();
            loadLanguages();
            loadGlobalCache();
        }
    });
}

function editLanguageModal(id, title, code) {
    const bodyHtml = `
        <form id="edit-lang-form">
            <div class="row">
                <div class="col-md-6 form-group">
                    <label>Title / VJ Name</label>
                    <input type="text" class="form-control" id="lang-edit-title" value="${title}" required>
                </div>
                <div class="col-md-6 form-group">
                    <label>Language Code</label>
                    <input type="text" class="form-control" id="lang-edit-code" value="${code}" required>
                </div>
            </div>
            <div class="text-right">
                <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn btn-primary ml-2">Update Language</button>
            </div>
        </form>
    `;
    showModal('Edit Language', bodyHtml);

    document.getElementById('edit-lang-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const { error } = await _supabase.from('languages').update({ 
            title: document.getElementById('lang-edit-title').value,
            code: document.getElementById('lang-edit-code').value
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
    if (!confirm('Delete this language?')) return;
    await _supabase.from('languages').delete().eq('id', id);
    loadLanguages();
    loadGlobalCache();
}

// ==========================================
// SECTION 9: LIVE TV CATEGORIES
// ==========================================
async function loadTVCategories() {
    const listBody = document.getElementById('tv-categories-list-body');
    listBody.innerHTML = `<tr><td colspan="3" class="text-center">Loading categories...</td></tr>`;

    try {
        const { data, error } = await _supabase.from('tv_categories').select('*').order('id', { ascending: false });
        if (error) throw error;

        if (!data || data.length === 0) {
            listBody.innerHTML = `<tr><td colspan="3" class="text-center">No categories.</td></tr>`;
            return;
        }

        listBody.innerHTML = '';
        data.forEach(cat => {
            listBody.innerHTML += `
                <tr>
                    <td><img src="${cat.image || ''}" class="rounded" width="40" height="40" onerror="this.src='./assets/img/placeholder-image.png'"></td>
                    <td><strong>${escapeHtml(cat.title)}</strong></td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-primary" onclick="editTVCategoryModal(${cat.id})"><i class="fa fa-edit"></i></button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteTVCategory(${cat.id})"><i class="fa fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
    } catch (e) {
        listBody.innerHTML = `<tr><td colspan="3" class="text-center text-danger">Error: ${e.message}</td></tr>`;
    }
}

function addTVCategoryModal() {
    const bodyHtml = `
        <form id="add-tvcat-form">
            <div class="form-group">
                <label>Category Title</label>
                <input type="text" class="form-control" id="tvcat-new-title" required>
            </div>
            <div class="form-group">
                <label>Category Image</label>
                <input type="file" class="form-control-file" id="tvcat-new-img" accept="image/*" required>
            </div>
            <div class="text-right">
                <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn btn-primary ml-2">Add Category</button>
            </div>
        </form>
    `;
    showModal('Add TV Category', bodyHtml);

    document.getElementById('add-tvcat-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const imgUrl = await uploadToSupabase(document.getElementById('tvcat-new-img'), 'livetv');
            const { error } = await _supabase.from('tv_categories').insert([{ 
                title: document.getElementById('tvcat-new-title').value,
                image: imgUrl
            }]);
            if (error) throw error;
            hideModal();
            loadTVCategories();
        } catch (err) {
            toastError('Error adding category: ' + err.message);
            submitBtn.disabled = false;
        }
    });
}

async function editTVCategoryModal(id) {
    const { data: cat, error } = await _supabase.from('tv_categories').select('*').eq('id', id).single();
    if (error || !cat) return;

    const bodyHtml = `
        <form id="edit-tvcat-form">
            <div class="form-group">
                <label>Category Title</label>
                <input type="text" class="form-control" id="tvcat-edit-title" value="${escapeHtml(cat.title)}" required>
            </div>
            <div class="form-group">
                <label>Category Image</label>
                <div><img src="${cat.image || ''}" class="img-thumbnail mb-2" style="max-height:80px;" onerror="this.src='./assets/img/placeholder-image.png'"></div>
                <input type="file" class="form-control-file" id="tvcat-edit-img" accept="image/*">
            </div>
            <div class="text-right">
                <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn btn-primary ml-2">Update Category</button>
            </div>
        </form>
    `;
    showModal(`Edit Category: ${cat.title}`, bodyHtml);

    document.getElementById('edit-tvcat-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const imgUrl = await uploadToSupabase(document.getElementById('tvcat-edit-img'), 'livetv') || cat.image;
            const { error: errUp } = await _supabase.from('tv_categories').update({ 
                title: document.getElementById('tvcat-edit-title').value,
                image: imgUrl
            }).eq('id', id);
            if (errUp) throw errUp;
            hideModal();
            loadTVCategories();
        } catch (err) {
            toastError('Error updating category: ' + err.message);
            submitBtn.disabled = false;
        }
    });
}

async function deleteTVCategory(id) {
    if (!confirm('Delete this TV category?')) return;
    await _supabase.from('tv_categories').delete().eq('id', id);
    loadTVCategories();
}

// ==========================================
// SECTION 10: LIVE TV CHANNELS
// ==========================================
async function loadTVChannels() {
    const listBody = document.getElementById('tv-channels-list-body');
    listBody.innerHTML = `<tr><td colspan="7" class="text-center">Loading TV channels...</td></tr>`;

    try {
        const { data: channels, error } = await _supabase.from('tv_channels').select('*').order('id', { ascending: false });
        const { data: categories } = await _supabase.from('tv_categories').select('*');
        if (error) throw error;

        if (!channels || channels.length === 0) {
            listBody.innerHTML = `<tr><td colspan="7" class="text-center">No channels registered.</td></tr>`;
            return;
        }

        listBody.innerHTML = '';
        channels.forEach(ch => {
            const catNames = ch.category_ids 
                ? ch.category_ids.split(',').map(id => categories?.find(c => c.id == id)?.title || id).join(', ') 
                : 'None';
            const streamType = ch.type === 1 ? 'Youtube ID' : 'M3U8 / Url';

            listBody.innerHTML += `
                <tr>
                    <td><img src="${ch.thumbnail || ''}" class="rounded" width="40" height="40" onerror="this.src='./assets/img/placeholder-image.png'"></td>
                    <td><strong>${escapeHtml(ch.title)}</strong></td>
                    <td>${catNames}</td>
                    <td><span class="badge badge-info">${streamType}</span></td>
                    <td style="max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"><code>${escapeHtml(ch.source)}</code></td>
                    <td>${ch.total_view || 0}</td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-primary" onclick="editTVChannelModal(${ch.id})"><i class="fa fa-edit"></i></button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteTVChannel(${ch.id})"><i class="fa fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
    } catch (e) {
        listBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error: ${e.message}</td></tr>`;
    }
}

async function addTVChannelModal() {
    const { data: categories } = await _supabase.from('tv_categories').select('*');

    const getCategoriesCheckboxes = () => {
        let html = '';
        categories?.forEach(cat => {
            html += `
                <div class="custom-control custom-checkbox custom-control-inline" style="margin-bottom:8px;">
                    <input type="checkbox" class="custom-control-input" id="tvCatCheck-${cat.id}" name="tv_categories_checkbox" value="${cat.id}">
                    <label class="custom-control-label" for="tvCatCheck-${cat.id}">${cat.title}</label>
                </div>
            `;
        });
        return html || 'No categories available.';
    };

    const bodyHtml = `
        <form id="add-tvch-form">
            <div class="row">
                <div class="col-md-6 form-group">
                    <label>Channel Name</label>
                    <input type="text" class="form-control" id="tvch-new-title" required>
                </div>
                <div class="col-md-6 form-group">
                    <label>Stream Type</label>
                    <select class="form-control" id="tvch-new-type">
                        <option value="0">M3U8 Stream URL</option>
                        <option value="1">Youtube Video ID</option>
                    </select>
                </div>
                <div class="col-md-12 form-group">
                    <label>Stream Source URL / ID</label>
                    <input type="text" class="form-control" id="tvch-new-source" required>
                </div>
                <div class="col-md-12 form-group">
                    <label class="d-block">Category Placements</label>
                    <div style="background:#f8f9fa; padding:10px; border-radius:5px; border:1px solid #ced4da;">
                        ${getCategoriesCheckboxes()}
                    </div>
                </div>
                <div class="col-md-6 form-group">
                    <label>Access Type</label>
                    <select class="form-control" id="tvch-new-access">
                        <option value="0">Free</option>
                        <option value="1">Premium</option>
                    </select>
                </div>
                <div class="col-md-6 form-group">
                    <label>Thumbnail Logo</label>
                    <input type="file" class="form-control-file" id="tvch-new-thumb" accept="image/*" required>
                </div>
            </div>
            <div class="text-right">
                <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn btn-primary ml-2">Add Channel</button>
            </div>
        </form>
    `;
    showModal('Add TV Channel', bodyHtml);

    document.getElementById('add-tvch-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const thumbUrl = await uploadToSupabase(document.getElementById('tvch-new-thumb'), 'livetv');
            const catsSelected = Array.from(document.querySelectorAll('input[name="tv_categories_checkbox"]:checked')).map(el => el.value).join(',');

            const insertData = {
                title: document.getElementById('tvch-new-title').value,
                source: document.getElementById('tvch-new-source').value,
                type: parseInt(document.getElementById('tvch-new-type').value),
                access_type: parseInt(document.getElementById('tvch-new-access').value),
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
            toastError('Error adding TV channel: ' + err.message);
            submitBtn.disabled = false;
        }
    });
}

async function editTVChannelModal(id) {
    const { data: ch, error } = await _supabase.from('tv_channels').select('*').eq('id', id).single();
    const { data: categories } = await _supabase.from('tv_categories').select('*');
    if (error || !ch) return;

    const selectedCats = ch.category_ids ? ch.category_ids.split(',') : [];

    const getCategoriesCheckboxes = () => {
        let html = '';
        categories?.forEach(cat => {
            const checked = selectedCats.includes(cat.id.toString()) ? 'checked' : '';
            html += `
                <div class="custom-control custom-checkbox custom-control-inline" style="margin-bottom:8px;">
                    <input type="checkbox" class="custom-control-input" id="tvCatCheck-${cat.id}" name="tv_categories_checkbox" value="${cat.id}" ${checked}>
                    <label class="custom-control-label" for="tvCatCheck-${cat.id}">${cat.title}</label>
                </div>
            `;
        });
        return html || 'No categories available.';
    };

    const bodyHtml = `
        <form id="edit-tvch-form">
            <div class="row">
                <div class="col-md-6 form-group">
                    <label>Channel Name</label>
                    <input type="text" class="form-control" id="tvch-edit-title" value="${escapeHtml(ch.title)}" required>
                </div>
                <div class="col-md-6 form-group">
                    <label>Stream Type</label>
                    <select class="form-control" id="tvch-edit-type">
                        <option value="0" ${ch.type === 0 ? 'selected' : ''}>M3U8 Stream URL</option>
                        <option value="1" ${ch.type === 1 ? 'selected' : ''}>Youtube Video ID</option>
                    </select>
                </div>
                <div class="col-md-12 form-group">
                    <label>Stream Source URL / ID</label>
                    <input type="text" class="form-control" id="tvch-edit-source" value="${escapeHtml(ch.source)}" required>
                </div>
                <div class="col-md-12 form-group">
                    <label class="d-block">Category Placements</label>
                    <div style="background:#f8f9fa; padding:10px; border-radius:5px; border:1px solid #ced4da;">
                        ${getCategoriesCheckboxes()}
                    </div>
                </div>
                <div class="col-md-6 form-group">
                    <label>Access Type</label>
                    <select class="form-control" id="tvch-edit-access">
                        <option value="0" ${ch.access_type === 0 ? 'selected' : ''}>Free</option>
                        <option value="1" ${ch.access_type === 1 ? 'selected' : ''}>Premium</option>
                    </select>
                </div>
                <div class="col-md-6 form-group">
                    <label>Thumbnail Logo</label>
                    <div><img src="${ch.thumbnail || ''}" class="img-thumbnail mb-2" style="max-height:80px;" onerror="this.src='./assets/img/placeholder-image.png'"></div>
                    <input type="file" class="form-control-file" id="tvch-edit-thumb" accept="image/*">
                </div>
            </div>
            <div class="text-right">
                <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn btn-primary ml-2">Update Channel</button>
            </div>
        </form>
    `;
    showModal(`Edit Channel: ${ch.title}`, bodyHtml);

    document.getElementById('edit-tvch-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const thumbUrl = await uploadToSupabase(document.getElementById('tvch-edit-thumb'), 'livetv') || ch.thumbnail;
            const catsSelected = Array.from(document.querySelectorAll('input[name="tv_categories_checkbox"]:checked')).map(el => el.value).join(',');

            const updateData = {
                title: document.getElementById('tvch-edit-title').value,
                source: document.getElementById('tvch-edit-source').value,
                type: parseInt(document.getElementById('tvch-edit-type').value),
                access_type: parseInt(document.getElementById('tvch-edit-access').value),
                category_ids: catsSelected,
                thumbnail: thumbUrl,
                updated_at: new Date().toISOString()
            };

            const { error: errUp } = await _supabase.from('tv_channels').update(updateData).eq('id', id);
            if (errUp) throw errUp;
            hideModal();
            loadTVChannels();
        } catch (err) {
            toastError('Error updating TV channel: ' + err.message);
            submitBtn.disabled = false;
        }
    });
}

async function deleteTVChannel(id) {
    if (!confirm('Delete this TV channel?')) return;
    await _supabase.from('tv_channels').delete().eq('id', id);
    loadTVChannels();
}

// ==========================================
// SECTION 11: NOTIFICATIONS HISTORY
// ==========================================
async function loadNotifications() {
    const listBody = document.getElementById('notification-list-body');
    listBody.innerHTML = `<tr><td colspan="4" class="text-center">Loading notification logs...</td></tr>`;

    try {
        const { data, error } = await _supabase.from('notifications').select('*').order('id', { ascending: false });
        if (error) throw error;

        if (!data || data.length === 0) {
            listBody.innerHTML = `<tr><td colspan="4" class="text-center">No notifications sent.</td></tr>`;
            return;
        }

        listBody.innerHTML = '';
        data.forEach(n => {
            const dateStr = n.created_at ? new Date(n.created_at).toLocaleString() : 'N/A';
            listBody.innerHTML += `
                <tr>
                    <td>${n.id}</td>
                    <td><strong>${escapeHtml(n.title)}</strong></td>
                    <td>${escapeHtml(n.description)}</td>
                    <td>${dateStr}</td>
                </tr>
            `;
        });
    } catch (e) {
        listBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error: ${e.message}</td></tr>`;
    }
}

function addNotificationModal() {
    const bodyHtml = `
        <form id="add-notif-form">
            <div class="form-group">
                <label>Notification Title</label>
                <input type="text" class="form-control" id="notif-title" required>
            </div>
            <div class="form-group">
                <label>Notification Body / Message</label>
                <textarea class="form-control" id="notif-desc" rows="4" required></textarea>
            </div>
            <div class="text-right">
                <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn btn-primary ml-2">Send Notification</button>
            </div>
        </form>
    `;
    showModal('Send Notification', bodyHtml);

    document.getElementById('add-notif-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const insertData = {
                title: document.getElementById('notif-title').value,
                description: document.getElementById('notif-desc').value
            };
            const { error } = await _supabase.from('notifications').insert([insertData]);
            if (error) throw error;
            
            // Note: In production, you would trigger OneSignal/FCM api endpoints to dispatch.
            toastSuccess('Notification saved successfully!');
            hideModal();
            loadNotifications();
        } catch (err) {
            toastError('Error: ' + err.message);
            submitBtn.disabled = false;
        }
    });
}

// ==========================================
// SECTION 12: ADMOB SETTINGS
// ==========================================
async function loadAdmobConfig() {
    const container = document.getElementById('admob-config-container');
    container.innerHTML = '<div class="col-12 text-center">Loading Admob...</div>';

    try {
        const { data, error } = await _supabase.from('admob').select('*').order('id', { ascending: true });
        if (error) throw error;

        container.innerHTML = '';
        data.forEach(ad => {
            const platform = ad.id === 1 ? 'Android Platform' : 'iOS Platform';
            container.innerHTML += `
                <div class="col-md-6 mb-4">
                    <form onsubmit="saveAdmobConfig(event, ${ad.id})">
                        <div class="card shadow-sm">
                            <div class="card-header bg-light"><h4>${platform}</h4></div>
                            <div class="card-body">
                                <div class="form-group">
                                    <label>Banner Ad ID</label>
                                    <input type="text" class="form-control" id="admob-banner-${ad.id}" value="${escapeHtml(ad.banner_id)}" required>
                                </div>
                                <div class="form-group">
                                    <label>Interstitial Ad ID</label>
                                    <input type="text" class="form-control" id="admob-inter-${ad.id}" value="${escapeHtml(ad.intersial_id)}" required>
                                </div>
                                <div class="form-group">
                                    <label>Rewarded Video Ad ID</label>
                                    <input type="text" class="form-control" id="admob-rewarded-${ad.id}" value="${escapeHtml(ad.rewarded_id)}" required>
                                </div>
                                <button type="submit" class="btn btn-primary"><i class="fa fa-save"></i> Save Admob Config</button>
                            </div>
                        </div>
                    </form>
                </div>
            `;
        });
    } catch (e) {
        container.innerHTML = `<div class="col-12 text-center text-danger">Error: ${e.message}</div>`;
    }
}

async function saveAdmobConfig(e, id) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;

    try {
        const updateData = {
            banner_id: document.getElementById(`admob-banner-${id}`).value,
            intersial_id: document.getElementById(`admob-inter-${id}`).value,
            rewarded_id: document.getElementById(`admob-rewarded-${id}`).value,
            updated_at: new Date().toISOString()
        };
        const { error } = await _supabase.from('admob').update(updateData).eq('id', id);
        if (error) throw error;
        toastSuccess('Admob configuration saved!');
    } catch (err) {
        toastError('Error: ' + err.message);
    } finally {
        btn.disabled = false;
    }
}

// ==========================================
// SECTION 13: CUSTOM ADS
// ==========================================
async function loadCustomAds() {
    const listBody = document.getElementById('custom-ads-list-body');
    listBody.innerHTML = `<tr><td colspan="9" class="text-center">Loading campaigns...</td></tr>`;

    try {
        const { data, error } = await _supabase.from('custom_ads').select('*').order('id', { ascending: false });
        if (error) throw error;

        if (!data || data.length === 0) {
            listBody.innerHTML = `<tr><td colspan="9" class="text-center">No ad campaigns found.</td></tr>`;
            return;
        }

        listBody.innerHTML = '';
        data.forEach(ad => {
            const target = [];
            if (ad.is_android === 1) target.push('Android');
            if (ad.is_ios === 1) target.push('iOS');
            
            const isStatusChecked = ad.status === 1 ? 'checked' : '';

            listBody.innerHTML += `
                <tr>
                    <td><img src="${ad.brand_logo || ''}" class="rounded" width="40" height="40" onerror="this.src='./assets/img/placeholder-image.png'"></td>
                    <td>
                        <strong>${escapeHtml(ad.title)}</strong>
                        <div style="font-size:0.75rem; color:#888;">Brand: ${escapeHtml(ad.brand_name)}</div>
                    </td>
                    <td>${target.join(', ') || 'None'}</td>
                    <td>${ad.start_date || 'Immediate'}</td>
                    <td>${ad.end_date || 'No Expiry'}</td>
                    <td>${ad.views || 0}</td>
                    <td>${ad.clicks || 0}</td>
                    <td>
                        <div class="custom-control custom-switch">
                            <input type="checkbox" class="custom-control-input" id="adSwitch-${ad.id}" ${isStatusChecked} onchange="toggleAdStatus(${ad.id}, ${ad.status})">
                            <label class="custom-control-label" for="adSwitch-${ad.id}"></label>
                        </div>
                    </td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-success" title="Media assets" onclick="manageAdMediaSources(${ad.id}, '${escapeHtml(ad.title)}')"><i class="fa fa-photo-film"></i></button>
                            <button class="btn btn-sm btn-outline-primary" onclick="editAdModal(${ad.id})"><i class="fa fa-edit"></i></button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteAd(${ad.id})"><i class="fa fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
    } catch (e) {
        listBody.innerHTML = `<tr><td colspan="9" class="text-center text-danger">Error: ${e.message}</td></tr>`;
    }
}

async function toggleAdStatus(id, val) {
    const newVal = val === 1 ? 0 : 1;
    await _supabase.from('custom_ads').update({ status: newVal }).eq('id', id);
    loadCustomAds();
}

function addCustomAdModal() {
    const bodyHtml = `
        <form id="add-ad-form">
            <div class="row">
                <div class="col-md-6 form-group">
                    <label>Campaign Title</label>
                    <input type="text" class="form-control" id="ad-title" required>
                </div>
                <div class="col-md-6 form-group">
                    <label>Brand / Advertiser Name</label>
                    <input type="text" class="form-control" id="ad-brand" required>
                </div>
                <div class="col-md-6 form-group">
                    <label>Action Button Text</label>
                    <input type="text" class="form-control" id="ad-btn" value="Learn More" required>
                </div>
                <div class="col-md-6 form-group">
                    <label>Android Destination URL</label>
                    <input type="text" class="form-control" id="ad-android-link">
                </div>
                <div class="col-md-6 form-group">
                    <label>iOS Destination URL</label>
                    <input type="text" class="form-control" id="ad-ios-link">
                </div>
                <div class="col-md-6 form-group">
                    <label>Brand Logo Image</label>
                    <input type="file" class="form-control-file" id="ad-logo" accept="image/*" required>
                </div>
                <div class="col-md-6 form-group">
                    <label>Start Date</label>
                    <input type="date" class="form-control" id="ad-start">
                </div>
                <div class="col-md-6 form-group">
                    <label>End Date</label>
                    <input type="date" class="form-control" id="ad-end">
                </div>
                <div class="col-md-6 form-group">
                    <label class="d-block">Target Platforms</label>
                    <div class="custom-control custom-checkbox custom-control-inline">
                        <input type="checkbox" class="custom-control-input" id="adTargetAndroid" checked>
                        <label class="custom-control-label" for="adTargetAndroid">Android</label>
                    </div>
                    <div class="custom-control custom-checkbox custom-control-inline">
                        <input type="checkbox" class="custom-control-input" id="adTargetiOS">
                        <label class="custom-control-label" for="adTargetiOS">iOS</label>
                    </div>
                </div>
            </div>
            <div class="text-right">
                <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn btn-primary ml-2">Create Campaign</button>
            </div>
        </form>
    `;
    showModal('Add Campaign', bodyHtml);

    document.getElementById('add-ad-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const logoUrl = await uploadToSupabase(document.getElementById('ad-logo'), 'ads');
            const insertData = {
                title: document.getElementById('ad-title').value,
                brand_name: document.getElementById('ad-brand').value,
                button_text: document.getElementById('ad-btn').value,
                android_link: document.getElementById('ad-android-link').value || null,
                ios_link: document.getElementById('ad-ios-link').value || null,
                brand_logo: logoUrl,
                start_date: document.getElementById('ad-start').value || null,
                end_date: document.getElementById('ad-end').value || null,
                is_android: document.getElementById('adTargetAndroid').checked ? 1 : 0,
                is_ios: document.getElementById('adTargetiOS').checked ? 1 : 0,
                status: 1,
                views: 0,
                clicks: 0
            };
            const { error } = await _supabase.from('custom_ads').insert([insertData]);
            if (error) throw error;
            hideModal();
            loadCustomAds();
        } catch (err) {
            toastError('Error adding campaign: ' + err.message);
            submitBtn.disabled = false;
        }
    });
}

async function editAdModal(id) {
    const { data: ad, error } = await _supabase.from('custom_ads').select('*').eq('id', id).single();
    if (error || !ad) return;

    const bodyHtml = `
        <form id="edit-ad-form">
            <div class="row">
                <div class="col-md-6 form-group">
                    <label>Campaign Title</label>
                    <input type="text" class="form-control" id="ad-title" value="${escapeHtml(ad.title)}" required>
                </div>
                <div class="col-md-6 form-group">
                    <label>Brand / Advertiser Name</label>
                    <input type="text" class="form-control" id="ad-brand" value="${escapeHtml(ad.brand_name)}" required>
                </div>
                <div class="col-md-6 form-group">
                    <label>Action Button Text</label>
                    <input type="text" class="form-control" id="ad-btn" value="${escapeHtml(ad.button_text)}" required>
                </div>
                <div class="col-md-6 form-group">
                    <label>Android Destination URL</label>
                    <input type="text" class="form-control" id="ad-android-link" value="${escapeHtml(ad.android_link || '')}">
                </div>
                <div class="col-md-6 form-group">
                    <label>iOS Destination URL</label>
                    <input type="text" class="form-control" id="ad-ios-link" value="${escapeHtml(ad.ios_link || '')}">
                </div>
                <div class="col-md-6 form-group">
                    <label>Brand Logo Image</label>
                    <div><img src="${ad.brand_logo || ''}" class="img-thumbnail mb-2" style="max-height:80px;" onerror="this.src='./assets/img/placeholder-image.png'"></div>
                    <input type="file" class="form-control-file" id="ad-logo" accept="image/*">
                </div>
                <div class="col-md-6 form-group">
                    <label>Start Date</label>
                    <input type="date" class="form-control" id="ad-start" value="${ad.start_date || ''}">
                </div>
                <div class="col-md-6 form-group">
                    <label>End Date</label>
                    <input type="date" class="form-control" id="ad-end" value="${ad.end_date || ''}">
                </div>
                <div class="col-md-6 form-group">
                    <label class="d-block">Target Platforms</label>
                    <div class="custom-control custom-checkbox custom-control-inline">
                        <input type="checkbox" class="custom-control-input" id="adTargetAndroid" ${ad.is_android === 1 ? 'checked' : ''}>
                        <label class="custom-control-label" for="adTargetAndroid">Android</label>
                    </div>
                    <div class="custom-control custom-checkbox custom-control-inline">
                        <input type="checkbox" class="custom-control-input" id="adTargetiOS" ${ad.is_ios === 1 ? 'checked' : ''}>
                        <label class="custom-control-label" for="adTargetiOS">iOS</label>
                    </div>
                </div>
            </div>
            <div class="text-right">
                <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn btn-primary ml-2">Update Campaign</button>
            </div>
        </form>
    `;
    showModal(`Edit Campaign: ${ad.title}`, bodyHtml);

    document.getElementById('edit-ad-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const logoUrl = await uploadToSupabase(document.getElementById('ad-logo'), 'ads') || ad.brand_logo;
            const updateData = {
                title: document.getElementById('ad-title').value,
                brand_name: document.getElementById('ad-brand').value,
                button_text: document.getElementById('ad-btn').value,
                android_link: document.getElementById('ad-android-link').value || null,
                ios_link: document.getElementById('ad-ios-link').value || null,
                brand_logo: logoUrl,
                start_date: document.getElementById('ad-start').value || null,
                end_date: document.getElementById('ad-end').value || null,
                is_android: document.getElementById('adTargetAndroid').checked ? 1 : 0,
                is_ios: document.getElementById('adTargetiOS').checked ? 1 : 0,
                updated_at: new Date().toISOString()
            };
            const { error: errUp } = await _supabase.from('custom_ads').update(updateData).eq('id', id);
            if (errUp) throw errUp;
            hideModal();
            loadCustomAds();
        } catch (err) {
            toastError('Error updating campaign: ' + err.message);
            submitBtn.disabled = false;
        }
    });
}

async function deleteAd(id) {
    if (!confirm('Delete this campaign?')) return;
    await _supabase.from('custom_ad_sources').delete().eq('custom_ad_id', id);
    await _supabase.from('custom_ads').delete().eq('id', id);
    loadCustomAds();
}

async function manageAdMediaSources(adCampaignId, campaignTitle) {
    const loadAdSources = async () => {
        const { data } = await _supabase.from('custom_ad_sources').select('*').eq('custom_ad_id', adCampaignId);
        const container = document.getElementById('ad-sources-list-block');
        if (!data || data.length === 0) {
            container.innerHTML = '<li class="list-group-item text-center text-muted">No media files linked.</li>';
            return;
        }
        container.innerHTML = '';
        data.forEach(src => {
            container.innerHTML += `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${escapeHtml(src.headline)}</strong>
                        <div style="font-size:0.75rem; color:#888;">Type: ${src.type === 1 ? 'Video' : 'Banner'} | File: ${escapeHtml(src.content)}</div>
                    </div>
                    <button class="btn btn-sm btn-danger" onclick="deleteAdMediaSource(${src.id}, ${adCampaignId}, '${escapeHtml(campaignTitle)}')"><i class="fa fa-trash"></i></button>
                </li>
            `;
        });
    };

    const bodyHtml = `
        <h6>Assets for: ${campaignTitle}</h6>
        <ul class="list-group mb-3" id="ad-sources-list-block"></ul>
        <hr>
        <form id="add-adsrc-form">
            <h6>Add Ad Asset</h6>
            <div class="row">
                <div class="col-md-6 form-group">
                    <label>Ad Type</label>
                    <select class="form-control" id="adsrc-type">
                        <option value="0">Banner Image</option>
                        <option value="1">Video Interstitial</option>
                    </select>
                </div>
                <div class="col-md-6 form-group">
                    <label>Headline</label>
                    <input type="text" class="form-control" id="adsrc-headline" required>
                </div>
                <div class="col-md-6 form-group">
                    <label>Skip Time (seconds)</label>
                    <input type="number" class="form-control" id="adsrc-skip" value="5" min="0" required>
                </div>
                <div class="col-md-6 form-group">
                    <label>Media File</label>
                    <input type="file" class="form-control-file" id="adsrc-file" accept="image/*,video/*" required>
                </div>
                <div class="col-md-12 form-group">
                    <label>Ad Description</label>
                    <input type="text" class="form-control" id="adsrc-desc" required>
                </div>
            </div>
            <button type="submit" class="btn btn-primary"><i class="fa fa-plus"></i> Add Media Asset</button>
        </form>
    `;
    showModal('Campaign Assets', bodyHtml);
    loadAdSources();

    document.getElementById('add-adsrc-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const adType = parseInt(document.getElementById('adsrc-type').value);
            const fileUrl = await uploadToSupabase(document.getElementById('adsrc-file'), 'ads');
            const insertData = {
                custom_ad_id: adCampaignId,
                type: adType,
                content: fileUrl,
                headline: document.getElementById('adsrc-headline').value,
                description: document.getElementById('adsrc-desc').value,
                show_time: parseInt(document.getElementById('adsrc-skip').value),
                is_skippable: 1
            };
            const { error } = await _supabase.from('custom_ad_sources').insert([insertData]);
            if (error) throw error;
            manageAdMediaSources(adCampaignId, campaignTitle);
        } catch (err) {
            toastError('Error adding asset: ' + err.message);
        }
    });
}

async function deleteAdMediaSource(id, adCampaignId, campaignTitle) {
    if (!confirm('Remove this asset?')) return;
    await _supabase.from('custom_ad_sources').delete().eq('id', id);
    manageAdMediaSources(adCampaignId, campaignTitle);
}

// ==========================================
// SECTION 14: SETTINGS MANAGEMENT
// ==========================================
async function loadSettings() {
    try {
        const { data, error } = await _supabase.from('global_settings').select('*').eq('id', 1).single();
        if (error || !data) return;

        document.getElementById('set-app-name').value = data.app_name || '';
        document.getElementById('set-video-skip').value = data.videoad_skip_time || 5;
        document.getElementById('set-live-tv').value = data.is_live_tv_enable.toString();
        document.getElementById('set-custom-android').value = data.is_custom_android.toString();
        document.getElementById('set-custom-ios').value = data.is_custom_ios.toString();
        document.getElementById('set-admob-android').value = data.is_admob_android.toString();
        document.getElementById('set-admob-ios').value = data.is_admob_ios.toString();
        
        // Populating new App Update fields
        document.getElementById('set-app-version').value = data.app_version || '1';
        document.getElementById('set-force-update').value = (data.is_force_update || 0).toString();
        document.getElementById('set-app-link').value = data.app_link || '';
        document.getElementById('set-app-update-desc').value = data.app_update_desc || '';
        document.getElementById('set-worker-domain').value = data.worker_domain || '';

        // Worker connection tester logic
        const testBtn = document.getElementById('btn-test-worker');
        const workerInput = document.getElementById('set-worker-domain');
        const badge = document.getElementById('worker-status-badge');

        const testWorkerConnection = async (workerUrl) => {
            if (!workerUrl || workerUrl.trim() === '') {
                badge.textContent = 'No URL Provided';
                badge.className = 'badge badge-warning text-dark';
                return;
            }
            badge.textContent = 'Testing...';
            badge.className = 'badge badge-info text-light';
            try {
                const cleanUrl = workerUrl.replace(/\/$/, '') + '/status';
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

                const res = await fetch(cleanUrl, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (!res.ok) throw new Error('HTTP ' + res.status);
                const statusData = await res.json();
                
                if (statusData && statusData.status === 'online') {
                    badge.textContent = 'Online / Verified';
                    badge.className = 'badge badge-success text-light';
                } else {
                    badge.textContent = 'Invalid Response';
                    badge.className = 'badge badge-danger text-light';
                }
            } catch (err) {
                badge.textContent = 'Offline / Error: ' + err.message;
                badge.className = 'badge badge-danger text-light';
            }
        };

        testBtn.onclick = (e) => {
            e.preventDefault();
            testWorkerConnection(workerInput.value);
        };

        // Auto-run verification check on load
        if (data.worker_domain) {
            testWorkerConnection(data.worker_domain);
        }

        document.getElementById('setting-form').onsubmit = async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = true;

            try {
                const updateData = {
                    app_name: document.getElementById('set-app-name').value,
                    videoad_skip_time: parseInt(document.getElementById('set-video-skip').value),
                    is_live_tv_enable: parseInt(document.getElementById('set-live-tv').value),
                    is_custom_android: parseInt(document.getElementById('set-custom-android').value),
                    is_custom_ios: parseInt(document.getElementById('set-custom-ios').value),
                    is_admob_android: parseInt(document.getElementById('set-admob-android').value),
                    is_admob_ios: parseInt(document.getElementById('set-admob-ios').value),
                    
                    // Saving new App Update fields
                    app_version: document.getElementById('set-app-version').value,
                    is_force_update: parseInt(document.getElementById('set-force-update').value),
                    app_link: document.getElementById('set-app-link').value,
                    app_update_desc: document.getElementById('set-app-update-desc').value,
                    worker_domain: document.getElementById('set-worker-domain').value,
                    
                    updated_at: new Date().toISOString()
                };
                const { error: errUp } = await _supabase.from('global_settings').update(updateData).eq('id', 1);
                if (errUp) throw errUp;
                toastSuccess('Settings saved successfully!');
            } catch (err) {
                toastError('Error: ' + err.message);
            } finally {
                btn.disabled = false;
            }
        };
    } catch (e) {
        console.error("Settings error:", e);
    }
}

// ==========================================
// SECTION 15: PRIVACY POLICY & TERMS
// ==========================================
async function loadPrivacyPolicy() {
    try {
        const { data, error } = await _supabase.from('tbl_pages').select('*').eq('id', 1).single();
        if (error || !data) return;

        document.getElementById('privacy-text').value = data.privacy || '';

        document.getElementById('privacy-form').onsubmit = async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = true;

            try {
                const { error: errUp } = await _supabase.from('tbl_pages').update({
                    privacy: document.getElementById('privacy-text').value,
                    updated_at: new Date().toISOString()
                }).eq('id', 1);
                if (errUp) throw errUp;
                toastSuccess('Privacy Policy saved!');
            } catch (err) {
                toastError('Error: ' + err.message);
            } finally {
                btn.disabled = false;
            }
        };
    } catch (e) {
        console.error("Privacy policy error:", e);
    }
}

async function loadTermsOfUse() {
    try {
        const { data, error } = await _supabase.from('tbl_pages').select('*').eq('id', 1).single();
        if (error || !data) return;

        document.getElementById('terms-text').value = data.termsofuse || '';

        document.getElementById('terms-form').onsubmit = async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = true;

            try {
                const { error: errUp } = await _supabase.from('tbl_pages').update({
                    termsofuse: document.getElementById('terms-text').value,
                    updated_at: new Date().toISOString()
                }).eq('id', 1);
                if (errUp) throw errUp;
                toastSuccess('Terms of Use saved!');
            } catch (err) {
                toastError('Error: ' + err.message);
            } finally {
                btn.disabled = false;
            }
        };
    } catch (e) {
        console.error("Terms error:", e);
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

