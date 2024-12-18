// app.js
const express = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const session = require('express-session');
const paymentController = require('./controllers/paymentController');
const { sql, connectDB, store } = require('./config/db');
const moment = require('moment'); 
const cookieParser = require('cookie-parser');
const Handlebars = require('handlebars');

const app = express();

const PORT = process.env.PORT || 3000;

// Body parser middleware
app.use(bodyParser.urlencoded({
    extended: true 
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Connect to database
connectDB();

// Session middleware
app.use(session({
    store: store,
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
}));

app.use(cookieParser());

app.use((req, res, next) => {
    // Attach session object to res.locals
    res.locals.session = req.session;
    next();
});

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
        formatNumber: function(number){
            return Handlebars.helpers.formatNumber(number);
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
app.get('/', (req, res) => {
  res.redirect('/en');
});

// Import and use route handlers
const mainRoutes = require('./routes/en');
app.use('/en', mainRoutes);

const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

const userRoutes = require('./routes/user');
app.use('/admin/users', userRoutes);

const dashRoutes = require('./routes/dashboard');
app.use('/admin/dashboard', dashRoutes);

// Sync the model with the database
store.sync()
    .then(() => {
        console.log('Session table synchronized');
    })
    .catch(err => {
        console.error('Error synchronizing session table:', err);
    });

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
