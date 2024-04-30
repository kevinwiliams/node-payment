// models/subscriber.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db').sequelize;

const Subscriber = sequelize.define('Subscriber', {
    subscriber_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    first_name: {
        type: DataTypes.STRING(128),
        allowNull: true
    },
    last_name: {
        type: DataTypes.STRING(128),
        allowNull: true
    },
    email_address: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    address_line1: {
        type: DataTypes.STRING(250),
        allowNull: true
    },
    address_line2: {
        type: DataTypes.STRING(250),
        allowNull: true
    },
    city_town: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    country: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    start_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    end_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    new_user: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
    sub_type: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false
    },
    newsletter: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
    plan_desc: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    order_number: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'subscribers', // Specify the table name
    timestamps: false // Disable timestamps (createdAt, updatedAt)
});

// Sync the model with the database
sequelize.sync()
    .then(() => {
        console.log('Database synchronized');
    })
    .catch(err => {
        console.error('Error synchronizing database:', err);
    });
    
module.exports = Subscriber;
