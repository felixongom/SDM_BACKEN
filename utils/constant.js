
const exam_short_name = {BOT:1, MOT:2, EOT:3}
// 
function swapObjectKeysAndValues(obj) {
  const swappedObj = {}; // Create a new object to store the swapped key-value pairs
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
    ['40-49']:8,
    ['50-59']:7,
    ['60-64']:6,
    ['65-69']:5,
    ['70-74']:4,
    ['75-79']:3,
    ['80-84']:2,
    ['85-100']:1,
} 

//grade letter 
const grade_letter = {
    1:'A',
    2:'A',
    3:'B',
    4:'C',
    5:'D',
    6:'E',
    7:'O',
    8:'O',
    9:'F',
}
//grade letter 
const points = {
    A:6,
    B:5,
    C:4,
    D:3,
    E:2,
    O:1,
    F:0,
}

// combination
let comination = {
  EMP:'PEM',
  BCM:'BCM',
  AEG:'GEA',
  CMP:'PCM',
  DHL:'HLD',
  ABC:'BCA',
  EGM:'MEG',
  DEL:'LED',
  DEH:'HED',
  AEM:'MEA',
  MPT:'PMT'

}
module.exports = {
  exam_short_name,
  swapObjectKeysAndValues,
  grade,
  grade_letter,
  points,
  comination
}