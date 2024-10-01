const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server);

let users = {};
let quizData = [
    { question: "What is the capital of France?", options: ["Paris", "Berlin", "Madrid", "Rome"], answer: "Paris" },
    { question: "Who wrote '1984'?", options: ["George Orwell", "Aldous Huxley", "Ray Bradbury", "J.K. Rowling"], answer: "George Orwell" },
    { question: "What is the fastest land animal?", options: ["Cheetah", "Lion", "Horse", "Elephant"], answer: "Cheetah" }
];

let currentQuestionIndex = 0;
let players = [];

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/app.html');
});

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Add player to the game if not already 2 players
    if (players.length < 2) {
        players.push(socket.id);
        users[socket.id] = { score: 0 };

        // Notify player
        socket.emit('welcome', { message: 'Welcome to the quiz!', playerId: socket.id });

        if (players.length === 2) {
            // Start the quiz
            startQuiz();
        }
    } else {
        // If more than 2 players, deny the connection
        socket.emit('full', { message: 'The game is already full!' });
    }

    socket.on('answer', (data) => {
        const { playerId, answer } = data;

        if (quizData[currentQuestionIndex].answer === answer) {
            users[playerId].score += 1;
        }

        if (currentQuestionIndex < quizData.length - 1) {
            currentQuestionIndex++;
            sendNextQuestion();
        } else {
            endGame();
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        players = players.filter(player => player !== socket.id);
    });
});

function startQuiz() {
    currentQuestionIndex = 0;
    sendNextQuestion();
}

function sendNextQuestion() {
    const question = quizData[currentQuestionIndex];
    io.emit('question', question);
}

function endGame() {
    const playerScores = players.map(playerId => ({
        playerId,
        score: users[playerId].score
    }));

    io.emit('end', { message: "Game Over!", scores: playerScores });
    resetGame();
}

function resetGame() {
    players = [];
    users = {};
}

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
