var express = require('express');
var app = express();
var server = require('http').Server(app);
var session = require('cookie-session');
var io = require('socket.io')(server);
var redis = require('socket.io-redis');
io.adapter(redis({host: 'localhost', port:6379}));
//io.adapter(redis({host: '92.222.218.233', port:6379}));

var port = process.env.PORT || 8000;
var ent = require('ent');

app.set('view engine', 'jade');
app.set('views', __dirname + '/views');

app.use(session({
    secret : 'secret'
}));

app.use(express.static('static'));
app.locals.pretty = true;

var cookie = {};
app.get('/', function(req, res) {
    res.render('index', {port: port});
});

var connectedUsers = {};

io.sockets.on('connection', function (socket) {
  // handle new users
  socket.on('new_user', function(nick) {
    nick = ent.encode(nick);
    socket.nick = nick;
    connectedUsers[nick] = socket;
    socket.broadcast.emit('new_user', nick);
  });

  // forward message
  socket.on('message', function (message) {
    message = ent.encode(message);
    //handling private messages
    if(isPrivate(message)) {
        var privateUsers = getUser(message);
        for ( var s in connectedUsers ) {
            if (privateUsers.indexOf(connectedUsers[s].nick) > -1) connectedUsers[s].emit('message', {nick : socket.nick, message : message, isPrivate:true});
        }
    } else {
        socket.broadcast.emit('message', {nick: socket.nick, message: message});
    }
  });

  socket.on('disconnect', function() {
    socket.broadcast.emit('user_quit', socket.nick);
  });

});

var isPrivate = function (msg) {
    var regex = new RegExp('@');

    return (regex.exec(msg) !== null);
};

var getUser = function(msg) {
    var regex = new RegExp('@([^ ]*)', 'g');

    return regex.exec(msg);
};

server.listen(port);
console.log("Express server started on " + port);

