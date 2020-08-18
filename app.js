require('dotenv').config()
const {startUser} = require('./folder/user.js')
const {Peer} = require('./folder/peer.js')
const readline = require('readline')

const peer = new Peer(startUser())

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

let rl = readline.Interface({input: process.stdin, output: process.stdout})

function commandFunc(){
    rl.question('Command And Data: ', answer => {
        try {
            answer = JSON.parse(answer)
            switch (answer.command) {
                case 'post':
                    peer.postTorrent(answer.data)
                    console.log(answer.command + ' done')
                    break;
                case 'get':
                    peer.getTorrent(answer.data)
                    console.log(answer.command + ' done')
                    break;
                // case 'getall':
                //     peer.getAllTorrents(answer.data)
                //     console.log(answer.command + ' done')
                //     break;
                case 'delete':
                    peer.deleteTorrent(answer.data)
                    console.log(answer.command + ' done')
                    break;
                // case 'deleteall':
                //     // peer.deleteAllTorrents(answer.data)
                //     peer.deleteAllTorrents()
                //     console.log(answer.command + ' done')
                //     break;
                case 'start':
                    peer.runTorrentApp(answer.data)
                    console.log(answer.command + ' done')
                    break;
                // case 'startall':
                //     peer.startAllApps(answer.data)
                //     console.log(answer.command + ' done')
                //     break;
                case 'stop':
                    peer.stopTorrentApp(answer.data)
                    console.log(answer.command + ' done')
                    break;
                // case 'stopall':
                //     peer.stopAllApps()
                //     console.log(answer.command + ' done')
                //     break;
                // case 'stopall':
                //     peer.startUpTorrents()
                //     console.log(answer.command + ' done')
                //     break;
                case 'lookup':
                    peer.lookUpHash(answer.data)
                    console.log(answer.command + ' done')
                    break;
                default:
                    console.log('not a command')
                    break;
            }
        } catch (error) {
            console.log('--------------------------------------------------------\n')
            console.log(error)
            console.log('\n--------------------------------------------------------')
        }
        // try {
        //     answer = JSON.parse(answer)
        //     if(answer.command === 'add'){
        //         peer.postTorrent(answer.data)
        //         console.log(answer.command + ' done')
        //     } else if(answer.command === 'get'){
        //         peer.getTorrent(answer.data)
        //         console.log(answer.command + ' done')
        //     } else if(answer.command === 'delete'){
        //         peer.deleteTorrent(answer.data)
        //         console.log(answer.command + ' done')
        //     } else if(answer.command === 'start'){
        //         peer.runTorrentApp(answer.data)
        //         console.log(answer.command + ' done')
        //     } else if(answer.command === 'stop'){
        //         peer.stopTorrentApp(answer.data)
        //         console.log(answer.command + ' done')
        //     } else if(answer.command === 'lookup'){
        //         peer.lookUpHash(answer.data)
        //         console.log(answer.command + ' done')
        //     } else {
        //         console.log('not a command')
        //     }
        // } catch (error) {
        // console.log('--------------------------------------------------------\n')
        // console.log(error)
        // console.log('\n--------------------------------------------------------')
        // }
        commandFunc()
    })
}

commandFunc()