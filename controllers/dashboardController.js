const Category = require('../models/category');
const Service = require('../models/service');
const Sale = require('../models/sale');
const Subscriber = require('../models/subscriber');



// GET all users
async function getDashboard(req, res){
    try {
    //   const users = await User.findAll();
    const categories = await Category.findAll({
        limit: 10,
        order:[
            ['name', 'ASC']
        ]
    })
      res.render('dashboard/index', {title: 'Dashboard', categories});

    } catch (err) {
      console.error(err);
      res.status(500).send('Error loading dashboard');
    }
  }

  module.exports = {
    getDashboard
  };