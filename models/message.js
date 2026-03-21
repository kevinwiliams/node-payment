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
  }
  return MessageQueue;
};

module.exports = defineMessageQueue;
