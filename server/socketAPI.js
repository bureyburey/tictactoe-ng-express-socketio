/**
 * socket API
 */
var socket_io = require('socket.io');
var game = require('../game/tictactoe');
var io = socket_io();
var socketAPI = {};

// io will be passed to /bin/www using module.exports
socketAPI.io = io;

var clients = {};
var loggedUsers = [];
var chat_messages = [];
var games = [];

function getGameById(id) {
    var index = games.findIndex(function (game) {
        return game.id === id;
    });
    return games[index];
}

io.on('connection', function (socket) {
    // save current socket id
    clients[socket.id] = socket;
    console.log(socket.id + ' is now connected');

    ////// SEND ALL SERVER DATA UPON NEW USER CONNECTION (ONLY TO THE NEW CONNECTION SOCKET)
    socket.emit('get-all-users', {
        event: 'get-all-users',
        users: loggedUsers
    });
    socket.emit('get-all-messages', {
        event: 'get-all-messages',
        messages: chat_messages
    });
    socket.emit('get-all-games', {
        event: 'get-all-games',
        games: games
    });


    // add new connected user to server records and emit changes to all clients
    socket.on('login-user', function (data) {
        console.log("new user joined")
        var newUser = {
            id: socket.id,
            username: data.username,
            time: new Date()
        }
        loggedUsers.unshift(newUser);
        io.emit('return-new-user', {
            event: 'return-new-user',
            user: newUser
        });
    });

    socket.on('disconnect', function () {
        // remove disconnected user (fired on browser refresh/close/navigation to another site)
        console.log(socket.id + ' have disconnected!');

        var index = loggedUsers.findIndex(function (user) {
            return socket.id === user.id;
        });
        if (index > -1) { loggedUsers.splice(index, 1); }

        io.emit('logout-user', {
            message: 'logout-user',
            id: socket.id
        });

        delete clients[socket.id];
        if(loggedUsers.length === 0){
            chat_messages = [];
            games = [];
        }
    });


    // add new created game to server records and emit changes to all clients
    socket.on('create-new-game', function (data) {
        console.log("creating new game")

        var newGame = new game({ username: data.username, socketId: socket.id, symbol: 'O' }, data.id);
        newGame.resetGame(data.rowSize);
        games.unshift(newGame);

        io.emit('return-new-game', {
            event: 'return-new-game',
            game: newGame
        });

        socket.emit('start-new-game', {
            event: 'start-new-game',
            game: newGame
        });
    });

    socket.on('join-game', function (data) {
        console.log("joining game");

        // console.log(JSON.stringify(games[index], null, 2));
        var joinToGame = getGameById(data.id);

        if (joinToGame.opponent !== null) { return; }

        joinToGame.setOpponent({ username: data.username, socketId: socket.id, symbol: 'X' });

        io.emit('return-active-game', {
            event: 'return-active-game',
            game: joinToGame
        });

        socket.emit('start-existing-game', {
            event: 'start-existing-game',
            game: joinToGame
        });

        var id = socket.id === joinToGame.owner.socketId ? joinToGame.opponent.socketId : joinToGame.owner.socketId;
        socket.broadcast.to(id).emit('start-existing-game', {
            event: 'start-existing-game',
            game: joinToGame
        });
    });

    socket.on('send-message', function (data) {
        chat_messages.unshift(data);
        io.emit('receive-message', {
            event: 'receive-message',
            message: data
        });
    });

    socket.on('user-joined', function (user) {
        // add new user to connected users list
        io.emit('add-user', {
            message: 'add user',
            id: socket.id,
            user: user
        });
    });


    socket.on('request-game-reset', function (data) {
        // request game reset (sends the request to the other user who needs to confirm it)
        console.log("sending reset game request to: " + data.sendTo);
        socket.broadcast.to(data.sendTo).emit('confirm-reset', {
            event: 'confirm-reset',
            game: data
        });

    });

    socket.on('reset-game-board', function (data) {
        var gameToReset = getGameById(data.id);
        // console.log(JSON.stringify(gameToReset, null, 2));
        console.log("resetting game: " + data.id);
        gameToReset.resetGame();

        var id = socket.id === gameToReset.owner.socketId ? gameToReset.opponent.socketId : gameToReset.owner.socketId;

        console.log(id);

        socket.emit('apply-board-update', {
            event: 'apply-board-update',
            game: gameToReset
        });
        // console.log(joinToGame.owner.socketId)
        
        socket.broadcast.to(id).emit('apply-board-update', {
            event: 'apply-board-update',
            game: gameToReset
        });
    });

    socket.on('update-board', function (data) {
        // send which next move need to be made
        console.log("updating board");
        var gameToUpdate = getGameById(data.id);
        if (!gameToUpdate.opponent) { return; }
        gameToUpdate.updateBoard(data.index, data.player);

        var id = socket.id === gameToUpdate.owner.socketId ? gameToUpdate.opponent.socketId : gameToUpdate.owner.socketId;
        // console.log(id)

        socket.emit('apply-board-update', {
            event: 'apply-board-update',
            game: gameToUpdate
        });
        // console.log(joinToGame.owner.socketId)
        socket.broadcast.to(id).emit('apply-board-update', {
            event: 'apply-board-update',
            game: gameToUpdate
        });


    });

    socket.on('user-typing', function (data) {
        // send information of which user is currently typing
        console.log("someone it typing....");
        io.emit('show-typing', {
            message: 'show-typing',
            username: data.username,
            body: data.body
        });
    });

});

module.exports = socketAPI;