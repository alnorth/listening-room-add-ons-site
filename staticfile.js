var path = require("path");
var fs = require("fs");

var contentTypes = {
    '.json': 'application/json',
    '.js': 'text/javascript',
    '.gif': 'image/gif',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.css': 'text/css',
    '.html': 'text/html',
    '.txt': 'text/plain',
    '.xml': 'text/xml'
};

function getContentType(filename) {
    var extension = path.extname(filename).toLowerCase();
    return contentTypes[extension];
}

function serve(request, response, filename) {
    var filepath = path.join(process.cwd(), "static", filename);
    path.exists(filepath, function(exists) {
    	if(!exists) {
    		response.writeHead(404, {"Content-Type": "text/plain"});
    		response.write("404 Not Found\n");
    		response.end();
    		return;
    	}

    	fs.readFile(filepath, "binary", function(err, file) {
    		if(err) {
    			response.writeHead(500, {"Content-Type": "text/plain"});
    			response.write(err + "\n");
    			response.end();
    			return;
    		}

    		response.writeHead(200, {"Content-Type": getContentType(filename)});
    		response.write(file, "binary");
    		response.end();
    	});
    });
}
exports.serve = serve;
