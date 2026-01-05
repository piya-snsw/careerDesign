const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 静的ファイルの配信
app.use(express.static(path.join(__dirname)));

// ゲームルームの管理
const rooms = new Map();

// CPU名のリスト
const CPU_NAMES = ['CPU-アルファ', 'CPU-ベータ', 'CPU-ガンマ', 'CPU-デルタ'];

// プレイヤークラス
class Player {
    constructor(id, name, isCPU = false) {
        this.id = id;
        this.name = name;
        this.isCPU = isCPU;
        this.score = 0;
        this.correctCount = 0;
        this.hasLostRight = false; // この問題で回答権を失ったか
        this.isReady = false; // 次の問題への準備ができているか
    }
}

// ゲームルームクラス
class GameRoom {
    constructor(id) {
        this.id = id;
        this.players = [];
        this.state = 'waiting'; // waiting, playing, finished
        this.currentQuestionIndex = 0;
        this.questions = [];
        this.lobbyTimer = null;
        this.questionTimer = null;
        this.answerTimer = null;
        this.lobbyTimeLeft = 15;
        this.questionTimeLeft = 30;
        this.answerTimeLeft = 5;
        this.maxPlayers = 4;
        this.questionCount = 10;

        // 早押し関連
        this.currentAnswerer = null; // 現在回答中のプレイヤー
        this.isPaused = false; // タイマーが一時停止中か
    }

    addPlayer(player) {
        if (this.players.length < this.maxPlayers) {
            this.players.push(player);
            return true;
        }
        return false;
    }

    removePlayer(playerId) {
        this.players = this.players.filter(p => p.id !== playerId);
    }

    getPlayerCount() {
        return this.players.filter(p => !p.isCPU).length;
    }

    fillWithCPU() {
        let cpuIndex = 0;
        while (this.players.length < this.maxPlayers) {
            const cpuPlayer = new Player(
                `cpu_${Date.now()}_${cpuIndex}`,
                CPU_NAMES[cpuIndex],
                true
            );
            this.players.push(cpuPlayer);
            cpuIndex++;
        }
    }

    resetForNextQuestion() {
        this.players.forEach(p => {
            p.hasLostRight = false;
        });
        this.questionTimeLeft = 30;
        this.answerTimeLeft = 5;
        this.currentAnswerer = null;
        this.isPaused = false;
        this.players.forEach(p => p.isReady = false);
    }

    getCurrentQuestion() {
        return this.questions[this.currentQuestionIndex];
    }

    // 回答権を持っているプレイヤーがいるか
    hasAvailableAnswerers() {
        return this.players.some(p => !p.hasLostRight);
    }

    // 全員の準備ができているか（CPUは常にReady）
    allPlayersReady() {
        return this.players.every(p => p.isCPU || p.isReady || p.isDisconnected);
    }
}

// アクティブルームを検索または作成
function findOrCreateRoom() {
    for (const [id, room] of rooms) {
        if (room.state === 'waiting' && room.players.length < room.maxPlayers) {
            return room;
        }
    }
    const roomId = `room_${Date.now()}`;
    const newRoom = new GameRoom(roomId);
    rooms.set(roomId, newRoom);
    return newRoom;
}

io.on('connection', (socket) => {
    console.log('ユーザー接続:', socket.id);

    let currentRoom = null;
    let currentPlayer = null;

    // マルチプレイに参加
    socket.on('joinMulti', (data) => {
        const playerName = data.name || `プレイヤー${Math.floor(Math.random() * 1000)}`;

        currentRoom = findOrCreateRoom();
        currentPlayer = new Player(socket.id, playerName);

        if (currentRoom.addPlayer(currentPlayer)) {
            socket.join(currentRoom.id);

            // ロビー状態を送信
            io.to(currentRoom.id).emit('lobbyUpdate', {
                players: currentRoom.players.map(p => ({
                    id: p.id,
                    name: p.name,
                    isCPU: p.isCPU
                })),
                timeLeft: currentRoom.lobbyTimeLeft,
                roomId: currentRoom.id
            });

            // 最初のプレイヤーの場合、ロビータイマーを開始
            if (currentRoom.getPlayerCount() === 1) {
                startLobbyTimer(currentRoom);
            }

            // 4人揃ったら即座にゲーム開始
            if (currentRoom.players.length === currentRoom.maxPlayers) {
                clearInterval(currentRoom.lobbyTimer);
                startGame(currentRoom);
            }
        }
    });

    // 早押しボタンを押した
    socket.on('buzzIn', () => {
        if (!currentRoom || currentRoom.state !== 'playing') return;
        if (!currentPlayer) return;
        if (currentRoom.currentAnswerer) return; // 既に誰かが回答中
        if (currentPlayer.hasLostRight) return; // 回答権を失っている
        if (currentRoom.questionTimeLeft <= 0) return; // 時間切れ

        // この人が回答権を得た
        currentRoom.currentAnswerer = currentPlayer;
        currentRoom.isPaused = true;
        currentRoom.answerTimeLeft = 5;

        // 問題タイマーを一時停止
        clearInterval(currentRoom.questionTimer);

        // 回答中であることを全員に通知
        io.to(currentRoom.id).emit('playerBuzzedIn', {
            playerId: currentPlayer.id,
            playerName: currentPlayer.name,
            answerTimeLeft: 5
        });

        // 5秒の回答タイマーを開始
        startAnswerTimer(currentRoom);
    });

    // 回答を送信
    socket.on('submitAnswer', (data) => {
        if (!currentRoom || currentRoom.state !== 'playing') return;
        if (!currentPlayer) return;
        if (currentRoom.currentAnswerer?.id !== currentPlayer.id) return; // 回答権を持っていない

        clearInterval(currentRoom.answerTimer);

        const question = currentRoom.getCurrentQuestion();
        const isCorrect = data.answerIndex === question.answer;

        if (isCorrect) {
            // 正解！
            const timeBonus = Math.floor((currentRoom.questionTimeLeft / 30) * 500);
            currentPlayer.score += 1000 + timeBonus;
            currentPlayer.correctCount++;

            io.to(currentRoom.id).emit('answerResult', {
                playerId: currentPlayer.id,
                playerName: currentPlayer.name,
                isCorrect: true,
                correctAnswer: question.answer,
                score: currentPlayer.score
            });

            // 次の問題へ
            setTimeout(() => {
                moveToNextQuestion(currentRoom);
            }, 2500);
        } else {
            // 不正解
            currentPlayer.hasLostRight = true;
            currentRoom.currentAnswerer = null;
            currentRoom.isPaused = false;

            io.to(currentRoom.id).emit('answerResult', {
                playerId: currentPlayer.id,
                playerName: currentPlayer.name,
                isCorrect: false,
                correctAnswer: null // まだ正解は見せない
            });

            // まだ回答権を持っている人がいるかチェック
            if (currentRoom.hasAvailableAnswerers()) {
                // 問題タイマーを再開
                setTimeout(() => {
                    startQuestionTimer(currentRoom);
                    io.to(currentRoom.id).emit('resumeQuestion', {
                        timeLeft: currentRoom.questionTimeLeft
                    });
                }, 1500);
            } else {
                // 全員が回答権を失った
                io.to(currentRoom.id).emit('allPlayersLost', {
                    correctAnswer: question.answer
                });
                setTimeout(() => {
                    moveToNextQuestion(currentRoom);
                }, 2500);
            }
        }
    });

    // 切断処理
    socket.on('disconnect', () => {
        console.log('ユーザー切断:', socket.id);

        if (currentRoom) {
            // もし回答中のプレイヤーが切断した場合
            if (currentRoom.currentAnswerer?.id === socket.id) {
                clearInterval(currentRoom.answerTimer);
                currentRoom.currentAnswerer = null;
                currentRoom.isPaused = false;

                // 回答中断を通知
                io.to(currentRoom.id).emit('answerResult', {
                    playerId: socket.id,
                    playerName: 'プレイヤー（切断）',
                    isCorrect: false,
                    correctAnswer: null
                });
            }

            if (currentRoom.state === 'playing') {
                const player = currentRoom.players.find(p => p.id === socket.id);
                if (player) {
                    player.isCPU = true;
                    player.isDisconnected = true;

                    // 通知 (名前の色を変えるため)
                    io.to(currentRoom.id).emit('playerDisconnected', {
                        playerId: socket.id,
                        playerName: player.name
                    });
                }
            } else {
                currentRoom.removePlayer(socket.id);
            }

            // ゲーム中に全ての人間プレイヤーがいなくなったらルームを削除
            if (currentRoom.getPlayerCount() === 0) {
                clearInterval(currentRoom.lobbyTimer);
                clearInterval(currentRoom.questionTimer);
                clearInterval(currentRoom.answerTimer);
                rooms.delete(currentRoom.id);
            } else {
                // 残りのプレイヤーに通知
                io.to(currentRoom.id).emit('lobbyUpdate', {
                    players: currentRoom.players.map(p => ({
                        id: p.id,
                        name: p.name,
                        isCPU: p.isCPU,
                        isDisconnected: p.isDisconnected
                    })),
                    timeLeft: currentRoom.lobbyTimeLeft,
                    roomId: currentRoom.id
                });
            }
        }
    });

    // 問題データを受け取ってゲームを開始
    socket.on('initGameWithQuestions', (data) => {
        if (!currentRoom || currentRoom.questions.length > 0) return;

        currentRoom.questions = data.questions;
        currentRoom.state = 'playing';

        // ゲーム開始を通知（質問データも共有）
        io.to(currentRoom.id).emit('gameStart', {
            players: currentRoom.players.map(p => ({
                id: p.id,
                name: p.name,
                isCPU: p.isCPU,
                score: p.score,
                isDisconnected: p.isDisconnected
            })),
            questionCount: currentRoom.questionCount,
            questions: currentRoom.questions
        });

        // 注: ここではまだ nextQuestion を送らない。
        // クライアントからの clientReady を待ってから開始する。
    });

    // クライアントからの準備完了通知
    socket.on('clientReady', () => {
        if (!currentRoom || currentRoom.state !== 'playing') return;
        const player = currentRoom.players.find(p => p.id === socket.id);
        if (player) {
            player.isReady = true;

            // 全員準備OKかチェック
            if (currentRoom.allPlayersReady()) {
                // 最初の問題を開始（まだ始まっていない場合）
                if (currentRoom.currentQuestionIndex === 0 && !currentRoom.questionTimer) {
                    startNextQuestionSequence(currentRoom);
                }
            }
        }
    });
});

// 次の問題を開始するシーケンス
function startNextQuestionSequence(room) {
    io.to(room.id).emit('nextQuestion', {
        questionIndex: room.currentQuestionIndex,
        question: room.questions[room.currentQuestionIndex],
        players: room.players.map(p => ({
            id: p.id,
            name: p.name,
            score: p.score,
            isCPU: p.isCPU,
            hasLostRight: p.hasLostRight,
            isDisconnected: p.isDisconnected
        }))
    });

    // 文字表示アニメーションの時間（文字数 * 60ms、最小3秒、最大7秒）
    const questionText = room.questions[room.currentQuestionIndex].text;
    const delay = Math.max(3000, Math.min(7000, questionText.length * 60));

    // 少し待ってからタイマー開始
    setTimeout(() => {
        startQuestionTimer(room);
    }, delay);
}


// ロビータイマー開始
function startLobbyTimer(room) {
    room.lobbyTimer = setInterval(() => {
        room.lobbyTimeLeft--;

        io.to(room.id).emit('lobbyTimerUpdate', {
            timeLeft: room.lobbyTimeLeft
        });

        if (room.lobbyTimeLeft <= 0) {
            clearInterval(room.lobbyTimer);
            room.fillWithCPU();
            startGame(room);
        }
    }, 1000);
}

// ゲーム開始（質問要求フェーズ）
function startGame(room) {
    // ホスト（最初の人間プレイヤー）を探す
    const host = room.players.find(p => !p.isCPU);
    if (host) {
        io.to(host.id).emit('requestQuestions');
    } else {
        // 人間がいない場合
        rooms.delete(room.id);
    }
}

// 問題タイマー開始
function startQuestionTimer(room) {
    room.questionTimer = setInterval(() => {
        if (room.isPaused) return;

        room.questionTimeLeft--;

        io.to(room.id).emit('questionTimerUpdate', {
            timeLeft: room.questionTimeLeft
        });

        // CPUの早押しをシミュレート
        room.players.forEach(player => {
            if (player.isCPU && !player.hasLostRight && !room.currentAnswerer) {
                // CPUは15%の確率で毎秒早押しを試みる
                if (Math.random() < 0.15) {
                    room.currentAnswerer = player;
                    room.isPaused = true;
                    room.answerTimeLeft = 5;

                    clearInterval(room.questionTimer);

                    io.to(room.id).emit('playerBuzzedIn', {
                        playerId: player.id,
                        playerName: player.name,
                        answerTimeLeft: 5
                    });

                    // CPUは少し待ってから回答
                    const answerDelay = 1000 + Math.random() * 2000;
                    setTimeout(() => {
                        if (room.currentAnswerer?.id !== player.id) return;

                        const question = room.getCurrentQuestion();
                        // CPUは75%の確率で正解
                        const isCorrect = Math.random() < 0.75;
                        const chosenAnswer = isCorrect ? question.answer : (question.answer + 1) % 4;

                        clearInterval(room.answerTimer);

                        if (isCorrect) {
                            const timeBonus = Math.floor((room.questionTimeLeft / 30) * 500);
                            player.score += 1000 + timeBonus;
                            player.correctCount++;

                            io.to(room.id).emit('answerResult', {
                                playerId: player.id,
                                playerName: player.name,
                                isCorrect: true,
                                correctAnswer: question.answer,
                                score: player.score
                            });

                            setTimeout(() => {
                                moveToNextQuestion(room);
                            }, 2500);
                        } else {
                            player.hasLostRight = true;
                            room.currentAnswerer = null;
                            room.isPaused = false;

                            io.to(room.id).emit('answerResult', {
                                playerId: player.id,
                                playerName: player.name,
                                isCorrect: false,
                                correctAnswer: null
                            });

                            if (room.hasAvailableAnswerers()) {
                                setTimeout(() => {
                                    startQuestionTimer(room);
                                    io.to(room.id).emit('resumeQuestion', {
                                        timeLeft: room.questionTimeLeft
                                    });
                                }, 1500);
                            } else {
                                io.to(room.id).emit('allPlayersLost', {
                                    correctAnswer: question.answer
                                });
                                setTimeout(() => {
                                    moveToNextQuestion(room);
                                }, 2500);
                            }
                        }
                    }, answerDelay);

                    return;
                }
            }
        });

        // 時間切れ
        if (room.questionTimeLeft <= 0) {
            clearInterval(room.questionTimer);

            const question = room.getCurrentQuestion();
            io.to(room.id).emit('timeUp', {
                correctAnswer: question.answer
            });

            setTimeout(() => {
                moveToNextQuestion(room);
            }, 2500);
        }
    }, 1000);
}

// 回答タイマー開始（5秒）
function startAnswerTimer(room) {
    room.answerTimer = setInterval(() => {
        room.answerTimeLeft--;

        io.to(room.id).emit('answerTimerUpdate', {
            timeLeft: room.answerTimeLeft
        });

        if (room.answerTimeLeft <= 0) {
            clearInterval(room.answerTimer);

            const answerer = room.currentAnswerer;
            if (answerer) {
                answerer.hasLostRight = true;
                room.currentAnswerer = null;
                room.isPaused = false;

                io.to(room.id).emit('answerTimeout', {
                    playerId: answerer.id,
                    playerName: answerer.name
                });

                const question = room.getCurrentQuestion();

                if (room.hasAvailableAnswerers()) {
                    setTimeout(() => {
                        startQuestionTimer(room);
                        io.to(room.id).emit('resumeQuestion', {
                            timeLeft: room.questionTimeLeft
                        });
                    }, 1500);
                } else {
                    io.to(room.id).emit('allPlayersLost', {
                        correctAnswer: question.answer
                    });
                    setTimeout(() => {
                        moveToNextQuestion(room);
                    }, 2500);
                }
            }
        }
    }, 1000);
}

// 次の問題へ移動
function moveToNextQuestion(room) {
    clearInterval(room.questionTimer);
    clearInterval(room.answerTimer);

    room.currentQuestionIndex++;

    if (room.currentQuestionIndex >= room.questionCount) {
        // ゲーム終了
        room.state = 'finished';

        // スコア順にソート
        const rankings = [...room.players].sort((a, b) => b.score - a.score);

        io.to(room.id).emit('gameEnd', {
            rankings: rankings.map((p, index) => ({
                rank: index + 1,
                id: p.id,
                name: p.name,
                score: p.score,
                correctCount: p.correctCount,
                isCPU: p.isCPU
            }))
        });

        // ルームをクリーンアップ
        setTimeout(() => {
            rooms.delete(room.id);
        }, 60000);
    } else {
        // 次の問題
        room.resetForNextQuestion();

        // 次の問題
        room.resetForNextQuestion();

        // 次の問題へは即座に移行（ここは同期ズレが起きにくい＆ウェイトが長くなるとテンポ悪いので）
        // もし問題あればここもReady待ちにするが、一旦このままで。
        startNextQuestionSequence(room);

    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`サーバー起動: http://localhost:${PORT}`);
});
