var unirest = require('unirest');

/**
 * Gets misc JSON from given IDs.  The callback method processes
 * the JSON data.
 * 
 * @param {string} endpoint - The string value of the IGDB endpoint to query
 * @param {array} ids - The ids to lookup
 * @param {function} callback - The callback method to process the JSON
 * @param {database} db - The database we're modifying
 * @param {string} collection - The name of the db collection we're modifying
 */
function info_from_ids_utility(endpoint, ids, callback, db, collection)
{
    var length = ids.length
    var idString = ""
    var i = 0

    for (id in ids)
    {
        idString += ids[id]
        i++
        if (i != length) idString += ","
    }

    var url = "https://igdbcom-internet-game-database-v1.p.mashape.com/" + endpoint + "/" + idString
    url += "?fields=*&limit=50&offset=0&order=release_dates.date%3Adesc"

    unirest.get(url)
    .header("X-Mashape-Key", "dQtO1a7QyJmshSrJmUrkPain3Wayp1xZKREjsnNbLrTzbTK52Q") //Od0UAN8Yv5mshjdZcrIHtVoDYFBCp1EK4ZLjsnaiKAOgkStI4x
    .header("Accept", "application/json")
    .end(function(response) {
        if (collection != undefined && db != undefined) {
            callback(db, response.body, collection)
        }
        else {
            callback(response.body)
        }
    })
}

module.exports = {
        info_from_ids: info_from_ids_utility
}

/** New Example vv */
// function ex(result) {
//     console.log(result.body)
// }

// info_from_ids_utility("companies", [70, 70, 2850, 4034], ex)


/** Old Example vv */
// function ex(result) {
//     console.log(result.body)
// }

// game_info_from_ids([7346,1,2,3,4,5], ex)


