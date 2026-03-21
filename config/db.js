require('dotenv').config();

const { Sequelize } = require('sequelize');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);

let adhocDB;

function toBoolean(value, defaultValue) {
    if (value === undefined) {
        return defaultValue;
    }

    return value === 'true';
}

function getRequired(name) {
    const value = process.env[name];

    if (!value) {
        throw new Error(`${name} must be configured in the environment.`);
    }

    return value;
}

function buildDatabaseConfig(databaseName) {
    return {
        host: getRequired('DB_HOST'),
        dialect: 'mssql',
        logging: false,
        dialectOptions: {
            options: {
                trustServerCertificate: toBoolean(process.env.DB_TRUST_SERVER_CERTIFICATE, true),
                encrypt: toBoolean(process.env.DB_ENCRYPT, false),
            },
        },
    };
}

const sequelize = new Sequelize(
    getRequired('DB_NAME'),
    getRequired('DB_USER'),
    getRequired('DB_PASSWORD'),
    buildDatabaseConfig(process.env.DB_NAME)
);

const store = new SequelizeStore({
    db: sequelize,
    tableName: 'sessions',
});

const connectDB = async () => {
    await sequelize.authenticate();
    console.log('Connected to MSSQL database');
};

const connectAdhocDB = async () => {
    if (!adhocDB) {
        adhocDB = new Sequelize(
            getRequired('ADHOC_DB_NAME'),
            getRequired('DB_USER'),
            getRequired('DB_PASSWORD'),
            buildDatabaseConfig(process.env.ADHOC_DB_NAME)
        );

        await adhocDB.authenticate();
        console.log('Adhoc database connection has been established successfully.');
    }

    return adhocDB;
};

module.exports = {
    sequelize,
    connectDB,
    connectAdhocDB,
    store,
};
