
var express = require('express');


var path = require('path');


var app = express();


var fs = require('fs');

var game = require('./game_file');



var file ="mydb.db";
var exists = fs.existsSync(file);

if(!exists) {
  console.log("Creating DB file.");
  fs.openSync(file, "w");
}

var sqlite3 = require("sqlite3").verbose();
var db = new sqlite3.Database(file);

db.serialize(function() {
  if(!exists) {
    db.run("CREATE TABLE player (player_name TEXT, player_win INT)");
  }
});



app.configure(function() {
   
    app.use(express.logger('dev'));

    
    app.use(express.static(path.join(__dirname,'public')));
});


var server = require('http').createServer(app).listen(process.env.PORT || 8080);


var io = require('socket.io').listen(server);


io.set('log level',1);


io.sockets.on('connection', function (socket) {
   
    game.initGame(io, socket,db);
});