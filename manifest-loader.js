(function attachManifest() {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return;
    }
    if (window.location.protocol === 'file:') {
        return;
    }
    if (document.querySelector('link[rel=\"manifest\"]')) {
        return;
    }
    var link = document.createElement('link');
    link.rel = 'manifest';
    link.href = 'manifest.json';
    document.head.appendChild(link);
})();
