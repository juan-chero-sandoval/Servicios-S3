"use strict";
(() => {
    const app = globalThis.Vales;
    const api = new app.ApiClient(globalThis.fetch.bind(globalThis));
    const viewModel = new app.LoginViewModel(new app.SessionModel(api));
    new app.LoginView(document, viewModel);
})();
