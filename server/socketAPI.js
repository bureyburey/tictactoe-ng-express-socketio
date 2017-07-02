/**
 * socket API
 */
var socket_io = require('socket.io');
var game = require('../game/tictactoe'); // game logic 'class'
var io = socket_io();
var socketAPI = {};

// io will be passed to /bin/www using module.exports
socketAPI.io = io;

/**
 * server variables
 * clients - object holding key: value pairs of {socket.id: socket}
 * loggedUsers - array holding all connected users which logged in (after 'login-user' event)
 * chat_messages - array holding all chat messages
 * games - array holding all active games
 * 
 * upon 'disconnect' event the loggedUsers array is checked, and if it is empty
 * the server will reset all chat_messages and games array, clearing the server from all activity
 */
var clients = {};
var loggedUsers = [];
var chat_messages = [];
var games = [];

function getGameById(id) {
    // find game by id
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
    // emits to users factory
    socket.emit('get-all-users', {
        event: 'get-all-users',
        users: loggedUsers
    });
    // emits to chat factory
    socket.emit('get-all-messages', {
        event: 'get-all-messages',
        messages: chat_messages
    });
    // emits to games factory
    socket.emit('get-all-games', {
        event: 'get-all-games',
        games: games
    });

    socket.on('login-user', function (data) {
        // add new connected user to server records and emit changes to all clients
        console.log("new user joined: " + data.username);
        var newUser = {
            id: socket.id,
            username: data.username,
            time: new Date()
        }
        // add the new user to server loggedUsers array
        loggedUsers.unshift(newUser);
        // emits to users factory
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
        // emits to users factory
        io.emit('logout-user', {
            message: 'logout-user',
            id: socket.id
        });

        delete clients[socket.id];

        if (loggedUsers.length === 0) {
            // clear server arrays
            chat_messages = [];
            games = [];
        }
    });


    socket.on('create-new-game', function (data) {
        // add new created game to server records and emit changes to all clients
        console.log(data.username + " created new game")

        var newGame = new game({ username: data.username, socketId: socket.id, symbol: 'O' }, data.id);
        newGame.resetGame(data.rowSize);
        games.unshift(newGame);
        // emits to games factory
        io.emit('return-new-game', {
            event: 'return-new-game',
            game: newGame
        });
        // emits to user factory (to single user)
        socket.emit('start-new-game', {
            event: 'start-new-game',
            game: newGame
        });
    });

    socket.on('join-game', function (data) {
        console.log(data.username + " joining a game");

        // console.log(JSON.stringify(games[index], null, 2));
        var joinToGame = getGameById(data.id);

        if (joinToGame.opponent !== null) { return; }

        joinToGame.setOpponent({ username: data.username, socketId: socket.id, symbol: 'X' });
        // emits to games factory (notifies all clients the game is have two clients and cannot be accessed anymore)
        io.emit('return-active-game', {
            event: 'return-active-game',
            game: joinToGame
        });

        // emits to user factory (starts game after an opponent joined an existing game, sent to opponent client)
        socket.emit('start-existing-game', {
            event: 'start-existing-game',
            game: joinToGame
        });

        var id = socket.id === joinToGame.owner.socketId ? joinToGame.opponent.socketId : joinToGame.owner.socketId;
        // emits to users factory (same as above, sent to the owner client)
        socket.broadcast.to(id).emit('start-existing-game', {
            event: 'start-existing-game',
            game: joinToGame
        });
    });

    socket.on('send-message', function (data) {
        // add new message to server chat_messages (to beginning)
        chat_messages.unshift(data);
        // emits to users factory
        io.emit('receive-message', {
            event: 'receive-message',
            message: data
        });
    });

    socket.on('request-game-reset', function (data) {
        // request game reset (sends the request to the other user who needs to confirm it)
        console.log("sending reset game request to: " + data.sendTo);
        // emits to user factory
        socket.broadcast.to(data.sendTo).emit('confirm-reset', {
            event: 'confirm-reset',
            game: data
        });

    });

    socket.on('reset-game-board', function (data) {
        console.log("resetting game: " + data.id);
        var gameToReset = getGameById(data.id);
        gameToReset.resetGame();

        var id = socket.id === gameToReset.owner.socketId ? gameToReset.opponent.socketId : gameToReset.owner.socketId;
        // emits to user factory (the cient who requested the reset)
        socket.emit('apply-board-update', {
            event: 'apply-board-update',
            game: gameToReset
        });
        // emits to user factory (the client who confirmed the reset)
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
        // emits to user factory (client which made the move)
        socket.emit('apply-board-update', {
            event: 'apply-board-update',
            game: gameToUpdate
        });

        var id = socket.id === gameToUpdate.owner.socketId ? gameToUpdate.opponent.socketId : gameToUpdate.owner.socketId;
        // emits to user factory (client who waiting to his turn)
        socket.broadcast.to(id).emit('apply-board-update', {
            event: 'apply-board-update',
            game: gameToUpdate
        });
    });

    socket.on('user-typing', function (data) {
        // send information of which user is currently typing
        console.log(data.username + " is typing....");
        // emits to chat factory
        io.emit('show-typing', {
            message: 'show-typing',
            username: data.username,
            body: data.body
        });
    });
});

module.exports = socketAPI;