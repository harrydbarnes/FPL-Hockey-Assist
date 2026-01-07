import { fplApi } from './api.js';
import { TEAM_COLORS, TEAM_MAPPING } from './team-colors.js';

// Global Constants
const MOBILE_SIDEBAR_OVERLAY_CLASSES = ['shadow-xl'];

document.addEventListener('DOMContentLoaded', async () => {
    // --- Global Init ---
    setupMobileMenu();
    setupActiveLinks();
    setupModal();

    // --- State Management ---
    const teamId = localStorage.getItem('fpl_team_id');
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // Always load static data to enable deadline widget and other features
    try {
        await fplApi.getStaticData();
    } catch (e) {
        console.error('Failed to load static data', e);
    }
    // Always attempt to create widget (it has fallback logic)
    createDeadlineWidget();

    if (teamId) {
        try {
            // Get Team Details for Header
            const teamData = await fplApi.getTeamDetails(teamId);
            updateGlobalHeader(teamData);

            // Route to Page Logic
            if (currentPage === 'index.html' || currentPage === '') {
                await renderDashboard(teamId, teamData);
            } else if (currentPage === 'leagues.html') {
                await renderLeaguesPage(teamId, teamData);
            } else if (currentPage === 'stats.html') {
                await renderStatsPage(teamId);
            } else if (currentPage === 'rivals.html') {
                await renderRivalsPage(teamId, teamData);
            } else if (currentPage === 'fixtures.html') {
                await renderFixturesPage(teamId);
            } else if (currentPage === 'clean-sheet.html') {
                await renderCleanSheetPage(teamId);
            }

        } catch (error) {
            console.error('Initialization Error:', error);
        }
    } else {
        if (currentPage === 'index.html' || currentPage === '') {
             const modal = document.getElementById('load-team-modal');
             if (modal) {
                modal.classList.remove('hidden');
                // Allow a frame for the display change to take effect before opacity
                requestAnimationFrame(() => {
                    modal.classList.remove('opacity-0');
                });
             }
        }
    }
});

function setupMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');

    if (menuBtn && sidebar) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Toggle transform class to slide in/out
            const isClosed = sidebar.classList.contains('-translate-x-full');

            if (isClosed) {
                sidebar.classList.remove('-translate-x-full');
                sidebar.classList.add(...MOBILE_SIDEBAR_OVERLAY_CLASSES);
            } else {
                sidebar.classList.add('-translate-x-full');
                sidebar.classList.remove(...MOBILE_SIDEBAR_OVERLAY_CLASSES);
            }
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (window.innerWidth < 768 &&
                !sidebar.classList.contains('-translate-x-full') &&
                !sidebar.contains(e.target) &&
                !menuBtn.contains(e.target)) {

                sidebar.classList.add('-translate-x-full');
                sidebar.classList.remove(...MOBILE_SIDEBAR_OVERLAY_CLASSES);
            }
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth >= 768) {
                // Reset to default desktop state (handled by CSS md:translate-x-0)
                sidebar.classList.remove(...MOBILE_SIDEBAR_OVERLAY_CLASSES);
            } else {
                // On mobile, if the sidebar is open, ensure it has the overlay shadow.
                if (!sidebar.classList.contains('-translate-x-full')) {
                     sidebar.classList.add(...MOBILE_SIDEBAR_OVERLAY_CLASSES);
                }
            }
        });
    }
}

function setupActiveLinks() {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('#sidebar nav a');
    const sidebar = document.getElementById('sidebar');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath || (currentPath === '' && href === 'index.html')) {
            link.classList.remove('text-slate-400', 'hover:text-white');
            link.classList.add('bg-primary/20', 'text-primary');
        } else {
            link.classList.add('text-slate-400', 'hover:text-white');
            link.classList.remove('bg-primary/20', 'text-primary');
        }
        link.addEventListener('click', () => {
            if (window.innerWidth < 768 && sidebar) {
                sidebar.classList.add('-translate-x-full');
                sidebar.classList.remove(...MOBILE_SIDEBAR_OVERLAY_CLASSES);
            }
        });
    });
}

function setupModal() {
    const MODAL_ANIMATION_DURATION = 300;

    const loadTeamBtn = document.getElementById('load-team-btn');
    const modal = document.getElementById('load-team-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const fetchTeamBtn = document.getElementById('fetch-team-btn');
    const teamInput = document.getElementById('team-input');
    const errorMessage = document.getElementById('error-message');

    // Add transition classes to modal if not present (handled in HTML usually, but let's ensure)
    // We assume HTML has: class="fixed inset-0 z-50 hidden transition-opacity duration-300 opacity-0"
    // And backdrop has: class="absolute inset-0 bg-black/80 backdrop-blur-sm transition-all duration-300"

    // We will toggle 'hidden' and 'opacity-0'

    const openModal = () => {
        if(modal) {
            modal.classList.remove('hidden');
            // Trigger reflow/next frame to allow transition
            requestAnimationFrame(() => {
                modal.classList.remove('opacity-0');
            });

            if(teamInput) teamInput.focus();
        }
    };

    const closeModal = () => {
        if(modal) {
            modal.classList.add('opacity-0');

            // Wait for transition to finish before hiding
            setTimeout(() => {
                modal.classList.add('hidden');
                if(errorMessage) errorMessage.classList.add('hidden');
                if(teamInput) teamInput.value = '';
            }, MODAL_ANIMATION_DURATION);
        }
    };

    if (loadTeamBtn) loadTeamBtn.addEventListener('click', openModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);

    if (fetchTeamBtn) {
        fetchTeamBtn.addEventListener('click', async () => {
            const input = teamInput.value.trim();
            if (!input) {
                showError('Please enter a Team ID or URL');
                return;
            }
            const teamId = fplApi.extractTeamId(input);
            if (!teamId) {
                showError('Invalid Team ID or URL');
                return;
            }

            setLoading(true);
            try {
                await fplApi.getStaticData();
                await fplApi.getTeamDetails(teamId); // Validate ID
                localStorage.setItem('fpl_team_id', teamId);
                closeModal();
                // Short delay to allow modal close anim before reload
                setTimeout(() => window.location.reload(), MODAL_ANIMATION_DURATION);
            } catch (error) {
                console.error(error);
                showError('Failed to load team. ID might be invalid or FPL API issue.');
            } finally {
                setLoading(false);
            }
        });
    }

    function showError(msg) {
        if(errorMessage) {
            errorMessage.textContent = msg;
            errorMessage.classList.remove('hidden');
        }
    }

    function setLoading(isLoading) {
        if (isLoading) {
            fetchTeamBtn.disabled = true;
            fetchTeamBtn.innerHTML = '<span class="animate-spin material-symbols-outlined">refresh</span> Loading...';
        } else {
            fetchTeamBtn.disabled = false;
            fetchTeamBtn.innerHTML = '<span>Load Data</span><span class="material-symbols-outlined text-sm">arrow_forward</span>';
        }
    }
}

function updateGlobalHeader(team) {
    const nameEl = document.getElementById('team-name');
    const managerEl = document.getElementById('manager-name');
    if (nameEl) nameEl.textContent = team.name;
    if (managerEl) managerEl.textContent = `${team.player_first_name} ${team.player_last_name}`;
}

// Simple Seeded RNG (Mulberry32) to ensure icons are consistent per ID
class SeededRNG {
    constructor(seed) {
        this.t = seed;
    }
    // Returns a float between 0 and 1
    next() {
        this.t += 0x6D2B79F5;
        this.t = Math.imul(this.t ^ (this.t >>> 15), this.t | 1);
        this.t ^= this.t + Math.imul(this.t ^ (this.t >>> 7), this.t | 61);
        return ((this.t ^ (this.t >>> 14)) >>> 0) / 4294967296;
    }
    // Helper for range
    nextRange(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }
    // Helper for random color
    nextColor() {
        const h = Math.floor(this.next() * 360);
        const s = this.nextRange(60, 90); // Vibrant saturation
        const l = this.nextRange(40, 60); // Readable lightness
        return `hsl(${h}, ${s}%, ${l}%)`;
    }
}

function getInitials(name) {
    if (!name) return '';
    return name
        .split(' ')
        .filter(part => part.length > 0)
        .map(part => part[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
}

function createManagerIcon(entryId, managerName, showInitials = true) {
    // 1. Seed the RNG with the Team ID
    const seed = parseInt(entryId, 10) || 0;
    const rng = new SeededRNG(seed);

    // 2. Generate Palette (2 to 5 colors)
    const numColors = rng.nextRange(2, 5);
    const colors = [];
    for (let i = 0; i < numColors; i++) {
        colors.push(rng.nextColor());
    }

    // 3. Define Patterns
    const patterns = [
        // Vertical Stripes
        `repeating-linear-gradient(90deg, ${colors[0]}, ${colors[0]} 10px, ${colors[1]} 10px, ${colors[1]} 20px)`,
        // Diagonal Stripes
        `repeating-linear-gradient(45deg, ${colors[0]}, ${colors[0]} 10px, ${colors[1]} 10px, ${colors[1]} 20px)`,
        // Conic (Pinwheel)
        `conic-gradient(from 0deg, ${colors.join(', ')})`,
        // Radial Pulse
        `radial-gradient(circle, ${colors.join(', ')})`,
        // Linear Gradient
        `linear-gradient(135deg, ${colors.join(', ')})`,
        // Checkerboard-ish (using gradients)
        `repeating-conic-gradient(${colors[0]} 0% 25%, ${colors[1]} 0% 50%)`
    ];

    // Select Pattern
    const selectedPattern = patterns[rng.nextRange(0, patterns.length - 1)];

    // 4. Create Element
    const iconDiv = document.createElement('div');
    iconDiv.className = 'size-8 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-white shadow-sm border border-white/20';

    // Apply visual styles
    if (selectedPattern.startsWith('repeating-conic-gradient')) {
         iconDiv.style.background = selectedPattern;
         iconDiv.style.backgroundSize = '10px 10px';
    } else {
         iconDiv.style.background = selectedPattern;
    }

    // Add a text shadow to ensure initials are readable against any background
    iconDiv.style.textShadow = '0px 0px 2px rgba(0,0,0,0.8)';

    // 5. Set Initials
    if (showInitials) {
        iconDiv.textContent = getInitials(managerName);
    }

    return iconDiv;
}

function createDeadlineWidget() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    // Check if widget already exists to avoid duplication
    let widget = document.getElementById('deadline-widget');

    if (!widget) {
        const container = document.createElement('div');
        container.className = 'mt-auto pt-6 border-t border-surface-border';

        widget = document.createElement('div');
        widget.id = 'deadline-widget';
        widget.className = 'bg-gradient-to-br from-surface-dark to-background-dark rounded-xl p-4 border border-surface-border';

        widget.innerHTML = `
            <div class="flex items-center gap-2 mb-2 text-primary">
                <span class="material-symbols-outlined text-sm">info</span>
                <span class="text-xs font-bold uppercase tracking-wider">Deadline</span>
            </div>
            <p id="deadline-gameweek" class="text-sm text-slate-300">Loading...</p>
            <p id="deadline-time" class="text-xl font-bold text-white mt-1">--</p>
        `;

        container.appendChild(widget);

        // Append at the end of sidebar (after nav)
        sidebar.appendChild(container);
    }

    updateDeadlineWidget();
}

async function updateDeadlineWidget() {
    const status = fplApi.getGameweekStatus();
    if (!status || !status.next) return;

    const nextGw = status.next;
    const deadlineDate = new Date(nextGw.deadline_time);

    // Format date: Fri 24 Nov, 18:30
    const dayName = deadlineDate.toLocaleDateString('en-GB', { weekday: 'short' });
    const day = deadlineDate.getDate();
    const month = deadlineDate.toLocaleDateString('en-GB', { month: 'short' });
    const time = deadlineDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    const formattedDate = `${dayName} ${day} ${month}, ${time}`;

    const gwLabel = document.getElementById('deadline-gameweek');
    const deadlineLabel = document.getElementById('deadline-time');

    if (gwLabel) gwLabel.textContent = nextGw.name;
    if (deadlineLabel) deadlineLabel.textContent = formattedDate;
}

// --- Page Renderers ---

async function renderDashboard(teamId, team) {
    const currentGw = team.current_event;

    // Update Stats Cards
    const overallRank = document.getElementById('overall-rank');
    if (overallRank) overallRank.textContent = team.summary_overall_rank ? '#' + team.summary_overall_rank.toLocaleString() : '-';

    const totalPoints = document.getElementById('total-points');
    if (totalPoints) totalPoints.textContent = team.summary_overall_points || '-';

    const gwPoints = document.getElementById('gw-points');
    if (gwPoints) gwPoints.textContent = team.summary_event_points || '-';

    const teamValue = document.getElementById('team-value');
    if (teamValue) teamValue.textContent = '£' + (team.last_deadline_value / 10).toFixed(1) + 'm';

    // Fetch Picks for Pitch
    try {
        const picksData = await fplApi.getTeamPicks(teamId, currentGw);
        updatePitch(picksData.picks);
    } catch (e) {
        console.error('Error fetching picks', e);
    }

    // Populate Next Fixtures
    renderNextFixtures(currentGw);
}

function createTeamIcon(teamName, sizeClass = 'size-6', options = {}) {
    const { borderClass = 'border border-white/20' } = options;

    // Normalize input
    const cleanName = (teamName || '').trim();

    // Perform case-insensitive lookup in TEAM_MAPPING
    const mappingKey = Object.keys(TEAM_MAPPING).find(key => key.toLowerCase() === cleanName.toLowerCase());
    let mappedName = mappingKey ? TEAM_MAPPING[mappingKey] : cleanName;

    // Find color object (case insensitive name match)
    const teamColorObj = TEAM_COLORS.find(t => t.team.toLowerCase() === mappedName.toLowerCase()) || { hex: '#999999', stripes: false };
    const bgColor = teamColorObj.hex;

    const div = document.createElement('div');
    div.className = `${sizeClass} rounded-full flex items-center justify-center overflow-hidden p-0.5 ${borderClass}`;

    if (teamColorObj.stripes) {
        const stripeColor = teamColorObj.stripeColor || '#ffffff';
        div.style.background = `repeating-linear-gradient(90deg, ${bgColor} 0px, ${bgColor} 5px, ${stripeColor} 5px, ${stripeColor} 10px)`;
    } else {
        div.style.backgroundColor = bgColor;
    }

    div.setAttribute('data-alt', `${cleanName} color`);
    return div;
}

function updatePitch(picks) {
    const getP = (p) => {
        const details = fplApi.getPlayerDetails(p.element);
        const team = fplApi.getTeamById(details.team);
        return { ...p, ...details, team_short: team.short_name, team_name: team.name };
    };

    const fullPicks = picks.map(getP);
    const starters = fullPicks.slice(0, 11);
    const bench = fullPicks.slice(11, 15);

    const gks = starters.filter(p => p.element_type === 1);
    const defs = starters.filter(p => p.element_type === 2);
    const mids = starters.filter(p => p.element_type === 3);
    const fwds = starters.filter(p => p.element_type === 4);

    const rows = document.querySelectorAll('.pitch-bg > div.flex');
    if (rows.length < 4) return;

    const createPlayerEl = (p) => {
        const div = document.createElement('div');
        div.className = 'flex flex-col items-center gap-1';

        const playerIconContainer = document.createElement('div');
        playerIconContainer.className = 'relative group cursor-pointer';

        // Use new createTeamIcon logic but with specific size for pitch
        const kitDiv = createTeamIcon(p.team_name, 'w-12 h-12', { borderClass: 'border border-white/20' });

        // Let's add extra classes to kitDiv to make it pop on the pitch if needed.
        kitDiv.classList.add('shadow-lg', 'relative', 'z-10');

        playerIconContainer.appendChild(kitDiv);

        if (p.is_captain) {
            const badge = document.createElement('div');
            badge.className = 'absolute -top-2 -right-2 z-20 bg-black text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white';
            badge.textContent = 'C';
            playerIconContainer.appendChild(badge);
        } else if (p.is_vice_captain) {
            const badge = document.createElement('div');
            badge.className = 'absolute -top-2 -right-2 z-20 bg-gray-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white';
            badge.textContent = 'V';
            playerIconContainer.appendChild(badge);
        }

        const infoDiv = document.createElement('div');
        infoDiv.className = 'bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-center';

        const nameP = document.createElement('p');
        nameP.className = 'text-white text-[10px] font-bold leading-tight uppercase truncate max-w-[80px]';
        nameP.textContent = p.web_name;

        const teamP = document.createElement('p');
        teamP.className = 'text-slate-300 text-[10px] leading-tight';
        teamP.textContent = p.team_short;

        infoDiv.appendChild(nameP);
        infoDiv.appendChild(teamP);

        div.appendChild(playerIconContainer);
        div.appendChild(infoDiv);

        return div;
    };

    const fillRow = (row, players) => {
        row.innerHTML = '';
        players.forEach(p => row.appendChild(createPlayerEl(p)));
    };

    fillRow(rows[0], gks);
    fillRow(rows[1], defs);
    fillRow(rows[2], mids);
    fillRow(rows[3], fwds);

    // Render Bench
    const benchContainer = document.getElementById('bench-container');
    if (benchContainer) {
        benchContainer.replaceChildren(...bench.map(createPlayerEl));
    }

    const formationLabel = document.querySelector('.bg-surface-dark.border.rounded-lg.px-3.py-1.text-xs.text-slate-300');
    if(formationLabel) formationLabel.textContent = `Formation: ${defs.length}-${mids.length}-${fwds.length}`;
}

async function renderNextFixtures(currentGw) {
    try {
         const fixtures = await fplApi.getFixtures();
         const nextFixtures = fixtures.filter(f => f.event === currentGw + 1).slice(0, 3);
         const container = document.querySelector('.flex.flex-col.gap-4 > .bg-surface-dark.border');

         if (container && nextFixtures.length > 0) {
             container.innerHTML = ''; // Clear hardcoded
             nextFixtures.forEach(f => {
                 const home = fplApi.getTeamById(f.team_h);
                 const away = fplApi.getTeamById(f.team_a);

                 const div = document.createElement('div');
                 div.className = 'flex items-center justify-between pb-3 border-b border-surface-border last:border-0 last:pb-0';

                 const infoCol = document.createElement('div');
                 infoCol.className = 'flex flex-col';

                 const gwSpan = document.createElement('span');
                 gwSpan.className = 'text-xs text-slate-400 font-medium uppercase';
                 gwSpan.textContent = `Gameweek ${f.event}`;

                 const matchSpan = document.createElement('div');
                 matchSpan.className = 'flex items-center gap-2';

                 const homeBadge = createTeamIcon(home.name, 'size-4');
                 const awayBadge = createTeamIcon(away.name, 'size-4');

                 const textSpan = document.createElement('span');
                 textSpan.className = 'text-white font-bold text-sm';
                 textSpan.textContent = `${home.short_name} vs ${away.short_name}`;

                 matchSpan.appendChild(homeBadge);
                 matchSpan.appendChild(textSpan);
                 matchSpan.appendChild(awayBadge);

                 infoCol.appendChild(gwSpan);
                 infoCol.appendChild(matchSpan);

                 const diffCol = document.createElement('div');
                 diffCol.className = 'flex gap-1';

                 const createBadge = (diff) => {
                     const span = document.createElement('span');
                     span.className = 'w-6 h-6 rounded bg-gray-600 text-white text-xs font-bold flex items-center justify-center';
                     span.title = `Difficulty ${diff}`;
                     span.textContent = diff;
                     return span;
                 };

                 diffCol.appendChild(createBadge(f.team_h_difficulty));
                 diffCol.appendChild(createBadge(f.team_a_difficulty));

                 div.appendChild(infoCol);
                 div.appendChild(diffCol);

                 container.appendChild(div);
             });
         }
    } catch(e) { console.error('Error fetching fixtures', e); }
}

async function renderLeaguesPage(teamId, team) {
    const leagues = team.leagues.classic;
    const select = document.querySelector('select'); // The one in the header

    if (select) {
        select.innerHTML = '';
        leagues.forEach(l => {
            const opt = document.createElement('option');
            opt.value = l.id;
            opt.textContent = l.name;
            select.appendChild(opt);
        });

        const loadLeague = async (id) => {
            const data = await fplApi.getLeagueStandings(id);
            renderLeagueTable(data.standings.results, teamId);
            const title = document.querySelector('h1');
            if(title) title.textContent = data.league.name;
        };

        if (leagues.length > 0) {
            loadLeague(leagues[0].id);
        }

        select.addEventListener('change', (e) => loadLeague(e.target.value));
    }
}

function renderLeagueTable(results, myTeamId) {
    const tbody = document.querySelector('tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    results.forEach(r => {
        const isMe = r.entry == myTeamId;
        const tr = document.createElement('tr');
        tr.className = isMe ? 'bg-primary/10 border-l-4 border-l-primary cursor-pointer hover:bg-primary/20 transition-colors' : 'group hover:bg-[#282f39] transition-colors cursor-pointer';

        // Use cells for safe text insertion
        const createCell = (content, className = '') => {
            const td = document.createElement('td');
            if (className) td.className = className;
            td.textContent = content;
            return td;
        };

        // Rank
        const rankTd = createCell(r.rank, 'py-4 pl-6 pr-4 text-white font-bold text-lg');
        tr.appendChild(rankTd);

        // Trend
        const trendTd = document.createElement('td');
        trendTd.className = 'py-4 px-4';
        const trendDiv = document.createElement('div');
        trendDiv.className = `flex items-center gap-1 ${r.rank_sort < r.last_rank ? 'text-emerald-400' : (r.rank_sort > r.last_rank ? 'text-rose-400' : 'text-[#9da8b9]') }`;
        const iconSpan = document.createElement('span');
        iconSpan.className = 'material-symbols-outlined text-xl';
        iconSpan.textContent = r.rank_sort < r.last_rank ? 'arrow_drop_up' : (r.rank_sort > r.last_rank ? 'arrow_drop_down' : 'remove');
        trendDiv.appendChild(iconSpan);
        trendTd.appendChild(trendDiv);
        tr.appendChild(trendTd);

        // Team & Manager
        const teamTd = document.createElement('td');
        teamTd.className = 'py-4 px-4';
        const teamDiv = document.createElement('div');
        teamDiv.className = 'flex items-center gap-3';

        // Random Color Icon for Manager, NO INITIALS for League Table
        const iconDiv = createManagerIcon(r.entry, r.player_name, false);
        teamDiv.appendChild(iconDiv);

        const teamInfoDiv = document.createElement('div');
        teamInfoDiv.className = 'flex flex-col';

        const entryNameSpan = document.createElement('span');
        entryNameSpan.className = `text-white font-bold ${isMe ? '' : 'group-hover:text-primary'} transition-colors`;
        entryNameSpan.textContent = r.entry_name + ' ';
        if (isMe) {
            const youBadge = document.createElement('span');
            youBadge.className = 'px-1.5 py-0.5 rounded bg-primary text-white text-[10px] font-bold uppercase tracking-wide';
            youBadge.textContent = 'You';
            entryNameSpan.appendChild(youBadge);
        }

        const playerNameSpan = document.createElement('span');
        playerNameSpan.className = 'text-[#9da8b9] text-xs';
        playerNameSpan.textContent = r.player_name;

        teamInfoDiv.appendChild(entryNameSpan);
        teamInfoDiv.appendChild(playerNameSpan);
        teamDiv.appendChild(teamInfoDiv);
        teamTd.appendChild(teamDiv);
        tr.appendChild(teamTd);

        // GW Points
        const gwPointsTd = document.createElement('td');
        gwPointsTd.className = 'py-4 px-4 text-center';
        const gwSpan = document.createElement('span');
        gwSpan.className = `inline-block py-1 px-3 rounded ${isMe ? 'bg-primary text-white' : 'bg-[#282f39] text-white'} font-medium border border-border-dark`;
        gwSpan.textContent = r.event_total;
        gwPointsTd.appendChild(gwSpan);
        tr.appendChild(gwPointsTd);

        // Total
        const totalTd = createCell(r.total, 'py-4 px-4 text-center text-white font-black text-base');
        tr.appendChild(totalTd);

        // Chips (Placeholder)
        tr.appendChild(createCell('-', 'py-4 px-4 text-center'));
        // Form (Placeholder)
        tr.appendChild(createCell('0', 'py-4 pl-4 pr-6 text-right text-white font-bold'));

        tbody.appendChild(tr);
    });
}

async function renderStatsPage(teamId) {
    const teamDetails = await fplApi.getTeamDetails(teamId);
    const picks = await fplApi.getTeamPicks(teamId, teamDetails.current_event);

    // Show Captain
    const captain = picks.picks.find(p => p.is_captain) || picks.picks[0];
    if (!captain) {
        console.error('No player picks found to render stats page.');
        return;
    }
    const player = fplApi.getPlayerDetails(captain.element);
    const playerTeam = fplApi.getTeamById(player.team);

    // 1. Update Name
    const h1 = document.querySelector('h1.text-2xl');
    if(h1) h1.textContent = player.web_name;

    // 2. Update Profile Picture to use Team Kit Icon
    // Select the container that currently has the background-image
    const profilePicContainer = document.querySelector('[data-alt$="Profile Picture"]');
    // Ensure playerTeam exists to avoid runtime errors when accessing properties
    if (profilePicContainer && playerTeam) {
        // Clear existing background image and borders meant for photos
        profilePicContainer.style.backgroundImage = 'none';
        profilePicContainer.innerHTML = '';
        profilePicContainer.className = 'flex items-center justify-center shrink-0';

        // Generate the Kit Icon using the existing createTeamIcon helper
        const kitIcon = createTeamIcon(playerTeam.name, 'size-24', { borderClass: 'border-4 border-[#282f39]' });

        // Optional: Add a small team text badge
        const teamBadge = document.createElement('div');
        teamBadge.className = 'absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#282f39] flex items-center justify-center text-[10px] font-bold text-white border border-[#1a2027]';
        teamBadge.textContent = playerTeam.short_name;

        const wrapper = document.createElement('div');
        wrapper.className = 'relative';
        wrapper.appendChild(kitIcon);
        wrapper.appendChild(teamBadge);

        profilePicContainer.appendChild(wrapper);
    }

    // 3. Update Stats Cards
    const statsCards = document.querySelectorAll('.grid.grid-cols-2.md\\:grid-cols-4 .text-3xl');
    if (statsCards.length >= 4) {
        statsCards[0].textContent = player.total_points;
        statsCards[1].textContent = player.goals_scored;
        statsCards[2].textContent = player.assists;
        statsCards[3].textContent = player.bonus;
    }
}

async function renderRivalsPage(teamId, team) {
    const leagues = team.leagues.classic;

    // Check if we need to add a selector logic
    // We can inject a select element near the title if it doesn't exist
    let select = document.getElementById('rivals-league-select');

    const loadLeague = async (id) => {
        const data = await fplApi.getLeagueStandings(id);
        const title = document.querySelector('h1.text-3xl');
        if(title) title.textContent = data.league.name;

        // NEW: Fetch and Render Key Differentials for the top rival
        // Compares user against the first rival in the list
        const rivals = data.standings.results.filter(r => r.entry != teamId).slice(0, 20);
        if (rivals.length > 0) {
            const rivalId = rivals[0].entry;
            await renderKeyDifferentials(teamId, rivalId);
        }

        // Populate Sidebar Standings
        const sidebarList = document.querySelector('aside .flex.flex-col.gap-2');
        if(sidebarList) {
            sidebarList.innerHTML = '<h3 class="text-xs font-bold uppercase tracking-wider text-text-secondary pl-1 mb-1">Standings</h3>';

            const createEntryRow = (r, isMe = false) => {
                 const div = document.createElement('div');
                 div.className = isMe ?
                    'group flex items-center justify-between gap-3 px-3 py-3 rounded-lg bg-gray-200 dark:bg-[#1c2027] border border-transparent cursor-pointer' :
                    'group flex items-center justify-between gap-3 px-3 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-[#282f39] cursor-pointer transition-colors border border-transparent';

                 const innerDiv = document.createElement('div');
                 innerDiv.className = 'flex items-center gap-3';

                 const rankSpan = document.createElement('span');
                 rankSpan.className = 'text-text-secondary font-bold text-sm';
                 rankSpan.textContent = r.rank;

                 // Random Color for Rival
                 const iconDiv = createManagerIcon(r.entry, r.player_name);
                 innerDiv.appendChild(iconDiv);

                 const infoCol = document.createElement('div');
                 infoCol.className = 'flex flex-col';

                 const entryP = document.createElement('p');
                 entryP.className = 'text-slate-900 dark:text-white text-sm font-medium leading-none';
                 entryP.textContent = isMe ? 'You' : r.entry_name;

                 const playerP = document.createElement('p');
                 playerP.className = 'text-text-secondary text-xs leading-normal mt-1';
                 playerP.textContent = r.player_name;

                 infoCol.appendChild(entryP);
                 infoCol.appendChild(playerP);

                 innerDiv.appendChild(rankSpan);
                 innerDiv.appendChild(infoCol);
                 div.appendChild(innerDiv);
                 return div;
            };

            // Add Me
            const me = data.standings.results.find(r => r.entry == teamId);
            if(me) {
                 sidebarList.appendChild(createEntryRow(me, true));
            }

            rivals.forEach(r => {
                 sidebarList.appendChild(createEntryRow(r));
            });
        }
    };

    if (!select && leagues.length > 0) {
        // Create Selector
        const headerContainer = document.querySelector('.flex.flex-col.gap-2 .flex.items-center.gap-2.text-primary.mb-1')?.parentElement;
        if (headerContainer) {
            const container = document.createElement('div');
            container.className = 'mb-4';
            select = document.createElement('select');
            select.id = 'rivals-league-select';
            select.className = 'bg-surface-dark border border-surface-border rounded-lg text-white text-sm px-3 py-2 outline-none focus:border-primary';

            leagues.forEach(l => {
                const opt = document.createElement('option');
                opt.value = l.id;
                opt.textContent = l.name;
                select.appendChild(opt);
            });

            select.addEventListener('change', (e) => loadLeague(e.target.value));
            container.appendChild(select);
            headerContainer.insertBefore(container, headerContainer.firstChild);
        }
    }

    if (leagues.length > 0) {
        loadLeague(leagues[0].id);
    }
}

async function renderFixturesPage(teamId) {
    const tbody = document.querySelector('tbody');
    if(!tbody) return;
    tbody.innerHTML = '';

    const teams = (await fplApi.getStaticData()).teams;
    // We want next 5 GWs
    const { next: nextGw } = fplApi.getGameweekStatus();
    if(!nextGw) return;

    const startGw = nextGw.id;
    const endGw = startGw + 4;

    const allFixtures = await fplApi.getFixtures();
    const relevantFixtures = allFixtures.filter(f => f.event >= startGw && f.event <= endGw);

    // Build map of team -> fixtures
    const teamFixtures = {};
    teams.forEach(t => teamFixtures[t.id] = Array(5).fill(null));

    relevantFixtures.forEach(f => {
        const idx = f.event - startGw;
        if(idx >= 0 && idx < 5) {
             if(teamFixtures[f.team_h]) teamFixtures[f.team_h][idx] = { opp: f.team_a, diff: f.team_h_difficulty, home: true };
             if(teamFixtures[f.team_a]) teamFixtures[f.team_a][idx] = { opp: f.team_h, diff: f.team_a_difficulty, home: false };
        }
    });

    // Render Rows
    teams.slice(0, 10).forEach(t => {
        const tr = document.createElement('tr');
        tr.className = 'group hover:bg-slate-50 dark:hover:bg-[#20252e] transition-colors';

        const teamTd = document.createElement('td');
        teamTd.className = 'sticky-col-cell bg-white dark:bg-[#1c2027] group-hover:bg-slate-50 dark:group-hover:bg-[#20252e] p-3 text-left border-r border-slate-200 dark:border-[#282f39] shadow-[4px_0_12px_-4px_rgba(0,0,0,0.1)]';
        const teamDiv = document.createElement('div');
        teamDiv.className = 'flex items-center gap-3';

        const badge = createTeamIcon(t.name, 'size-8');
        teamDiv.appendChild(badge);

        const nameDiv = document.createElement('div');
        nameDiv.className = 'font-bold text-slate-900 dark:text-white';
        nameDiv.textContent = t.name;
        teamDiv.appendChild(nameDiv);
        teamTd.appendChild(teamDiv);
        tr.appendChild(teamTd);

        teamFixtures[t.id].forEach(fix => {
            const td = document.createElement('td');
            td.className = 'p-2 text-center';
            if(!fix) {
                td.textContent = '-';
            } else {
                const opp = fplApi.getTeamById(fix.opp);
                const colorClass = fix.diff <= 2 ? 'bg-difficulty-1' : (fix.diff <= 3 ? 'bg-difficulty-3' : 'bg-difficulty-5');
                const textColor = fix.diff <= 2 ? 'text-slate-900' : (fix.diff >= 5 ? 'text-white' : 'text-slate-800');

                const badge = document.createElement('div');
                badge.className = `rounded-md ${colorClass} ${textColor} font-bold py-2 text-xs`;
                badge.textContent = `${opp.short_name} (${fix.home ? 'H' : 'A'})`;
                td.appendChild(badge);
            }
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });
}

async function renderCleanSheetPage(teamId) {
    const teams = (await fplApi.getStaticData()).teams;
    // Clone before sorting to avoid side effect on shared staticData
    const topDefences = [...teams].sort((a,b) => b.strength_defence_home - a.strength_defence_home).slice(0, 3);

    const cards = document.querySelectorAll('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4 > div');
    topDefences.forEach((t, i) => {
        if(cards[i]) {
            const name = cards[i].querySelector('p.text-base');
            if(name) name.textContent = t.name;
            const prob = cards[i].querySelector('p.text-3xl');
            if(prob) prob.textContent = (t.strength_defence_home / 1350 * 100).toFixed(0) + '%';
        }
    });
}

async function renderKeyDifferentials(myTeamId, rivalTeamId) {
    const currentGw = fplApi.getGameweekStatus().current?.id || 1;

    // Fetch picks for both teams
    const [myPicks, rivalPicks] = await Promise.all([
        fplApi.getTeamPicks(myTeamId, currentGw),
        fplApi.getTeamPicks(rivalTeamId, currentGw)
    ]);

    // Find players they have that I don't
    const myPlayerIds = new Set(myPicks.picks.map(p => p.element));
    const differentials = rivalPicks.picks.filter(p => !myPlayerIds.has(p.element));

    const container = document.querySelector('.flex.flex-col.gap-3'); // Target the list container in rivals.html
    if (!container) return;

    container.innerHTML = ''; // Clear static HTML

    // Render top 3 differentials
    differentials.slice(0, 3).forEach(diff => {
        const player = fplApi.getPlayerDetails(diff.element);
        if (!player) return;

        const team = fplApi.getTeamById(player.team);
        if (!team) return;

        const row = document.createElement('div');
        row.className = 'flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-[#15191f] border border-transparent hover:border-gray-300 dark:hover:border-border-dark transition-colors';

        // Left Side: Icon + Name
        const leftDiv = document.createElement('div');
        leftDiv.className = 'flex items-center gap-3';

        // Generate Kit Icon
        const icon = createTeamIcon(team.name, 'size-8');

        const infoDiv = document.createElement('div');
        infoDiv.className = 'flex flex-col';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'text-sm font-bold text-slate-900 dark:text-white';
        nameSpan.textContent = player.web_name;

        const metaSpan = document.createElement('span');
        metaSpan.className = 'text-xs text-text-secondary';
        metaSpan.textContent = `${team.short_name} • ${mapElementType(player.element_type)}`;

        infoDiv.appendChild(nameSpan);
        infoDiv.appendChild(metaSpan);
        leftDiv.appendChild(icon);
        leftDiv.appendChild(infoDiv);

        row.appendChild(leftDiv);

        // Right Side: Form/Stats (Simplified for display)
        const rightDiv = document.createElement('div');
        rightDiv.className = 'text-right w-16';

        const formValue = document.createElement('span');
        formValue.className = 'block text-sm font-bold text-slate-900 dark:text-white';
        formValue.textContent = player.form;

        const formLabel = document.createElement('span');
        formLabel.className = 'block text-[10px] text-text-secondary';
        formLabel.textContent = 'Form';

        rightDiv.append(formValue, formLabel);
        row.appendChild(rightDiv);

        container.appendChild(row);
    });
}

// Helper to map element type to position name
function mapElementType(type) {
    const typeMap = {
        1: 'GKP',
        2: 'DEF',
        3: 'MID',
        4: 'FWD',
    };
    return typeMap[type] || '';
}
