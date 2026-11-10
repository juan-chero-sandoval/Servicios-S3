"use strict";
(() => {
    const app = globalThis.Vales;
    class LoginView {
        constructor(root, navigate = url => globalThis.location.replace(url)) {
            this.root = root; this.navigate = navigate;
            this.form = root.querySelector('#login-form');
        }
        bind(actions) {
            this.form.addEventListener('submit', event => {
                event.preventDefault();
                actions.login(this.form.elements.namedItem('username').value, this.form.elements.namedItem('password').value);
            });
        }
        render(state) {
            const button = this.form.querySelector('button'), error = this.root.querySelector('#login-error');
            button.disabled = state.busy; button.textContent = state.busy ? 'Ingresando…' : 'Ingresar';
            error.hidden = !state.error; error.textContent = state.error;
            if (state.redirectTo && this.lastRedirect !== state.redirectTo) {
                this.lastRedirect = state.redirectTo;
                this.form.elements.namedItem('password').value = '';
                this.navigate(state.redirectTo);
            }
        }
    }
    app.LoginView = LoginView;
})();
