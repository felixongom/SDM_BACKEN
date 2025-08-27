function School (sequelize, Sequelize) {
  const school = sequelize.define("school", {
    school: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    box_no: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    email: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    phone: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    district: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    location: {
      type: Sequelize.STRING(400),
      allowNull: false,
    },
    motto: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    sdm_password: {
      type: Sequelize.STRING(8),
      allowNull: false,
    },
  });
  return school;
};

module.exports = School
