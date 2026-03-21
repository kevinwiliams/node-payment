require('dotenv').config();

const axios = require('axios');
const fs = require('fs');
const util = require('util');
const { v4: uuidv4 } = require('uuid');

const Payment = require('../models/paymentModel');
const PendingPayment = require('../models/pendingPayment');
const Sale = require('../models/sale');
const Util = require('../helpers/util');
const config = require('../config/env');
const Category = require('../models/category');
const Service = require('../models/service');
const { withBasePath } = require('../helpers/basePath');

const readFile = util.promisify(fs.readFile);

function generateUUID() {
    return uuidv4();
}

function firstErrorMessage(errors) {
    if (!Array.isArray(errors) || errors.length === 0) {
        return '';
    }

    const firstError = errors[0];
    return `${firstError.Code || 'ERR'}: ${firstError.Message || 'Unknown error'}`;
}

function validateCheckoutSubmission(body) {
    const requiredFields = [
        'FirstName',
        'LastName',
        'EmailAddress',
        'Line1',
        'StateParish',
        'CountryCode',
        'PostalCode',
        'PhoneNumber',
        'CardholderName',
        'CardPan',
        'CardExpiration',
        'CardCvv',
    ];

    for (const field of requiredFields) {
        if (!String(body[field] || '').trim()) {
            return 'Please complete all required payment fields.';
        }
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.EmailAddress || '').trim())) {
        return 'Please enter a valid email address.';
    }

    if (!/^\d{2}\/\d{2}$/.test(String(body.CardExpiration || '').trim())) {
        return 'Please enter the card expiration as MM/YY.';
    }

    const cardDigits = String(body.CardPan || '').replace(/\D/g, '');
    if (cardDigits.length < 13 || cardDigits.length > 19) {
        return 'Please enter a valid card number.';
    }

    const cvv = String(body.CardCvv || '').replace(/\D/g, '');
    if (cvv.length < 3 || cvv.length > 4) {
        return 'Please enter a valid CVV.';
    }

    return '';
}

function buildCheckoutFormData(body = {}, storedAuthData = null, repEmail = '') {
    const billingAddress = storedAuthData?.BillingAddress || {};
    const source = storedAuthData?.Source || {};

    return {
        firstName: body.FirstName || billingAddress.FirstName || '',
        lastName: body.LastName || billingAddress.LastName || '',
        emailAddress: body.EmailAddress || billingAddress.EmailAddress || '',
        repEmailAddress: body.RepEmailAddress || repEmail || '',
        line1: body.Line1 || billingAddress.Line1 || '',
        line2: body.Line2 || billingAddress.Line2 || '',
        stateParish: body.StateParish || billingAddress.City || '',
        countryCode: body.CountryCode || billingAddress.CountryCode || 'JM',
        postalCode: body.PostalCode || billingAddress.PostalCode || '',
        phoneNumber: body.PhoneNumber || billingAddress.PhoneNumber || '',
        cardholderName: body.CardholderName || source.CardholderName || '',
    };
}

function formatCardExpiry(expiry) {
    if (!expiry || expiry.length !== 4) {
        return expiry || '';
    }

    return `${expiry.slice(2)}/${expiry.slice(0, 2)}`;
}

function getPaymentAmount(paymentInfo) {
    return parseFloat(paymentInfo.price);
}

async function getCountries() {
    const jsonFile = await readFile('./app_data/countries.json');
    return JSON.parse(jsonFile);
}

async function getCategories() {
    return Category.findAll({
        where: { active: true },
        order: [['name', 'ASC']],
        raw: true,
    });
}

async function renderCheckout(res, { paymentInfo, error = '', formData = {} }, statusCode = 200) {
    const countries = await getCountries();

    return res.status(statusCode).render('en/checkout', {
        title: 'Checkout',
        paymentInfo,
        error,
        countries,
        formData,
    });
}

async function renderIndexWithError(res, error, statusCode = 400) {
    const categories = await getCategories();

    return res.status(statusCode).render('en/index', {
        title: 'Welcome',
        categories,
        error,
    });
}

async function verifyRecaptchaToken(token, remoteIp) {
    const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;

    if (!recaptchaSecret) {
        console.warn('RECAPTCHA_SECRET_KEY is not configured. Skipping server-side reCAPTCHA verification.');
        return true;
    }

    if (!token) {
        return false;
    }

    try {
        const formData = new URLSearchParams({
            secret: recaptchaSecret,
            response: token,
        });

        if (remoteIp) {
            formData.append('remoteip', remoteIp);
        }

        const response = await axios.post('https://www.google.com/recaptcha/api/siteverify', formData.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 5000,
        });

        return Boolean(response.data?.success);
    } catch (error) {
        console.error('Unable to verify reCAPTCHA:', error.message);
        return false;
    }
}

function getRequestProtocol(req) {
    const protocolHeaders = [
        'x-forwarded-proto',
        'x-forwarded-protocol',
        'x-url-scheme',
        'x-original-proto',
    ];

    for (const headerName of protocolHeaders) {
        const headerValue = String(req.headers[headerName] || '').split(',')[0].trim().toLowerCase();
        if (headerValue === 'https' || headerValue === 'http') {
            return headerValue;
        }
    }

    if (String(req.headers['front-end-https'] || '').toLowerCase() === 'on') {
        return 'https';
    }

    if (req.headers['x-arr-ssl']) {
        return 'https';
    }

    if (req.connection?.encrypted || req.socket?.encrypted) {
        return 'https';
    }

    return req.secure ? 'https' : 'http';
}

function isLocalHost(hostname) {
    return ['localhost', '127.0.0.1', '::1'].includes(String(hostname || '').toLowerCase());
}

function getMerchantResponseUrl(req) {
    const basePath = req.app?.locals?.basePath || '';
    const confirmationPath = withBasePath('/en/confirmation', basePath);
    const publicBaseUrl = String(process.env.PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '');

    if (publicBaseUrl) {
        const parsedUrl = new URL(publicBaseUrl);
        parsedUrl.pathname = withBasePath(confirmationPath, parsedUrl.pathname === '/' ? '' : parsedUrl.pathname);
        return parsedUrl.toString();
    }

    const configuredUrl = String(config.responseUrl || '').trim();
    if (configuredUrl) {
        try {
            const parsedUrl = new URL(configuredUrl);
            const requestHost = String(req.headers['x-forwarded-host'] || req.get('host') || '').split(',')[0].trim();
            const requestProtocol = getRequestProtocol(req);

            if (requestHost && isLocalHost(parsedUrl.hostname)) {
                const forcedProtocol = isLocalHost(requestHost.split(':')[0]) ? requestProtocol : 'https';
                return `${forcedProtocol}://${requestHost}${confirmationPath}`;
            }

            parsedUrl.pathname = confirmationPath;
            parsedUrl.protocol = isLocalHost(parsedUrl.hostname) ? `${requestProtocol}:` : 'https:';
            return parsedUrl.toString();
        } catch (error) {
            // Fall back to rebuilding from the incoming request below.
        }
    }

    const requestHost = String(req.headers['x-forwarded-host'] || req.get('host') || '').split(',')[0].trim();
    if (!requestHost) {
        return confirmationPath;
    }

    const hostname = requestHost.split(':')[0];
    const protocol = isLocalHost(hostname) ? getRequestProtocol(req) : 'https';
    return `${protocol}://${requestHost}${confirmationPath}`;
}

const GATEWAY_COUNTRY_CODE_MAP = {
    AG: '028',
    AU: '036',
    BB: '052',
    BS: '044',
    CA: '124',
    DE: '276',
    DO: '214',
    FR: '250',
    GB: '826',
    GD: '308',
    IE: '372',
    JM: '388',
    KN: '659',
    KY: '136',
    LC: '662',
    TT: '780',
    US: '840',
    VC: '670',
};

function normalizeGatewayCountryCode(countryCode) {
    const value = String(countryCode || '').trim().toUpperCase();

    if (!value) {
        return '';
    }

    if (/^\d{3}$/.test(value)) {
        return value;
    }

    return GATEWAY_COUNTRY_CODE_MAP[value] || '';
}

function buildGatewayAuthData(paymentInfo, formData, merchantResponseUrl) {
    const cleanCardExpiration = String(formData.CardExpiration || '').replace(/\//g, '');
    const cardExpiration = `${cleanCardExpiration.slice(2)}${cleanCardExpiration.slice(0, 2)}`;
    const cardDigits = String(formData.CardPan || '').replace(/\s+/g, '');
    const cardholderName = String(formData.CardholderName || '').trim();
    const orderIdentifierSuffix = cardholderName.replace(/\s+/g, '');
    const gatewayCountryCode = normalizeGatewayCountryCode(formData.CountryCode);

    return {
        TransactionIdentifier: generateUUID(),
        TotalAmount: getPaymentAmount(paymentInfo),
        CurrencyCode: paymentInfo.currency === 'JMD' ? '388' : '840',
        ThreeDSecure: true,
        Source: {
            CardPan: cardDigits,
            CardCvv: String(formData.CardCvv || '').trim(),
            CardExpiration: cardExpiration,
            CardholderName: cardholderName,
        },
        OrderIdentifier: `${Util.generateInvoiceNumber()}_${orderIdentifierSuffix}`,
        BillingAddress: {
            FirstName: String(formData.FirstName || '').trim(),
            LastName: String(formData.LastName || '').trim(),
            Line1: String(formData.Line1 || '').trim(),
            Line2: String(formData.Line2 || '').trim(),
            City: String(formData.StateParish || '').trim(),
            PostalCode: String(formData.PostalCode || '').trim(),
            EmailAddress: String(formData.EmailAddress || '').toLowerCase().trim(),
            PhoneNumber: String(formData.PhoneNumber || '').trim(),
            ...(gatewayCountryCode ? { CountryCode: gatewayCountryCode } : {}),
        },
        AddressMatch: false,
        ExtendedData: {
            ThreeDSecure: {
                ChallengeWindowSize: 4,
                ChallengeIndicator: '01',
            },
            MerchantResponseUrl: merchantResponseUrl,
        },
    };
}

function sanitizeStoredAuthData(authData) {
    return {
        ...authData,
        Source: {
            ...authData.Source,
            CardPan: authData.Source.CardPan.slice(-4),
            CardCvv: undefined,
        },
    };
}

function serializeForStorage(value) {
    return JSON.stringify(value ?? null);
}

function parseStoredJson(value, fallback = null) {
    if (!value) {
        return fallback;
    }

    try {
        return JSON.parse(value);
    } catch (error) {
        console.error('Unable to parse stored payment data:', error.message);
        return fallback;
    }
}

function stripRedirectData(authResponse) {
    if (!authResponse || typeof authResponse !== 'object') {
        return null;
    }

    const { RedirectData, ...rest } = authResponse;
    return rest;
}

function loadPendingPaymentContext(pendingPayment) {
    return {
        paymentInfo: parseStoredJson(pendingPayment?.paymentInfoJson, null),
        authData: parseStoredJson(pendingPayment?.authDataJson, null),
        repEmail: pendingPayment?.repEmail || '',
    };
}

async function persistPendingPayment({ paymentInfo, authData, repEmail, authResponse }) {
    await PendingPayment.upsert({
        transactionIdentifier: authData.TransactionIdentifier,
        orderIdentifier: authData.OrderIdentifier,
        status: 'pending_auth',
        amount: getPaymentAmount(paymentInfo),
        currency: paymentInfo.currency,
        paymentInfoJson: serializeForStorage(paymentInfo),
        authDataJson: serializeForStorage(authData),
        repEmail: repEmail || null,
        gatewayResponseJson: serializeForStorage(stripRedirectData(authResponse)),
        callbackResponseJson: null,
        paymentResponseJson: null,
        captureResponseJson: null,
        lastError: null,
        completedAt: null,
    });
}

async function updatePendingPayment(pendingPayment, updates) {
    if (!pendingPayment) {
        return;
    }

    await pendingPayment.update({
        ...updates,
        updatedAt: new Date(),
    });
}

function buildStoredPaymentResult(pendingPayment) {
    const { paymentInfo, authData, repEmail } = loadPendingPaymentContext(pendingPayment);

    return {
        paymentInfo,
        authData,
        repEmail,
        paymentResponse: parseStoredJson(pendingPayment?.paymentResponseJson, null),
        captureResponse: parseStoredJson(pendingPayment?.captureResponseJson, null),
    };
}

async function renderStoredPendingOutcome(req, res, pendingPayment) {
    const { paymentInfo, authData, repEmail, paymentResponse } = buildStoredPaymentResult(pendingPayment);

    if (!paymentInfo || !authData || !paymentResponse) {
        return renderIndexWithError(res, 'We could not restore your previous payment result. Please try again.');
    }

    if (pendingPayment.status === 'captured') {
        const saleData = extractSaleData(paymentInfo, paymentResponse, authData.Source, authData.BillingAddress);
        await clearPaymentSession(req).catch(() => {});
        return res.render('en/confirmation', {
            title: 'Thank You',
            paymentResponse,
            repEmail,
            ...saleData,
        });
    }

    if (pendingPayment.status === 'capture_failed') {
        const saleData = extractSaleData(paymentInfo, paymentResponse, authData.Source, authData.BillingAddress);
        await clearPaymentSession(req).catch(() => {});
        return res.status(502).render('en/confirmation', {
            title: 'Payment Status',
            paymentResponse,
            repEmail,
            ...saleData,
        });
    }

    if (pendingPayment.status === 'declined') {
        await clearPaymentSession(req, { keepPaymentInfo: true }).catch(() => {});
        return renderCheckout(res, {
            paymentInfo,
            error: paymentResponse.ResponseMessage || firstErrorMessage(paymentResponse.Errors) || 'Payment was declined.',
            formData: buildCheckoutFormData({}, authData, repEmail),
        }, 400);
    }

    return null;
}

function parseGatewayResponse(req) {
    if (!req.body || typeof req.body.Response !== 'string') {
        throw new Error('Missing payment gateway response.');
    }

    let bodyData;

    try {
        bodyData = JSON.parse(req.body.Response);
    } catch (error) {
        throw new Error('Invalid payment gateway response payload.');
    }

    if (!bodyData.SpiToken || !bodyData.TransactionIdentifier) {
        throw new Error('Incomplete payment gateway response.');
    }

    return {
        bodyData,
        spiToken: bodyData.SpiToken,
    };
}

async function clearPaymentSession(req, { keepPaymentInfo = false } = {}) {
    if (!req.session) {
        return;
    }

    if (!keepPaymentInfo) {
        delete req.session.paymentInfo;
    }

    delete req.session.authData;
    delete req.session.repEmail;
    delete req.session.paymentResponse;

    await new Promise((resolve, reject) => {
        req.session.save((err) => {
            if (err) {
                return reject(err);
            }

            return resolve();
        });
    });
}

function extractSaleData(paymentInfo, paymentResponse, source, billingAddress) {
    const {
        Errors,
        ResponseMessage,
        Approved,
        CardBrand,
        TransactionIdentifier,
        AuthorizationCode,
        OrderIdentifier,
        TotalAmount,
        RRN,
    } = paymentResponse;

    let errorCodeMessage = '';
    if (!Approved && Errors && Errors.length > 0) {
        errorCodeMessage = ` | ${Errors[0].Code} : ${Errors[0].Message}`;
    }

    return {
        serviceName: `${paymentInfo.categoryName} : ${paymentInfo.serviceName}`,
        emailAddress: billingAddress.EmailAddress,
        cardOwner: source.CardholderName,
        cardType: CardBrand || 'Card',
        cardExpiry: formatCardExpiry(source.CardExpiration),
        lastFour: source.CardPan,
        transactionId: TransactionIdentifier || 'N/A',
        authCode: AuthorizationCode || 'N/A',
        orderId: OrderIdentifier || 'N/A',
        refNumber: RRN || 'N/A',
        currency: paymentInfo.currency,
        amount: parseFloat(TotalAmount || paymentInfo.price),
        paymentDate: new Date(),
        paymentStatus: `${ResponseMessage || 'Unknown status'}${errorCodeMessage}`,
        paymentNotes: paymentInfo.otherInfo,
        isApproved: Boolean(Approved),
        contactNumber: billingAddress.PhoneNumber || '',
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

async function createNewSale(paymentInfo, paymentResponse, authData) {
    try {
        const newSale = {
            categoryId: parseInt(paymentInfo.categoryId, 10),
            ...extractSaleData(paymentInfo, paymentResponse, authData.Source, authData.BillingAddress),
        };

        await Sale.create(newSale);
    } catch (error) {
        console.error('Unable to persist sale record:', error);
    }
}

function buildCaptureFailureResponse(paymentResponse, captureResponse) {
    return {
        ...paymentResponse,
        Approved: false,
        ResponseMessage: captureResponse?.ResponseMessage || 'Payment was authorized but capture failed.',
        Errors: captureResponse?.Errors || paymentResponse.Errors || [],
    };
}

exports.checkOut = (req, res) => {
    res.render('en/index');
};

exports.confirmationLanding = async (req, res) => {
    return renderIndexWithError(
        res,
        'Your payment confirmation link is incomplete. Please start the payment again from the checkout page.',
        400
    );
};

exports.authenticate = async (req, res) => {
    const paymentInfo = req.session.paymentInfo;

    if (!paymentInfo) {
        return renderIndexWithError(res, 'Your checkout session expired. Please select your service again.');
    }

    const formData = buildCheckoutFormData(req.body, null, req.body.RepEmailAddress);

    try {
        const validationError = validateCheckoutSubmission(req.body);
        if (validationError) {
            return renderCheckout(res, {
                paymentInfo,
                error: validationError,
                formData,
            }, 400);
        }

        const recaptchaValid = await verifyRecaptchaToken(req.body['g-recaptcha-response'], req.ip);
        if (!recaptchaValid) {
            return renderCheckout(res, {
                paymentInfo,
                error: 'Please complete the security check and try again.',
                formData,
            }, 400);
        }

        const selectedService = await Service.findOne({
            where: {
                serviceId: parseInt(paymentInfo.serviceId, 10),
                categoryId: parseInt(paymentInfo.categoryId, 10),
                active: true,
            },
        });

        if (!selectedService) {
            return renderIndexWithError(res, 'The selected service is no longer available. Please choose again.');
        }

        const authData = buildGatewayAuthData(paymentInfo, req.body, getMerchantResponseUrl(req));
        const authResponse = await Payment.initiateAuthentication(authData);

        if (!authResponse || !authResponse.RedirectData) {
            return renderCheckout(res, {
                paymentInfo,
                error: authResponse?.ResponseMessage || firstErrorMessage(authResponse?.Errors) || 'Unable to initialize the payment.',
                formData,
            }, 502);
        }

        if (Array.isArray(authResponse.Errors) && authResponse.Errors.length > 0) {
            return renderCheckout(res, {
                paymentInfo,
                error: firstErrorMessage(authResponse.Errors),
                formData,
            }, 400);
        }

        const storedAuthData = sanitizeStoredAuthData(authData);
        const repEmail = String(req.body.RepEmailAddress || '').trim();

        await persistPendingPayment({
            paymentInfo,
            authData: storedAuthData,
            repEmail,
            authResponse,
        });

        req.session.authData = storedAuthData;
        req.session.repEmail = repEmail;

        await new Promise((resolve, reject) => {
            req.session.save((err) => {
                if (err) {
                    return reject(err);
                }

                return resolve();
            });
        });

        return res.render('en/auth', { redirectData: authResponse.RedirectData });
    } catch (error) {
        console.error('Error during authentication:', error);
        return renderCheckout(res, {
            paymentInfo,
            error: error.message || 'There was a problem starting your payment.',
            formData,
        }, 500);
    }
};

exports.completePayment = async (req, res) => {
    let bodyData;
    let spiToken;
    let pendingPayment;
    let paymentInfo;
    let authData;
    let repEmail = '';

    try {
        ({ bodyData, spiToken } = parseGatewayResponse(req));
        pendingPayment = await PendingPayment.findOne({
            where: { transactionIdentifier: bodyData.TransactionIdentifier },
        });

        if (!pendingPayment) {
            return renderIndexWithError(res, 'We could not match this payment callback to an active checkout. Please try again.');
        }

        if (['captured', 'capture_failed', 'declined'].includes(pendingPayment.status)) {
            return renderStoredPendingOutcome(req, res, pendingPayment);
        }

        ({ paymentInfo, authData, repEmail } = loadPendingPaymentContext(pendingPayment));

        if (!authData || !paymentInfo) {
            await updatePendingPayment(pendingPayment, {
                lastError: 'Pending payment record is incomplete.',
            });
            return renderIndexWithError(res, 'Your payment session has expired. Please try again.');
        }

        if (bodyData.TransactionIdentifier !== authData.TransactionIdentifier) {
            throw new Error('Payment transaction verification failed.');
        }

        await updatePendingPayment(pendingPayment, {
            callbackResponseJson: serializeForStorage(bodyData),
            lastError: null,
        });

        const paymentResponse = await Payment.completePayment(spiToken);
        req.session.paymentResponse = paymentResponse;

        if (!paymentResponse) {
            throw new Error('The payment gateway did not return a payment result.');
        }

        if (paymentResponse.TransactionIdentifier && paymentResponse.TransactionIdentifier !== authData.TransactionIdentifier) {
            throw new Error('Payment gateway transaction mismatch detected.');
        }

        if (paymentResponse.Approved) {
            const captureResponse = await Payment.capturePayment({
                TransactionIdentifier: bodyData.TransactionIdentifier,
                TotalAmount: getPaymentAmount(paymentInfo),
            });

            if (!captureResponse || !captureResponse.Approved) {
                const failedResponse = buildCaptureFailureResponse(paymentResponse, captureResponse);
                const saleData = extractSaleData(paymentInfo, failedResponse, authData.Source, authData.BillingAddress);

                await createNewSale(paymentInfo, failedResponse, authData);
                await updatePendingPayment(pendingPayment, {
                    status: 'capture_failed',
                    paymentResponseJson: serializeForStorage(failedResponse),
                    captureResponseJson: serializeForStorage(captureResponse),
                    lastError: failedResponse.ResponseMessage || firstErrorMessage(failedResponse.Errors),
                    completedAt: new Date(),
                });
                await clearPaymentSession(req);

                return res.status(502).render('en/confirmation', {
                    title: 'Payment Status',
                    paymentResponse: failedResponse,
                    repEmail,
                    ...saleData,
                });
            }

            const saleData = extractSaleData(paymentInfo, paymentResponse, authData.Source, authData.BillingAddress);

            await createNewSale(paymentInfo, paymentResponse, authData);

            try {
                const subject = `Payment Confirmation (${paymentInfo.categoryName} / ${paymentInfo.serviceName}) - Jamaica Observer Limited`;
                const body = await Util.renderViewToString('./views/emails/confirmation.hbs', saleData);
                await Util.sendToMailQueue(authData.BillingAddress.EmailAddress, subject, body, repEmail);
            } catch (emailError) {
                console.error('Unable to queue confirmation email:', emailError);
            }

            await updatePendingPayment(pendingPayment, {
                status: 'captured',
                paymentResponseJson: serializeForStorage(paymentResponse),
                captureResponseJson: serializeForStorage(captureResponse),
                lastError: null,
                completedAt: new Date(),
            });
            await clearPaymentSession(req);

            return res.render('en/confirmation', {
                title: 'Thank You',
                paymentResponse,
                repEmail,
                ...saleData,
            });
        }

        await createNewSale(paymentInfo, paymentResponse, authData);
        await updatePendingPayment(pendingPayment, {
            status: 'declined',
            paymentResponseJson: serializeForStorage(paymentResponse),
            captureResponseJson: null,
            lastError: paymentResponse.ResponseMessage || firstErrorMessage(paymentResponse.Errors),
            completedAt: new Date(),
        });
        await clearPaymentSession(req, { keepPaymentInfo: true });

        return renderCheckout(res, {
            paymentInfo,
            error: paymentResponse.ResponseMessage || firstErrorMessage(paymentResponse.Errors) || 'Payment was declined.',
            formData: buildCheckoutFormData({}, authData, repEmail),
        }, 400);
    } catch (error) {
        console.error('Error during payment completion:', error);

        if (pendingPayment) {
            await updatePendingPayment(pendingPayment, {
                callbackResponseJson: bodyData ? serializeForStorage(bodyData) : pendingPayment.callbackResponseJson,
                lastError: error.message || 'There was an error processing your payment.',
            }).catch((pendingError) => {
                console.error('Unable to update pending payment record:', pendingError);
            });
        }

        await clearPaymentSession(req, { keepPaymentInfo: true }).catch((sessionError) => {
            console.error('Unable to clean payment session:', sessionError);
        });

        if (paymentInfo && authData) {
            return renderCheckout(res, {
                paymentInfo,
                error: 'There was an error processing your payment. Please try again.',
                formData: buildCheckoutFormData({}, authData, repEmail),
            }, 500);
        }

        return renderIndexWithError(res, 'There was an error processing payment or your session has timed out. Please try again.', 500);
    }
};
