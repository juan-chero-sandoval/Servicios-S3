"use strict";
(() => {
    const app = globalThis.Vales;
    const { canAttend } = app.ValeRules;
    class AtencionController {
        constructor(valeModel, sessionModel, view, stateModel = new app.AtencionModel()) {
            this.vales = valeModel;
            this.sessionModel = sessionModel;
            this.stateModel = stateModel;
            this.view = view;
            this.listRequest = 0;
            this.detailRequest = 0;
            this.view.bind({
                search: (q, zonal) => this.search(q, zonal), changeState: state => this.changeState(state),
                changePage: delta => this.changePage(delta), select: (code, checked) => this.select(code, checked),
                selectPage: checked => this.selectPage(checked), clearSelection: () => this.clearSelection(),
                refresh: () => this.refresh(), openDetail: code => this.openDetail(code), closeDetail: () => this.closeDetail(),
                reviewSelected: () => this.reviewSelected(), attendDetail: () => this.attendDetail(),
                editDraft: (code, field, value) => this.editDraft(code, field, value), save: () => this.save(),
                closeCheckout: () => this.closeCheckout(), logout: () => this.logout()
            });
            this.render();
        }
        get state() { return this.stateModel.snapshot(); }
        render() { this.view.render(this.stateModel.snapshot()); }
        patch(changes) { this.stateModel.patch(changes); this.render(); }
        notify(message, failure = false) { this.patch({ notification: { message, failure } }); }
        handleError(error) {
            if (error.status === 401) this.patch({ redirectTo: '/login.html' });
            else this.notify(error.message, true);
        }
        async init() {
            try {
                this.patch({ session: await this.sessionModel.current() });
                this.patch({ zones: await this.vales.zones() });
                await this.refresh();
            } catch (error) { this.handleError(error); }
        }
        async load() {
            const request = ++this.listRequest;
            this.patch({ loading: true, tableError: '' });
            try {
                const page = await this.vales.list({ ...this.stateModel.data.filters });
                if (request !== this.listRequest) return false;
                this.stateModel.acceptPage(page);
                this.render();
                return true;
            } catch (error) {
                if (request !== this.listRequest) return false;
                this.patch({ items: [], total: 0, loading: false, tableError: error.message });
                this.handleError(error);
                return false;
            }
        }
        async loadSummary() {
            try { this.patch({ summary: await this.vales.summary() }); return true; }
            catch (error) { this.handleError(error); return false; }
        }
        async refresh() { return Promise.all([this.load(), this.loadSummary()]); }
        async search(q, zonal) {
            this.patch({ filters: { ...this.stateModel.data.filters, q, zonal, pagina: 0 } });
            return this.load();
        }
        async changeState(estado) {
            this.patch({ filters: { ...this.stateModel.data.filters, estado, pagina: 0 } });
            return this.load();
        }
        async changePage(delta) {
            const page = this.stateModel.snapshot().page;
            if ((delta < 0 && !page.previous) || (delta > 0 && !page.next)) return;
            this.patch({ filters: { ...this.stateModel.data.filters, pagina: this.stateModel.data.filters.pagina + delta } });
            return this.load();
        }
        select(code, checked) {
            const error = this.stateModel.select(code, checked);
            if (error) this.notify(error, true); else this.render();
        }
        selectPage(checked) {
            const error = this.stateModel.selectPage(checked);
            if (error) this.notify(error, true); else this.render();
        }
        clearSelection() { this.stateModel.clearSelection(); this.render(); }
        async openDetail(code) {
            const request = ++this.detailRequest;
            this.patch({ detailOpen: true, detailLoading: true, detail: null });
            try {
                const detail = await this.vales.detail(code);
                if (request === this.detailRequest) this.patch({ detail, detailLoading: false });
            } catch (error) {
                if (request !== this.detailRequest) return;
                this.patch({ detailOpen: false, detailLoading: false }); this.handleError(error);
            }
        }
        closeDetail() { this.detailRequest++; this.patch({ detailOpen: false, detailLoading: false }); }
        reviewSelected() { this.openCheckout([...this.stateModel.selected.values()]); }
        attendDetail() { if (canAttend(this.stateModel.data.detail)) this.openCheckout([this.stateModel.data.detail]); }
        openCheckout(vales) {
            if (this.stateModel.openCheckout(vales)) { this.detailRequest++; this.render(); }
        }
        closeCheckout() { if (!this.stateModel.data.saving) this.patch({ checkoutOpen: false }); }
        editDraft(code, field, value) {
            this.stateModel.editDraft(code, field, value);
            this.render();
        }
        async save() {
            if (this.stateModel.data.saving || !this.stateModel.data.checkoutOpen || !this.stateModel.data.drafts.length) return;
            const error = this.stateModel.validateCheckout();
            if (error) { this.patch({ checkoutError: error }); return; }
            const payload = this.stateModel.payload();
            this.patch({ saving: true, checkoutError: '' });
            try {
                const result = await this.vales.attend(payload);
                this.stateModel.acceptSaved(result);
                this.render();
                const refreshed = await this.refresh();
                if (refreshed.some(ok => !ok) && !this.stateModel.data.redirectTo)
                    this.notify('El consumo se registró, pero no se pudo actualizar toda la información. Pulsa Actualizar.', true);
            } catch (error) {
                this.patch({ checkoutError: error.message + ' Si hubo una interrupción, consulta los vales antes de reintentar.' });
                if (error.status === 401) this.handleError(error);
            } finally { this.patch({ saving: false }); }
        }
        async logout() {
            if (this.stateModel.data.loggingOut) return;
            this.patch({ loggingOut: true });
            try { await this.sessionModel.logout(); this.patch({ redirectTo: '/login.html' }); }
            catch (error) { this.handleError(error); }
            finally { this.patch({ loggingOut: false }); }
        }
    }
    app.AtencionController = AtencionController;
})();
