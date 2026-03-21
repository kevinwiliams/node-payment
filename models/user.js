const { DataTypes, Sequelize } = require('sequelize');
const sequelize = require('../config/db').sequelize;
// Override timezone formatting for MSSQL
Sequelize.DATE.prototype._stringify = function _stringify(date, options) {
    return this._applyTimezone(date, options).format('YYYY-MM-DD HH:mm:ss.SSS');
  };

const User = sequelize.define('User', {
    userId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING(50)
    },
    email: {
        type: DataTypes.STRING(100)
    },
    passwordHash: {
        type: DataTypes.STRING(255)
    },
    registrationDate: {
        type: DataTypes.DATE,
        allowNull: false
    },
    securityStamp: {
        type: DataTypes.STRING(128)
    },
    otherInfo: {
        type: DataTypes.TEXT
    }
}, {
    tableName: 'users', // Specify the table name
    timestamps: false 
});

// Export the User model
module.exports = User;
