require('dotenv').config()
const {startUser} = require('./folder/user.js')
const {Peer} = require('./folder/peer.js')

const peer = new Peer(startUser())

peer.startHTTP()
peer.startWS()

process.on('SIGINT', code => {
    peer.stopAllApps()
    console.log('stopped all apps on since it is exiting')
    console.log(code)
    console.log('interrupted')
    process.exit(0)
})
process.on('exit', code => {
    peer.stopAllApps()
    console.log('stopped all apps again to make sure')
    console.log(code)
    console.log('exited')
})