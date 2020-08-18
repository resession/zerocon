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
        this.node = new WebTorrent({torrentPort: process.env.TORRENTPORT || 2000})
        this.apps = []
        this.peers = DHT()
        this.peers.listen(process.env.PEERPORT || 8000)
        this.startUpTorrents()
    }
    // test(){
    //     console.log(path.resolve(__dirname, '../zerocon/' + hash))
    // }
    startUpTorrents(){
        let folders = fs.readdirSync('./data')
        for(const folderName of folders){
            let torrent = this.node.seed('./data/' + folderName)
            torrent.on('ready', () => {
                console.log('infohash: ' + torrent.infoHash + ' is ready and done, it is now uplading - ' + folderName)
            })
            torrent.on('error', error => {
                console.log('there was an error, torrent was not posted\n', error)
            })
            torrent.on('metadata', () => {
                console.log('metadata is good')
            })
            // torrent.on('warning', warning => {
            //     console.log('there was an warning, torrent is still good\n', warning)
            // })
        }
    }
    async getRandomPort(){
        return await getPort()
    }
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
    }
    unannouncePeer(hash, port){
        port = Number(port)
        hash = MD5(hash)
        this.peers.unannounce(Buffer.from(hash, 'utf8'), {port}, () => {
            console.log('unannounced peer')
        })
    }
    async lookUpHash(torrentInfo){
        let res = await this.getLookUpHash(torrentInfo.hash)
        console.log(res)
    }
    getLookUpHash(hash){
        hash = MD5(hash)
        return new Promise(resolve => {
            this.peers.lookup(Buffer.from(hash, 'utf8')).on('data', data => {
                console.log(this.getLookUpData(data))
            }).on('end', () => {
                resolve('lookup is finished')
            })
        })
    }
    getLookUpData(data){
        return '\n' + '>'.repeat(40) + '\n' + ')'.repeat(16) + ' node ' + '('.repeat(16) + '\n' + 'node - host: ' + data.node.host + ' port: ' + data.node.port + '\n' + 'to - host: ' + data.to.host + ' port: ' + data.to.port + '\n' + '-'.repeat(40) + '\n' + ')'.repeat(16) + ' peers ' + '('.repeat(16) + this.lineByList(data.peers) + '<'.repeat(40) + '\n'
    }
    startAllApps(appInfo){
        for(const hash of appInfo.hashes.split(',')){
            this.runTorrentApp({hash, host: appInfo.host, httpport: this.getRandomPort(), wsport: this.getRandomPort()})
        }
    }
    stopAllApps(){
        this.apps.forEach(app => {
            this.unannouncePeer(app.announce.hash, app.announce.port)
            app.kill()
        })
        // this.apps = []
        console.log('stopped all apps')
    }
    getAllTorrents(hashInfo){
        for(const hash of hashInfo.hashes.split(',')){
            this.getTorrent({hash})
        }
    }
    deleteAllTorrents(){
        this.node.torrents.forEach(torrent => {
            torrent.destroy()
        })
        console.log('all torrents deleted')
    }
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
        torrentApp.infoHash = runData.hash
        torrentApp.announce = {hash: runData.hash, port: runData.httpport}
        this.announcePeer(torrentApp.announce.hash, torrentApp.announce.port)
        this.apps.push(torrentApp)
        torrentApp.stderr.pipe(process.stderr)
        torrentApp.stdout.pipe(process.stdout)
        torrentApp.on('error', error => {
            console.log('error: ', error)
            // torrentApp.kill()
            this.stopTorrentApp({hash: torrentApp.infoHash})
        })
        torrentApp.on('exit', (code, signal) => {
            this.killThePort(torrentApp.announce.port)
            // this.removeTorrentApp({hash: torrentApp.infoHash})
            console.log('app exited')
            console.log('exited: ', code, signal)
        })
        torrentApp.on('close', (code, signal) => {
            this.killThePort(torrentApp.announce.port)
            // this.removeTorrentApp({hash: torrentApp.infoHash})
            console.log('app closed')
            console.log('closed: ', code, signal)
        })
    }
    async killThePort(port){
        let res = await killPort(Number(port), 'tcp')
        // console.log(res)
        return res
    }
    stopTorrentApp(torrentInfo){
        let iter = 0
        let found = false
        for(let i = 0;i < this.apps.length; i++){
            if(torrentInfo.hash === this.apps[i].infoHash.toLowerCase() || torrentInfo.hash === this.apps[i].infoHash.toUpperCase()){
                found = true
                iter = i
                this.unannouncePeer(this.apps[i].announce.hash, this.apps[i].announce.port)
                this.apps[i].kill()
                // this.apps[i].kill()
                console.log('app was stopped')
            }
        }
        if(found){
            this.apps.splice(iter, 1)
            console.log('app was found\napp was removed')
        } else {
            console.log('app could not be found\napp could not be removed')
        }
    }
    // stopTorrentApp(torrentInfo){
    //     // let iter = 0
    //     // let found = false
    //     for(let i = 0;i < this.apps.length; i++){
    //         if(torrentInfo.hash === this.apps[i].infoHash.toLowerCase() || torrentInfo.hash === this.apps[i].infoHash.toUpperCase()){
    //             found = true
    //             iter = i
    //             this.unannouncePeer(this.apps[i].announce.hash, this.apps[i].announce.port)
    //             this.apps[i].kill()
    //             // this.apps[i].kill()
    //             console.log('app was found and killed')
    //         } else {
    //             console.log('app could not be found and killed')
    //         }
    //     }
    //     // if(found){
    //     //     this.apps.splice(iter, 1)
    //     //     console.log('app was removed')
    //     // }
    // }
    // removeTorrentApp(torrentInfo){
    //     let iter = 0
    //     let found = false
    //     for(let i = 0;i < this.apps.length; i++){
    //         if(torrentInfo.hash === this.apps[i].infoHash.toLowerCase() || torrentInfo.hash === this.apps[i].infoHash.toUpperCase()){
    //             found = true
    //             iter = i
    //             // this.unannouncePeer(this.apps[i].announce.hash, this.apps[i].announce.port)
    //             // this.apps[i].kill()
    //             // this.apps[i].kill()
    //             console.log('app was found')
    //         } else {
    //             console.log('app could not be found')
    //         }
    //     }
    //     if(found){
    //         this.apps.splice(iter, 1)
    //         console.log('app was removed')
    //     }
    // }
    deleteTorrent(torrentInfo){
        let found = false
        this.node.torrents.forEach(torrent => {
            if(torrent.infoHash.toLowerCase() === torrentInfo.hash || torrent.infoHash.toUpperCase() === torrentInfo.hash){
                torrent.destroy()
                found = true
            }
        })
        if(found){
            console.log('torrent was found\ntorrent was removed')
        } else {
            console.log('torrent was not found\ntorrent could not be removed')
        }
    }
    lineByList(data){
        let outLog = '\n'
        for(const info of data){
            outLog = outLog + info.host + ':' + info.port + ' | host: ' + info.host + ' - port: ' + info.port + '\n'
        }
        return outLog
    }
    lineByLine(data){
        let outLog = ''
        for(const [key, value] of Object.entries(data)){
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
        fs.writeFileSync('./data/' + torrentInfo.mainData.folderName + '/info.json', JSON.stringify(torrentInfo.torrentData))
        fs.writeFileSync('./data/' + torrentInfo.mainData.folderName + '/zero.json', JSON.stringify(torrentInfo.appData))
        let torrent = this.node.seed('./data/' + torrentInfo.mainData.folderName)
        torrent.on('ready', () => {
            console.log('infohash: ' + torrent.infoHash + ' is ready and done, it is now uplading - ' + torrentInfo.mainData.folderName)
            fse.copySync('./data/' + torrentInfo.mainData.folderName, './zerocon/' + torrent.infoHash, {recursive: true})
        })
        torrent.on('error', error => {
            console.log('there was an error, torrent was not posted\n', error)
        })
        torrent.on('metadata', () => {
            console.log('metadata is good')
        })
        // torrent.on('warning', warning => {
        //     console.log('there was an warning, torrent is still good\n', warning)
        // })
        return {status: true, infohash: torrent.infoHash, folderName: torrentInfo.mainData.folderName}
    }
    getTorrent(torrentInfo){
        let torrent = this.node.add(torrentInfo.hash, {path: './data/' + torrentInfo.hash})
        
        torrent.on('infoHash', () => {
            console.log('infoHash has been determined')
        })
        torrent.on('error', error => {
            console.log('there was an error\n', error)
        })
        torrent.on('metadata', () => {
            console.log('metadata is good')
        })
        // torrent.on('warning', warning => {
        //     console.log('there was an warning, torrent is still good\n', warning)
        // })
        torrent.on('ready', () => {
            console.log('infohash: ' + torrent.infoHash + ' is ready and now downloading')
            torrent.on('done', () => {
                console.log('infohash: ' + torrent.infoHash + ' is done')
                fse.copySync('./data/' + torrentInfo.hash, './zerocon/' + torrent.infoHash, {recursive: true})
            })
        })
    }
}

module.exports = {Peer}