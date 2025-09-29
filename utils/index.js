const _ = require("lodash");
// const fs = require("fs").promises;
const fs = require('fs');
const { getGrade, getLetter, processICTMarks } = require("./grade");
const { grade, subsidiary_grade } = require("./constant");
const path = require("path");
 
/* ------------------------------------------------------------------
 * Image helpers
 * ------------------------------------------------------------------ */

/**
 * Transform image URLs → { name, image }
 * Extracts clean name from filename or __...__ convention
 */
function transformImageUrls(urls) {
  return _.map(urls, (url) => {
    const filename = _.last(url.split("/"));
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");

    // Extract name inside __...__ if available
    const match = nameWithoutExt.match(/__(.*?)__/);
    const cleanName = match ? match[1] : nameWithoutExt.replace(/__/g, "");

    return { name: cleanName, image: url };
  });
}

/* ------------------------------------------------------------------
 * Ranking / positions
 * ------------------------------------------------------------------ */

/**
 * Assign PSN and PSN_IN_STREAM to students
 * @param {Array} students
 * @param {Object} rankKeys - sort config e.g. { TOTAL: 'desc', AVG: 'desc' }
 */
function assignStudentPositions(students, rankKeys = { AVG: "desc" }) {
  if (!Array.isArray(students)) return [];

  const filtered = students.filter(
    (s) => s["STUDENT NAME"] && s["TOTAL"] && s["AVG"]
  );

  const rankFields = Object.keys(rankKeys);
  const sortOrders = Object.values(rankKeys);

  // Overall class positions
  const withClass = _.orderBy(filtered, rankFields, sortOrders).map((s, i) => ({
    ...s,
    PSN: i + 1,
  }));

  // Stream-wise positions
  const groupedByStream = _.groupBy(withClass, "STREAM");
  return _.flatMap(groupedByStream, (group) =>
    _.orderBy(group, rankFields, sortOrders).map((s, i) => ({
      ...s,
      PSN_IN_STREAM: i + 1,
    }))
  );
}


/* ------------------------------------------------------------------
 * File system
 * ------------------------------------------------------------------ */

/**
 * Delete a folder and its contents
 */
  
function deleteUploadFolder(folder_path) {
  if (!fs.existsSync(folder_path)) return;

  fs.readdirSync(folder_path).forEach(file => {
    const curPath = path.join(folder_path, file);
    if (fs.lstatSync(curPath).isDirectory()) {
      // Recursively delete folder
      fs.rmSync(curPath, { recursive: true, force: true });
    } else {
      // Delete file
      fs.unlinkSync(curPath);
    }
  });

}


/* ------------------------------------------------------------------
 * Data transforms
 * ------------------------------------------------------------------ */

/**
 * Convert school info array to object
 */
function convertSchoolInfoToObject(inputArray) {
  if (!Array.isArray(inputArray)) return inputArray;

  return inputArray.reduce((acc, item) => {
    if (
      item &&
      Object.keys(item).length === 2 &&
      "ARTTRIBUTE" in item &&
      "VALUE" in item
    ) {
      acc[item.ARTTRIBUTE.trim()] = item.VALUE;
    }
    return acc;
  }, {});
}

/**
 * Extract subjects from an object
 * Matches "MTC 1", "AGR 2", "SM", "GP"
 */
function extractSubjects(obj) {
  const pattern = /^[A-Z]+ ?\d+$/i;
  const specialKeys = ["SM", "GP"];

  const extracted = Object.keys(obj).reduce((acc, key) => {
    const clean = key.trim();
    if ((pattern.test(clean) || specialKeys.includes(clean)) && obj[key] === 1) {
      acc[clean] = obj[key];
    }
    return acc;
  }, {});

  const sortedKeys = Object.keys(extracted).sort((a, b) => {
    if (a === "GP") return 1;
    if (b === "GP") return -1;
    return a.localeCompare(b, undefined, { numeric: true });
  });

  return Object.fromEntries(sortedKeys.map((k) => [k, extracted[k]]));
}

/* ------------------------------------------------------------------
 * Mapping helpers
 * ------------------------------------------------------------------ */

function mapLearnersWithStream(learners, streams) {
  const streamMap = Object.fromEntries(streams.map((s) => [s.id, s.stream]));
  return learners.map((l, i) => ({
    ...l,
    stream: streamMap[l.stream_id] || null,
    sequence: i + 1,
  }));
}

const mapStreamById = (arr) =>
  arr.reduce((acc, { id, stream }) => ({ ...acc, [id]: stream }), {});

function addPaperName(array, lookup) {
  return array.map((el) => ({ ...el, paper: lookup[el.paper_id] }));
}

/* ------------------------------------------------------------------
 * Grouping helpers
 * ------------------------------------------------------------------ */

/**
 * Group by learner_id, flatten marks/papers
 */
function groupByLearner(arr) {
  const grouped = _.groupBy(arr, "learner_id");

  return _.map(grouped, (items, learner_id) => {
    const { clas, exam, year, term, is_verified } = items[0];

    const papers = _.fromPairs(items.map((i, idx) => [`paper_${idx + 1}`, i.paper]));
    const marks_id = _.fromPairs(items.map((i, idx) => [`marks_${idx + 1}_id`, i.id]));
    const marks = _.fromPairs(items.map((i, idx) => [`paper_${idx + 1}`, i.mark]));

    return {
      learner_id: Number(learner_id),
      clas,
      exam,
      year,
      term,
      is_verified,
      papers,
      marks_id,
      marks,
    };
  });
}

/**
 * Merge learners into marks data
 */
function mergeLearnersWithPapersAndStream(
  streamLookup,
  papersData,
  learners,
  fieldsToPick = ["learner", "gender"]
) { 
  const learnerMap = _.keyBy(learners, "id");
 
  return papersData.map((item) => {
    item = processICTMarks(item);
    
    let is_ict = _.startsWith(item.papers.paper_1, 'ICT')
    let is_subsidiary = _.startsWith(item.papers.paper_1, 'ICT') || _.startsWith(item.papers.paper_1, 'GP') || _.startsWith(item.papers.paper_1, 'SM') || _.startsWith(item.papers.paper_1, 'S/M')
    
    let subject_marks = is_ict?item.ict_marks:item.marks
    // console.log(item.grades, subject_marks);
    
    item.grades = Object.values(subject_marks).map((m) => {
      let _grade = is_subsidiary?subsidiary_grade:grade
      return getGrade(_grade, m, item.papers.paper_1)
    });
    item.grade_string = `(${item.grades.join(",")})`;
    item.grade_letter = getLetter(item.grades, item.papers.paper_1);
    // 
    const learner = learnerMap[item.learner_id];
    if (learner) {
      const extra = _.pick(learner, fieldsToPick);
      extra.stream = streamLookup[learner.stream_id] || null;
      return { ...item, ...extra };
    }
    return item;
  });
}

/**
 * Group subjects by prefix
 */
function groupSubjects(arr) {
  const grouped = _.groupBy(arr, (i) => i.short_name.split(" ")[0]);
  return _.map(grouped, (items, subject) => ({
    ids: items.map((i) => i.id).join(","),
    subject,
  }));
}

/**
 * Extract marks array from row
 * e.g. → [ { id: 523, mark: 70 }, { id: 524, mark: 66 } ]
 */
function extractMarks(row) {
  
  const ids = row.MARKS_ID || [];
  const subjectKeys = _.without(Object.keys(row), "MARKS_ID", "LEARNER");
  
  let d = ids.map((id, idx) => ({
    id: parseInt(id, 10),
    mark: row[subjectKeys[idx+1]] ?? "",
  }));

  return d
}

/* ------------------------------------------------------------------
 * Exports
 * ------------------------------------------------------------------ */

module.exports = {
  transformImageUrls,
  assignStudentPositions,
  deleteUploadFolder,
  convertSchoolInfoToObject,
  extractSubjects,
  mapLearnersWithStream,
  mapStreamById,
  addPaperName,
  groupByLearner,
  mergeLearnersWithPapersAndStream,
  groupSubjects,
  extractMarks,
  deleteUploadFolder
};
