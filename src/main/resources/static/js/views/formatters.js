"use strict";
(() => {
    const app = globalThis.Vales;
    const money = value => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value ?? 0);
    const quantity = value => new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value ?? 0);
    const escape = value => String(value ?? '—').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
    const date = value => value ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeZone: 'America/Lima' }).format(new Date(value + '-05:00')) : '—';
    const dateTime = value => value ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Lima' }).format(new Date(value + '-05:00')) : '—';
    const status = vale => `<span class="status status-${Number(vale.estadoVale)}">${escape(vale.estado || 'SIN ESTADO')}</span>`;
    app.Formatters = { money, quantity, escape, date, dateTime, status };
})();
