require('dotenv').config();

const config = {
    production: {
        merchantId: process.env.PROD_MERCHANT_ID,
        processingPassword: process.env.PROD_PROCESSING_PASSWORD,
        responseUrl: process.env.PROD_MERCHANT_RESPONSE_URL,
        processingHost: process.env.PROD_PROCESSING_HOST,
    },
    dev: {
        merchantId: process.env.DEV_MERCHANT_ID,
        processingPassword: process.env.DEV_PROCESSING_PASSWORD,
        responseUrl: process.env.DEV_MERCHANT_RESPONSE_URL,
        processingHost: process.env.DEV_PROCESSING_HOST,
    }
};

const currentEnv = process.env.NODE_ENV || 'dev';

module.exports = config[currentEnv];