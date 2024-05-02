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
    console.log('paymentInfo', req.body);
    const { category, service, serviceName, serviceText, categoryName, categoryId, pricehd, currency, price, otherInfo, description } = req.body;

    // Assuming there's only one category and service selected
    const selectedPrice = (price[0]) ? price[0] : pricehd[0];
    const selectedCurrency = currency[0];
    const selectedOtherInfo = otherInfo[0];

    const paymentInfo = {
        categoryName: categoryName,
        categoryId: category,
        serviceName: serviceText,
        description: description,
        serviceId: service,
        price: selectedPrice,
        currency: selectedCurrency,
        otherInfo: selectedOtherInfo
    };

    // Optionally, you can send a response back
    res.json({ success: paymentInfo });
    
  }

  module.exports = {
    getMain,
    getService,
    loadPaymentInfo
  };