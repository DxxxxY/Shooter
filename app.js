//Server wrapper
const wrapper = () => {
    //Imports
    const express = require("express")
    const app = require('express')()
    const http = require('http').createServer(app)
    const path = require('path')
    const io = require('socket.io')(http)

    app.use(express.static("public"));

    var port = process.env.PORT || 80

    app.get("/", (req, res) => { res.redirect("/rules") })

    app.get("/rules", (req, res) => { res.sendFile(path.join(__dirname, "/public/rules/rules.html")) })

    app.post("/rules", (req, res) => { res.redirect("/game") })

    app.get("/game", (req, res) => {
        if (start) res.send("The game has already started!")
        else res.sendFile(path.join(__dirname, "/public/game/game.html"))
    })

    http.listen(port, () => { console.log(`Listening on port ${port}`) })

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
    var timer = undefined

    //Server game loop
    setInterval(() => {
        if (start) {
            bullets.forEach(e => e.draw())
            gems.forEach(e => e.draw())
            let blue = 0
            let red = 0
            Object.keys(players).forEach(p => {
                if (players[p].team == "blue") blue += players[p].gems
                else if (players[p].team == "red") red += players[p].gems
            })
            if (timer == undefined) {
                if (blue >= 10) {
                    timer = new Timer("blue");
                    timer.timer
                }

                if (red >= 10) {
                    timer = new Timer("red")
                    timer.timer
                }
            }
            if (timer != undefined) io.emit("timer", timer.team, timer.time)
            else if (timer == undefined) io.emit("timer", undefined, undefined)
            io.emit("player-shoot", bullets)
            io.emit("gems", gems)
            io.emit("players", players)
        }
    }, 1000 / 60)

    //Collision rect to rect
    const collision = (a, b) => { if (a.x + a.w > b.x && a.x < b.x + b.w && a.y < b.y + b.h && a.y + a.h > b.y) return true }

    const hitWall = (a, b) => {
        //Check for projectile hitting enemy
        if (collision(a, b) && a instanceof Projectile) {
            if (b.health == 0) return
            if (a.owner == b.team) return
            bullets.splice(bullets.indexOf(a), 1)
            if (a.damage >= b.health) {
                io.emit("sound-death")
                b.health = 0
                    //Drop held gems
                if (b.gems != 0) {
                    for (var i = 0; i < b.gems; i++) {
                        gems.push(new Gem(getRandomInt(b.x, b.x + 50), getRandomInt(b.y, b.y + 50)))
                    }
                }
                b.gems = 0
                setTimeout(() => {
                    b.health = 100
                    b.x = b.spawnx
                    b.y = b.spawny
                }, 3000)
                return
            }
            if (a.damage > 0) b.health -= a.damage
            io.emit("sound-damage")
            return
        }
        if (collision(a, b) && a instanceof Gem) {
            if (b.health == 0) return
            b.gems += 1
            gems.splice(gems.indexOf(a), 1)
            io.emit("sound-pickup")
            return
        }
    }

    //Coords object
    function Coords(x, y) {
        this.x = x;
        this.y = y;
    }

    //Timer object
    function Timer(team) {
        this.team = team
        this.time = 10
        this.timer = setInterval(() => {
            this.time -= 1
            let blue = 0
            let red = 0
            Object.keys(players).forEach(p => {
                if (players[p].team == "blue") blue += players[p].gems
                else if (players[p].team == "red") red += players[p].gems
            })

            if (blue < 10 && team == "blue") {
                clearInterval(this.timer)
                timer = undefined
                this.time = 0
            }

            if (red < 10 && team == "red") {
                clearInterval(this.timer)
                timer = undefined
                this.time = 0
            }

            if (this.time <= 0) {
                let blue = 0
                let red = 0
                Object.keys(players).forEach(p => {
                    if (players[p].team == "blue") blue += players[p].gems
                    else if (players[p].team == "red") red += players[p].gems
                })

                if (blue >= 10 && team == "blue") {
                    io.emit("gameover", "blue")
                    http.close()
                    wrapper()
                } else {
                    clearInterval(this.timer)
                    timer = undefined
                    this.time = 0
                }

                if (red >= 10 && team == "red") {
                    io.emit("gameover", "red")
                    http.close()
                    wrapper()
                } else {
                    clearInterval(this.timer)
                    timer = undefined
                    this.time = 0
                }
            }
        }, 1000)
    }

    //Random int generator
    const getRandomInt = (min, max) => {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    //Get player count
    const getPlayerCount = () => {
        let i = 0
        Object.keys(players).forEach(p => { i++ })
        return i
    }

    io.on('connection', socket => {
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
                team: "none",
                spawnx: 0,
                spawny: 0
            };
            cx = canvasw
            cy = canvash
            if (getPlayerCount() == 6) {
                Object.keys(players).forEach(p => {
                    let coord = coords[Math.floor(Math.random() * coords.length)]
                    players[p].x = coord.x
                    players[p].y = coord.y
                    players[p].spawnx = coord.x
                    players[p].spawny = coord.y
                    coord.x == 50 ? players[p].team = "blue" : players[p].team = "red"
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
                }, 4000)
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
            socket.broadcast.emit("player-leave", players[socket.id])
            delete players[socket.id];
        })

        socket.on("player-move", toKey => {
            let player = players[socket.id]
            if (player.health == 0) return
            if (toKey == 37 && player.x > 0) player.x -= 5
            if (toKey == 38 && player.y > 0) player.y -= 5
            if (toKey == 39 && player.x < cx - player.w) player.x += 5
            if (toKey == 40 && player.y < cy - player.h) player.y += 5
            if (player.mana <= 99) player.mana += 1
        })

        socket.on("player-shoot", lastDir => {
            let player = players[socket.id]
            if (player.health == 0) return
            let bullet = new Projectile(player.x + 20, player.y + 20, 20, 5, "red", 10, 5, "", false, player.team, lastDir)
            bullets.push(bullet)
            io.emit("sound-shoot")
        })

        socket.on("player-heal", () => {
            let player = players[socket.id]
            if (player.health == 0) return
            if (player.mana >= 100) {
                player.mana = 0
                if (player.health >= 75) player.health = 100
                else player.health += 25
                io.emit("sound-heal")
            }
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
        this.collision = () => {
            Object.keys(players).forEach(p => {
                hitWall(this, players[p])
            })
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
            this.collision()
                //Optimization (remove projectiles when out of canvas)
            if (this.x > cx || this.y > cy || this.x < 0 || this.y < 0) bullets.splice(bullets.indexOf(this), 1)
        }
    }

    //Gem object
    function Gem(x, y) {
        this.x = x
        this.y = y
        this.w = 20
        this.h = 20
        this.collision = () => { Object.keys(players).forEach(p => { hitWall(this, players[p]) }) }
        this.draw = () => { this.collision() }
    }

    //Get dir from last dir
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
}

//Start server
wrapper()