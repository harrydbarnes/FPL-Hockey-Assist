
// Deadline Overrides (2025/26)
const DEADLINE_OVERRIDES = {
    21: "2026-01-06T18:30:00Z",
    22: "2026-01-17T11:00:00Z",
    23: "2026-01-24T11:00:00Z",
    24: "2026-01-31T13:30:00Z",
    25: "2026-02-07T13:30:00Z",
    26: "2026-02-10T18:30:00Z",
    27: "2026-02-21T13:30:00Z",
    28: "2026-02-28T13:30:00Z",
    29: "2026-03-07T15:00:00Z",
    30: "2026-03-14T15:00:00Z",
    // BST (UTC+1) Adjustments: -1 hour from BST time for UTC
    31: "2026-04-04T10:00:00Z",
    32: "2026-04-11T10:00:00Z",
    33: "2026-04-18T10:00:00Z",
    34: "2026-04-25T10:00:00Z",
    35: "2026-05-02T10:00:00Z",
    36: "2026-05-09T10:00:00Z",
    37: "2026-05-16T10:00:00Z",
    38: "2026-05-24T13:30:00Z"
};

class FPLApi {
    constructor() {
        this.baseUrl = 'https://fantasy.premierleague.com/api';
        // Using a CORS proxy to bypass browser restrictions
        this.proxyUrl = 'https://corsproxy.io/?';
        this.staticData = null;
    }

    async fetchWithProxy(endpoint) {
        const url = `${this.proxyUrl}${this.baseUrl}${endpoint}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }

    async getStaticData() {
        if (this.staticData) return this.staticData;

        try {
            const data = await this.fetchWithProxy('/bootstrap-static/');

            // Apply Deadline Overrides
            if (data && data.events) {
                data.events.forEach(event => {
                    if (DEADLINE_OVERRIDES[event.id]) {
                        event.deadline_time = DEADLINE_OVERRIDES[event.id];
                    }
                });
            }

            this.staticData = data;
            return data;
        } catch (error) {
            console.error('Error fetching static data:', error);
            throw error;
        }
    }

    async getTeamDetails(teamId) {
        return await this.fetchWithProxy(`/entry/${teamId}/`);
    }

    async getTeamHistory(teamId) {
        return await this.fetchWithProxy(`/entry/${teamId}/history/`);
    }

    async getTeamPicks(teamId, gameweek) {
        return await this.fetchWithProxy(`/entry/${teamId}/event/${gameweek}/picks/`);
    }

    async getLeagueStandings(leagueId, page = 1) {
        return await this.fetchWithProxy(`/leagues-classic/${leagueId}/standings/?page_new_entries=1&page_standings=${page}&phase=1`);
    }

    async getPlayerSummary(playerId) {
        return await this.fetchWithProxy(`/element-summary/${playerId}/`);
    }

    async getFixtures() {
        return await this.fetchWithProxy(`/fixtures/`);
    }

    extractTeamId(input) {
        //If input is a number, return it
        if (/^\d+$/.test(input)) return input;

        // Try to extract from URL
        // Example: https://fantasy.premierleague.com/entry/12345/event/12
        // Example: https://fantasy.premierleague.com/entry/12345/history
        const match = input.match(/entry\/(\d+)/);
        if (match && match[1]) {
            return match[1];
        }

        return null;
    }

    getPlayerDetails(playerId) {
        if (!this.staticData) return null;
        return this.staticData.elements.find(p => p.id === playerId);
    }

    getTeamByCode(code) {
        if (!this.staticData) return null;
        return this.staticData.teams.find(t => t.code === code);
    }

    getTeamById(id) {
        if (!this.staticData) return null;
        return this.staticData.teams.find(t => t.id === id);
    }

    getGameweekStatus() {
        if (!this.staticData) return this.getFallbackGameweekStatus();
        const current = this.staticData.events.find(e => e.is_current);
        const next = this.staticData.events.find(e => e.is_next);
        return { current, next };
    }

    getFallbackGameweekStatus() {
        const now = new Date();
        const sortedOverriddenIds = Object.keys(DEADLINE_OVERRIDES)
            .map(Number)
            .sort((a, b) => a - b);

        let next = null;

        for (const id of sortedOverriddenIds) {
            const date = new Date(DEADLINE_OVERRIDES[id]);
            if (date > now) {
                next = {
                    id: id,
                    name: `Gameweek ${id}`,
                    deadline_time: DEADLINE_OVERRIDES[id],
                    is_next: true,
                    is_current: false,
                    is_previous: false
                };
                break;
            }
        }

        return { current: null, next };
    }

    getPlayerImage(code) {
        return `https://resources.premierleague.com/premierleague/photos/players/110x140/p${code}.png`;
    }
}

// Export a singleton instance
export const fplApi = new FPLApi();
