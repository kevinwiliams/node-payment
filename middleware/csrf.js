const crypto = require('crypto');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXEMPT_PATHS = new Set(['/en/confirmation']);

function normalizeRequestPath(value) {
    return String(value || '').split('?')[0].replace(/\/+$/, '') || '/';
}

function isExemptPath(req) {
    const candidates = [
        normalizeRequestPath(req.path),
        normalizeRequestPath(req.originalUrl),
        normalizeRequestPath(req.url),
    ];

    return Array.from(EXEMPT_PATHS).some((exemptPath) => {
        return candidates.some((candidate) => candidate === exemptPath || candidate.endsWith(exemptPath));
    });
}

function createToken() {
    return crypto.randomBytes(32).toString('hex');
}

function attachCsrfToken(req, res, next) {
    if (!req.session) {
        return next(new Error('Session middleware must run before CSRF middleware.'));
    }

    if (!req.session.csrfToken) {
        req.session.csrfToken = createToken();
    }

    res.locals.csrfToken = req.session.csrfToken;
    next();
}

function verifyCsrfToken(req, res, next) {
    if (
        SAFE_METHODS.has(req.method) ||
        isExemptPath(req)
    ) {
        return next();
    }

    const sessionToken = req.session && req.session.csrfToken;
    const submittedToken = (req.body && req.body._csrf) || req.get('x-csrf-token');

    if (sessionToken && submittedToken && sessionToken === submittedToken) {
        return next();
    }

    if (req.accepts('html')) {
        return res.status(403).send('The form security token is invalid or expired. Please refresh and try again.');
    }

    return res.status(403).json({
        success: false,
        message: 'Invalid CSRF token.',
    });
}

module.exports = {
    attachCsrfToken,
    verifyCsrfToken,
};
