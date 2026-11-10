"use strict";
(() => {
    const app = globalThis.Vales = globalThis.Vales || {};
    class SessionModel {
        constructor(api) { this.api = api; }
        async current() {
            const [session] = await Promise.all([this.api.request('/api/sesion'), this.api.refreshCsrf()]);
            return session;
        }
        async login(username, password) {
            const body = [['username', username], ['password', password]]
                .map(([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(value)).join('&');
            await this.api.request('/login', {
                method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body
            });
            this.api.csrf = null;
            await this.api.refreshCsrf();
        }
        async logout() {
            await this.api.request('/logout', { method: 'POST' });
            this.api.csrf = null;
        }
    }
    app.SessionModel = SessionModel;
})();
