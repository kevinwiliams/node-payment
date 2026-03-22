// models/service.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db').sequelize;
const Category = require('../models/category'); // Import Category model

const Service = sequelize.define('Service', {
    serviceId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    categoryId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
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
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    epaperDays: {
        type: DataTypes.INTEGER
    },
    useSubscriptionRates: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    subscriptionRateType: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    image: {
        type: DataTypes.STRING,
        allowNull: true
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
    }
},{
    tableName: 'services'
});

Service.belongsTo(
    Category, { foreignKey: 'categoryId' }
);

module.exports = Service;
