console.log('May Node be with you')
const express = require('express')
const bodyParser = require('body-parser')
const igdb = require('./igdb.js')
const util = require('util')
const mongodb = require('mongodb')
const unirest = require('unirest')
const id_info = require('./id_info.js')
const db_util = require('./db_util.js')
const _ = require('underscore')


const MongoClient = mongodb.MongoClient

const app = express();

// Use the folder public for static files
app.use(express.static('public'))

app.use(bodyParser.urlencoded({extended: true}))
app.set('view engine', 'ejs')

MongoClient.connect('mongodb://root:89c91fc86c8d380a7c656f5a28e42d8a942f6deffc3553dc7766de7e384849c6@ds163020.mlab.com:63020/gamedb', (err, database) => {
	// ... Start the server
	if (err) return console.log(err)
	db = database
	//Assign a weight of 10 to our name field
    db.collection('games').createIndex(
        {"name": "text", "summary": "text"},
        {"weights": {"name": 10}}
    )
	app.listen(3030, function() {
		console.log('listening on 3030')
	})
})

//Called upon the launching of the webpage via express
app.get('/', (req, res) => {
	res.sendFile(__dirname + '/index.html')
})

//Called upon the launch of our /search page
app.get('/search', (req, res) => {
    res.sendFile(__dirname + '/index.html')
})

//Whenever /search is called via POST this will be called
app.post('/search', (req, res) => {
    var body = req.body
    var term = body.term
    var igdb = body.igdb

    if (igdb != undefined) {
        search(res, term, displaySearchResults, true)
        return
    }
    else {
        search(res, term, displaySearchResults)
    }
})

//Whenever /game/* is called via GET, this code executes
app.get('/game/:gameSlug', (req, res) => {
    var slug = req.params.gameSlug
    
    //getGameData -> displayGameData
    getGameData(res, slug, displayGameData)
})

//Whenever /company/* is called via GET, this code executes
app.get('/company/:companySlug', (req, res) => {
    var slug = req.params.companySlug

    //getCompanyData -> displayCompanyData
    getCompanyData(res, slug, displayCompanyData)
})

//Whenever a request comes for a page that hasn't been handled above,
//send a 404 error
app.get('*', (req, res) => {
    if (req.accepts('html')) {
        res.status(404).render('404', {url: req.url })
        return
    }

    if (req.accepts('json')) {
        res.status(404).send({error: 'Not found'})
        return
    }

    res.status(404).type('txt').send('Not found')
})

/**
 * Display the game info using res.render
 * @param {res} res - The response variable
 * @param {object} data - The data object containing the game object and other objects
 */
function displayGameData(res, data) {
    console.log("displayGameData: data")
    console.log(data)
    res.render('game.ejs', data)
}

/**
 * Display the company info using res.render
 * 
 * @param {res} res - The response variable
 * @param {object} company - The data object containing the company object
 */
function displayCompanyData(res, data) {
    res.render('company.ejs', data)
}

/**
 * Get company data provided a given slug
 * 
 * @param {res} res - The response variable
 * @param {string} companySlug - The slug of the company
 * @param {function} callback - The callback function to send results to
 */
function getCompanyData(res, companySlug, callback) {
    db.collection('companies', function(err, collection) {
        collection.findOne({slug: companySlug}, function(err, document) {

            //Render no company found page if document null
            if (document == null) {
                result = {slug: companySlug }
                res.render('nocompanyfound.ejs', {company: result } )
                return
            }

            var published = document.igdb_published
            var developed = document.igdb_developed

            var data = {company: document, igdb_published: undefined, igdb_developed: undefined}

            var types = ["igdb_developed", "igdb_published"]
            var collections = ["games", "games"]
            var endpoints = ["games", "games"]

            //Call addData passing our callback
            addData(res, data, "company", types, collections, endpoints, callback)
        })
    })
}


/**
 * Get game data provided a given slug
 * 
 * @param {res} res - The response variable
 * @param {string} gameSlug - The slug of the game
 * @param {function} callback - The callback function to send result to
 */
function getGameData(res, gameSlug, callback) {
    //Search game collection for slug
    db.collection('games', function(err, collection) {
        //Find one within the collection matching the game slug
        collection.findOne({slug: gameSlug}, function(err, document) {

            //Render no game found page if document null
            if (document == null) {
                result = {slug: gameSlug }
                res.render('nogamefound.ejs', {game: result } )
                return
            }

            //grab all information from specific document
            var developers = document.igdb_developers
            var publishers = document.igdb_publishers
            var companies = _.union(developers, publishers)
            var collection = document.igdb_collection
            var game_modes = document.igdb_game_modes
            var player_perspectives = document.igdb_player_perspectives
            var keywords = document.igdb_keywords
            var genres = document.igdb_genres
            var themes = document.igdb_themes
            var franchise = document.igdb_franchise
            
            //Create data
            var data = {game: document, igdb_developers: undefined, igdb_publishers: undefined, igdb_collection: undefined,
            igdb_game_modes: undefined, igdb_player_perspectives: undefined, igdb_keywords: undefined, igdb_genres: undefined,
            igdb_themes: undefined, igdb_franchise: undefined}

            var types = ["igdb_developers", "igdb_publishers", "igdb_collection", "igdb_game_modes", "igdb_player_perspectives", "igdb_keywords",
                         "igdb_genres", "igdb_themes", "igdb_franchise"]
            var collections = ["companies", "companies", "collections", "game_modes", "player_perspectives", "keywords",
                               "genres", "themes", "franchises"]
            var endpoints = ["companies", "companies", "collections", "game_modes", "player_perspectives", "keywords",
                               "genres", "themes", "franchises"]

            //Call addData passing our callback
            addData(res, data, "game", types, collections, endpoints, callback)
        })
    })
}

/**
 * This function is a utility function, which adds information to the data object, which
 * later gets used to render values on the game.ejs page.
 * 
 * @param {res} res - The response variable
 * @param {object} data - The data to render on the games page (document info e.g. game/company)
 * @param {string} name - The name of the document referenced in the data object
 * @param {string[]} types - An array of names of fields to get info
 * @param {string[]} collections - An array of names of collections to find info
 * @param {string[]} endpoints - An array of endpoints, used to communicate to IGDB
 * @param {function} callback - The function that renders the data on game.ejs
 */
function addData(res, data, name, types, collections, endpoints, callback) {
    // If the types array is empty, then call the callback to render data
    if (types == undefined || types.length == 0)
    {
        callback(res, data)
        return
    }

    //Grab data from specific game
    var document = data[name]

    //Shift to next types, collection, and enpoints
    var type = types.shift()
    var collection = collections.shift()
    var endpoint = endpoints.shift()
    console.log("addData: ")
    console.log(type)
    console.log(collection)
    
    if (document.hasOwnProperty(type))
    {
        var specificData = document[type]
        console.log("addData: specificdata")
        console.log(specificData)

        db.collection(collection).distinct("igdb_id", (function(err, documents) {
            // console.log(documents)
            // Make an array of the misc IDs that aren't in the database yet
            var data_needed_ids = _.difference(specificData, documents)
            console.log("addData:  data_needed_ids")
            console.log(data_needed_ids)
            if (data_needed_ids.length == 0)
            {
                // We have all the data in our database
                console.log("Getting the data from the database")
                db.collection(collection).find({"igdb_id": { $in: specificData}}).toArray(function(err, receivedData) {
                    console.log("addData: receivedData");
                    console.log(receivedData)
                    data[type] = receivedData
                    //Recursively call until we cannot find anything matching our database
                    addData(res, data, name, types, collections, endpoints, callback)
                })
            }
            else
            {
                // Data is needed from IGDB
                // Find existing entries from the database
                if (type !== "company") {
                    db.collection(collection).find({"igdb_id": { $in: specificData}}).toArray(function(err, receivedData) {
                        // Get & add necessary data from IGDB
                        db_util.add_new_misc(db, data_needed_ids, collection, endpoint, function(db, documents, collection) {
                            db_util.add_multiple_misc(db, documents, collection, function(documents) {
                                data[type] = _.union(documents, receivedData)
                                addData(res, data, name, types, collections, endpoints, callback)
                            })
                        })
                    })
                }
                else {
                    // The data is an array of games.  First, get existing data from database
                    db.collection(collection).find({"igdb_id": { $in: specificData}}).toArray(function(err, receivedData) {
                        // Get extra data from IGDB
                        id_info.info_from_ids(endpoint, data_needed_ids, (dataFromIGDB) => {
                            for (i in dataFromIGDB) {
                                var game = dataFromIGDB[i]
                                game = db_util.modify_game_exported(game)
                                dataFromIGDB[i] = game
                                // Insert game data into database
                                db.collection('games').insertOne(game)
                            }

                            data[type] = _.union(receivedData, dataFromIGDB)
                            addData(res, data, name, types, collections, endpoints, callback)
                        })                        
                    })
                }
            }
        }))
    }
    else
    {
        //Game does not contain protprty of 'type'
        addData(res, data, name, types, collections, endpoints, callback)
    }
}

/**
 * Display the searches using res.render
 */
function displaySearchResults(res, result, igdb, termvalue) {
    // console.log(result)
    console.log("rendering data")
    console.log(igdb)
    if (igdb == true) {
        res.render('search_results.ejs', {games: result, sourceIGDB: true, term: termvalue})
    }
    else {
        res.render('search_results.ejs', {games: result, sourceIGDB: false, term: termvalue})
    }
}

/**
 * Search for games with a search term.  The callback function receives the
 * response object, the array of results, and a boolean value for whether
 * the data was obtained from IGDB or our database.
 * 
 * @param {string} term - The search term sent from users
 * @param {function} callback - The callback function to send results to
 */
function search(res, term, callback, igdb) {

    //We need to search via igdb not our db
    if (igdb == true) {
        searchIGDB(res, term, callback)
        return
    }

    var term2 = term.replace(/["]/g, '\"')
    term2 = term2.replace(/[']/g, "\'")
    db.collection('games').find(
        { $text: { $search: term2 } },
        { "score": { "$meta": "textScore" } }
    ).limit(50).sort({"score": {"$meta": "textScore" } }).toArray(function(err, results)
    {
        if (results == undefined || results.length == 0)
        {
            // If there's nothing in our database, search IGDB
            searchIGDB(res, term, callback)
        }
        else
        {
            callback(res, results, false, term)
        }
    })
}

/**
 * Search games from IGDB with a given term
 * 
 * @param {res} res - The response object
 * @param {string} term - The search term sent from users
 * @param {function} callback - The callback function to send results to
 */
function searchIGDB(res, term, callback) {
    igdb.games({search: term, limit: 50}, ["*"]).then(function(result) {
        console.log(db_util)
        db_util.add_games_from_igdb(result.body, db)
        console.log("before callback to render data")
        callback(res, result.body, true, term)
    })
}
