// models/sale.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db').sequelize;
const Service = require('../models/service'); // Import Service model
const Category = require('../models/category');

const Sale = sequelize.define('Sale', {
    saleId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    categoryId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    serviceName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    emailAddress: {
        type: DataTypes.STRING,
        allowNull: false
    },
    cardOwner: {
        type: DataTypes.STRING,
        allowNull: false
    },
    cardType: {
        type: DataTypes.STRING,
        allowNull: false
    },
    cardExpiry: {
        type: DataTypes.STRING,
        allowNull: false
    },
    lastFour: {
        type: DataTypes.STRING,
        allowNull: false
    },
    transactionId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    authCode: {
        type: DataTypes.STRING,
        allowNull: false
    },
    orderId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    refNumber: {
        type: DataTypes.STRING,
        allowNull: false
    },
    currency: {
        type: DataTypes.STRING,
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    paymentDate: {
        type: DataTypes.DATE,
        allowNull: false
    },
    paymentStatus: {
        type: DataTypes.STRING,
        allowNull: false
    },
    paymentNotes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    isApproved: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
    contactNumber: {
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
}, {
    tableName: 'sales', // Specify the table name
    timestamps: false // Disable timestamps (payment_date)
});

Sale.belongsTo(
    Category, { foreignKey: 'categoryId' }
);

// Sync the model with the database
sequelize.sync()
    .then(() => {
        console.log('Database synchronized');
    })
    .catch(err => {
        console.error('Error synchronizing database:', err);
    });
    
module.exports = Sale;
