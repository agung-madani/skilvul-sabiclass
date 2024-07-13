import { getTokenOrRefresh } from "./token_util.js";
import { socket } from "./script.js";

const captionsButton = document.getElementById("captionsButton");
let recognizer; // Declare recognizer variable globally

captionsButton.addEventListener("click", () => {
  socket.emit("start-captions");

  const displayTextContainer = document.getElementById("captionsContainer");
  if (displayTextContainer.classList.contains("hidden")) {
    console.log("Mic is on");
    startSpeechToText();
  } else {
    console.log("Mic is off");
    stopSpeechToText();
  }
});

socket.on("start-captions", captionsButtonClicked);

function captionsButtonClicked() {
  const displayTextContainer = document.getElementById("captionsContainer");
  displayTextContainer.classList.toggle("hidden");
  console.log("Captions button is clicked");
}

function requestUserMediaAudio() {
  return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
}

async function startSpeechToText() {
  try {
    const stream = await requestUserMediaAudio();
    const tokenObj = await getTokenOrRefresh();
    console.log(tokenObj);
    const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(
      tokenObj.authToken,
      tokenObj.region
    );
    speechConfig.speechRecognitionLanguage = "id-ID";

    const audioConfig = SpeechSDK.AudioConfig.fromStreamInput(stream);
    recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

    recognizer.recognized = (s, e) => {
      if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
        const recognitionResult = e.result.text;
        console.log(recognitionResult);

        socket.emit("add-captions", recognitionResult); // Emit recognition result
      }
    };

    recognizer.startContinuousRecognitionAsync(() => {
      setDisplayText("Speak into your microphone...");
    });
  } catch (error) {
    console.error("Error accessing microphone or starting recognition:", error);
    setDisplayText(
      "Error accessing microphone or starting recognition. Please try again."
    );
  }
}

function stopSpeechToText() {
  if (recognizer) {
    recognizer.stopContinuousRecognitionAsync(
      () => {
        console.log("Recognition stopped.");
      },
      (error) => {
        console.error("Error stopping recognition:", error);
      }
    );
  }
}

socket.on("add-captions", (captions) => {
  setDisplayText(captions); // Update display text for all clients
});

function setDisplayText(text) {
  const displayText = document.getElementById("captionsText");
  if (displayText) {
    displayText.textContent = text;
  }
}
