// models/sale.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db').sequelize;
const Service = require('../models/service'); // Import Service model

const Sale = sequelize.define('Sale', {
    sale_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    category_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    service_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email_address: {
        type: DataTypes.STRING,
        allowNull: false
    },
    card_owner: {
        type: DataTypes.STRING,
        allowNull: false
    },
    card_type: {
        type: DataTypes.STRING,
        allowNull: false
    },
    card_expiry: {
        type: DataTypes.STRING,
        allowNull: false
    },
    last_four: {
        type: DataTypes.STRING,
        allowNull: false
    },
    transaction_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    auth_code: {
        type: DataTypes.STRING,
        allowNull: false
    },
    order_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    ref_number: {
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
    payment_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    payment_status: {
        type: DataTypes.STRING,
        allowNull: false
    },
    payment_notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    is_approved: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    }
}, {
    tableName: 'sales', // Specify the table name
    timestamps: false // Disable timestamps (payment_date)
});

Sale.belongsTo(
    Service, { foreignKey: 'service_id' }
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
