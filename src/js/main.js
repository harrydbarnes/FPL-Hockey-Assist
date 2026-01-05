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

        const isCap = p.is_captain;
        const isVice = p.is_vice_captain;
        const badge = isCap ? '<div class="absolute -top-2 -right-2 z-20 bg-black text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">C</div>' : (isVice ? '<div class="absolute -top-2 -right-2 z-20 bg-gray-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">V</div>' : '');

        div.innerHTML = `
            <div class="relative group cursor-pointer">
                <div class="w-12 h-12 ${kitColor} rounded-full border-2 border-white shadow-lg flex items-center justify-center overflow-hidden relative z-10">
                   <img src="${fplApi.getPlayerImage(p.code)}" class="w-full h-full object-cover opacity-80 mix-blend-multiply" onError="this.style.display='none'">
                </div>
                ${badge}
            </div>
            <div class="bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-center">
                <p class="text-white text-[10px] font-bold leading-tight uppercase truncate max-w-[80px]">${p.web_name}</p>
                <p class="text-slate-300 text-[10px] leading-tight">${p.team_short}</p>
            </div>
        `;
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
    // Show top 3 fixtures for the league generally (or user team if we had full schedule)
    // For this, let's show upcoming 3 PL matches.
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
                 div.innerHTML = `
                    <div class="flex flex-col">
                        <span class="text-xs text-slate-400 font-medium uppercase">Gameweek ${f.event}</span>
                        <span class="text-white font-bold text-sm">${home.short_name} vs ${away.short_name}</span>
                    </div>
                    <div class="flex gap-1">
                        <span class="w-6 h-6 rounded bg-gray-600 text-white text-xs font-bold flex items-center justify-center" title="Difficulty ${f.team_h_difficulty}">${f.team_h_difficulty}</span>
                        <span class="w-6 h-6 rounded bg-gray-600 text-white text-xs font-bold flex items-center justify-center" title="Difficulty ${f.team_a_difficulty}">${f.team_a_difficulty}</span>
                    </div>
                 `;
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

        tr.innerHTML = `
            <td class="py-4 pl-6 pr-4 text-white font-bold text-lg">${r.rank}</td>
            <td class="py-4 px-4">
                <div class="flex items-center gap-1 ${r.rank_sort < r.last_rank ? 'text-emerald-400' : (r.rank_sort > r.last_rank ? 'text-rose-400' : 'text-[#9da8b9]') }">
                    <span class="material-symbols-outlined text-xl">${r.rank_sort < r.last_rank ? 'arrow_drop_up' : (r.rank_sort > r.last_rank ? 'arrow_drop_down' : 'remove') }</span>
                </div>
            </td>
            <td class="py-4 px-4">
                <div class="flex items-center gap-3">
                    <div class="flex flex-col">
                        <span class="text-white font-bold ${isMe ? '' : 'group-hover:text-primary'} transition-colors">${r.entry_name} ${isMe ? '<span class="px-1.5 py-0.5 rounded bg-primary text-white text-[10px] font-bold uppercase tracking-wide">You</span>' : ''}</span>
                        <span class="text-[#9da8b9] text-xs">${r.player_name}</span>
                    </div>
                </div>
            </td>
            <td class="py-4 px-4 text-center">
                <span class="inline-block py-1 px-3 rounded ${isMe ? 'bg-primary text-white' : 'bg-[#282f39] text-white'} font-medium border border-border-dark">${r.event_total}</span>
            </td>
            <td class="py-4 px-4 text-center text-white font-black text-base">${r.total}</td>
            <td class="py-4 px-4 text-center"> - </td>
            <td class="py-4 pl-4 pr-6"> - </td>
        `;
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
    // Add dropdown if possible or just use first
    // There is no select in rivals.html currently, so we use first league.
    const leagueId = leagues[0]?.id;
    if(!leagueId) return;

    const data = await fplApi.getLeagueStandings(leagueId);
    const title = document.querySelector('h1.text-3xl');
    if(title) title.textContent = data.league.name;

    const rivals = data.standings.results.filter(r => r.entry != teamId).slice(0, 5);

    // Populate Sidebar Standings
    const sidebarList = document.querySelector('aside .flex.flex-col.gap-2');
    if(sidebarList) {
        sidebarList.innerHTML = '<h3 class="text-xs font-bold uppercase tracking-wider text-text-secondary pl-1 mb-1">Standings</h3>';

        // Add Me
        const me = data.standings.results.find(r => r.entry == teamId);
        if(me) {
             const div = document.createElement('div');
             div.className = 'group flex items-center justify-between gap-3 px-3 py-3 rounded-lg bg-gray-200 dark:bg-[#1c2027] border border-transparent cursor-pointer';
             div.innerHTML = `
                <div class="flex items-center gap-3">
                    <span class="text-text-secondary font-bold text-sm">${me.rank}</span>
                    <div class="flex flex-col">
                        <p class="text-slate-900 dark:text-white text-sm font-medium leading-none">You</p>
                        <p class="text-text-secondary text-xs leading-normal mt-1">${me.player_name}</p>
                    </div>
                </div>
             `;
             sidebarList.appendChild(div);
        }

        rivals.forEach(r => {
             const div = document.createElement('div');
             div.className = 'group flex items-center justify-between gap-3 px-3 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-[#282f39] cursor-pointer transition-colors border border-transparent';
             div.innerHTML = `
                <div class="flex items-center gap-3">
                    <span class="text-text-secondary font-bold text-sm">${r.rank}</span>
                    <div class="flex flex-col">
                        <p class="text-slate-900 dark:text-white text-sm font-medium leading-none">${r.entry_name}</p>
                        <p class="text-text-secondary text-xs leading-normal mt-1">${r.player_name}</p>
                    </div>
                </div>
             `;
             sidebarList.appendChild(div);
        });
    }
}

async function renderFixturesPage(teamId) {
    // Populate Fixture Ticker with Real FDR
    // Clear the table body
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
    teams.slice(0, 10).forEach(t => { // Just top 10 to save space/time
        const tr = document.createElement('tr');
        tr.className = 'group hover:bg-slate-50 dark:hover:bg-[#20252e] transition-colors';

        let cells = '';
        teamFixtures[t.id].forEach(fix => {
            if(!fix) cells += `<td class="p-2 text-center">-</td>`;
            else {
                const opp = fplApi.getTeamById(fix.opp);
                const colorClass = fix.diff <= 2 ? 'bg-difficulty-1' : (fix.diff <= 3 ? 'bg-difficulty-3' : 'bg-difficulty-5');
                const textColor = fix.diff <= 2 ? 'text-slate-900' : (fix.diff >= 5 ? 'text-white' : 'text-slate-800');

                cells += `
                <td class="p-2 text-center">
                    <div class="rounded-md ${colorClass} ${textColor} font-bold py-2 text-xs">
                        ${opp.short_name} (${fix.home ? 'H' : 'A'})
                    </div>
                </td>`;
            }
        });

        tr.innerHTML = `
            <td class="sticky-col-cell bg-white dark:bg-[#1c2027] group-hover:bg-slate-50 dark:group-hover:bg-[#20252e] p-3 text-left border-r border-slate-200 dark:border-[#282f39] shadow-[4px_0_12px_-4px_rgba(0,0,0,0.1)]">
                <div class="flex items-center gap-3">
                    <div class="font-bold text-slate-900 dark:text-white">${t.name}</div>
                </div>
            </td>
            ${cells}
        `;
        tbody.appendChild(tr);
    });
}

async function renderCleanSheetPage(teamId) {
    const teams = (await fplApi.getStaticData()).teams;
    const topDefences = teams.sort((a,b) => b.strength_defence_home - a.strength_defence_home).slice(0, 3);

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
