// controllers/paymentController.js
require('dotenv').config();
const axios = require('axios');
const Payment = require('../models/paymentModel');
const Sale = require('../models/sale');
const { v4: uuidv4 } = require('uuid');

function generateUUID() {
    return uuidv4();
}

exports.checkOut = (req, res) => {
    res.render('en/index');
};

exports.authenticate = async (req, res) => {
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
        console.log('authData', authData);
        // Simulate authentication request
        const authResponse = await Payment.initiateAuthentication(authData);
        req.session.authResponse = authResponse;
        console.log('authResponse', authResponse);
        res.render('en/auth', { redirectData: authResponse.RedirectData });
    } catch (error) {
        console.error('Error during authentication:', error);
        res.render('en/checkout', {title: 'Checkout', error});
    }
};

exports.completePayment = async (req, res) => {
    try {
       
        // Simulate payment completion
        const paymentResponse = await Payment.completePayment(req.session.authResponse.SpiToken);
        req.session.paymentResponse = paymentResponse;
        console.log('paymentResponse', paymentResponse);
        //Save transaction data

        const authData = req.session.authData;

        const newSale = await Sale.create({
            categoryId: parseInt(authData.categoryId), // Replace with the actual categoryId
            serviceName: 'Example Service',
            emailAddress: authData.BillingAddress.EmailAddress,
            cardOwner: authData.CardholderName,
            cardType: paymentResponse.CardBrand,
            cardExpiry: authData.CardExpiration, // Replace with the actual card expiry
            lastFour: authData.CardPan.slice(4), // Replace with the actual last four digits of the card
            transactionId: paymentResponse.TransactionIdentifier, // Replace with the actual transaction ID
            authCode: paymentResponse.AuthorizationCode, // Replace with the actual authorization code
            orderId: paymentResponse.OrderIdentifier, // Replace with the actual order ID
            refNumber: paymentResponse.RRN, // Replace with the actual reference number
            currency: paymentResponse.CurrencyCode, // Replace with the actual currency
            amount: parseFloat(paymentResponse.TotalAmount), // Replace with the actual amount
            paymentDate: new Date(), // Replace with the actual payment date
            paymentStatus: paymentResponse.Approved, // Replace with the actual payment status
            paymentNotes: 'Payment successful.', // Replace with any payment notes
            isApproved: paymentResponse.Approved, // Replace with the actual approval status
            createdAt: new Date(), // Replace with the actual creation date
            updatedAt: new Date() // Replace with the actual update date
        });
        console.log('New sale created:', newSale.toJSON());

        res.render('en/confirmation', { paymentResponse, title: 'Thank You' });
    } catch (error) {
        console.error('Error during payment completion:', error);
        res.render('en/checkout', {title: 'Checkout', error});
    }
};
