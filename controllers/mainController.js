const Category = require('../models/category');
const Service = require('../models/service');
const Sale = require('../models/sale');
const Subscriber = require('../models/subscriber');
const { withBasePath } = require('../helpers/basePath');
const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);
 
const MAX_CUSTOM_AMOUNT = parseFloat(process.env.MAX_CUSTOM_PAYMENT_AMOUNT || '9000000');

async function getActiveCategories() {
    return Category.findAll({
        limit: 10,
        where: { active: true },
        order:[ ['name', 'ASC'] ],
        raw: true,
    });
}

function buildEmptyCheckoutFormData() {
    return {
        firstName: '',
        lastName: '',
        emailAddress: '',
        repEmailAddress: '',
        line1: '',
        line2: '',
        stateParish: '',
        countryCode: 'JM',
        postalCode: '',
        phoneNumber: '',
        cardholderName: '',
    };
}

function normalizeQuantity(rawCount) {
    const quantity = parseInt(rawCount || '1', 10);

    if (Number.isNaN(quantity) || quantity < 1) {
        return 1;
    }

    return Math.min(quantity, 5);
}

function normalizeOtherInfo(otherInfo) {
    if (Array.isArray(otherInfo)) {
        return otherInfo.find((value) => typeof value === 'string' && value.trim()) || '';
    }

    return typeof otherInfo === 'string' ? otherInfo.trim() : '';
}

// GET all users
async function getMain(req, res){
    try {
        if(req.session.isAuthenticated){
            return res.redirect(withBasePath('/admin/dashboard', req.app.locals.basePath));
        }

        const categories = await getActiveCategories();

        return res.render('en/index', {title: 'Welcome', categories});

    } catch (err) {
      console.error(err);
      res.status(500).send('Error loading dashboard');
    }
  }

  async function getService(req, res){
    try {
        const categoryId = parseInt(req.body.id, 10);

        if (Number.isNaN(categoryId)) {
            return res.status(400).json({ services: [] });
        }

        const services = await Service.findAll({ 
            where: { categoryId, active: true},
            order:[ ['price', 'DESC'] ] });

        return res.json({ services });

    } catch (err) {
      console.error(err);
      return res.status(500).json({ services: [] });
    }
  }

  async function loadPaymentInfo(req, res) {
    try {
        const categoryId = parseInt(req.body.category, 10);
        const serviceId = parseInt(req.body.service, 10);

        if (Number.isNaN(categoryId) || Number.isNaN(serviceId)) {
            throw new Error('Invalid category or service selection.');
        }

        const categories = await getActiveCategories();

        const category = await Category.findOne({ where: { categoryId, active: true } });
        const service = await Service.findOne({ where: { serviceId, categoryId, active: true } });

        if (!category || !service) {
            return res.status(400).render('en/index', {
                title: 'Welcome',
                categories,
                error: 'The selected service is no longer available. Please choose again.',
            });
        }

        const jsonFile = await readFile('./app_data/countries.json');
        const countries = JSON.parse(jsonFile);
        const quantity = normalizeQuantity(req.body.count);

        let currency = service.currency;
        let fullAmount = Number(service.price || 0);

        if (fullAmount > 0) {
            fullAmount *= quantity;
        } else {
            const submittedAmount = parseFloat(String(req.body.totalAmount || '').replace(/,/g, ''));
            const submittedCurrency = String(req.body.currencyhd || req.body.currency || '').toUpperCase();

            if (!Number.isFinite(submittedAmount) || submittedAmount <= 0 || submittedAmount > MAX_CUSTOM_AMOUNT) {
                return res.status(400).render('en/index', {
                    title: 'Welcome',
                    categories,
                    error: 'Please enter a valid payment amount.',
                });
            }

            if (!['JMD', 'USD'].includes(submittedCurrency)) {
                return res.status(400).render('en/index', {
                    title: 'Welcome',
                    categories,
                    error: 'Please select a valid payment currency.',
                });
            }

            currency = submittedCurrency;
            fullAmount = submittedAmount;
        }

        const normalizedOtherInfo = normalizeOtherInfo(req.body.otherInfo);

        const paymentInfo = {
            categoryName: category.name,
            categoryId,
            serviceName: service.name,
            description: service.description,
            serviceId,
            price: parseFloat(fullAmount.toFixed(2)),
            quantity,
            currency,
            otherInfo: category.name.includes('Tickets')
                ? `${quantity} Ticket(s)`
                : (normalizedOtherInfo || 'N/A'),
        };

        req.session.paymentInfo = paymentInfo;
        delete req.session.authData;
        delete req.session.repEmail;
        delete req.session.paymentResponse;

        await new Promise((resolve, reject) => {
            req.session.save((err) => {
                if (err) {
                    return reject(err);
                }

                return resolve();
            });
        });

        return res.render('en/checkout', {
            paymentInfo,
            countries,
            formData: buildEmptyCheckoutFormData(),
            title : 'Checkout',
        });
    } catch (error) {
        console.error(error);
        const categories = await getActiveCategories();
        return res.status(400).render('en/index', {
            title: 'Welcome',
            categories,
            error: 'Unable to prepare your checkout. Please select your service again.',
        });
    }
  }

  module.exports = {
    getMain,
    getService,
    loadPaymentInfo
  };
