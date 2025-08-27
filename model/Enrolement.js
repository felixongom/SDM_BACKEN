function Enrolement (sequelize, Sequelize) {
  const enrolement = sequelize.define("enrolement", {
    learner_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    paper_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    year: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    term: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    clas: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    exam: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    mark: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    is_verified: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
    },
  },{ timestamps: false });
  return enrolement;
};

module.exports = Enrolement
