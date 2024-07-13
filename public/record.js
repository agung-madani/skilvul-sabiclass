import { socket } from "./script.js";
import { getTokenOrRefresh } from "./token_util.js";

const recordButton = document.getElementById("recordButton");
const recordingText = document.getElementById("recordingText");
const displayActionText = document.getElementById("displayActionText");
const downloadRecordAndSummarizeButton = document.getElementById(
  "downloadRecordAndSummarizeButton"
);

recordButton.addEventListener("click", function () {
  console.log("Record button clicked..");
  if (recordingText.classList.contains("hidden")) {
    recordButton.classList.add("background_red");
    socket.emit("start-recording");
    console.log("Recording started..");
    mediaRecorder.start();
  } else {
    recordButton.classList.remove("background_red");
    socket.emit("stop-recording");
    console.log("Recording stopped..");
    mediaRecorder.stop();
    downloadRecordAndSummarizeButton.classList.remove("hidden");
  }
});

socket.on("start-recording", () => {
  recordingText.classList.remove("hidden");
});

socket.on("stop-recording", () => {
  recordingText.classList.add("hidden");
});

let mediaRecorder,
  chunks = [];

let wavURL;

if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
  console.log("mediaDevices supported..");

  navigator.mediaDevices
    .getUserMedia({
      audio: true,
    })
    .then((stream) => {
      mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      mediaRecorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        chunks = [];
        // Convert to WAV format
        const wavBlob = await convertToWav(blob);
        wavURL = window.URL.createObjectURL(wavBlob);

        console.log(wavURL);
      };
    })
    .catch((error) => {
      console.log("Following error has occured : ", error);
    });
} else {
  stateIndex = "";
  application(stateIndex);
}

async function convertToWav(webmBlob) {
  return new Promise((resolve, reject) => {
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    const reader = new FileReader();

    reader.onload = function () {
      audioContext.decodeAudioData(reader.result, function (buffer) {
        const wavBuffer = bufferToWav(buffer);
        const wavBlob = new Blob([new Uint8Array(wavBuffer)], {
          type: "audio/wav",
        });
        resolve(wavBlob);
      });
    };

    reader.readAsArrayBuffer(webmBlob);
  });
}

// Function to convert AudioBuffer to WAV format (Uint8Array)
function bufferToWav(buffer) {
  const numOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const result = new Uint8Array(length * 2);
  let outputIndex = 0;

  for (let channel = 0; channel < numOfChannels; channel++) {
    const inputData = buffer.getChannelData(channel);
    for (let inputIndex = 0; inputIndex < length; inputIndex++) {
      const data = inputData[inputIndex] * 32767.0;
      result[outputIndex++] = data;
      result[outputIndex++] = data >> 8;
    }
  }

  const view = new DataView(result.buffer);
  writeString(view, 0, "RIFF");
  view.setUint32(4, 32 + result.length, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, numOfChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, result.length, true);
  return result;
}

// Helper function to write strings to DataView
function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

downloadRecordAndSummarizeButton.addEventListener("click", async function () {
  try {
    setDisplayActionText("Downloading audio recording...");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const audioFile = await downloadAudio(wavURL);

    setDisplayActionText("Transcribing audio to text...");
    const result_fileSTT = await fileSpeechToText(audioFile);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log(result_fileSTT);

    setDisplayActionText("Downloading Transcription...");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    downloadTextFile(result_fileSTT, "transciption.txt");

    // const result_fileSTT =
    //   "Tolong diberikan sedikit waktu untuk menjelaskan tentang keunggulan produk kami. Produk ini dirancang dengan teknologi terbaru untuk memenuhi kebutuhan Anda sehari-hari dengan efisiensi yang tinggi. Kami yakin Anda akan merasa puas dengan kinerja dan kehandalan produk ini dalam menjalani aktivitas sehari-hari Anda.";

    setDisplayActionText("Summarizing Transcription...");
    const summary = await summarizeText(result_fileSTT);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log("Summary:", summary);

    setDisplayActionText("Downloading Summary...");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    downloadTextFile(summary, "summary.txt");

    setDisplayActionText("Selesai");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    setDisplayActionText("");
  } catch (error) {
    console.error("Error:", error);
  }
});

function setDisplayActionText(text) {
  displayActionText.innerText = text;
}

const downloadAudio = async (url) => {
  const response = await fetch(url);
  const blob = await response.blob();
  const audioFile = new File([blob], "audio.wav", { type: "audio/wav" });

  const downloadLink = document.createElement("a");
  downloadLink.href = URL.createObjectURL(audioFile);
  downloadLink.setAttribute("download", "audio.wav");
  downloadLink.click();
  console.log("downloaded");

  return audioFile;
};

async function fileSpeechToText(audioFile) {
  console.log(audioFile);

  const tokenObj = await getTokenOrRefresh();
  const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(
    tokenObj.authToken,
    tokenObj.region
  );
  speechConfig.speechRecognitionLanguage = "id-ID";

  const audioConfig = SpeechSDK.AudioConfig.fromWavFileInput(audioFile);
  const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
  console.log("will recognizing");

  return new Promise((resolve, reject) => {
    recognizer.recognizeOnceAsync((result) => {
      console.log("recognizing...");
      if (result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
        resolve(result.text);
      } else {
        console.log("error CUY");
        reject(
          "ERROR: Speech was cancelled or could not be recognized. Ensure your microphone is working properly."
        );
      }
    });
  });
}

async function summarizeText(text) {
  try {
    // Send a POST request to the summarization API with the text
    const response = await axios.post("api/summarize", {
      text,
    });

    // Check if the response status is not 200 (OK)
    if (response.status !== 200) {
      throw new Error(`Request failed with status: ${response.status}`);
    }

    // Log and return the summary from the response
    console.log(response.data);
    return response.data.summary_text;
  } catch (error) {
    // If an error occurs during the API call, throw an error
    throw new Error(`Error summarizing text: ${error.message}`);
  }
}

function downloadTextFile(text, filename) {
  const blob = new Blob([text], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
