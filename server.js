// Define Modules
const app = require("express")();
const uuidv4 = require("uuid").v4;
const server = require("http").createServer(app);
const axios = require("axios");
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});

const port = process.env.PORT || 5000;

const options = {
  //quote API
  method: "GET",
  url: "https://quoteai.p.rapidapi.com/ai-quotes/0",
  headers: {
    "x-rapidapi-host": "quoteai.p.rapidapi.com",
    "x-rapidapi-key": "796a50ddc7msh090b7b8a39188f2p10df2djsn30483e17b081",
  },
};

let connectCounter = 0;
let users = [];
let rooms = [{ roomID: uuidv4(), numPlayers: 0 }];
let room;
let findRoom;
let findUser;

io.on("connection", (socket) => {
  //listner for socket connection

  connectCounter++; // increment # of clients

  socket.on("join server", (payload) => {
    //listener for join server socket

    //attempt to find room for user

    findRoom = rooms.findIndex((room) => room.numPlayers < 2); //find a room with less than 2 players

    let roomId = "";

    if (findRoom !== -1) {
      // if room found: add player and update room info

      room = rooms[findRoom];
      // index = findRoom;

      roomId = room.roomID;

      // rooms[index].numPlayers++;
      room.numPlayers++;

      socket.join(roomId);
      socket.emit("roomID", roomId); //update client with his or her roomID

      if (room.numPlayers === 2) {
        //if room has 2 players, tell clients game is ready and generate quote
        io.in(roomId).emit("gameReady", room.numPlayers);

        axios.request(options).then((res) => {
          //Request and send quote for room
          io.in(roomId).emit("paragraph", res.data.quote);
        });
      }
    } else {
      //create new room
      roomId = uuidv4();
      rooms.push({ roomID: roomId, numPlayers: 1 });
      socket.join(roomId);
      socket.emit("roomID", roomId); //update client with his or her roomID
    }

    //creates user and pushes user to users array
    const user = {
      user: payload.user,
      id: socket.id,
      roomID: roomId,
    };
    users.push(user);
    console.log(users);
  });
  socket.on("WPM", ({ roomID, WPM }) => {
    //Socket (client) will send to room his or her "Words Per Minute". This will update in the other player's front-end
    socket.broadcast.to(roomID).emit("WPM", WPM);
  });
  socket.on("position", ({ roomID, position }) => {
    //Socket (client) will send to room his or her current position in the race. This will update in the other player's front-end
    socket.broadcast.to(roomID).emit("position", position);
  });

  socket.on("leaveRoom", (roomID) => {
    //if player closes client server must update room
    const roomIndex = rooms.findIndex((room) => room.roomID === roomID);

    if (roomIndex !== -1) {
      rooms[roomIndex].numPlayers--;
    }
  });

  socket.on("disconnect", () => {
    //default listner -- runs when socket disconnects
    connectCounter--;
    users = users.filter((user) => user.id !== socket.id);
  });
});

server.listen(port, () => console.log(`Server is listening on port  ${port}...`));
