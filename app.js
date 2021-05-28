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
coords.push(new Coords(50, 350))
coords.push(new Coords(50, 450))
coords.push(new Coords(50, 550))

coords.push(new Coords(1700, 350))
coords.push(new Coords(1700, 450))
coords.push(new Coords(1700, 550))

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
    socket.on("player-create", name => {
        players[socket.id] = {
            rotation: 0,
            x: 0,
            y: 0,
            playerId: socket.id,
            name: name,
            health: 100,
            mana: 0,
            gems: 0,
            team: "none"
        };
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
                socket.emit("spawn-gem", x, y)
                socket.broadcast.emit("spawn-gem", x, y)
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
        //console.log("User disconnected")
    })

    socket.on("broadcast:player-move", player => {
        socket.broadcast.emit("player-move", player)
    })

    socket.on("broadcast:player-shoot", bullet => {
        socket.broadcast.emit("player-shoot", bullet)
    })

    socket.on("broadcast:player-heal", (player, heal) => {
        socket.broadcast.emit("player-heal", player, heal)
    })

    socket.on("broadcast:player-dead", player => {
        socket.broadcast.emit("player-dead", player)
    })

    socket.on("broadcast:pickup-gem", gem => {
        socket.broadcast.emit("pickup-gem", gem)
    })
})