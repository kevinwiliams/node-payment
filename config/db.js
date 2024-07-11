const { Sequelize } = require('sequelize');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);

let adhocDB;

const sequelize = new Sequelize('[db]', '[user]', '[password]', {
  host: 'localhost',
  dialect: 'mssql',
  dialectOptions: {
    options: {
      trustServerCertificate: true,
      encrypt: false, // If you are connecting to Azure SQL Database, set this to true
    },
  },
});

// Define the session store
const store = new SequelizeStore({
  db: sequelize,
  tableName: 'sessions', // Specify table name for storing sessions
  checkExpirationInterval: 15 * 60 * 1000, // How often to check for expired sessions (15 min)
  expiration: 24 * 60 * 60 * 1000 // How long sessions should be kept (24 hours)
});

// Sync the model with the database
store.sync()
    .then(() => {
        console.log('Session table synchronized');
    })
    .catch(err => {
        console.error('Error synchronizing session table:', err);
    });

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to MSSQL database');
  } catch (error) {
    console.error('Error connecting to database:', error.message);
  }
}

const connectAdhocDB = async () => {
  if (!adhocDB) {
    adhocDB = new Sequelize('[db]', '[user]', '[password]', {
      host: 'localhost',
      dialect: 'mssql',
      dialectOptions: {
        options: {
          trustServerCertificate: true,
          encrypt: false,
        },
      },
    });

    try {
      await adhocDB.authenticate();
      console.log('Adhoc database connection has been established successfully.');
    } catch (error) {
      console.error('Unable to connect to the adhoc database:', error);
      throw error;
    }
  }
  return adhocDB;
};

module.exports = { 
  sequelize, 
  connectDB, 
  connectAdhocDB, 
  store, adhocDB
};
