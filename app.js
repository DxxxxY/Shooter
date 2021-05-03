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
    res.sendFile(path.join(__dirname, "/public/game/game.html"))
})


http.listen(port, () => {
    console.log(`Listening on port ${port}`)
})

const players = {}

io.on('connection', socket => {
    //console.log('User connected!')
    //var players = {socket.id: player}
    //var players = {key: value}
    socket.on("player-create", name => {
        players[socket.id] = {
            rotation: 0,
            x: Math.floor(Math.random() * 700) + 50,
            y: Math.floor(Math.random() * 500) + 50,
            playerId: socket.id,
            name: name,
            health: 100,
            mana: 0
        };
        //Test, first send updated players, then try to send 1 by 1 player
        socket.emit('currentPlayers', players); //Send to new player
        socket.broadcast.emit('player-join', players[socket.id] /* players*/ ); //Send to rest of players
        socket.emit("start-game")
    })

    socket.on('disconnect', () => {
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
})