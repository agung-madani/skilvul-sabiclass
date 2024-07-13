---

# Sabiclass

SabiClass for Equitable Access to Disability Education

## Overview

![image](https://github.com/user-attachments/assets/270216ef-5778-498e-bacd-fd6e529ccfbd)

This application is designed for hosting live video classes or meetings with two participants. It utilizes WebRTC for peer-to-peer video/audio communication, Socket.IO for real-time messaging and events, and integrates various APIs for additional functionalities such as, speech-to-text, text-to-speech, text summarization, hand landmark, and sign language recognition.

## Techstack

![image](https://github.com/user-attachments/assets/f33344b8-e45b-466e-a6e3-e15f320d8118)

![image](https://github.com/user-attachments/assets/be6ac99c-b01a-4b71-aae5-81c497524a13)

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

## Contributor

- Aghnia Nurhidayah - Artificial Intelligence
- Agung Rashif M. - Artificial Intelligence
- Alexander Gosal - Artificial Intelligence
- Rifaldi Achmad F. - Artificial Intelligence
- Abi Daffa Arilla - Data
- Khairunnisa Nada M. - Data

![image](https://github.com/user-attachments/assets/b887328f-91b8-4d70-acbd-c633a6a0fe98)

![image](https://github.com/user-attachments/assets/21ee0f8f-0006-4089-bfd1-bab835696a31)

---
