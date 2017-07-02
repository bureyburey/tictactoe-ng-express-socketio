var app = angular.module("tttApp", ['ui.router']);

var ID = function () {
    // Math.random should be unique because of its seeding algorithm.
    // Convert it to base 36 (numbers + letters), and grab the first 9 characters
    // after the decimal.
    return '_' + Math.random().toString(36).substr(2, 9);
};



app.factory('socket', function ($rootScope) {
    var socket = io.connect();
    return {
        on: function (eventName, callback) {
            socket.on(eventName, function () {
                var args = arguments;
                //console.log(args);
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            });
        },
        emit: function (eventName, data, callback) {
            socket.emit(eventName, data, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    if (callback) {
                        callback.apply(socket, args);
                    }
                });
            });
        }
    };
});


app.factory('users', function ($rootScope, socket) {

    var obj = {
        users: []
    };

    obj.loginUser = function (data) {
        socket.emit('login-user', data);
    }

    socket.on('get-all-users', function (data) {
        // iterate all users from server and add only the new ones (prevent duplications)
        data.users.forEach(function (element) {
            var index = obj.users.findIndex(function (el) {
                return el.id === element.ud;
            });
            if (index === -1 || obj.users.length === 0) {
                obj.users.push(element);
            }
        });
    });

    socket.on('return-new-user', function (data) {
        // add newly connected user to client
        obj.users.unshift(data.user);
    });

    socket.on('logout-user', function (data) {
        var index = obj.users.findIndex(function (user) {
            return data.id === user.id;
        });
        if (index > -1) { obj.users.splice(index, 1); }
    });

    return obj;
});

app.factory('user', function ($rootScope, socket) {
    var obj = {
    };

    obj.updateBoard = function (index, symbol) {
        socket.emit('update-board', {
            id: obj.game.id,
            index: index,
            player: symbol
        });
    }

    obj.requestGameReset = function () {
        // alert(JSON.stringify(obj.game, null, 2));
        socket.emit('request-game-reset', {
            id: obj.game.id,
            initiatedBy: obj.socketId,
            sendTo: obj.isOwner ? obj.game.opponent.socketId : obj.game.owner.socketId
        });
    }

    socket.on('start-new-game', function (data) {
        obj.game = data.game;
        obj.socketId = data.game.owner.socketId;
        obj.isOwner = obj.id === data.game.id;
    });

    socket.on('start-existing-game', function (data) {
        obj.game = data.game;
        obj.socketId = data.game.opponent.socketId;
        obj.isOwner = obj.isOwner || false;
    });

    socket.on('apply-board-update', function (data) {
        obj.game = data.game;
        obj.socketId = data.game.opponent.socketId;
        obj.isOwner = obj.isOwner || false;
    });


    socket.on('confirm-reset', function (data) {
        if (confirm("Other Player Requested Game Reset\nAcccept?")) {
            socket.emit('reset-game-board', data.game);
        }

        // if (data.req.initiatedBy !== $scope.currentUser.username) {
        //     if (confirm("User " + data.req.initiatedBy + " Initiated Game Reset\nReset Game?")) {
        //         // $scope.resetGame();
        //     }
        // }
    });

    return obj;
});

app.factory('chat', function ($rootScope, socket) {
    var obj = {
        chat_messages: [],
        placeholder: "Message:"
    };

    obj.showTyping = function (data) {
        socket.emit('user-typing', { username: data.username, body: data.body });
    }

    obj.addMessage = function (data) {
        socket.emit('send-message', data);
    }

    socket.on('get-all-messages', function (data) {
        // iterate all messages from server and add only the new ones
        data.messages.forEach(function (element) {
            var index = obj.chat_messages.findIndex(function (el) {
                return el.time === element.time;
            });
            if (index === -1 || obj.chat_messages.length === 0) {
                obj.chat_messages.push(element);
            }
        });
    });

    socket.on('show-typing', function (data) {
        if (data.body.length) { obj.placeholder = data.username + " is typing...."; }
        else { obj.placeholder = "Message:"; }
    });

    socket.on('receive-message', function (data) {
        obj.chat_messages.unshift(data.message);
        obj.placeholder = "Message:";
    });

    return obj;
});

app.factory('games', function ($rootScope, socket) {

    var obj = {
        games: []
    };

    obj.createNewGame = function (data) {
        socket.emit('create-new-game', data);
    }

    obj.joinGame = function (data) {
        socket.emit('join-game', data);
    }

    socket.on('get-all-games', function (data) {
        // iterate all games from server and add only the new ones

        // alert(JSON.stringify(data.games))
        // alert(data.games.length)

        data.games.forEach(function (element) {
            var index = obj.games.findIndex(function (el) {
                return el.id === element.id;
            });
            if (index === -1 || obj.games.length === 0) {
                obj.games.push(element);
            }
        });
    });

    socket.on('return-new-game', function (data) {
        // alert(JSON.stringify(data))
        obj.games.unshift(data.game);
    });

    socket.on('return-active-game', function (data) {
        // alert(JSON.stringify(data.game,null,2));
        var index = obj.games.findIndex(function (element) {
            return data.game.id === element.id;
        });
        obj.games[index].opponent = data.game.opponent;
    });

    socket.on('receive-game', function (data) {
        obj.games.unshift(data.game);
    });

    return obj;
});

app.controller('HomeCtrl', [
    '$scope',
    'socket',
    'users',
    'user',
    'chat',
    'games',
    function ($scope, socket, users, user, chat, games) {
        $scope.chat_messages = chat.chat_messages;
        $scope.chat = chat;
        $scope.games = games.games;
        $scope.users = users.users;
        $scope.user = user;
        
        $scope.gameSettings = {
            // preset board size options
            boardSizes: [3, 4, 5, 6],
            // selectedBoardSize: tictactoe.rowSize || null,
            // gameInProgress: false
        }

        $scope.loginUser = function () {
            users.loginUser({
                username: $scope.user.username
            });
            $scope.user.loggedUser = true;
        }

        $scope.showTyping = function () {
            chat.showTyping({
                username: $scope.user.username,
                body: $scope.message.body
            });
        }

        $scope.submitMessage = function () {
            chat.addMessage({
                username: $scope.user.username,
                body: $scope.message.body,
                time: new Date()
            });
            $scope.message.body = "";
        }

        $scope.createNewGame = function () {
            var id = ID();
            games.createNewGame({
                id: id,
                username: $scope.user.username,
                rowSize: $scope.gameSettings.selectedBoardSize
            });
            $scope.user.id = id;
            $scope.user.isPlaying = true;
            user.symbol = 'O';
        }

        $scope.joinGame = function (id) {
            games.joinGame({
                id: id,
                username: $scope.user.username
            });
            $scope.user.id = ID();
            $scope.user.isPlaying = true;
            user.symbol = 'X';
        }

        $scope.requestGameReset = function () {
            user.requestGameReset();
        }

        $scope.updateBoard = function (index) {
            if (user.game.turn === user.symbol) {
                user.updateBoard(index, user.symbol);
            }
        }

    }
]);

app.controller('AboutCtrl', [
    '$scope',
    function ($scope) {

    }
]);

app.controller('NavCtrl', [
    '$scope',
    function ($scope) {

    }
]);


app.config([
    '$stateProvider',
    '$urlRouterProvider',
    function ($stateProvider, $urlRouterProvider) {
        $stateProvider
            .state('home', {
                url: '/home',
                templateUrl: '/home.html',
                controller: 'HomeCtrl'
            })
            .state('about', {
                url: '/about',
                templateUrl: '/about.html',
                controller: 'AboutCtrl'
            });

        $urlRouterProvider.otherwise('home');
    }
]);