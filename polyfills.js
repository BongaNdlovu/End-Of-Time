(function () {
    try {
        // Detect disabled web storage (Safari Private, strict settings)
        var testKey = '__eot_storage_test__';
        localStorage.setItem(testKey, '1');
        localStorage.removeItem(testKey);
    } catch (e) {
        try { window.__storageDisabled = true; } catch (_) {}
        console.warn('[Polyfills] Web storage is disabled in this environment. Some features may be limited.');
    }

    if (!('Promise' in window)) {
        console.warn('[Polyfills] Promise is missing; this browser is not supported.');
    }

    if (!('fetch' in window)) {
        console.warn('[Polyfills] fetch is missing; limited functionality. Please use a modern browser.');
    }

    if (!('URL' in window)) {
        // Minimal URL shim for very old browsers; does not fully implement spec
        try {
            window.URL = function (url) { this.href = String(url); };
        } catch (_) {}
        console.warn('[Polyfills] URL missing; applied minimal shim.');
    }

    if (typeof window.TextEncoder === 'undefined') {
        // Minimal TextEncoder polyfill (UTF-8 encode only)
        try {
            window.TextEncoder = function TextEncoder() {};
            window.TextEncoder.prototype.encode = function (str) {
                var utf8 = unescape(encodeURIComponent(String(str)));
                var result = new Uint8Array(utf8.length);
                for (var i = 0; i < utf8.length; i++) result[i] = utf8.charCodeAt(i);
                return result;
            };
            console.warn('[Polyfills] TextEncoder missing; applied lightweight polyfill.');
        } catch (e) {
            console.warn('[Polyfills] Failed to polyfill TextEncoder.', e);
        }
    }
})();


