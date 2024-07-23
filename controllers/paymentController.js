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
const { connectDB } = require('../config/db');
const config = require('../config/env');
const Category = require('../models/category');


function generateUUID() {
    return uuidv4();
}

exports.checkOut = (req, res) => {
    res.render('en/index');
};

exports.authenticate = async (req, res) => {

    try {
        const paymentInfo = req.session.paymentInfo;
        const {CardPan, CardCvv, CardExpiration, CardholderName, FirstName, LastName, Line1, Line2, EmailAddress, TotalAmount, CurrencyCode, RepEmailAddress} = req.body;
        // console.log('body', req.body);
        const currency = (CurrencyCode == 'JMD') ? '388' : '840';
        const cleanCardExpiration = CardExpiration.replace(/\//g, '');
        const cardExp = cleanCardExpiration.slice(2) + CardExpiration.slice(0, 2);
        const cardDigits = CardPan.replace(/\s+/g, '');
        const price = TotalAmount.replace(/,/g, '');
        const authData = {
            TransactionIdentifier: generateUUID(),
            TotalAmount: parseFloat(price),
            CurrencyCode: currency,
            ThreeDSecure: true,
            Source: {
                CardPan: cardDigits,
                CardCvv: CardCvv,
                CardExpiration: cardExp,
                CardholderName: CardholderName
            },
            OrderIdentifier: Util.generateInvoiceNumber() + '_' + CardholderName.replaceAll(/\s/g,''),
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
        // console.log('authData', authData);
        // Init authentication request
        const authResponse = await Payment.initiateAuthentication(authData);
        req.session.authResponse = authResponse;
        console.log('authResponse', authResponse);

        if (authResponse.Errors && authResponse.Errors.length > 0) {
            authResponse.Errors.forEach(error => {
                console.log(`Error Code: ${error.Code}, Message: ${error.Message}`);
            });
            res.render('en/checkout', {title: 'Checkout', error: authResponse.Errors.Message , paymentInfo: paymentInfo});
        } else {
            res.render('en/auth', { redirectData: authResponse.RedirectData });
        }

    } catch (error) {
        console.error('Error during authentication:', error);
        delete req.session.authResponse;
        res.render('en/checkout', {title: 'Checkout', error, paymentInfo: paymentInfo});
    }
};

exports.completePayment = async (req, res) => {
    try {
        const paymentInfo = req.session.paymentInfo;
        const { BillingAddress, Source } = req.session.authData;
        let authData = req.session.authData;

        // Step 1: Get countries
        const countries = await getCountries();

        // Step 2: Parse request body to get bodyData and spiToken
        const { bodyData, spiToken } = await parseRequestBody(req);

        // Step 3: Complete payment
        const paymentResponse = await completePayment(spiToken);
        req.session.paymentResponse = paymentResponse;

        // Step 4: Delete session authResponse
        delete req.session.authResponse;

        // Step 5: Load data to capture transaction
        const captureData = await captureTransaction(bodyData);

        // Step 6: Handle payment response
        // Render confirmation or checkout page based on payment response
        if (paymentResponse.Approved) {
            // Capture payment to complete transaction
            const captureResponse = await Payment.capturePayment(captureData);
            // console.log('captureResponse', captureResponse);
            if (captureResponse.Approved) {
                        
                // Extract data for email
                const saleData = extractSaleData(paymentInfo, paymentResponse, Source, BillingAddress);
                // Create new sale record
                await createNewSale(paymentInfo, paymentResponse, authData);
                //Setup Mail
                const subject = `Payment Confirmation (${paymentInfo.categoryName} / ${paymentInfo.serviceName}) - Jamaica Observer Limited`;
                const body = await Util.renderViewToString('./views/emails/confirmation.hbs', saleData);
                const ccEmail = req.session.repEmail;

                // Send email
                await Util.sendToMailQueue(BillingAddress.EmailAddress, subject, body, ccEmail);

                // Clear session
                await new Promise((resolve, reject) => {
                    req.session.destroy((err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });

                // Reconnect to main database
                await connectDB();
                
                // After all promises are resolved load confirmation screen
                res.render('en/confirmation', { title: 'Thank You', paymentResponse, ...saleData });
            }
           
        } else {
            const authData = req.session.authData;
             // Create new sale record
            await createNewSale(paymentInfo, paymentResponse, req.session.authData);
            delete req.session.authResponse;
            // Render checkout page with error message
            res.render('en/checkout', { title: 'Checkout', paymentInfo, error: paymentResponse.ResponseMessage, ...authData, countries });
        }

    } catch (error) {
        console.error('Error during payment completion:', error);
        //res.render('en/checkout', { title: 'Checkout', error, paymentInfo });
        const categories = await Category.findAll({ where: { active: true }, order:[ ['name', 'ASC'] ] });
        delete req.session.authResponse;
        res.render('en/index', {categories, error : 'There was an error processing payment or your session has timed out. Please try again.'});
    }
};

// Function to read and parse the countries JSON file
const getCountries = async () => {
    const jsonFile = await readFile('./app_data/countries.json');
    return JSON.parse(jsonFile);
};

// Function to parse the request body and extract spiToken
const parseRequestBody = async (req) => {
    const bodyData = JSON.parse(req.body.Response);
    const spiToken = bodyData.SpiToken;

    return { bodyData, spiToken };
};

// Function to complete the payment
const completePayment = async (spiToken) => {
    return await Payment.completePayment(spiToken);
};

// Function to capture transaction data
const captureTransaction = async (bodyData) => {
    return {
        TransactionIdentifier: bodyData.TransactionIdentifier,
        TotalAmount: parseFloat(bodyData.TotalAmount)
    };
};

// Helper function to extract sale data
const extractSaleData = (paymentInfo, paymentResponse, source, billingAddress) => {

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
        countAmount: paymentInfo.quantity,
        paymentDate: new Date(),
        paymentStatus: ResponseMessage + errorCodeMsg,
        paymentNotes: paymentInfo.otherInfo,
        isApproved: Approved,
        createdAt: new Date(),
        updatedAt: new Date()
    };
}

// Helper function to create new sale record
const createNewSale = async(paymentInfo, paymentResponse, authData) => {
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



