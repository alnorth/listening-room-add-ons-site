#Listening Room Add-Ons Website

##Installation
The website is written in JavaScript and run in Node.js. Instructions for installation of Node can be found at http://nodejs.org/.

This depends upon the following modules. You need to install these via npm (http://npmjs.org/). I installed them all locally rather than globally.

 * npm install clutch mysql request imagemagick mkdirp jade
 * You'll need to set up mysql and create a database with the dbinit.sql, then set the right values in config.js.
 * You will also need to install the actual imagemagick libraries for your platform too, see http://www.imagemagick.org/script/binary-releases.php.

##License

Unless otherwise stated in comments, files included in this extension are provided under the Modified BSD License as described in LICENSE.txt.
