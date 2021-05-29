const socket = io()

var players = {}
var notifs = []
var toDraw = []

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
    Object.keys(players).forEach(p => {
        //Player
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
    })
    toDraw.forEach(e => { e.draw() })
}

var bulletsA = []

document.getElementById("join").addEventListener("click", e => {
    document.getElementById("container").style.display = "none"
    socket.emit("player-create", document.getElementById("name").value, canvas.width, canvas.height)

    socket.on("currentPlayers", playerArray => {
        players = playerArray
    })

    socket.on("player-join", player => {
        players[player.playerId] = player
            //announce(`${player.name} has joined`, "green")
    })

    socket.on("player-leave", player => {
        delete players[player.playerId]
            //announce(`${player.name} has left`, "red")
    })

    socket.on("player-move", player => {
        players[player.playerId] = player
    })

    socket.on("player-shoot", bullets => {
        // if (update) toDraw[bullet] = bullet
        // else toDraw.push(new Projectile(bullet.x, bullet.y, bullet.w, bullet.h, bullet.color, bullet.damage, bullet.speed, bullet.dir, true, bullet.owner, bullet.xory))
        bulletsA = bullets
    })

    socket.on("player-heal", player => {
        players[player.playerId] = player
    })

    socket.on("gems", gems => {
        gemsA = gems
    })

    socket.on("player-dead", player => {
        if (players[socket.id] == players[player.playerId]) {
            alive = false
        } else {
            delete players[player.playerId]
        }
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
        document.addEventListener("keypress", e => {
            if (e.keyCode === 32) {
                //let player = players[socket.id]
                //Regen 25% of hp
                socket.emit("player-heal")
            }
        })
        document.addEventListener("keyup", e => {
            keyLength.splice(keyLength.indexOf(e.keyCode), 1)
            if (keyLength.length == 0) toKey = 0
        })
        document.addEventListener("click", e => {
            //let player = players[socket.id]
            if (e.button == 0) { //Shoot
                //let bullet = new Projectile(player.x + 20, player.y + 20, 20, 5, "red", 10, 5, "", false, player)
                //toDraw.push(bullet)
                socket.emit("player-shoot", lastDir)
                    //socket.emit("broadcast:player-shoot", bullet)
            }
            if (e.button == 2) { //Melee

            }
        })
        game()
    })

})

//Define past positions
let pastX = 0
let pastY = 0
let lastDir = 40 //Default value (down)
let alive = true

const game = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    draw()

    pastX = players[socket.id].x
    pastY = players[socket.id].y
    keyboard()
    if (alive) {
        requestAnimationFrame(game)
        bulletsA.forEach(bullet => {
            new Projectile(bullet.x, bullet.y, bullet.w, bullet.h, bullet.color, bullet.damage, bullet.speed, bullet.dir, true, bullet.owner, bullet.xory).draw()
        })
        gemsA.forEach(gem => {
            new Gem(gem.x, gem.y).draw()
        })
    }
}

var toKey = 0
const keyLength = []
const keyboard = () => {
    if (toKey == 37 || toKey == 38 || toKey == 39 || toKey == 40) {
        socket.emit("player-move", toKey)
    }
}

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

var gem = new Image();
gem.src = 'gem.png';
//Gem object
function Gem(x, y) {
    this.x = x
    this.y = y
    this.w = 40
    this.h = 40
    this.draw = () => {
        ctx.drawImage(gem, this.x, this.y, this.w, this.h)
    }
}

//Collision rect to rect
const collision = (a, b) => { if (a.x + a.w > b.x && a.x < b.x + 20 && a.y < b.y + 20 && a.y + a.h > b.y) return true }

const hitWall = (a, b) => {
    //Check for projectile hitting enemy
    if (collision(a, b) && a instanceof Projectile) {
        //console.log("hit")
        toDraw.splice(toDraw.indexOf(a), 1)
        if (a.damage > b.health) {
            socket.emit("player-dead", b)
            socket.emit("broadcast:player-dead", b)
            return
        }
        if (a.damage > 0) b.health -= a.damage
        return
    }
    if (collision(a, b) && a instanceof Gem) {
        b.gems += 1
        socket.emit("broadcast:pickup-gem", a)
        toDraw.splice(toDraw.indexOf(a), 1)
        return
    }
}