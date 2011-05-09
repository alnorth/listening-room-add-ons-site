var clutch = require('clutch');
var url = require('url');
var db = require('./db');

function helloSomeone(request, response, name) {
    response.writeHead(200, {'Content-Type': 'text/plain'});
    response.end('Hello '+name+'!\n');
}

function addTrackPlay(request, response) {
    var urlObj = url.parse(request.url, true);
    var jsonCallback = urlObj.query["callback"];
    db.addTrackPlay(urlObj.query, function(trackId, playId) {
    	response.writeHead(200, {'Content-Type': 'text/javascript'});
		response.write(jsonCallback +'({"trackId":'+ trackId +', "playId": '+ playId +'});');
		response.end();
    });
}

function getTrackImage(request, response, id) {
	console.log("Track " + id);
	response.end();
}

exports.urls = clutch.route404([['GET /addtrackplay/$', addTrackPlay],
                                ['GET /trackimage/(\\d+)/$', getTrackImage]]);
