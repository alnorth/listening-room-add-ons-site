var clutch = require('clutch');
var url = require('url');
var db = require('./db');
var v1api = require('./v1api');
var lfm_api = require('./lastfm.api');
var fs = require('fs');

var lastfm = new lfm_api.LastFM({
	apiKey    : 'c0db7c8bfb98655ab25aa2e959fdcc68',
	apiSecret : 'aff4890d7cb9492bc72250abbeffc3e1'
});

function addTrackPlay(request, response) {
    var urlObj = url.parse(request.url, true);
    var jsonCallback = urlObj.query["callback"];
    db.addTrackPlay(urlObj.query, request.connection.remoteAddress, function(trackId, artistId, playId, err) {
    	response.writeHead(200, {'Content-Type': 'text/javascript'});
    	response.write(jsonCallback +'({"trackId":'+ trackId +', "artistId":'+ artistId +', "playId": '+ playId +'});');
		response.end();
    });
}

function getAlbumImageFromLastFm(artist, album, callback) {
	lastfm.album.getInfo({artist: artist, album: album}, {success: function(data){
		if(data && data.album && data.album.image) {
			var lastfmImageUrl;
			for(var i = data.album.image.length - 1; i >=0; i--) {
				if(lastfmImageUrl == undefined && data.album.image[i] != "") {
					lastfmImageUrl = data.album.image[i]["#text"];
				}
			}
			callback(lastfmImageUrl);
		}
	}, error: function(code, message){
		callback(undefined);
	}});
}

function getTrackImage(request, response) {
	var urlObj = url.parse(request.url, true);
	var sendImage = function(imagePath) {
		if(imagePath != "none") {
			fs.readFile(imagePath, function (err, data) {
				response.writeHead(200, {'Content-Type': 'image/jpeg'});
				response.write(data);
				response.end();
			});
		} else {
			response.writeHead(404, {'Content-Type': 'text/html'});
			response.write("No image available");
			response.end();
		}
	};
	
	db.addTrack(urlObj.query, function (trackId, artistId, albumId) {
		db.query("SELECT t.image_path AS track_image, a.image_path AS album_image FROM TRACK t LEFT OUTER JOIN ALBUM a ON a.id = ? WHERE t.id = ?", [albumId, trackId], function(err, results, fields) {
			if(results[0]["album_image"]) {
				sendImage(results[0]["album_image"]);
			} else if(results[0]["track_image"]) {
				sendImage(results[0]["track_image"]);
			} else {
				getAlbumImageFromLastFm(urlObj.query["artist"], urlObj.query["album"], function(artUrl) {
				
				});
			}
		});
	});
}

function v1ApiCall(request, response, pagename) {
	v1api.call(request, response, pagename);
}

exports.urls = clutch.route404([['GET /addtrackplay/$', addTrackPlay],
                                ['GET /trackimage/$', getTrackImage],
								['GET /v1/(\\w+)\.json$', v1ApiCall]]);
