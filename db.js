var mysql = require('mysql');
var config = require('./config');

var Client = mysql.Client;
var client = new Client();

client.database = config.dbname;
client.user = config.dbuser;
client.password = config.dbpassword;

client.connect();

exports.query = function(sql, data, callback) {
	client.query(sql, data, callback);
}

function upsert(insertQuery, insertData, selectQuery, selectData, callback) {
	client.query(insertQuery, insertData, function(err, info) {
		if(err) {console.log(err)};
		if(info.insertId == 0) {
			// The value was already in the database, and so no insert occurred.
			client.query(selectQuery, selectData, function(err, results, fields) {
				if(err) {console.log(err)};
				callback(results[0]["id"]);
			});
		} else {
			// We did an insert, call back with the ID.
			callback(info.insertId);
		}
	});
}

function createRoom(name, callback) {
	upsert("INSERT IGNORE INTO ROOM(name) VALUES(?);",
		[name],
		"SELECT id FROM ROOM WHERE name = ?;",
		[name],
		callback);
}

function createUser(lrId, name, callback) {
	if(name == "") {
		name = undefined;
	}
	client.query("INSERT IGNORE INTO USER(lr_id, username) VALUES(?, ?);", [lrId, name], function(err, info) {
		if(err) {console.log(err)};
		if(info.insertId == 0) {
			// The value was already in the database, and so no insert occurred.
			client.query("SELECT id, username FROM USER WHERE lr_id = ?;", [lrId], function(err, results, fields) {
				if(err) {console.log(err)};
				// We don't always get sent the user name, so it could be NULL in the DB
				if(!results[0]["username"] && name) {
					client.query("UPDATE USER SET username = ? WHERE lr_id = ?;", [name, lrId]);
				}
				callback(results[0]["id"]);
			});
		} else {
			// We did an insert, call back with the ID.
			callback(info.insertId);
		}
	});
}

function createArtist(name, callback) {
	upsert("INSERT IGNORE INTO ARTIST(name) VALUES(?);",
		[name],
		"SELECT id FROM ARTIST WHERE name = ?;",
		[name],
		callback);
}

function createAlbum(artistId, name, callback) {
	if(name && name != "" && name != "null") {
		upsert("INSERT IGNORE INTO ALBUM(artist_id, name) VALUES(?, ?);",
			[artistId, name],
			"SELECT id FROM ALBUM WHERE artist_id = ? AND name = ?;",
			[artistId, name],
			callback);
	} else {
		callback();
	}
}

function createTrack(artistId, name, callback) {
	upsert("INSERT IGNORE INTO TRACK(artist_id, name) VALUES(?, ?);",
		[artistId, name],
		"SELECT id FROM TRACK WHERE artist_id = ? AND name = ?;",
		[artistId, name],
		callback);
}

function createTrackPlay(lrId, trackId, userId, roomId, albumId, played, callback) {
	upsert("INSERT IGNORE INTO TRACK_PLAY(lr_id, track_id, user_id, room_id, album_id, played) VALUES(?, ?, ?, ?, ?, FROM_UNIXTIME(?));",
		[lrId, trackId, userId, roomId, albumId, played],
		"SELECT id FROM TRACK_PLAY WHERE lr_id = ?;",
		[lrId],
		callback);
}

function createTrackPlayReport(playId, userId, ip, callback) {
	upsert("INSERT IGNORE INTO TRACK_PLAY_REPORT(play_id, user_id, ip) VALUES(?, ?, ?);",
		[playId, userId, ip],
		"SELECT id FROM TRACK_PLAY_REPORT WHERE play_id = ? AND user_id = ?;",
		[playId, userId],
		callback);
}

function checkParam(trackData, name) {
	return trackData[name] && trackData[name] != "";
}

function addTrack(trackData, callback) {
	createArtist(trackData["artist"], function(artistId) {
		createAlbum(artistId, trackData["album"], function(albumId) {
			createTrack(artistId, trackData["title"], function(trackId) {
				callback(trackId, artistId, albumId);
			});
		});
	});
}
exports.addTrack = addTrack;

function addTrackPlay(trackData, ip, callback) {
	if(checkParam(trackData, "room") && checkParam(trackData, "userId") && checkParam(trackData, "artist") && checkParam(trackData, "title") && checkParam(trackData, "timestamp") && checkParam(trackData, "reportedByUserId")) {
		createRoom(trackData["room"], function(roomId) {
			createUser(trackData["userId"], trackData["user"], function(userId) {
				addTrack(trackData, function(trackId, artistId, albumId) {
					var timestamp = Math.floor(parseInt(trackData["timestamp"]) / 1000);
					createTrackPlay(trackData["id"], trackId, userId, roomId, albumId, timestamp, function(playId) {
						createUser(trackData["reportedByUserId"], trackData["reportedByUser"], function(reportedByUserId) {
							createTrackPlayReport(playId, reportedByUserId, ip, function(reportId) {
								callback(trackId, artistId, playId, undefined);
							});
						});
					});
				});
			});
		});
	} else {
		callback(0, 0, 0, undefined);
	}
}
exports.addTrackPlay = addTrackPlay;
