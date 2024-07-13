---

# Sabiclass

SabiClass for Equitable Access to Disability Education

## Overview

This application is designed for hosting live video classes or meetings with two participants. It utilizes WebRTC for peer-to-peer video/audio communication, Socket.IO for real-time messaging and events, and integrates various APIs for additional functionalities such as text summarization and speech recognition.

## Features

- **Real-time Video and Audio Communication**: Peer-to-peer video streaming using WebRTC and PeerJS.
- **Interactive Features**: Includes captions, gesture recognition, quizzes, and text-to-speech/speech-to-text.
- **API Integration**: Fetches JSON and binary models, summarizes text, and obtains speech tokens.
- **User Interface**: Responsive UI with controls for video/audio toggling, messaging, and interactive options.

## Socket.IO Events

The application uses Socket.IO for real-time communication. Key events include:

- `join-room`: Handles user joining a specific room.
- `add-captions`, `start-recording`, `start-gesture`, `start-canvas`: Controls interactive features.
- `quiz`, `quiz-voice`,`download-quiz`: Handle quiz features.
- `record`,`download-record`: Handle audo recording into text and summarize.
- `message`: Handles chat messages between users.
- `disconnect`: Manages user disconnection from the room.

## API Endpoints

- **GET `/api/proxy-json`**: Fetches JSON model from external API.
- **GET `/api/proxy-bin`**: Fetches binary model from external API.
- **POST `/api/summarize`**: Summarizes text based on input data.
- **GET `/api/get-speech-token`**: Retrieves speech token for authorization.

## Contributor

- Aghnia Nurhidayah - Artificial Intelligence
- Agung Rashif M. - Artificial Intelligence
- Alexander Gosal - Artificial Intelligence
- Rifaldi Achmad F. - Artificial Intelligence
- Abi Daffa Arilla - Data
- Khairunnisa Nada M. - Data

---
