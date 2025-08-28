
const exam_short_name = {BOT:1, MOT:2, EOT:3}
// 
function swapObjectKeysAndValues(obj) {
  const swappedObj = {}; // Create a new object to store the swapped key-value pairs

  // Iterate over the keys of the original object
  for (const key in obj) {
    // Ensure the property belongs to the object itself and not its prototype chain
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      swappedObj[value] = key; // Assign the original value as the new key and the original key as the new value
    }
  }

  return swappedObj; // Return the new object with swapped keys and values
}

// 
const grade ={
    ['0-39']:9,
    ['40-44']:8,
    ['45-49']:7,
    ['50-55']:6,
    ['55-59']:5,
    ['60-64']:4,
    ['65-69']:3,
    ['70-79']:2,
    ['80-100']:1,
} 

module.exports = {
  exam_short_name,
  swapObjectKeysAndValues,
  grade,
}