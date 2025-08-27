function Student (sequelize, Sequelize) {
  const student = sequelize.define("student", {
    learner: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    year_of_entry: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    gender: {
      type: Sequelize.STRING(8),
      allowNull: false,
    },
    stream_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    school_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    pay_code: {
      type: Sequelize.STRING(25),
      allowNull: true,
    },
    is_active: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
    },
  });
  return student;
};

module.exports = Student
