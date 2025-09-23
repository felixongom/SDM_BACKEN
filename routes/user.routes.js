const express = require("express");
const router = express.Router();
const { readExcelFile, uploadPhotos, deletePhotos, 
    getEnrolement,getSubjectEnrolement, getSchoolInfo,
    deletStudents} = require("../controller/MainController");

    const {getSubjects, getSubject} = require('../controller/SubjectController')
//upload excel file for marks and A level enrolement 
router.post('/upload-excel', readExcelFile);
router.post('/pics/uploads', uploadPhotos);
router.delete('/delete-photos', deletePhotos);
router.get('/enrolement/clas/:clas/year/:year/term/:term/exam/:exam', getEnrolement);
router.get('/enrolement/clas/:clas/year/:year/term/:term/exam/:exam/subj/:subj_ids', getSubjectEnrolement);
router.get('/subjecs', getSubjects);
router.get('/subjec/:id', getSubject);
router.get('/school-info', getSchoolInfo);   
// 
router.post("/delete-students", deletStudents);   
router.post("/delete-student-marks", deletStudents);   


 
module.exports = router;
