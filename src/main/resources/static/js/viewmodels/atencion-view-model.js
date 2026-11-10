"use strict";
(() => {
    const app = globalThis.Vales;
    const { canAttend, subtotal, validateDraft } = app.ValeRules;
    class AtencionViewModel extends app.ObservableViewModel {
        constructor(valeModel, sessionModel) {
            super({ filters: { estado: '1', q: '', zonal: '', pagina: 0, tamanio: 15 },
                session: null, zones: [], summary: null, items: [], total: 0, loading: false, tableError: '',
                notification: null, detail: null, detailOpen: false, detailLoading: false,
                checkoutOpen: false, checkoutRevision: 0, drafts: [], checkoutError: '', saving: false,
                loggingOut: false, redirectTo: null });
            this.model = valeModel;
            this.sessionModel = sessionModel;
            this.selected = new Map();
            this.listRequest = 0;
            this.detailRequest = 0;
        }
        snapshot() {
            const s = this._state, eligible = s.items.filter(canAttend);
            const count = eligible.filter(v => this.selected.has(v.codigoVale)).length;
            const end = Math.min((s.filters.pagina + 1) * s.filters.tamanio, s.total);
            return { ...s,
                rows: s.items.map(v => ({ ...v, canAttend: canAttend(v), selected: this.selected.has(v.codigoVale) })),
                selectedCount: this.selected.size,
                page: { from: s.total ? s.filters.pagina * s.filters.tamanio + 1 : 0, to: end,
                    previous: !s.loading && s.filters.pagina > 0, next: !s.loading && end < s.total },
                pageSelection: { disabled: s.loading || !eligible.length, checked: eligible.length > 0 && count === eligible.length,
                    indeterminate: count > 0 && count < eligible.length },
                canAttendDetail: canAttend(s.detail),
                checkoutTotal: s.drafts.reduce((sum, draft) => sum + (draft.subtotal ?? 0n), 0n)
            };
        }
        notify(message, failure = false) { this.patch({ notification: { message, failure } }); }
        handleError(error) {
            if (error.status === 401) this.patch({ redirectTo: '/login.html' });
            else this.notify(error.message, true);
        }
        async init() {
            try {
                this.patch({ session: await this.sessionModel.current() });
                this.patch({ zones: await this.model.zones() });
                await this.refresh();
            } catch (error) { this.handleError(error); }
        }
        async load() {
            const request = ++this.listRequest;
            this.patch({ loading: true, tableError: '' });
            try {
                const page = await this.model.list({ ...this._state.filters });
                if (request !== this.listRequest) return false;
                for (const vale of page.items) {
                    if (this.selected.has(vale.codigoVale)) {
                        if (canAttend(vale)) this.selected.set(vale.codigoVale, vale);
                        else this.selected.delete(vale.codigoVale);
                    }
                }
                this.patch({ items: page.items, total: page.total, loading: false });
                return true;
            } catch (error) {
                if (request !== this.listRequest) return false;
                this.patch({ items: [], total: 0, loading: false, tableError: error.message });
                this.handleError(error);
                return false;
            }
        }
        async loadSummary() {
            try { this.patch({ summary: await this.model.summary() }); return true; }
            catch (error) { this.handleError(error); return false; }
        }
        async refresh() { return Promise.all([this.load(), this.loadSummary()]); }
        async search(q, zonal) {
            this.patch({ filters: { ...this._state.filters, q, zonal, pagina: 0 } });
            return this.load();
        }
        async changeState(estado) {
            this.patch({ filters: { ...this._state.filters, estado, pagina: 0 } });
            return this.load();
        }
        async changePage(delta) {
            const page = this.snapshot().page;
            if ((delta < 0 && !page.previous) || (delta > 0 && !page.next)) return;
            this.patch({ filters: { ...this._state.filters, pagina: this._state.filters.pagina + delta } });
            return this.load();
        }
        select(code, checked) {
            const vale = this._state.items.find(v => v.codigoVale === code);
            if (!checked) this.selected.delete(code);
            else if (canAttend(vale)) {
                if (!this.selected.has(code) && this.selected.size >= 20) {
                    this.notify('Puedes registrar hasta 20 vales por lote.', true); return;
                }
                this.selected.set(code, vale);
            }
            this.emit();
        }
        selectPage(checked) {
            let limited = false;
            for (const vale of this._state.items.filter(canAttend)) {
                if (!checked) this.selected.delete(vale.codigoVale);
                else if (this.selected.has(vale.codigoVale) || this.selected.size < 20) this.selected.set(vale.codigoVale, vale);
                else limited = true;
            }
            if (limited) this.notify('Puedes registrar hasta 20 vales por lote.', true);
            else this.emit();
        }
        clearSelection() { this.selected.clear(); this.emit(); }
        async openDetail(code) {
            const request = ++this.detailRequest;
            this.patch({ detailOpen: true, detailLoading: true, detail: null });
            try {
                const detail = await this.model.detail(code);
                if (request === this.detailRequest) this.patch({ detail, detailLoading: false });
            } catch (error) {
                if (request !== this.detailRequest) return;
                this.patch({ detailOpen: false, detailLoading: false }); this.handleError(error);
            }
        }
        closeDetail() { this.detailRequest++; this.patch({ detailOpen: false, detailLoading: false }); }
        reviewSelected() { this.openCheckout([...this.selected.values()]); }
        attendDetail() { if (canAttend(this._state.detail)) this.openCheckout([this._state.detail]); }
        openCheckout(vales) {
            if (this._state.saving || !vales.length) return;
            this.detailRequest++;
            this.patch({ detailOpen: false, checkoutOpen: true, checkoutRevision: this._state.checkoutRevision + 1,
                checkoutError: '', drafts: vales.map(vale => ({ vale, codigoVale: vale.codigoVale,
                    cantidadConsumida: String(vale.cantidadEmitida), precioReal: '', ticket: '', subtotal: null })) });
        }
        closeCheckout() { if (!this._state.saving) this.patch({ checkoutOpen: false }); }
        editDraft(code, field, value) {
            if (this._state.saving || !['cantidadConsumida', 'precioReal', 'ticket'].includes(field)) return;
            const drafts = this._state.drafts.map(draft => {
                if (draft.codigoVale !== code) return draft;
                const next = { ...draft, [field]: value };
                return { ...next, subtotal: subtotal(next.cantidadConsumida, next.precioReal) };
            });
            this.patch({ drafts, checkoutError: '' });
        }
        async save() {
            if (this._state.saving || !this._state.checkoutOpen || !this._state.drafts.length) return;
            const error = this._state.drafts.map(validateDraft).find(Boolean);
            if (error) { this.patch({ checkoutError: error }); return; }
            const payload = this._state.drafts.map(draft => ({ codigoVale: draft.codigoVale,
                cantidadConsumida: draft.cantidadConsumida, precioReal: draft.precioReal, ticket: draft.ticket.trim() }));
            this.patch({ saving: true, checkoutError: '' });
            try {
                const result = await this.model.attend(payload);
                for (const vale of result) this.selected.delete(vale.codigoVale);
                const total = result.reduce((sum, vale) => sum + Number(vale.importe), 0);
                this.patch({ checkoutOpen: false, drafts: [], filters: { ...this._state.filters, pagina: 0 },
                    notification: { message: result.length === 1 ? 'Atención registrada correctamente.' : 'Atenciones registradas correctamente.',
                        failure: false, count: result.length, amount: total } });
                const refreshed = await this.refresh();
                if (refreshed.some(ok => !ok) && !this._state.redirectTo)
                    this.notify('El consumo se registró, pero no se pudo actualizar toda la información. Pulsa Actualizar.', true);
            } catch (error) {
                this.patch({ checkoutError: error.message + ' Si hubo una interrupción, consulta los vales antes de reintentar.' });
                if (error.status === 401) this.handleError(error);
            } finally { this.patch({ saving: false }); }
        }
        async logout() {
            if (this._state.loggingOut) return;
            this.patch({ loggingOut: true });
            try { await this.sessionModel.logout(); this.patch({ redirectTo: '/login.html' }); }
            catch (error) { this.handleError(error); }
            finally { this.patch({ loggingOut: false }); }
        }
    }
    app.AtencionViewModel = AtencionViewModel;
})();
