import { socket } from "./script.js";
import { getTokenOrRefresh } from "./token_util.js";

const gestureContainer = document.getElementById("gestureContainer");
const gestureButton = document.getElementById("gestureButton");
const gestureText = document.getElementById("gestureText");

let predicting = false;

gestureButton.addEventListener("click", () => {
  socket.emit("start-gesture");
  main();
});

socket.on("start-gesture", async () => {
  gestureContainer.classList.toggle("hidden");
  if (gestureContainer.classList.contains("hidden")) {
    predicting = false;
  }
});

let jsonBlobCache = null;
let binBlobCache = null;

async function loadModel() {
  try {
    // Fetch the JSON model file if not already cached
    if (!jsonBlobCache) {
      console.log("save to blob");
      const jsonResponse = await fetch("api/proxy-json");
      jsonBlobCache = await jsonResponse.blob();
    }
    const jsonFile = new File([jsonBlobCache], "model.json");

    // Fetch the binary model file if not already cached
    if (!binBlobCache) {
      console.log("save to blob");
      const binResponse = await fetch("api/proxy-bin");
      binBlobCache = await binResponse.blob();
    }
    const binFile = new File([binBlobCache], "group1-shard1of1.bin");

    // Load the model using tf.io.browserFiles
    const model = await tf.loadLayersModel(
      tf.io.browserFiles([jsonFile, binFile])
    );
    console.log(model);
    return model;
  } catch (error) {
    console.error("Error loading model:", error);
  }
}

async function predictHandSign(model, landmarks) {
  const data_aux = [];
  const x_ = [];
  const y_ = [];

  landmarks.forEach((landmark) => {
    x_.push(landmark.x);
    y_.push(landmark.y);
  });

  landmarks.forEach((landmark) => {
    data_aux.push(landmark.x - Math.min(...x_));
    data_aux.push(landmark.y - Math.min(...y_));
  });

  if (data_aux.length === 42) {
    const input = tf.tensor2d([data_aux]);
    const prediction = model.predict(input);
    const predictedIndex = prediction.argMax(-1).dataSync()[0];
    return predictedIndex;
  }

  return -1;
}
async function requestVideoAttribute() {
  return document.getElementById(socket.id);
}
async function main() {
  const startButton = document.getElementById("startButton");
  const stopButton = document.getElementById("stopButton");
  const backspaceButton = document.getElementById("backspaceButton");
  const restartButton = document.getElementById("restartButton");

  const controlsElement = document.getElementById("controls");

  const video = await requestVideoAttribute();

  gestureText.innerText = "Loading model and detector...";

  const model = await loadModel();

  const detector = await handPoseDetection.createDetector(
    handPoseDetection.SupportedModels.MediaPipeHands,
    {
      runtime: "tfjs",
      maxHands: 1,
      modelType: "lite",
    }
  );

  console.log(detector);

  const labelsDict = {
    0: "aku",
    1: "bicara",
    2: "bisa",
    3: "hai",
    4: "kamu",
    5: "kita",
    6: "tidak",
    7: "ya",
  };

  gestureText.innerText = "Model and Detector Loaded...";
  controlsElement.classList.remove("hidden");

  let predictedLabelsString = "";

  restartButton.addEventListener("click", async () => {
    predictedLabelsString = "";
    lastPredictedLabel = "";
    gestureText.innerText = predictedLabelsString;
  });

  backspaceButton.addEventListener("click", async () => {
    // Get the current text
    let currentText = predictedLabelsString;

    // Split the text into an array of words
    let words = currentText.split(" ");

    // Remove the last word
    words.pop();

    // Join the remaining words back into a string
    let updatedText = words.join(" ");

    // Set the updated string back to gestureText.innerText
    predictedLabelsString = updatedText;
    lastPredictedLabel = "";
    gestureText.innerText = predictedLabelsString;
  });

  startButton.addEventListener("click", () => {
    gestureText.innerText = "Now Pose Your Hand...";
    if (!predicting) {
      predicting = true;
      startButton.style.display = "none";
      stopButton.style.display = "inline-block";
      predictLoop();
    }
  });

  stopButton.addEventListener("click", async () => {
    console.log("Predicted Labels:", predictedLabelsString);
    await socket.emit("start-text-to-voice", {
      initiator: socket.id,
      text: predictedLabelsString,
    });
    predicting = false;
    startButton.style.display = "inline-block";
    stopButton.style.display = "none";
    predictedLabelsString = "";
  });

  let lastPredictedLabel = ""; // Track the last predicted label

  async function predictLoop() {
    console.log(video);
    const predictions = await detector.estimateHands(video);
    console.log(predictions);

    if (predictions.length > 0) {
      const landmarks = predictions[0].keypoints;
      const predictedIndex = await predictHandSign(model, landmarks);

      if (predictedIndex !== -1) {
        const predictedLabel = labelsDict[predictedIndex];

        // Check if predicted label is different from the last one
        if (predictedLabel !== lastPredictedLabel) {
          predictedLabelsString += " " + predictedLabel;
          lastPredictedLabel = predictedLabel; // Update last predicted label

          // console.log("Predicted Label:", predictedLabelsString);
        }
      }
    }
    gestureText.innerText = predictedLabelsString;
    if (predicting) {
      requestAnimationFrame(predictLoop);
    }
  }
}

function textToSpeech(textToSpeak) {
  return new Promise(async (resolve, reject) => {
    const tokenObj = await getTokenOrRefresh();
    const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(
      tokenObj.authToken,
      tokenObj.region
    );
    const audioConfig = SpeechSDK.AudioConfig.fromDefaultSpeakerOutput();

    let synthesizer = new SpeechSDK.SpeechSynthesizer(
      speechConfig,
      audioConfig
    );

    synthesizer.speakTextAsync(
      textToSpeak,
      (result) => {
        if (
          result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted
        ) {
          console.log(`synthesis finished for "${textToSpeak}".\n`);
          resolve();
        } else if (result.reason === SpeechSDK.ResultReason.Canceled) {
          console.log(
            `synthesis failed. Error detail: ${result.errorDetails}.\n`
          );
          reject(result.errorDetails);
        }
        synthesizer.close();
        synthesizer = undefined;
      },
      (err) => {
        console.log(`Error: ${err}.\n`);
        synthesizer.close();
        synthesizer = undefined;
        reject(err);
      }
    );
  });
}

socket.on("start-text-to-voice", async (data) => {
  gestureText.innerText = data.text;
  return new Promise(async (resolve, reject) => {
    try {
      if (data.initiator !== socket.id) {
        await textToSpeech(data.text);
        resolve();
      } else {
        resolve();
      }
    } catch (error) {
      reject(error);
    }
  });
});
