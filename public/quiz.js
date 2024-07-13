// Import the socket from the main script
import { socket } from "./script.js";

// Get references to the new elements
const quizButton = document.getElementById("quizButton");
const quizContainer = document.getElementById("quizContainer");
const closeQuizButton = document.getElementById("closeQuizButton");

// Function to show the quiz container
const showQuiz = () => {
  quizContainer.classList.remove("hidden");
  document.getElementById("downloadQuizButton").classList.add("hidden");
};

// Function to hide the quiz container
const hideQuiz = () => {
  quizContainer.classList.add("hidden");
};

// Add event listener for quiz button click
quizButton.addEventListener("click", () => {
  console.log("Quiz button clicked");
  socket.emit("start-quiz");
});

// Add event listener for close quiz button
closeQuizButton.addEventListener("click", hideQuiz);

// Listen for "start-quiz" event from the server
socket.on("start-quiz", () => {
  showQuiz();
});

let questions = []; // Define questions array globally to store quiz data
let userAnswers = []; // Define array to store user's answers
let csvContent = ""; // Variable to hold CSV content

async function loadQuizFromCSV() {
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

    displayQuiz();
  } catch (error) {
    console.error("Error loading quiz data:", error);
  }
}

// Function to display the quiz interface with all questions
function displayQuiz() {
  const quizQuestions = document.getElementById("quizQuestions");

  // Clear existing content
  quizQuestions.innerHTML = "";

  // Loop through questions and add them to the container
  questions.forEach((q, index) => {
    const questionDiv = document.createElement("div");
    questionDiv.classList.add("question-item");

    // Question text
    const questionText = document.createElement("p");
    questionText.textContent = `Pertanyaan ${index + 1}: ${q.question}`;
    questionDiv.appendChild(questionText);

    // Choices
    const choicesList = document.createElement("ul");
    q.choices.forEach((choice, idx) => {
      const choiceItem = document.createElement("li");

      // Create radio button for each choice
      const choiceInput = document.createElement("input");
      choiceInput.type = "radio";
      choiceInput.name = `question${index}`;
      choiceInput.value = idx;
      choiceInput.id = `question${index}_choice${idx}`;

      // Label for radio button
      const choiceLabel = document.createElement("label");
      choiceLabel.htmlFor = choiceInput.id;
      choiceLabel.textContent = `${String.fromCharCode(65 + idx)}. ${choice}`;

      choiceItem.appendChild(choiceInput);
      choiceItem.appendChild(choiceLabel);

      choicesList.appendChild(choiceItem);
    });
    questionDiv.appendChild(choicesList);

    // Add question item to the container
    quizQuestions.appendChild(questionDiv);
  });
}

function saveAnswersToCSV() {
  // Collect user answers and compare with correct answers
  userAnswers = questions.map((q, index) => {
    const selectedChoice = document.querySelector(
      `input[name="question${index}"]:checked`
    );
    const isCorrect = selectedChoice
      ? parseInt(selectedChoice.value, 10) === q.correctAnswer
      : false;
    return {
      question: q.question,
      isCorrect,
    };
  });

  // Convert answers to CSV format
  csvContent = "data:text/csv;charset=utf-8,question,is_correct\n";
  userAnswers.forEach((answer) => {
    csvContent += `${answer.question},${answer.isCorrect}\n`;
  });
}

function triggerCSVDownload() {
  // Create a downloadable link
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "answers.csv");
  document.body.appendChild(link);

  link.click();
  document.body.removeChild(link);
}

// Load quiz when the page is ready
document.addEventListener("DOMContentLoaded", () => {
  loadQuizFromCSV();

  // Add event listener to the submit button
  document.getElementById("submitQuizButton").addEventListener("click", () => {
    alert("Terima kasih telah mengisi Quiz");
    document.getElementById("quizContainer").classList.add("hidden");
    socket.emit("end-quiz");
  });

  // Add event listener to the download button
  document
    .getElementById("downloadQuizButton")
    .addEventListener("click", () => {
      triggerCSVDownload();
    });
});

socket.on("end-quiz", () => {
  saveAnswersToCSV();
  document.getElementById("downloadQuizButton").classList.remove("hidden");
});
