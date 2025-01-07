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
const Service = require('../models/service');
var store = require('store/dist/store.modern');

function generateUUID() {
    return uuidv4();
}

exports.checkOut = (req, res) => {
    res.render('en/index');
};

exports.authenticate = async (req, res) => {

    try {
        const paymentInfo = req.session.paymentInfo;
        const {CardPan, CardCvv, CardExpiration, CardholderName, FirstName, LastName, Line1, Line2, EmailAddress, TotalAmount, CurrencyCode, RepEmailAddress, PhoneNumber} = req.body;
        // console.log('body', req.body);
        let currency = (CurrencyCode == 'JMD') ? '388' : '840';
        const cleanCardExpiration = CardExpiration.replace(/\//g, '');
        const cardExp = cleanCardExpiration.slice(2) + CardExpiration.slice(0, 2);
        const cardDigits = CardPan.replace(/\s+/g, '');
        let price = TotalAmount.replace(/,/g, '');
        const quantity = (paymentInfo.quantity) ? parseInt(paymentInfo.quantity) : 1;

        const selectedService = await Service.findOne({ where: { serviceId: parseInt(paymentInfo.serviceId) } });
        if(selectedService){
            if(selectedService.price > 0){
                price = (quantity * selectedService.price);
                currency = (selectedService.currency == 'JMD') ? '388' : '840';
            }
        }

        const authData = {
            TransactionIdentifier: generateUUID(),
            TotalAmount: parseFloat(price),
            CurrencyCode: currency,
            ThreeDSecure: true,
            Source: {
                CardPan: cardDigits,
                CardCvv: CardCvv,
                CardExpiration: cardExp,
                CardholderName: CardholderName.trim()
            },
            OrderIdentifier: Util.generateInvoiceNumber() + '_' + CardholderName.replaceAll(/\s/g,''),
            BillingAddress : {
                FirstName: FirstName,
                LastName: LastName,
                Line1: Line1,
                Line2: Line2,
                City: '',
                //CountryCode: '840',
                EmailAddress: EmailAddress.toLowerCase().trim(),
                PhoneNumber: PhoneNumber
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

        // Init authentication request
        Payment.initiateAuthentication(authData)
        .then(authResponse => {
            // Save data to session
            req.session.authData = authData;
            //remove card details before store
            authData.Source.CardPan = cardDigits.slice(-4);
            authData.Source.CardCvv = 0;

            const encryptedAuthData = Util.encryptData(authData, process.env.SECRET_KEY);
            store.set('authData', encryptedAuthData);
            req.session.repEmail = RepEmailAddress;
            req.session.authResponse = authResponse;

            // Extract RedirectData for later use
            const redirectData = authResponse.RedirectData;

            // Save session changes
            return new Promise((resolve, reject) => {
                req.session.save(err => {
                    if (err) {
                        console.error('Session save error:', err);
                        res.render('en/checkout', { title: 'Checkout', error: 'Session save error', paymentInfo });
                        reject(err);
                    } else {
                        resolve(redirectData); // Resolve with redirectData
                    }
                });
            });
        })
        .then(redirectData => {
            if (req.session.authResponse.Errors && req.session.authResponse.Errors.length > 0) {
                req.session.authResponse.Errors.forEach(error => {
                    console.log(`Error Code: ${error.Code}, Message: ${error.Message}`);
                });
            } else {
                // Use the extracted redirectData variable instead of session data
                res.render('en/auth', { redirectData });
            }
        })
        .catch(error => {
            console.error('Error during authentication:', error);
            res.render('en/checkout', { title: 'Checkout', error, paymentInfo });
            delete req.session.authResponse;
        });


    } catch (error) {
        console.error('Error during authentication:', error);        
        delete req.session.authResponse;
        res.render('en/checkout', {title: 'Checkout', error, paymentInfo: paymentInfo});
    }
};

exports.completePayment = async (req, res) => {
    try {

        const encryptedAuthData = store.get('authData');
        const encryptedPaymentInfo = store.get('paymentInfo');
        const authData = Util.decryptData(encryptedAuthData, process.env.SECRET_KEY);
        const paymentInfo = Util.decryptData(encryptedPaymentInfo, process.env.SECRET_KEY);
        // const paymentInfo = req.session.paymentInfo;
        const { BillingAddress, Source } = authData;

        try {
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
            if (paymentResponse.Approved) {
                // Capture payment to complete transaction
                const captureResponse = await Payment.capturePayment(captureData);
                if (captureResponse.Approved) {
                    
                    // Render confirmation page
                    const saleData = extractSaleData(paymentInfo, paymentResponse, Source, BillingAddress);
                    await createNewSale(paymentInfo, paymentResponse, authData);

                    // Setup and send email
                    const subject = `Payment Confirmation (${paymentInfo.categoryName} / ${paymentInfo.serviceName}) - Jamaica Observer Limited`;
                    const body = await Util.renderViewToString('./views/emails/confirmation.hbs', saleData);
                    const ccEmail = req.session.repEmail;
                    await Util.sendToMailQueue(BillingAddress.EmailAddress, subject, body, ccEmail);

                    // Clear session
                    await new Promise((resolve, reject) => {
                        req.session.destroy((err) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve();
                                store.remove('authData');
                                store.remove('paymentInfo');
                            }
                        });
                    });

                    // Reconnect to main database and render confirmation page
                    await connectDB();
                    res.render('en/confirmation', { title: 'Thank You', paymentResponse, ...saleData });
                }
            } else {
                await connectDB();
                // Handle declined or failed payment
                await createNewSale(paymentInfo, paymentResponse, authData);
                delete req.session.authResponse;
                res.render('en/checkout', { title: 'Checkout', paymentInfo, error: paymentResponse.ResponseMessage, ...authData, countries });
            }
        } catch (error) {
            await connectDB();
            console.error('Error during payment completion:', error);
            const categories = await Category.findAll({ where: { active: true }, order: [['name', 'ASC']] });
            delete req.session.authResponse;
            res.render('en/index', { categories, error: 'There was an error processing payment or your session has timed out. Please try again.' });
        }
    } catch (error) {
        console.error('Unexpected error:', error);
        res.render('en/checkout', { title: 'Checkout', error, paymentInfo: req.session.paymentInfo });
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
        lastFour: source.CardPan,
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
        contactNumber: billingAddress.PhoneNumber,
        createdAt: new Date(),
        updatedAt: new Date()
    };
}

// Helper function to create new sale record
const createNewSale = async (paymentInfo, paymentResponse, authData) => {
    try {
        
        const newSale = {
            categoryId: parseInt(paymentInfo.categoryId),
            ...extractSaleData(paymentInfo, paymentResponse, authData.Source, authData.BillingAddress)
        };
        await Sale.create(newSale);
        
    } catch (error) {
        console.error(error);
    }
    
}


