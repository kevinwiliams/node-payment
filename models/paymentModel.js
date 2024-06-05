// models/paymentModel.js
require('dotenv').config();
const config = require('../config/env');
const axios = require('axios');

const headers = {
    'Accept': 'application/json',
    'PowerTranz-PowerTranzId': config.merchantId,
    'PowerTranz-PowerTranzPassword': config.processingPassword,
    'Content-Type': 'application/json; charset=utf-8',
    'Host': config.processingHost,
};

exports.initiateAuthentication = async (data) => {
    return axios.post('https://' + config.processingHost + '/Api/spi/auth', data, { headers })
        .then(response => response.data)
        .catch(error => {
            throw error;
        });
};

exports.completePayment = async (spiToken) => {
    return axios.post('https://' + config.processingHost + '/Api/spi/Payment', spiToken, { headers })
        .then(response => response.data)
        .catch(error => {
            throw error;
        });
};

exports.capturePayment = async (captureData) => {
    return axios.post('https://' + config.processingHost + '/Api/capture', captureData, { headers })
        .then(response => response.data)
        .catch(error => {
            throw error;
        });
};