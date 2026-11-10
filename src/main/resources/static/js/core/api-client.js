"use strict";
(() => {
    const app = globalThis.Vales = globalThis.Vales || {};
    class ApiError extends Error {
        constructor(status, message) { super(message); this.status = status; }
    }
    class ApiClient {
        constructor(fetchImplementation) {
            this.fetch = fetchImplementation;
            this.csrf = null;
        }
        async refreshCsrf() {
            this.csrf = await this.request('/api/csrf');
            return this.csrf;
        }
        async request(path, options = {}) {
            const method = options.method || 'GET';
            const headers = { Accept: 'application/json', ...options.headers };
            if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
                if (!this.csrf) await this.refreshCsrf();
                headers[this.csrf.headerName] = this.csrf.token;
            }
            let response;
            try {
                response = await this.fetch(path, { ...options, method, headers, credentials: 'same-origin' });
            } catch (error) {
                throw new ApiError(0, 'No se pudo conectar con el servidor.');
            }
            if (!response.ok) {
                let body;
                try { body = await response.json(); } catch (error) { /* El servidor puede devolver una respuesta sin JSON. */ }
                const fallback = response.status === 401
                    ? (path === '/login' ? 'Usuario o contraseña incorrectos.' : 'La sesión terminó.')
                    : response.status === 403 ? 'La sesión o el token venció. Recarga la página.' : 'No se pudo completar la operación.';
                throw new ApiError(response.status, body?.mensaje || fallback);
            }
            return response.status === 204 ? null : response.json();
        }
    }
    app.ApiError = ApiError;
    app.ApiClient = ApiClient;
})();
