"use strict";
(() => {
    const app = globalThis.Vales;
    class LoginViewModel extends app.ObservableViewModel {
        constructor(sessionModel) {
            super({ busy: false, error: '', redirectTo: null });
            this.session = sessionModel;
        }
        async login(username, password) {
            if (this._state.busy) return;
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
    app.LoginViewModel = LoginViewModel;
})();
