const Category = require('../models/category');
const Service = require('../models/service');
const Sale = require('../models/sale');
const Subscriber = require('../models/subscriber');



// GET all users
async function getMain(req, res){
    try {
    //   const users = await User.findAll();
    const categories = await Category.findAll({ limit: 10, order:[ ['name', 'ASC'] ] });
    // console.log('categories', categories);
      res.render('en/index', {title: 'Home', categories});

    } catch (err) {
      console.error(err);
      res.status(500).send('Error loading dashboard');
    }
  }

  async function getService(req, res){
    try {
        const { id } = req.body;
        console.log('id', req.body);
        const services = await Service.findAll({ where: { categoryId : parseInt(id)}, order:[ ['name', 'ASC'] ] });
        // return services;
        res.json({
            services: services
        });

    } catch (err) {
      console.error(err);
      return null;
    }
  }

  module.exports = {
    getMain,
    getService
  };