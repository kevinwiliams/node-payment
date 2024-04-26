// models/service.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db').sequelize;
const Category = require('../models/category'); // Import Category model

const Service = sequelize.define('Service', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    currency: {
        type: DataTypes.STRING,
        allowNull: false
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
});

Service.belongsTo(
    Category, { foreignKey: 'category_id' }
);

module.exports = Service;
