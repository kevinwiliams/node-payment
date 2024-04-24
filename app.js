// app.js
const express = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const session = require('express-session');
const paymentController = require('./controllers/paymentController');
const { sql, connectDB } = require('./config/db');
const moment = require('moment'); // Import moment for date formatting

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

// Handlebars middleware
// Set up Handlebars engine
const hbs = exphbs.create({
    extname: '.hbs',
    defaultLayout: 'main'
});
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');

// Sample data for services
const services = [
    { service_id: 1, name: 'Service 1', price: 10.00 },
    { service_id: 2, name: 'Service 2', price: 20.00 },
    // Add more services as needed
  ];

  // Sample data for subcategories
const subcategories = {
    1: [
      { subcategory_id: '1A', name: 'Subcategory 1A', price: 5.00, service_id: 1 }, // Tie back to Service 1
      { subcategory_id: '1B', name: 'Subcategory 1B', price: 7.00, service_id: 1 }, // Tie back to Service 1
    ],
    2: [
      { subcategory_id: '2A', name: 'Subcategory 2A', price: 8.00, service_id: 2 }, // Tie back to Service 2
      { subcategory_id: '2B', name: 'Subcategory 2B', price: 10.00, service_id: 2 }, // Tie back to Service 2
    ],
    // No subcategories for service 3
  };
  // Route to handle GET requests to /api/services
  app.get('/api/services', (req, res) => {
    res.json(services);
  });

  // Route to handle GET requests to /api/services/:serviceId/subcategories
app.get('/api/services/:serviceId/subcategories', (req, res) => {
    const serviceId = parseInt(req.params.serviceId);
    if (serviceId in subcategories) {
      res.json(subcategories[serviceId]);
    } else {
      res.json([]); // Return an empty array if no subcategories found
    }
  });

// Routes
app.get('/', paymentController.checkOut);
app.post('/authenticate', paymentController.authenticate);
app.post('/paymentCompletion', paymentController.completePayment);



app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
