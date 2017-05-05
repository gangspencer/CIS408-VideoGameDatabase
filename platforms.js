const db_util = require('./db_util')
const _ = require('underscore')
const mongodb = require('mongodb')

const MongoClient = mongodb.MongoClient

MongoClient.connect('mongodb://root:89c91fc86c8d380a7c656f5a28e42d8a942f6deffc3553dc7766de7e384849c6@ds163020.mlab.com:63020/gamedb', (err, database) => {
	if (err) return console.log(err)
	db = database

    db_util.add_new_misc(db, _.range(50), "platforms", "platforms", db_util.add_multiple_misc)
    db_util.add_new_misc(db, _.range(50, 100), "platforms", "platforms", db_util.add_multiple_misc)
    db_util.add_new_misc(db, _.range(100, 150), "platforms", "platforms", db_util.add_multiple_misc)
})


