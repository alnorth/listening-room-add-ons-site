var http = require('http');
http.createServer(require('./lrdata').urls).listen(8080);
console.log("Server running");

process.on('uncaughtException',function(error){
    console.log(error);
	console.log(error.stack);
})
