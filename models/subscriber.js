// models/subscriber.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db').sequelize;

const Subscriber = sequelize.define('Subscriber', {
    subscriberId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    firstName: {
        type: DataTypes.STRING(128),
        allowNull: true
    },
    lastName: {
        type: DataTypes.STRING(128),
        allowNull: true
    },
    emailAddress: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    addressLine1: {
        type: DataTypes.STRING(250),
        allowNull: true
    },
    addressLine2: {
        type: DataTypes.STRING(250),
        allowNull: true
    },
    cityTown: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    country: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    startDate: {
        type: DataTypes.DATE,
        allowNull: false
    },
    endDate: {
        type: DataTypes.DATE,
        allowNull: false
    },
    newUser: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
    subType: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
    },
    newsletter: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
    planDesc: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    orderNumber: {
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
