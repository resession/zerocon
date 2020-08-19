const express = require('express')
const WebSocket = require('ws')

const http = express()

http.get('/', (req, res) => {
    return res.status(200).json('success')
})

http.get('*', (req, res) => {
    return res.status(400).json('error')
})

http.listen(process.env.HTTPPORT, process.env.HOST)

const ws = new WebSocket.Server({port: process.env.HTTPPORT, host: process.env.HOST})
ws.check = setInterval(() => {
    ws.clients.forEach(socket => {
        socket.close()
    })
}, 180000)
ws.on('connection', socket => {
    socket.on('close', (code, reason) => {
        console.log(code, reason)
    })
    socket.on('error', error => {
        console.log(error)
    })
    socket.on('message', message => {
        console.log(message)
    })
    socket.on('open', () => {
        console.log('opened')
    })
})
ws.on('error', error => {
    console.log(error)
})
ws.on('close', () => {
    clearInterval(ws.check)
    console.log('closed')
})