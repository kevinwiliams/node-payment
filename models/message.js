const { DataTypes } = require('sequelize');
const sequelize = require('../config/db').adhoc; //point to Adhoc connection

const MessageQueue = sequelize.define('MessageQueue', {
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
    timestamps: false
  });

  // Sync the model with the database
sequelize.sync()
.then(() => {
    console.log('Database synchronized');
})
.catch(err => {
    console.error('Error synchronizing database:', err);
});


module.exports = MessageQueue;