var url = require('url');
var db = require('./db');

function call(request, response, pagename) {
	var urlObj = url.parse(request.url, true);
	var type = urlObj.query["type"];
	
	var fieldsData = getFieldsData(pagename, type);
    
    var errors = checkAllParams(pagename, urlObj);
    if(!fieldsData) {
        errors.push("Invalid combination of page name and type parameter.");
    }
	
	if(errors.length === 0) {
	
		var fields = "SELECT ";
		if(fieldsData.fields.u) {fields += "u.username AS username, u.id AS user_id, u.lr_id AS user_lr_id, ";}
		if(fieldsData.fields.t) {fields += "t.name AS track_title, t.id AS track_id, ";}
		if(fieldsData.fields.art) {fields += "art.name AS artist_name, art.id AS artist_id, ";}
		if(fieldsData.fields.p) {fields += "UNIX_TIMESTAMP(p.played) as play_date, p.lr_id AS play_lr_id, ";}
		if(fieldsData.fields.tag) {fields += "tag.tag as tag_name, SUM(tag.lfm_count) AS tag_count, ";}
		if(fieldsData.fields.count) {fields += "COUNT(*) AS plays, ";}
		fields = fields.substring(0, fields.length - 2); // Remove the last comma
	
		var joins = " FROM TRACK_PLAY p JOIN ROOM r ON r.id = p.room_id ";
		if(pagename == "user" || fieldsData.fields.u) {joins += "JOIN USER u ON u.id = p.user_id ";}
		if(pagename == "artist" || pagename == "track" || fieldsData.fields.t || fieldsData.fields.art) {joins += "JOIN TRACK t ON t.id = p.track_id ";}
		if(pagename == "artist" || pagename == "track" || fieldsData.fields.art) {joins += "JOIN ARTIST art ON art.id = t.artist_id ";}
		if(fieldsData.fields.tag) {joins += "JOIN TRACK_TAG tag ON tag.track_id = p.track_id ";}
		
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
			if(fieldsData.fields.tag) {group += "tag.tag, ";}
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
		
        // Use parseInt to double check that we're not opening ourselves up to attack here
		var limit = "LIMIT ";
		if(checkParam(urlObj, "offset")) {
			limit += parseInt(urlObj.query["offset"], 10);
		} else {
			limit += "0";
		}
		limit += ", ";
		if(checkParam(urlObj, "limit") && urlObj.query["limit"] <= 200) {
			limit += parseInt(urlObj.query["limit"], 10);
		} else {
			limit += "200";
		}
		limit += " ";
	
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
    	response.write(JSON.stringify(errors));
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
		tags: {
			fields: {tag: true},
			allowed_ordering: {tag_name: true, tag_count: true},
			default_ordering: "tag_count DESC"
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

function isInt(value) { 
    if((parseFloat(value) == parseInt(value)) && !isNaN(value)){
        return true;
    } else { 
        return false;
    } 
}

function checkAllParams(pagename, urlObj) {
    var errors = [];
    
	if(!checkParam(urlObj, "room")) {
        errors.push("room parameter not present.");
    }
    if(pagename == "artist") {
        if(checkParam(urlObj, "id")) {
            if(!isInt(urlObj.query["id"])) {
                errors.push("id must be an integer");
            }
        } else if(!checkParam(urlObj, "artist_name")) {
            errors.push("For artist data you must provide either an id or an artist_name.");
        }
    } else if(pagename == "track") {
        if(checkParam(urlObj, "id")) {
            if(!isInt(urlObj.query["id"])) {
                errors.push("id must be an integer");
            }
        } else if(!(checkParam(urlObj, "artist_name") && checkParam(urlObj, "track_title"))) {
            errors.push("For track data you must provide either an id or artist_name and track_title.");
        }
    } else if(pagename == "user") {
        if(checkParam(urlObj, "id")) {
            if(!isInt(urlObj.query["id"])) {
                errors.push("id must be an integer");
            }
        } else if(!checkParam(urlObj, "username")) {
            errors.push("For user data you must provide either an id or a username.");
        }
    }
    
    if(checkParam(urlObj, "limit") && !isInt(urlObj.query["limit"])) {
        errors.push("If limit is set then it must be an integer.");
    }
    if(checkParam(urlObj, "offset") && !isInt(urlObj.query["offset"])) {
        errors.push("If offset is set then it must be an integer.");
    }
    if(checkParam(urlObj, "from") && !isInt(urlObj.query["from"])) {
        errors.push("If from is set then it must be an integer.");
    }
    if(checkParam(urlObj, "to") && !isInt(urlObj.query["to"])) {
        errors.push("If to is set then it must be an integer.");
    }
	
	return errors;
}

