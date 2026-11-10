"use strict";
(() => {
    const app = globalThis.Vales;
    const api = new app.ApiClient(globalThis.fetch.bind(globalThis));
    const view = new app.LoginView(document);
    new app.LoginController(new app.SessionModel(api), view);
})();
