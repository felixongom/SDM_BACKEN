const _ = require('lodash')
const fs = require('fs').promises

function transformImageUrls(urls) {
  return _.map(urls, (url) => {
    const filename = _.last(url.split('/'));
    const nameWithoutExt = _.replace(filename, /\.[^/.]+$/, ''); // remove extension

    // Extract name inside __...__ if available
    const match = nameWithoutExt.match(/__(.*?)__/);
    const cleanName = match ? match[1] : _.replace(nameWithoutExt, /__/g, ''); // fallback and remove all __

    return {
      name: cleanName,
      image: url
    };
  });
}


/**
 * Assigns PSN and PST_IN_STREAM to each student based on rank keys.
 * @param {Array} students - flat student data array
 * @param {Object} rankKeys - e.g. { TOTAL: 'desc', AVG: 'desc' }
 * @returns {Array} ranked students with PSN and PST_IN_STREAM
 */
function assignStudentPositions(students, rankKeys = { AVG: 'desc' }) {
  if (!Array.isArray(students)) return []
  students = _.filter(students, student=>(student['STUDENT NAME'] && student['TOTAL']) && student['AVG'])
  const rankFields = Object.keys(rankKeys)
  const sortOrders = Object.values(rankKeys)

  // Step 1: Overall ranking for PSN
  const withClassPosition = _.orderBy(students, rankFields, sortOrders).map((student, i) => ({
    ...student,
    PSN: i + 1
  }))

  // Step 2: Stream-wise ranking
  const groupedByStream = _.groupBy(withClassPosition, 'STREAM')

  const finalRanked = _.flatMap(groupedByStream, (group) => {
    const rankedGroup = _.orderBy(group, rankFields, sortOrders)
    return rankedGroup.map((student, index) => ({
      ...student,
      PSN_IN_STREAM: index + 1
    }))
  })

  return finalRanked
}

async function deleteUploadFolder(folder_path){
try {
  await fs.rm(folder_path, {recursive:true, force:true})
  return true
} catch (error) {
  console.log(`Errer while deleting folder ${folder_path}`)
  return false
}
}
 function  convertSchoolInfoToObject(inputArray) {
  const result = {};
  if(!Array.isArray(inputArray)) return inputArray
  inputArray?.forEach(item => {
    if (item && Object.keys(item).length === 2 && 'ARTTRIBUTE' in item && 'VALUE' in item) {
      result[item.ARTTRIBUTE.trim()] = item.VALUE;
    }
  });
  return result;
}

// 
function extractSubjects(obj) {
  const pattern = /^[A-Z]+ ?\d+$/i;   // matches "MTC 1", "AGR 2", etc.
  const specialKeys = ["SM", "GP"];

  // Extract matching keys with value = 1
  let extracted = Object.keys(obj).reduce((acc, key) => {
    const cleanKey = key.trim();
    if ((pattern.test(cleanKey) || specialKeys.includes(cleanKey)) && obj[key] === 1) {
      acc[cleanKey] = obj[key];
    }
    return acc;
  }, {});

  // Sort the keys alphabetically, keeping "GP" at the end
  const sortedKeys = Object.keys(extracted).sort((a, b) => {
    if (a === "GP") return 1;
    if (b === "GP") return -1;
    return a.localeCompare(b, undefined, { numeric: true });
  });

  // Build sorted object
  const sortedObj = {};
  sortedKeys.forEach(key => {
    sortedObj[key] = extracted[key];
  });

  return sortedObj;
}

// 
function mapLearnersWithStream(learner, stream) {

  // Create a lookup for stream IDs → names for efficiency
  const streamMap = Object.fromEntries(stream.map(s => [s.id, s.stream]));

  // Replace stream_id with stream name
  return learner.map((l ,i)=> ({
    ...l,
    stream: streamMap[l.stream_id] || null, // replace
    sequence: i+1, 
  }));
}

// 
function mapById(arr) {
  return arr.reduce((obj, { id, short_name }) => {
    obj[id] = short_name;
    return obj;
  }, {});
}





module.exports = {
  transformImageUrls,
  assignStudentPositions,
  deleteUploadFolder,
  convertSchoolInfoToObject,
  extractSubjects,
  mapLearnersWithStream,
  mapById
}
