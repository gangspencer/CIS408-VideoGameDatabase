const mongodb = require('mongodb')
const _ = require('underscore')
const id_info = require('./id_info.js')

/**
 * Returns the current time
 */
function current_time() {
    return Math.round(new Date().getTime())
}

/**
 * Add a game to our database using the game object 
 * 
 * @param {database} db - The database we add our data to
 * @param {game} game - The game object we are adding to the database if it is unique 
 */
function add_if_new(db, game) {
    var id = game.id
    db.collection('games', function(err, collection) {
        collection.findOne({"igdb_id": id}, function(err, document) {
            if (document == null) {
                add_utility(db, game)
            }
        })
    })
}

/**
 * Add a game to the games collection in our database.  Miscellaneous key-value
 * pairs are modified before adding.  We also create two new key-value fields,
 * creation_type and update_type, both 1 - representing IGDB.
 * 
 * @param {database} db - The database we add our data to
 * @param {game} game - The game object we are adding to the database after modifying
 */
function add_utility(db, game) {
    game = modify_game(game)
    db.collection('games').insertOne(game)
}

/**
 * Modify a game's key names
 * 
 * @return {game} game - The modified game
 * @param {game} game - The game to modify and return
 */
function modify_game(game) {
    game.igdb_id = game.id
    delete game.id
    game.igdb_url = game.url
    delete game.url
    game.igdb_created_at = game.created_at
    game.igdb_updated_at = game.updated_at

    var properties = ["games", "collection", "keywords", "themes", "rating_count", "rating", "aggregated_rating", "category",
                        "publishers", "game_modes", "player_perspectives", "genres", "total_rating", "total_rating_count",
                         "developers", "game_engines"]

    for (property in properties)
    {
        var property = properties[property]
        if (game.hasOwnProperty(property))
        {
            game["igdb_" + property] = game[property]
            delete game[property]
        }
    }

    game.created_at = current_time()
    game.updated_at = current_time()
    game.creation_type = 1
    game.update_type = 1
    return game
}

/**
 * Get distinct IDs for a desired collection to add new data to the database (avoiding
 * adding existing data).
 * 
 * @param {database} db - The database we are modifying
 * @param {array} desired_data_ids - An array of IDs for data accompanying the games array
 * @param {string} collection - The name of the collection for our data
 * @param {string} endpoint - The name of the endpoint used to get data from IGDB
 * @param {function} callback - The callback function to add the data to the database
 */
function add_misc_if_new(db, desired_data_ids, collection, endpoint, callback) {
    db.collection(collection).distinct("igdb_id", (function(err, documents) {
        console.log(documents)
        // Make an array of the misc IDs that aren't in the database yet
        var data_needed_ids = _.difference(desired_data_ids, documents)
        console.log(data_needed_ids)
        if (data_needed_ids.length == 0) return
        id_info.info_from_ids(endpoint, data_needed_ids, callback, db, collection)
    }))
}

/**
 * Add multiple objects / documents to a collection in our database.  This function changes
 * some key-value pairs, and adds two new properties - creation_type and update_type
 *
 * @param {database} db - The database we are modifying
 * @param {array} documents - The array of document objects we are adding
 * @param {string} collection - The name of the collection of the database we are modifying
 * @param {function} callback - A callback function which receives the modified received documents
 */
function add_multiple_misc_util(db, documents, collection, callback) {
    for (doc_number in documents)
    {
        var document = documents[doc_number]

        document.igdb_id = document.id
        delete document.id
        document.igdb_created_at = document.created_at
        document.igdb_updated_at = document.updated_at

        var properties = ["games", "changed_company_id", "published", "developed", "companies", "platforms", "url"]

        for (property in properties)
        {
            var property = properties[property]
            if (document.hasOwnProperty(property))
            {
                document["igdb_" + property] = document[property]
                delete document[property]
            }
        }
        
        document.created_at = current_time()
        document.update_at = current_time()
        document.creation_type = 1
        document.update_type = 1

        documents[doc_number] = document
        db.collection(collection).insertOne(document)
    }
    if (callback != undefined) {
        callback(documents)
    }
}

module.exports = {

    /**
     * Adds games to the games collection
     * @param {array} games - An array of game JSON to add to the database
     * @param {database} db - The database to add the game data to
     */
    add_games_from_igdb : function add_games_from_igdb(games, db)
    {
        var collections = []
        var franchises = []
        var companies = []
        var game_engines = []
        var player_perspectives = []
        var game_modes = []
        var keywords = []
        var themes = []
        var genres = []

        for (game in games)
        {
            var game = games[game]

            // Only add the game if it is new to the database
            add_if_new(db, game)

            if (game.hasOwnProperty('collection'))
            {
                collections = _.union(collections, [game.collection])
            }
            if (game.hasOwnProperty('franchise'))
            {
                franchises = _.union(franchises, [game.franchise])
            }
            if (game.hasOwnProperty('developers'))
            {
                companies = _.union(companies, game.developers)
            }
            if (game.hasOwnProperty('publishers'))
            {
                companies = _.union(companies, game.publishers)
            }
            if (game.hasOwnProperty('keywords'))
            {
                keywords = _.union(keywords, game.keywords)
            }
            if (game.hasOwnProperty('game_engines'))
            {
                game_engines = _.union(game_engines, game.game_engines)
            }
            if (game.hasOwnProperty('player_perspectives'))
            {
                player_perspectives = _.union(player_perspectives, game.player_perspectives)
            }
            if (game.hasOwnProperty('game_modes'))
            {
                game_modes = _.union(game_modes, game.game_modes)
            }
            if (game.hasOwnProperty('themes'))
            {
                themes = _.union(themes, game.themes)
            }
            if (game.hasOwnProperty('genres'))
            {
                genres = _.union(genres, game.genres)
            }
        }
        add_misc_if_new(db, companies, "companies", "companies", add_multiple_misc_util)
        add_misc_if_new(db, keywords, "keywords", "keywords", add_multiple_misc_util)
        add_misc_if_new(db, franchises, "franchises", "franchises", add_multiple_misc_util)
        add_misc_if_new(db, collections, "collections", "collections", add_multiple_misc_util)
        add_misc_if_new(db, game_engines, "game_engines", "game_engines", add_multiple_misc_util)
        add_misc_if_new(db, game_modes, "game_modes", "game_modes", add_multiple_misc_util)
        add_misc_if_new(db, genres, "genres", "genres", add_multiple_misc_util)
        add_misc_if_new(db, player_perspectives, "player_perspectives", "player_perspectives", add_multiple_misc_util)
        add_misc_if_new(db, themes, "themes", "themes", add_multiple_misc_util)
    },

    /**
     * Get distinct IDs for a desired collection to add new data to the database (avoiding
     * adding existing data).
     * 
     * @param {database} db - The database we are modifying
     * @param {array} desired_data_ids - An array of IDs for data accompanying the games array
     * @param {string} collection - The name of the collection for our data
     * @param {string} endpoint - The name of the endpoint used to get data from IGDB
     * @param {function} callback - The callback function to add the data to the database
     */
    add_new_misc: add_misc_if_new,

    /**
     * Add multiple objects / documents to a collection in our database.  This function changes
     * some key-value pairs, and adds two new properties - creation_type and update_type
     *
     * @param {database} db - The database we are modifying
     * @param {array} documents - The array of document objects we are adding
     * @param {string} collection - The name of the collection of the database we are modifying
     */
    add_multiple_misc: add_multiple_misc_util,

    /**
     * Modify a game's key names
     * 
     * @return {game} game - The modified game
     * @param {game} game - The game to modify and return
     */
    modify_game_exported: modify_game
}

