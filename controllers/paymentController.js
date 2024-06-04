// controllers/paymentController.js
require('dotenv').config();
const axios = require('axios');
const Payment = require('../models/paymentModel');
const Sale = require('../models/sale');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const Util = require('../helpers/util');
const { connectAdhocDB, connectDB } = require('../config/db');
const config = require('../config/env');
const Category = require('../models/category');


function generateUUID() {
    return uuidv4();
}

exports.checkOut = (req, res) => {
    res.render('en/index');
};

exports.authenticate = async (req, res) => {
    const paymentInfo = req.session.paymentInfo;

    try {

        const {CardPan, CardCvv, CardExpiration, CardholderName, FirstName, LastName, Line1, Line2, EmailAddress, TotalAmount, CurrencyCode, RepEmailAddress} = req.body;
        // console.log('body', req.body);
        const currency = (CurrencyCode == 'JMD') ? '388' : '840';
        const cardExp = CardExpiration.slice(2) + CardExpiration.slice(0, 2);
        const authData = {
            TransactionIdentifier: generateUUID(),
            TotalAmount: parseFloat(TotalAmount),
            CurrencyCode: currency,
            ThreeDSecure: true,
            Source: {
                CardPan: CardPan,
                CardCvv: CardCvv,
                CardExpiration: cardExp,
                CardholderName: CardholderName
            },
            OrderIdentifier: Util.generateInvoiceNumber(),
            BillingAddress : {
                FirstName: FirstName,
                LastName: LastName,
                Line1: Line1,
                Line2: Line2,
                City: '',
                //CountryCode: '840',
                EmailAddress: EmailAddress
            },
            AddressMatch: false,
            ExtendedData: {
                ThreeDSecure: {
                    ChallengeWindowSize: 4,
                    ChallengeIndicator: '01'
                },
                MerchantResponseUrl: config.responseUrl
            }
        };

        req.session.authData = authData;
        req.session.repEmail = RepEmailAddress;
        //console.log('authData', authData);
        // Init authentication request
        const authResponse = await Payment.initiateAuthentication(authData);
        req.session.authResponse = authResponse;
        //console.log('authResponse', authResponse);
        res.render('en/auth', { redirectData: authResponse.RedirectData });
    } catch (error) {
        console.error('Error during authentication:', error);
        res.render('en/checkout', {title: 'Checkout', error, paymentInfo: paymentInfo});
        delete req.session.authResponse;

    }
};

exports.completePayment = async (req, res) => {
    const paymentInfo = req.session.paymentInfo;

    try {
        const jsonFile = await readFile('./app_data/countries.json');
        const countries = JSON.parse(jsonFile);
        // Init payment completion
        const paymentResponse = await Payment.completePayment(req.session.authResponse.SpiToken);
        req.session.paymentResponse = paymentResponse;
        console.log('paymentResponse', paymentResponse);
        delete req.session.authResponse;

        // Extract necessary properties from req.session.authData
        const { BillingAddress, Source } = req.session.authData;

        // Render confirmation or checkout page based on payment response
        if (paymentResponse.Approved) {
            // Render confirmation page
            const saleData = extractSaleData(paymentInfo, paymentResponse, Source, BillingAddress);
             // Create new sale record
            await createNewSale(paymentInfo, paymentResponse, req.session.authData);
            //Send Mail
            const subject = `Credit Card Payment Confirmation (${paymentInfo.categoryName}) - Jamaica Observer Limited`;
            const body = await Util.renderViewToString('./views/emails/confirmation.hbs', saleData);
            const ccEmail = req.session.repEmail;
            //connect to adhoc database to send mail
            connectAdhocDB();
            const emailSent = await Util.sendToMailQueue(BillingAddress.EmailAddress, subject, body, ccEmail);
            // Clear session
            req.session.destroy();
            //reconnect to main database
            connectDB();

            res.render('en/confirmation', { title: 'Thank You', paymentResponse, ...saleData, repEmail: ccEmail });
        } else {
            const authData = req.session.authData;
             // Create new sale record
            await createNewSale(paymentInfo, paymentResponse, req.session.authData);
            // Render checkout page with error message
            res.render('en/checkout', { title: 'Checkout', paymentInfo, error: paymentResponse.ResponseMessage, ...authData, countries });
            delete req.session.authResponse;
        }

       
    } catch (error) {
        console.error('Error during payment completion:', error);
        //res.render('en/checkout', { title: 'Checkout', error, paymentInfo });
        const categories = await Category.findAll({ where: { active: true }, order:[ ['name', 'ASC'] ] });
        delete req.session.authResponse;
        res.render('en/index', {categories, error : 'There was an error processing payment or your session has timed out. Please try again.'});
    }
};

// Helper function to extract sale data
function extractSaleData(paymentInfo, paymentResponse, source, billingAddress) {

    const {Errors, ResponseMessage, Approved, CardBrand, TransactionIdentifier, AuthorizationCode, OrderIdentifier, TotalAmount, RRN} = paymentResponse;
    let errorCodeMsg = '';
    if (!Approved && Errors && Errors.length > 0) {
        errorCodeMsg = ` | ${Errors[0].Code} : ${Errors[0].Message}`;
    }

    return {
        serviceName: `${paymentInfo.categoryName} : ${paymentInfo.serviceName}`,
        emailAddress: billingAddress.EmailAddress,
        cardOwner: source.CardholderName,
        cardType: CardBrand,
        cardExpiry: source.CardExpiration,
        lastFour: source.CardPan.slice(-4),
        transactionId: TransactionIdentifier,
        authCode: AuthorizationCode ?? 0,
        orderId: OrderIdentifier,
        refNumber: RRN,
        currency: paymentInfo.currency,
        amount: parseFloat(TotalAmount),
        paymentDate: new Date(),
        paymentStatus: ResponseMessage + errorCodeMsg,
        paymentNotes: paymentInfo.otherInfo,
        isApproved: Approved,
        createdAt: new Date(),
        updatedAt: new Date()
    };
}

// Helper function to create new sale record
async function createNewSale(paymentInfo, paymentResponse, authData) {
    try {
        const newSale = {
            categoryId: parseInt(paymentInfo.categoryId),
            ...extractSaleData(paymentInfo, paymentResponse, authData.Source, authData.BillingAddress)
        };
        await Sale.create(newSale);
    } catch (error) {
        console.error('Error during sale completion:', error);
    }
   
}



