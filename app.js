require('dotenv').config();

const express = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const Handlebars = require('handlebars');
const moment = require('moment');

const { connectDB, store } = require('./config/db');
const { normalizeBasePath, withBasePath } = require('./helpers/basePath');
const { attachCsrfToken, verifyCsrfToken } = require('./middleware/csrf');
const PendingPayment = require('./models/pendingPayment');

const app = express();
const basePath = normalizeBasePath(process.env.APP_BASE_PATH);
const sessionSecret = process.env.SESSION_SECRET || process.env.SECRET_KEY;
const sessionCookieName = process.env.SESSION_COOKIE_NAME || (basePath ? `${basePath.replace(/\//g, '')}.sid` : 'gateway.sid');
const sessionCookiePath = process.env.SESSION_COOKIE_PATH || (basePath || '/');
const cookieSecure = process.env.SESSION_COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production';
const cookieSameSite = process.env.SESSION_COOKIE_SAME_SITE
    ? (process.env.SESSION_COOKIE_SAME_SITE === 'false' ? false : process.env.SESSION_COOKIE_SAME_SITE)
    : false;
const cookieMaxAge = parseInt(process.env.SESSION_COOKIE_MAX_AGE || `${24 * 60 * 60 * 1000}`, 10);

function resolveListenTarget() {
    const candidates = [
        process.env.PORT,
        process.env.IISNODE_PORT,
        process.env.WEBSITES_PORT,
        '3000',
    ];

    for (const candidate of candidates) {
        if (candidate === undefined || candidate === null || candidate === '') {
            continue;
        }

        const value = String(candidate).trim();

        if (/^\d+$/.test(value)) {
            const port = Number(value);

            if (port >= 0 && port < 65536) {
                return port;
            }

            continue;
        }

        // IIS/iisnode can provide a named pipe instead of a numeric TCP port.
        return value;
    }

    return 3000;
}

const listenTarget = resolveListenTarget();

if (!sessionSecret) {
    throw new Error('SESSION_SECRET or SECRET_KEY must be configured.');
}

app.locals.basePath = basePath;
app.disable('x-powered-by'); 
app.set('trust proxy', 1);

app.use((req, res, next) => {
    const forwardedProto = req.get('x-forwarded-proto');
    const arrSsl = req.get('x-arr-ssl');
    const frontEndHttps = String(req.get('front-end-https') || '').toLowerCase();

    if (!forwardedProto && (arrSsl || frontEndHttps === 'on' || frontEndHttps === '1' || frontEndHttps === 'https')) {
        req.headers['x-forwarded-proto'] = 'https';
    }

    next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));
if (basePath) {
    app.use(basePath, express.static('public'));
}

app.use((req, res, next) => {
    res.locals.basePath = basePath;
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    if (cookieSecure) {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    next();
});

app.use(session({
    name: sessionCookieName,
    store,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        path: sessionCookiePath,
        secure: cookieSecure,
        httpOnly: true,
        sameSite: cookieSameSite,
        maxAge: cookieMaxAge,
    },
}));

app.use((req, res, next) => {
    res.locals.session = req.session;
    res.locals.recaptchaSiteKey = process.env.RECAPTCHA_SITE_KEY || '';
    next();
});

app.use(attachCsrfToken);
app.use(verifyCsrfToken);

const reduceOp = function(args, reducer){
    args = Array.from(args);
    args.pop(); // => options
    var first = args.shift();
    return args.reduce(reducer, first);
  };

// Helper function to format numbers with commas and decimal places
Handlebars.registerHelper({
    eq  : function(){ return reduceOp(arguments, (a,b) => a === b); },
    ne  : function(){ return reduceOp(arguments, (a,b) => a !== b); },
    lt  : function(){ return reduceOp(arguments, (a,b) => a  <  b); },
    gt  : function(){ return reduceOp(arguments, (a,b) => a  >  b); },
    lte : function(){ return reduceOp(arguments, (a,b) => a  <= b); },
    gte : function(){ return reduceOp(arguments, (a,b) => a  >= b); },
    and : function(){ return reduceOp(arguments, (a,b) => a  && b); },
    or  : function(){ return reduceOp(arguments, (a,b) => a  || b); },
    concat: function(){
        const args = Array.from(arguments);
        args.pop();
        return args.join('');
    },
    formatNumber : function(number){
         // Check if the input is a valid number
        if (isNaN(number)) {
            return number; // Return the original value if it's not a number
        }

        const formattedNumber = parseFloat(number).toFixed(2);
        // Split the number into parts before and after the decimal point
        const parts = formattedNumber.split('.');
        // Add commas to the integer part
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        // Join the parts and return the formatted number
        return parts.join('.');;
    },
    formatTimeDate: function(date) {
        return moment(date).format('DD-MMM-YYYY h:mm A');
    },
});

// Handlebars middleware
// Set up Handlebars engine
const hbs = exphbs.create({
    extname: '.hbs',
    defaultLayout: 'main',
    helpers: {
        formatListDate: function(date) {
            return moment(date).add(1, 'days').format('DD-MMM-YYYY');
        },
        formatHistDate: function(date) {
            return moment(date).add(1, 'days').format('DD-MM-YYYY');
        },
        formatPubDate: function(date) {
            return moment(date).add(1, 'days').format('DD/MM/YYYY');
        },
        formatDBDate: function(date) {
            return moment(date).add(1, 'days').format('YYYY-MM-DD');
        },
        formatTimeDate: function(date) {
            return moment(date).format('DD-MMM-YYYY h:mm A');
        },
        eq: function(arg1, arg2, options) {
            return Handlebars.helpers.eq(arg1, arg2, options);
        },
        ne: function(arg1, arg2, options) {
            return Handlebars.helpers.ne(arg1, arg2, options);
        },
        and: function(arg1, arg2, options) {
            return Handlebars.helpers.and(arg1, arg2, options);
        },
        or: function(arg1, arg2, options) {
            return Handlebars.helpers.or(arg1, arg2, options);
        },
        concat: function() {
            const args = Array.from(arguments);
            args.pop();
            return args.join('');
        },
        formatNumber: function(number){
            return Handlebars.helpers.formatNumber(number);
        },
        withBasePath: function(path) {
            return withBasePath(path, basePath);
        },
        isAuthenticated : function(){
            const session = this.session; // Assuming session is available in res.locals
            if(session)
                return session.isAuthenticated;
        }
    }
});

app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');


// Routes
function redirectToPublicHome(req, res) {
    return res.redirect(withBasePath('/en', basePath));
}

app.get('/', redirectToPublicHome);
if (basePath) {
    app.get(basePath, redirectToPublicHome);
    app.get(`${basePath}/`, redirectToPublicHome);
}

// Import and use route handlers
const mainRoutes = require('./routes/en');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const dashRoutes = require('./routes/dashboard');

function mountRoute(path, router) {
    app.use(path, router);

    if (basePath) {
        app.use(withBasePath(path, basePath), router);
    }
}

mountRoute('/en', mainRoutes);
mountRoute('/auth', authRoutes);
mountRoute('/admin/users', userRoutes);
mountRoute('/admin/dashboard', dashRoutes);

async function startServer() {
    await connectDB();
    await store.sync();
    await PendingPayment.sync();

    app.listen(listenTarget, () => {
        const location = typeof listenTarget === 'string'
            ? `pipe ${listenTarget}`
            : `port ${listenTarget}`;

        console.log(`Server running on ${location}`);
    });
}

startServer().catch((error) => {
    console.error('Failed to start application:', error);
    process.exit(1);
});
