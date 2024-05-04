const User = require('../models/user'); // Assuming you have defined the Sequelize models
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const moment = require('moment');


function generateUUID() {
    return uuidv4();
}

// GET all users
async function getUsers(req, res){
    try {
      if(!req.session.isAuthenticated){
          res.redirect('/auth/login');
      }
      const users = await User.findAll();
      console.log('users', users);

      res.render('users/index', { title: 'Admin Users', users });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error fetching users');
    }
  }
  
  // GET user by ID
  async function getUserInfo (req, res){
    try {
      if(!req.session.isAuthenticated){
          res.redirect('/auth/login');
      }
      const user = await User.findByPk(req.params.id);
      if (user) {
        console.log('user', user.dataValues);

        res.render('users/edit', { user });
      } else {
        res.status(404).send('User not found');
      }
    } catch (err) {
      console.error(err);
      res.status(500).send('Error fetching user');
    }
  }

  async function userForm(req, res) {
    if(!req.session.isAuthenticated){
        res.redirect('/auth/login');
    }
    res.render('users/create', {title: 'Create new user'});
  }
  
  // POST create new user
  async function createUser(req, res) {
    try {
      if(!req.session.isAuthenticated){
          res.redirect('/auth/login');
      }
        const { email, userName, password, confirmPassword, otherInfo } = req.body;
         // Check if passwords match
         if (password !== confirmPassword) {
            return res.status(400).send('Passwords do not match');
        }
         // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            username: userName,
            email: email,
            passwordHash: hashedPassword,
            registrationDate: moment().format('YYYY-MM-DD HH:mm:ss'),
            securityStamp: generateUUID(),
            otherInfo: otherInfo
        });

        console.log('cUser', user);

        res.redirect('/admin/users');
    } catch (err) {
      console.error(err);
      res.status(500).send('Error creating user');
    }
  }
  
  // PUT update user
  async function updateUser(req, res) {
    try {
      
      const user = await User.findByPk(req.params.id);
      if (user) {
        await user.update(req.body);
        res.redirect('/admin/users');
      } else {
        res.status(404).send('User not found');
      }
    } catch (err) {
      console.error(err);
      res.status(500).send('Error updating user');
    }
  }
  
  // DELETE user
  async function deleteUser(req, res) {
    try {
      if(!req.session.isAuthenticated){
          res.redirect('/auth/login');
      }
      await User.destroy({ where: { user_id: req.params.id } });
      res.redirect('/admin/users');
    } catch (err) {
      console.error(err);
      res.status(500).send('Error deleting user');
    }
  }
  

  module.exports = {
    getUsers,
    getUserInfo,
    createUser,
    updateUser,
    deleteUser,
    userForm
  }