const bcrypt = require('bcrypt');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');

const { withBasePath } = require('../helpers/basePath');
const User = require('../models/user');

function generateUUID() {
    return uuidv4();
}

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

async function getUsers(req, res) {
    try {
        const users = await User.findAll({ order: [['username', 'ASC']] });
        return res.render('users/index', { title: 'Admin Users', users });
    } catch (err) {
        console.error(err);
        return res.status(500).send('Error fetching users');
    }
}

async function getUserInfo(req, res) {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).send('User not found');
        }

        return res.render('users/edit', { title: 'Edit User', user });
    } catch (err) {
        console.error(err);
        return res.status(500).send('Error fetching user');
    }
}

async function userForm(req, res) {
    return res.render('users/create', { title: 'Create new user' });
}

async function createUser(req, res) {
    try {
        const email = normalizeEmail(req.body.email);
        const userName = String(req.body.userName || '').trim();
        const password = String(req.body.password || '');
        const confirmPassword = String(req.body.confirmPassword || '');
        const otherInfo = String(req.body.otherInfo || '').trim();

        if (!userName || !email || !password) {
            return res.status(400).render('users/create', {
                title: 'Create new user',
                error: 'Username, email, and password are required.',
                formData: { userName, email, otherInfo },
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).render('users/create', {
                title: 'Create new user',
                error: 'Passwords do not match.',
                formData: { userName, email, otherInfo },
            });
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).render('users/create', {
                title: 'Create new user',
                error: 'A user with that email already exists.',
                formData: { userName, email, otherInfo },
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            username: userName,
            email,
            passwordHash: hashedPassword,
            registrationDate: moment().format('YYYY-MM-DD HH:mm:ss'),
            securityStamp: generateUUID(),
            otherInfo,
        });

        return res.redirect(withBasePath('/admin/users', req.app.locals.basePath));
    } catch (err) {
        console.error(err);
        return res.status(500).send('Error creating user');
    }
}

async function updateUser(req, res) {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).send('User not found');
        }

        user.username = String(req.body.username || '').trim();
        user.email = normalizeEmail(req.body.email);
        user.otherInfo = String(req.body.otherInfo || '').trim();

        const newPassword = String(req.body.password || '');
        const confirmPassword = String(req.body.confirmPassword || '');
        if (newPassword || confirmPassword) {
            if (newPassword !== confirmPassword) {
                return res.status(400).render('users/edit', {
                    title: 'Edit User',
                    user,
                    error: 'Passwords do not match.',
                });
            }

            user.passwordHash = await bcrypt.hash(newPassword, 10);
            user.securityStamp = generateUUID();
        }

        await user.save();
        return res.redirect(withBasePath('/admin/users', req.app.locals.basePath));
    } catch (err) {
        console.error(err);
        return res.status(500).send('Error updating user');
    }
}

async function deleteUser(req, res) {
    try {
        await User.destroy({ where: { userId: req.params.id } });
        return res.redirect(withBasePath('/admin/users', req.app.locals.basePath));
    } catch (err) {
        console.error(err);
        return res.status(500).send('Error deleting user');
    }
}

module.exports = {
    getUsers,
    getUserInfo,
    createUser,
    updateUser,
    deleteUser,
    userForm,
};
