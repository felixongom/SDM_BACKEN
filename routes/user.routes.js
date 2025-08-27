const express = require("express");
const router = express.Router();
const { readExcelFile, uploadPhotos, deletePhotos, getEnrolement,getSubjectEnrolement } = require("../controller/MainController");

//upload excel file for marks and A level enrolement 
router.post('/upload-excel', readExcelFile);
router.post('/pics/uploads', uploadPhotos);
router.delete('/delete-photos', deletePhotos);
router.get('/enrolement/clas/:clas/year/:year/term/:term', getEnrolement);
router.get('/enrolement/clas/:clas/year/:year/term/:term/exam/:exam/subj/:subj_ids', getSubjectEnrolement);

 
module.exports = router;
