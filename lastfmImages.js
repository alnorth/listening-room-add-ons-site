var lfm_api = require('./lastfm.api');
var db = require('./db');
var path = require('path');
var fs = require('fs');
var requestLib = require('request');
var url = require('url');

var lastfm = new lfm_api.LastFM({
	apiKey    : 'c0db7c8bfb98655ab25aa2e959fdcc68',
	apiSecret : 'aff4890d7cb9492bc72250abbeffc3e1'
});

function getAlbumImageFromLastFm(artist, album, callback) {
   	lastfm.album.getInfo({artist: artist, album: album}, {success: function(data){
        var lastfmImageUrl;
		if(data && data.album && data.album.image) {
			for(var i = data.album.image.length - 1; i >=0; i--) {
                if(lastfmImageUrl == undefined && data.album.image[i] != "") {
					lastfmImageUrl = data.album.image[i]["#text"];
				}
			}
		}
        callback(lastfmImageUrl);
	}, error: function(code, message){
		callback(undefined);
	}});
}

function getImageFilename(trackId, albumId, dir) {
    if(albumId) {
        return "images/album/"+ dir +"/"+ albumId +".jpg";
    } else {
        return "images/track/"+ dir +"/"+ trackId +".jpg";
    }
}

function sendImage(response, imagePath) {
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

function downloadImage(imageUrl, filename, callback) {
    requestLib({uri: imageUrl, encoding: "binary"}, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            fs.writeFile(filename, body, "binary", function(err) {
                callback(true);
            });
        } else {
            callback(false);
        }
    });
}

function sendAlbumImage(response, albumId, artist, album, failureCallback) {
    var albumFile = getImageFilename(undefined, albumId, "original");
    path.exists(albumFile, function(exists) {
        if(exists) {
            sendImage(response, albumFile);
        } else {
            getAlbumImageFromLastFm(artist, album, function(imageUrl) {
                if(imageUrl) {
                    downloadImage(imageUrl, albumFile, function(result) {
                        sendImage(response, albumFile);
                    });
                } else {
                    failureCallback();
                }
            });
        }
    });
}

function getImage(request, response, size) {
    var urlObj = url.parse(request.url, true);
		
    //TODO: Check parameters
	db.addTrack(urlObj.query, function (trackId, artistId, albumId) {
        sendAlbumImage(response, albumId, urlObj.query["artist"], urlObj.query["album"], function() {
        });
	});
}
exports.getImage = getImage;
