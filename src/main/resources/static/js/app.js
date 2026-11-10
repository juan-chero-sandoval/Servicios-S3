"use strict";
(() => {
    const app = globalThis.Vales;
    const api = new app.ApiClient(globalThis.fetch.bind(globalThis));
    const viewModel = new app.AtencionViewModel(new app.ValeModel(api), new app.SessionModel(api));
    new app.AtencionView(document, viewModel);
    viewModel.init();
})();
