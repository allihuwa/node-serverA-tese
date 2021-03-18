var express = require("express");
var app = express();
app.use(express.static(__dirname + "/public"));

var http = require("http").createServer(app);
// var io = require('socket.io')(http, {allowEIO3: true, allowEIO4: true, serveClient: true});

var io = require("socket.io")(http, {
  allowEIO3: true,
  allowEIO4: true,
  serveClient: true,
  cors: { origin: "*" },
});

http.listen(process.env.PORT || 3000, function () {
  console.log("listening on *:3000");
});
var labelMap = new Map(); //{key: socket.id, value:label}
var labelCounter = 1001;
var serverID = "undefined";
var serverinControl = true;
io.on("connection", function (socket) {
  //new client, register in map and send him his label
  if (serverID != "undefined") {
    labelMap.set(socket, labelCounter);
    socket.emit("OnReceiveData", {
      DataString: labelCounter,
    });
    labelCounter = labelCounter + 1;
  }
  console.log(
    "a user connected: " + socket.id + " (server: " + serverID + " )"
  );
  //register the server id, received the command from unity
  socket.on("RegServerId", function (data) {
    serverID = socket.id;
    console.log("reg server id : " + serverID);
  });

  socket.on("disconnect", function () {
    if (serverID == socket.id) {
      serverID = "undefined";
      console.log("removed Server: " + socket.id);
    } else {
      labelMap.delete(socket);
      console.log("user disconnected: " + socket.id);
    }
  });

  socket.on("OnReceiveData", function (data) {
    if (serverID != "undefined") {
      switch (data.EmitType) {
        //emit type: all;
        case 0:
          io.emit("OnReceiveData", {
            DataString: data.DataString,
            DataByte: data.DataByte,
          });
          break;
        //emit type: server;
        case 1:
          stringtoSend = StringHandler(data, socket);
          console.log(stringtoSend);
          io.to(serverID).emit("OnReceiveData", {
            DataString: stringtoSend,
            DataByte: data.DataByte,
          });
          break;
        //emit type: others;
        case 2:
          socket.broadcast.emit("OnReceiveData", {
            DataString: data.DataString,
            DataByte: data.DataByte,
          });
          break;
        //emit type: target, label== words[0], action== words[1], socket.id == words[2];
        case 3:
          console.log("TARGET SENDING " + data.DataString);
          var words = data.DataString.split(" ");
          console.log("LABEL AND ACTION BELOW");
          console.log(words[0] + " " + words[1]); //label + action
          var stringToSend = words[0] + " " + words[1];
          io.to(words[2]).emit("OnReceiveData", {
            DataString: stringToSend,
            DataByte: data.DataByte,
          });
          break;
      }
    } else {
      console.log("cannot find any active server");
    }
  });
});

function StringHandler(data, socket) {
  if (data.DataString.length === 4) {
    return data.DataString + " " + socket.id;
  } else {
    return data.DataString;
  }
}
