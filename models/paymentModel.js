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

async function postToGateway(path, payload) {
    try {
        const response = await axios.post('https://' + config.processingHost + path, payload, {
        headers,
        timeout: 20000,
        });

        return response.data;
    } catch (error) {
        const gatewayError = new Error(error.response?.data?.Message || error.message || 'Gateway request failed.');
        gatewayError.details = error.response?.data || null;
        throw gatewayError;
    }
}

exports.initiateAuthentication = async (data) => {
    return postToGateway('/Api/spi/auth', data);
};

exports.completePayment = async (spiToken) => {
    return postToGateway('/Api/spi/Payment', spiToken);
};

exports.capturePayment = async (captureData) => {
    return postToGateway('/Api/capture', captureData);
};
