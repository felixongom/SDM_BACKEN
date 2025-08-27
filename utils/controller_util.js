const _ = require('lodash');
const db = require("../model");
const { randomize } = require("@felix-ongom/randomize");
const { convertSchoolInfoToObject, extractSubjects } = require('.');
const { exam_short_name } = require('./constant')
async function enroleStudents(data, CLASS) {
    let CLAS = parseInt(+CLASS.split(' ').pop())
    
    // add school infor if does not exist
    const school_info = convertSchoolInfoToObject(data['SCHOOL INFO']);
    const School = db.school;

    let check_obj = {
        school: school_info['SCHOOL NAME'],
        motto: school_info['MOTTO'],
        district: school_info['DISTRICT/CITY'],
        box_no: school_info['BOX NO'],
        email: school_info.EMAIL,
    };

    const [_school, __] = await School.findOrCreate({
        where: check_obj,
        defaults: {
            ...check_obj,
            location: school_info['LOCATION'],
            phone: school_info['PHONE'],
            sdm_password: randomize()
        }
    });

    let students = data[CLASS];
    students = _.filter(students, student => (
        student['STUDENT NAME'] &&
        student['STREAM'] &&
        student['GENDER'] &&
        student['NUM PAPER'] >= 5
    ));
    // 
  
    for (const student of students) {
        await enroleStudent(student, _school.id, school_info, CLAS);
    }
}

// 
async function enroleStudent(student, school_id, school_info, CLAS) {
    const Student = db.student;
    const Stream = db.stream;
    const Enrolement = db.enrolement;
    const Subject = db.subject;

    try {
        await db.sequelize.transaction(async (t) => {
            // add stream
            const [_stream, _] = await Stream.findOrCreate({
                where: { stream: student['STREAM'] },
                defaults: { stream: student['STREAM'] },
                transaction: t
            });

            // add students to the database if not exist
            let check_stud = {
                school_id,
                learner: student['STUDENT NAME'],
                year_of_entry:school_info['YEAR OF ENTRY'],
                gender: student['GENDER'],
            };
            // CREATE STUDENT
           let [_student, __] = await Student.findOrCreate({
                where: check_stud,
                defaults: {
                    ...check_stud,
                    stream_id: _stream.id,
                    pay_code: student['PAY CODE'] || null,
                    is_active: true
                },
                transaction: t
            });
            // save the data to enrolment table
            let subjects = Object.keys(extractSubjects(student));
            let one_person_enrolement = []
            // 
            for (const subj of subjects) {
                                
                const [_subject] = await Subject.findOrCreate({
                    where: { short_name: subj },
                    transaction: t
            });

            let one_enrolement = {
                learner_id: _student.id,
                paper_id: _subject.id,
                year: school_info['YEAR'],
                term: school_info['TERM'],
                exam:exam_short_name[school_info['EXAM']],
            }
            

            const [createdEnrolement, created] = await Enrolement.findOrCreate({
                    where:one_enrolement ,
                    defaults: {
                        ...one_enrolement,
                        clas: CLAS,
                        mark: null,
                        is_verified: true
                    },
                    transaction: t
                });
                        
        }
        // create bulk enrolement perperson            
            return one_person_enrolement;
             
        });
    } catch (error) {
        console.log("Error enrolling student:", error);
    }
}


module.exports = {
    enroleStudents,
};
