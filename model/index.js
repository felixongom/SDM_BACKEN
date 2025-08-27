const { Sequelize } = require("sequelize");
const dbConfig = require("../config/db.config");
const Student = require('./Student')
const Enrolement = require('./Enrolement')
const School = require('./School')
const { Stream, Subject, Grade } = require('./Others')

const sequelize = new Sequelize({
  dialect: dbConfig.dialect,
  storage: dbConfig.storage,
  logging: false, // disable logs (optional)
});

// Test connection
sequelize.authenticate()
  .then(() => console.log("✅ SQLite database connected"))
  .catch(err => console.error("Error: " + err));

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.student = Student(sequelize, Sequelize);
db.school = School(sequelize, Sequelize);
db.enrolement = Enrolement(sequelize, Sequelize);
db.stream = Stream(sequelize, Sequelize);
db.subject = Subject(sequelize, Sequelize);
db.grade = Grade(sequelize, Sequelize);
// 

module.exports = db;
