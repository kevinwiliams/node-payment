require('dotenv').config();

const config = {
    production: {
        merchantId: process.env.PROD_MERCHANT_ID,
        processingPassword: process.env.PROD_PROCESSING_PASSWORD,
        responseUrl: process.env.PROD_MERCHANT_RESPONSE_URL,
        processingHost: process.env.PROD_PROCESSING_HOST,
        bcc_advertise: process.env.prod_bcc_advertise,
        bcc_display: process.env.prod_bcc_display,
        bcc_papers: process.env.prod_bcc_papers,
        bcc_epaper: process.env.prod_bcc_epaper,
        bcc_other: process.env.prod_bcc_other,
        bcc_tickets: process.env.prod_bcc_tickets,
        bcc_library: process.env.prod_bcc_library,
    },
    dev: {
        merchantId: process.env.DEV_MERCHANT_ID,
        processingPassword: process.env.DEV_PROCESSING_PASSWORD,
        responseUrl: process.env.DEV_MERCHANT_RESPONSE_URL,
        processingHost: process.env.DEV_PROCESSING_HOST,
        bcc_advertise: process.env.dev_bcc_advertise,
        bcc_display: process.env.dev_bcc_display,
        bcc_papers: process.env.dev_bcc_papers,
        bcc_epaper: process.env.dev_bcc_epaper,
        bcc_other: process.env.dev_bcc_other,
        bcc_tickets: process.env.dev_bcc_tickets,
        bcc_library: process.env.dev_bcc_library,
    }
};

const currentEnv = process.env.NODE_ENV || 'dev';

module.exports = config[currentEnv];