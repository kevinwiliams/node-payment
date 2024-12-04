const sequelize = require('../config/db').sequelize;
const bcrypt = require('bcrypt');
const User = require('../models/user');
const moment = require('moment');
const Util = require('../helpers/util');
const { v4: uuidv4 } = require('uuid');

function generateUUID() {
    return uuidv4();
}

// GET: /Account/Login
const getLogin = (req, res) => {
    console.log('isAuthenticated', req.session.isAuthenticated);
    if (req.session.isAuthenticated) {
        return res.redirect('/admin/dashboard');
    }
    const { returnUrl } = req.query;
    res.render('auth/login', {   returnUrl, title: 'Login'});
};

// POST: /Account/Login
const postLogin = async (req, res) => {
    const { email, password, rememberMe} = req.body;
    try {
        // Query the database to find the user by username
        //const result = await sequelize.query(`SELECT * FROM [dbo].[users] WHERE [email] = '${email}'`, { type: sequelize.QueryTypes.SELECT });
        const result = await sequelize.query(
            `SELECT * FROM [dbo].[users] WHERE [email] = :email`,
            {
              replacements: { email }, // Parameterized query to prevent SQL injection
              type: sequelize.QueryTypes.SELECT,
            }
          );
        // console.log('result', result);
        const user = result[0];
        if (!user) {
            console.log('User not found:', email);
            return res.render('auth/login', { error: 'Invalid username or password' });
            
        }
        // Compare the password hash
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.render('auth/login', { error: 'Incorrect username/password'});
            
        }

        // Set user session
        req.session.user = { username: user.username, email: user.email, code: user.securityStamp }; // Example: Storing user data in session
        
        req.session.isAuthenticated = true;
        return res.redirect('/admin/dashboard'); // Redirect to home page
        // res.redirect(returnUrl || '/dashboard'); // Redirect to home page
        // res.render('dashboard/index', {layout: 'layout'}); // Redirect to home page
    } catch (error) {
        console.error('Error logging in:', error);
        return res.status(500).send('Internal Server Error');
    }
};

// GET: /Account/Register
const getRegister = async (req, res) => {

    if (!req.session.isAuthenticated) {
        return res.redirect('/auth/login');
    }

    // const roles = await AspNetRoles.findAll();
    // Render the registration form
    return res.render('auth/register', { title: 'Register', userData: req.session.user});
};

// POST: /Account/Register
const postRegister = async (req, res) => {
    try {
        const { email, userName, password, confirmPassword, otherInfo } = req.body;

        // Check if passwords match
        if (password !== confirmPassword) {
            return res.status(400).send('Passwords do not match');
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user in the database
        const user = await User.create({
            username: userName,
            email: email,
            otherInfo: otherInfo,
            registrationDate: sequelize.fn('GETUTCDATE'),
            passwordHash: hashedPassword,
            securityStamp: generateUUID(),
        });

        // Redirect to home page after successful registration
        return res.redirect('/auth/register');
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).send('Internal Server Error');
    }
};

// GET: /Account/ForgotPassword
const getForgotPassword = (req, res) => {
    // Render the forgot password form
    res.render('auth/forgotpassword', { title: 'Forgot Password'});
};

// POST: /Account/ForgotPassword
const postForgotPassword = async (req, res) => {
    try {
        // Implement your forgot password logic here
        // Extract email from request body
        const { email } = req.body;
        // Check if email is valid
        if (!email) {
            return res.status(400).send('Email is required');
        }

        const user = await User.findOne({ where: { email: email } });
        console.log('user', user);
        if (user) {
            // Generate callback URL
            const code = user.security_stamp;
            const callbackUrl = `${req.protocol}://${req.get('host')}/auth/resetpassword?code=${code}`;
            const dataToRender = {
                CallBackUrl: callbackUrl
            };
            const subject = `Reset Password`;
            const body = await Util.renderViewToString('./views/emails/passwordreset.hbs', dataToRender);
            const emailSent = await Util.sendMail(email, subject, body);
  
            res.render('auth/forgotpasswordconfirmation');
        }else{
            res.render('auth/forgotpassword');
        }

       
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

// GET: /Account/ResetPassword
const getResetPassword = (req, res) => {
    const { code } = req.query;
    // Render the reset password form with the code parameter
    res.render('auth/resetpassword', { code,  title: 'Reset Password'});
};

// POST: /Account/ResetPassword
const postResetPassword = async (req, res) => {
    const { email, code, password, confirmPassword } = req.body;
    try {

        if (password === confirmPassword) {

            const user = await User.findOne({ where: { email: email, securityStamp: code } });
            if (user) {
                const isMatch = await bcrypt.compare(password, user.passwordHash);

                if(isMatch){
                    const result = await changePasswordDB(user.userId, password);

                    if (result.success) {
                        return res.render('auth/resetpassword', {Message: 'ChangePasswordSuccess'});
                    } else {
                        res.locals.errors = result.errors;
                        return res.render('auth/resetpassword', { ...req.body, Message: result.errors});
                    }
                } else{
                    
                    return res.render('auth/resetpassword', { ...req.body, Message: 'Old password does not match!'});
                }
            }
            
        } else{
            return res.render('auth/resetpassword', { ...req.body, Message: 'Passwords do not match!'});
        }

        // Implement your reset password logic here
        // Example: Reset user's password in the database
        res.render('auth/resetpassword');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

// GET: /Account/ResetPasswordConfirmation
const getResetPasswordConfirmation = (req, res) => {
    // Render the reset password confirmation page
    res.render('auth/resetpasswordconfirmation', { title: 'Reset Password Confirmation'});
};

// POST: /Account/LogOff
const postLogout = (req, res) => {
    try {
        delete req.session.user; // Example: Clear user session on logout
        delete req.session.userData; // Example: Clear user session on logout
        delete req.session.isAuthenticated; // Example: Clear user session on logout
        res.redirect('/auth/login');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

async function changePasswordDB(userId, newPassword) {
    try {
        // Find the user by userId
        const user = await User.findByPk(userId);
        if (!user) {
            return { success: false, errors: ['User not found'] };
        }
        // Update the user's password hash
        user.PasswordHash = await bcrypt.hash(newPassword, 10);
        // Save the updated user
        await user.save();

        return { success: true };
    } catch (error) {
        console.error('Error changing password:', error);
        return { success: false, errors: ['Internal Server Error'] };
    }
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
