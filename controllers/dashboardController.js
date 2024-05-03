const Category = require('../models/category');
const Service = require('../models/service');
const Sale = require('../models/sale');
const Subscriber = require('../models/subscriber');



// GET all users
async function getDashboard(req, res){
    try {

      //   const users = await User.findAll();
      const categories = await Category.findAll({ order:[ ['name', 'ASC'] ] });
      const services = await Service.findAll({ order:[ ['categoryId', 'ASC'] ], include: [Category] });
      const sales = await Sale.findAll({ limit: 10, order:[ ['createdAt', 'DESC'] ] });
      const subscribers = await Subscriber.findAll({ limit: 10, order:[ ['createdAt', 'DESC'] ] });
      const serviceList = JSON.stringify(services);
      // console.log('services', JSON.stringify(services));
      res.render('dashboard/index', {title: 'Dashboard', categories, services: JSON.parse(serviceList), sales, subscribers});

    } catch (err) {
      console.error(err);
      res.status(500).send('Error loading dashboard');
    }
  }

  async function getCategory(req, res){
    const {categoryId} = req.body;
    const category = await Category.findOne({ where: { categoryId: parseInt(categoryId) }  });
    console.log('category', category);
    if (category) {
      return res.json({ category });
    }else{
      return res.json({  });

    }
  }

  async function getService(req, res){
    const {serviceId} = req.body;
    const service = await Service.findOne({ where: { serviceId: parseInt(serviceId) }  });
    console.log('service', service);
    if (service) {
      return res.json({ service });
    }else{
      return res.json({  });

    }
  }

  module.exports = {
    getDashboard,
    getCategory,
    getService
  };