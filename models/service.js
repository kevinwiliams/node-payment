// models/service.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db').sequelize;

const Service = sequelize.define('Service', {
    name: {
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

module.exports = Service;
