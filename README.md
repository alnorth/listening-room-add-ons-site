#Listening Room Add-Ons Website

##Installation
The website is written in JavaScript and run in Node.js. Instructions for installation of Node can be found at http://nodejs.org/.

This depends upon the following modules. You need to install these via npm (http://npmjs.org/). I installed them all locally rather than globally.

 * clutch (npm install clutch).
 * mysql (npm install mysql). Of course you'll also need to set up a mysql server and a database with a user and enter the right values in config.js.
 * request (npm install request).
 * imagemagick (npm install request). You will also need to install the actual imagemagick libraries for your platform too, see http://www.imagemagick.org/script/binary-releases.php.
 * mkdirp (npm install request).
 * jade (npm install jade).

##License

Unless otherwise stated in comments, files included in this extension are provided under the Modified BSD License as described in LICENSE.txt.
