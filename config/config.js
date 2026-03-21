require('dotenv').config();

function toBoolean(value, defaultValue) {
  if (value === undefined) {
    return defaultValue;
  }

  return value === 'true';
}

const baseConfig = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 1433),
  dialect: 'mssql',
  dialectOptions: {
    options: {
      encrypt: toBoolean(process.env.DB_ENCRYPT, false),
      trustServerCertificate: toBoolean(process.env.DB_TRUST_SERVER_CERTIFICATE, true),
    },
  },
};

module.exports = {
  development: baseConfig,
  dev: baseConfig,
  test: baseConfig,
  production: baseConfig,
};
