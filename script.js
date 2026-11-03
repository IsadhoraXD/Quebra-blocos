const canvas = document.getElementById("blocos");
const ctx = canvas.getContext("2d");

const bgMusic = document.getElementById("bg-music");
const sfxRaquete = document.getElementById("sfx-Raquete");
const sfxBlock = document.getElementById("sfx-block");
const sfxBlockGold = document.getElementById("sfx-blockgold");
const sfxPowerup = document.getElementById("sfx-powerup");
const sfxGameover = document.getElementById("sfx-gameover");
const sfxLevel = document.getElementById("sfx-level");

// Carregando imagens de fundo e de interface
const fundoBlocoImg = new Image();
fundoBlocoImg.src = "Mídias/fundobloco.jpg";

const paddleSprite = new Image();
paddleSprite.src = "Mídias/ouro_inteiro.jpg";

// CARREGAMENTO DAS IMAGENS DOS BLOCOS POR FILEIRA
const imagensBlocos = [];
const caminhosFileiras = [
    "Mídias/bloco_1.jpg",
    "Mídias/bloco_2.jpg",
    "Mídias/bloco_3.jpg",
    "Mídias/bloco_4.jpg",
    "Mídias/bloco_5.jpg",
    "Mídias/bloco_6.jpg"
];

caminhosFileiras.forEach((caminho, index) => {
    imagensBlocos[index] = new Image();
    imagensBlocos[index].src = caminho;
});

// CARREGAMENTO DAS IMAGENS DO BLOCO DE OURO (POR ESTÁGIO DE VIDA)
const imgOuro3HP = new Image();
imgOuro3HP.src = "Mídias/ouro_inteiro.jpg";

const imgOuro2HP = new Image();
imgOuro2HP.src = "Mídias/ouro_rachado.jpg";

const imgOuro1HP = new Image();
imgOuro1HP.src = "Mídias/ouro_quase_quebrando.jpg";


const paddle = {
    w: 100,
    h: 30,
    x: 230,
    y: 555,
    baseSpeed: 450,
    speed: 450,
    speedTimer: 0
};

let balls = [];
const keys = {};

let bricks = [];
let powerUps = [];
let score = 0;
let lives = 3;
let running = false;
let levelCleared = false;
let levelSoundPlayed = false; 
let last = 0;

const ROW_COUNT = 6;
const COL_COUNT = 8;
const BRICK_WIDTH = 60;
const BRICK_HEIGHT = 28;
const BRICK_PADDING = 6;
const OFFSET_TOP = 65;
const OFFSET_LEFT = 16;

const rowColors = [
    "#38bdf8", 
    "#22c55e", 
    "#eab308", 
    "#f97316", 
    "#ef4444", 
    "#a855f7"  
];

function construirBlocos() {
    bricks = [];
    for (let row = 0; row < ROW_COUNT; row++) {
        for (let col = 0; col < COL_COUNT; col++) {
            const isGold = Math.random() < 0.15;
            const basePoints = (ROW_COUNT - row) * 10;

            bricks.push({
                x: OFFSET_LEFT + col * (BRICK_WIDTH + BRICK_PADDING),
                y: OFFSET_TOP + row * (BRICK_HEIGHT + BRICK_PADDING),
                w: BRICK_WIDTH,
                h: BRICK_HEIGHT,
                isGold: isGold,
                hp: isGold ? 3 : 1,
                points: isGold ? 50 : basePoints,
                color: isGold ? "#ffd700" : rowColors[row % rowColors.length],
                rowIndex: row, // Guarda o índice da fileira para saber qual imagem carregar depois
                alive: true
            });
        }
    }
}

window.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;
    keys[e.code] = true;

    if (e.code === "Space") {
        e.preventDefault();
        if (!running && lives > 0 && !levelCleared) {
            running = true;
            if (bgMusic) {
                bgMusic.play().catch(() => {});
            }
            balls.forEach(b => b.launched = true);
        }
    }

    if (e.key.toLowerCase() === "r") {
        reset();
    }
});

window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
    keys[e.code] = false;
});

canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    paddle.x = e.clientX - rect.left - paddle.w / 2;
    paddle.x = Math.max(8, Math.min(canvas.width - paddle.w - 8, paddle.x));
    
    balls.forEach(b => {
        if (!b.launched) {
            b.x = paddle.x + paddle.w / 2;
        }
    });
});

function criarBola(launched = false) {
    return {
        r: 7,
        x: paddle.x + paddle.w / 2,
        y: paddle.y - 10,
        vx: 200 * (Math.random() > 0.5 ? 1 : -1),
        vy: -260,
        launched: launched
    };
}

function resetBola() {
    balls = [criarBola(false)];
}

function reset() {
    score = 0;
    lives = 3;
    running = false;
    levelCleared = false;
    levelSoundPlayed = false;
    powerUps = [];
    paddle.w = 100;
    paddle.speed = paddle.baseSpeed;
    if (bgMusic) {
        bgMusic.currentTime = 0;
    }
    construirBlocos();
    resetBola();
}

function spawnPowerUp(x, y) {
    if (Math.random() < 0.25) {
        const types = ["SPEED", "WIDE", "MULTIBALL"];
        const type = types[Math.floor(Math.random() * types.length)];
        powerUps.push({
            x: x + BRICK_WIDTH / 2,
            y: y + BRICK_HEIGHT,
            r: 8,
            vy: 130,
            type: type
        });
    }
}

function update(dt) {
    if (levelCleared || lives <= 0) return;

    if (keys["arrowleft"] || keys["a"]) {
        paddle.x -= paddle.speed * dt;
    }
    if (keys["arrowright"] || keys["d"]) {
        paddle.x += paddle.speed * dt;
    }
    paddle.x = Math.max(8, Math.min(canvas.width - paddle.w - 8, paddle.x));

    if (paddle.speedTimer > 0) {
        paddle.speedTimer -= dt;
        if (paddle.speedTimer <= 0) paddle.speed = paddle.baseSpeed;
    }

    if (!running) {
        balls.forEach(b => {
            if (!b.launched) b.x = paddle.x + paddle.w / 2;
        });
        return;
    }

    for (let i = powerUps.length - 1; i >= 0; i--) {
        const p = powerUps[i];
        p.y += p.vy * dt;

        if (p.y + p.r >= paddle.y && p.y - p.r <= paddle.y + paddle.h &&
            p.x >= paddle.x && p.x <= paddle.x + paddle.w) {
            
            if (sfxPowerup) {
                sfxPowerup.currentTime = 0;
                sfxPowerup.play().catch(() => {});
            }

            if (p.type === "SPEED") {
                paddle.speed = paddle.baseSpeed * 1.5;
                paddle.speedTimer = 8;
            } else if (p.type === "WIDE") {
                paddle.w = Math.min(150, paddle.w + 25);
            } else if (p.type === "MULTIBALL") {
                const extraBall = criarBola(true);
                extraBall.x = paddle.x + paddle.w / 2;
                extraBall.y = paddle.y - 10;
                balls.push(extraBall);
            }

            powerUps.splice(i, 1);
            continue;
        }

        if (p.y > canvas.height) {
            powerUps.splice(i, 1);
        }
    }

    for (let bIndex = balls.length - 1; bIndex >= 0; bIndex--) {
        const b = balls[bIndex];
        if (!b.launched) continue;

        b.x += b.vx * dt;
        b.y += b.vy * dt;

        if (b.x - b.r < 0) {
            b.x = b.r;
            b.vx *= -1;
        } else if (b.x + b.r > canvas.width) {
            b.x = canvas.width - b.r; 
            b.vx *= -1;
        }

        if (b.y - b.r < 0) {
            b.y = b.r;
            b.vy *= -1;
        }

        if (b.vy > 0 && 
            b.y + b.r >= paddle.y && 
            b.y - b.r <= paddle.y + paddle.h &&
            b.x >= paddle.x && 
            b.x <= paddle.x + paddle.w) {
            
            b.y = paddle.y - b.r;
            b.vy *= -1;

            if (sfxRaquete) {
                sfxRaquete.currentTime = 0;
                sfxRaquete.play().catch(() => {});
            }

            const hitPoint = (b.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
            b.vx = hitPoint * 280;
        }

        bricks.forEach((brick) => {
            if (!brick.alive) return;

            if (b.x + b.r > brick.x &&
                b.x - b.r < brick.x + brick.w &&
                b.y + b.r > brick.y &&
                b.y - b.r < brick.y + brick.h) {
                
                b.vy *= -1;
                brick.hp--;

                if (brick.isGold) {
                    if (sfxBlockGold) {
                        sfxBlockGold.currentTime = 0;
                        sfxBlockGold.play().catch(() => {});
                    }
                } else {
                    if (sfxBlock) {
                        sfxBlock.currentTime = 0;
                        sfxBlock.play().catch(() => {});
                    }
                }

                if (brick.hp <= 0) {
                    brick.alive = false;
                    score += brick.points;
                    spawnPowerUp(brick.x, brick.y);
                }
            }
        });

        if (b.y - b.r > canvas.height) {
            balls.splice(bIndex, 1);
        }
    }

    const blocksRemaining = bricks.some(b => b.alive);
    if (!blocksRemaining) {
        levelCleared = true;
        running = false;
        if (bgMusic) bgMusic.pause();

        if (sfxLevel && !levelSoundPlayed) {
            sfxLevel.currentTime = 0;
            sfxLevel.play().catch(() => {});
            levelSoundPlayed = true;
        }
    }

    if (balls.length === 0 && !levelCleared) {
        lives--;
        if (lives > 0) {
            running = false;
            resetBola();
        } else {
            if (sfxGameover) {
                sfxGameover.currentTime = 0;
                sfxGameover.play().catch(() => {});
            }
            if (bgMusic) bgMusic.pause();
        }
    }
}

function desenharHieroglifoVida(x, y) {
    ctx.strokeStyle = "#451a03";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y - 5, 4, 0, Math.PI * 2);
    ctx.moveTo(x, y - 1);
    ctx.lineTo(x, y + 7);
    ctx.moveTo(x - 5, y + 2);
    ctx.lineTo(x + 5, y + 2);
    ctx.stroke();
}

function desenhar() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (fundoBlocoImg.complete && fundoBlocoImg.naturalWidth !== 0) {
        ctx.drawImage(fundoBlocoImg, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = "#ccc7feff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.strokeStyle = "#000000ff";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

    if (paddleSprite.complete && paddleSprite.naturalWidth !== 0) {

        ctx.drawImage(paddleSprite, paddle.x, paddle.y, paddle.w, paddle.h);
} else {
ctx.fillStyle = "#d97706";
ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
}
balls.forEach(b => {
ctx.beginPath();
ctx.fillStyle = "#ffffff";
ctx.lineWidth = 1;
ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
ctx.fill();
});
// SISTEMA DE COLAGEM DE IMAGENS EM CIMA DOS BLOCOS (HITBOX MANTIDA)
bricks.forEach((b) => {
if (!b.alive) return;
let imagemParaDesenhar = null;
if (b.isGold) {
// Seleciona a imagem certa baseada na quantidade de vida (HP) do bloco dourado
if (b.hp === 3) imagemParaDesenhar = imgOuro3HP;
else if (b.hp === 2) imagemParaDesenhar = imgOuro2HP;
else if (b.hp === 1) imagemParaDesenhar = imgOuro1HP;
} else {
// Seleciona a imagem correspondente à sua fileira
imagemParaDesenhar = imagensBlocos[b.rowIndex % imagensBlocos.length];
}
// Tenta desenhar a imagem na tela. Se ela não tiver terminado de carregar na pasta Mídias, usa a cor antiga como segurança
if (imagemParaDesenhar && imagemParaDesenhar.complete && imagemParaDesenhar.naturalWidth !== 0) {
ctx.drawImage(imagemParaDesenhar, b.x, b.y, b.w, b.h);
} else {
ctx.fillStyle = b.color;
ctx.fillRect(b.x, b.y, b.w, b.h);
ctx.strokeStyle = "rgba(0,0,0,0.3)";
ctx.lineWidth = 2;
ctx.strokeRect(b.x, b.y, b.w, b.h);
}
// Se for de ouro e a imagem falhar, desenha o indicador de texto antigo por segurança
if (b.isGold && (!imagemParaDesenhar || !imagemParaDesenhar.complete)) {
ctx.fillStyle = "#000000";
ctx.font = "bold 12px 'Cinzel Decorative', Georgia, serif";
ctx.textAlign = "center";
ctx.fillText("★" + b.hp, b.x + b.w / 2, b.y + b.h / 1.5);
}
});
powerUps.forEach(p => {
ctx.beginPath();
ctx.fillStyle = p.type === "SPEED" ? "#ef4444" : (p.type === "WIDE" ? "#3b82f6" : "#10b981");
ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
ctx.fill();
ctx.strokeStyle = "#ffffff";
ctx.stroke();
});
ctx.fillStyle = "#451a03";
ctx.font = "bold 16px 'Cinzel Decorative', Georgia, serif";
ctx.textAlign = "left";
ctx.fillText("PONTOS: " + score, 16, 30);
ctx.fillText("VIDAS:", canvas.width - 135, 30);
for (let i = 0; i < lives; i++) {
desenharHieroglifoVida(canvas.width - 55 + (i * 15), 24);
}
if (!running && lives > 0 && !levelCleared) {
ctx.textAlign = "center";
ctx.fillStyle = "#451a03";
ctx.font = "bold 20px 'Cinzel Decorative', Georgia, serif";
ctx.fillText("ESPAÇO para lançar", canvas.width / 2, canvas.height / 2 + 50);
}
if (levelCleared) {
ctx.textAlign = "center";
ctx.fillStyle = "#d48700ff";
ctx.font = "bold 28px 'Cinzel Decorative', Georgia, serif";
ctx.fillText("FIM DE JOGO", canvas.width / 2, canvas.height / 2 - 10);
ctx.font = "bold 22px 'Cinzel Decorative', Georgia, serif";
ctx.fillText("Fase Concluída", canvas.width / 2, canvas.height / 2 + 30);
ctx.font = "14px 'Cinzel Decorative', Georgia, serif";
ctx.fillStyle = "#451a03";
ctx.fillText("Pressione R para reiniciar", canvas.width / 2, canvas.height / 2 + 70);
}
if (lives <= 0) {
ctx.textAlign = "center";
ctx.fillStyle = "#dc2626";
ctx.font = "bold 28px 'Cinzel Decorative', Georgia, serif";
ctx.fillText("FIM DE JOGO", canvas.width / 2, canvas.height / 2 - 10);
ctx.font = "bold 22px 'Cinzel Decorative', Georgia, serif";
ctx.fillText("Derrota", canvas.width / 2, canvas.height / 2 + 30);
ctx.font = "14px 'Cinzel Decorative', Georgia, serif";
ctx.fillStyle = "#451a03";
ctx.fillText("Pressione R para reiniciar", canvas.width / 2, canvas.height / 2 + 70);
}
}
function loop(ts) {
if (!last) last = ts;
const dt = Math.min(0.033, (ts - last) / 1000);
last = ts;
update(dt);
desenhar();
requestAnimationFrame(loop);
}
reset();
requestAnimationFrame(loop);