// app.js
const express = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const session = require('express-session');
const paymentController = require('./controllers/paymentController');
const { sql, connectDB } = require('./config/db');
const moment = require('moment'); // Import moment for date formatting
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Custom middleware to make session object available globally
app.use((req, res, next) => {
    // Attach session object to res.locals
    res.locals.session = req.session;
    next();
});
// Body parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Connect to database
connectDB();

// Session middleware
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

app.use(cookieParser());

// Handlebars middleware
// Set up Handlebars engine
const hbs = exphbs.create({
    extname: '.hbs',
    defaultLayout: 'main'
});
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');


// Routes
// app.get('/', paymentController.checkOut);
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
