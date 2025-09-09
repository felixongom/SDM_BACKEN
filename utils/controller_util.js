const _ = require("lodash");
const db = require("../model");
const { randomize } = require("@felix-ongom/randomize");
const { convertSchoolInfoToObject, extractSubjects, mapSubjectById, assignALevelPositions } = require(".");
const { exam_short_name, swapObjectKeysAndValues, grade, grade_letter, points, comination } = require("./constant");
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
        //    
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
     learner.grade_per_subject = groupGradesBySubject(learner.enrolement, getLetter )
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
// 
function getGrade(grade, mark) {
    // console.log(grade, mark);
  for (const range in grade) {
    const [min, max] = range.split("-").map(Number);
    if (mark >= min && mark <= max) {
      return grade[range];
    }
  }
  return null; // return null if mark is out of range
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
    const grades = group.map((p) => p.grade);

    // pass both grades and subject to getLetter
    const letter = getLetter(grades, subject);
    return {
      grade: grades,
      letter,
      points: points[letter]
    };
  });
}

// group grades per subject
function groupGradesBySubjectAsStudent(papers) {
  // Group by subject prefix (first word in paper name)
  const grouped = _.groupBy(papers, (p) => p.paper.split(" ")[0]);
  // Map into object of arrays of grades
  return _.mapValues(grouped, (group) => group.map((p) => p.grade).join());
}

// Grade latters
function getLetter(grade_array, subject){
    let grades = grade_array.sort() 
    // 
    if(subject==='GP' || subject==='SM' || subject.startsWith('ICT')){  //for subsidary paper      
        return grades[0]<7?'O':'F'
    }else if(grades.length===1){
        return grade_letter[grade_array[0]] 
    }else if(grade_array.length===2){
        if((grades[0]===9 && grades[1]===9) ||(grades[0]===8 && grades[1]===9) ) return grade_letter[9]//for F        
        // 
        if(
            (grades[1]===9 && grades[0]<7) ||
            (grades[0]<=8 && grades[0]>=5) && (grades[0] + grades[1]<=16)
        ) return grade_letter[8]//for O
        // 
        if(
            (grades[1]===6 && grades[0]<=6) ||
            ((grades[1]===8 || grades[1]<=7) && (grades[0] +grades[1] <=12) )
        ) return grade_letter[6]//for E
        // 
        if(grades[1]===5 && grades[0]<=5) return grade_letter[5]//for D
        // 
        if(grades[1]===4 && grades[0]<=4) return grade_letter[4]//for C
        // 
        if(grades[1]===3 && grades[0]<=3) return grade_letter[3]//for B
        // 
        if(grades[1]===2 && grades[0]<=2) return grade_letter[1]//for A
        return 'N/A'
        
    }else if(grade_array.length===3){        
        let is_sci = subject==='PHY' || subject==='BIO' || subject==='CHE'
        if(
            (grades.filter(item => item === 9).length ===2 && grades[0]===7 && is_sci) ||
            grades[2]===9 && grades[1]===9 && grades[0]===8 ||
            grades[2]===9 && grades[1]===9 && grades[0]===9
        ) return 'F' // for F
        // 
        if(
            (grades.filter(item => item === 9).length ===2 && grades[0]<=7) ||
            grades[2] === 9 || grades.filter(item => item < 9).length ===2 ||
            grades.every(value => value === 7) ||
            grades.every(value => value === 8)
        ) return grade_letter[8]//for O
        // 
        if(
            (grades[2]===8 && grades.filter(item => item === 6).length ===1 && grades[0]<6) ||
            (grades[2]===7 && grades.filter(item => item < 7).length ===2)
        ) return grade_letter[6]//for E
        // 
        if((grades[2]===6 && grades.filter(item => item < 6).length ===2)) return grade_letter[5]//for D
        // 
        if((grades[2]===5 && grades.filter(item => item < 5).length ===2)) return grade_letter[4]//for C
        // 
        if((grades[2]===4 && grades.filter(item => item < 4).length ===2)) return grade_letter[3]//for B
        // 
        if(
            (grades[2]===3 && grades.filter(item => item < 3).length ===2) ||
            grades.filter(item => item < 3).length ===3
        ) return grade_letter[1]//for A
        //
        return 'N/A' 
        
    }else if(grade_array.length===4){
        if(
            (grades.filter(item => item ===9).length ===2 && grades.filter(item => item ===8).length ===2) ||
            (grades.filter(item => item ===9).length ===4)
        ) return grade_letter[9]//for F
        // 
        if(
            grades.every(value => (value === 8)) ||
            grades.every(value => (value === 7)) ||
            (grades.filter(item => item ===9).length ===2 && grades.filter(item => item <=7).length ===2) ||
            (grades.filter(item => item ===9).length ===1 && grades.filter(item => item <=8).length ===3 )
        ) return grade_letter[8]//for O
        // 
        if(
            (grades.filter(item => item ===8).length ===1 && grades.filter(item => item ===6).length <=2 && grades.filter(item => item ===7).length ===0) ||
            (grades.filter(item => item ===7).length ===1 && grades.filter(item => item <7).length ===3)
        ) return grade_letter[6]//for E
        //
        if(
            grades.every(value => (value === 5)) ||
            (grades.filter(item => item ===6).length ===1 && grades.filter(item => item <6).length ===3)
        ) return grade_letter[5]//for D
        // 
        if(
            grades.every(value => (value === 4)) ||
            (grades.filter(item => item ===5).length ===1 && grades.filter(item => item <5).length ===3)
        ) return grade_letter[4]//for C
        // 
        if(
            grades.every(value => (value === 3)) ||
            (grades.filter(item => item ===4).length ===1 && grades.filter(item => item <4).length ===3)
        ) return grade_letter[3]//for B
        // 
        if(
            grades.every(value => (value <3)) ||
            (grades.filter(item => item ===3).length ===1 && grades.filter(item => item <3).length ===3)
        ) return grade_letter[1]//for A
        //
        return 'N/A' 
    }else{
        return null
    }
}

//get total points
function getTotalPoints(subjects) {
  return Object.values(subjects).reduce((total, subj) => {
    return total + (subj.points || 0);
  }, 0);
}




module.exports = {
  enroleStudents,
  mergeEnrolmentsToStudent,
  getSubjectCombination,
  countSubjects,
  getGrade,
  reorderSubject,
  groupGradesBySubject,
  groupGradesBySubjectAsStudent,
  getLetter,
  getTotalPoints
};
