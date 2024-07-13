// Initialize variables and constants
export const socket = io("/");
const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");
let canvasRunning = false;
myVideo.muted = true;

import {
  HandLandmarker,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

let handLandmarker = undefined;
let runningMode = "IMAGE";
let bpoints = [[]];
let gpoints = [[]];
let rpoints = [[]];
let kpoints = [[]];
let points = [bpoints, gpoints, rpoints, kpoints];
let colorIndex = 0;
const colors = ["blue", "green", "red", "black"];
let drawColor = colors[colorIndex];

const createHandLandmarker = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
      delegate: "GPU",
    },
    runningMode: runningMode,
    numHands: 2,
  });
};
createHandLandmarker();

const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");

let lastVideoTime = -1;
let results = undefined;
let user;

if (HOST) {
  if (ACCESSIBILITY === "deaf") {
    document.getElementById("showButton").classList.remove("hidden");
    document.getElementById("quizButton").classList.remove("hidden");
    document.getElementById("recordButton").classList.remove("hidden");
    document.getElementById("endClass").classList.remove("hidden");
  } else if (ACCESSIBILITY === "blind") {
    document.getElementById("quizVoiceButton").classList.remove("hidden");
    document.getElementById("recordButton").classList.remove("hidden");
    document.getElementById("endClass").classList.remove("hidden");
  } else {
    document.getElementById("quizButton").classList.remove("hidden");
    document.getElementById("recordButton").classList.remove("hidden");
    document.getElementById("endClass").classList.remove("hidden");
  }
} else {
  // Prompt user for name
  user = prompt("Enter your name");
}

// Initialize PeerJS for WebRTC
const peer = new Peer(undefined, {
  path: "/peerjs",
  host: "/",
  port: "3030",
});
let myVideoStream;

function requestUserMedia() {
  return navigator.mediaDevices.getUserMedia({ audio: true, video: true });
}

requestUserMedia()
  .then((stream) => {
    // Store own video stream
    myVideoStream = stream;
    addVideoStream(myVideo, stream);

    // Answer incoming calls
    peer.on("call", (call) => {
      console.log("Incoming call");
      call.answer(stream);
      const video = document.createElement("video");
      call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream);
      });
    });

    // Handle user connections
    socket.on("user-connected", async (userId) => {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      connectToNewUser(userId, stream);
    });

    // Handle user disconnections
    socket.on("user-disconnected", (userId) => {
      removeVideoStream(userId);
    });

    // Handle incoming chat messages
    socket.on("createMessage", (message, userName) => {
      displayMessage(message, userName);
    });
  })
  .catch((err) => {
    console.log("Error accessing media devices: ", err);
  });

// Function to connect to a new user
const connectToNewUser = (userId, stream) => {
  console.log("Calling user: " + userId);
  const call = peer.call(userId, stream);
  const video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    video.setAttribute("data-peer-id", userId);
    video.setAttribute("id", socket.id);
    addVideoStream(video, userVideoStream);
  });
};

// Handle PeerJS connection open event
peer.on("open", (id) => {
  myVideo.setAttribute("data-peer-id", id);
  myVideo.setAttribute("id", socket.id);
  console.log("My ID is " + id);
  console.log("accessibility " + ACCESSIBILITY);
  console.log("Host_name", HOST);
  if (HOST) {
    socket.emit("join-room", ROOM_ID, id, HOST);
  } else {
    socket.emit("join-room", ROOM_ID, id, user);
  }
});

// Function to add a video stream to the UI
const addVideoStream = (video, stream) => {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
    // Insert the new video element before the canvas
    videoGrid.insertBefore(video, canvasElement);
    // videoGrid.append(video);
  });
  video.style.width = "40%";
  video.style.height = "auto";
  video.setAttribute("width", "640");
  video.setAttribute("height", "480");
};

const showButton = document.getElementById("showButton");
showButton.addEventListener("click", () => {
  socket.emit("feature-options");
});

socket.on("feature-options", () => {
  document.getElementById("gestureButton").classList.remove("hidden");
  document.getElementById("captionsButton").classList.remove("hidden");
});

// Function to remove a video stream from the UI
const removeVideoStream = (userId) => {
  const video = document.querySelector(`[data-peer-id="${userId}"]`);
  if (video) {
    video.remove();
  }
};

export async function muteUnmute() {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  myVideoStream.getAudioTracks()[0].enabled = !enabled;
  toggleButtonState(muteButton, "fas fa-microphone", "fas fa-microphone-slash");
}

// Handle mute button click
const muteButton = document.querySelector("#muteButton");
muteButton.addEventListener("click", () => {
  muteUnmute();
});

// Handle stop video button click
const stopVideo = document.querySelector("#stopVideo");
stopVideo.addEventListener("click", () => {
  const enabled = myVideoStream.getVideoTracks()[0].enabled;
  myVideoStream.getVideoTracks()[0].enabled = !enabled;
  toggleButtonState(stopVideo, "fas fa-video", "fas fa-video-slash");
});

// Toggle button state between enabled and disabled
const toggleButtonState = (button, enabledIcon, disabledIcon) => {
  const isEnabled = button.classList.toggle("background_red");
  button.innerHTML = isEnabled
    ? `<i class="${disabledIcon}"></i>`
    : `<i class="${enabledIcon}"></i>`;
};

document.addEventListener("DOMContentLoaded", () => {
  const inviteButton = document.querySelector("#inviteButton");
  inviteButton.addEventListener("click", () => {
    // Ensure the document has focus
    if (!document.hasFocus()) {
      window.focus();
    }

    const trimmedUrl = window.location.href.split("?")[0];

    navigator.clipboard
      .writeText(trimmedUrl)
      .then(() => {
        alert("URL copied to clipboard: " + trimmedUrl);
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  });
});

// Handle disconnect button click
const disconnectBtn = document.querySelector("#disconnect");
disconnectBtn.addEventListener("click", () => {
  // Clean up and disconnect from the call
  peer.destroy();
  const myVideoElement = document.querySelector("video");
  if (myVideoElement) {
    myVideoElement.remove();
  }
  socket.emit("manual-disconnect");
  socket.disconnect();
  window.location.href = "/";
});

// Handle endClass button click
const endClassBtn = document.querySelector("#endClass");
endClassBtn.addEventListener("click", () => {
  // Inform all users to disconnect
  socket.emit("end-class");

  // Clean up and disconnect from the call
  peer.destroy();
  const myVideoElement = document.querySelector("video");
  if (myVideoElement) {
    myVideoElement.remove();
  }
  socket.emit("disconnect");
  window.location.href = "/";
});

// Listen for the end-class event
socket.on("end-class", () => {
  peer.destroy();
  const myVideoElement = document.querySelector("video");
  if (myVideoElement) {
    myVideoElement.remove();
  }
  window.location.href = "/";
});

// Function to display chat message
const displayMessage = (message, userName) => {
  const messages = document.querySelector(".messages");
  const messageElement = document.createElement("div");
  messageElement.classList.add("message");
  messageElement.innerHTML = `<b>${userName}</b><span>${message}</span>`;
  messages.append(messageElement);
};

let lastLandmarks = null; // Track the last known hand landmarks
async function predictWebcam(video) {
  // Set up canvas and context
  canvasElement.style.width = video.videoWidth + "px";
  canvasElement.style.height = video.videoHeight + "px";
  canvasElement.width = video.videoWidth;
  canvasElement.height = video.videoHeight;
  const canvasCtx = canvasElement.getContext("2d");

  // Fill background with semi-white
  canvasCtx.fillStyle = "rgba(255, 255, 255, 0.5)"; // Adjust opacity as needed
  canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

  if (runningMode === "IMAGE") {
    runningMode = "VIDEO";
    await handLandmarker.setOptions({ runningMode: "VIDEO" });
  }

  let startTimeMs = performance.now();

  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    results = handLandmarker.detectForVideo(video, startTimeMs);
  }

  canvasCtx.save();

  // Apply mirroring transformations to drawing operations
  canvasCtx.scale(-1, 1);
  canvasCtx.translate(-canvasElement.width, 0);

  // Handle hand landmark detection and drawing
  if (results && results.landmarks && results.landmarks[0]) {
    const landmarks = results.landmarks[0];
    lastLandmarks = landmarks; // Update last known landmarks

    const x = landmarks[8] ? landmarks[8].x * canvasElement.width : 0;
    const y = landmarks[8] ? landmarks[8].y * canvasElement.height : 0;
    const thumbX = landmarks[4] ? landmarks[4].x * canvasElement.width : 0;
    const thumbY = landmarks[4] ? landmarks[4].y * canvasElement.height : 0;

    // Emit drawing data to server
    socket.emit("draw", { x, y, color: drawColor });

    canvasCtx.beginPath();
    canvasCtx.arc(x, y, 8, 0, 2 * Math.PI);
    canvasCtx.fillStyle = drawColor;
    canvasCtx.fill();

    if (Math.abs(thumbY - y) < 30) {
      points[colorIndex].push([]);
    }

    if (y <= 65) {
      if (x > 40 && x < 140) {
        points = [[[]], [[]], [[]], [[]]]; // Clear all points
      } else if (x > 160 && x < 255) {
        colorIndex = 0;
        drawColor = colors[colorIndex];
      } else if (x > 275 && x < 370) {
        colorIndex = 1;
        drawColor = colors[colorIndex];
      } else if (x > 390 && x < 485) {
        colorIndex = 2;
        drawColor = colors[colorIndex];
      } else if (x > 505 && x < 600) {
        colorIndex = 3;
        drawColor = colors[colorIndex];
      }
    } else {
      points[colorIndex][points[colorIndex].length - 1].push({ x, y });

      // Emit drawing data to the other peer via socket
      socket.emit("drawing", {
        color: drawColor,
        points: points[colorIndex][points[colorIndex].length - 1],
      });
    }

    points.forEach((colorPoints, index) => {
      canvasCtx.strokeStyle = colors[index];
      canvasCtx.lineWidth = 5;
      colorPoints.forEach((line) => {
        canvasCtx.beginPath();
        for (let i = 0; i < line.length; i++) {
          if (i === 0) {
            canvasCtx.moveTo(line[i].x, line[i].y);
          } else {
            canvasCtx.lineTo(line[i].x, line[i].y);
          }
        }
        canvasCtx.stroke();
      });
    });

    canvasCtx.strokeStyle = drawColor;
    canvasCtx.lineWidth = 5;
    canvasCtx.beginPath();
    canvasCtx.moveTo(x, y);
    canvasCtx.lineTo(x, y);
    canvasCtx.stroke();
  } else if (lastLandmarks) {
    // Render last known state if no landmarks detected
    const landmarks = lastLandmarks;
    const x = landmarks[8].x * canvasElement.width;
    const y = landmarks[8].y * canvasElement.height;

    // Emit drawing data to server
    socket.emit("draw", { x, y, color: drawColor });

    canvasCtx.beginPath();
    canvasCtx.arc(x, y, 8, 0, 2 * Math.PI);
    canvasCtx.fillStyle = drawColor;
    canvasCtx.fill();

    points.forEach((colorPoints, index) => {
      canvasCtx.strokeStyle = colors[index];
      canvasCtx.lineWidth = 5;
      colorPoints.forEach((line) => {
        canvasCtx.beginPath();
        for (let i = 0; i < line.length; i++) {
          if (i === 0) {
            canvasCtx.moveTo(line[i].x, line[i].y);
          } else {
            canvasCtx.lineTo(line[i].x, line[i].y);
          }
        }
        canvasCtx.stroke();
      });
    });

    canvasCtx.strokeStyle = drawColor;
    canvasCtx.lineWidth = 5;
    canvasCtx.beginPath();
    canvasCtx.moveTo(x, y);
    canvasCtx.lineTo(x, y);
    canvasCtx.stroke();
  }

  // Reset mirroring transformations after drawing operations
  canvasCtx.scale(-1, 1);
  canvasCtx.translate(-canvasElement.width, 0);

  canvasCtx.restore();

  // Draw color boxes and text labels outside mirroring transformations
  canvasCtx.fillStyle = "#000";
  canvasCtx.fillRect(40, 1, 100, 64);
  canvasCtx.fillStyle = "#F00";
  canvasCtx.fillRect(160, 1, 95, 64);
  canvasCtx.fillStyle = "#0F0";
  canvasCtx.fillRect(275, 1, 95, 64);
  canvasCtx.fillStyle = "#00F";
  canvasCtx.fillRect(390, 1, 95, 64);
  canvasCtx.fillStyle = "#000";
  canvasCtx.fillRect(505, 1, 95, 64);

  canvasCtx.fillStyle = "#FFF";
  canvasCtx.fillText("BLACK", 49, 33);
  canvasCtx.fillText("RED", 185, 33);
  canvasCtx.fillText("GREEN", 298, 33);
  canvasCtx.fillText("BLUE", 420, 33);
  canvasCtx.fillText("CLEAR", 520, 33);

  if (canvasRunning === true) {
    window.requestAnimationFrame(() => predictWebcam(video));
  }
}

socket.on("draw", (data) => {
  const { x, y, color } = data;
  const canvas = document.getElementById("output_canvas"); // Replace with your canvas element ID
  const ctx = canvas.getContext("2d");

  // Draw a circle
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, 2 * Math.PI);
  ctx.fillStyle = color; // Use the received color
  ctx.fill();
});

const canvasButton = document.getElementById("canvasButton");

canvasButton.addEventListener("click", () => {
  console.log("canvas Button is Clicked");
  socket.emit("start-canvas");
});

socket.on("start-canvas", () => {
  canvasRunning = !canvasRunning;
  if (canvasRunning) {
    predictWebcam(myVideo);
    canvasElement.classList.remove("hidden");
  } else {
    canvasElement.classList.add("hidden");
  }
});
