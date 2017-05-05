$("a#search_igdb").click(function() {
    $.post("./search",
    {
        "term": term,
        "igdb": true
    },
    function(data, status) {
        var newDoc = document.open("text/html", "replace");
        newDoc.write(data);
        newDoc.close();
    })
    return false
})

