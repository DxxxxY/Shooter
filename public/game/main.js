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
    })
    toDraw.forEach(e => { e.draw() })
}

document.getElementById("join").addEventListener("click", e => {
    document.getElementById("container").style.display = "none"
    socket.emit("player-create", document.getElementById("name").value)

    socket.on("currentPlayers", playerArray => {
        players = playerArray
    })

    socket.on("player-join", player => {
        players[player.playerId] = player
        announce(`${player.name} has joined`, "green")
    })

    socket.on("player-leave", player => {
        delete players[player.playerId]
        announce(`${player.name} has left`, "red")
    })

    socket.on("player-move", player => {
        players[player.playerId] = player
        if (players[player.playerId].mana <= 99) players[player.playerId].mana += 1
    })

    socket.on("player-shoot", bullet => {
        toDraw.push(new Projectile(bullet.x, bullet.y, bullet.w, bullet.h, bullet.color, bullet.damage, bullet.speed, bullet.dir, true, bullet.owner, bullet.xory))
    })

    socket.on("player-heal", (player, heal) => {
        players[player.playerId].health += heal
        players[player.playerId].mana = 0
    })

    socket.on("player-dead", player => {
        if (players[socket.id] == players[player.playerId]) {
            alive = false
        } else {
            delete players[player.playerId]
        }
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
                let player = players[socket.id]
                    //Regen 25% of hp
                if (player.mana >= 100) {
                    player.mana = 0
                    if (player.health >= 75) player.health = 100
                    else player.health += 25
                    socket.emit("player-heal", player, 25)
                    socket.emit("broadcast:player-heal", player, 25)
                }
            }
        })
        document.addEventListener("keyup", e => {
            keyLength.splice(keyLength.indexOf(e.keyCode), 1)
            if (keyLength.length == 0) toKey = 0
        })
        document.addEventListener("click", e => {
            let player = players[socket.id]
            if (e.button == 0) { //Shoot
                let bullet = new Projectile(player.x + 20, player.y + 20, 20, 5, "red", 10, 5, "", false, player)
                toDraw.push(bullet)
                socket.emit("player-shoot", bullet)
                socket.emit("broadcast:player-shoot", bullet)
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
    if (alive) requestAnimationFrame(game)
}

var toKey = 0
const keyLength = []
const keyboard = () => {
    let player = players[socket.id]
    if (toKey == 37 /* && player.x > 0*/ ) player.x -= 5
    if (toKey == 38 /* && player.y > 0*/ ) player.y -= 5
    if (toKey == 39 /* && player.x < canvas.width - player.w*/ ) player.x += 5
    if (toKey == 40 /* && player.y < canvas.height - player.h*/ ) player.y += 5
    if (toKey == 37 || toKey == 38 || toKey == 39 || toKey == 40) {
        if (player.mana <= 99) player.mana += 1
        socket.emit("player-move", player)
        socket.emit("broadcast:player-move", player)
    }
}

//Chat notifications kinda
const announce = (string, color) => {
    let para = document.createElement("p")
    let node = document.createTextNode(string)
    para.appendChild(node)
    para.style.color = color
    para.style.fontFamily = "Poppins, sans-serif"
    para.style.fontSize = "1vw"
    para.style.position = "absolute"
    para.style.right = "2vw"
    para.style.top = `${1 + (2 * notifs.length)}vh`
    document.body.appendChild(para)
    notifs.push(para)
    setTimeout(() => {
        notifs.splice(notifs.indexOf(para), 1)
        para.style.transition = "0.15s ease-in"
        para.style.top = `${+para.style.top.replace(/\D/g,'') - 2}vh`
        setTimeout(() => {
            para.remove()
            notifs.forEach(e => {
                e.style.transition = "0.15s ease-in"
                e.style.top = `${+e.style.top.replace(/\D/g,'') - 2}vh`
            })
        }, 150)
    }, 5000)
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
        //Execute when created =>
    if (this.dir == "" && !this.enemy && this.xory == "") {
        switch (getDir(lastDir)) {
            case "left":
                this.xory = "X"
                this.speed = -this.speed
                break
            case "up":
                this.xory = "Y"
                this.speed = -this.speed
                break
            case "right":
                this.xory = "X"
                this.speed = +this.speed
                break
            case "down":
                this.xory = "Y"
                this.speed = +this.speed
                break
            default:
                return console.log("Couldn't get getDir(lastDir) (Projectile constructor)")
        }
    }
    /*else {
           switch (dir) {
               case "left":
                   xory = "X"
                   this.speed = -this.speed
                   break
               case "up":
                   xory = "Y"
                   this.speed = -this.speed
                   break
               case "right":
                   xory = "X"
                   this.speed = +this.speed
                   break
               case "down":
                   xory = "Y"
                   this.speed = +this.speed
                   break
               default:
                   return console.log("Couldn't get getDir(lastDir) (Projectile constructor)")
           }
       }*/
    this.collision = () => {
        Object.keys(players).forEach(p => {
            hitWall(this, players[p])
        })
    }
    this.draw = () => {
        ctx.fillStyle = this.color
        ctx.fillRect(this.x, this.y, this.w, this.h)
        if (this.xory === "Y") {
            this.w = h
            this.h = w
            this.y += this.speed
        }
        if (this.xory === "X") {
            this.w = this.w
            this.h = this.h
            this.x += this.speed
        }
        this.collision()
            //Optimization (remove projectiles when out of canvas)
        if (this.x > canvas.width || this.y > canvas.height || this.x < 0 || this.y < 0) toDraw.splice(toDraw.indexOf(this), 1)
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
}

//Get getDir(lastDir) from last pressed key
const getDir = (key) => {
    let dir = ""
    switch (key) {
        case 37:
            dir = "left"
            break
        case 38:
            dir = "up"
            break
        case 39:
            dir = "right"
            break
        case 40:
            dir = "down"
            break
        default:
            return console.log("Couldn't get getDir(lastDir)")
    }
    return dir
}