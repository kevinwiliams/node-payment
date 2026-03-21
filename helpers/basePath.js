function normalizeBasePath(value) {
    const rawValue = String(value || '').trim();

    if (!rawValue || rawValue === '/') {
        return '';
    }

    const prefixed = rawValue.startsWith('/') ? rawValue : `/${rawValue}`;
    return prefixed.replace(/\/+$/, '');
}

function withBasePath(path, basePath) {
    const normalizedBasePath = normalizeBasePath(basePath);
    const rawPath = String(path || '').trim();

    if (!rawPath || rawPath === '/') {
        return normalizedBasePath || '/';
    }

    if (/^(?:[a-z]+:)?\/\//i.test(rawPath) || rawPath.startsWith('#') || rawPath.startsWith('mailto:') || rawPath.startsWith('tel:')) {
        return rawPath;
    }

    const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    return normalizedBasePath ? `${normalizedBasePath}${normalizedPath}` : normalizedPath;
}

module.exports = {
    normalizeBasePath,
    withBasePath,
};
