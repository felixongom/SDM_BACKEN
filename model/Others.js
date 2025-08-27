function Stream (sequelize, Sequelize) {
  const stream = sequelize.define("stream", {
    stream: {
      type: Sequelize.STRING(50),
      allowNull: false,
    }
  },{ timestamps: false });
  return stream;
};

// 
function Subject (sequelize, Sequelize) {
  const subject = sequelize.define("subject", {
    short_name: {
      type: Sequelize.STRING(3),
      allowNull: false,
    }
  },{ timestamps: false });
  return subject;
};

// 
// 
function Grade (sequelize, Sequelize) {
  const grade = sequelize.define("grade", {
    from: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    to: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    grade: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    grade_letter: {
      type: Sequelize.STRING(1),
      allowNull: false,
    },
    put_position: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
    }
  },{ timestamps: false });
  return grade;
};

// 

module.exports = { Stream, Subject, Grade }
