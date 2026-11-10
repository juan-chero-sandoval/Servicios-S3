"use strict";
(() => {
    const app = globalThis.Vales;
    class LoginModel {
        constructor() { this.data = { busy: false, error: '', redirectTo: null }; }
        patch(changes) { this.data = { ...this.data, ...changes }; }
        snapshot() { return { ...this.data }; }
    }
    app.LoginModel = LoginModel;
})();
