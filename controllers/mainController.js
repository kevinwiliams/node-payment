const Category = require('../models/category');
const Service = require('../models/service');
const Sale = require('../models/sale');
const Subscriber = require('../models/subscriber');
const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const Util = require('../helpers/util');
var store = require('store/dist/store.modern');


// GET all users
async function getMain(req, res){
    try {
        if(req.session.isAuthenticated){
            res.redirect('/admin/dashboard');
        }
    //   const users = await User.findAll();
    const categories = await Category.findAll({ limit: 10, where: { active: true }, order:[ ['name', 'ASC'] ] });
    // console.log('categories', categories);
      res.render('en/index', {title: 'Welcome', categories});

    } catch (err) {
      console.error(err);
      res.status(500).send('Error loading dashboard');
    }
  }

  async function getService(req, res){
    try {
        const { id } = req.body;
        console.log('id', req.body);
        const services = await Service.findAll({ 
            where: { categoryId : parseInt(id), active: true}, 
            order:[ ['price', 'DESC'] ] });
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
        
        if (req.session.paymentInfo) {
          delete req.session.paymentInfo;
        }
    
        const { category, service, serviceName, serviceText, categoryName, categoryId, pricehd, currency, currencyhd, price, otherInfo, description, totalAmount, count } = req.body;
        // Assuming there's only one category and service selected
        const selectedOtherInfo = otherInfo[0];

        const jsonFile = await readFile('./app_data/countries.json');
        const countries = JSON.parse(jsonFile);
        const fullAmount = (count) ? (parseInt(count) * parseFloat(totalAmount)) : totalAmount;

        const paymentInfo = {
            categoryName: categoryName,
            categoryId: category,
            serviceName: serviceText,
            description: description,
            serviceId: service,
            price: fullAmount,
            quantity: count,
            currency: currencyhd,
            otherInfo: categoryName.includes('Tickets') 
            ? (count ? `${count} Ticket(s)` : 'N/A') // If 'Tickets', check if count exists
            : (selectedOtherInfo || 'N/A') //set ticket count if tickets is in the categoryName
        };

        req.session.paymentInfo = paymentInfo;

        const encryptedPaymentInfo = Util.encryptData(paymentInfo, process.env.SECRET_KEY);
        store.set('paymentInfo', encryptedPaymentInfo);

        //res.json({ success: paymentInfo });
        res.render('en/checkout', { paymentInfo, countries, title : 'Checkout' });
    } catch (error) {
        console.log(error);
    }
    
    
  }

  module.exports = {
    getMain,
    getService,
    loadPaymentInfo
  };