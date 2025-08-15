require('dotenv').config();
const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

app.use(cors({
    origin: [
        "http://localhost:3000",
        "https://your-deployed-frontend.com"
    ],
    methods: ["GET", "POST"],
    credentials: true
}));

const rooms = {};
const message = {};
const MAX_MEMBER = 3;

function getRoomName() {
    
    for(let room in rooms) {
        if(rooms[room].size < MAX_MEMBER) 
            return room;
    }

    const newRoom = `room${Object.keys(rooms).length + 1}`;
    rooms[newRoom] = new Map();
    message[newRoom] = []
    return newRoom;
}

io.on('connection',(socket) => {
    
    socket.on("join",(newUser) => {
        const roomName = getRoomName();
        socket.userName = newUser || "unknown user";
        socket.roomName = roomName;

        socket.join(roomName);   
        rooms[roomName].set(socket.id,newUser || "unknown user");
        io.to(roomName).emit('new-user-joined',rooms[roomName].size);
        io.to(roomName).emit('userList',Array.from(rooms[roomName].values()))
    })  

    socket.on('new-message',(msgData) => {
        const {roomName} = socket;

        if(roomName && rooms[roomName]) {
         message[roomName].push(msgData)  
            socket.to(roomName).emit('all-message', [msgData]); 
            socket.emit('all-message', [msgData]); 
        }

    })
    
    socket.on('disconnect',() => {
        
        const {roomName} = socket;
        let userName; 

        if(roomName && rooms[roomName]) {
            userName = rooms[roomName].get(socket.id);
            rooms[roomName].delete(socket.id);
            userCount = Math.max(0, rooms[roomName].size - 1);
        
            io.to(roomName).emit('new-user-joined',userCount);
            io.to(roomName).emit('user-left',userName || "unknown");
            io.to(roomName).emit('userList',Array.from(rooms[roomName].values()))

        if (rooms[roomName].size === 0) {
            delete rooms[roomName];
            delete message[roomName];
        }
    }

    })
    
})

const port = process.env.PORT;

server.listen(port,() => {
    console.log("server is listening...")
})
