function call(request, response, pagename) {
	var urlObj = url.parse(request.url, true);
	var type = urlObj.query["type"];
	
	var fieldsData = getFieldsData(pagename, type);
	
	if(fieldsData && checkRequiredParams(pagename, urlObj)) {
	
		var fields = "SELECT ";
		if(fieldsData.u) {fields += "u.username AS username, u.id AS user_id, u.lr_id AS user_lr_id, ";}
		if(fieldsData.t) {fields += "t.name AS track_title, t.id AS track_id, ";}
		if(fieldsData.art) {fields += "art.name AS artist_name, art.id AS artist_id, ";}
		if(fieldsData.p) {fields += "UNIX_TIMESTAMP(p.played) as play_date, p.lr_id AS play_lr_id, ";}
		if(fieldsData.count) {fields += "COUNT(*) AS plays, ";}
		fields = fields.substring(0, fields.length - 2); // Remove the last comma
	
		var joins = " FROM TRACK_PLAY p ";
		if(fieldsData.u) {joins += "JOIN USER u ON u.id = p.user_id ";}
		if(fieldsData.t || fieldsData.art) {joins += "JOIN TRACK t ON t.id = p.track_id ";}
		if(fieldsData.art) {joins += "JOIN ARTIST art ON art.id = t.artist_id ";}
		
		var whereClauses = [];
		var whereParams = [];
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
		//if(where.length > 0) {where = " WHERE " + where;}
	
		var group = "";
		if(fieldsData.count) {
			group = " GROUP BY ";
			if(fieldsData.u) {group += "u.username, u.id, u.lr_id, ";}
			if(fieldsData.t) {group += "t.name, t.id, ";}
			if(fieldsData.art) {group += "art.name, art.id, ";}
			if(fieldsData.p) {group += "p.played, p.lr_id, ";}
			group = group.substring(0, group.length - 2); // Remove the last comma
		}
	
		var sql = fields + joins + group;
	} else {
		response.writeHead(400, {'Content-Type': 'text/javascript'});
    	response.write('Parameters missing. See API documentation for details.');
		response.end();
	}
}
exports.call = call;

var fieldsDataNoType = {
	all_artists: {art: true, count: true},
	all_tracks: {art: true, t: true, count: true},
	all_users: {u: true, count: true}
};

var fieldsDataWithType = {
	artist: {
		tracks: {t: true, count: true},
		users: {u: true, count: true},
		all_plays: {p: true, u: true, t: true}
	},
	track: {
		users: {u: true, count: true},
		all_plays: {p: true, u:true}
	},
	user: {
		artists: {art: true, count: true},
		tracks: {art: true, t: true, count: true},
		all_plays: {art: true, t: true, p: true}
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
}

