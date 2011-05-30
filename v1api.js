var url = require('url');
var db = require('./db');

function call(request, response, pagename) {
	var urlObj = url.parse(request.url, true);
	var type = urlObj.query["type"];
	
	var fieldsData = getFieldsData(pagename, type);
	
	if(fieldsData && checkRequiredParams(pagename, urlObj)) {
	
		var fields = "SELECT ";
		if(fieldsData.fields.u) {fields += "u.username AS username, u.id AS user_id, u.lr_id AS user_lr_id, ";}
		if(fieldsData.fields.t) {fields += "t.name AS track_title, t.id AS track_id, ";}
		if(fieldsData.fields.art) {fields += "art.name AS artist_name, art.id AS artist_id, ";}
		if(fieldsData.fields.p) {fields += "UNIX_TIMESTAMP(p.played) as play_date, p.lr_id AS play_lr_id, ";}
		if(fieldsData.fields.count) {fields += "COUNT(*) AS plays, ";}
		fields = fields.substring(0, fields.length - 2); // Remove the last comma
	
		var joins = " FROM TRACK_PLAY p JOIN ROOM r ON r.id = p.room_id ";
		if(pagename == "user" || fieldsData.fields.u) {joins += "JOIN USER u ON u.id = p.user_id ";}
		if(pagename == "track" || fieldsData.fields.t || fieldsData.fields.art) {joins += "JOIN TRACK t ON t.id = p.track_id ";}
		if(pagename == "artist" || pagename == "track" || fieldsData.fields.art) {joins += "JOIN ARTIST art ON art.id = t.artist_id ";}
		
		var whereClauses = [];
		var whereParams = [];
		whereClauses.push("r.name = ?");
		whereParams.push(urlObj.query["room"]);
		if(pagename == "artist" && checkParam(urlObj, "id")) {
			whereClauses.push("art.id = ?");
			whereParams.push(urlObj.query["id"]);
		} else if(pagename == "artist" && checkParam(urlObj, "artist_name")) {
			whereClauses.push("art.name = ?");
			whereParams.push(urlObj.query["artist_name"]);
		} else if(pagename == "track" && checkParam(urlObj, "id")) {
			whereClauses.push("t.id = ?");
			whereParams.push(urlObj.query["id"]);
		} else if(pagename == "track" && checkParam(urlObj, "artist_name") && checkParam(urlObj, "track_title")) {
			whereClauses.push("art.name = ?");
			whereParams.push(urlObj.query["artist_name"]);
			whereClauses.push("t.name = ?");
			whereParams.push(urlObj.query["track_title"]);
		} else if(pagename == "user" && checkParam(urlObj, "id")) {
			whereClauses.push("u.id = ?");
			whereParams.push(urlObj.query["id"]);
		} else if(pagename == "user" && checkParam(urlObj, "username")) {
			whereClauses.push("u.username = ?");
			whereParams.push(urlObj.query["username"]);
		}
		
		if(checkParam(urlObj, "from")) {
			whereClauses.push("UNIX_TIMESTAMP(p.played) >= ?");
			whereParams.push(urlObj.query["from"]);
		}
		if(checkParam(urlObj, "to")) {
			whereClauses.push("UNIX_TIMESTAMP(p.played) <= ?");
			whereParams.push(urlObj.query["to"]);
		}
		
		var where = "WHERE ";
		var params = [];
		for(var i = 0; i < whereClauses.length; i++) {
			where += whereClauses[i];
			where += " AND ";
			params.push(whereParams[i]);
		}
		where = where.substring(0, where.length - 5); // Remove the last " AND "
	
		var group = "";
		if(fieldsData.fields.count) {
			group = " GROUP BY ";
			if(fieldsData.fields.u) {group += "u.username, u.id, u.lr_id, ";}
			if(fieldsData.fields.t) {group += "t.name, t.id, ";}
			if(fieldsData.fields.art) {group += "art.name, art.id, ";}
			if(fieldsData.fields.p) {group += "p.played, p.lr_id, ";}
			group = group.substring(0, group.length - 2); // Remove the last comma
		}
		
		var order = " ORDER BY ";
		if(checkParam(urlObj, "order") && fieldsData.allowed_ordering[urlObj.query["order"].toLowerCase()]) {
			// It's matched one of our allowed orderings, so it should be safe to add it to our string
			order += urlObj.query["order"];
			if(checkParam(urlObj, "order_type") && urlObj.query["order_type"].toLowerCase() == "desc") {
				order += " DESC";
			}
		} else {
			order += fieldsData.default_ordering;
		}
		order += " ";
		
		var limit = "LIMIT ?, ? ";
		if(checkParam(urlObj, "offset")) {
			params.push(urlObj.query["offset"]);
		} else {
			params.push(0);
		}
		if(checkParam(urlObj, "limit") && urlObj.query["limit"] <= 200) {
			params.push(urlObj.query["limit"]);
		} else {
			params.push(200);
		}
	
		var sql = fields + joins + where + group + order + limit;
		
		db.query(sql, params, function(err, results, fields) {
			if(err) {console.log(err)};
			
			response.writeHead(200, {'Content-Type': 'text/javascript'});
			var resultString = JSON.stringify(results);
			if(checkParam(urlObj, "callback")) {
				response.write(urlObj.query["callback"] + "(" + resultString + ");");
			} else {
				response.write(resultString);
			}
			response.end();
		});
		
		
	} else {
		response.writeHead(400, {'Content-Type': 'text/javascript'});
    	response.write('Parameters missing. See API documentation for details.');
		response.end();
	}
}
exports.call = call;

var fieldsDataNoType = {
	all_artists: {
		fields: {art: true, count: true},
		allowed_ordering: {artist_name: true, plays: true},
		default_ordering: "plays DESC"
	},
	all_tracks: {
		fields: {art: true, t: true, count: true},
		allowed_ordering: {artist_name: true, track_title: true, plays: true},
		default_ordering: "plays DESC"
	},
	all_users: {
		fields: {u: true, count: true},
		allowed_ordering: {username: true, plays: true},
		default_ordering: "plays DESC"
	}
};

var fieldsDataWithType = {
	artist: {
		tracks: {
			fields: {t: true, count: true},
			allowed_ordering: {track_title: true, plays: true},
			default_ordering: "plays DESC"
		},
		users: {
			fields: {u: true, count: true},
			allowed_ordering: {username: true, plays: true},
			default_ordering: "plays DESC"
		},
		all_plays: {
			fields: {p: true, u: true, t: true},
			allowed_ordering: {username: true, track_title: true, play_date: true},
			default_ordering: "play_date DESC"
		}
	},
	track: {
		users: {
			fields: {u: true, count: true},
			allowed_ordering: {username: true, plays: true},
			default_ordering: "plays DESC"
		},
		all_plays: {
			fields: {p: true, u:true},
			allowed_ordering: {username: true, play_date: true},
			default_ordering: "play_date DESC"
		}
	},
	user: {
		artists: {
			fields: {art: true, count: true},
			allowed_ordering: {artist_name: true, plays: true},
			default_ordering: "plays DESC"
		},
		tracks: {
			fields: {art: true, t: true, count: true},
			allowed_ordering: {artist_name: true, track_title: true, plays: true},
			default_ordering: "plays DESC"
		},
		all_plays: {
			fields: {art: true, t: true, p: true},
			allowed_ordering: {artist_name: true, track_title: true, play_date: true},
			default_ordering: "play_date DESC"
		}
	}
};

function getFieldsData(pagename, type) {
	if(fieldsDataNoType[pagename]) {
		return fieldsDataNoType[pagename];
	} else if(fieldsDataWithType[pagename] && fieldsDataWithType[pagename][type]) {
		return fieldsDataWithType[pagename][type];
	}
}

function checkParam(urlObj, name) {
	return urlObj.query[name] && urlObj.query[name] != "";
}

function checkRequiredParams(pagename, urlObj) {
	if(checkParam(urlObj, "room")) {
		if(pagename == "all_artists" || pagename == "all_tracks" || pagename == "all_users") {
			return true;
		} else if(pagename == "artist") {
			return checkParam(urlObj, "id") || checkParam(urlObj, "artist_name");
		} else if(pagename == "track") {
			return checkParam(urlObj, "id") || (checkParam(urlObj, "artist_name") && checkParam(urlObj, "track_title"));
		} else if(pagename == "user") {
			return checkParam(urlObj, "id") || checkParam(urlObj, "username");
		}
	}
	return false;
	
	// Check that parameters that should be integers are integers
}

