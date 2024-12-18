const Category = require('../models/category');
const Service = require('../models/service');
const Sale = require('../models/sale');
const Subscriber = require('../models/subscriber');
const { Op } = require('sequelize');
const { Sequelize } = require('sequelize');
const path = require('path');


// GET all users
async function getDashboard(req, res){
    try {
      //console.log('');
      if(!req.session.isAuthenticated){
          return res.redirect('/auth/login');
      }
      //   const users = await User.findAll();
      const categories = await Category.findAll({ order:[ ['name', 'ASC'] ] });
      const services = await Service.findAll({ order:[ ['categoryId', 'ASC'] ], include: [Category] });
      services.forEach(service => {
        if (!service.image) {
          service.image = '/uploads/not-available.png';
        }
      });
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

async function getSales(req, res){
  try {
    
    // Fetch the latest 10 sales
    const sales = await Sale.findAll({
      //limit: 10,
      order: [['createdAt', 'DESC']],
    });

    // Fetch distinct service names
    const serviceNames = await Sale.findAll({
      attributes: [
        [Sequelize.fn('DISTINCT', Sequelize.col('serviceName')), 'serviceName'],
      ],
      raw: true, // Return plain data, not model instances
    });

    // Extract service names as an array of strings
    const distinctServices = serviceNames.map(service => service.serviceName);

    // Render view with sales and distinct service names
    res.render('sales/index', {
      title: 'Sales Information',
      sales,
      distinctServices,
    });

  } catch (error) {
      console.error(error);
      res.status(500).send('Error loading dashboard');
  }
}

async function getAWVisionSales(req, res){
  try {
    
    //const sales = await Sale.findAll({ limit: 10, order:[ ['createdAt', 'DESC'] ] });
    //const sales = await Sale.findAll({ where: { isApproved: 1, }, order: [['name', 'ASC']] });
    const sales = await Sale.findAll({
      where: {
        isApproved: 1,
        serviceName: {
          [Op.like]: 'Event Tickets : All Woman%'
        }
      },
      order: [['paymentDate', 'DESC']]
    });
    res.render('sales/awvision',{
      title: 'Ticket Sales Information',
      sales
    });
  } catch (error) {
      console.error(error);
      res.status(500).send('Error loading dashboard');
  }
}

async function createCategory(req, res) {
  try {
      const { categoryName, categoryDesc, categoryActive } = req.body;
      const category = await Category.create({ 
        name: categoryName, 
        description: categoryDesc, 
        active: categoryActive 
      });
      res.status(201).json({success: true, category});
  } catch (error) {
      res.status(500).json({ success: false, message: error.message });
  }
}

async function getCategory(req, res){
  const {categoryId} = req.body;
  const category = await Category.findOne({ where: { categoryId: parseInt(categoryId) }  });
  if (category) {
    return res.json({ category });
  }else{
    return res.json({  });

  }
}

async function updateCategory(req, res) {
  try {
      const { categoryId, categoryName, categoryDesc, categoryActive } = req.body;
      const category = await Category.findByPk(categoryId);
      if (!category) {
          return res.status(404).json({ success: false, message: 'Category not found' });
      }
      category.name = categoryName;
      category.description = categoryDesc;
      category.active = categoryActive;
      await category.save();
      res.json({ success: true, category });
  } catch (error) {
      res.status(500).json({ success: false, message: error.message });
  }
}

async function deleteCategory(req, res) {
  try {
      const {categoryId} = req.body;
      const category = await Category.findByPk(categoryId);
      if (!category) {
          return res.status(404).json({ success: false, message: 'Category not found' });
      }
      await category.destroy();
      res.json({ success: false, message: 'Category deleted successfully' });
  } catch (error) {
      res.status(500).json({ success: false, message: error.message });
  }
}

async function createService(req, res) {
  try {
      const { serviceCategory, serviceName, serviceCurrency, servicePrice, serviceDesc, serviceEpaperDays, serviceActive } = req.body;
      const { filename } = req.file; // File information from Multer

      // Validate input
      if (!serviceCategory || !serviceName || !serviceCurrency || !servicePrice) {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
      }
      // Handle uploaded image
      const serviceImage = req.file ? path.join('/uploads', filename) : null;

      const service = await Service.create({  
        categoryId: parseInt(serviceCategory), 
        name: serviceName, 
        currency: serviceCurrency, 
        price: parseFloat(servicePrice), 
        description: serviceDesc, 
        epaperDays: serviceEpaperDays, 
        active: serviceActive,
        image: serviceImage
      });

      res.status(201).json({ success: true, service});
  } catch (error) {
      res.status(500).json({ success: false, message: error.message });
  }
}

async function getService(req, res){
  const {serviceId} = req.body;
  const service = await Service.findOne({ where: { serviceId: parseInt(serviceId) }  });
  // console.log('service', service);
  if (service) {
    return res.json({ success: true, service });
  }else{
    return res.json({  success: false, message: 'Service not found!'});

  }
}

async function updateService(req, res) {
  try {
      const { serviceId, serviceCategory, serviceName, serviceCurrency, servicePrice, serviceDesc, serviceEpaperDays, serviceActive } = req.body;
      // Validate input
      if (!serviceCategory || !serviceName || !serviceCurrency || !servicePrice) {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }
      const service = await Service.findByPk(serviceId);
      if (!service) {
          return res.status(404).json({ success: false, message: 'Service not found' });
      }
      service.categoryId = parseInt(serviceCategory);
      service.name = serviceName;
      service.currency = serviceCurrency;
      service.price = parseFloat(servicePrice);
      service.description = serviceDesc;
      service.epaperDays = serviceEpaperDays;
      service.active = serviceActive;

      // Update image if uploaded
      if (req.file) {
        service.image = `/uploads/${req.file.filename}`;
      }

      await service.save();
      res.json({ success: true, service });
  } catch (error) {
      res.status(500).json({ success: false, message: error.message });
  }
}

async function deleteService(req, res) {
  try {
      const {serviceId} = req.body;
      const service = await Service.findByPk(serviceId);
      if (!service) {
          return res.status(404).json({ success: false, message: 'Service not found' });
      }
      await service.destroy();
      res.json({ success: false, message: 'Service deleted successfully' });
  } catch (error) {
      res.status(500).json({ success: false, message: error.message });
  }
}

  module.exports = {
    getDashboard,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategory,
    createService, 
    updateService,
    deleteService,
    getService,
    getSales,
    getAWVisionSales
  };