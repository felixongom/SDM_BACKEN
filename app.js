const express = require('express')

const cors = require('cors')
const expressFileupload = require("express-fileupload");
const _ = require('lodash')
const db = require('./model')
const router = require('./routes/user.routes')
// 

const app = express()

//initialize db And Sync DB (creates tables in SQLite file)
db.sequelize.sync({ force: false })
.then(() => console.log("Database synced with SQLite"))
.catch(err => console.error(err)); 

// 
app.use(express.json()); 
app.use(cors())
//add middleware
app.use(expressFileupload())
// Register Route
app.use('/api', router)


// 
app.use(express.static('public'));


app.listen(3001, () => { 
  console.log('Server running on http://localhost:3001')
})
