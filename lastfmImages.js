var lfm_api = require('./lastfm.api');
var db = require('./db');
var path = require('path');
var fs = require('fs');
var requestLib = require('request');
var url = require('url');
var imagemagick = require('imagemagick');

var lastfm = new lfm_api.LastFM({
	apiKey    : 'c0db7c8bfb98655ab25aa2e959fdcc68',
	apiSecret : 'aff4890d7cb9492bc72250abbeffc3e1'
});

function getAlbumImageUrlFromLastFm(artist, album, callback) {
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

function downloadImage(imageUrl, callback) {
    requestLib({uri: imageUrl, encoding: "binary"}, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            callback(body);
        } else {
            callback(undefined);
        }
    });
}

function getOriginalSizeImage(albumId, artist, album, callback) {
    getAlbumImageUrlFromLastFm(artist, album, function(imageUrl) {
        if(imageUrl) {
            downloadImage(imageUrl, function(fileData) {
                callback(fileData);
            });
        } else {
            callback(undefined);
        }
    });
}

function resizeImage(fileData, newFile, size, callback) {
    imagemagick.resize({srcData: fileData, dstPath: newFile, width: size}, function(err, stdout, stderr) {
        if(err) {
            console.log(err);
            callback(false);
        } else {
            callback(true);
        }
    });
}

function sendAlbumImage(response, albumId, artist, album, size, failureCallback) {
    var resizedAlbumFile = getImageFilename(undefined, albumId, size);
    path.exists(resizedAlbumFile, function(exists) {
        if(exists) {
            sendImage(response, resizedAlbumFile);
        } else {
            getOriginalSizeImage(albumId, artist, album, function(fileData) {
                if(fileData) {
                    resizeImage(fileData, resizedAlbumFile, size, function(success) {
                        if(success) {
                            sendImage(response, resizedAlbumFile);
                        } else {
                            failureCallback();
                        }
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
    //TODO: Make directories if they're missing
    //TODO: Get track image if no album
    //TODO: Deal properly with getting no response from Last.fm (we don't want to keep going back to them).
    //TODO: Don't even save the original
    //TODO: Make sure we're not doing more than one request at a time for the same track
    //TODO: Make it all nice
    //TODO: Only download medium images if we can get away with it
	db.addTrack(urlObj.query, function (trackId, artistId, albumId) {
        sendAlbumImage(response, albumId, urlObj.query["artist"], urlObj.query["album"], size, function() {
        });
	});
}
exports.getImage = getImage;
