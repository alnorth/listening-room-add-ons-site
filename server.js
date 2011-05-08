var http = require('http');
http.createServer(require('./lrdata').urls).listen(8080, '127.0.0.1');
console.log("Server running");
