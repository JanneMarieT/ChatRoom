const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
var fs = require('fs');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

let rooms = JSON.parse(fs.readFileSync('./rooms.json', 'utf-8'));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//routing
app.get('/', (req, res) => {
    res.render(__dirname + '/index.ejs', { rooms: rooms });
});

app.get('/:room', (req, res) => {
    let roomName = req.params.room;
    let messages = JSON.parse(fs.readFileSync(`./rooms/${roomName}.json`, 'utf-8'));
    res.render(__dirname + '/room.ejs', { room: roomName, messages: messages });
});

var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()

app.post('/newroom', jsonParser, (req, res) => {
    const room = req.body.room;

    if (!rooms.includes(room)) {
        // append the new room to the list of existing rooms
        const newRooms = rooms.concat([room]);

        try {
            // save the updated list of rooms to the rooms.json file
            fs.writeFileSync('./rooms.json', JSON.stringify(newRooms));
            console.log('Rooms saved to file successfully');
        } catch (err) {
            console.error('Error saving rooms to file:', err);
        }

        // update the `rooms` variable with the new list of rooms
        rooms = newRooms;

        // create new JSON file for the room
        fs.writeFileSync(`./rooms/${room}.json`, JSON.stringify([]));

        res.send({
            'room': room
        });
    } else {
        res.send({
            'error': 'room already exists'
        });
    }
});


const admin = io.of("/admin");

admin.on('connection', (socket) => {
    socket.on('join', (data) => {
        socket.join(data.room);
        admin.in(data.room).emit('chat message', `New user joined ${data.room} room!`);
    })

    socket.on('chat message', (data) => {
        let messages = JSON.parse(fs.readFileSync(`./rooms/${data.room}.json`, 'utf-8'));
        const newMessages = messages.concat([{
            text: data.msg,
        }]);
        fs.writeFileSync(`./rooms/${data.room}.json`, JSON.stringify(newMessages));

        admin.in(data.room).emit('chat message', data.msg);
    });

    socket.on('disconnect', () => {
        admin.emit('chat message', 'user disconnected');
    })
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});
