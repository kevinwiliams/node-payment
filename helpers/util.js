require('dotenv').config();
const fs = require('fs');
const handlebars = require('handlebars');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');
const axios = require('axios');
const requestIP = require('request-ip');
const defineMessageQueue = require('../models/message');
const { connectAdhocDB } = require('../config/db');
const config = require('../config/env');
const CryptoJS = require('crypto-js');


// const os = require('os');
const DeviceDetector = require('device-detector-js');

const pool = new Pool({
    connectionString: process.env.DB_CONNECTION_STRING
});

async function fileHelper(location, filename, fileContents) {
    try {
        if (!fs.existsSync(location)) {
            fs.mkdirSync(location, { recursive: true });
        }

        await fs.promises.writeFile(`${location}/${filename}`, fileContents);

        return true;
    } catch (error) {
        console.error('Error in fileHelper:', error);
        return false;
    }
}

async function logError(ex) {
    try {
        let errmsg = '';

        if (ex.InnerException) {
            errmsg += ex.InnerException.toString();

            if (ex.InnerException.InnerException) {
                errmsg += ex.InnerException.InnerException.toString();

                if (ex.InnerException.InnerException.Message) {
                    errmsg += ex.InnerException.InnerException.Message;
                }
            }
        }

        if (ex.Message) {
            errmsg += ex.Message;
        }

        const now = new Date();
        const dateStamp = now.toISOString().replace(/[-T:]/g, '').split('.')[0];
        const location = `./${process.env.ERROR_LOG_LOCATION || 'error_logs'}`;
        const filename = `qrs_app_log_${dateStamp}.txt`;
        const logMessage = `Error occurred at ${now.toTimeString()} on ${now.toDateString()}: ${ex.TargetSite.Name} in the method ${ex.stack}`;

        await fileHelper(location, filename, logMessage);

        // Log error to database
        const client = await pool.connect();
        const queryString = 'INSERT INTO error_log (error_message, error_date, error_time, error_name, stack_trace) VALUES ($1, $2, $3, $4, $5)';
        const values = [errmsg, now.toDateString(), now.toTimeString(), ex.TargetSite.Name, ex.stack];
        await client.query(queryString, values);
        client.release();

        return true;
    } catch (error) {
        console.error('Error in logError:', error);
        return false;
    }
}

async function logUserActivity(actLog) {
    try {
        // Log user activity to database
        const client = await pool.connect();
        const queryString = 'INSERT INTO user_activity_log (account_id, user_name, email_address, publication_date, return_amount, distribution_amount, status, ip_address, log_information, system_information, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)';
        const values = [actLog.AccountID, actLog.UserName, actLog.EmailAddress, actLog.PublicationDate, actLog.ReturnAmount, actLog.DistributionAmount, actLog.Status, actLog.IPAddress, actLog.LogInformation, `${actLog.BrowserName} / ${actLog.OSName}`, new Date()];
        await client.query(queryString, values);
        client.release();

        return true;
    } catch (error) {
        console.error('Error in logUserActivity:', error);
        return false;
    }
}

async function sendMail(emailTo, subject, body) {
    try {

        const transporter = nodemailer.createTransport({
            host: process.env.smtp_host,
            port: parseInt(process.env.email_port_number),
            secure: process.env.ssl_enabled === 'true',
            tls: {
                rejectUnauthorized: false
            },
            auth: {
                user: process.env.email_address_username,
                pass: process.env.email_password
            }
        });
        
        const mailOptions = {
            from: `"${process.env.email_address_from}" <${process.env.email_address}>`,
            to: emailTo,
            subject: subject,
            html: body
        };

        // Check if ccEmail is provided and not empty
        if (ccEmail && ccEmail.trim() !== '') {
            ccEmails = ccEmail.trim(); 
        }

        const bccMapping = {
            'Classifieds': process.env.bcc_advertise,
            'Display': process.env.bcc_display,
            'Other': process.env.bcc_other,
            'Recycled': process.env.bcc_papers,
            'Tickets': process.env.bcc_tickets
        };
        
        for (const [keyword, email] of Object.entries(bccMapping)) {
            if (subject.includes(keyword)) {
                bccEmails = email;
                break; // Optional: if you only want the first match
            }
        }

        await transporter.sendMail(mailOptions);

        return true;
    } catch (error) {
        console.error('Error in sendMail:', error);
        return false;
    }
}

async function sendToMailQueue(emailTo, subject, body, ccEmail){
    try {
        const toEmails = emailTo;
        let bccEmails = config.bcc_other;
        let ccEmails = '';
        const fromEmail = `"${process.env.email_address_from}" <${process.env.email_address}>`;
        const subjectTxt = encodeURIComponent(subject);
        const bodyTxt = encodeURIComponent(body);

        // Check if ccEmail is provided and not empty
        if (ccEmail && ccEmail.trim() !== '') {
            ccEmails = ccEmail.trim(); 
        }

        const bccMapping = {
            'Classifieds': config.bcc_advertise,
            'Display': config.bcc_display,
            'Other': config.bcc_other,
            'Library': config.bcc_library,
            'Recycled': config.bcc_papers,
            'Circulation': config.bcc_papers,
            'Tickets': config.bcc_tickets
        };
        
        for (const [keyword, email] of Object.entries(bccMapping)) {
            if (subject.includes(keyword)) {
                bccEmails = email;
                break; // Optional: if you only want the first match
            }
        }
        
        const message = `encoding=UTF-8&to=${toEmails}&bcc=${bccEmails}&cc=${ccEmails}&from=${fromEmail}&subject=${subjectTxt}&msgbody=${bodyTxt}`;
        // insert mail details in message queue table
        await insertIntoMessageQueue(message);
    } catch (err) {
        console.error(err);
    }

}

function isLocal() {
    try {
        const host = process.env.HOSTNAME || 'localhost';
        return ['localhost', '127.0.0.1', '::1'].includes(host);
    } catch (error) {
        console.error('Error in isLocal:', error);
        return false;
    }
}

async function postRequest(url, data) {
    try {
        // Convert data to URL-encoded form data
        const formData = new URLSearchParams();
        for (const [key, value] of Object.entries(data)) {
            formData.append(key, value);
        }
        // Send POST request with headers
        const response = await axios.post(url, formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        // console.log('response', response.data);
        return response;
    } catch (error) {
        console.error('Error making POST request:', error.response.data);
        throw error;
    }
}

// Function to check if IP is local
function isLocalIP(req) {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
        const ip = forwardedFor.split(',')[0];
        return (ip === '127.0.0.1' || ip === '::1');
    } else {
        return (req.connection.remoteAddress === '127.0.0.1' || req.connection.remoteAddress === '::1');
    }
}

function getBrowserName(req) {
    const userAgent = req.headers['user-agent'];
    let browser = req.headers['user-agent'];
    if (userAgent.includes('Edge')) {
        browser = 'Edge';
    }

    if (browser === 'InternetExplorer') {
        browser = browser.replace('E', ' E');
    }

    return browser;
}

function getOSName(userAgent) {
    try {
        const osRegex = /(windows nt|mac os x|linux) ([\d._]+)/i;
        const match = userAgent.match(osRegex);
        if (match && match.length === 3) {
            return `${match[1]} ${match[2]}`;
        } else {
            return 'Unknown';
        }
    } catch (error) {
        // Handle errors
        console.error('Error getting OS name:', error);
        throw error;
    }
}

function getIPAddress(req) {
    // console.log('req', req.connection.remoteAddress);
    
    const ipAddress = requestIP.getClientIp(req);
    // console.log('ipAddress', ipAddress);
    // If the IP address is a local IP, try to resolve the hostname
    // if (isLocalIP(ipAddress)) {
    //     try {
    //         const host = dns.reverse(ipAddress);
    //         ipAddress = host.address;
    //     } catch (error) {
    //         // Handle errors
    //         console.error('Error getting local IP:', error);
    //     }
    // }

    return ipAddress;
}

async function renderViewToString(template, data){

    const emailTemplateSource = fs.readFileSync(template, 'utf8');
    // Compile the template
    const emailTemplate = handlebars.compile(emailTemplateSource);

    const emailHtml = emailTemplate(data);

    return emailHtml;
}

// Function to insert data into the messagequeue table
const insertIntoMessageQueue = async (message) => {
    let adhoc;
    try {
      // Connect to adhoc database and get MessageQueue model
      adhoc = await connectAdhocDB();
      //await adhoc.authenticate();

      const MessageQueue = await defineMessageQueue();
      
      await MessageQueue.create({ mess: message });
      console.log('Data inserted successfully into messagequeue table.');
    } catch (error) {
      console.error('Error inserting data into messagequeue table:', error);
    } 
};

  // Function to generate a random alphanumeric string
function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Function to generate an invoice number
function generateInvoiceNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Zero-padding the month
    const day = String(date.getDate()).padStart(2, '0'); // Zero-padding the day
    const randomString = generateRandomString(6); // Generating a random alphanumeric string
    const invoiceNumber = `${year}${month}${day}-${randomString}`;
    return invoiceNumber;
}

// Encrypt Data
function encryptData(data, secretKey) {
    const jsonData = JSON.stringify(data);
    const encryptedData = CryptoJS.AES.encrypt(jsonData, secretKey).toString();
    return encryptedData;
}

// Decrypt Data
function decryptData(encryptedData, secretKey) {
    const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedData);
}


module.exports = {
    fileHelper,
    logError,
    logUserActivity,
    sendMail,
    isLocal,
    postRequest,
    isLocalIP,
    getBrowserName,
    getOSName,
    getIPAddress,
    renderViewToString,
    sendToMailQueue,
    generateInvoiceNumber,
    encryptData,
    decryptData
};
