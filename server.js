const express = require('express');
const app = express();
const server = require('http').Server(app);
const {join} = require('path');
const io = require('socket.io')(server);

const port = process.env.PORT || 5000;

let rooms = {};
let playerTable = {};
let NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

app.use(express.static(join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendfile(join(__dirname, 'public', 'index.html'));
});

server.listen(port, () => {
    console.log(`Server linstening on PORT:${port}`);
});

io.on('connection', (socket) => {
    socket.on('join', data => {
        let {name, room} = data;

        // First player.
        if(!rooms[room]) {
            socket.join(room);
            playerTable[socket.id] = room;

            rooms[room] = {
                players: {},
                choices: []
            };
            rooms[room].players[socket.id] = {
                name,
                deck: []
            };

        } else {
            // Room is full.
           if(Object.keys(rooms[room].players).length == 2) {
                socket.emit('disconnect');
                socket.disconnect(true);

           } else {
                // Second player.
                socket.join(room);
                playerTable[socket.id] = room;

                NUMBERS.sort(() => 0.5 - Math.random());
                let opponentDeck = NUMBERS.slice(0, 5);
                NUMBERS.sort(() => 0.5 - Math.random());
                let playerDeck =  NUMBERS.slice(0, 5);

                let opponentID = Object.keys(rooms[room].players)[0];
                let opponentName = rooms[room].players[opponentID].name;

                rooms[room].players[opponentID].deck = opponentDeck;
                rooms[room].players[socket.id] = {
                    name,
                    deck: playerDeck
                };

                // Send decks to players.
                socket.broadcast.to(room).emit('deck', {deck: opponentDeck, enemy: name});
                socket.emit('deck', {deck: playerDeck, enemy: opponentName});

                // Randomly initiate first turn to a player.
                Math.random() <= 0.5 ? socket.broadcast.to(room).emit('turn') : socket.emit('turn');
           }
        }
    });

    socket.on('emote', emote => {
        let room = playerTable[socket.id];
        socket.broadcast.to(room).emit('emote', emote);
    });

    socket.on('disconnect', () => {
        if(playerTable[socket.id]) {
            let room = playerTable[socket.id];
            delete playerTable[socket.id];
            // Remove the entire room when leaving player is the last.
            Object.keys(rooms[room].players).length == 1 ? delete rooms[room] : delete rooms[room].players[socket.id];
            socket.disconnect();
        }
    });

    socket.on('choice', number => {
        let room = playerTable[socket.id];

        if(rooms[room].players[socket.id].deck.includes(number)) {
            rooms[room].players[socket.id].deck = rooms[room].players[socket.id].deck.filter(num => num != number);
            rooms[room].choices.push(number);
            socket.emit('playerChoice', number);
            socket.broadcast.to(room).emit('opponentChoice', number);

            if(rooms[room].choices.length == 1){
                socket.broadcast.to(room).emit('turn');

            } else if(rooms[room].choices.length == 2) {
                let opponentID = Object.keys(rooms[room].players).filter(id => id != socket.id)[0];
                let reward = Math.abs(rooms[room].choices[0] - number);
                let cash;

                if(rooms[room].choices[0] > number) {
                    if(!rooms[room].players[opponentID].deck.includes(reward)) {
                        rooms[room].players[opponentID].deck.push(reward);
                        socket.broadcast.to(room).emit('reward', reward);
                        socket.emit('reward', -1);
                    } else {
                        io.to(room).emit('reward', 0);
                    }

                    if(rooms[room].players[socket.id].deck.length == 0) {
                        cash = rooms[room].players[opponentID].deck.reduce((a, b) => a + b);
                        socket.emit('end', -12);
                        socket.broadcast.to(room).emit('end', cash);
                    } else {
                        socket.emit('turn');
                    }

                } else if(rooms[room].choices[0] < number) {
                    if(!rooms[room].players[socket.id].deck.includes(reward)) {
                        rooms[room].players[socket.id].deck.push(reward);
                        socket.emit('reward', reward);
                        socket.broadcast.to(room).emit('reward', -1);
                    } else {
                        io.to(room).emit('reward', 0)
                    }

                    if(rooms[room].players[opponentID].deck.length == 0) {
                        cash = rooms[room].players[socket.id].deck.reduce((a, b) => a + b);
                        socket.emit('end', cash);
                        socket.broadcast.to(room).emit('end', -12);
                    } else {
                        socket.broadcast.to(room).emit('turn');
                    }

                } else {
                    io.to(room).emit('reward', 0);

                    if(rooms[room].players[socket.id].deck.length + rooms[room].players[opponentID].deck.length == 0) {
                        io.to(room).emit('end', 0);

                    } else if(rooms[room].players[socket.id].deck.length == 0) {
                        cash = rooms[room].players[opponentID].deck.reduce((a, b) => a + b);
                        socket.emit('end', -12);
                        socket.broadcast.to(room).emit('end', cash);

                    } else if(rooms[room].players[opponentID].deck.length == 0) {
                        cash = rooms[room].players[socket.id].deck.reduce((a, b) => a + b);
                        socket.emit('end', cash);
                        socket.broadcast.to(room).emit('end', -12);

                    } else {
                        Math.random() <= 0.5 ? socket.broadcast.to(room).emit('turn') : socket.emit('turn');
                    }
                }
                // Reset player choices for the room.
                rooms[room].choices = [];
            }
        }
    });
});