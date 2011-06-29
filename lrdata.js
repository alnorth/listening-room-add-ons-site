var clutch = require('clutch');
var jade = require('jade');
var url = require('url');
var db = require('./db');
var v1api = require('./v1api');
var lastfmImages = require('./lastfmImages');
var staticfile = require("./staticfile");

function addTrackPlay(request, response) {
    var urlObj = url.parse(request.url, true);
    var jsonCallback = urlObj.query["callback"];
	var ip = request.connection.remoteAddress;
	if(ip === "127.0.0.1" && request.headers["x-forwarded-for"]) {
		ip = request.headers["x-forwarded-for"];
	}
    db.addTrackPlay(urlObj.query, ip, function(trackId, artistId, playId, err) {
    	response.writeHead(200, {'Content-Type': 'text/javascript'});
    	response.write(jsonCallback +'({"trackId":'+ trackId +', "artistId":'+ artistId +', "playId": '+ playId +'});');
		response.end();
    });
}

function getImage(request, response, type, size) {
	var pixels;
	if(size === "small") {
		pixels = 30;
	} else if(size === "record") {
		pixels = 190;
	}
	lastfmImages.getImage(request, response, type, pixels);
}

function oldGetTrackImage(request, response) {
	lastfmImages.getImage(request, response, "album", 190);
}

function renderToResponse(filename, options, response) {
    jade.renderFile(filename, options, function(err, html){
        if(err) {
            console.log(err);
        } else {
            response.writeHead(200, {'Content-Type': 'text/html'});
            response.write(html);
            response.end();
        }
    });
}

function v1ApiDocs(request, response) {
    var host = request.headers.host || "lrdata.alnorth.com";
    renderToResponse("templates/v1api.jade", {locals: {root: "http://"+ host +"/v1/"}}, response);
}

function v1ApiCall(request, response, pagename) {
	v1api.call(request, response, pagename);
}

exports.urls = clutch.route404([['GET /$', v1ApiDocs],
                                ['GET /addtrackplay/$', addTrackPlay],
                                ['GET /image/(\\w+)/(\\w+)/$', getImage],
								['GET /trackimage/$', oldGetTrackImage], // Backwards compatability, can be removed later
								['GET /v1/(\\w+)\.json$', v1ApiCall],
                                ["GET /static/(\\w+\\.\\w+)$", staticfile.serve]]);
