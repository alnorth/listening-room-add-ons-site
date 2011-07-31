var lfm_api = require('./lastfm.api');
var config = require('./config');
var db = require('./db');

var lastfm = new lfm_api.LastFM({
	apiKey    : config.lfmApiKey,
	apiSecret : config.lfmApiSecret
});

function fetchDataForNextTag() {
	db.getNextTrackForTagRefresh(function(data) {
		if(data.length === 1) {
			lastfm.track.getTopTags({artist: data[0].artist_name, track: data[0].track_name}, {success: function(lfmData){
				db.setTrackFetchDate(data[0].track_id);
				if(lfmData.toptags && lfmData.toptags.tag) {
					var i;
					for(i = 0; i < lfmData.toptags.tag.length; i++) {
						db.setTrackTagData(data[0].track_id, lfmData.toptags.tag[i].name, lfmData.toptags.tag[i].count);
					}
				}
			}, error: function(code, message){
				console.log("Error fetching tags");
				console.log(code);
				console.log(message);
			}});
		}
	});
}
exports.fetchDataForNextTag = fetchDataForNextTag;