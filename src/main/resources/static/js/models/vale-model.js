"use strict";
(() => {
    const app = globalThis.Vales = globalThis.Vales || {};
    const cents = value => {
        const text = String(value).trim();
        if (!/^\d{1,12}(\.\d{1,2})?$/.test(text)) return null;
        const [integer, fraction = ''] = text.split('.');
        return BigInt(integer) * 100n + BigInt(fraction.padEnd(2, '0'));
    };
    const subtotal = (quantity, price) => {
        const a = cents(quantity), b = cents(price);
        return a === null || b === null ? null : (a * b + 50n) / 100n;
    };
    const canAttend = vale => Boolean(vale && vale.activo && vale.estadoVale === 1 && !vale.fechaConsumo
        && vale.cantidadConsumida == null && vale.precioReal == null && vale.importe == null
        && vale.ticket == null && Number(vale.cantidadEmitida) > 0);
    function validateDraft(draft) {
        const quantity = cents(draft.cantidadConsumida), price = cents(draft.precioReal);
        if (quantity === null || price === null || quantity <= 0n || price <= 0n)
            return 'Usa cantidades y precios positivos con un máximo de dos decimales.';
        const authorized = cents(draft.vale.cantidadEmitida);
        if (authorized === null || quantity > authorized)
            return 'La cantidad supera los galones emitidos del vale ' + draft.codigoVale + '.';
        const amount = subtotal(draft.cantidadConsumida, draft.precioReal);
        if (amount < 1n || amount > 99999999999999n)
            return 'El importe debe estar entre S/ 0.01 y S/ 999999999999.99.';
        if (!/^[A-Za-z0-9][A-Za-z0-9 /_-]{0,14}$/.test(draft.ticket.trim()))
            return 'Revisa el ticket del vale ' + draft.codigoVale + ': máximo 15 caracteres, empezando por letra o número.';
        return '';
    }
    class ValeModel {
        constructor(api) { this.api = api; }
        list(filters) {
            const values = { q: filters.q.trim(), zonal: filters.zonal, pagina: filters.pagina, tamanio: filters.tamanio };
            if (filters.estado !== '') values.estado = filters.estado;
            const query = Object.entries(values).map(([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(value)).join('&');
            return this.api.request('/api/vales?' + query);
        }
        detail(code) { return this.api.request('/api/vales/' + encodeURIComponent(code)); }
        summary() { return this.api.request('/api/resumen'); }
        zones() { return this.api.request('/api/zonales'); }
        attend(vales) {
            return this.api.request('/api/atenciones', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vales })
            });
        }
    }
    app.ValeRules = { cents, subtotal, canAttend, validateDraft };
    app.ValeModel = ValeModel;
})();
