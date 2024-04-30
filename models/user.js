const { DataTypes, Sequelize } = require('sequelize');
const sequelize = require('../config/db').sequelize;
// Override timezone formatting for MSSQL
Sequelize.DATE.prototype._stringify = function _stringify(date, options) {
    return this._applyTimezone(date, options).format('YYYY-MM-DD HH:mm:ss.SSS');
  };

const User = sequelize.define('User', {
    user_id: {
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
    password_hash: {
        type: DataTypes.STRING(255)
    },
    registration_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    security_stamp: {
        type: DataTypes.STRING(128)
    },
    other_info: {
        type: DataTypes.TEXT
    }
}, {
    tableName: 'users', // Specify the table name
    timestamps: false 
});

// Sync the model with the database
sequelize.sync()
    .then(() => {
        console.log('Database synchronized');
    })
    .catch(err => {
        console.error('Error synchronizing database:', err);
    });

// Export the User model
module.exports = User;