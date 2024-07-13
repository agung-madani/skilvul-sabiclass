// text-to-speech
import { socket } from "./script.js";
import { getTokenOrRefresh } from "./token_util.js";
import fileSaver from "https://cdn.jsdelivr.net/npm/file-saver@2.0.5/+esm";

let questions = []; // Define questions array globally to store quiz data
let results = []; // Define results array globally to store the answers

async function loadQuizVoiceFromCSV() {
  try {
    const response = await fetch("questions.csv");
    const csvText = await response.text();

    // Parse CSV data
    const lines = csvText.split("\n");
    const headers = lines[0].split(",");

    // Reset questions array
    questions = [];

    // Assuming each line after the header represents a question
    for (let i = 1; i < lines.length; i++) {
      const data = lines[i].split(",");

      const question = data[0];
      const choices = data.slice(1, 5); // Choices are from index 1 to 4
      const correctAnswer = parseInt(data[5], 10); // Convert answer to integer

      // Store each question and choices for later navigation
      questions.push({ question, choices, correctAnswer });
    }
  } catch (error) {
    console.error("Error loading quiz data:", error);
  }
}

const quizVoiceButton = document.getElementById("quizVoiceButton");
const quizVoiceContainer = document.getElementById("quizVoiceContainer");
const quizVoiceContent = document.getElementById("quizVoiceContent");
const quizDownloadButton = document.getElementById("downloadQuizButtonTN");

// Load quiz when the page is ready
document.addEventListener("DOMContentLoaded", () => {
  loadQuizVoiceFromCSV();

  quizVoiceButton.addEventListener("click", async () => {
    console.log("Quiz Voice button clicked");
    if (!quizDownloadButton.classList.contains("hidden")) {
      quizDownloadButton.classList.add("hidden");
    }
    socket.emit("start-quiz-voice", { initiator: socket.id });
  });

  quizDownloadButton.addEventListener("click", () => {
    downloadCSV();
  });
});

import { muteUnmute } from "./script.js";

socket.on("start-quiz-voice", async (data) => {
  console.log("Voice Quiz started", data);
  // Check if the current socket ID is not the initiator's ID
  console.log(socket.id);
  console.log(data.initiator !== socket.id);
  if (data.initiator !== socket.id) {
    if (
      !document
        .querySelector("#muteButton")
        .classList.contains("background_red")
    ) {
      muteUnmute();
    }
    quizVoiceContainer.classList.remove("hidden");
    await quizScenario();
  }
});

function setDisplayText(text) {
  const quizVoiceText = document.createElement("div");
  quizVoiceText.id = "quizVoiceText";
  quizVoiceText.classList.add("captions_text");
  quizVoiceText.textContent = text;

  quizVoiceContent.appendChild(quizVoiceText);
}

let textToSpeak;
let resultText;

async function quizScenario() {
  console.log("quizScenario Start", questions.length);
  let formattedArray;
  let resultFormattedArray;
  for (let i = 0; i < questions.length; i++) {
    console.log("quizScenario Loop", i, questions.length);
    const question = questions[i];
    const choices = question.choices;
    // Create a new array with the desired format
    formattedArray = choices.map(
      (name, index) => `${String.fromCharCode(65 + index)}. ${name}`
    );
    // Join the array into a single string separated by commas
    resultFormattedArray = formattedArray.join(", ");
    console.log(resultFormattedArray);
    if (i === 0) {
      textToSpeak = `Waktunya Quiz! ${question.question} ${resultFormattedArray}`;
      setDisplayText(textToSpeak);
      await textToSpeech(textToSpeak);
    } else {
      textToSpeak = `Kamu menjawab: ${resultText} Pertanyaan Selanjutnya! ${question.question} ${resultFormattedArray}`;
      setDisplayText(textToSpeak);
      await textToSpeech(textToSpeak);
    }

    //add timeout to wait 15 seconds
    await new Promise((resolve) => setTimeout(resolve, 15000));

    // Play beep sound
    const beep = new Audio("./sound/beep.wav");
    beep.play();
    await new Promise((resolve) => (beep.onended = resolve));
    resultText = "test";
    resultText = await sttFromMic();
    beep.play();
    await new Promise((resolve) => (beep.onended = resolve));
    results.push({ question: question.question, answer: resultText });
  }
  socket.emit("end-quiz-voice", { results: results });
  quizVoiceContainer.classList.add("hidden");
}

socket.on("end-quiz-voice", (data) => {
  console.log("Quiz Voice Ended");
  saveResultsToCSV(data.results);
  quizDownloadButton.classList.remove("hidden");
});

let csvBlob;

function saveResultsToCSV(results) {
  const csvHeader = "question,answer\n";
  const csvContent = results
    .map((result) => `${result.question},${result.answer}`)
    .join("\n");
  csvBlob = new Blob([csvHeader + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
}

function downloadCSV() {
  fileSaver.saveAs(csvBlob, "quiz_results.csv");
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

function requestUserMediaAudio() {
  return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
}

async function sttFromMic() {
  console.log("sttFromMic is called");

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
    const recognizer = new SpeechSDK.SpeechRecognizer(
      speechConfig,
      audioConfig
    );

    return new Promise((resolve, reject) => {
      recognizer.recognizeOnceAsync((result) => {
        if (result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
          const recognitionResult = result.text;
          console.log(recognitionResult);
          setDisplayText(`${recognitionResult}`);
          resolve(recognitionResult);
        } else {
          console.error("Speech recognition error:", result.errorDetails);
          reject(result.errorDetails);
        }
      });
    });
  } catch (error) {
    console.error("Error in speech recognition:", error);
    return Promise.reject(error);
  }
}
