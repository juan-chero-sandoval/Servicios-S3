"use strict";
(() => {
    const app = globalThis.Vales = globalThis.Vales || {};
    class ObservableViewModel {
        constructor(initialState) {
            this._state = initialState;
            this.listeners = new Set();
        }
        get state() { return this.snapshot(); }
        snapshot() { return this._state; }
        subscribe(listener) {
            this.listeners.add(listener);
            listener(this.snapshot());
            return () => this.listeners.delete(listener);
        }
        patch(changes) {
            this._state = { ...this._state, ...changes };
            this.emit();
        }
        emit() {
            const state = this.snapshot();
            for (const listener of this.listeners) listener(state);
        }
    }
    app.ObservableViewModel = ObservableViewModel;
})();
