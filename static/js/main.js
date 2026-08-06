// ==========================================================================
// Terra Battle Visualizer - Frontend State Management & Render Logic
// ==========================================================================

const state = {
    lang: 'en',
    activeTab: 'dashboard',
    activePlaylist: 'BGM',

    // Loaded Data Arrays
    characters: [],
    buddies: [],
    items: [],
    skills: [],
    stages: [],
    strings: {},
    audio: { BGM: [], SE: [] },
    assets: [],

    // UI Selection
    selectedCharacter: null,
    selectedJobIndex: 0,
    currentChapter: null
};

// Character Rarity Map (ID -> String)
const rarityLabels = {
    2: 'D Class',
    3: 'C Class',
    4: 'B Class',
    5: 'A Class',
    6: 'S Class',
    7: 'SS Class',
    8: 'Z Class'
};

// Species translations helper
const speciesTranslations = {
    0: { en: 'Human', ja: 'ヒト', fr: 'Humain', de: 'Mensch', es: 'Humano', zh_tw: '人族' },
    1: { en: 'Lizardfolk', ja: 'トカゲ', fr: 'Saurien', de: 'Echsenvolk', es: 'Lagarto', zh_tw: '爬蟲族' },
    2: { en: 'Beastfolk', ja: 'ケモノ', fr: 'Sauvage', de: 'Biestvolk', es: 'Bestia', zh_tw: '獸人族' },
    3: { en: 'Stonefolk', ja: '岩人', fr: 'Rocheux', de: 'Steinvolk', es: 'Pétreo', zh_tw: '岩人族' }
};

// Weapons metadata & SVG Icons
const weaponMeta = {
    0: { name: 'Staff', color: '#c084fc', svg: `<img src="/api/assets/image?path=user-data/extracted-gamedata/ui_icons/icon_wand_02.png" alt="Staff" style="width: 14px; height: 14px; object-fit: contain; vertical-align: middle; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">` },
    1: { name: 'Sword', color: '#f87171', svg: `<img src="/api/assets/image?path=user-data/extracted-gamedata/ui_icons/icon_sword_02.png" alt="Sword" style="width: 14px; height: 14px; object-fit: contain; vertical-align: middle; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">` },
    2: { name: 'Spear', color: '#60a5fa', svg: `<img src="/api/assets/image?path=user-data/extracted-gamedata/ui_icons/icon_spear_02.png" alt="Spear" style="width: 14px; height: 14px; object-fit: contain; vertical-align: middle; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">` },
    3: { name: 'Bow', color: '#34d399', svg: `<img src="/api/assets/image?path=user-data/extracted-gamedata/ui_icons/icon_bow_02.png" alt="Bow" style="width: 14px; height: 14px; object-fit: contain; vertical-align: middle; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">` },
    4: { name: 'None', color: '#9ca3af', svg: `<img src="/api/assets/image?path=user-data/extracted-gamedata/ui_icons/icon_other_02.png" alt="None" style="width: 14px; height: 14px; object-fit: contain; vertical-align: middle; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">` }
};

// Elements metadata & SVG Icons
const elementMeta = {
    0: { name: 'None', color: '#6b7280', svg: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;"><circle cx="12" cy="12" r="8" stroke-dasharray="2 2"></circle></svg>` },
    1: { name: 'Fire', color: '#fb923c', svg: `<img src="/api/assets/image?path=user-data/extracted-gamedata/element_icons/icon_m_fire.png" alt="Fire" style="width: 14px; height: 14px; object-fit: contain; vertical-align: middle; border-radius: 50%; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">` },
    2: { name: 'Ice', color: '#38bdf8', svg: `<img src="/api/assets/image?path=user-data/extracted-gamedata/element_icons/icon_m_ice.png" alt="Ice" style="width: 14px; height: 14px; object-fit: contain; vertical-align: middle; border-radius: 50%; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">` },
    3: { name: 'Lightning', color: '#fde047', svg: `<img src="/api/assets/image?path=user-data/extracted-gamedata/element_icons/icon_m_thunder.png" alt="Lightning" style="width: 14px; height: 14px; object-fit: contain; vertical-align: middle; border-radius: 50%; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">` },
    4: { name: 'Darkness', color: '#c084fc', svg: `<img src="/api/assets/image?path=user-data/extracted-gamedata/element_icons/icon_m_darkness.png" alt="Darkness" style="width: 14px; height: 14px; object-fit: contain; vertical-align: middle; border-radius: 50%; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">` },
    5: { name: 'Healing', color: '#22c55e', svg: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;"><path d="M12 5v14M5 12h14" stroke="#22c55e" stroke-width="3"></path></svg>` },
    6: { name: 'Remedy', color: '#06b6d4', svg: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;"><rect x="5" y="9" width="14" height="10" rx="2"></rect><path d="M9 9V5a2 2 0 0 1 4 0v4"></path><circle cx="12" cy="14" r="2" fill="currentColor"></circle></svg>` },
    17: { name: 'Photon', color: '#fbbf24', svg: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;"><circle cx="12" cy="12" r="5" fill="currentColor"></circle><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l1.5 1.5M17.5 17.5l1.5 1.5M5 19l1.5-1.5M17.5 6.5l1.5-1.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>` },
    18: { name: 'Graviton', color: '#818cf8', svg: `<img src="/api/assets/image?path=user-data/extracted-gamedata/ui_icons/gravity.png" alt="Graviton" style="width: 14px; height: 14px; object-fit: contain; vertical-align: middle; border-radius: 50%; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">` },
    21: { name: 'Solar', color: '#fda4af', svg: `<img src="/api/assets/image?path=user-data/extracted-gamedata/ui_icons/sun_02.png" alt="Solar" style="width: 14px; height: 14px; object-fit: contain; vertical-align: middle; border-radius: 50%; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">` },
    22: { name: 'Lunar', color: '#e9d5ff', svg: `<img src="/api/assets/image?path=user-data/extracted-gamedata/ui_icons/moon_01.png" alt="Lunar" style="width: 14px; height: 14px; object-fit: contain; vertical-align: middle; border-radius: 50%; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">` }
};

// Generate job weapon/element mini badges HTML
function getJobBadgesHtml(job) {
    if (!job) return '';
    const weap = weaponMeta[job.Attrib] || weaponMeta[4];
    const elem = elementMeta[job.SkillAttrib] || elementMeta[0];

    return `
        <div class="job-mini-badge" style="display: flex; align-items: center; gap: 4px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); border-radius: 6px; padding: 2px 6px; font-size: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.2);" title="Job Name: ${job.name || 'Unnamed'}&#10;Weapon: ${weap.name}&#10;Element: ${elem.name}">
            <span style="color: ${weap.color}; display: flex; align-items: center;">
                ${weap.svg}
            </span>
            <span style="color: var(--text-muted); font-size: 8px; opacity: 0.5; font-weight: normal; margin: 0 1px;">|</span>
            <span style="color: ${elem.color}; display: flex; align-items: center;">
                ${elem.svg}
            </span>
        </div>
    `;
}

// Document Elements
const els = {
    langSelect: document.getElementById('lang-select'),
    navItems: document.querySelectorAll('.nav-item'),
    tabContents: document.querySelectorAll('.tab-content'),
    currentTabTitle: document.getElementById('current-tab-title'),
    currentTabDesc: document.getElementById('current-tab-desc'),

    // Dashboard Stats
    statCharacters: document.getElementById('stat-count-characters'),
    statBuddies: document.getElementById('stat-count-buddies'),
    statSkills: document.getElementById('stat-count-skills'),
    statItems: document.getElementById('stat-count-items'),
    statStages: document.getElementById('stat-count-stages'),
    statAudio: document.getElementById('stat-count-audio'),

    // Search Inputs
    charSearch: document.getElementById('char-search'),
    buddySearch: document.getElementById('buddy-search'),
    skillSearch: document.getElementById('skill-search'),
    itemSearch: document.getElementById('item-search'),
    chapterSearch: document.getElementById('chapter-search'),
    audioSearch: document.getElementById('audio-search'),
    assetSearch: document.getElementById('asset-search'),

    // Select Filters
    charSpeciesFilter: document.getElementById('char-filter-species'),
    charRarityFilter: document.getElementById('char-filter-rarity'),
    charWeaponFilter: document.getElementById('char-filter-weapon'),
    charElementFilter: document.getElementById('char-filter-element'),
    buddyRarityFilter: document.getElementById('buddy-filter-rarity'),
    assetCategoryFilter: document.getElementById('asset-filter-category'),
    assetSignatureFilter: document.getElementById('asset-filter-signature'),

    // Grids & Tables Container
    charactersGrid: document.getElementById('characters-grid'),
    buddiesGrid: document.getElementById('buddies-grid'),
    skillsTableBody: document.getElementById('skills-table-body'),
    itemsGrid: document.getElementById('items-grid'),
    chaptersListContainer: document.getElementById('chapters-list-container'),
    stagesPlaceholder: document.getElementById('stages-placeholder'),
    stagesDetailContainer: document.getElementById('stages-detail-container'),
    detailChapterTitle: document.getElementById('detail-chapter-title'),
    chapterStagesList: document.getElementById('chapter-stages-list'),

    // Audio Player Elements
    playlistContainer: document.getElementById('playlist-container'),
    playlistTabBtns: document.querySelectorAll('.playlist-tab-btn'),
    audioPlayer: document.getElementById('main-audio-player'),
    trackName: document.getElementById('player-track-name'),
    trackFilename: document.getElementById('player-track-filename'),
    trackCategory: document.getElementById('player-track-category'),
    visualization: document.querySelector('.player-visualization'),

    // Asset Table Container
    assetsTableBody: document.getElementById('assets-table-body'),

    // Character Modal Elements
    charModal: document.getElementById('char-modal'),
    modalCloseBtn: document.getElementById('char-modal-close'),
    modalCharSpecies: document.getElementById('modal-char-species'),
    modalCharName: document.getElementById('modal-char-name'),
    modalCharGender: document.getElementById('modal-char-gender'),
    modalCharRarity: document.getElementById('modal-char-rarity'),
    modalJobProfile: document.getElementById('modal-job-profile'),
    modalJobPiecePath: document.getElementById('modal-job-piece-path'),
    modalJobIllustPath: document.getElementById('modal-job-illust-path'),
    modalJobPieceImg: document.getElementById('modal-job-piece-img'),
    modalJobIllustImg: document.getElementById('modal-job-illust-img'),
    lightboxModal: document.getElementById('lightbox-modal'),
    lightboxClose: document.getElementById('lightbox-close'),
    lightboxImg: document.getElementById('lightbox-img'),
    modalJobHP: document.getElementById('modal-job-hp'),
    modalJobATK: document.getElementById('modal-job-atk'),
    modalJobDEF: document.getElementById('modal-job-def'),
    modalJobMATK: document.getElementById('modal-job-matk'),
    modalJobMDEF: document.getElementById('modal-job-mdef'),
    modalJobSkillsList: document.getElementById('modal-job-skills-list'),
    modalJobAttributes: document.getElementById('modal-job-attributes'),
    modalTabJob1: document.getElementById('modal-tab-job1'),
    modalTabJob2: document.getElementById('modal-tab-job2'),
    modalTabJob3: document.getElementById('modal-tab-job3'),
    modalJobUnlockBox: document.getElementById('modal-job-unlock-box'),
    modalJobUnlockCoinRow: document.getElementById('modal-job-unlock-coin-row'),
    modalJobUnlockCoin: document.getElementById('modal-job-unlock-coin'),
    modalJobUnlockMaterialsList: document.getElementById('modal-job-unlock-materials-list'),
    itemModal: document.getElementById('item-modal'),
    itemModalClose: document.getElementById('item-modal-close'),
    modalItemImg: document.getElementById('modal-item-img'),
    modalItemName: document.getElementById('modal-item-name'),
    modalItemDesc: document.getElementById('modal-item-desc'),
    modalItemObtainingList: document.getElementById('modal-item-obtaining-list'),
    modalItemUsesList: document.getElementById('modal-item-uses-list')
};

// Initial App Bootstrapping
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    registerEventListeners();
    await fetchAllData();
    updateDashboardStats();
    populateSpeciesFilter();
    renderActiveTab();

    // Hide loading overlay
    const loader = document.getElementById('loading-overlay');
    if (loader) {
        loader.classList.add('hidden');
    }
}

// Event Listeners Registration
function registerEventListeners() {
    // Language Selector Event
    els.langSelect.addEventListener('change', (e) => {
        state.lang = e.target.value;
        renderActiveTab();
    });

    // Sidebar Tabs Event
    els.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = item.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // Dashboard Card Click Trigger Events
    document.querySelectorAll('.stat-card').forEach(card => {
        card.addEventListener('click', () => {
            const tabName = card.getAttribute('data-tab-trigger');
            if (tabName) switchTab(tabName);
        });
    });

    // Modal Close Events
    els.modalCloseBtn.addEventListener('click', closeModal);
    els.charModal.addEventListener('click', (e) => {
        if (e.target === els.charModal) closeModal();
    });

    els.itemModalClose.addEventListener('click', closeItemModal);
    els.itemModal.addEventListener('click', (e) => {
        if (e.target === els.itemModal) closeItemModal();
    });

    // Lightbox Image Preview Events
    const openLightbox = (src) => {
        if (!src) return;
        els.lightboxImg.src = src;
        els.lightboxModal.classList.remove('hidden');
    };

    const closeLightbox = () => {
        els.lightboxModal.classList.add('hidden');
        els.lightboxImg.src = '';
    };

    els.modalJobPieceImg.addEventListener('click', () => openLightbox(els.modalJobPieceImg.src));
    els.modalJobIllustImg.addEventListener('click', () => openLightbox(els.modalJobIllustImg.src));

    els.lightboxClose.addEventListener('click', closeLightbox);
    els.lightboxModal.addEventListener('click', (e) => {
        if (e.target === els.lightboxModal || e.target === els.lightboxClose || e.target.tagName === 'I') {
            closeLightbox();
        }
    });

    // Character Modal Job Tabs Toggle
    [els.modalTabJob1, els.modalTabJob2, els.modalTabJob3].forEach(tabBtn => {
        tabBtn.addEventListener('click', () => {
            document.querySelectorAll('.modal-tab-btn').forEach(btn => btn.classList.remove('active'));
            tabBtn.classList.add('active');
            state.selectedJobIndex = parseInt(tabBtn.getAttribute('data-job-index'));
            renderJobDetails();
        });
    });

    // Inputs Filtering Events
    els.charSearch.addEventListener('input', renderCharacters);
    els.charSpeciesFilter.addEventListener('change', renderCharacters);
    els.charRarityFilter.addEventListener('change', renderCharacters);
    els.charWeaponFilter.addEventListener('change', renderCharacters);
    els.charElementFilter.addEventListener('change', renderCharacters);

    els.buddySearch.addEventListener('input', renderBuddies);
    els.buddyRarityFilter.addEventListener('change', renderBuddies);

    els.skillSearch.addEventListener('input', renderSkills);
    els.itemSearch.addEventListener('input', renderItems);
    els.chapterSearch.addEventListener('input', renderChaptersList);
    els.audioSearch.addEventListener('input', renderPlaylist);

    els.assetSearch.addEventListener('input', renderAssets);
    els.assetCategoryFilter.addEventListener('change', renderAssets);
    els.assetSignatureFilter.addEventListener('change', renderAssets);

    // Playlist Category Selector Tab Trigger
    els.playlistTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            els.playlistTabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.activePlaylist = btn.getAttribute('data-playlist');
            renderPlaylist();
        });
    });

    // Audio Equalizer Visualizer triggers
    els.audioPlayer.addEventListener('play', () => {
        els.visualization.classList.add('playing');
    });
    els.audioPlayer.addEventListener('pause', () => {
        els.visualization.classList.remove('playing');
    });
    els.audioPlayer.addEventListener('ended', () => {
        els.visualization.classList.remove('playing');
    });
}

// Fetch APIs parallelly
async function fetchAllData() {
    try {
        const endpoints = {
            characters: '/api/characters',
            buddies: '/api/buddies',
            items: '/api/items',
            skills: '/api/skills',
            stages: '/api/stages',
            strings: '/api/strings',
            audio: '/api/audio',
            assets: '/api/assets'
        };

        const [chars, buds, items, skills, stages, strings, audio, assets] = await Promise.all(
            Object.values(endpoints).map(url => fetch(url).then(res => res.json()))
        );

        state.characters = chars;
        state.buddies = buds;
        state.items = items;
        state.skills = skills;
        state.stages = stages;
        state.strings = strings;
        state.audio = audio;
        state.assets = assets;

        console.log("All game databases successfully loaded.");
    } catch (e) {
        console.error("Error fetching gamedata APIs:", e);
    }
}

// Switch tabs and set URL anchors
function switchTab(tabName) {
    state.activeTab = tabName;

    // Update active nav links
    els.navItems.forEach(item => {
        if (item.getAttribute('data-tab') === tabName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Update tab view visibility
    els.tabContents.forEach(content => {
        if (content.getAttribute('id') === `tab-${tabName}`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });

    // Tab Header Labels
    const titles = {
        dashboard: { title: 'Dashboard Overview', desc: 'High-level statistics and category index of the exported game gamedata.' },
        characters: { title: 'Characters Database', desc: 'Browse character stats, unlock jobs, active skills, and local art assets.' },
        buddies: { title: 'Companions (Buddies)', desc: 'Explore the companion stats, description profiles, and thumbnails.' },
        skills: { title: 'Skills Catalog', desc: 'List of active skills, status triggers, powers, and area calculations.' },
        items: { title: 'Items Inventory', desc: 'Browse equipment, job evolve materials, tokens, and materials.' },
        stages: { title: 'Chapters & Stages', desc: 'Select chapters to view sections, recommended levels, enemy detail and drops.' },
        audio: { title: 'Audio Asset Player', desc: 'Stream background music and sound effects directly extracted from the game files.' },
        assets: { title: 'Asset Files Inventory', desc: 'Browse all loaded resources inside local-input, size stats and containers.' }
    };

    if (titles[tabName]) {
        els.currentTabTitle.textContent = titles[tabName].title;
        els.currentTabDesc.textContent = titles[tabName].desc;
    }

    renderActiveTab();
}

function renderActiveTab() {
    switch (state.activeTab) {
        case 'dashboard':
            // Dashboard values updated on fetch completion
            break;
        case 'characters':
            renderCharacters();
            break;
        case 'buddies':
            renderBuddies();
            break;
        case 'skills':
            renderSkills();
            break;
        case 'items':
            renderItems();
            break;
        case 'stages':
            renderChaptersList();
            break;
        case 'audio':
            renderPlaylist();
            break;
        case 'assets':
            renderAssets();
            break;
    }
}

// Populating Stats counters
function updateDashboardStats() {
    els.statCharacters.textContent = state.characters.length || 0;
    els.statBuddies.textContent = state.buddies.length || 0;
    els.statSkills.textContent = state.skills.length || 0;
    els.statItems.textContent = state.items.length || 0;
    els.statStages.textContent = state.stages.length || 0;

    const bgmCount = state.audio.BGM ? state.audio.BGM.length : 0;
    const seCount = state.audio.SE ? state.audio.SE.length : 0;
    els.statAudio.textContent = `${bgmCount} BGM / ${seCount} SE`;
}

function populateSpeciesFilter() {
    // Fill character species options from our translations mapping
    els.charSpeciesFilter.innerHTML = '<option value="">All Species</option>';
    Object.entries(speciesTranslations).forEach(([id, trans]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = trans[state.lang] || trans['en'];
        els.charSpeciesFilter.appendChild(option);
    });
}

// Fetch Translation string helper
function getLocalizedString(stringObj, fallback = '-') {
    if (!stringObj) return fallback;
    return stringObj[state.lang] || stringObj['en'] || stringObj['ja'] || fallback;
}

// --------------------------------------------------------------------------
// CHARACTERS RENDERING
// --------------------------------------------------------------------------
function renderCharacters() {
    const query = els.charSearch.value.toLowerCase();
    const species = els.charSpeciesFilter.value;
    const rarity = els.charRarityFilter.value;
    const weapon = els.charWeaponFilter.value;
    const element = els.charElementFilter.value;

    els.charactersGrid.innerHTML = '';

    const filtered = state.characters.filter(char => {
        // Match Search Query (matches local Name, ID, or job profiles)
        const nameMatches = getLocalizedString(char.NameString).toLowerCase().includes(query) ||
            (char.ID && char.ID.toString().includes(query)) ||
            (char.JobsInfo && char.JobsInfo.some(job => 
                (job.name && job.name.toLowerCase().includes(query)) ||
                (job.ProfileString && getLocalizedString(job.ProfileString).toLowerCase().includes(query))
            ));

        // Match Species Filter
        const speciesMatches = species === '' || char.Species == species;

        // Match Rarity Filter
        const rarityMatches = rarity === '' || char.rarity == rarity;

        // Match Weapon Filter (matches if any of the character's jobs uses this weapon)
        const weaponMatches = weapon === '' || (char.JobsInfo && char.JobsInfo.some(job => job.Attrib == weapon));

        // Match Element Filter (matches if any of the character's jobs has this element)
        const elementMatches = element === '' || (char.JobsInfo && char.JobsInfo.some(job => job.SkillAttrib == element));

        return nameMatches && speciesMatches && rarityMatches && weaponMatches && elementMatches;
    });

    if (filtered.length === 0) {
        els.charactersGrid.innerHTML = '<p class="stages-panel-placeholder" style="grid-column: 1/-1;">No characters match the selected filters.</p>';
        return;
    }

    filtered.forEach(char => {
        const card = document.createElement('div');
        card.className = 'card-item';

        const firstJob = char.JobsInfo && char.JobsInfo.length > 0 ? char.JobsInfo[0] : null;
        const pieceUrl = firstJob && firstJob.piece_file ? `/api/assets/image?path=${encodeURIComponent(firstJob.piece_file)}` : null;

        const cardImageHtml = pieceUrl ?
            `<div class="card-image" style="width: 100%; background-color: rgba(0, 0, 0, 0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; border: 1px solid var(--border-color); overflow: hidden;">` +
            `<img src="${pieceUrl}" alt="Icon" style="width: 100%; height: 100%; object-fit: cover;">` +
            `</div>` :
            `<div class="card-image-placeholder"><i class="fa-solid fa-user-shield"></i></div>`;

        const jobsHtml = char.JobsInfo && char.JobsInfo.length > 0 ?
            `<div class="card-jobs-row" style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px;">` +
            char.JobsInfo.map(job => getJobBadgesHtml(job)).join('') +
            `</div>` : '';

        card.innerHTML = `
            <span class="card-badge badge-rarity">${rarityLabels[char.rarity] || 'Class ' + char.rarity}</span>
            ${cardImageHtml}
            <h4 class="card-name">${getLocalizedString(char.NameString)}</h4>
            <div class="card-meta"><span><i class="fa-solid fa-circle-nodes"></i> ID: ${char.ID}</span>
            </div>
            ${jobsHtml}
        `;
        card.addEventListener('click', () => openCharacterModal(char));
        els.charactersGrid.appendChild(card);
    });
}

// --------------------------------------------------------------------------
// BUDDIES RENDERING
// --------------------------------------------------------------------------
function renderBuddies() {
    const query = els.buddySearch.value.toLowerCase();
    const rarity = els.buddyRarityFilter.value;

    els.buddiesGrid.innerHTML = '';

    const filtered = state.buddies.filter(buddy => {
        const nameMatches = getLocalizedString(buddy.NameString).toLowerCase().includes(query) ||
            getLocalizedString(buddy.DescString).toLowerCase().includes(query);
        const rarityMatches = rarity === '' || buddy.rarity == rarity;
        return nameMatches && rarityMatches;
    });

    if (filtered.length === 0) {
        els.buddiesGrid.innerHTML = '<p class="stages-panel-placeholder" style="grid-column: 1/-1;">No companions match the selected filters.</p>';
        return;
    }

    filtered.forEach(buddy => {
        const card = document.createElement('div');
        card.className = 'card-item';

        const thumbUrl = buddy.thumb_file ? `/api/assets/image?path=${encodeURIComponent(buddy.thumb_file)}` : null;

        const cardImageHtml = thumbUrl ?
            `<div class="card-image" style="width: 100%; background-color: rgba(0, 0, 0, 0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; border: 1px solid var(--border-color); overflow: hidden;">` +
            `<img src="${thumbUrl}" alt="Companion" style="width: 100%; height: 100%; object-fit: cover;">` +
            `</div>` :
            `<div class="card-image-placeholder"><i class="fa-solid fa-paw"></i></div>`;

        card.innerHTML = `
            <span class="card-badge badge-rarity">${rarityLabels[buddy.rarity] || 'Class ' + buddy.rarity}</span>
            ${cardImageHtml}
            <h4 class="card-name">${getLocalizedString(buddy.NameString)}</h4>
            <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.4; margin-bottom: 12px; height: 3.2em; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                ${getLocalizedString(buddy.DescString)}
            </p>
            <div class="card-meta">
                <span><i class="fa-solid fa-heart"></i> HP +${buddy.HP || 0}</span>
                <span><i class="fa-solid fa-bolt"></i> ATK +${buddy.ATK || 0}</span>
            </div>
            <div class="card-details-row">
                <span style="font-size: 10px; word-break: break-all; font-family: monospace; color: var(--accent-blue);">
                    Thumb: ${buddy.thumb_file ? buddy.thumb_file.split('/').pop() : 'None'}
                </span>
            </div>
        `;
        els.buddiesGrid.appendChild(card);
    });
}

// --------------------------------------------------------------------------
// SKILLS RENDERING
// --------------------------------------------------------------------------
function renderSkills() {
    const query = els.skillSearch.value.toLowerCase();
    els.skillsTableBody.innerHTML = '';

    const filtered = state.skills.filter(skill => {
        return (skill.nameString && getLocalizedString(skill.nameString).toLowerCase().includes(query)) ||
            (skill.descString && getLocalizedString(skill.descString).toLowerCase().includes(query)) ||
            (skill.iconNo && skill.iconNo.toString().includes(query));
    });

    if (filtered.length === 0) {
        els.skillsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No skills matched the search.</td></tr>';
        return;
    }

    // Render top 150 skills to keep performance solid
    const maxRender = 150;
    filtered.slice(0, maxRender).forEach((skill, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><code>${skill.iconNo || index}</code></td>
            <td><strong style="color: var(--text-primary); font-family: var(--font-heading);">${getLocalizedString(skill.nameString)}</strong></td>
            <td>${skill.emitRatio || 0}%</td>
            <td><span class="badge" style="background-color: rgba(99, 102, 241, 0.08); border-color: rgba(99, 102, 241, 0.2); color: var(--accent-indigo);">${skill.attrib || 'None'}</span></td>
            <td><span class="badge" style="background-color: rgba(236, 72, 153, 0.08); border-color: rgba(236, 72, 153, 0.2); color: var(--accent-pink);">${getLocalizedString(skill.rangePrefixString, 'Self')}</span></td>
            <td style="max-width: 320px; line-height: 1.4;">${getLocalizedString(skill.descString)}</td>
        `;
        els.skillsTableBody.appendChild(row);
    });
}

// --------------------------------------------------------------------------
// ITEMS RENDERING
// --------------------------------------------------------------------------
function renderItems() {
    const query = els.itemSearch.value.toLowerCase();
    els.itemsGrid.innerHTML = '';

    const filtered = state.items.filter(item => {
        return getLocalizedString(item.NameString).toLowerCase().includes(query) ||
            getLocalizedString(item.DescString).toLowerCase().includes(query);
    });

    if (filtered.length === 0) {
        els.itemsGrid.innerHTML = '<p class="stages-panel-placeholder" style="grid-column: 1/-1;">No items found.</p>';
        return;
    }

    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card-item';
        card.style.padding = '16px';

        // Build image HTML: use the icon_url path directly
        const imgHtml = item.icon_url
            ? `<img
                src="${item.icon_url}"
                alt="${getLocalizedString(item.NameString)}"
                style="width:64px;height:64px;object-fit:contain;image-rendering:pixelated;"
                onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
               />
               <div class="card-image-placeholder" style="height:64px;display:none;">
                   <i class="fa-solid fa-gem" style="font-size:20px;"></i>
               </div>`
            : `<div class="card-image-placeholder" style="height:64px;">
                   <i class="fa-solid fa-gem" style="font-size:20px;"></i>
               </div>`;

        // Find the index of this item in the global items list for display
        const itemIndex = state.items.indexOf(item);

        card.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;margin-bottom:10px;min-height:64px;">
                ${imgHtml}
            </div>
            <h5 class="card-name" style="font-size: 14px;">${getLocalizedString(item.NameString)}</h5>
            <p style="font-size: 11px; color: var(--text-secondary); line-height: 1.4; margin-top: 4px; flex-grow: 1;">
                ${getLocalizedString(item.DescString)}
            </p>
            <div class="card-details-row" style="margin-top: 8px; padding-top: 6px;">
                <span>ID: ${itemIndex}</span>
                <span>Sort: ${item.sortOrder || 0}</span>
            </div>
        `;
        card.addEventListener('click', () => openItemModal(itemIndex + 1));
        els.itemsGrid.appendChild(card);
    });
}

// --------------------------------------------------------------------------
// CHAPTERS & STAGES RENDERING
// --------------------------------------------------------------------------
function renderChaptersList() {
    const query = els.chapterSearch.value.toLowerCase();
    els.chaptersListContainer.innerHTML = '';

    const filtered = state.stages.filter(ch => {
        const name = getChapterName(ch.chapterNo);
        return name.toLowerCase().includes(query) || ch.chapterNo.toString().includes(query);
    });

    if (filtered.length === 0) {
        els.chaptersListContainer.innerHTML = '<p style="text-align: center; padding: 12px; color: var(--text-muted); font-size: 13px;">No chapters match.</p>';
        return;
    }

    filtered.forEach(ch => {
        const btn = document.createElement('button');
        btn.className = 'chapter-btn';
        if (state.currentChapter && state.currentChapter.chapterNo === ch.chapterNo) {
            btn.classList.add('active');
        }

        btn.innerHTML = `
            <span>${getChapterName(ch.chapterNo)}</span>
            <span class="badge" style="font-size: 9px; padding: 2px 6px;">${ch.sections ? ch.sections.length : 0} Sect</span>
        `;
        btn.addEventListener('click', () => {
            document.querySelectorAll('.chapter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentChapter = ch;
            renderStagesDetail();
        });
        els.chaptersListContainer.appendChild(btn);
    });
}

function getChapterName(chapterNo) {
    // Match in scenarioSet if index is valid
    if (state.strings && state.strings.scenarioSet) {
        // Chapters are typically 1-indexed matching entries 0 onwards
        const entry = state.strings.scenarioSet[chapterNo - 1];
        if (entry) return getLocalizedString(entry);
    }
    return `Chapter ${chapterNo}`;
}

function translateStageTitle(rawTitle) {
    if (!rawTitle) return "Section Details";

    // Pattern: [るつぼの都] トカゲ - 14
    const match = rawTitle.match(/^\[(.*?)\]\s*(.*?)\s*-\s*(\d+)$/);
    if (match) {
        const chName = match[1];
        const speciesName = match[2];
        const num = match[3];

        // 1. Chapter Name Lookup
        let chTrans = chName;
        if (state.strings && state.strings.scenarioSet) {
            // Find an entry where ja matches chapter title name
            const entry = state.strings.scenarioSet.find(x => x.ja && x.ja.includes(chName));
            if (entry && entry[state.lang]) {
                // Strip prefix if any, e.g. "第3章 " -> "" or "Ch 3: " -> ""
                chTrans = entry[state.lang].replace(/^Ch\s*\d+:\s*/i, "").replace(/^第\d+章\s*/, "");
            }
        }

        // 2. Species Name Lookup
        let spTrans = speciesName;
        const speciesMap = {
            "ヒト": { en: "Human", ja: "ヒト", fr: "Humain", de: "Mensch", es: "Humano", zh_tw: "人族" },
            "トカゲ": { en: "Lizardfolk", ja: "トカゲ", fr: "Saurien", de: "Echsenvolk", es: "Lagarto", zh_tw: "爬蟲族" },
            "ケモノ": { en: "Beastfolk", ja: "ケモノ", fr: "Sauvage", de: "Biestvolk", es: "Bestia", zh_tw: "獸人族" },
            "岩人": { en: "Stonefolk", ja: "岩人", fr: "Rocheux", de: "Steinvolk", es: "Pétreo", zh_tw: "岩人族" }
        };

        if (speciesMap[speciesName] && speciesMap[speciesName][state.lang]) {
            spTrans = speciesMap[speciesName][state.lang];
        }

        return `[${chTrans}] ${spTrans} - ${num}`;
    }
    return rawTitle;
}

// Global waves registry to reference when drawing the board
window.stageWavesRegistry = window.stageWavesRegistry || {};

function renderStagesDetail() {
    if (!state.currentChapter) return;

    els.stagesPlaceholder.classList.add('hidden');
    els.stagesDetailContainer.classList.remove('hidden');
    els.detailChapterTitle.textContent = getChapterName(state.currentChapter.chapterNo);
    els.chapterStagesList.innerHTML = '';

    const sections = state.currentChapter.sections || [];
    if (sections.length === 0) {
        els.chapterStagesList.innerHTML = '<p class="stages-panel-placeholder">No stages/sections registered in this chapter.</p>';
        return;
    }

    sections.forEach((sec, idx) => {
        const item = document.createElement('div');
        item.className = 'stage-item-card';

        // Match drop items & companions
        const dropItems = sec.itemID ? `Drop Item ID: ${sec.itemID} (${sec.itemCount || 1})` : 'No Item Drops';
        // Build a human‑readable companion‑drops string
        let buddiesStr = '';
        if (Array.isArray(sec.dropBuddies) && sec.dropBuddies.length) {
            // If the array contains objects, try to pull a meaningful field (e.g., name or id)
            const parts = sec.dropBuddies.map(b => {
                if (typeof b === 'object' && b !== null) {
                    // Prefer a `name` property, fall back to `id` or JSON string
                    return b.name || b.id || JSON.stringify(b);
                }
                return String(b);
            });
            buddiesStr = `Companion Drops: ${parts.join(', ')}`;
        } else {
            buddiesStr = 'No Companion Drops';
        }
        const sectionRegistryKey = `ch${state.currentChapter.chapterNo}_sec${idx + 1}`;
        window.stageWavesRegistry[sectionRegistryKey] = sec.waves_details || [];

        item.innerHTML = `
            <div class="stage-item-header">
                <span class="stage-item-title">${translateStageTitle(sec.title)}</span>
                <span class="badge badge-rarity">Stamina: ${sec.rawStamina || 0}</span>
            </div>
            <div class="stage-meta-row" style="margin-bottom: 12px;">
                <span><i class="fa-solid fa-layer-group"></i> Battles: ${sec.battleCnt || 0} Waves</span>
                <span><i class="fa-solid fa-circle-exclamation"></i> Rec. Level: ${sec.assumedLevel || '-'}</span>
                <span><i class="fa-solid fa-coins"></i> Coins: ${sec.coins || 0}</span>
            </div>
            <div style="font-size: 12px; color: var(--text-muted); display: flex; flex-direction: column; gap: 4px; border-top: 1px solid var(--border-color); padding-top: 10px;">
                <span><i class="fa-solid fa-gem"></i> ${dropItems}</span>
                <span><i class="fa-solid fa-paw"></i> ${buddiesStr}</span>
            </div>
            
            <div class="stage-layout-expander">
                <button class="toggle-layout-btn" onclick="toggleStageLayout(this, '${sectionRegistryKey}')">
                    <i class="fa-solid fa-map"></i> View Wave & Grid Layouts
                </button>
                <div class="stage-layout-content hidden" id="layout-${sectionRegistryKey}">
                    <!-- Tabs go here -->
                    <div class="wave-tabs" id="tabs-${sectionRegistryKey}"></div>
                    
                    <!-- Board grid & Enemy details -->
                    <div class="wave-layout-workspace">
                        <div class="board-grid-wrapper">
                            <div class="board-grid" id="board-${sectionRegistryKey}"></div>
                        </div>
                        <div class="wave-enemies-list" id="enemies-list-${sectionRegistryKey}"></div>
                    </div>
                </div>
            </div>
        `;
        els.chapterStagesList.appendChild(item);
    });
}

function toggleStageLayout(button, registryKey) {
    const container = document.getElementById(`layout-${registryKey}`);
    if (!container) return;

    const isHidden = container.classList.contains('hidden');
    if (isHidden) {
        container.classList.remove('hidden');
        button.innerHTML = `<i class="fa-solid fa-map-open"></i> Hide Wave & Grid Layouts`;
        initStageLayout(registryKey);
    } else {
        container.classList.add('hidden');
        button.innerHTML = `<i class="fa-solid fa-map"></i> View Wave & Grid Layouts`;
    }
}

function initStageLayout(registryKey) {
    const waves = window.stageWavesRegistry[registryKey] || [];
    const tabsContainer = document.getElementById(`tabs-${registryKey}`);
    const boardContainer = document.getElementById(`board-${registryKey}`);
    const listContainer = document.getElementById(`enemies-list-${registryKey}`);

    if (!tabsContainer || !boardContainer || !listContainer) return;

    tabsContainer.innerHTML = '';

    if (waves.length === 0) {
        boardContainer.innerHTML = '<div style="grid-column: span 6; grid-row: span 8; display: flex; align-items: center; justify-content: center; font-size: 11px; color: var(--text-muted); height: 100%;">No wave data found for this stage.</div>';
        listContainer.innerHTML = '<p style="font-size: 11px; color: var(--text-muted); text-align: center; margin-top: 20px;">No enemy list available.</p>';
        return;
    }

    // Create tabs for each wave
    waves.forEach((wave, idx) => {
        const tab = document.createElement('button');
        tab.className = `wave-tab-btn ${idx === 0 ? 'active' : ''}`;
        tab.innerHTML = `<i class="fa-solid fa-circle-play"></i> Wave ${wave.wave_index}`;
        tab.onclick = () => {
            tabsContainer.querySelectorAll('.wave-tab-btn').forEach(btn => btn.classList.remove('active'));
            tab.classList.add('active');
            drawWaveBoard(registryKey, idx);
        };
        tabsContainer.appendChild(tab);
    });

    drawWaveBoard(registryKey, 0);
}

function drawWaveBoard(registryKey, waveIndex) {
    const waves = window.stageWavesRegistry[registryKey] || [];
    const wave = waves[waveIndex];
    const boardContainer = document.getElementById(`board-${registryKey}`);
    const listContainer = document.getElementById(`enemies-list-${registryKey}`);

    if (!wave || !boardContainer || !listContainer) return;

    boardContainer.innerHTML = '';
    listContainer.innerHTML = '';

    const enemies = wave.enemies || [];
    const enemyMap = {};
    enemies.forEach(enemy => {
        const key = `${enemy.x},${enemy.y}`;
        enemyMap[key] = enemy;
    });

    // Generate the 6x8 board (8 rows, 6 columns)
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 6; x++) {
            const cell = document.createElement('div');
            cell.className = 'board-cell';
            cell.setAttribute('data-coord', `${x},${y}`);

            const enemy = enemyMap[`${x},${y}`];
            if (enemy) {
                cell.classList.add('has-enemy');

                const token = document.createElement('div');
                token.className = 'enemy-token';

                const isBoss = enemy.enemy_var.includes('BAKUROU') || enemy.enemy_var.includes('CHAMP') || enemy.enemy_var.includes('KING') || (enemy.HP && enemy.HP > 1000);
                if (isBoss) {
                    token.classList.add('boss');
                    token.textContent = 'B';
                } else {
                    token.textContent = 'E';
                }

                const enemyName = enemy.NameString?.[state.lang] || enemy.NameString?.en || enemy.enemy_var;

                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip-content';
                tooltip.innerHTML = `
                    <div class="tooltip-title">${enemyName}</div>
                    <div class="tooltip-stat-row"><span>Level:</span><span class="tooltip-stat-val">Lv ${enemy.LV || '?'}</span></div>
                    <div class="tooltip-stat-row"><span>HP:</span><span class="tooltip-stat-val">${enemy.HP || '?'}</span></div>
                    <div class="tooltip-stat-row"><span>ATK:</span><span class="tooltip-stat-val">${enemy.ATK || '?'}</span></div>
                    <div class="tooltip-stat-row"><span>DEF:</span><span class="tooltip-stat-val">${enemy.DEF || '?'}</span></div>
                    <div class="tooltip-stat-row"><span>Coord:</span><span class="tooltip-stat-val">(${x}, ${y})</span></div>
                `;

                token.appendChild(tooltip);
                cell.appendChild(token);
            }
            boardContainer.appendChild(cell);
        }
    }

    if (enemies.length === 0) {
        listContainer.innerHTML = '<p style="font-size: 11px; color: var(--text-muted); text-align: center; margin-top: 20px;">No enemies spawn in this wave.</p>';
        return;
    }

    enemies.forEach(enemy => {
        const item = document.createElement('div');
        item.className = 'wave-enemy-item';

        const enemyName = enemy.NameString?.[state.lang] || enemy.NameString?.en || enemy.enemy_var;

        item.innerHTML = `
            <div class="wave-enemy-name-col">
                <span class="wave-enemy-name-text">${enemyName}</span>
                <span class="wave-enemy-stat-badge">Lv ${enemy.LV || '?'} | HP: ${enemy.HP || '?'}</span>
            </div>
            <div class="wave-enemy-coord-col">(${enemy.x}, ${enemy.y})</div>
        `;
        listContainer.appendChild(item);
    });
}

// --------------------------------------------------------------------------
// AUDIO PLAYER RENDERING
// --------------------------------------------------------------------------
function renderPlaylist() {
    const query = els.audioSearch.value.toLowerCase();
    els.playlistContainer.innerHTML = '';

    const tracks = state.audio[state.activePlaylist] || [];
    const filtered = tracks.filter(t => t.name.toLowerCase().includes(query) || t.filename.toLowerCase().includes(query));

    if (filtered.length === 0) {
        els.playlistContainer.innerHTML = '<p style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 13px;">No audio assets found.</p>';
        return;
    }

    filtered.forEach(track => {
        const btn = document.createElement('button');
        btn.className = 'playlist-item';

        // Highlight active track
        if (els.audioPlayer.src && els.audioPlayer.src.includes(track.filename)) {
            btn.classList.add('active');
        }

        const sizeMb = (track.size_bytes / (1024 * 1024)).toFixed(2);
        btn.innerHTML = `
            <div style="text-align: left;">
                <strong style="display: block; font-family: var(--font-heading); font-size: 14px;">${track.name}</strong>
                <span style="font-size: 10px; font-family: monospace; color: var(--text-muted);">${track.filename}</span>
            </div>
            <span class="audio-duration">${sizeMb} MB</span>
        `;

        btn.addEventListener('click', () => {
            document.querySelectorAll('.playlist-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Set Player state labels
            els.trackName.textContent = track.name;
            els.trackFilename.textContent = track.filename;
            els.trackCategory.textContent = state.activePlaylist;

            // Stream audio from backend
            els.audioPlayer.src = `/api/play/${state.activePlaylist.toLowerCase()}/${track.filename}`;
            els.audioPlayer.play();
        });
        els.playlistContainer.appendChild(btn);
    });
}

// --------------------------------------------------------------------------
// ASSETS BROWSER RENDERING
// --------------------------------------------------------------------------
function renderAssets() {
    const query = els.assetSearch.value.toLowerCase();
    const category = els.assetCategoryFilter.value;
    const signature = els.assetSignatureFilter.value;

    els.assetsTableBody.innerHTML = '';

    const filtered = state.assets.filter(asset => {
        const textMatches = asset.filename.toLowerCase().includes(query) ||
            asset.path.toLowerCase().includes(query);
        const catMatches = category === '' || asset.category === category;
        const sigMatches = signature === '' || asset.signature.includes(signature);
        return textMatches && catMatches && sigMatches;
    });

    if (filtered.length === 0) {
        els.assetsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No assets in local-input match your search.</td></tr>';
        return;
    }

    // Top 200 assets to prevent memory freeze
    filtered.slice(0, 200).forEach(asset => {
        const sizeMb = (asset.size_bytes / (1024 * 1024)).toFixed(2);
        const row = document.createElement('tr');

        const isEncrypted = asset.signature.includes("ENCA");
        const sigBadge = isEncrypted ?
            `<span class="badge" style="background-color: rgba(236, 72, 153, 0.08); border-color: rgba(236, 72, 153, 0.2); color: var(--accent-pink);">${asset.signature}</span>` :
            `<span class="badge" style="background-color: rgba(56, 189, 248, 0.08); border-color: rgba(56, 189, 248, 0.2); color: var(--accent-blue);">${asset.signature}</span>`;

        row.innerHTML = `
            <td><strong style="font-family: var(--font-heading); color: var(--text-primary);">${asset.category}</strong></td>
            <td><span style="font-family: monospace; font-size: 12px;">${asset.filename}</span></td>
            <td>${sigBadge}</td>
            <td>${sizeMb} MB</td>
            <td><code>${asset.path}</code></td>
        `;
        els.assetsTableBody.appendChild(row);
    });
}

// --------------------------------------------------------------------------
// MODAL DETAILS: CHARACTERS
// --------------------------------------------------------------------------
function openCharacterModal(char) {
    state.selectedCharacter = char;
    state.selectedJobIndex = 0;

    // Set active tab to job 1
    els.modalTabJob1.classList.add('active');
    els.modalTabJob2.classList.remove('active');
    els.modalTabJob3.classList.remove('active');

    // Update labels
    const speciesTrans = speciesTranslations[char.Species];
    els.modalCharSpecies.textContent = speciesTrans ? (speciesTrans[state.lang] || speciesTrans['en']) : 'Unknown';
    els.modalCharName.textContent = getLocalizedString(char.NameString);
    els.modalCharGender.innerHTML = `<i class="fa-solid fa-venus-mars"></i> Gender: ${char.Gender === 1 ? 'Male' : (char.Gender === 2 ? 'Female' : 'Unknown')}`;
    els.modalCharRarity.innerHTML = `<i class="fa-solid fa-star"></i> Class: ${rarityLabels[char.rarity] || 'Class ' + char.rarity}`;

    // Check how many jobs the character has
    const jobs = char.JobsInfo || [];
    if (jobs.length > 1) {
        els.modalTabJob2.classList.remove('hidden');
    } else {
        els.modalTabJob2.classList.add('hidden');
    }
    if (jobs.length > 2) {
        els.modalTabJob3.classList.remove('hidden');
    } else {
        els.modalTabJob3.classList.add('hidden');
    }

    renderJobDetails();
    els.charModal.classList.remove('hidden');
}

function renderJobDetails() {
    if (!state.selectedCharacter) return;

    const jobs = state.selectedCharacter.JobsInfo || [];
    const job = jobs[state.selectedJobIndex];

    if (!job) {
        els.modalJobProfile.textContent = 'Job variant details missing.';
        if (els.modalJobAttributes) els.modalJobAttributes.innerHTML = '';
        els.modalJobPiecePath.textContent = '-';
        els.modalJobIllustPath.textContent = '-';
        els.modalJobPieceImg.classList.add('hidden');
        els.modalJobIllustImg.classList.add('hidden');
        els.modalJobHP.textContent = '-';
        els.modalJobATK.textContent = '-';
        els.modalJobDEF.textContent = '-';
        els.modalJobMATK.textContent = '-';
        els.modalJobMDEF.textContent = '-';
        if (els.modalJobUnlockBox) els.modalJobUnlockBox.classList.add('hidden');
        if (els.modalJobUnlockMaterialsList) els.modalJobUnlockMaterialsList.innerHTML = '';
        els.modalJobSkillsList.innerHTML = '';
        return;
    }

    // Set profile text and assets
    els.modalJobProfile.textContent = getLocalizedString(job.ProfileString, 'Profile description not available.');
    if (els.modalJobAttributes) {
        const weap = weaponMeta[job.Attrib] || weaponMeta[4];
        const elem = elementMeta[job.SkillAttrib] || elementMeta[0];

        els.modalJobAttributes.innerHTML = `
            <span class="badge" style="background-color: rgba(255, 255, 255, 0.02); border-color: ${weap.color}44; color: ${weap.color}; display: flex; align-items: center; gap: 6px; font-size: 11px; padding: 4px 10px; text-transform: none; font-weight: 500; border-radius: 8px;">
                ${weap.svg} <span style="font-weight: 600;">${weap.name}</span>
            </span>
            <span class="badge" style="background-color: rgba(255, 255, 255, 0.02); border-color: ${elem.color}44; color: ${elem.color}; display: flex; align-items: center; gap: 6px; font-size: 11px; padding: 4px 10px; text-transform: none; font-weight: 500; border-radius: 8px;">
                ${elem.svg} <span style="font-weight: 600;">${elem.name}</span>
            </span>
        `;
    }
    els.modalJobPiecePath.textContent = job.piece_file || 'File Not Found in Pieces/';
    els.modalJobIllustPath.textContent = job.illust_file || 'File Not Found in Illust/';

    if (job.piece_file) {
        els.modalJobPieceImg.src = `/api/assets/image?path=${encodeURIComponent(job.piece_file)}`;
        els.modalJobPieceImg.classList.remove('hidden');
    } else {
        els.modalJobPieceImg.classList.add('hidden');
    }

    if (job.illust_file) {
        els.modalJobIllustImg.src = `/api/assets/image?path=${encodeURIComponent(job.illust_file)}`;
        els.modalJobIllustImg.classList.remove('hidden');
    } else {
        els.modalJobIllustImg.classList.add('hidden');
    }

    // Set stats
    els.modalJobHP.textContent = job.HP || 0;
    els.modalJobATK.textContent = job.ATK || 0;
    els.modalJobDEF.textContent = job.DEF || 0;
    els.modalJobMATK.textContent = job.SATK || 0;
    els.modalJobMDEF.textContent = job.SDEF || 0;

    // Render unlock materials
    if (state.selectedJobIndex > 0) {
        let hasUnlockRequirements = false;
        
        // Handle Coin Cost
        const coinCost = job.unlock_coin || 0;
        if (coinCost > 0) {
            els.modalJobUnlockCoin.textContent = coinCost.toLocaleString();
            els.modalJobUnlockCoinRow.classList.remove('hidden');
            hasUnlockRequirements = true;
        } else {
            els.modalJobUnlockCoinRow.classList.add('hidden');
        }
        
        // Handle Materials
        els.modalJobUnlockMaterialsList.innerHTML = '';
        const materials = job.unlock_materials || [];
        if (materials.length > 0) {
            materials.forEach(mat => {
                const li = document.createElement('li');
                li.style.display = 'flex';
                li.style.alignItems = 'center';
                li.style.justifyContent = 'space-between';
                li.style.padding = '8px 0';
                li.style.borderBottom = '1px solid var(--border-color)';
                li.style.cursor = 'pointer';
                li.title = "Click to view item details & drop locations";
                li.addEventListener('click', () => {
                    closeModal();
                    openItemModal(mat.item_id);
                });
                
                const nameStr = getLocalizedString(mat.name);
                const imgHtml = mat.icon_url ? 
                    `<img src="${mat.icon_url}" alt="${nameStr}" style="width: 24px; height: 24px; object-fit: contain; image-rendering: pixelated; margin-right: 8px; border-radius: 4px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05);" />` : '';
                
                li.innerHTML = `
                    <div style="display: flex; align-items: center;">
                        ${imgHtml}
                        <span>${nameStr}</span>
                    </div>
                    <span style="font-weight: 600; color: var(--accent-blue);">x ${mat.count}</span>
                `;
                els.modalJobUnlockMaterialsList.appendChild(li);
            });
            hasUnlockRequirements = true;
        }
        
        if (hasUnlockRequirements) {
            els.modalJobUnlockBox.classList.remove('hidden');
        } else {
            els.modalJobUnlockBox.classList.add('hidden');
        }
    } else {
        els.modalJobUnlockBox.classList.add('hidden');
    }

    // Renders skills
    els.modalJobSkillsList.innerHTML = '';
    const skillIDs = job.skills || [];
    const skillLevels = job.skillMasterLevel || [];

    if (skillIDs.length === 0) {
        els.modalJobSkillsList.innerHTML = '<li style="color: var(--text-muted);">No skills learned by this job.</li>';
    } else {
        skillIDs.forEach((skillID, index) => {
            const skill = state.skills[skillID];
            const unlockLv = skillLevels[index] || 1;
            const li = document.createElement('li');
            li.style.marginBottom = '12px';
            if (skill) {
                li.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                        <strong style="color: var(--accent-blue);">${getLocalizedString(skill.nameString)}</strong>
                        <span class="badge" style="font-size: 10px; padding: 2px 6px; background-color: rgba(56, 189, 248, 0.08); border-color: rgba(56, 189, 248, 0.2); color: var(--accent-blue);">Lv ${unlockLv}</span>
                    </div>
                    <span style="font-size: 11px; color: var(--text-muted);">Trigger: ${skill.emitRatio || 0}%</span>
                    <p style="font-size: 12px; color: var(--text-secondary); margin-top: 4px; line-height: 1.4;">${getLocalizedString(skill.descString)}</p>
                `;
            } else {
                li.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: var(--text-muted);">Unknown Skill (ID: ${skillID})</span>
                        <span class="badge" style="font-size: 10px; padding: 2px 6px; background-color: rgba(239, 68, 68, 0.08); border-color: rgba(239, 68, 68, 0.2); color: var(--accent-red);">Lv ${unlockLv}</span>
                    </div>
                `;
            }
            els.modalJobSkillsList.appendChild(li);
        });
    }
}

function closeModal() {
    els.charModal.classList.add('hidden');
    state.selectedCharacter = null;
}

async function openItemModal(itemId) {
    try {
        const res = await fetch(`/api/item/${itemId}`);
        const data = await res.json();
        
        // Populate basic info
        els.modalItemName.textContent = getLocalizedString(data.name);
        els.modalItemDesc.textContent = getLocalizedString(data.desc, 'No description available.');
        
        if (data.icon_url) {
            els.modalItemImg.src = data.icon_url;
            els.modalItemImg.style.display = 'block';
        } else {
            els.modalItemImg.style.display = 'none';
        }
        
        // 1. Populate Obtaining List
        els.modalItemObtainingList.innerHTML = '';
        
        const stages = data.dropped_in_stages || [];
        if (stages.length === 0) {
            els.modalItemObtainingList.innerHTML = '<li style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px 0;">No obtaining sources found in main stages.</li>';
        } else {
            stages.forEach(st => {
                const li = document.createElement('li');
                li.style.padding = '10px 0';
                li.style.borderBottom = '1px solid var(--border-color)';
                
                const translatedTitle = translateStageTitle(st.section_title);
                
                let detailsHtml = '';
                if (st.is_section_drop) {
                    detailsHtml += `<span class="badge" style="background-color: rgba(34, 197, 94, 0.08); border-color: rgba(34, 197, 94, 0.2); color: #22c55e; font-size: 10px; margin-top: 4px;">Section Reward x${st.section_drop_count}</span>`;
                }
                
                if (st.spawning_enemies && st.spawning_enemies.length > 0) {
                    const enemiesHtml = st.spawning_enemies.map(enemy => {
                        const name = getLocalizedString(enemy.enemy_name, 'Unknown Enemy');
                        return `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px; display: flex; justify-content: space-between;">
                            <span><i class="fa-solid fa-skull" style="margin-right: 6px; font-size: 11px;"></i>${name}</span>
                            <span style="color: var(--accent-pink); font-weight: 500;">Chance: ${enemy.rate}%</span>
                        </div>`;
                    }).join('');
                    detailsHtml += `<div style="margin-top: 4px; padding-left: 8px; border-left: 2px solid rgba(255,255,255,0.05);">${enemiesHtml}</div>`;
                }
                
                li.innerHTML = `
                    <div style="font-weight: 600; color: var(--text-primary); display: flex; justify-content: space-between; align-items: center; font-size: 13px;">
                        <span>Chapter ${st.chapter_no} - Section ${st.section_index}</span>
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${translatedTitle}</div>
                    ${detailsHtml}
                `;
                els.modalItemObtainingList.appendChild(li);
            });
        }
        
        // 2. Populate Uses List
        els.modalItemUsesList.innerHTML = '';
        let hasUses = false;
        
        // Character Job Unlocks
        const jobs = data.used_in_jobs || [];
        if (jobs.length > 0) {
            jobs.forEach(job => {
                const li = document.createElement('li');
                li.style.padding = '10px 0';
                li.style.borderBottom = '1px solid var(--border-color)';
                li.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px;">
                        <div>
                            <strong style="color: var(--accent-blue);">${getLocalizedString(job.character_name)}</strong>
                            <span style="color: var(--text-muted); margin: 0 4px;">&gt;</span>
                            <span style="color: var(--text-secondary); font-size: 12px;">${getLocalizedString(job.job_name)}</span>
                        </div>
                        <span style="font-weight: 600; color: var(--accent-indigo);">x ${job.count}</span>
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Job Unlock Requirement</div>
                `;
                els.modalItemUsesList.appendChild(li);
            });
            hasUses = true;
        }
        
        // Character Rebirth
        const rebirths = data.used_in_rebirth || [];
        if (rebirths.length > 0) {
            rebirths.forEach(rb => {
                const li = document.createElement('li');
                li.style.padding = '10px 0';
                li.style.borderBottom = '1px solid var(--border-color)';
                const srcName = getLocalizedString(rb.src_character_name, 'Unknown');
                const dstName = getLocalizedString(rb.dst_character_name, 'Unknown');
                li.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px;">
                        <div>
                            <strong style="color: var(--accent-pink);">${srcName}</strong>
                            <span style="color: var(--text-muted); margin: 0 4px;"><i class="fa-solid fa-arrow-right-long" style="font-size: 11px;"></i></span>
                            <strong style="color: var(--accent-blue);">${dstName}</strong>
                        </div>
                        <span style="font-weight: 600; color: var(--accent-indigo);">x ${rb.count}</span>
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Rebirth/Reconstruction Material</div>
                `;
                els.modalItemUsesList.appendChild(li);
            });
            hasUses = true;
        }
        
        // Buddy Evolution
        const buddies = data.used_in_buddies || [];
        if (buddies.length > 0) {
            buddies.forEach(buddy => {
                const li = document.createElement('li');
                li.style.padding = '10px 0';
                li.style.borderBottom = '1px solid var(--border-color)';
                li.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px;">
                        <strong style="color: var(--accent-amber);">${getLocalizedString(buddy.buddy_name)}</strong>
                        <span style="font-weight: 600; color: var(--accent-indigo);">x ${buddy.count}</span>
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Companion (Buddy) Evolution</div>
                `;
                els.modalItemUsesList.appendChild(li);
            });
            hasUses = true;
        }
        
        if (!hasUses) {
            els.modalItemUsesList.innerHTML = '<li style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px 0;">This material is not used in job unlocks, rebirths, or companion evolutions.</li>';
        }
        
        // Open Modal
        els.itemModal.classList.remove('hidden');
    } catch (e) {
        console.error("Error opening item modal details:", e);
    }
}

function closeItemModal() {
    els.itemModal.classList.add('hidden');
}
