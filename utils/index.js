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
module.exports = {
  transformImageUrls,
  assignStudentPositions,
  deleteUploadFolder
}
