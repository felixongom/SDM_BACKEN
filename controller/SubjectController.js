const db = require("../model");
const {Op} = require('sequelize');
const { groupSubjects } = require("../utils");

async function getSubjects(req, res) {
    Subject = db.subject
    try {
        let subjects_result = await Subject.findAll({raw:true})
        let group = groupSubjects(subjects_result)
        res.send({subjects_result, subject_group:group})
    } catch (error) {
        console.log(error);
        
    }
}
async function getSubject(req, res) {
    Subject = db.subject
    const {id} = req.query
    try {
        const subject_result = await Subject.findByPk(id)
        console.log(subject_result);
        res.send(subject_result)
    } catch (error) {
        console.log(error);
        
    }
}

// 
module.exports = {
    getSubject, getSubjects
}