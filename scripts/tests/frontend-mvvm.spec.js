"use strict";
async function runFrontendTests() {
    const results = [];
    const { ApiClient, ApiError, SessionModel, ValeModel, ValeRules, AtencionViewModel, LoginViewModel, Formatters } = globalThis.Vales;
    function assert(condition, message = 'Aserción fallida') { if (!condition) throw new Error(message); }
    function equal(actual, expected) { assert(actual === expected, String(actual) + ' != ' + String(expected)); }
    async function test(name, operation) {
        try { await operation(); results.push(name); }
        catch (error) { throw new Error(name + ': ' + error.message); }
    }
    function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
    function vale(code = '2026110001', changes = {}) {
        return { codigoVale: code, activo: true, estadoVale: 1, cantidadEmitida: 20, fechaConsumo: null,
            cantidadConsumida: null, precioReal: null, importe: null, ticket: null, ...changes };
    }
    function fixture(items = [vale()]) {
        const calls = { attend: [], list: [] };
        const model = {
            list: async filters => { calls.list.push(filters); return { items, total: items.length }; },
            zones: async () => [{ codigo: '01', nombre: 'PIURA' }],
            summary: async () => ({ total: items.length, autorizados: items.length, consumidos: 0, importe: 0 }),
            detail: async code => items.find(item => item.codigoVale === code),
            attend: async payload => { calls.attend.push(payload); return payload.map(v => ({ ...v, estadoVale: 2, importe: 173.23 })); }
        };
        const session = { current: async () => ({ usuario: 'operador', ruc: '20100032458', demo: true }), logout: async () => {} };
        return { model, session, calls, vm: new AtencionViewModel(model, session) };
    }
    async function draft(f = fixture()) {
        await f.vm.init(); f.vm.select('2026110001', true); f.vm.reviewSelected();
        f.vm.editDraft('2026110001', 'cantidadConsumida', '10.25');
        f.vm.editDraft('2026110001', 'precioReal', '16.90');
        f.vm.editDraft('2026110001', 'ticket', ' T001-42 ');
        return f;
    }
    await test('Redondeo exacto HALF_UP', () => {
        equal(ValeRules.subtotal('10.25', '16.90'), 17323n);
        equal(ValeRules.subtotal('1.25', '1.69'), 211n);
        equal(ValeRules.subtotal('0.01', '1.50'), 2n);
        equal(ValeRules.subtotal('20', '16.90'), 33800n);
        equal(ValeRules.subtotal('0.01', '0.01'), 0n);
        equal(ValeRules.cents('999999999999.99'), 99999999999999n);
        for (const input of ['', '-1', '0.001', 'NaN', '1e3', '1,23', '1000000000000']) equal(ValeRules.cents(input), null);
    });
    await test('Elegibilidad exige autorización y ausencia de consumo', () => {
        assert(ValeRules.canAttend(vale()));
        for (const estadoVale of [0, 2, 3, 4]) assert(!ValeRules.canAttend(vale('1', { estadoVale })));
        for (const property of ['fechaConsumo', 'cantidadConsumida', 'precioReal', 'importe', 'ticket'])
            assert(!ValeRules.canAttend(vale('1', { [property]: property === 'fechaConsumo' ? '2026-11-09' : 1 })));
        assert(!ValeRules.canAttend(vale('1', { activo: false })));
        assert(!ValeRules.canAttend(vale('1', { cantidadEmitida: 0 })));
    });
    await test('Inicialización publica sesión, filtros y filas', async () => {
        const f = fixture(); const observed = []; const unsubscribe = f.vm.subscribe(state => observed.push(state));
        await f.vm.init(); equal(f.vm.state.rows.length, 1); equal(f.vm.state.session.usuario, 'operador');
        equal(f.vm.state.zones[0].codigo, '01'); equal(f.calls.list[0].estado, '1'); assert(observed.length > 2);
        unsubscribe(); const before = observed.length; f.vm.clearSelection(); equal(observed.length, before);
    });
    await test('Selección deshabilita estados ajenos', async () => {
        const f = fixture([vale(), vale('2', { estadoVale: 2 })]); await f.vm.init();
        f.vm.select('2', true); equal(f.vm.state.selectedCount, 0);
        f.vm.select('2026110001', true); equal(f.vm.state.selectedCount, 1); assert(f.vm.state.pageSelection.checked);
        f.vm.clearSelection(); equal(f.vm.state.selectedCount, 0);
    });
    await test('Límite de 20 vales y selección de página', async () => {
        const items = Array.from({ length: 21 }, (_, i) => vale(String(i + 1)));
        const f = fixture(items); await f.vm.init(); f.vm.selectPage(true); equal(f.vm.state.selectedCount, 20);
        f.vm.select('21', true); equal(f.vm.state.selectedCount, 20); assert(f.vm.state.notification.failure);
        f.vm.selectPage(false); equal(f.vm.state.selectedCount, 0);
    });
    await test('Búsqueda reinicia página y conserva filtro de estado', async () => {
        const f = fixture(); await f.vm.init(); await f.vm.search('DEM-001', '01');
        equal(f.calls.list.at(-1).q, 'DEM-001'); equal(f.calls.list.at(-1).zonal, '01');
        await f.vm.changeState('2'); equal(f.calls.list.at(-1).estado, '2'); equal(f.vm.state.filters.pagina, 0);
    });
    await test('La búsqueda más reciente prevalece ante respuestas tardías', async () => {
        const f = fixture(); const a = deferred(), b = deferred();
        f.model.list = filters => filters.q === 'old' ? a.promise : b.promise;
        const old = f.vm.search('old', ''), latest = f.vm.search('new', '');
        b.resolve({ items: [vale('new')], total: 1 }); await latest;
        a.resolve({ items: [vale('old')], total: 1 }); await old;
        equal(f.vm.state.items[0].codigoVale, 'new'); assert(!f.vm.state.loading);
    });
    await test('El refresco retira selecciones que ya se consumieron', async () => {
        const f = fixture(); await f.vm.init(); f.vm.select('2026110001', true);
        f.model.list = async () => ({ items: [vale('2026110001', { estadoVale: 2 })], total: 1 });
        await f.vm.load(); equal(f.vm.state.selectedCount, 0);
    });
    await test('Una respuesta tardía no reabre un detalle cerrado', async () => {
        const f = fixture(), pending = deferred(); f.model.detail = () => pending.promise;
        const opening = f.vm.openDetail('2026110001'); f.vm.closeDetail();
        pending.resolve(vale()); await opening; assert(!f.vm.state.detailOpen); equal(f.vm.state.detail, null);
    });
    await test('Se puede atender desde el detalle sin selección previa', async () => {
        const f = fixture(); await f.vm.openDetail('2026110001'); f.vm.attendDetail();
        assert(!f.vm.state.detailOpen); assert(f.vm.state.checkoutOpen); equal(f.vm.state.drafts.length, 1);
    });
    await test('El borrador y su total residen en el ViewModel', async () => {
        const f = await draft(); equal(f.vm.state.checkoutTotal, 17323n); equal(f.vm.state.drafts[0].precioReal, '16.90');
        equal(f.vm.state.selectedCount, 1); assert(f.vm.state.checkoutOpen);
    });
    await test('Se rechazan cantidad excesiva, cero, ticket inválido y decimales', async () => {
        const f = await draft();
        for (const [field, value] of [['cantidadConsumida', '20.01'], ['cantidadConsumida', '0'], ['cantidadConsumida', '1.001'], ['ticket', '<script>']]) {
            f.vm.editDraft('2026110001', field, value); await f.vm.save();
            assert(Boolean(f.vm.state.checkoutError)); equal(f.calls.attend.length, 0);
            f.vm.editDraft('2026110001', 'cantidadConsumida', '10.25'); f.vm.editDraft('2026110001', 'ticket', 'T1');
        }
    });
    await test('Un guardado exitoso cierra el diálogo y limpia selección', async () => {
        const f = await draft(); await f.vm.save(); equal(f.calls.attend.length, 1);
        equal(f.calls.attend[0][0].ticket, 'T001-42'); equal(Object.keys(f.calls.attend[0][0]).sort().join(','), 'cantidadConsumida,codigoVale,precioReal,ticket');
        assert(!f.vm.state.checkoutOpen); assert(!f.vm.state.saving); equal(f.vm.state.selectedCount, 0);
        equal(f.vm.state.notification.amount, 173.23);
    });
    await test('Doble clic no duplica POST y no permite cerrar mientras guarda', async () => {
        const f = await draft(), pending = deferred(); let writes = 0;
        f.model.attend = () => { writes++; return pending.promise; };
        const saving = f.vm.save(); await f.vm.save(); f.vm.closeCheckout();
        assert(f.vm.state.checkoutOpen); assert(f.vm.state.saving); equal(writes, 1);
        f.vm.editDraft('2026110001', 'precioReal', '1'); equal(f.vm.state.drafts[0].precioReal, '16.90');
        pending.resolve([{ codigoVale: '2026110001', importe: 173.23 }]); await saving; assert(!f.vm.state.saving);
    });
    await test('Conflicto preserva borradores y selección para revisar', async () => {
        const f = await draft(); f.model.attend = async () => { throw new ApiError(409, 'Vale consumido'); };
        await f.vm.save(); assert(f.vm.state.checkoutOpen); equal(f.vm.state.selectedCount, 1);
        equal(f.vm.state.drafts[0].precioReal, '16.90'); assert(f.vm.state.checkoutError.includes('Vale consumido')); assert(!f.vm.state.saving);
    });
    await test('Fallo de refresco después del éxito no repite el consumo', async () => {
        const f = await draft(); f.model.summary = async () => { throw new Error('Sin conexión'); };
        await f.vm.save(); equal(f.calls.attend.length, 1); assert(!f.vm.state.checkoutOpen);
        assert(f.vm.state.notification.message.includes('El consumo se registró'));
    });
    await test('Sesión vencida solicita navegación sin usar el navegador', async () => {
        const f = fixture(); f.model.list = async () => { throw new ApiError(401, 'Sesión vencida'); };
        await f.vm.load(); equal(f.vm.state.redirectTo, '/login.html'); assert(!f.vm.state.loading);
    });
    await test('Cerrar sesión solo navega si el servidor lo confirma', async () => {
        const f = fixture(); f.session.logout = async () => { throw new Error('Sin conexión'); };
        await f.vm.logout(); equal(f.vm.state.redirectTo, null); assert(f.vm.state.notification.failure);
        f.session.logout = async () => {}; await f.vm.logout(); equal(f.vm.state.redirectTo, '/login.html');
    });
    await test('Login observable, sin contraseña en el estado', async () => {
        const pending = deferred(); let calls = 0;
        const vm = new LoginViewModel({ login: () => { calls++; return pending.promise; } });
        const login = vm.login('operador', 'demo1234'); assert(vm.state.busy); await vm.login('operador', 'demo1234'); equal(calls, 1);
        assert(!JSON.stringify(vm.state).includes('demo1234')); pending.resolve(); await login;
        equal(vm.state.redirectTo, '/'); assert(!vm.state.busy);
    });
    await test('Login fallido muestra el error y permite reintentar', async () => {
        const vm = new LoginViewModel({ login: async () => { throw new ApiError(401, 'Credenciales inválidas'); } });
        await vm.login('operador', 'incorrecta'); equal(vm.state.error, 'Credenciales inválidas');
        assert(!vm.state.busy); equal(vm.state.redirectTo, null);
    });
    await test('Cliente HTTP conserva cookies y envía CSRF en escrituras', async () => {
        const calls = [];
        const api = new ApiClient(async (path, options) => {
            calls.push({ path, options });
            return { ok: true, status: path === '/api/csrf' ? 200 : 204, json: async () => ({ headerName: 'X-CSRF-TOKEN', token: 'token-test' }) };
        });
        await api.request('/api/atenciones', { method: 'POST', body: '{}' });
        equal(calls[0].path, '/api/csrf'); equal(calls[1].options.headers['X-CSRF-TOKEN'], 'token-test');
        equal(calls[1].options.credentials, 'same-origin');
    });
    await test('El login renueva el token CSRF después de autenticar', async () => {
        let tokens = 0; const calls = [];
        const api = new ApiClient(async (path, options) => {
            calls.push({ path, options }); return { ok: true, status: path === '/login' ? 204 : 200,
                json: async () => ({ headerName: 'X-CSRF-TOKEN', token: String(++tokens) }) };
        });
        await new SessionModel(api).login('user', 'a&b');
        equal(tokens, 2); equal(api.csrf.token, '2'); equal(calls[1].options.body, 'username=user&password=a%26b');
    });
    await test('Errores HTTP sin JSON conservan un mensaje útil', async () => {
        const api = new ApiClient(async () => ({ ok: false, status: 403, json: async () => { throw new Error('HTML'); } }));
        try { await api.request('/api/vales'); throw new Error('Debía fallar'); }
        catch (error) { equal(error.status, 403); assert(error.message.includes('token')); }
    });
    await test('El modelo codifica filtros y envía el contrato de atención', async () => {
        const calls = []; const model = new ValeModel({ request: async (...args) => calls.push(args) });
        await model.list({ estado: '', q: ' A&B ', zonal: '', pagina: 0, tamanio: 15 });
        assert(calls[0][0].includes('q=A%26B')); assert(!calls[0][0].includes('estado='));
        await model.attend([{ codigoVale: '1', cantidadConsumida: '1', precioReal: '17', ticket: 'T1' }]);
        equal(calls[1][0], '/api/atenciones'); equal(calls[1][1].method, 'POST');
    });
    await test('La vista escapa los datos y presenta la moneda', () => {
        equal(Formatters.escape('<img onerror="x">'), '&lt;img onerror=&quot;x&quot;&gt;');
        assert(Formatters.money(173.23).includes('173.23'));
    });
    return results;
}
