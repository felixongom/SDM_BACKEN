const express = require('express')
const path = require('path')

const xlsx = require('xlsx')
const cors = require('cors')
const expressFileupload = require("express-fileupload");
const {saveFiles, getFiles} = require("express-file-backet");
const _ = require('lodash')
const {transformImageUrls, assignStudentPositions, deleteUploadFolder} = require("./utils/index")

const app = express()
app.use(cors())
//add middleware
app.use(expressFileupload())
// 
app.post('/api/upload-excel', (req, res) => {
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
    let response_data = {...result, CLAS:assignStudentPositions(result[req.query.sheet1],{AVG: 'desc' ,'2 TOTAL':'desc'})}
    delete response_data[req.query.sheet1];
        
    res.json(response_data);
  } catch (err) {
    console.error('Failed to process Excel:', err);
    res.status(500).json({ error: 'Failed to process Excel file' });
  }
});

// 
app.use(express.static('public'));

app.post('/api/pics/uploads', async(req, res) => {
    
    const file = req.files.file
    try {
        const uploadedFile = await saveFiles(file)
        let file_path = getFiles(req,'/uploads/',uploadedFile)
        return res.send(transformImageUrls(file_path))  
    } catch (error) {
        console.log(error);   
        res.send(error)
          
    }
});
app.post('/api/delete-photos', async(req,res)=>{
  let deleted = await deleteUploadFolder(path.join(__dirname,'public','uploads'))
  deleted? res.send('deletes').status(200) : res.send('Error').status(400)
})

app.listen(3001, () => { 
  console.log('Server running on http://localhost:3001')
})
