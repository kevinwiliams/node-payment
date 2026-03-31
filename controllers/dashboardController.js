const Category = require('../models/category');
const Service = require('../models/service');
const Sale = require('../models/sale');
const Subscriber = require('../models/subscriber');
const definePrintAndSubRate = require('../models/printAndSubRate');
const { sanitizeDescription } = require('../helpers/util');
const { Op } = require('sequelize');
const { Sequelize } = require('sequelize');
const path = require('path');

function parseBoolean(value) {
  return value === true || value === 'true' || value === 'on' || value === '1';
}

function parseNullableString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

function parseNullableInteger(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }

  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseNullableFloat(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }

  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeSubscriptionRateType(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function buildPrintAndSubRatePayload(body) {
  return {
    market: parseNullableString(body.rateMarket),
    type: parseNullableString(body.rateType),
    rateDescription: parseNullableString(body.rateDescription),
    printDayPattern: parseNullableString(body.printDayPattern),
    printTerm: parseNullableInteger(body.printTerm),
    printTermUnit: parseNullableString(body.printTermUnit),
    eDayPattern: parseNullableString(body.eDayPattern),
    term: parseNullableInteger(body.eTerm),
    termUnit: parseNullableString(body.eTermUnit),
    currency: parseNullableString(body.rateCurrency),
    rate: parseNullableFloat(body.rateAmount),
    sortOrder: parseNullableInteger(body.sortOrder),
    active: parseBoolean(body.rateActive) ? 1 : 0,
  };
}

async function getPrintAndSubRateModel() {
  return definePrintAndSubRate();
}

// GET all users
async function getDashboard(req, res){
    try {
      const categories = await Category.findAll({ order:[ ['name', 'ASC'] ] });
      const services = await Service.findAll({ order:[ ['categoryId', 'ASC'] ], include: [Category] });
      services.forEach(service => {
        if (!service.image) {
          service.image = '/uploads/not-available.png';
        }
        // Sanitize description for safe HTML rendering
        if (service.description) {
          service.description = sanitizeDescription(service.description);
        }
      });
      const sales = await Sale.findAll({ limit: 10, order:[ ['createdAt', 'DESC'] ] });
      const subscribers = await Subscriber.findAll({ limit: 10, order:[ ['createdAt', 'DESC'] ] });
      let printAndSubRates = [];

      try {
        const PrintAndSubRate = await getPrintAndSubRateModel();
        printAndSubRates = await PrintAndSubRate.findAll({
          order: [['sortOrder', 'ASC'], ['rateId', 'ASC']],
          raw: true,
        });
      } catch (rateError) {
        console.error('Unable to load print and subscription rates for dashboard', rateError);
      }

      const serviceList = JSON.stringify(services);
      // console.log('services', JSON.stringify(services));
      res.render('dashboard/index', {
        title: 'Dashboard',
        categories,
        services: JSON.parse(serviceList),
        sales,
        subscribers,
        printAndSubRates,
      });

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
        active: parseBoolean(categoryActive),
        createdAt: new Date(),
        updatedAt: new Date(),
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
      category.active = parseBoolean(categoryActive);
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
      res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
      res.status(500).json({ success: false, message: error.message });
  }
}

async function createService(req, res) {
  try {
      const {
        serviceCategory,
        serviceName,
        serviceCurrency,
        servicePrice,
        serviceDesc,
        serviceEpaperDays,
        serviceUseSubscriptionRates,
        subscriptionRateType,
        serviceActive,
      } = req.body;
      const useSubscriptionRates = parseBoolean(serviceUseSubscriptionRates);
      const normalizedSubscriptionRateType = useSubscriptionRates
        ? normalizeSubscriptionRateType(subscriptionRateType) || 'Epaper'
        : null;
      const normalizedCurrency = serviceCurrency || (useSubscriptionRates ? 'JMD' : '');
      const normalizedPrice = servicePrice !== undefined && String(servicePrice).trim() !== ''
        ? parseFloat(servicePrice)
        : (useSubscriptionRates ? 0 : NaN);

      // Validate input
      if (!serviceCategory || !serviceName || !normalizedCurrency || Number.isNaN(normalizedPrice)) {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
      }
      // Handle uploaded image
      const serviceImage = req.file ? path.join('/uploads', req.file.filename) : null;

      const service = await Service.create({  
        categoryId: parseInt(serviceCategory), 
        name: serviceName, 
        currency: normalizedCurrency, 
        price: normalizedPrice, 
        description: sanitizeDescription(serviceDesc), 
        epaperDays: serviceEpaperDays, 
        useSubscriptionRates,
        subscriptionRateType: normalizedSubscriptionRateType,
        active: parseBoolean(serviceActive),
        image: serviceImage,
        createdAt: new Date(),
        updatedAt: new Date(),
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
      const {
        serviceId,
        serviceCategory,
        serviceName,
        serviceCurrency,
        servicePrice,
        serviceDesc,
        serviceEpaperDays,
        serviceUseSubscriptionRates,
        subscriptionRateType,
        serviceActive,
      } = req.body;
      const useSubscriptionRates = parseBoolean(serviceUseSubscriptionRates);
      const normalizedSubscriptionRateType = useSubscriptionRates
        ? normalizeSubscriptionRateType(subscriptionRateType) || 'Epaper'
        : null;
      const normalizedCurrency = serviceCurrency || (useSubscriptionRates ? 'JMD' : '');
      const normalizedPrice = servicePrice !== undefined && String(servicePrice).trim() !== ''
        ? parseFloat(servicePrice)
        : (useSubscriptionRates ? 0 : NaN);
      // Validate input
      if (!serviceCategory || !serviceName || !normalizedCurrency || Number.isNaN(normalizedPrice)) {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }
      const service = await Service.findByPk(serviceId);
      if (!service) {
          return res.status(404).json({ success: false, message: 'Service not found' });
      }
      service.categoryId = parseInt(serviceCategory);
      service.name = serviceName;
      service.currency = normalizedCurrency;
      service.price = normalizedPrice;
      service.description = sanitizeDescription(serviceDesc);
      service.epaperDays = serviceEpaperDays;
      service.useSubscriptionRates = useSubscriptionRates;
      service.subscriptionRateType = normalizedSubscriptionRateType;
      service.active = parseBoolean(serviceActive);

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
      res.json({ success: true, message: 'Service deleted successfully' });
  } catch (error) {
      res.status(500).json({ success: false, message: error.message });
  }
}

async function getPrintAndSubRate(req, res) {
  try {
    const { rateId } = req.body;
    const PrintAndSubRate = await getPrintAndSubRateModel();
    const rate = await PrintAndSubRate.findByPk(parseInt(rateId, 10), { raw: true });

    if (!rate) {
      return res.status(404).json({ success: false, message: 'Rate not found.' });
    }

    return res.json({ success: true, rate });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function createPrintAndSubRate(req, res) {
  try {
    const PrintAndSubRate = await getPrintAndSubRateModel();
    const payload = buildPrintAndSubRatePayload(req.body);

    if (!payload.type || !payload.rateDescription || !payload.currency || payload.rate === null) {
      return res.status(400).json({ success: false, message: 'Type, description, currency, and rate are required.' });
    }

    const rate = await PrintAndSubRate.create(payload);
    return res.status(201).json({ success: true, rate });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function updatePrintAndSubRate(req, res) {
  try {
    const { rateId } = req.body;
    const PrintAndSubRate = await getPrintAndSubRateModel();
    const rate = await PrintAndSubRate.findByPk(parseInt(rateId, 10));

    if (!rate) {
      return res.status(404).json({ success: false, message: 'Rate not found.' });
    }

    const payload = buildPrintAndSubRatePayload(req.body);

    if (!payload.type || !payload.rateDescription || !payload.currency || payload.rate === null) {
      return res.status(400).json({ success: false, message: 'Type, description, currency, and rate are required.' });
    }

    Object.assign(rate, payload);
    await rate.save();

    return res.json({ success: true, rate });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function deletePrintAndSubRate(req, res) {
  try {
    const { rateId } = req.body;
    const PrintAndSubRate = await getPrintAndSubRateModel();
    const rate = await PrintAndSubRate.findByPk(parseInt(rateId, 10));

    if (!rate) {
      return res.status(404).json({ success: false, message: 'Rate not found.' });
    }

    await rate.destroy();
    return res.json({ success: true, message: 'Rate deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
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
    getPrintAndSubRate,
    createPrintAndSubRate,
    updatePrintAndSubRate,
    deletePrintAndSubRate,
    getSales,
    getAWVisionSales
  };
