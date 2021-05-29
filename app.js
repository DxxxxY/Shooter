const express = require("express")
const app = require('express')()
const http = require('http').createServer(app)
const path = require('path')
const io = require('socket.io')(http)
const bodyParser = require("body-parser")

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use(express.static("public"));

var port = process.env.PORT || 80

app.get("/", (req, res) => { res.redirect("/game") })

app.get("/game", (req, res) => {
    if (start) res.send("The game has already started!")
    else res.sendFile(path.join(__dirname, "/public/game/game.html"))
})


http.listen(port, () => {
    console.log(`Listening on port ${port}`)
})

const players = {}
var start = false
var coords = []
var cx = 0,
    cy = 0
coords.push(new Coords(50, 350))
coords.push(new Coords(50, 450))
coords.push(new Coords(50, 550))

coords.push(new Coords(1700, 350))
coords.push(new Coords(1700, 450))
coords.push(new Coords(1700, 550))

const bullets = []
const gems = []
setInterval(() => {
    if (start) {
        bullets.forEach(e => e.draw())
            //io.emit("player-shoot", bullets.map(b => ({ x: b.x, y: b.y, color: b.color })))
        io.emit("player-shoot", bullets)
        io.emit("gems", gems)
    }
}, 1000 / 60)

function Coords(x, y) {
    this.x = x;
    this.y = y;
}

const getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const getPlayerCount = () => {
    let i = 0
    Object.keys(players).forEach(p => { i++ })
    return i
}

io.on('connection', socket => {

    //console.log('User connected!')
    //var players = {socket.id: player}
    //var players = {key: value}
    socket.on("player-create", (name, canvasw, canvash) => {
        players[socket.id] = {
            rotation: 0,
            x: 0,
            y: 0,
            w: 20,
            h: 20,
            playerId: socket.id,
            name: name,
            health: 100,
            mana: 0,
            gems: 0,
            team: "none"
        };
        cx = canvasw
        cy = canvash
        if (getPlayerCount() == 6) {
            Object.keys(players).forEach(p => {
                let coord = coords[Math.floor(Math.random() * coords.length)]
                players[p].x = coord.x
                players[p].y = coord.y
                coord.x == 100 ? players[p].team = "blue" : players[p].team = "red"
                coords.splice(coords.indexOf(coord), 1)
            })
            socket.emit('currentPlayers', players); //Send to new player
            socket.broadcast.emit("currentPlayers", players)
            socket.broadcast.emit('player-join', players[socket.id] /* players*/ ); //Send to rest of players
            socket.emit("start-game")
            socket.broadcast.emit("start-game")
            setInterval(() => {
                let x = getRandomInt(850, 950)
                let y = getRandomInt(400, 500)
                gems.push(new Gem(x, y))
            }, 7500)
            start = true
        } else if (getPlayerCount() < 6) {
            socket.emit("waiting", getPlayerCount())
            socket.broadcast.emit("waiting", getPlayerCount())
        }
    })

    socket.on('disconnect', () => {
        if (!start) {
            delete players[socket.id];
            socket.emit("waiting", getPlayerCount())
            socket.broadcast.emit("waiting", getPlayerCount())
            return
        }
        socket.broadcast.emit("player-leave", players[socket.id] /*players*/ )
        delete players[socket.id];
        // console.log("User disconnected")
    })

    socket.on("player-move", toKey => {
        let player = players[socket.id]
        if (toKey == 37 && player.x > 0) player.x -= 5
        if (toKey == 38 && player.y > 0) player.y -= 5
        if (toKey == 39 && player.x < cx) player.x += 5
        if (toKey == 40 && player.y < cy) player.y += 5
        if (player.mana <= 99) player.mana += 1
        socket.emit("player-move", player)
        socket.broadcast.emit("player-move", player)
    })

    socket.on("player-shoot", lastDir => {
        let player = players[socket.id]
        let bullet = new Projectile(player.x + 20, player.y + 20, 20, 5, "red", 10, 5, "", false, player, lastDir)
        bullets.push(bullet)
    })

    socket.on("player-heal", () => {
        let player = players[socket.id]
        if (player.mana >= 100) {
            player.mana = 0
            if (player.health >= 75) player.health = 100
            else player.health += 25
            socket.emit("player-heal", player)
            socket.broadcast.emit("player-heal", player)
        }
    })

    socket.on("broadcast:player-dead", player => {
        socket.broadcast.emit("player-dead", player)
    })
})

//Projectile object
function Projectile(x, y, w, h, color, damage, speed, dir, enemy, owner, lastDir, xory = "") {
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
    this.lastDir = lastDir
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
    this.draw = () => {
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
    }
}

function Gem(x, y) {
    this.x = x
    this.y = y
    this.w = 20
    this.h = 20
    this.draw = () => {
        ctx.fillStyle = "purple"
        ctx.fillRect(this.x, this.y, this.w, this.h)
    }
}

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