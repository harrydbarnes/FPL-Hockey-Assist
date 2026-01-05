import { fplApi } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
    // --- Global Init ---
    setupMobileMenu();
    setupActiveLinks();
    setupModal();

    // --- State Management ---
    const teamId = localStorage.getItem('fpl_team_id');
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    if (teamId) {
        try {
            // Ensure static data is loaded
            await fplApi.getStaticData();

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
             document.getElementById('load-team-modal')?.classList.remove('hidden');
        }
    }
});

function setupMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');

    if (menuBtn && sidebar) {
        menuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('hidden');
            if (!sidebar.classList.contains('hidden') && window.innerWidth < 768) {
                 sidebar.classList.add('absolute', 'z-50', 'h-full', 'shadow-xl');
            } else {
                 sidebar.classList.remove('absolute', 'z-50', 'h-full', 'shadow-xl');
            }
        });
        window.addEventListener('resize', () => {
            if (window.innerWidth >= 768) {
                sidebar.classList.remove('absolute', 'z-50', 'h-full', 'shadow-xl');
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
                sidebar.classList.add('hidden');
                sidebar.classList.remove('absolute', 'z-50', 'h-full', 'shadow-xl');
            }
        });
    });
}

function setupModal() {
    const loadTeamBtn = document.getElementById('load-team-btn');
    const modal = document.getElementById('load-team-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const fetchTeamBtn = document.getElementById('fetch-team-btn');
    const teamInput = document.getElementById('team-input');
    const errorMessage = document.getElementById('error-message');

    const openModal = () => {
        if(modal) {
            modal.classList.remove('hidden');
            if(teamInput) teamInput.focus();
        }
    };
    const closeModal = () => {
        if(modal) {
            modal.classList.add('hidden');
            if(errorMessage) errorMessage.classList.add('hidden');
            if(teamInput) teamInput.value = '';
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
                window.location.reload();
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

function updatePitch(picks) {
    const getP = (p) => {
        const details = fplApi.getPlayerDetails(p.element);
        const team = fplApi.getTeamById(details.team);
        return { ...p, ...details, team_short: team.short_name };
    };

    const fullPicks = picks.map(getP);
    const starters = fullPicks.slice(0, 11);

    const gks = starters.filter(p => p.element_type === 1);
    const defs = starters.filter(p => p.element_type === 2);
    const mids = starters.filter(p => p.element_type === 3);
    const fwds = starters.filter(p => p.element_type === 4);

    const rows = document.querySelectorAll('.pitch-bg > div.flex');
    if (rows.length < 4) return;

    const createPlayerEl = (p) => {
        const div = document.createElement('div');
        div.className = 'flex flex-col items-center gap-1';

        let kitColor = 'bg-gray-500';
        if (p.element_type === 1) kitColor = 'bg-yellow-400';
        else if (p.element_type === 4) kitColor = 'bg-blue-700';
        else kitColor = 'bg-red-600';

        const playerIconContainer = document.createElement('div');
        playerIconContainer.className = 'relative group cursor-pointer';

        const kitDiv = document.createElement('div');
        kitDiv.className = `w-12 h-12 ${kitColor} rounded-full border-2 border-white shadow-lg flex items-center justify-center overflow-hidden relative z-10`;

        const img = document.createElement('img');
        img.src = fplApi.getPlayerImage(p.code);
        img.className = "w-full h-full object-cover opacity-80 mix-blend-multiply";
        img.onerror = function() { this.style.display='none' };
        kitDiv.appendChild(img);
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

                 const matchSpan = document.createElement('span');
                 matchSpan.className = 'text-white font-bold text-sm';
                 matchSpan.textContent = `${home.short_name} vs ${away.short_name}`;

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
        tr.appendChild(createCell('-', 'py-4 pl-4 pr-6'));

        tbody.appendChild(tr);
    });
}

async function renderStatsPage(teamId) {
    const teamDetails = await fplApi.getTeamDetails(teamId);
    const picks = await fplApi.getTeamPicks(teamId, teamDetails.current_event);

    // Show Captain
    const captain = picks.picks.find(p => p.is_captain) || picks.picks[0];
    const player = fplApi.getPlayerDetails(captain.element);

    const h1 = document.querySelector('h1');
    if(h1) h1.textContent = player.web_name;

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

        const rivals = data.standings.results.filter(r => r.entry != teamId).slice(0, 5);

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
