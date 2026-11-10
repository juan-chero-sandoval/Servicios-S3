"use strict";
(() => {
    const app = globalThis.Vales;
    class LoginController {
        constructor(sessionModel, view, model = new app.LoginModel()) {
            this.session = sessionModel; this.view = view; this.model = model;
            this.view.bind({ login: (username, password) => this.login(username, password) });
            this.render();
        }
        get state() { return this.model.snapshot(); }
        patch(changes) { this.model.patch(changes); this.render(); }
        render() { this.view.render(this.model.snapshot()); }
        async login(username, password) {
            if (this.model.data.busy) return;
            if (!username.trim() || !password) { this.patch({ error: 'Ingresa tu usuario y contraseña.' }); return; }
            this.patch({ busy: true, error: '' });
            try {
                await this.session.login(username.trim(), password);
                this.patch({ redirectTo: '/' });
            } catch (error) {
                this.patch({ error: error.message });
            } finally { this.patch({ busy: false }); }
        }
    }
    app.LoginController = LoginController;
})();
