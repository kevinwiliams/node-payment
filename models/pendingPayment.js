const { DataTypes } = require('sequelize');
const sequelize = require('../config/db').sequelize;

const PendingPayment = sequelize.define('PendingPayment', {
    pendingPaymentId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    transactionIdentifier: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    orderIdentifier: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pending_auth',
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    currency: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    paymentInfoJson: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    authDataJson: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    repEmail: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    gatewayResponseJson: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    callbackResponseJson: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    paymentResponseJson: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    captureResponseJson: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    lastError: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'pending_payments',
});

module.exports = PendingPayment;
