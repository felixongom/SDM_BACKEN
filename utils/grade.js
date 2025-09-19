const _ = require("lodash");
const { grade_letter } = require("./constant");

// 
function getGrade(grade, mark) {
  for (const range in grade) {
    const [min, max] = range.split("-").map(Number);
    if (mark >= min && mark <= max) {
      return grade[range];
    }
  }
  return null; // return null if mark is out of range
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
      if(grades[1]<=2 && grades[0]<=2) return grade_letter[1]//for A
      // 
      if(grades[1]===3 && grades[0]<=3) return grade_letter[3]//for B
      // 
      if(grades[1]===4 && grades[0]<=4) return grade_letter[4]//for C
      // 
      if(grades[1]===5 && grades[0]<=5) return grade_letter[5]//for D
      // 
      if(
        (grades[1]===6 && grades[0]<=6) ||
        ((grades[1]===8 || grades[1]<=7) && (grades[0] +grades[1] <=12) )
      ) return grade_letter[6]//for E
      // 
      if(
        (grades[1]===9 && grades[0]<7) ||
        (grades[0]<=8 && grades[0]>=5) && (grades[0] + grades[1]<=16)
      ) return grade_letter[8]//for O
      // 
      if((grades[0]===9 && grades[1]===9) ||(grades[0]===8 && grades[1]===9) ) return grade_letter[9]//for F        
      // 
      return 'N/A'
        
    }else if(grade_array.length===3){        
      let is_sci = subject==='PHY' || subject==='BIO' || subject==='CHE'
      if(
        (grades[2]===3 && grades.filter(item => item < 3).length ===2) ||
        grades.filter(item => item < 3).length ===3
      ) return grade_letter[1]//for A
      //
      if((grades[2]===4 && grades.filter(item => item < 4).length ===2)) return grade_letter[3]//for B
      // 
      if((grades[2]===5 && grades.filter(item => item < 5).length ===2)) return grade_letter[4]//for C
      // 
      if((grades[2]===6 && grades.filter(item => item < 6).length ===2)) return grade_letter[5]//for D
      // 
      if(
          (grades[2]===8 && grades.filter(item => item < 8).length ===2) ||
          (grades[2]===8 && grades.filter(item => item === 6).length ===1 && grades[0]<6) ||
          (grades[2]===7 && grades.filter(item => item < 7).length ===2)
      ) return grade_letter[6]//for E
      
      // 
      if(
        (grades.filter(item => item === 9).length ===2 && grades[0]===7 && is_sci) ||
        grades[2]===9 && grades[1]===9 && grades[0]===8 ||
        grades[2]===9 && grades[1]===9 && grades[0]===9
      ) return 'F' // for F
      // 
      if(
        (grades.filter(item => item === 9).length ===2 && grades[0]<=7) ||
        (grades.filter(item => item === 9).length ===1 && grades.filter(item => item <9).length ===2) ||
        grades[2] === 9 || grades.filter(item => item < 9).length ===2 ||
        grades.every(value => value === 7) ||
        grades.every(value => value === 8)
      ) return grade_letter[7]//for O
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

// 

const mapSubjectById = (arr) =>
  arr.reduce((acc, { id, short_name }) => ({ ...acc, [id]: short_name }), {});


/**
 * Assign A-Level positions with tie-breaking
 */
function assignALevelPositions(students) {
  const tieBreaker = [
    (s) => s.total_points,
    (s) => _.get(s, "grade_per_subject.GP.points", -Infinity),
    (s) =>
      _.get(
        s,
        "grade_per_subject.SM.points",
        _.get(s, "grade_per_subject.ICT.points", -Infinity)
      ),
    (s) => s.GP_mark || -Infinity,
    (s) => s.gender?.toLowerCase() || "",
  ];
  const orders = ["desc", "desc", "desc", "desc", "asc"];

  // Overall PSN
  const sorted = _.orderBy(students, tieBreaker, orders);
  sorted.forEach((s, i) => (s.PSN = i + 1));

  // Stream PSN
  const groupedByStream = _.groupBy(sorted, "stream");
  _.forEach(groupedByStream, (streamStudents) => {
    const ordered = _.orderBy(streamStudents, tieBreaker, orders);
    ordered.forEach((s, i) => (s.PSN_IN_STREAM = i + 1));
  });

  return sorted;
}

// 
function renameKeysInArray(data, keyMap) {
  if (!Array.isArray(data)) return [];

  return _.map(data, (item) =>
    _.mapKeys(item, (_value, key) =>
      _.has(keyMap, key) ? keyMap[key] : key
    )
  );
}

module.exports = {
  getGrade,
  getLetter,
  getTotalPoints,
  mapSubjectById,
  assignALevelPositions,
  renameKeysInArray
};