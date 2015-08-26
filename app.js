/**
 * Module dependencies.
 */

var express = require('express')
  , stylus = require('stylus')
  , nib = require('nib')
  , sio = require('socket.io');

/**
 * App.
 */

var app = express.createServer();

/**
 * App configuration.
 */

app.configure(function () {
  app.use(stylus.middleware({ src: __dirname + '/public', compile: compile }));
  app.use(express.static(__dirname + '/public'));
  app.set('views', __dirname);
  app.set('view engine', 'jade');

  function compile (str, path) {
    return stylus(str)
      .set('filename', path)
      .use(nib());
  }
});

/**
 * App listen.
 */

app.listen(process.env.PORT||3000, function () {
  var addr = app.address();
  console.log('   app listening on http://' + addr.address + ':' + addr.port);
});

/**
 * Socket.IO server (single process only)
 */

var io = sio.listen(app)
  , nicknames = {},
    rooms = [{
        roomName: '',
        users: []
    }];

io.sockets.on('connection', function (socket) {
  socket.on('user message', function (msg) {
    socket.broadcast.emit('user message', socket.nickname, msg);
  });

  socket.on('createRoom', function (roomName, users, callback) {
      socket.join(roomName);
      socket.room = roomName;
      callback();
  });

  socket.on('nickname', function (nick, fn) {
      if ( nick ) {
          if (nicknames[nick]) {
              fn(true);
          } else {
              fn(false);
              nicknames[nick] = socket.nickname = nick;
              socket.broadcast.emit('announcement', nick + ' connected');
              io.sockets.emit('nicknames', nicknames);
          }
      } else {
          io.sockets.emit('emptyNickname');
      }
  });

  socket.on('disconnect', function () {
    if (!socket.nickname) return;

    delete nicknames[socket.nickname];
    socket.broadcast.emit('announcement', socket.nickname + ' disconnected');
    socket.broadcast.emit('nicknames', nicknames);
  });
});

/**
 * App routes.
 */

app.get('/', function (req, res) {
    res.render('index', { layout: false });
});

app.get('/getOnlineUsers', function (req, res) {
    return res.json(nicknames);
});
