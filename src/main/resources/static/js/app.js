"use strict";
(() => {
    const app = globalThis.Vales;
    const api = new app.ApiClient(globalThis.fetch.bind(globalThis));
    const view = new app.AtencionView(document);
    const controller = new app.AtencionController(new app.ValeModel(api), new app.SessionModel(api), view);
    controller.init();
})();
