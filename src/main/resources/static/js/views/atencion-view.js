"use strict";
(() => {
    const app = globalThis.Vales;
    const { money, quantity: qty, escape: esc, date, dateTime, status } = app.Formatters;
    class AtencionView {
        constructor(root, viewModel, navigate = url => globalThis.location.replace(url)) {
            this.root = root; this.vm = viewModel; this.navigate = navigate;
            this.checkoutRevision = -1; this.lastDetail = undefined; this.lastItems = undefined;
            this.$ = selector => this.root.querySelector(selector);
            this.bind();
            this.unsubscribe = this.vm.subscribe(state => this.render(state));
        }
        bind() {
            const $ = this.$;
            $('#rows').addEventListener('change', event => {
                if (event.target.dataset.code) this.vm.select(event.target.dataset.code, event.target.checked);
            });
            $('#rows').addEventListener('click', event => {
                const button = event.target.closest('.detail');
                if (button) this.vm.openDetail(button.dataset.code);
            });
            $('#select-page').addEventListener('change', event => this.vm.selectPage(event.target.checked));
            $('#clear').addEventListener('click', () => this.vm.clearSelection());
            $('#filters').addEventListener('submit', event => {
                event.preventDefault(); this.vm.search($('#search').value, $('#zonal').value);
            });
            $('#zonal').addEventListener('change', () => this.vm.search($('#search').value, $('#zonal').value));
            for (const tab of this.root.querySelectorAll('.tab')) tab.addEventListener('click', () => this.vm.changeState(tab.dataset.state));
            $('#prev').addEventListener('click', () => this.vm.changePage(-1));
            $('#next').addEventListener('click', () => this.vm.changePage(1));
            $('#refresh').addEventListener('click', () => this.vm.refresh());
            $('#review').addEventListener('click', () => this.vm.reviewSelected());
            $('#logout').addEventListener('click', () => this.vm.logout());
            $('#attention-form').addEventListener('submit', event => { event.preventDefault(); this.vm.save(); });
            $('#checkout-items').addEventListener('input', event => {
                const item = event.target.closest('.attention-item');
                if (item) this.vm.editDraft(item.dataset.code, event.target.name, event.target.value);
            });
            for (const button of this.root.querySelectorAll('.close-dialog')) button.addEventListener('click', () => this.vm.closeCheckout());
            $('#checkout').addEventListener('cancel', event => { event.preventDefault(); this.vm.closeCheckout(); });
            for (const button of this.root.querySelectorAll('.close-details')) button.addEventListener('click', () => this.vm.closeDetail());
            $('#details').addEventListener('cancel', event => { event.preventDefault(); this.vm.closeDetail(); });
            $('#detail-content').addEventListener('click', event => {
                if (event.target.closest('#attend-detail')) this.vm.attendDetail();
            });
        }
        render(state) {
            const $ = this.$;
            if (state.session) {
                $('#usuario').textContent = state.session.usuario;
                $('#ruc').textContent = 'RUC ' + state.session.ruc;
                $('#environment').textContent = state.session.demo ? '●  Entorno de demostración' : '●  Base administrativa';
                $('#demo-banner').hidden = !state.session.demo;
            }
            if (this.lastZones !== state.zones) {
                this.lastZones = state.zones;
                $('#zonal').innerHTML = '<option value="">Todas las zonales</option>' + state.zones.map(zone => `<option value="${esc(zone.codigo)}">${esc(zone.nombre)}</option>`).join('');
            }
            $('#zonal').value = state.filters.zonal;
            if (this.root.activeElement !== $('#search')) $('#search').value = state.filters.q;
            for (const tab of this.root.querySelectorAll('.tab')) {
                const active = tab.dataset.state === state.filters.estado;
                tab.classList.toggle('active', active); tab.setAttribute('aria-pressed', active);
            }
            if (state.summary) {
                $('#stat-total').textContent = state.summary.total; $('#stat-auth').textContent = state.summary.autorizados;
                $('#stat-used').textContent = state.summary.consumidos; $('#stat-amount').textContent = money(state.summary.importe);
            }
            const notification = $('#notification'); notification.hidden = !state.notification;
            if (state.notification) {
                const n = state.notification;
                notification.textContent = n.message + (n.count ? ` ${n.count} ${n.count === 1 ? 'vale consumido' : 'vales consumidos'}. Importe: ${money(n.amount)}.` : '');
                notification.classList.toggle('failure', n.failure);
            }
            this.renderRows(state);
            $('#page-label').textContent = `Mostrando ${state.page.from}–${state.page.to} de ${state.total} vales`;
            $('#prev').disabled = !state.page.previous; $('#next').disabled = !state.page.next;
            $('#select-page').disabled = state.pageSelection.disabled;
            $('#select-page').checked = state.pageSelection.checked; $('#select-page').indeterminate = state.pageSelection.indeterminate;
            $('#selection-bar').hidden = !state.selectedCount;
            $('#selection-label').textContent = `${state.selectedCount} ${state.selectedCount === 1 ? 'vale seleccionado' : 'vales seleccionados'}`;
            $('#logout').disabled = state.loggingOut;
            this.renderDetails(state);
            this.renderCheckout(state);
            if (state.redirectTo && state.redirectTo !== this.lastRedirect) {
                this.lastRedirect = state.redirectTo; this.navigate(state.redirectTo);
            }
        }
        renderRows(state) {
            const $ = this.$;
            if (this.lastItems !== state.items || this.lastLoading !== state.loading || this.lastTableError !== state.tableError) {
                this.lastItems = state.items; this.lastLoading = state.loading; this.lastTableError = state.tableError;
                if (state.loading) $('#rows').innerHTML = '<tr><td colspan="8" class="empty">Consultando vales…</td></tr>';
                else if (state.tableError) $('#rows').innerHTML = `<tr><td colspan="8" class="empty">${esc(state.tableError)}<br>Usa Actualizar para reintentar.</td></tr>`;
                else $('#rows').innerHTML = state.rows.length ? state.rows.map(v => `<tr data-row="${esc(v.codigoVale)}"><td class="check-cell"><input type="checkbox" data-code="${esc(v.codigoVale)}" aria-label="Seleccionar vale ${esc(v.codigoVale)}" ${v.canAttend ? '' : 'disabled'}></td><td><strong class="code">${esc(v.codigoVale)}</strong><small>${esc(date(v.fechaEmision))}</small></td><td><strong>${esc(v.placa)}</strong><small>${esc(v.trabajador)}</small></td><td><strong>${esc(v.zonal)}</strong><small>${esc(v.localidad)}</small></td><td>${esc(v.idSuministro)}<small>${esc(v.tipoVehiculo)}</small></td><td class="number"><strong>${qty(v.cantidadEmitida)}</strong><small>galones</small></td><td>${status(v)}</td><td class="number"><button class="link-button detail" data-code="${esc(v.codigoVale)}">Ver detalle →</button></td></tr>`).join('') : '<tr><td colspan="8" class="empty">No hay vales para estos filtros.<br>Prueba con otro código o zonal.</td></tr>';
            }
            if (!state.loading && !state.tableError) {
                const rows = new Map(state.rows.map(row => [row.codigoVale, row]));
                for (const row of this.root.querySelectorAll('#rows tr[data-row]')) {
                    const item = rows.get(row.dataset.row);
                    row.classList.toggle('selected', item.selected);
                    row.querySelector('input[type=checkbox]').checked = item.selected;
                }
            }
        }
        toggleDialog(dialog, open) {
            if (open && !dialog.open) dialog.showModal();
            else if (!open && dialog.open) dialog.close();
        }
        renderDetails(state) {
            if (this.lastDetail !== state.detail || this.lastDetailLoading !== state.detailLoading) {
                this.lastDetail = state.detail; this.lastDetailLoading = state.detailLoading;
                const v = state.detail;
                this.$('#detail-title').textContent = v?.codigoVale || 'Consultando vale…';
                const field = (label, value) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;
                this.$('#detail-content').innerHTML = !v ? '<p class="muted">Cargando detalle…</p>' : status(v)
                    + `<dl class="detail-grid">${field('Unidad', v.placa)}${field('Tipo', v.tipoVehiculo)}${field('Trabajador', v.trabajador)}${field('Suministro (código)', v.idSuministro)}${field('Zonal', v.zonal)}${field('Localidad', v.localidad)}${field('Galones emitidos', qty(v.cantidadEmitida))}${field('Precio referencial / galón', money(v.precioReferencial))}${field('Proveedor', v.proveedor)}${field('RUC', v.codProveedor)}${field('Contrato', v.nrocontrato || 'S/C')}${field('Emisión', dateTime(v.fechaEmision))}</dl>`
                    + (v.fechaConsumo ? `<h3 class="detail-separator">Atención registrada</h3><dl class="detail-grid">${field('Consumo (hora de Lima)', dateTime(v.fechaConsumo))}${field('Galones entregados', qty(v.cantidadConsumida))}${field('Precio real / galón', money(v.precioReal))}${field('Importe registrado', money(v.importe))}${field('Ticket', v.ticket)}${field('Usuario que registró', v.usuario)}</dl>` : '')
                    + (state.canAttendDetail ? '<button class="primary" id="attend-detail">Atender este vale →</button>' : '');
            }
            // Cerrar el detalle antes de abrir la confirmación mantiene un único modal activo.
            this.toggleDialog(this.$('#details'), state.detailOpen);
        }
        renderCheckout(state) {
            const $ = this.$;
            if (state.checkoutRevision !== this.checkoutRevision) {
                this.checkoutRevision = state.checkoutRevision;
                $('#checkout-items').innerHTML = state.drafts.map(d => `<section class="attention-item" data-code="${esc(d.codigoVale)}"><div class="item-title"><strong>${esc(d.codigoVale)} · ${esc(d.vale.placa)}</strong><small>${esc(d.vale.idSuministro)} · Emitido: ${qty(d.vale.cantidadEmitida)} gal</small></div><div class="item-inputs"><label>Galones entregados<input name="cantidadConsumida" type="number" min="0.01" max="${esc(d.vale.cantidadEmitida)}" step="0.01" value="${esc(d.cantidadConsumida)}" required inputmode="decimal"></label><label>Precio real / galón (S/)<input name="precioReal" type="number" min="0.01" max="999999999999.99" step="0.01" placeholder="0.00" required inputmode="decimal"></label><label>Número de ticket<input name="ticket" maxlength="15" required placeholder="Ej. T001-00452" autocomplete="off"></label></div><p class="line-total">Importe <strong>—</strong></p></section>`).join('');
            }
            const drafts = new Map(state.drafts.map(draft => [draft.codigoVale, draft]));
            for (const item of this.root.querySelectorAll('.attention-item')) {
                const draft = drafts.get(item.dataset.code);
                if (!draft) continue;
                for (const input of item.querySelectorAll('input')) {
                    if (input.value !== draft[input.name]) input.value = draft[input.name];
                    input.disabled = state.saving;
                }
                item.querySelector('.line-total strong').textContent = draft.subtotal === null ? '—' : money(Number(draft.subtotal) / 100);
            }
            $('#checkout-total').textContent = money(Number(state.checkoutTotal) / 100);
            $('#checkout-error').hidden = !state.checkoutError; $('#checkout-error').textContent = state.checkoutError;
            if (state.checkoutError && state.checkoutError !== this.lastCheckoutError) $('#checkout-error').scrollIntoView({ block: 'nearest' });
            this.lastCheckoutError = state.checkoutError;
            $('#save').disabled = state.saving; $('#save').textContent = state.saving ? 'Registrando…' : 'Registrar consumo';
            for (const button of this.root.querySelectorAll('.close-dialog')) button.disabled = state.saving;
            this.toggleDialog($('#checkout'), state.checkoutOpen);
        }
    }
    app.AtencionView = AtencionView;
})();
