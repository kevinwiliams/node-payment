const { QueryTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const sequelize = require('../config/db').sequelize;
const { withBasePath } = require('../helpers/basePath');
const User = require('../models/user');
const Util = require('../helpers/util');

function generateUUID() {
    return uuidv4();
}

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function renderLogin(res, error = '') {
    return res.render('auth/login', {
        title: 'Login',
        error,
    });
}

const getLogin = (req, res) => {
    if (req.session.isAuthenticated) {
        return res.redirect(withBasePath('/admin/dashboard', req.app.locals.basePath));
    }

    return renderLogin(res);
};

const postLogin = async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');

    try {
        const result = await sequelize.query(
            'SELECT * FROM [dbo].[users] WHERE [email] = :email',
            {
                replacements: { email },
                type: QueryTypes.SELECT,
            }
        );

        const user = result[0];
        if (!user) {
            return renderLogin(res, 'Invalid username or password.');
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return renderLogin(res, 'Invalid username or password.');
        }

        return req.session.regenerate((err) => {
            if (err) {
                console.error('Error regenerating session:', err);
                return res.status(500).send('Internal Server Error');
            }

            req.session.user = {
                userId: user.userId,
                username: user.username,
                email: user.email,
            };
            req.session.isAuthenticated = true;

            return req.session.save((saveError) => {
                if (saveError) {
                    console.error('Error saving session after login:', saveError);
                    return res.status(500).send('Internal Server Error');
                }

                return res.redirect(withBasePath('/admin/dashboard', req.app.locals.basePath));
            });
        });
    } catch (error) {
        console.error('Error logging in:', error);
        return res.status(500).send('Internal Server Error');
    }
};

const getRegister = async (req, res) => {
    return res.render('auth/register', { title: 'Register', userData: req.session.user });
};

const postRegister = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const userName = String(req.body.userName || '').trim();
        const password = String(req.body.password || '');
        const confirmPassword = String(req.body.confirmPassword || '');
        const otherInfo = String(req.body.otherInfo || '').trim();

        if (!userName || !email || !password) {
            return res.status(400).render('auth/register', {
                title: 'Register',
                error: 'Username, email, and password are required.',
                formData: { email, userName, otherInfo },
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).render('auth/register', {
                title: 'Register',
                error: 'Passwords do not match.',
                formData: { email, userName, otherInfo },
            });
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).render('auth/register', {
                title: 'Register',
                error: 'A user with that email already exists.',
                formData: { email, userName, otherInfo },
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            username: userName,
            email,
            otherInfo,
            registrationDate: new Date(),
            passwordHash: hashedPassword,
            securityStamp: generateUUID(),
        });

        return res.redirect(withBasePath('/admin/users', req.app.locals.basePath));
    } catch (error) {
        console.error('Error registering user:', error);
        return res.status(500).send('Internal Server Error');
    }
};

const getForgotPassword = (req, res) => {
    return res.render('auth/forgotpassword', { title: 'Forgot Password' });
};

const postForgotPassword = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);

        if (!email) {
            return res.status(400).render('auth/forgotpassword', {
                title: 'Forgot Password',
                errorMessage: 'Email is required.',
            });
        }

        const user = await User.findOne({ where: { email } });
        if (user) {
            const callbackPath = withBasePath('/auth/resetpassword', req.app.locals.basePath);
            const callbackUrl = `${req.protocol}://${req.get('host')}${callbackPath}?code=${user.securityStamp}`;
            const body = await Util.renderViewToString('./views/emails/passwordreset.hbs', {
                callbackUrl,
                email,
            });

            await Util.sendToMailQueue(email, 'Reset Password', body);
        }

        return res.render('auth/forgotpasswordconfirmation', { title: 'Forgot Password Confirmation' });
    } catch (error) {
        console.error('Error sending forgot-password email:', error);
        return res.status(500).send('Internal Server Error');
    }
};

const getResetPassword = (req, res) => {
    const { code } = req.query;
    return res.render('auth/resetpassword', { code, title: 'Reset Password' });
};

const postResetPassword = async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || '').trim();
    const password = String(req.body.password || '');
    const confirmPassword = String(req.body.confirmPassword || '');

    try {
        if (!email || !code || !password) {
            return res.status(400).render('auth/resetpassword', {
                ...req.body,
                title: 'Reset Password',
                Message: 'Email, code, and password are required.',
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).render('auth/resetpassword', {
                ...req.body,
                title: 'Reset Password',
                Message: 'Passwords do not match!',
            });
        }

        const user = await User.findOne({ where: { email, securityStamp: code } });
        if (!user) {
            return res.status(400).render('auth/resetpassword', {
                ...req.body,
                title: 'Reset Password',
                Message: 'The reset link is invalid or has expired.',
            });
        }

        user.passwordHash = await bcrypt.hash(password, 10);
        user.securityStamp = generateUUID();
        await user.save();

        return res.render('auth/resetpassword', {
            title: 'Reset Password',
            Message: 'ChangePasswordSuccess',
        });
    } catch (error) {
        console.error('Error resetting password:', error);
        return res.status(500).send('Internal Server Error');
    }
};

const getResetPasswordConfirmation = (req, res) => {
    return res.render('auth/resetpasswordconfirmation', { title: 'Reset Password Confirmation' });
};

const postLogout = (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            console.error('Error logging out:', error);
            return res.status(500).send('Internal Server Error');
        }

        res.clearCookie('connect.sid');
        return res.redirect(withBasePath('/auth/login', req.app.locals.basePath));
    });
};

module.exports = {
    getLogin,
    postLogin,
    getRegister,
    postRegister,
    getForgotPassword,
    postForgotPassword,
    getResetPassword,
    postResetPassword,
    getResetPasswordConfirmation,
    postLogout,
};
