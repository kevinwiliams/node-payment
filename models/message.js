const { DataTypes } = require('sequelize');
const { connectAdhocDB } = require('../config/db');

let MessageQueue;

const defineMessageQueue = async () => {
  const adhoc = await connectAdhocDB();
  if (!MessageQueue) {
    MessageQueue = adhoc.define('MessageQueue', {
      recid: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      mess: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    }, {
      tableName: 'messagequeue',
      timestamps: false,
    });

    // Sync the model with the database
    await MessageQueue.sync()
      .then(() => {
        console.log('Database synchronized');
      })
      .catch(err => {
        console.error('Error synchronizing database:', err);
      });
  }
  return MessageQueue;
};

module.exports = defineMessageQueue;