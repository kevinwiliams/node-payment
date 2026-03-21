function ensureAuthenticated(req, res, next) {
    if (req.session && req.session.isAuthenticated) {
        return next();
    }

    if (req.accepts('html')) {
        return res.redirect('/auth/login');
    }

    return res.status(401).json({
        success: false,
        message: 'Authentication required.',
    });
}

module.exports = {
    ensureAuthenticated,
};
