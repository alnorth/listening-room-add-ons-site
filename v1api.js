function call(request, response, pagename) {
	var urlObj = url.parse(request.url, true);
	var type = urlObj.query["type"];
	
	var fields = getFields(pagename, type);
	var joins = getJoins(pagename, type);
	
	var sql = "SELECT ";
	sql += fields;
	sql += " ";
	sql += joins;
}
exports.call = call;

function getFields(pagename, type) {
	switch(pagename) {
		case "artist":
			switch(type) {
				case "tracks":
					return "t.name AS track_title, t.id AS track_id, COUNT(*) AS plays";
				case "users":
					return "u.username AS username, u.id AS user_id, u.lr_id AS user_lr_id, COUNT(*) AS plays";
				case "all_plays":
					return "u.username AS username, u.id AS user_id, u.lr_id AS user_lr_id, t.name AS track_title, t.id AS track_id, UNIX_TIMESTAMP(p.played), p.lr_id AS play_lr_id";
			}
		case "all_artists":
			return "art.name AS artist_name, art.id AS artist_id, COUNT(*) AS plays";
		case "track":
			switch(type) {
				case "users":
					return "u.username AS username, u.id AS user_id, u.lr_id AS user_lr_id, COUNT(*) AS plays";
				case "all_plays":
					return "u.username AS username, u.id AS user_id, u.lr_id AS user_lr_id, UNIX_TIMESTAMP(p.played), p.lr_id AS play_lr_id";
			}
		case "all_tracks":
			return "art.name AS artist_name, art.id AS artist_id, t.name AS track_title, t.id AS track_id, COUNT(*) AS plays";
		case "user":
			switch(type) {
				case "artists":
					return "art.name AS artist_name, art.id AS artist_id, COUNT(*) AS plays";
				case "tracks":
					return "art.name AS artist_name, art.id AS artist_id, t.name AS track_title, t.id AS track_id, COUNT(*) AS plays";
				case "all_plays":
					return "art.name AS artist_name, art.id AS artist_id, t.name AS track_title, t.id AS track_id, UNIX_TIMESTAMP(p.played), p.lr_id AS play_lr_id";
			}
		case "all_users":
			return "u.username AS username, u.id AS user_id, u.lr_id AS user_lr_id, COUNT(*) AS plays";
	}
}

function getJoins(pagename, type) {
}