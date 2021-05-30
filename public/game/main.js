//Socket initialization
const socket = io()

//Variables
var players = {}
var notifs = []
var bulletsA = []
var gemsA = []
var timerTeam = undefined
var timerTime = undefined
var winText
var toKey = 0
var keyLength = []

//Define past positions
let pastX = 0
let pastY = 0
let lastDir = 40 //Default value (down)
let end = false

//Textures
var gem = new Image();
gem.src = 'textures/gem.png';

//Sounds
var damage = new Audio()
damage.src = "sounds/damage.wav"
damage.volume = 0.3
var death = new Audio()
death.src = "sounds/death.wav"
death.volume = 0.3
var heal = new Audio()
heal.src = "sounds/heal.wav"
heal.volume = 0.3
var pickup = new Audio()
pickup.src = "sounds/pickup.wav"
pickup.volume = 0.3
var shoot = new Audio()
shoot.src = "sounds/shoot.wav"
shoot.volume = 0.3
var theme = new Audio()
theme.src = "sounds/theme.mp3"
theme.volume = 0.3
theme.loop = true

//Canvas creation
const canvas = document.createElement("canvas")
const ctx = canvas.getContext("2d")
canvas.width = window.innerWidth - 50
canvas.height = window.innerHeight - 50
canvas.style.border = "10px white solid"
canvas.style.backgroundColor = "black"
canvas.style.display = "block"
canvas.style.margin = "auto"
document.body.appendChild(canvas)

document.addEventListener('contextmenu', e => e.preventDefault())
const draw = () => {
    let blue = 0
    let red = 0
    Object.keys(players).forEach(p => {
        //Player
        if (!players[p].health == 0) {
            ctx.fillStyle = "white"
            ctx.fillRect(players[p].x, players[p].y, 20, 20)
                //Name
            ctx.font = "12px Arial";
            ctx.fillText(players[p].name, players[p].x - 2.5, players[p].y + 40)
                //Healthbar
            ctx.strokeStyle = "green"
            ctx.strokeRect(players[p].x - 2.5, players[p].y - 20, 40, 5)
            ctx.fillStyle = "green"
            ctx.fillRect(players[p].x - 2.5, players[p].y - 20, players[p].health / 2.5, 5)
                //Manabar
            ctx.strokeStyle = "cyan"
            ctx.strokeRect(players[p].x - 2.5, players[p].y - 10, 40, 5)
            ctx.fillStyle = "cyan"
            ctx.fillRect(players[p].x - 2.5, players[p].y - 10, players[p].mana / 2.5, 5)
                //Gem
            ctx.fillText(players[p].gems, players[p].x - 2.5, players[p].y - 40)
            if (players[p].team == "blue") blue += players[p].gems
            else if (players[p].team == "red") red += players[p].gems
        }
    })
    ctx.font = "48px Arial";
    ctx.strokeStyle = "white"
        //Blue score
    ctx.fillStyle = "blue"
    ctx.fillText(`${blue}/10`, 20, 40)
    ctx.strokeText(`${blue}/10`, 20, 40)
        //Red score
    ctx.fillStyle = "red"
    ctx.fillText(`${red}/10`, canvas.width - 104, 40)
    ctx.strokeText(`${red}/10`, canvas.width - 104, 40)
        //Timers
    if (timerTeam != undefined) {
        ctx.font = "48px Arial";
        ctx.strokeStyle = "white"
            //Blue timer
        if (timerTeam == "blue") {
            ctx.fillStyle = "blue"
            ctx.fillText(timerTime, 20, 80)
            ctx.strokeText(timerTime, 20, 80)
        }
        //Red timer
        if (timerTeam == "red") {
            ctx.fillStyle = "red"
            ctx.fillText(timerTime, canvas.width - 96, 80)
            ctx.strokeText(timerTime, canvas.width - 96, 80)
        }
    }
}

//On join game
document.getElementById("join").addEventListener("click", e => {
    document.getElementById("container").style.display = "none"
    socket.emit("player-create", document.getElementById("name").value, canvas.width, canvas.height)
        //Player events
    socket.on("currentPlayers", playerArray => { players = playerArray })
    socket.on("player-join", player => { players[player.playerId] = player })
    socket.on("player-leave", player => { delete players[player.playerId] })
    socket.on("players", playersA => { players = playersA })
    socket.on("player-move", player => { players[player.playerId] = player })
    socket.on("player-shoot", bullets => { bulletsA = bullets })
    socket.on("gems", gems => { gemsA = gems })

    //Sound events
    socket.on("sound-damage", () => { damage.play() })
    socket.on("sound-death", () => { death.play() })
    socket.on("sound-heal", () => { heal.play() })
    socket.on("sound-pickup", () => { pickup.play() })
    socket.on("sound-shoot", () => { shoot.play() })

    socket.on("gameover", winTeam => {
        if (players[socket.id].team == winTeam) winText = "Your team has won! :)"
        else if (players[socket.id].team != winTeam) winText = "Your team has lost! :("
        end = true
        ctx.font = "48px Arial";
        ctx.strokeStyle = "white"
        ctx.strokeText(winText, canvas.width / 2, canvas.height / 2)
        setTimeout(location.reload(), 4000)
    })

    socket.on("timer", (team, time) => {
        timerTeam = team
        timerTime = time
    })

    socket.on("waiting", count => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.font = "40px Arial";
        ctx.fillStyle = "white"
        ctx.fillText(`Waiting on players (${count}/6)`, canvas.width / 2 - 200, canvas.height / 2)
    })

    socket.on("start-game", () => {
        document.addEventListener("keydown", keyboard)
        document.addEventListener("keydown", e => {
            if (!keyLength.includes(e.keyCode)) keyLength.push(e.keyCode)
            toKey = e.keyCode
            if (e.keyCode === 37 || e.keyCode === 38 || e.keyCode === 39 || e.keyCode === 40) lastDir = e.keyCode
        })
        document.addEventListener("keypress", e => { if (e.keyCode === 32) socket.emit("player-heal") })
        document.addEventListener("keyup", e => {
            keyLength.splice(keyLength.indexOf(e.keyCode), 1)
            if (keyLength.length == 0) toKey = 0
        })
        document.addEventListener("click", e => { if (e.button == 0) socket.emit("player-shoot", lastDir) })
        theme.play()
        game()
    })
})

//Game loop
const game = () => {
    if (!end) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        draw()
        pastX = players[socket.id].x
        pastY = players[socket.id].y
        keyboard()
        requestAnimationFrame(game)
        bulletsA.forEach(bullet => {
            new Projectile(bullet.x, bullet.y, bullet.w, bullet.h, bullet.color, bullet.damage, bullet.speed, bullet.dir, true, bullet.owner, bullet.xory).draw()
        })
        gemsA.forEach(gem => {
            new Gem(gem.x, gem.y).draw()
        })
    }
}

//Keyboard
const keyboard = () => { if (toKey == 37 || toKey == 38 || toKey == 39 || toKey == 40) { socket.emit("player-move", toKey) } }

//Projectile object
function Projectile(x, y, w, h, color, damage, speed, dir, enemy, owner, xory = "") {
    //Dimensions
    this.x = x
    this.y = y
    this.w = w
    this.h = h
    this.color = color
    this.dir = dir
        //Attributes
    this.damage = damage
    this.speed = speed
    this.slowed = false
    this.enemy = enemy
    this.owner = owner
    this.xory = xory
    this.draw = () => {
        ctx.fillStyle = this.color
        ctx.fillRect(this.x, this.y, this.w, this.h)
    }
}

//Gem object
function Gem(x, y) {
    //Dimensions
    this.x = x
    this.y = y
    this.w = 40
    this.h = 40
    this.draw = () => { ctx.drawImage(gem, this.x, this.y, this.w, this.h) }
}