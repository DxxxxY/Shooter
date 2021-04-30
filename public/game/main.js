const socket = io()

var players = {}
var notifs = []

const canvas = document.createElement("canvas")
const ctx = canvas.getContext("2d")
canvas.width = window.innerWidth - 50
canvas.height = window.innerHeight - 50
canvas.style.border = "10px white solid"
canvas.style.backgroundColor = "black"
canvas.style.display = "block"
canvas.style.margin = "auto"
document.body.appendChild(canvas)

const draw = () => {
    Object.keys(players).forEach(p => {
        ctx.fillStyle = "white"
            //console.log("Drawing", players[p].x, players[p].y)
        ctx.fillRect(players[p].x, players[p].y, 20, 20)
        ctx.font = "12px Arial";
        //console.log(players[p].name)
        ctx.fillText(players[p].name, players[p].x - 2.5, players[p].y + 40)
    })
}

const game = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    draw()
    requestAnimationFrame(game)
}

document.getElementById("join").addEventListener("click", e => {
    document.getElementById("container").style.display = "none"
    socket.emit("player-create", document.getElementById("name").value)
    window.addEventListener("keydown", e => {
        let player = players[socket.id]
        switch (e.key) {
            case "ArrowUp": //38
                player.y -= 10
                break
            case "ArrowDown": //40
                player.y += 10
                break
            case "ArrowLeft": //37
                player.x -= 10
                break
            case "ArrowRight": //39
                player.x += 10
                break
        }
        socket.emit("player-move", player)
        socket.emit("broadcast:player-move", player) //send to the rest except sender
    })
    socket.on("currentPlayers", playerArray => {
        players = playerArray
            //console.log(players)
    })

    socket.on("player-join", player => {
        //console.log("Someone spawned")
        players[player.playerId] = player
            //players = playerArray
        announce(`${player.name} has joined`, "green")
        console.log(players)
    })

    socket.on("player-leave", player => {
        delete players[player.playerId]
            //players = playerArray
            //console.log(players)
        announce(`${player.name} has left`, "red")
    })

    socket.on("player-move", player => {
        //console.log(player)
        //console.log(players)
        players[player.playerId] = player
    })

    game()
})

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