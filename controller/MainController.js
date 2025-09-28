const path = require('path')
const xlsx = require('xlsx')
const _ = require('lodash')
const {saveFiles, getFiles} = require("express-file-backet");
const {transformImageUrls, assignStudentPositions, deleteUploadFolder, mapLearnersWithStream, addPaperName, groupByLearner, mapStreamById, mergeLearnersWithPapersAndStream, convertSchoolInfoToObject, extractMarks} = require("../utils/index")
const {enroleStudents, mergeEnrolmentsToStudent} = require("../utils/controller_util")
const db = require("../model");
const {Op} = require('sequelize');
const { mapSubjectById, renameKeysInArray } = require('../utils/grade');
const { grade, exam_short_name, subsidiary_grade } = require('../utils/constant');
const { response } = require('express');

function readExcelFile(req, res){
  if (!req.files || !req.files.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const file = req.files.file;
  const ext = path.extname(file.name).toLowerCase();

  if (!['.xlsx', '.xlsm'].includes(ext)) {
    return res.status(400).json({ error: 'Only .xlsx and .xlsm files are allowed' });
  }

  // Get all query values starting with "sheet"
  const requestedSheets = Object.entries(req.query)
    .filter(([key]) => key.toLowerCase().startsWith('sheet'))
    .map(([, value]) => value?.trim().toLowerCase());
    
  
  if (requestedSheets.length === 0) {
    return res.status(400).json({ error: 'No ?sheet1=...&sheet2=... passed in query' });
  }

  try {
    const workbook = xlsx.read(file.data, { type: 'buffer' });
    const availableSheets = workbook.SheetNames;

    const result = {};

    requestedSheets.forEach(requestedName => {
      const matchedSheet = availableSheets.find(
        s => s.trim().toLowerCase() === requestedName
      );
      

      if (matchedSheet) {
        const sheet = workbook.Sheets[matchedSheet];
        const data = xlsx.utils.sheet_to_json(sheet);
        
        result[matchedSheet] = data;
      } else {
        result[requestedName] = { error: 'Sheet not found' };
      }
    });
    // 
    if(req.query.sheet1 ==="MARKS"){
      updateMarks(result.MARKS)
      res.send({result:result.MARKS, INFO:convertSchoolInfoToObject(result.INFO)})
      
    }else if(req.query.sheet1 ==="SENIOR 5" || req.query.sheet1 ==="SENIOR 6"){
        // call the function that enrolse studedes
        enroleStudents(result,req.query.sheet1)
        res.send(true)
    }else{
      let response_data = {...result, CLAS:assignStudentPositions(result[req.query.sheet1],{AVG: 'desc' ,'2 TOTAL':'desc'})}
      delete response_data[req.query.sheet1];
      res.json(response_data);
    }
  } catch (err) {
    console.error('Failed to process Excel:', err);
    res.status(500).json({ error: 'Failed to process Excel file' });
  }
}

// 
async function uploadPhotos(req, res){
    
    const file = req.files.file
    // 
    deleteUploadFolder(path.join(__dirname,'../public','uploads'))
    // 
    try {
        const uploadedFile = await saveFiles(file)
        let file_path = getFiles(req,'/uploads/',uploadedFile)
        return res.send(transformImageUrls(file_path))  
    } catch (error) {
        console.log(error);   
        res.send(error)
          
    }
}
// 
async function deletePhotos (req,res){
  let deleted = deleteUploadFolder(path.join(__dirname,'../public','uploads'))
  deleted? res.send('deleted').status(200) : res.send('Error').status(400)
} 

//get enrolement in year, term, clas
async function getEnrolement(req, res) {
  let {year, term,clas, exam } = req.params
  try {
    const Enrolement = db.enrolement;
    const Student = db.student;
    const Stream = db.stream;
    // 
    let stream = await Stream.findAll({ raw: true })
    let enroled_list = await Enrolement.findAll({
      where:{year:parseInt(year), term:parseInt(term), clas:parseInt(clas)},
      attributes: ['learner_id'],
      group: ['learner_id']
    })
    
    //get array of ids
   const ids = _.map(enroled_list, (enrolement)=>enrolement.learner_id) 
    //
    let learner = await Student.findAll({raw: true ,
      where: {
        id: {
          [Op.in]:ids
        }
      }
    })
    let data =  mapLearnersWithStream(learner, stream)
    let _data = await mergeEnrolmentsToStudent(data, {year, term, clas,exam })
    
    res.send(renameKeysInArray(_.orderBy(_data, 'learner','asc'),{learner:'STUDENT NAME', stream:'STREAM', gender:'SEX'}))
  } catch (error) {
    console.log(error);
  }
   

}
//get enrolement in year, term,class
async function getSubjectEnrolement(req, res) {
  let {clas, year, term, exam, subj_ids } = req.params
  
  const Enrolement = db.enrolement;
  const Subject = db.subject;
  const Student = db.student;
  const Stream = db.stream;
  try {
    let ids = subj_ids.split(',').map(id=>parseInt(id))
    let stream = mapStreamById(await Stream.findAll({raw:true}))
    //
    let subjects = await Subject.findAll({
      where:{
        id: {
          [Op.in]:ids
        }
      },
      raw:true
    })
    
    subjects = mapSubjectById(subjects)
    
    let subject_enrolement = await Enrolement.findAll({
      where:{
        year:parseInt(year), 
        term:parseInt(term), 
        clas:parseInt(clas),
        exam:exam_short_name[exam],
        paper_id: {
          [Op.in]:ids
        }
      },
      raw:true
    }) 
    // 
    let reshaped =  addPaperName(subject_enrolement,subjects)
    
    let grouped = _.map(groupByLearner(reshaped), (element, i)=>({...element, sequence: i+1})) 
    // Get the learners from the database
    let students = await Student.findAll({
      where:{
        id: {
          [Op.in]:_.map(grouped, item=>item.learner_id)
        }
      },
      raw:true
    })
    let last_result = mergeLearnersWithPapersAndStream(stream, grouped, students)
    
    res.send(_.orderBy(last_result,'learner', 'asc'))
  } catch (error) {
    console.log(error);
    
  }
    
}
// upload and update marks
async function updateMarks(results) {
  try {
    if (!Array.isArray(results) || results.length === 0) return results;

    for (let result of results) {
      const Enrolement = db.enrolement;
      // Ensure MARKS_ID is always an array
      if (typeof result.MARKS_ID === "string") {
        result.MARKS_ID = result.MARKS_ID.split(",");
      }

      const a_student_data = extractMarks(result);
      
      // call the db
      for (const data of a_student_data) {
        
        // Validate mark
        const parsed = parseInt(data.mark, 10);
        const is_valid =
          Number.isInteger(parsed) && parsed >= 0 && parsed <= 100;

        const markValue = is_valid ? parsed : null;
        await Enrolement.update({ mark: markValue },{ where: { id: data.id } });
      }
    }

  } catch (error) {
    console.error("Error in updateMarks:", error);
  }
}
// update marks
async function updateMarksFromDashboard(req,res) {
  
  const {results} = req.body    
  const Enrolement = db.enrolement;
  try {
    if (!Array.isArray(results) || results.length === 0) return results;

      // call the db
      for (const data of results) {
        // Validate mark
        const parsed = parseInt(data.mark, 10);
        const is_valid =
          Number.isInteger(parsed) && parsed >= 0 && parsed <= 100;
        
        const markValue = is_valid ? parsed : null;
        let d = await Enrolement.update({ mark: markValue },{ where: { id: data.id } });
     
      }
      
      res.send('updated').status(201)
    } catch (error) {
      console.error("Error in updateMarks:", error);
      res.send('not updated').status(300)
  }
}

// get school info
async function getSchoolInfo(req, res){
  const School = db.school;
  const school = await School.findOne({ raw:true })
  let info = {}
  // 
  if(school){
    info['SCHOOL NAME'] = school.school
    info['BOX NO'] = school?.box_no
    info['EMAIL'] = school.email
    info['PHONE'] = school.phone
    info['LOCATION'] = school.location
    info['MOTO'] = school.motto
    info['id'] = school.id
    info['DISTRICT/CITY'] = school.district
  }else{
    info = {}
  }
  res.send({info, grade, subsidiary_grade})
  
}

// delete student from db and all the related data
async function deletStudents(req, res){
  let {ids} = req.body
   const Student = db.student;
   const Enrolement = db.enrolement;
  let resonse = await Student.destroy({
    where:{
      id:{[Op.in]:ids} 
  }})
  
  // 
  let deleted_marks = await Enrolement.destroy({
    where:{
      id:{[Op.in]:ids} 
  }})
  
  res.send({response,deleted_marks})

  
}
// delete enrolement  from db and all the related data
async function deletEnrolement(req, res){
  let {ids, set_time} = req.body
   const Enrolement = db.enrolement;
   
  //  
  let deleted_marks = await Enrolement.destroy({
    where:{
      year:set_time.year,
      term:set_time.term,
      exam:exam_short_name[set_time.exam],
      learner_id:{[Op.in]:ids} 
  }})
  
  res.send({deleted_marks})

  
}
// 
async function deleteMarks(req, res){
  let {ids} = req.body
  
  const Enrolement = db.enrolement;
  //  
  let deleted_marks = await Enrolement.destroy({
    where:{
      id:{[Op.in]:ids} 
  }})  
  res.send({deleted_marks})
}

module.exports = { 
  readExcelFile, 
  uploadPhotos, 
  deletePhotos,
  getEnrolement,
  getSubjectEnrolement,
  updateMarks,
  getSchoolInfo,
  deletStudents,
  deletEnrolement,
  deleteMarks,
  updateMarksFromDashboard
}