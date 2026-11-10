"use strict";
(() => {
    const app = globalThis.Vales;
    const { canAttend, subtotal, validateDraft } = app.ValeRules;
    class AtencionModel {
        constructor() {
            this.data = { filters: { estado: '1', q: '', zonal: '', pagina: 0, tamanio: 15 },
                session: null, zones: [], summary: null, items: [], total: 0, loading: false, tableError: '',
                notification: null, detail: null, detailOpen: false, detailLoading: false,
                checkoutOpen: false, checkoutRevision: 0, drafts: [], checkoutError: '', saving: false,
                loggingOut: false, redirectTo: null };
            this.selected = new Map();
        }
        patch(changes) { this.data = { ...this.data, ...changes }; }
        snapshot() {
            const s = this.data, eligible = s.items.filter(canAttend);
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
        acceptPage(page) {
            for (const vale of page.items) {
                if (this.selected.has(vale.codigoVale)) {
                    if (canAttend(vale)) this.selected.set(vale.codigoVale, vale);
                    else this.selected.delete(vale.codigoVale);
                }
            }
            this.patch({ items: page.items, total: page.total, loading: false });
        }
        select(code, checked) {
            const vale = this.data.items.find(v => v.codigoVale === code);
            if (!checked) this.selected.delete(code);
            else if (canAttend(vale)) {
                if (!this.selected.has(code) && this.selected.size >= 20)
                    return 'Puedes registrar hasta 20 vales por lote.';
                this.selected.set(code, vale);
            }
            return '';
        }
        selectPage(checked) {
            let limited = false;
            for (const vale of this.data.items.filter(canAttend)) {
                if (!checked) this.selected.delete(vale.codigoVale);
                else if (this.selected.has(vale.codigoVale) || this.selected.size < 20) this.selected.set(vale.codigoVale, vale);
                else limited = true;
            }
            return limited ? 'Puedes registrar hasta 20 vales por lote.' : '';
        }
        clearSelection() { this.selected.clear(); }
        openCheckout(vales) {
            if (this.data.saving || !vales.length) return false;
            this.patch({ detailOpen: false, checkoutOpen: true, checkoutRevision: this.data.checkoutRevision + 1,
                checkoutError: '', drafts: vales.map(vale => ({ vale, codigoVale: vale.codigoVale,
                    cantidadConsumida: String(vale.cantidadEmitida), precioReal: '', ticket: '', subtotal: null })) });
            return true;
        }
        editDraft(code, field, value) {
            if (this.data.saving || !['cantidadConsumida', 'precioReal', 'ticket'].includes(field)) return;
            const drafts = this.data.drafts.map(draft => {
                if (draft.codigoVale !== code) return draft;
                const next = { ...draft, [field]: value };
                return { ...next, subtotal: subtotal(next.cantidadConsumida, next.precioReal) };
            });
            this.patch({ drafts, checkoutError: '' });
        }
        validateCheckout() { return this.data.drafts.map(validateDraft).find(Boolean) || ''; }
        payload() {
            return this.data.drafts.map(draft => ({ codigoVale: draft.codigoVale,
                cantidadConsumida: draft.cantidadConsumida, precioReal: draft.precioReal, ticket: draft.ticket.trim() }));
        }
        acceptSaved(result) {
            for (const vale of result) this.selected.delete(vale.codigoVale);
            const total = result.reduce((sum, vale) => sum + Number(vale.importe), 0);
            this.patch({ checkoutOpen: false, drafts: [], filters: { ...this.data.filters, pagina: 0 },
                notification: { message: result.length === 1 ? 'Atención registrada correctamente.' : 'Atenciones registradas correctamente.',
                    failure: false, count: result.length, amount: total } });
        }
    }
    app.AtencionModel = AtencionModel;
})();
