
class FPLApi {
    constructor() {
        this.baseUrl = 'https://fantasy.premierleague.com/api';
        // Using a CORS proxy to bypass browser restrictions
        this.proxyUrl = 'https://corsproxy.io/?';
        this.staticData = null;
    }

    async fetchWithProxy(endpoint) {
        const url = `${this.proxyUrl}${encodeURIComponent(this.baseUrl + endpoint)}`;
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

    getPlayerImage(code) {
        return `https://resources.premierleague.com/premierleague/photos/players/110x140/p${code}.png`;
    }
}

// Export a singleton instance
export const fplApi = new FPLApi();
