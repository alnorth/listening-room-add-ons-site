function call(request, response, pagename) {
	var urlObj = url.parse(request.url, true);
	var type = urlObj.query["type"];
	
	var fieldsData = getFieldsData(pagename, type);
	
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
