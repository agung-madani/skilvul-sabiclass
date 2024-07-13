// Import the socket from the main script
import { socket } from "./script.js";

// Handle chat toggle button click
const toggleChatButton = document.getElementById("toggleChatButton");
toggleChatButton.addEventListener("click", () => {
  const mainRight = document.querySelector(".main_right");
  mainRight.classList.toggle("hidden");
});

// Initialize chat visibility
const initializeChatVisibility = () => {
  const mainRight = document.querySelector(".main_right");
  mainRight.classList.add("hidden");
};
initializeChatVisibility();

// Handle send message button click
const sendMessageButton = document.getElementById("sendMessage");
sendMessageButton.addEventListener("click", () => {
  sendMessage();
});

// Handle enter key press in chat input
const chatInput = document.getElementById("chat_message");
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
});

// Function to send chat message
const sendMessage = () => {
  const message = chatInput.value.trim();
  if (message.length > 0) {
    socket.emit("message", message);
    chatInput.value = "";
  }
};
