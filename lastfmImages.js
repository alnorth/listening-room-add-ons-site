var lfm_api = require('./lastfm.api');
var db = require('./db');
var path = require('path');
var fs = require('fs');
var requestLib = require('request');
var url = require('url');
var imagemagick = require('imagemagick');
var mkdirp = require('mkdirp').mkdirp;

var lastfm = new lfm_api.LastFM({
	apiKey    : 'c0db7c8bfb98655ab25aa2e959fdcc68',
	apiSecret : 'aff4890d7cb9492bc72250abbeffc3e1'
});

function fetchAndSendImage(urlQuery, response, type, size, ids, errCallback) {
	if(ids[type]) {
		hasFailureBeenRecorded(type, ids[type], size, errCallback, function() {
			var resizedImageFile = getImageFilename(type, ids[type], size);
    
			path.exists(resizedImageFile, function(exists) {
				if(exists) {
					sendImage(response, resizedImageFile);
				} else {
					getOriginalSizeImage(urlQuery, type, function(fileData) {
						if(fileData) {
							resizeImage(fileData, resizedImageFile, size, function(success) {
								if(success) {
									sendImage(response, resizedImageFile);
								} else {
									errCallback();
								}
							});
						} else {
							errCallback();
						}
					});
				}
			});
		});
	} else {
		errCallback();
	}
}

function getOriginalSizeImage(urlQuery, type, callback) {
    getImageUrlFromLastFm(urlQuery, type, function(imageUrl) {
        if(imageUrl) {
            downloadImage(imageUrl, function(fileData) {
                callback(fileData);
            });
        } else {
            callback(undefined);
        }
    });
}

function getImageUrlFromLastFm(urlQuery, type, callback) {
	switch(type) {
		case "album":
			lastfm.album.getInfo({artist: urlQuery.artist, album: urlQuery.album}, {success: function(data){
				var lastfmImageUrl;
				if(data && data.album && data.album.image) {
					lastfmImageUrl = getImageFromLastFmArray(data.album.image);
				}
				callback(lastfmImageUrl);
			}, error: function(code, message){
				callback(undefined);
			}});
			break;
		case "artist":
			lastfm.artist.getInfo({artist: urlQuery.artist}, {success: function(data){
				var lastfmImageUrl;
				if(data && data.artist && data.artist.image) {
					lastfmImageUrl = getImageFromLastFmArray(data.artist.image);
				}
				callback(lastfmImageUrl);
			}, error: function(code, message){
				callback(undefined);
			}});
			break;
		case "track":
			lastfm.track.getInfo({artist: urlQuery.artist, track: urlQuery.title}, {success: function(data){
				var lastfmImageUrl;
				if(data && data.track && data.track.album && data.track.album.image) {
					lastfmImageUrl = getImageFromLastFmArray(data.track.album.image);
				}
				callback(lastfmImageUrl);
			}, error: function(code, message){
				callback(undefined);
			}});
			break;
	}
}

function getImageFromLastFmArray(arr) {
	var url;
	for(var i = arr.length - 1; i >=0; i--) {
		if(url == undefined && arr[i] != "") {
			url = arr[i]["#text"];
		}
	}
	return url;
}

function getImageFilename(type, id, size) {
    return "images/"+ type +"/"+ size +"/"+ id +".jpg";
}

function getFailureFilename(type, id, size) {
    return "images/"+ type +"/"+ size +"/"+ id +"_missing.txt";
}

function hasFailureBeenRecorded(type, id, size, yesCallback, noCallback) {
    var failureFileName = getFailureFilename(type, id, size);
    path.exists(failureFileName, function(exists) {
        if(exists) {
            yesCallback();
        } else {
            noCallback();
        }
    });
}

function recordFailure(type, id, size) {
    var failureFileName = getFailureFilename(type, id, size);
    ensureDirectory(failureFileName, function() {
        fs.writeFile(failureFileName, "", function(err) {
            if(err) {
                console.log(err);
            }
        });
    });
}

function resizeImage(fileData, newFile, size, callback) {
    ensureDirectory(newFile, function() {
        imagemagick.resize({srcData: fileData, dstPath: newFile, width: size}, function(err, stdout, stderr) {
            if(err) {
                console.log(err);
                callback(false);
            } else {
                callback(true);
            }
        });
    });
}

function ensureDirectory(filePath, callback) {
    var dir = path.join(process.cwd(), path.dirname(filePath));
    path.exists(dir, function(exists) {
        if(!exists) {
            mkdirp(dir, 0755, function(err) {
                if(err) {
                    console.log(err);
                }
                callback();
            });
        } else {
            callback();
        }
    });
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

function checkParams(urlQuery, params) {
	var i;
	for(i = 0; i < params.length; i++) {
		if(!(urlQuery[params[i]] && urlQuery[params[i]])) {
			return false;
		}
	}
	return true;
}

function getEntityIds(urlQuery, type, callback) {
	switch(type) {
		case "artist":
			db.addArtist(urlQuery, function (artistId) {
				callback({"artist": artistId});
			});
			break;
		case "track":
			db.addTrack(urlQuery, function (trackId, artistId, albumId) {
				callback({"track": trackId, "artist": artistId, "album": albumId});
			});
			break;
	}
}

var mandatoryParams = {
	"artist": ["artist"],
	"track": ["artist", "title"]
};

function getImage(request, response, type, size) {
	var urlQuery = url.parse(request.url, true).query,
		params = mandatoryParams[type];
	
	if(params && checkParams(urlQuery, params)) {
		getEntityIds(urlQuery, type, function(ids) {
			if(type === "track") {
				fetchAndSendImage(urlQuery, response, "album", size, ids, function() {
					fetchAndSendImage(urlQuery, response, "track", size, ids, function() {
						sendImage(response, "none");
					});
				});
			} else {
				fetchAndSendImage(urlQuery, response, type, size, ids, function() {
					sendImage(response, "none");
				});
			}
		});
	} else {
		sendImage(response, "none");
	}
}
exports.getImage = getImage;
