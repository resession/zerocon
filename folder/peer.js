const WebTorrent = require('webtorrent')
// const DHT = require('bittorrent-dht')
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
const DHT = require('@hyperswarm/dht')
const toArrayBuffer = require('to-array-buffer')
const SHA256 = require('crypto-js/sha256')
const MD5 = require('md5')

class Peer {
    constructor(user){
        this.user = user
        this.client = new WebTorrent({torrentPort: process.env.TORRENTPORT || 2000})
        this.torrents = []
        this.torrentApps = []
        this.peers = DHT()
        this.peers.listen(process.env.PEERPORT || 8000)
        // this.peers = new DHT()
        // this.peers.listen(process.env.PEERPORT || 8000)
        // this.peers.on('peer', (peer, infoHash, from) => {
        //     console.log(`found: ${peer.host}:${peer.port} - ${Buffer.from(infoHash).toString('hex')}`)
        // })
        // this.startHTTP()
        // this.startWS()
    }
    // test(){
    //     console.log(path.resolve(__dirname, '../zerocon/' + hash))
    // }
    async getRandomPort(){
        return await getPort()
    }
    // startHTTP(){
    //     this.http = express()
    //     this.http.use(express.static('pub'))
    //     this.http.use(express.urlencoded({extended: true}))
    //     this.http.use(express.json())
    //     this.http.get('/', (req, res) => {
    //         return res.status(200).json('success')
    //     })
    //     this.http.post('/add', (req, res) => {
    //         if(!req.body.prikey || bitcoin.payments.p2pkh({pubkey: bitcoin.ECPair.fromWIF(req.body.prikey).publicKey}).address !== this.user.address){
    //             return res.status(400).json('not correct key')
    //         } else {
    //             let postTorrent = this.postTorrent(req.body)
    //             if(postTorrent.status){
    //                 return res.status(200).json('successful ' + postTorrent.folderName + ' - ' + postTorrent.infohash)
    //             } else {
    //                 return res.status(200).json('unsuccessful ' + postTorrent.folderName + ' - ' + postTorrent.infohash)
    //             }
    //         }
    //     })
    //     this.http.get('/comm', (req, res) => {
    //         return res.status(200).json({http: process.env.HTTPPORT || 4000, ws: process.env.WSPORT || 8000})
    //     })
    //     this.http.post('/delete', (req, res) => {
    //         if(!req.body.prikey || bitcoin.payments.p2pkh({pubkey: bitcoin.ECPair.fromWIF(req.body.prikey).publicKey}).address !== this.user.address){
    //             return res.status(400).json('not correct key')
    //         } else {
    //             let deleteTorrent = this.deleteTorrent(req.body)
    //             if(deleteTorrent.status){
    //                 return res.status(200).json('successful ' + deleteTorrent.infohash)
    //             } else {
    //                 return res.status(200).json('unsuccessful ' + deleteTorrent.infohash)
    //             }
    //         }
    //     })
    //     this.http.post('/get', (req, res) => {
    //         if(!req.body.prikey || bitcoin.payments.p2pkh({pubkey: bitcoin.ECPair.fromWIF(req.body.prikey).publicKey}).address !== this.user.address){
    //             return res.status(400).json('not correct key')
    //         } else {
    //             let getTorrent = this.getTorrent(req.body)
    //             if(getTorrent.status){
    //                 return res.status(200).json('successful ' + getTorrent.infohash)
    //             } else {
    //                 return res.status(200).json('unsuccessful ' + getTorrent.infohash)
    //             }
    //         }
    //     })
    //     this.http.post('/lookup', (req, res) => {
    //         this.lookUpHash(req.body)
    //         return res.status(200).json('success')
    //     })
    //     this.http.post('/start', (req, res) => {
    //         if(!req.body.prikey || bitcoin.payments.p2pkh({pubkey: bitcoin.ECPair.fromWIF(req.body.prikey).publicKey}).address !== this.user.address){
    //             return res.status(400).json('not correct key')
    //         } else {
    //             let startApp = this.startTorrentApp(req.body)
    //             if(startApp){
    //                 return res.status(200).json('successful')
    //             } else {
    //                 return res.status(200).json('unsuccessful')
    //             }
    //         }
    //     })
    //     this.http.post('/stop', (req, res) => {
    //         if(!req.body.prikey || bitcoin.payments.p2pkh({pubkey: bitcoin.ECPair.fromWIF(req.body.prikey).publicKey}).address !== this.user.address){
    //             return res.status(400).json('not correct key')
    //         } else {
    //             let stopApp = this.stopTorrentApp(req.body)
    //             if(stopApp){
    //                 return res.status(200).json('successful')
    //             } else {
    //                 return res.status(200).json('unsuccessful')
    //             }
    //         }
    //     })
    //     this.http.get('*', (req, res) => {
    //         return res.status(400).json('error')
    //     })
    //     this.http.listen(Number(process.env.HTTPPORT) || 4000, process.env.HOST)
    //     console.log('http listening')
    // }
    // startWS(){
    //     this.ws = new WS.Server({port: Number(process.env.WSPORT), host: process.env.HOST})
    //     // setInterval(() => {console.log(this.ws.clients.size)}, 5000)
    //     this.startPeers()
    //     this.ws.on('connection', socket => {
    //         socket.check = setTimeout(() => {
    //             socket.send(JSON.stringify('close'), () => {
    //                 console.log('sent close signal')
    //             })
    //             socket.close()
    //             console.log('check has closed the socket')
    //         }, 150000)
    //         socket.on('open', () => {
    //             console.log('opened')
    //         })
    //         socket.on('close', (code, signal) => {
    //             clearTimeout(socket.check)
    //             console.log('socket closed', code, signal)
    //         })
    //         socket.on('error', error => {
    //             console.log('socket error', error)
    //         })
    //         socket.on('message', message => {
    //             let data = JSON.parse(message)
    //             console.log('message data', data)
    //             if(data === 'close'){
    //                 socket.close()
    //             }
    //         })
    //     })
    //     this.ws.on('close', () => {
    //         console.log('closed')
    //     })
    //     this.ws.on('error', error => {
    //         console.log('socket error', error)
    //     })
    //     console.log('ws listening')
    // }
    // startPeers(){
    //     this.peers.on('peer', (peer, infoHash, from) => {
    //         this.ws.clients.forEach(socket => {
    //             socket.send(JSON.stringify({peer, infoHash, from}), () => {
    //                 console.log(`found: ${peer.host}:${peer.port} - ${Buffer.from(infoHash).toString('hex')}`)
    //             })
    //         })
    //     })
    // }
    announcePeer(hash, port){
        port = Number(port)
        hash = MD5(hash)
        this.peers.announce(Buffer.from(hash, 'utf8'), {port}, error => {
            if(error){
                console.log('announce error\n', error)
            } else {
                console.log('announced peer')
            }
        })
        // this.peers.announce(hash, port, () => {
        //     console.log('announced peer')
        // })
    }
    unannouncePeer(hash, port){
        port = Number(port)
        hash = MD5(hash)
        this.peers.unannounce(Buffer.from(hash, 'utf8'), {port}, () => {
            console.log('unannounced peer')
        })
    }
    async lookUpHash(torrentInfo){
        // this.peers.lookup(torrentInfo.hash, () => {
        //     console.log('looked up ' + torrentInfo.hash)
        // })
        let res = await this.getLookUpHash(torrentInfo.hash)
        console.log(res)
    }
    getLookUpHash(hash){
        hash = MD5(hash)
        return new Promise(resolve => {
            this.peers.lookup(Buffer.from(hash, 'utf8')).on('data', data => {console.log(data)}).on('end', () => {resolve('lookup is finished')})
        })
    }
    startAllApps(appInfo){
        for(let hash of appInfo.hashes.split(',')){
            this.runTorrentApp({hash, host: appInfo.host, httpport: this.getRandomPort(), wsport: this.getRandomPort()})
        }
        // let hashes = fs.readdirSync('./zerocon')
        // for(let hash of hashes){
        //     this.runTorrentApp({hash, host: appInfo.host, httpport: this.getRandomPort(), wsport: this.getRandomPort()})
        // }
    }
    stopAllApps(){
        this.torrentApps.forEach(app => {
            this.unannouncePeer(app.announce.hash, app.announce.port)
            app.kill()
        })
        this.torrentApps = []
        console.log('stopped all apps')
    }
    getAllTorrents(hashInfo){
        for(let hash of hashInfo.hashes.split(',')){
            this.getTorrent({infohash: hash})
        }
        // for(let hash of hashInfo.hashes){
        //     this.getTorrent({infohash: hash})
        // }
    }
    deleteAllTorrents(){
        this.torrents.forEach(torrent => {
            torrent.destroy()
        })
        this.torrents = []
        console.log('all torrents deleted')
    }
    // startTorrentApp(torrentInfo){
    //     console.log('starting torrent app ' + torrentInfo.hash)
    //     return this.runTorrentApp(torrentInfo.hash, torrentInfo.host, torrentInfo.httpport, torrentInfo.wsport)
    // }
    runTorrentApp(runData){
        let zero = JSON.parse(fs.readFileSync('./zerocon/' + runData.hash + '/zero.json'))
        let torrentApp = null
        let environmentVar = {...process.env}
        environmentVar.HTTPPORT = runData.httpport
        environmentVar.WSPORT = runData.wsport
        environmentVar.HOST = runData.host
        try {
            if(zero.runLanguage === 'python' || zero.runLanguage === 'python3'){
                zero.runLanguage = process.platform !== 'win32' ? 'python3' : 'python'
                torrentApp = spawn(`${zero.installPackage} ${zero.installArguments.split(',').join(' ')} && ${zero.runLanguage} ${zero.runArguments.split(',').join(' ')}`, [], {env: environmentVar, stdio: 'pipe', cwd: path.resolve(__dirname, '../zerocon/' + runData.hash), shell: true})
            } else {
                torrentApp = spawn(`${zero.installPackage} ${zero.installArguments.split(',').join(' ')} && ${zero.runLanguage} ${zero.runArguments.split(',').join(' ')}`, [], {env: environmentVar, stdio: 'pipe', cwd: path.resolve(__dirname, '../zerocon/' + runData.hash), shell: true})
            }
        } catch (error) {
            console.log('try/catch', error)
            console.log('could not install packages, did not start torrent app')
            return false
        }
        torrentApp.infohash = runData.hash
        // torrentApp.announce = {hash: SHA1(hash + 'zerocon'), port: httpport}
        // torrentApp.check = setInterval(() => {
        //     this.announcePeer(torrentApp.announce.hash, torrentApp.announce.port)
        // }, 300000)
        torrentApp.announce = {hash: runData.hash, port: runData.httpport}
        this.announcePeer(torrentApp.announce.hash, torrentApp.announce.port)
        this.torrentApps.push(torrentApp)
        // torrentApp.stderr.setEncoding('utf8')
        // torrentApp.stdout.setEncoding('utf8')
        torrentApp.stderr.pipe(process.stderr)
        torrentApp.stdout.pipe(process.stdout)
        torrentApp.on('error', error => {
            console.log('error: ', error)
            // torrentApp.kill()
            this.stopTorrentApp({hash: torrentApp.infohash})
        })
        torrentApp.on('exit', (code, signal) => {
            // clearInterval(torrentApp.check)
            this.killThePort(torrentApp.announce.port)
            // this.removeTorrentApp(torrentApp.infohash)
            console.log('remove app because of exit')
            console.log('exited: ', code, signal)
        })
        torrentApp.on('close', (code, signal) => {
            // clearInterval(torrentApp.check)
            this.killThePort(torrentApp.announce.port)
            // this.removeTorrentApp(torrentApp.infohash)
            console.log('remove app again, just to be sure')
            console.log('closed: ', code, signal)
        })
    }
    async killThePort(port){
        let res = await killPort(Number(port), 'tcp')
        // console.log(res)
        return res
    }
    // stopTorrentApp(torrentInfo){
    //     // let stopApp = false
    //     for(let i = 0;i < this.torrentApps.length; i++){
    //         if(torrentInfo.hash === this.torrentApps[i].infohash.toLowerCase() || torrentInfo.hash === this.torrentApps[i].infohash.toUpperCase()){
    //             this.unannouncePeer(this.torrentApps[i].announce.hash, this.torrentApps[i].announce.port)
    //             this.torrentApps[i].kill()
    //             stopApp = true
    //             console.log('app was found')
    //             return stopApp
    //         } else {
    //             console.log('app could not be found')
    //         }
    //     }
    //     return stopApp
    // }
    stopTorrentApp(torrentInfo){
        let iter = 0
        let found = false
        for(let i = 0;i < this.torrentApps.length; i++){
            if(torrentInfo.hash === this.torrentApps[i].infohash.toLowerCase() || torrentInfo.hash === this.torrentApps[i].infohash.toUpperCase()){
                found = true
                iter = i
                this.unannouncePeer(this.torrentApps[i].announce.hash, this.torrentApps[i].announce.port)
                this.torrentApps[i].kill()
                // this.torrentApps[i].kill()
                console.log('app was found')
            } else {
                console.log('app could not be found')
            }
        }
        if(found){
            this.torrentApps.splice(iter, 1)
            console.log('app was removed')
        }
    }
    // removeTorrentApp(hash){
    //     let iter = 0
    //     let found = false
    //     for(let i = 0;i < this.torrentApps.length; i++){
    //         if(this.torrentApps[i].infohash.toLowerCase() === hash || this.torrentApps[i].infohash.toUpperCase() === hash){
    //             found = true
    //             iter = i
    //             // this.torrentApps[i].kill()
    //             console.log('app was found')
    //         } else {
    //             console.log('app could not be found')
    //         }
    //     }
    //     if(found){
    //         this.torrentApps.splice(iter, 1)
    //         console.log('app was removed')
    //     }
    // }
    // announcePeer(hash, port){
    //     port = Number(port)
    //     this.peers.announce(hash, port, () => {
    //         console.log('announced peer')
    //     })
    // }
    // unannouncePeer(hash, port){
    //     port = Number(port)
    //     this.peers.unannounce(SHA1(hash + 'zerocon'), port, () => {
    //         console.log('unannounced peer')
    //     })
    // }
    // lookUpHash(torrentInfo){
    //     this.peers.lookup(SHA1(torrentInfo.hash + 'zerocon'), () => {
    //         console.log('looked up ' + torrentInfo.hash)
    //     })
    // }
    // saveUser(){
    //     fs.writeFileSync('./user.json', JSON.stringify(this.user))
    // }
    deleteTorrent(torrentInfo){
        let iter = 0
        let found = false
        for(let i = 0;i < this.torrents.length; i++){
            if(this.torrents[i].infoHash.toLowerCase() === torrentInfo.infohash || this.torrents[i].infoHash.toUpperCase() === torrentInfo.infohash){
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
    }
    lineByLine(data){
        let outLog = ''
        for(let [key, value] of Object.entries(data)){
            outLog = outLog + key + ': ' + value + '\n'
        }
        return outLog
    }
    postTorrent(torrentInfo){
        torrentInfo.mainData.folderName = torrentInfo.mainData.folderName.replace(/[^a-zA-Z0-9]/g, "")
        if(!fs.existsSync('./data/' + torrentInfo.mainData.folderName)){
            console.log('can not find a folder with the name ' + torrentInfo.mainData.folderName)
            return {status: false, infohash: 'not available', folderName: torrentInfo.mainData.folderName}
        }
        torrentInfo.torrentData.user = this.user.address
        fs.writeFileSync('./data/' + torrentInfo.mainData.folderName + '/info.txt', this.lineByLine(torrentInfo.torrentData))
        fs.writeFileSync('./data/' + torrentInfo.mainData.folderName + '/zero.json', JSON.stringify(torrentInfo.appData))
        let torrent = this.client.seed('./data/' + torrentInfo.mainData.folderName)
        torrent.on('ready', () => {
            this.torrents.push(torrent)
            console.log('infohash: ' + torrent.infoHash + ' is ready and done, it is now uplading - ' + torrentInfo.mainData.folderName)
            fse.copySync('./data/' + torrentInfo.mainData.folderName, './zerocon/' + torrent.infoHash, {recursive: true})
        })
        torrent.on('error', () => {
            console.log('there was an error')
        })
        return {status: true, infohash: torrent.infoHash, folderName: torrentInfo.mainData.folderName}
    }
    getTorrent(torrentInfo){
        let torrent = this.client.add(torrentInfo.infohash, {path: './data/' + torrentInfo.infohash})

        this.torrents.push(torrent)
        
        torrent.on('infoHash', () => {
            console.log('infoHash has been determined')
        })
        torrent.on('error', () => {
            console.log('there was an error')
        })
        torrent.on('metadata', () => {
            console.log('metadata is good')
        })
        torrent.on('ready', () => {
            console.log('infohash: ' + torrent.infoHash + ' is ready and now downloading')
            torrent.on('done', () => {
                console.log('infohash: ' + torrent.infoHash + ' is done')
                fse.copySync('./data/' + torrentInfo.infohash, './zerocon/' + torrent.infoHash, {recursive: true})
            })
        })
    }
}

module.exports = {Peer}