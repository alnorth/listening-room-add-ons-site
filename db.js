var mysql = require('mysql');
var config = require('./config');

var Client = mysql.Client;
var client = new Client();

client.database = config.dbname;
client.user = config.dbuser;
client.password = config.dbpassword;

client.connect();

function upsert(insertQuery, insertData, selectQuery, selectData, callback) {
	client.query(insertQuery, insertData, function(err, info) {
		if(info.insertId == 0) {
			// The value was already in the database, and so no insert occurred.
			client.query(selectQuery, selectData, function(err, results, fields) {
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
	upsert("INSERT IGNORE INTO USER(lr_id, username) VALUES(?, ?);",
		[lrId, name],
		"SELECT id FROM USER WHERE lr_id = ?;",
		[lrId],
		callback);
}

function createArtist(name, callback) {
	upsert("INSERT IGNORE INTO ARTIST(name) VALUES(?);",
		[name],
		"SELECT id FROM ARTIST WHERE name = ?;",
		[name],
		callback);
}

function createAlbum(artistId, name, callback) {
	if(name && name != "") {
		upsert("INSERT IGNORE INTO ALBUM(artist_id, name) VALUES(?, ?);",
			[artistId, name],
			"SELECT id FROM ALBUM WHERE artist_id = ? AND name = ?;",
			[artistId, name],
			callback);
	} else {
		callback();
	}
}

function createTrack(artistId, albumId, name, callback) {
	upsert("INSERT IGNORE INTO TRACK(artist_id, name) VALUES(?, ?);",
		[artistId, name],
		"SELECT id FROM TRACK WHERE artist_id = ? AND name = ?;",
		[artistId, name],
		callback);
}

function createTrackPlay(lrId, trackId, userId, roomId, albumId, played, callback) {
	upsert("INSERT IGNORE INTO TRACK_PLAY(lr_id, track_id, user_id, room_id, album_id, played) VALUES(?, ?, ?, ?, ?, ?);",
		[lrId, trackId, userId, roomId, albumId, played],
		"SELECT id FROM TRACK_PLAY WHERE lr_id = ?;",
		[lrId],
		callback);
}

function createTrackPlayReport(playId, userId, callback) {
	upsert("INSERT IGNORE INTO TRACK_PLAY_REPORT(play_id, user_id) VALUES(?, ?);",
		[playId, userId],
		"SELECT id FROM TRACK_PLAY_REPORT WHERE play_id = ? AND user_id = ?;",
		[playId, userId],
		callback);
}

function addTrackPlay(trackData, callback) {
	createRoom(trackData["room"], function(roomId) {
		createUser(trackData["userId"], trackData["user"], function(userId) {
			createArtist(trackData["artist"], function(artistId) {
				createAlbum(artistId, trackData["album"], function(albumId) {
					createTrack(artistId, trackData["title"], function(trackId) {
						createTrackPlay(trackData["id"], trackId, userId, roomId, albumId, new Date(trackData["timestamp"]), function(playId) {
							createUser(trackData["reportedByUserId"], trackData["reportedByUser"], function(reportedByUserId) {
								createTrackPlayReport(playId, reportedByUserId, function(reportId) {
									callback(trackId, playId);
								});
							});
						});
					});
				});
			});
		});
	});
}
exports.addTrackPlay = addTrackPlay;
