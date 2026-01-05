document.addEventListener('DOMContentLoaded', () => {
    // Mobile menu toggle
    const menuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');

    if (menuBtn && sidebar) {
        menuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('hidden');
            // Basic overlay support for mobile
            if (!sidebar.classList.contains('hidden') && window.innerWidth < 768) {
                 sidebar.classList.add('absolute', 'z-50', 'h-full', 'shadow-xl');
            } else {
                 sidebar.classList.remove('absolute', 'z-50', 'h-full', 'shadow-xl');
            }
        });

        // Handle Resize to clean up mobile classes
        window.addEventListener('resize', () => {
            if (window.innerWidth >= 768) {
                sidebar.classList.remove('absolute', 'z-50', 'h-full', 'shadow-xl');
                // Note: 'hidden' class is overridden by 'md:flex' in CSS/Tailwind on desktop,
                // so we don't strictly need to remove it, but removing overlay classes is crucial.
            }
        });
    }

    // Active link highlighting
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('#sidebar nav a');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        // Simple check: if href matches current filename
        if (href === currentPath) {
            // Add active styles
            link.classList.remove('text-slate-400', 'hover:text-white');
            link.classList.add('bg-primary/20', 'text-primary');
        } else {
            // Ensure inactive styles
            link.classList.add('text-slate-400', 'hover:text-white');
            link.classList.remove('bg-primary/20', 'text-primary');
        }

        // Close sidebar on link click (mobile)
        link.addEventListener('click', () => {
            if (window.innerWidth < 768 && sidebar) {
                sidebar.classList.add('hidden');
                sidebar.classList.remove('absolute', 'z-50', 'h-full', 'shadow-xl');
            }
        });
    });

    // --- Team Loading Logic ---
    const loadTeamBtn = document.getElementById('load-team-btn');
    const modal = document.getElementById('load-team-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const fetchTeamBtn = document.getElementById('fetch-team-btn');
    const teamInput = document.getElementById('team-input');
    const errorMessage = document.getElementById('error-message');

    // Modal Controls
    const openModal = () => {
        modal.classList.remove('hidden');
        teamInput.focus();
    };

    const closeModal = () => {
        modal.classList.add('hidden');
        errorMessage.classList.add('hidden');
        teamInput.value = '';
    };

    if (loadTeamBtn) loadTeamBtn.addEventListener('click', openModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);

    // Data Fetching
    if (fetchTeamBtn) {
        fetchTeamBtn.addEventListener('click', async () => {
            const input = teamInput.value.trim();
            if (!input) {
                showError('Please enter a Team ID or URL');
                return;
            }

            const teamId = window.fplApi.extractTeamId(input);
            if (!teamId) {
                showError('Invalid Team ID or URL');
                return;
            }

            setLoading(true);

            try {
                // 1. Fetch Static Data (Players, Teams, etc.) if not already loaded
                await window.fplApi.getStaticData();

                // 2. Fetch Team Details
                const teamData = await window.fplApi.getTeamDetails(teamId);

                // 3. Fetch Picks for Current Gameweek
                // Note: teamData.current_event gives the current gameweek for the user
                const currentGw = teamData.current_event;
                const picksData = await window.fplApi.getTeamPicks(teamId, currentGw);

                // 4. Update UI
                updateDashboard(teamData, picksData, window.fplApi);

                closeModal();
                // Persist Team ID (optional, local storage)
                localStorage.setItem('fpl_team_id', teamId);

            } catch (error) {
                console.error(error);
                showError('Failed to load team data. Please try again.');
            } finally {
                setLoading(false);
            }
        });
    }

    // Auto-load if ID is in local storage
    const savedTeamId = localStorage.getItem('fpl_team_id');
    if (savedTeamId) {
        // We could auto-load here, but might want to wait for user interaction or page load
        // For now, let's just log it
        console.log('Found saved team ID:', savedTeamId);
        // Optional: Trigger auto-load logic
    }

    function showError(msg) {
        errorMessage.textContent = msg;
        errorMessage.classList.remove('hidden');
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

    function updateDashboard(team, picks, api) {
        // Update Sidebar/Header Info
        document.getElementById('team-name').textContent = team.name;
        document.getElementById('manager-name').textContent = `${team.player_first_name} ${team.player_last_name}`;

        // Update Points/Rank Cards (Simplified for now, targeting specific IDs in HTML would be better)
        // Since the current HTML has hardcoded values without unique IDs for stats,
        // I will assume we might need to add IDs or select by structure.
        // For this task, I will update what I can easily identify or added IDs for.

        // Let's find the specific elements by their content or structure if IDs are missing.
        // Actually, I should probably have added IDs to the stats cards in index.html in the previous step.
        // But I can try to find them by text content or structure.

        // Update Total Points
        const totalPointsEl = Array.from(document.querySelectorAll('p')).find(el => el.textContent === 'Total Points');
        if (totalPointsEl) {
            const valueEl = totalPointsEl.parentElement.nextElementSibling; // The value element
            if (valueEl) valueEl.textContent = team.summary_overall_points;
        }

        // Update Overall Rank
        const overallRankEl = Array.from(document.querySelectorAll('p')).find(el => el.textContent === 'Overall Rank');
        if (overallRankEl) {
            const valueEl = overallRankEl.parentElement.nextElementSibling;
            if (valueEl) valueEl.textContent = '#' + team.summary_overall_rank.toLocaleString();
        }

        // Update GW Points
        const gwPointsEl = Array.from(document.querySelectorAll('p')).find(el => el.textContent === 'GW Points');
        if (gwPointsEl) {
            const valueEl = gwPointsEl.parentElement.nextElementSibling;
            if (valueEl) valueEl.textContent = team.summary_event_points;
        }

        // Update Team Value
        const teamValueEl = Array.from(document.querySelectorAll('p')).find(el => el.textContent === 'Team Value');
        if (teamValueEl) {
            const valueEl = teamValueEl.parentElement.nextElementSibling;
            if (valueEl) valueEl.textContent = '£' + (team.last_deadline_value / 10).toFixed(1) + 'm';
             // Note: API returns value in 100k, e.g., 1024 -> 102.4
        }

        // Update Pitch View
        updatePitch(picks.picks, api);
    }

    function updatePitch(picks, api) {
        // Map picks to the pitch
        // The current HTML has hardcoded pitch players. I need to clear/replace them.
        // This is complex because the position on pitch depends on formation.
        // For this task, I'll attempt to map the first 11 picks to the visual slots if possible,
        // or just update the names/images of existing slots if the count matches.

        // A proper implementation would regenerate the pitch HTML based on formation (e.g., 3-5-2).
        // Since I can't easily rewrite the entire layout logic in one go,
        // I will iterate through the `.pitch-bg` children groups (GK, DEF, MID, FWD)
        // and populate them. This requires sorting picks by position.

        // Position IDs: 1=GK, 2=DEF, 3=MID, 4=FWD

        const starters = picks.slice(0, 11);
        const bench = picks.slice(11); // Not currently shown but useful

        const gk = starters.filter(p => api.getPlayerDetails(p.element).element_type === 1);
        const def = starters.filter(p => api.getPlayerDetails(p.element).element_type === 2);
        const mid = starters.filter(p => api.getPlayerDetails(p.element).element_type === 3);
        const fwd = starters.filter(p => api.getPlayerDetails(p.element).element_type === 4);

        // Helper to update a player slot
        const updateSlot = (container, player, isCaptain, isVice) => {
             const details = api.getPlayerDetails(player.element);
             const team = api.getTeamById(details.team);

             // Update Image
             const img = container.querySelector('img');
             if (img) img.src = api.getPlayerImage(details.code);

             // Update Name
             const nameEl = container.querySelector('.bg-black\\/60 p:first-child');
             if (nameEl) nameEl.textContent = details.web_name;

             // Update Team Name
             const teamEl = container.querySelector('.bg-black\\/60 p:last-child');
             if (teamEl) teamEl.textContent = team.short_name;

             // Update Points (if available in live data, but static picks usually don't have live points directly,
             // unless we fetch live stats. For now we might just clear the points badge or leave it).
             // The HTML has a points badge absolute positioned.
             const pointsBadge = container.querySelector('.absolute.-top-1.-right-1');
             if (pointsBadge) {
                 // We don't have live points in 'picks' endpoint usually, only static.
                 // We need 'event/{gw}/live' for that.
                 // For now, let's hide it or set to '-'
                 pointsBadge.textContent = '-';
             }

             // Handle Captaincy visual
             const capBadge = container.querySelector('.absolute.-top-2.-right-2'); // The 'C' badge in HTML
             if (isCaptain && !capBadge) {
                  // If it's captain but no badge exists in this slot template, we might want to add it
                  // But the HTML structure varies.
             }
        };

        // Clear existing slots first? Or just overwrite.
        // The HTML structure is:
        // .pitch-bg > div (GK row)
        // .pitch-bg > div (DEF row)
        // .pitch-bg > div (MID row)
        // .pitch-bg > div (FWD row)

        const pitchRows = document.querySelectorAll('.pitch-bg > div.flex');
        // Assuming order: GK, DEF, MID, FWD. Note: The HTML has specific classes/structure.
        // 1st div: GK
        // 2nd div: DEF
        // 3rd div: MID
        // 4th div: FWD

        if (pitchRows.length >= 4) {
             const fillRow = (row, players) => {
                 // Clone or hide extra slots
                 const slots = row.children;
                 // We need to match the number of slots to players.
                 // This is tricky without a templating system.
                 // I'll try to just update the existing ones and hide/show if count differs?
                 // Or better, clear the row and rebuild using the first slot as template.

                 const template = slots[0].cloneNode(true);
                 row.innerHTML = ''; // Clear

                 players.forEach(p => {
                     const clone = template.cloneNode(true);
                     updateSlot(clone, p, p.is_captain, p.is_vice_captain);
                     row.appendChild(clone);
                 });
             };

             if (gk.length) fillRow(pitchRows[0], gk);
             if (def.length) fillRow(pitchRows[1], def);
             if (mid.length) fillRow(pitchRows[2], mid);
             if (fwd.length) fillRow(pitchRows[3], fwd);

             // Update Formation Label
             const formationLabel = document.querySelector('.bg-surface-dark.border.rounded-lg.px-3.py-1.text-xs.text-slate-300');
             if (formationLabel) {
                 formationLabel.textContent = `Formation: ${def.length}-${mid.length}-${fwd.length}`;
             }
        }
    }
});
