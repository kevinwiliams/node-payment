'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('pending_payments', {
      pendingPaymentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      transactionIdentifier: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      orderIdentifier: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'pending_auth',
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      paymentInfoJson: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      authDataJson: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      repEmail: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      gatewayResponseJson: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      callbackResponseJson: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      paymentResponseJson: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      captureResponseJson: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      lastError: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
  },

  async down (queryInterface) {
    await queryInterface.dropTable('pending_payments');
  }
};
