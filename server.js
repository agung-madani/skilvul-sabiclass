import dotenv from "dotenv";
import express from "express";
import http from "http";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";
import { ExpressPeerServer } from "peer";
import axios from "axios";

dotenv.config();

const __dirname = path.resolve();

const app = express();
const server = http.createServer(app);

// Create socket.io instance
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  addTrailingSlash: false,
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // to handle URL-encoded data

// PeerJS setup
const peerServer = ExpressPeerServer(server, {
  debug: true,
});
app.use("/peerjs", peerServer);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// Set the view engine to use EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Home route renders the home page
app.get("/", (req, res) => {
  res.render("home");
});

// Room route renders the room with the specified roomId
app.get("/:room", (req, res) => {
  res.render("room", {
    roomId: req.params.room,
    host: req.query.host,
    accessibility: req.query.accessibility,
  });
});

// Handle form submission and redirect to a new room
app.post("/create-room", (req, res) => {
  const { host, accessibility } = req.body;
  const roomId = uuidv4();
  res.redirect(
    `/${roomId}?host=${encodeURIComponent(
      host
    )}&accessibility=${encodeURIComponent(accessibility)}`
  );
});

// Socket.io connections and events handling
io.on("connection", (socket) => {
  // When a user joins a room
  socket.on("join-room", (roomId, userId, userName) => {
    console.log(`User ${userId} joined room ${roomId}`);
    socket.join(roomId);

    // Broadcast to everyone in the room that a new user has connected
    setTimeout(() => {
      if (io.sockets.adapter.rooms.get(roomId)) {
        socket.to(roomId).emit("user-connected", userId);
      } else {
        console.error(`Room ${roomId} does not exist.`);
      }
    }, 1000);

    // Listen for add-captions event
    socket.on("add-captions", (captions) => {
      console.log("Captions received:", captions);
      io.to(roomId).emit("add-captions", captions);
    });

    // Listen for start-captions event
    socket.on("start-captions", () => {
      io.to(roomId).emit("start-captions");
    });

    // Listen for start-gesture event
    socket.on("start-gesture", () => {
      io.to(roomId).emit("start-gesture");
    });

    // Listen for start-recording event
    socket.on("start-recording", () => {
      io.to(roomId).emit("start-recording");
    });

    // Listen for stop-recording event
    socket.on("stop-recording", () => {
      io.to(roomId).emit("stop-recording");
    });

    // Listen for start-quiz event
    socket.on("start-quiz", () => {
      io.to(roomId).emit("start-quiz");
    });

    // Listen for end-quiz event
    socket.on("end-quiz", () => {
      io.to(roomId).emit("end-quiz");
    });

    socket.on("start-quiz-voice", (data) => {
      io.to(roomId).emit("start-quiz-voice", data);
    });

    socket.on("start-text-to-voice", (data) => {
      io.to(roomId).emit("start-text-to-voice", data);
    });

    // Listen for end-quiz event
    socket.on("end-quiz-voice", (data) => {
      io.to(roomId).emit("end-quiz-voice", data);
    });

    // Listen for start-canvas event
    socket.on("start-canvas", () => {
      io.to(roomId).emit("start-canvas");
    });

    socket.on("draw", (data) => {
      // Broadcast drawing data to other connected peers
      socket.broadcast.emit("draw", data);
    });

    // Listen for feature-options event
    socket.on("feature-options", () => {
      io.to(roomId).emit("feature-options");
    });

    // Listen for messages sent by users
    socket.on("message", (message) => {
      // Send the message to everyone in the room
      io.to(roomId).emit("createMessage", message, userName);
    });

    socket.on("manual-disconnect", () => {
      if (io.sockets.adapter.rooms.get(roomId)) {
        socket.to(roomId).emit("user-disconnected", userId, userName);
        socket.leave(roomId);
      } else {
        console.error(`Room ${roomId} does not exist on manual disconnect.`);
      }
    });

    // When a user disconnects
    socket.on("disconnect", () => {
      if (io.sockets.adapter.rooms.get(roomId)) {
        socket.to(roomId).emit("user-disconnected", userId, userName);
      } else {
        console.error(`Room ${roomId} does not exist on disconnect.`);
      }
    });
  });
  // Handle end-class event from the host
  socket.on("end-class", () => {
    console.log("Class ended by host:", socket.id);
    io.emit("end-class");
  });
});

app.get("/api/proxy-json", async (req, res) => {
  try {
    const response = await axios.get(process.env.PROXY_JSON, {
      responseType: "stream",
    });
    response.data.pipe(res);
  } catch (error) {
    res.status(500).send("Error fetching JSON model");
  }
});

app.get("/api/proxy-bin", async (req, res) => {
  try {
    const response = await axios.get(process.env.PROXY_BIN, {
      responseType: "stream",
    });
    response.data.pipe(res);
  } catch (error) {
    res.status(500).send("Error fetching binary model");
  }
});

app.post("/api/summarize", async (req, res) => {
  try {
    const apiToken = process.env.API_TOKEN;
    const url = process.env.URL_SUMMARIZATION;
    const requestBody = { inputs: req.body.text };

    const requestHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`,
    };

    console.log("Request Body:", requestBody);
    console.log("Request Headers:", requestHeaders);

    const response = await axios.post(url, requestBody, {
      headers: requestHeaders,
    });

    res.json(response.data);
  } catch (error) {
    console.error("Error summarizing text:", error.message);
    res.status(500).send(`Error summarizing text: ${error.message}`);
  }
});

console.log(process.env);

app.get("/api/get-speech-token", async (req, res, next) => {
  res.setHeader("Content-Type", "application/json");
  const speechKey = process.env.SPEECH_KEY;
  const speechRegion = process.env.SPEECH_REGION;

  if (
    speechKey === "paste-your-speech-key-here" ||
    speechRegion === "paste-your-speech-region-here"
  ) {
    res
      .status(400)
      .send("You forgot to add your speech key or region to the .env file.");
  } else {
    const headers = {
      headers: {
        "Ocp-Apim-Subscription-Key": speechKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    };

    console.log(speechKey, speechRegion);
    try {
      const tokenResponse = await axios.post(
        `https://${speechRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
        null,
        headers
      );
      res.send({ token: tokenResponse.data, region: speechRegion });
    } catch (err) {
      res.status(401).send("There was an error authorizing your speech key.");
    }
  }
});

const PORT = process.env.PORT || 3030;
server.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
