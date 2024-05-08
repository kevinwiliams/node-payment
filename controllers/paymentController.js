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


function generateUUID() {
    return uuidv4();
}

exports.checkOut = (req, res) => {
    res.render('en/index');
};

exports.authenticate = async (req, res) => {
    const paymentInfo = req.session.paymentInfo;

    try {

        const {CardPan, CardCvv, CardExpiration, CardholderName, FirstName, LastName, Line1, Line2, EmailAddress, TotalAmount, CurrencyCode} = req.body;
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
            OrderIdentifier: 'INV-'+ generateUUID(),
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
                MerchantResponseUrl: process.env.TESTING_MERCHANT_RESPONSE_URL
            }
        };

        req.session.authData = authData;
        //console.log('authData', authData);
        // Init authentication request
        const authResponse = await Payment.initiateAuthentication(authData);
        req.session.authResponse = authResponse;
        console.log('authResponse', authResponse);
        res.render('en/auth', { redirectData: authResponse.RedirectData });
    } catch (error) {
        console.error('Error during authentication:', error);
        req.session.destroy();
        res.render('en/checkout', {title: 'Checkout', error, paymentInfo: paymentInfo});
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

        // Extract necessary properties from req.session.authData
        const { BillingAddress, Source } = req.session.authData;

        // Render confirmation or checkout page based on payment response
        if (paymentResponse.Approved) {
            // Render confirmation page
            const saleData = extractSaleData(paymentInfo, paymentResponse, Source, BillingAddress);
             // Create new sale record
            await createNewSale(paymentInfo, paymentResponse, req.session.authData);
            //Send Mail
            //connect to adhoc database to send mail
            connectAdhocDB();
            const subject = `Online Credit Card Payment Confirmation - Jamaica Observer Limited`;
            const body = await Util.renderViewToString('./views/emails/confirmation.hbs', saleData);
            const emailSent = await Util.sendToMailQueue(BillingAddress.EmailAddress, subject, body);
            // Clear session
            req.session.destroy();
            //reconnect to original database
            connectDB();

            res.render('en/confirmation', { title: 'Thank You', paymentResponse, ...saleData });
        } else {
            const authData = req.session.authData;
             // Create new sale record
            await createNewSale(paymentInfo, paymentResponse, req.session.authData);
            // Render checkout page with error message
            req.session.destroy();
            res.render('en/checkout', { title: 'Checkout', paymentInfo, error: paymentResponse.ResponseMessage, ...authData, countries });
        }

       
    } catch (error) {
        console.error('Error during payment completion:', error);
        req.session.destroy();
        res.render('en/checkout', { title: 'Checkout', error, paymentInfo });
    }
};

// Helper function to extract sale data
function extractSaleData(paymentInfo, paymentResponse, source, billingAddress) {
    return {
        serviceName: `${paymentInfo.categoryName} : ${paymentInfo.serviceName}`,
        emailAddress: billingAddress.EmailAddress,
        cardOwner: source.CardholderName,
        cardType: paymentResponse.CardBrand,
        cardExpiry: source.CardExpiration,
        lastFour: source.CardPan.slice(-4),
        transactionId: paymentResponse.TransactionIdentifier,
        authCode: paymentResponse.AuthorizationCode ?? 0,
        orderId: paymentResponse.OrderIdentifier,
        refNumber: paymentResponse.RRN,
        currency: paymentInfo.currency,
        amount: parseFloat(paymentResponse.TotalAmount),
        paymentDate: new Date(),
        paymentStatus: paymentResponse.ResponseMessage,
        paymentNotes: paymentInfo.otherInfo,
        isApproved: paymentResponse.Approved,
        createdAt: new Date(),
        updatedAt: new Date()
    };
}

// Helper function to create new sale record
async function createNewSale(paymentInfo, paymentResponse, authData) {
    const newSale = {
        categoryId: parseInt(paymentInfo.categoryId),
        ...extractSaleData(paymentInfo, paymentResponse, authData.Source, authData.BillingAddress)
    };
    await Sale.create(newSale);
}



