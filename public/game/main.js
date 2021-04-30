const socket = io()

var players = {}

socket.on("currentPlayers", playerArray => {
    players = playerArray
        //console.log(players)
})

socket.on("player-join", playerArray => {
    //console.log("Someone spawned")
    players = playerArray
        //console.log(players)
})

socket.on("player-leave", playerArray => {
    players = playerArray
        //console.log(players)
})

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
    })
}

const game = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    draw()
    requestAnimationFrame(game)
}

game()