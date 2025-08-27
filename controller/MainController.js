const path = require('path')
const xlsx = require('xlsx')
const _ = require('lodash')
const {saveFiles, getFiles} = require("express-file-backet");
const {transformImageUrls, assignStudentPositions, deleteUploadFolder, mapLearnersWithStream, mapById} = require("../utils/index")
const {enroleStudents} = require("../utils/controller_util")
const db = require("../model");
const {Op, where} = require('sequelize');
const { Subject } = require('../model/Others');

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
    if(req.query.sheet1 ==="SENIOR 5" || req.query.sheet1 ==="SENIOR 6"){
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
  let deleted = await deleteUploadFolder(path.join(__dirname,'public','uploads'))
  deleted? res.send('deletes').status(200) : res.send('Error').status(400)
}

//get enrolement in year, term, clas
async function getEnrolement(req, res) {
  let {year, term,clas } = req.params
  try {
    const Enrolement = db.enrolement;
    const Student = db.student;
    const Stream = db.stream;
    // 
    let stream = await Stream.findAll({ raw: true })
    let enroled_list = await Enrolement.findAll({
      where:{year:parseInt(year), term:parseInt(term), clas:parseInt(clas)},
      attributes: [
      'learner_id',
    ],
    group: ['learner_id']
    })
    
    //get array od ids
   const ids = _.map(enroled_list, (enrolement)=>enrolement.learner_id) 

    //
    let learner = await Student.findAll({raw: true ,
      where: {
        id: {
          [Op.in]:ids
        }
      }
    })
    let data = mapLearnersWithStream(learner, stream)
    
    res.send(data)
  } catch (error) {
    console.log(error);
  }
   

}
//get enrolement in year, term,class
async function getSubjectEnrolement(req, res) {
  let {clas, year, term, exam, subj_ids } = req.params
  const Enrolement = db.enrolement;
  const Subject = db.subject;
  try {
    let ids = subj_ids.split(',').map(id=>parseInt(id))
    
    //
    let subjects = await Subject.findAll({
      where:{
        id: {
          [Op.in]:ids
        }
      },
      raw:true
    })
    subjects = mapById(subjects)
    console.log(subjects);

    let subject_enrolement = await Enrolement.findAll({
      where:{
        year:parseInt(year), 
        term:parseInt(term), 
        clas:parseInt(clas),
        exam:parseInt(exam),
        paper_id: {
          [Op.in]:ids
        }
      },
      raw:true
    }) 

    res.send(subject_enrolement)
  } catch (error) {
    console.log(error);
    
  }
    
}

module.exports = { 
  readExcelFile, 
  uploadPhotos, 
  deletePhotos,
  getEnrolement,
  getSubjectEnrolement
}