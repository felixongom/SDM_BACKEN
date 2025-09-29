const { Op } = require("sequelize");
const { mapStreamById, addPaperName, groupByLearner, mergeLearnersWithPapersAndStream } = require(".");
const db = require("../model");
const { mapSubjectById, summarizeGrades } = require("./grade");
const _ = require('lodash');
const { exam_short_name } = require("./constant");

async function countGradesInSubsect(params) {
  let {clas, year, term, exam, subj_ids } = params
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
    
    return summarizeGrades(last_result)
  } catch (error) {
    console.log(error);  
    
  }
    
}

// 
module.exports ={
    countGradesInSubsect
}