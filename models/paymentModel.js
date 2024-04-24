// models/paymentModel.js
require('dotenv').config();
const axios = require('axios');

const headers = {
    'Accept': 'application/json',
    'PowerTranz-PowerTranzId': process.env.TESTING_MERCHANT_ID,
    'PowerTranz-PowerTranzPassword': process.env.TESTING_PROCESSING_PASSWORD,
    'Content-Type': 'application/json; charset=utf-8',
    'Host': process.env.TESTING_PROCESSING_HOST,
};

exports.initiateAuthentication = async (data) => {
    return axios.post('https://'+ process.env.TESTING_PROCESSING_HOST +'/Api/spi/auth', data, { headers })
        .then(response => response.data)
        .catch(error => {
            throw error;
        });
};

exports.completePayment = async (spiToken) => {
    return axios.post('https://'+ process.env.TESTING_PROCESSING_HOST +'/Api/spi/Payment', spiToken, { headers })
        .then(response => response.data)
        .catch(error => {
            throw error;
        });
};
