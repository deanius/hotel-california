const express = require("express");
const path = require("path");
const morgan = require("morgan");

const { interval, merge, from } = require("rxjs");
const { map, tap, share } = require("rxjs/operators");
const app = express();
const http = require("http").Server(app);
const port = process.env.PORT || 8470;

// TODO Bring in a store to keep clients in sync

app.use(morgan("dev"));

// API calls
const initialState = {
  rooms: [
    { num: "30" },
    { num: "31" },
    { num: "20" },
    { num: "21" },
    { num: "10" },
    { num: "11" }
  ],
  occupancy: {
    "10": "full",
    "11": "open",
    "20": "open",
    "21": "open",
    "30": "open",
    "31": "hold"
  }
};

app.get("/api/hello", (req, res) => {
  res.send({ express: "Hello From The Server." });
});

// TODO Return state of store instead of hardcoded
app.get("/api/rooms", (req, res) => {
  const { rooms } = initialState;
  res.send({
    count: rooms.length,
    objects: rooms
  });
});

// TODO Return state of store instead of hardcoded
app.get("/api/occupancy", (req, res) => {
  res.send(createRoomViews(initialState));
});

// Build up {num, occupancy} objects from the state
function createRoomViews({ rooms, occupancy }) {
  return rooms.map(room => ({
    ...room,
    occupancy: occupancy[room.num] || "open"
  }));
}

if (process.env.NODE_ENV === "production") {
  // Serve any static files
  app.use(express.static(path.join(__dirname, "client/build")));

  // Handle React routing, return all requests to React app
  app.get("*", function(req, res) {
    res.sendFile(path.join(__dirname, "client/build", "index.html"));
  });
}

http.listen(port, () => console.log(`Server listening on port ${port}`));

// TODO Define an Observable that maps processed actions of type 'holdRoom'
// to FSAs of type setOccupancy (which will be sent out to clients)

// TODO Process holdRoom actions through the store so new clients
// will get the actual state. Later, we'll persist the change in the db

// ------------ WebSocket stuff follows -------------------- //
const io = require("socket.io").listen(http);
io.on("connection", client => {
  console.log("Got a client connection!");

  const notifyClient = action => {
    console.log("Send: " + action.type + ", " + JSON.stringify(action.payload));
    client.emit(action.type, action.payload);
  };

  // TODO Create a subscription for this new client to some occupancy changes
  // TODO subscribe to realOccupancyChanges AND simulatedOccupancyChanges

  // TODO "holdRoom" types of client actions are ones we went to process
  // through our own agent/store so new clients get the current state

  // Be sure and clean up our resources when done
  client.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// TODO connect an Observable of simulted occupancy changes to each new client
var simulatedOccupancyChanges = interval(5000).pipe(
  map(i => i % 2 === 1),
  map(hold => ({
    type: "setOccupancy",
    payload: {
      num: "20",
      occupancy: hold ? "hold" : "open"
    }
  }))
  // TODO Output messages about to be sent in the console with tap()
  // TODO Keep clients in sync by using share()
);
