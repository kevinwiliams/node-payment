const Category = require('../models/category');
const Service = require('../models/service');
const Sale = require('../models/sale');
const Subscriber = require('../models/subscriber');
const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);



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
        const services = await Service.findAll({ where: { categoryId : parseInt(id)}, order:[ ['price', 'DESC'] ] });
        // return services;
        res.json({
            services: services
        });

    } catch (err) {
      console.error(err);
      return null;
    }
  }

  async function loadPaymentInfo(req, res) {
    try {
        console.log('paymentInfo', req.body);
    
        const { category, service, serviceName, serviceText, categoryName, categoryId, pricehd, currency, currencyhd, price, otherInfo, description, totalAmount } = req.body;
        // Assuming there's only one category and service selected
        const selectedOtherInfo = otherInfo[0];

        const jsonFile = await readFile('./app_data/countries.json');
        const countries = JSON.parse(jsonFile);


        const paymentInfo = {
            categoryName: categoryName,
            categoryId: category,
            serviceName: serviceText,
            description: description,
            serviceId: service,
            price: totalAmount,
            currency: currencyhd,
            otherInfo: selectedOtherInfo
        };

        //res.json({ success: paymentInfo });
        res.render('en/checkout', { paymentInfo, countries });
    } catch (error) {
        console.log(error);
    }
    
    
  }

  module.exports = {
    getMain,
    getService,
    loadPaymentInfo
  };