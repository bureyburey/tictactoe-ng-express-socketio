function game(owner, id){
    this.id = id;
    this.owner = owner;
    this.opponent = null;
    this.time = new Date();
};

game.prototype.getId = function(){
    return this.id;
}

game.prototype.setOpponent = function(opponent){
    this.opponent = opponent;
}

game.prototype.resetGame = function (rowSize) {
    this.rowSize = rowSize || this.rowSize;
    this.gameBoard = (new Array(this.rowSize * this.rowSize)).fill({ value: '-' });
    this.turn = 'O';
    this.winner = null;
    this.winCode = '';
}

game.prototype.checkWin = function (player) {
    var count = 0;
    var SIZE = this.rowSize; // board is SIZE * SIZE
    // check rows
    for (let i = 0; i < SIZE * SIZE; i++) {
        // encountered player piece --> increase counter
        if (this.gameBoard[i].value === player)
            count++;
        else // SIZE is broken --> reset the counter
            count = 0;
        // if the counter has sufficient SIZE, return the player as the winner
        if (count === SIZE) {
            // this.winCode = 'row ' + count-SIZE + ' ' + count;
            return player; // player won
        }
        // reached the end of a row (last column) --> reset the counter
        if (i % SIZE === SIZE - 1) {
            count = 0;
        }
    }
    // check columns
    for (let i = 0, col = 0; i < SIZE * SIZE; i++) {
        // encountered player piece --> increase counter
        if (this.gameBoard[col + (i % SIZE) * SIZE].value === player)
            count++;
        else // SIZE is broken --> reset the counter
            count = 0;
        // if the counter has sufficient SIZE, return the player as the winner
        if (count === SIZE) {
            return player; // player won
        }
        // reached the end of a column (last row) --> reset the counter
        if (i % SIZE === SIZE - 1) {
            count = 0;
            // only increase col variable after the first iteration (the above 'if' is invoked at i==0)
            if (i > 0)
                col++;
        }
    }
    // check Left To Right diagonals from top to bottom (main diagonals)
    for (let i = 0; i < SIZE * SIZE; i++) {
        // for each iteration of i, reset the counter
        count = 0;
        // start at i and iterate to the last index
        // increment j with SIZE+1
        // (+SIZE will result in getting the next row, +1 will result in one index to the right)
        for (let j = i; j < SIZE * SIZE; j += SIZE + 1) {
            // count player pieces
            if (this.gameBoard[j].value === player)
                count++;
            else // reset the counter if the SIZE is broken
                count = 0;
            // check if the count SIZE is sufficient for a win
            if (count === SIZE)
                return player;
            // if j is out of bound of the array index
            // or reached the right border (j % SIZE == SIZE-1), break the loop
            if (j >= SIZE * SIZE || j % SIZE === SIZE - 1)
                break;
        }
    }
    // check Left To Right diagonals from bottom to top (secondary diagonals)
    // start at the end of the board (last index) and go backward until reaching 0
    for (let i = SIZE * SIZE - 1; i >= 0; i--) {
        // for each iteration of i, reset the counter
        count = 0;
        // start at i and iterate to the last index
        // decrement j with SIZE-1
        // (-SIZE will result in getting the previous row, -1 will result in one index to the left)
        for (let j = i; j > 0; j -= (SIZE - 1)) {
            // count player pieces
            if (this.gameBoard[j].value === player)
                count++;
            else // reset the counter if the SIZE is broken
                count = 0;
            // check if the count SIZE is sufficient for a win
            if (count === SIZE)
                return player;
            // if j is out of bound of the array index
            // or reached the right border (j % SIZE == 0), break the loop
            if (j < 0 || j % SIZE === SIZE - 1)
                break;
        }
    }
    // check draw
    for (let i = 0; i < SIZE * SIZE; i++) {
        // if encountered a blank location, return 0 meaning the game can still be played
        if (this.gameBoard[i].value !== 'O' && this.gameBoard[i].value !== 'X')
            return 0;
    }
    // none of the above returns invoked --> game ended as a draw
    return -1;
}

game.prototype.updateBoard = function (loc, player) {
    if (this.gameBoard[loc].value === 'X' || this.gameBoard[loc].value === 'O' || this.winner || this.turn !== player) { return; }

    this.gameBoard[loc] = { value: player };

    if (this.turn === 'X') { this.turn = 'O' }
    else { this.turn = 'X' }

    let result = this.checkWin(player);

    if (result === player) {
        // alert(player + " Won!");
        this.winner = player;
    }
    else if (result === -1) {
        // alert("Draw!");
        this.winner = 'draw';
    }
}


module.exports = game;