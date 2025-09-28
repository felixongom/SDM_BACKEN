const _ = require("lodash");
const db = require("../model");
const { randomize } = require("@felix-ongom/randomize");
const {convertSchoolInfoToObject, extractSubjects } = require("./");
const { exam_short_name, swapObjectKeysAndValues, grade, points, comination, subsidiary_grade } = require("./constant");
const { getGrade, getLetter, getTotalPoints, mapSubjectById, assignALevelPositions, calcSubjectScoresFromEnrolement } = require("./grade");
// 
async function enroleStudents(data, CLASS) {
  let CLAS = parseInt(+CLASS.split(" ").pop());

  // add school infor if does not exist
  const school_info = convertSchoolInfoToObject(data["SCHOOL INFO"]);
  const School = db.school;

  let check_obj = {
    school: school_info["SCHOOL NAME"],
    motto: school_info["MOTTO"],
    district: school_info["DISTRICT/CITY"],
    box_no: school_info["BOX NO"],
    email: school_info.EMAIL,
  };

  const [_school, __] = await School.findOrCreate({
    where: check_obj,
    defaults: {
      ...check_obj,
      location: school_info["LOCATION"],
      phone: school_info["PHONE"],
      sdm_password: randomize(),
    },
  });

  let students = data[CLASS];
  students = _.filter(
    students,
    (student) =>
      student["STUDENT NAME"] &&
      student["STREAM"] &&
      student["GENDER"] &&
      student["NUM PAPER"] >= 5
  );
  //

  for (const student of students) {
    await enroleStudent(student, _school.id, school_info, CLAS);
  }
}

//
async function enroleStudent(student, school_id, school_info, CLAS) {
  const Student = db.student;
  const Stream = db.stream;
  const Enrolement = db.enrolement;
  const Subject = db.subject;

  try {
    await db.sequelize.transaction(async (t) => {
      // add stream
      const [_stream, _] = await Stream.findOrCreate({
        where: { stream: student["STREAM"] },
        defaults: { stream: student["STREAM"] },
        transaction: t,
      });

      // add students to the database if not exist
      let check_stud = {
        school_id,
        learner: student["STUDENT NAME"],
        year_of_entry: school_info["YEAR OF ENTRY"],
        gender: student["GENDER"],
      };
      // CREATE STUDENT
      let [_student, __] = await Student.findOrCreate({
        where: check_stud,
        defaults: {
          ...check_stud,
          stream_id: _stream.id,
          pay_code: student["PAY CODE"] || null,
          is_active: true,
        },
        transaction: t,
      });
      // save the data to enrolment table
      let subjects = Object.keys(extractSubjects(student));
      let one_person_enrolement = [];
      //
      for (const subj of subjects) {
        const [_subject] = await Subject.findOrCreate({
          where: { short_name: subj },
          transaction: t,
        });

        let one_enrolement = {
          learner_id: _student.id,
          paper_id: _subject.id,
          year: school_info["YEAR"],
          term: school_info["TERM"],
          exam: exam_short_name[school_info["EXAM"]],
        };

        const [createdEnrolement, created] = await Enrolement.findOrCreate({
          where: one_enrolement,
          defaults: {
            ...one_enrolement,
            clas: CLAS,
            mark: null,
            is_verified: true,
          },
          transaction: t,
        });
      }
      // create bulk enrolement perperson
      return one_person_enrolement;
    });
  } catch (error) {
    console.log("Error enrolling student:", error);
  }
}

async function mergeEnrolmentsToStudent(learners, boidata) {
  boidata.exam = exam_short_name[boidata.exam];  
  const Enrolement = db.enrolement;
  const Subject = db.subject;
  // 
   
  let subjects = await Subject.findAll({raw:true})      
  subjects = mapSubjectById(subjects)    

  try {
    let all_learners = [];
    // Option 1: Loop with for..of

    for (let learner of learners) {
      const enrolement = await Enrolement.findAll({
        where: {
          learner_id: learner.id,
          year: parseInt(boidata.year),
          term: parseInt(boidata.term),
          clas: parseInt(boidata.clas),
          exam:parseInt(boidata.exam),
        }, // or stream_id, school_id, etc depending on your logic
        attributes: ["exam", "mark", "paper_id"],
        raw: true,
      });
      //
      
      learner.enrolement = enrolement.map(enrol=>{          
        learner.GP_mark = enrol.mark
        
        return {
          ...enrol,
          exam:swapObjectKeysAndValues(exam_short_name)[enrol.exam],
          paper:subjects[enrol.paper_id],
          grade:getGrade(grade, enrol.mark)
        }
      });
      //  
      learner.combination = getSubjectCombination(learner.enrolement)
      learner.num_subjects = countSubjects(learner.enrolement)
      learner.num_papers = learner.enrolement.length
      learner.reordered = reorderSubject(learner.enrolement)
      learner.grade_per_subject = groupGradesBySubject(learner.enrolement, getLetter)
      // console.log(learner);
     learner.total_points = getTotalPoints(learner.grade_per_subject)
     learner.string_grade_per_subject = groupGradesBySubjectAsStudent(learner.enrolement)
     
     all_learners = [...all_learners, learner];
    }
    return assignALevelPositions(all_learners);
  } catch (error) {
    console.error("Error fetching enrolments:", error);
  }
}



// Generate combination
function getSubjectCombination(papers) {
  // collect unique initials from non-excluded subjects
  let initials = _.chain(papers)
    .map(p => p.paper.split(" ")[0]) // take subject code (before space)
    .uniq()
    .filter(subj => !["GP", "SM", "ICT"].includes(subj)) // exclude GP/SM/ICT for now
    .map(subj => subj[0]) // first letter
    .join("").sort().join('') // e.g. EMP
    .value()

    initials = comination[initials] || initials

  // check if SM or ICT exists in papers
  const hasSM = papers.some(p => p.paper.startsWith("SM"));
  const hasICT = papers.some(p => p.paper.startsWith("ICT"));

  let suffix = "";
  if (hasSM) {
    suffix = "/SM/GP";
  } else if (hasICT) {
    suffix = "/ICT/GP";
  } else {
    suffix = "/GP"; // fallback, in case neither SM nor ICT present
  }

  return initials + suffix;
}
//
function countSubjects(papers) {
  return _.chain(papers)
    .map(p => p.paper.split(" ")[0]) // extract subject name (before space)
    .uniq()                          // remove duplicates
    .size()                          // count unique subjects
    .value();
}

//subject reorder
function reorderSubject(papers) {
  // Group by prefix (first word in paper name)
  const grouped = _.groupBy(papers, (p) => p.paper.split(" ")[0]);

  // Convert to array of arrays
  const groups = _.values(grouped);

  // Sort with custom rule
  const gp = [];
  const special = []; // ICT + SM
  const normal = [];

  groups.forEach(group => {
    const prefix = group[0].paper.split(" ")[0];
    if (prefix === "GP") {
      gp.push(group);
    } else if (["ICT", "SM"].includes(prefix)) {
      special.push(group);
    } else {
      normal.push(group);
    }
  });

  return [...normal, ...special, ...gp];
}

// group grades per subject
function groupGradesBySubject(papers, getLetter) {
  
  const grouped = _.groupBy(papers, (p) => p.paper.split(" ")[0]); // e.g. ENT, MTC, PHY
 
  return _.mapValues(grouped, (group, subject) => {
    if(['ICT', 'GP', 'SM','S/M'].includes(subject)){
      
      let subsidiary_marks = calcSubjectScoresFromEnrolement(group);
      let grades = getGrade(subsidiary_grade,subsidiary_marks)
      // 
      const letter = getLetter([grades], subject);
      return {
        grade: grades, 
        letter,
        points: points[letter] 
      };
    }else{
      
      const grades = group.map((p) => p.grade);
      // pass both grades and subject to getLetter
      const letter = getLetter(grades, subject);
      return { 
        grade: grades,
        letter,
        points: points[letter]
      };

    }
  });
}

// group grades per subject
function groupGradesBySubjectAsStudent(papers) {
  // Group by subject prefix (first word in paper name)
  const grouped = _.groupBy(papers, (p) => p.paper.split(" ")[0]);
  // Map into object of arrays of grades
  return _.mapValues(grouped, (group) => group.map((p) => p.grade).join());
}






module.exports = {
  enroleStudents,
  mergeEnrolmentsToStudent,
  getSubjectCombination,
  countSubjects,
  reorderSubject,
  groupGradesBySubject,
  groupGradesBySubjectAsStudent,
};
