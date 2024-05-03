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

  async function createCategory(req, res) {
    try {
        const { name, description, active } = req.body;
        const category = await Category.create({ name, description, active });
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ message: error.message });
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

  async function updateCategory(req, res) {
    try {
        const { categoryId, name, description, active } = req.body;
        const category = await Category.findByPk(categoryId);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        category.name = name;
        category.description = description;
        category.active = active;
        await category.save();
        res.json(category);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
  }

  async function deleteCategory(req, res) {
    try {
        const {categoryId} = req.body;
        const category = await Category.findByPk(categoryId);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        await category.destroy();
        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
  }

  async function createService(req, res) {
    try {
        const { categoryId, name, currency, price, description, epaperDays, active } = req.body;
        const service = await Service.create({ categoryId, name, currency, price, description, epaperDays, active });
        res.status(201).json(service);
    } catch (error) {
        res.status(500).json({ message: error.message });
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

  async function updateService(req, res) {
    try {
        const { serviceId, categoryId, name, currency, price, description, epaperDays, active } = req.body;
        const service = await Service.findByPk(serviceId);
        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }
        service.categoryId = categoryId;
        service.name = name;
        service.currency = currency;
        service.price = price;
        service.description = description;
        service.epaperDays = epaperDays;
        service.active = active;
        await service.save();
        res.json(service);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
  }

  async function deleteService(req, res) {
    try {
        const {serviceId} = req.body;
        const service = await Service.findByPk(serviceId);
        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }
        await service.destroy();
        res.json({ message: 'Service deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
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
    getService
  };