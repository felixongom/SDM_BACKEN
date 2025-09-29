const db = require("../model");
const {Op} = require('sequelize');
const { groupSubjects } = require("../utils");
const { countGradesInSubsect } = require("../utils/count_grades");

async function getSubjects(req, res) {
    let Subject = db.subject
    try {
        let subjects_result = await Subject.findAll({raw:true})
        let group = groupSubjects(subjects_result)
        res.send({subjects_result, subject_group:group})
    } catch (error) {
        console.log(error);   
    }
}
async function getSubject(req, res) {
    let Subject = db.subject
    const {id} = req.query
    try {
        const subject_result = await Subject.findByPk(id)
        res.send(subject_result)
    } catch (error) {
        console.log(error);
    }
}
// 
//this function counts the nubet of A, B,C,D,E, F,and, O in each subject
async function countGrade(req, res) {

    const {payload} = req.body
    //  let {clas, year, term, exam, subj_ids } = params
    try {
        if(payload){
            let calculated = []
            for (payl of payload) {
                let data = {
                    subj_ids:payl.ids, 
                    ...req.params
                }
                
                let result = await countGradesInSubsect(data)
                calculated = [...calculated,{...result, subject:payl.subject}]
            }
            
            res.send(calculated)  
        }else{
            res.send([])
        }
    } catch (error) {
        console.log(error);
        
    }
}

// 
module.exports = {
    getSubject, 
    getSubjects,
    countGrade
}