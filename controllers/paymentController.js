// controllers/paymentController.js
require('dotenv').config();
const axios = require('axios');
const Payment = require('../models/paymentModel');
const { v4: uuidv4 } = require('uuid');

function generateUUID() {
    return uuidv4();
}

exports.checkOut = (req, res) => {
    res.render('merchantCheckOut');
};

exports.authenticate = async (req, res) => {
    try {

        const {CardPan, CardCvv, CardExpiration, CardholderName, FirstName, LastName, Line1, Line2, EmailAddress, TotalAmount, CurrencyCode} = req.body;
        // console.log('body', req.body);
        const authData = {
            TransactionIdentifier: generateUUID(),
            TotalAmount: parseFloat(TotalAmount),
            CurrencyCode: "388",
            ThreeDSecure: true,
            Source: {
                CardPan: CardPan,
                CardCvv: CardCvv,
                CardExpiration: CardExpiration,
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
        console.log('authData', authData);
        // Simulate authentication request
        const authResponse = await Payment.initiateAuthentication(authData);
        req.session.authResponse = authResponse;
        // console.log('authResponse', authResponse);
        res.render('authenticationView', { redirectData: authResponse.RedirectData });
    } catch (error) {
        console.error('Error during authentication:', error);
        res.render('error');
    }
};

exports.completePayment = async (req, res) => {
    try {
       
        // Simulate payment completion
        const paymentResponse = await Payment.completePayment(req.session.authResponse.SpiToken);
        req.session.paymentResponse = paymentResponse;
        // console.log('paymentResponse', paymentResponse);
        res.render('paymentCompletion', { paymentResponse });
    } catch (error) {
        console.error('Error during payment completion:', error);
        res.render('error');
    }
};
