const WebTorrent = require('webtorrent')
const DHT = require('bittorrent-dht')
const fs = require('fs')
const fse = require('fs-extra')
const SHA1 = require('sha1')
const {spawn} = require('child_process')
const path = require('path')
const getPort = require('get-port')
const express = require('express')
const bitcoin = require("bitcoinjs-lib")
const killPort = require('kill-port')
const WS = require('ws')

class Peer {
    constructor(user){
        this.user = user
        this.client = new WebTorrent({torrentPort: process.env.TORRENTPORT || 2000})
        this.torrents = []
        this.peers = new DHT()
        this.peers.listen(process.env.PEERPORT || 6000)
        this.torrentApps = []
        // this.startHTTP()
        // this.startWS()
    }
    // test(){
    //     console.log(path.resolve(__dirname, '../zerocon/' + hash))
    // }
    async getRandomPort(){
        return await getPort()
    }
    startHTTP(){
        this.http = express()
        this.http.use(express.static('pub'))
        this.http.use(express.urlencoded({extended: true}))
        this.http.use(express.json())
        this.http.get('/', (req, res) => {
            return res.status(200).json('success')
        })
        this.http.post('/add', (req, res) => {
            if(!req.body.prikey || bitcoin.payments.p2pkh({pubkey: bitcoin.ECPair.fromWIF(req.body.prikey).publicKey}).address !== this.user.address){
                return res.status(400).json('not correct key')
            } else {
                let postTorrent = this.postTorrent(req.body)
                if(postTorrent.status){
                    return res.status(200).json('successful ' + postTorrent.folderName + ' - ' + postTorrent.infohash)
                } else {
                    return res.status(200).json('unsuccessful ' + postTorrent.folderName + ' - ' + postTorrent.infohash)
                }
            }
        })
        this.http.get('/comm', (req, res) => {
            return res.status(200).json({http: process.env.HTTPPORT || 4000, ws: process.env.WSPORT || 8000})
        })
        this.http.post('/delete', (req, res) => {
            if(!req.body.prikey || bitcoin.payments.p2pkh({pubkey: bitcoin.ECPair.fromWIF(req.body.prikey).publicKey}).address !== this.user.address){
                return res.status(400).json('not correct key')
            } else {
                let deleteTorrent = this.deleteTorrent(req.body)
                if(deleteTorrent.status){
                    return res.status(200).json('successful ' + deleteTorrent.infohash)
                } else {
                    return res.status(200).json('unsuccessful ' + deleteTorrent.infohash)
                }
            }
        })
        this.http.post('/get', (req, res) => {
            if(!req.body.prikey || bitcoin.payments.p2pkh({pubkey: bitcoin.ECPair.fromWIF(req.body.prikey).publicKey}).address !== this.user.address){
                return res.status(400).json('not correct key')
            } else {
                let getTorrent = this.getTorrent(req.body)
                if(getTorrent.status){
                    return res.status(200).json('successful ' + getTorrent.infohash)
                } else {
                    return res.status(200).json('unsuccessful ' + getTorrent.infohash)
                }
            }
        })
        this.http.post('/lookup', (req, res) => {
            this.lookUpHash(req.body)
            return res.status(200).json('success')
        })
        this.http.post('/start', (req, res) => {
            if(!req.body.prikey || bitcoin.payments.p2pkh({pubkey: bitcoin.ECPair.fromWIF(req.body.prikey).publicKey}).address !== this.user.address){
                return res.status(400).json('not correct key')
            } else {
                let startApp = this.startTorrentApp(req.body)
                if(startApp){
                    return res.status(200).json('successful')
                } else {
                    return res.status(200).json('unsuccessful')
                }
            }
        })
        this.http.post('/stop', (req, res) => {
            if(!req.body.prikey || bitcoin.payments.p2pkh({pubkey: bitcoin.ECPair.fromWIF(req.body.prikey).publicKey}).address !== this.user.address){
                return res.status(400).json('not correct key')
            } else {
                let stopApp = this.stopTorrentApp(req.body)
                if(stopApp){
                    return res.status(200).json('successful')
                } else {
                    return res.status(200).json('unsuccessful')
                }
            }
        })
        this.http.get('*', (req, res) => {
            return res.status(400).json('error')
        })
        this.http.listen(Number(process.env.HTTPPORT) || 4000, process.env.HOST)
        console.log('http listening')
    }
    startWS(){
        this.ws = new WS.Server({port: Number(process.env.WSPORT), host: process.env.HOST})
        // setInterval(() => {console.log(this.ws.clients.size)}, 5000)
        this.startPeers()
        this.ws.on('connection', socket => {
            socket.check = setTimeout(() => {
                socket.send(JSON.stringify('close'), () => {
                    console.log('sent close signal')
                })
                socket.close()
                console.log('check has closed the socket')
            }, 150000)
            socket.on('open', () => {
                console.log('opened')
            })
            socket.on('close', (code, signal) => {
                clearTimeout(socket.check)
                console.log('socket closed', code, signal)
            })
            socket.on('error', error => {
                console.log('socket error', error)
            })
            socket.on('message', message => {
                let data = JSON.parse(message)
                console.log('message data', data)
                if(data === 'close'){
                    socket.close()
                }
            })
        })
        this.ws.on('close', () => {
            console.log('closed')
        })
        this.ws.on('error', error => {
            console.log('socket error', error)
        })
        console.log('ws listening')
    }
    startPeers(){
        this.peers.on('peer', (peer, infoHash, from) => {
            this.ws.clients.forEach(socket => {
                socket.send(JSON.stringify({peer, infoHash, from}), () => {
                    console.log(`found: ${peer.host}:${peer.port} - ${Buffer.from(infoHash).toString('hex')}`)
                })
            })
        })
    }
    stopAllApps(){
        this.torrentApps.forEach(app => {
            app.kill()
        })
        console.log('stopped all apps')
    }
    startTorrentApp(torrentInfo){
        console.log('starting torrent app ' + torrentInfo.hash)
        return this.runTorrentApp(torrentInfo.hash, torrentInfo.host, torrentInfo.httpport, torrentInfo.wsport)
    }
    runTorrentApp(hash, host, httpport, wsport){
        let zero = JSON.parse(fs.readFileSync('../zerocon/' + hash + '/zero.json'))
        let torrentApp = null
        let environmentVar = {...process.env}
        environmentVar.HTTPPORT = httpport
        environmentVar.WSPORT = wsport
        environmentVar.HOST = host
        try {
            if(zero.runLanguage === 'python' || zero.runLanguage === 'python3'){
                zero.runLanguage = process.platform !== 'win32' ? 'python3' : 'python'
                torrentApp = spawn(`${zero.installPackage} ${zero.installArguments.split(',').join(' ')} && ${zero.runLanguage} ${zero.runArguments.split(',').join(' ')}`, [], {env: environmentVar, stdio: 'pipe', cwd: path.resolve(__dirname, '../../zerocon/' + hash), shell: true})
            } else {
                torrentApp = spawn(`${zero.installPackage} ${zero.installArguments.split(',').join(' ')} && ${zero.runLanguage} ${zero.runArguments.split(',').join(' ')}`, [], {env: environmentVar, stdio: 'pipe', cwd: path.resolve(__dirname, '../../zerocon/' + hash), shell: true})
            }
        } catch (error) {
            console.log('try/catch', error)
            console.log('could not install packages, did not start torrent app')
            return false
        }
        torrentApp.infohash = hash
        torrentApp.announce = {hash: SHA1(hash + 'zerocon'), port: httpport}
        torrentApp.check = setInterval(() => {
            this.announcePeer(torrentApp.announce.hash, torrentApp.announce.port)
        }, 300000)
        this.torrentApps.push(torrentApp)
        // torrentApp.stderr.setEncoding('utf8')
        // torrentApp.stdout.setEncoding('utf8')
        torrentApp.stderr.pipe(process.stderr)
        torrentApp.stdout.pipe(process.stdout)
        torrentApp.on('error', error => {
            console.log('error: ', error)
            torrentApp.kill()
        })
        torrentApp.on('exit', (code, signal) => {
            clearInterval(torrentApp.check)
            this.killThePort(torrentApp.announce.port)
            this.removeTorrentApp(torrentApp.infohash)
            console.log('remove app because of exit')
            console.log('exited: ', code, signal)
        })
        torrentApp.on('close', (code, signal) => {
            clearInterval(torrentApp.check)
            this.killThePort(torrentApp.announce.port)
            this.removeTorrentApp(torrentApp.infohash)
            console.log('remove app again, just to be sure')
            console.log('closed: ', code, signal)
        })
        return true
    }
    async killThePort(port){
        let res = await killPort(Number(port), 'tcp')
        // console.log(res)
        return res
    }
    stopTorrentApp(torrentInfo){
        let stopApp = false
        for(let i = 0;i < this.torrentApps.length; i++){
            if(torrentInfo.hash === this.torrentApps[i].infohash.toLowerCase() || torrentInfo.hash === this.torrentApps[i].infohash.toUpperCase()){
                this.torrentApps[i].kill()
                stopApp = true
            }
        }
        return stopApp
    }
    removeTorrentApp(hash){
        let iter = 0
        let found = false
        for(let i = 0;i < this.torrentApps.length; i++){
            if(this.torrentApps[i].infohash.toLowerCase() === hash || this.torrentApps[i].infohash.toUpperCase() === hash){
                found = true
                iter = i
                // this.torrentApps[i].kill()
                console.log('app was found')
            } else {
                console.log('app could not be found')
            }
        }
        if(found){
            this.torrents.splice(iter, 1)
            console.log('app was removed')
        }
    }
    announcePeer(hash, port){
        port = Number(port)
        this.peers.announce(hash, port, () => {
            console.log('announced peer')
        })
    }
    // unannouncePeer(hash, port){
    //     port = Number(port)
    //     this.peers.unannounce(SHA1(hash + 'zerocon'), port, () => {
    //         console.log('unannounced peer')
    //     })
    // }
    lookUpHash(torrentInfo){
        this.peers.lookup(SHA1(torrentInfo.hash + 'zerocon'), () => {
            console.log('looked up ' + torrentInfo.hash)
        })
    }
    // saveUser(){
    //     fs.writeFileSync('./user.json', JSON.stringify(this.user))
    // }
    deleteTorrent(torrentInfo){
        let iter = 0
        let found = false
        for(let i = 0;i < this.torrents.length; i++){
            if(this.torrents[i].infohash.toLowerCase() === torrentInfo.infohash || this.torrents[i].infohash.toUpperCase() === torrentInfo.infohash){
                found = true
                iter = i
                this.torrents[i].destroy()
                console.log('torrent was destroyed')
            } else {
                console.log('torrent could not be found')
            }
        }
        if(found){
            this.torrents.splice(iter, 1)
            console.log('torrent was removed')
        }
        return {status: found, infohash: torrentInfo.infohash}
        // this.torrents.forEach(element => {
        //     if(element.infoHash.toLowerCase() === torrentInfo.infohash || element.infoHash.toUpperCase() === torrentInfo.infohash){
        //         element.destroy()
        //         console.log('torrent removed')
        //     }
        // })
    }
    postTorrent(torrentInfo){
        torrentInfo.folderName = torrentInfo.folderName.replace(/[^a-zA-Z0-9]/g, "")
        if(!fs.existsSync('./data/' + torrentInfo.folderName)){
            console.log('can not find a folder with the name ' + torrentInfo.folderName)
            return {status: false, infohash: 'not available', folderName: torrentInfo.folderName}
        }
        torrentInfo.torrentData.user = this.user.address
        fs.writeFileSync('./data/' + torrentInfo.folderName + '/info.txt', `user: ${torrentInfo.torrentData.user}\nsite: ${torrentInfo.torrentData.site ? torrentInfo.torrentData.site : 'none'}\nfront-end-hash: ${torrentInfo.torrentData.frontEndHash ? torrentInfo.torrentData.frontEndHash : 'none'}\ndescription: ${torrentInfo.torrentData.description}`)
        fs.writeFileSync('./data/' + torrentInfo.folderName + '/zero.json', JSON.stringify(torrentInfo.appData))
        let torrent = this.client.seed('./data/' + torrentInfo.folderName)
        torrent.on('ready', () => {
            // torrent.on('upload', bytes => {
            //     console.log(bytes)
            // })
            this.torrents.push(torrent)
            console.log('infohash: ' + torrent.infoHash + ' is ready and done, it is now uplading - ' + torrentInfo.folderName)
            fse.copySync('./data/' + torrentInfo.folderName, '../zerocon/' + torrent.infoHash, {recursive: true})
        })
        torrent.on('error', () => {
            console.log('there was an error')
        })
        // torrent.on('upload', bytes => {
        //     console.log(bytes)
        // })
        return {status: true, infohash: torrent.infoHash, folderName: torrentInfo.folderName}
    }
    getTorrent(torrentInfo){
        let torrent = this.client.add(torrentInfo.infohash, {path: './data/' + torrentInfo.infohash})
        torrent.on('infoHash', () => {
            console.log('infoHash has been determined')
        })
        torrent.on('error', () => {
            console.log('there was an error')
        })
        torrent.on('metadata', () => {
            console.log('metadata is good')
        })
        // torrent.on('noPeers', () => {
        //     console.log('no peers')
        // })
        // torrent.on('upload', () => {
        //     console.log('uploading now')
        // })
        // torrent.on('warning', () => {
        //     console.log('there was a warning');
        // })
        torrent.on('ready', () => {
            console.log('infohash: ' + torrent.infoHash + ' is ready and now downloading')
            // torrent.on('download', () => {
            //     console.log('downloading now')
            // })
            // torrent.on('wire', () => {
            //     console.log('wiring')
            // })
            torrent.on('done', () => {
                console.log('infohash: ' + torrent.infoHash + ' is done')
                fse.copySync('./data/' + torrentInfo.infohash, '../zerocon/' + torrent.infoHash, {recursive: true})
            })
            this.torrents.push(torrent)
        })
        return {status: true, infohash: torrent.infoHash}
        // let self = this
        // setTimeout(() => {self.removeTorrent(torrentInfo.infohash)}, 10000)
        // setInterval(() => {console.log(self.torrents.length)}, 10000)
    }
}

module.exports = {Peer}