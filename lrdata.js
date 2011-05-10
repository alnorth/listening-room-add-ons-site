var clutch = require('clutch');
var url = require('url');
var db = require('./db');
var v1api = require('./v1api');

function addTrackPlay(request, response) {
    var urlObj = url.parse(request.url, true);
    var jsonCallback = urlObj.query["callback"];
    db.addTrackPlay(urlObj.query, request.connection.remoteAddress, function(trackId, artistId, playId, err) {
    	response.writeHead(200, {'Content-Type': 'text/javascript'});
    	if(err) {
    		response.write(jsonCallback +'({"err":'+ err +'});');
    	} else {
    		response.write(jsonCallback +'({"trackId":'+ trackId +', "artistId":'+ artistId +', "playId": '+ playId +'});');
    	}
		response.end();
    });
}

function getTrackImage(request, response, id) {
	console.log("Track " + id);
	response.end();
}

function v1ApiCall(request, response, pagename) {
	v1api.call(request, response, pagename);
}

exports.urls = clutch.route404([['GET /addtrackplay/$', addTrackPlay],
                                ['GET /trackimage/(\\d+)/$', getTrackImage],
								['GET /v1/(\\w+)\.json$', getTrackImage]]);
