const readline = require('readline')
const inquirer = require('inquirer')

let addData = [
    {type: 'input', name: 'folderName', message: 'name of the folder to add'},
    {type: 'input', name: 'site', message: 'site url for this package - type none or n/a if there is none'},
    {type: 'input', name: 'frontEndHash', message: 'hash for the front-end site/app counterpart - type non or n/a if there is none'},
    {type: 'input', name: 'description', message: 'description of this package'},
    {type: 'input', name: 'runLanguage', message: 'language of this package'},
    {type: 'input', name: 'runArguments', message: 'the arguments to run this package, comma separated'},
    {type: 'input', name: 'installPackage', message: 'package manager used to install anything this package needs'},
    {type: 'input', name: 'installArguments', message: 'the arguments to install the dependencies'},
    {type: 'input', name: 'entryPointMainFile', message: 'the entry point/main file for this package'}
]

let getData = [
    {type: 'input', name: 'infohash', message: 'infohash of the package'}
]

let deleteData = [
    {type: 'input', name: 'infohash', message: 'infohash of the package'}
]

let startData = [
    {name: 'input', name: 'hash', message: 'infohash of the package'},
    {name: 'input', name: 'host', message: 'ip for the package'},
    {type: 'input', name: 'httpport', message: 'http port for the package'},
    {type: 'input', name: 'wsport', message: 'ws port for the package'}
]

let stopData = [
    {type: 'input', name: 'hash', message: 'hash for the package'}
]

let lookupData = [
    {type: 'input', name: 'hash', message: 'hash for the package'}
]

function addFunc(){
    return new Promise((resolve, reject) => {
        inquirer.prompt(addData).then(res => {
            peer.postTorrent({mainData: {folderName: res.folderName}, torrentData: {site: res.site, frontEndHash: res.frontEndHash, description: res.description}, appData: {runLanguage: res.runLanguage, runArguments: res.runArguments, installPackage: res.installPackage, installArguments: res.installArguments, entryPointMainFile: res.entryPointMainFile}})
            // resolve({status: true, data: res})
            resolve(true)
        }).catch(error => {
            // reject({status: false, data: error})
            console.log(error)
            reject(false)
        })
    })
}

function getFunc(){
    return new Promise((resolve, reject) => {
        inquirer.prompt(getData).then(res => {
            peer.getTorrent(res)
            // resolve({status: true, data: res})
            resolve(true)
        }).catch(error => {
            console.log(error)
            // reject({status: false, data: error})
            reject(false)
        })
    })
}

function deleteFunc(){
    return new Promise((resolve, reject) => {
        inquirer.prompt(deleteData).then(res => {
            peer.deleteTorrent(res)
            // resolve({status: true, data: res})
            resolve(true)
        }).catch(error => {
            console.log(erroor)
            // reject({status: false, data: error})
            reject(false)
        })
    })
}

function startFunc(){
    return new Promise((resolve, reject) => {
        inquirer.prompt(startData).then(res => {
            peer.startTorrentApp(res)
            // resolve({status: true, data: {mainData: {folderName: res.folderName}, torrentData: {site: res.site, frontEndHash: res.frontEndHash, description: res.description}, appData: {runLanguage: res.runLanguage, runArguments: res.runArguments, installPackage: res.installPackage, installArguments: res.installArguments, entryPointMainFile: res.entryPointMainFile}}})
            resolve(true)
        }).catch(error => {
            console.log(error)
            // reject({status: false, data: error})
            reject(false)
        })
    })
}

function stopFunc(){
    return new Promise((resolve, reject) => {
        inquirer.prompt(stopData).then(res => {
            peer.stopTorrentApp(res)
            // resolve({status: true, data: res})
            resolve(true)
        }).catch(error => {
            console.log(error)
            // reject({status: false, data: error})
            reject(false)
        })
    })
}

function lookupFunc(){
    return new Promise((resolve, reject) => {
        inquirer.prompt(lookupData).then(res => {
            peer.lookUpHash(res)
            // resolve({status: true, data: res})
            resolve(true)
        }).catch(error => {
            console.log(error)
            // reject({status: false, data: error})
            reject(false)
        })
    })
}

let rl = readline.Interface({input: process.stdin, output: process.stdout})

// rl.on('line', async (line) => {
//     console.log('enter a command\n')
//     let res = null
//     switch(line){
//         case 'add':
//             res = await addFunc()
//             console.log(res)
//             break;
//         case 'get':
//             res = await getFunc()
//             console.log(res)
//             break;
//         case 'delete':
//             res = await deleteFunc()
//             console.log(res)
//             break;
//         case 'start':
//             res = await startFunc()
//             console.log(res)
//             break;
//         case 'stop':
//             res = await stopFunc()
//             console.log(res)
//             break;
//         case 'lookup':
//             res = await lookupFunc()
//             console.log(res)
//             break;
//         default:
//             console.log('not a command')
//             break;
//     }
//     rl.prompt()
// })

async function asyncReadlLine(){
    rl.question('Command: ', async (answer) => {
        let res = null
        switch(answer){
            case 'add':
                res = await addFunc()
                console.log(res)
                break;
            case 'get':
                res = await getFunc()
                console.log(res)
                break;
            case 'delete':
                res = await deleteFunc()
                console.log(res)
                break;
            case 'start':
                res = await startFunc()
                console.log(res)
                break;
            case 'stop':
                res = await stopFunc()
                console.log(res)
                break;
            case 'lookup':
                res = await lookupFunc()
                console.log(res)
                break;
            default:
                console.log('not a command')
                break;
        }
        asyncReadlLine() //Calling this function again to ask new question
    });
};

module.exports = {asyncReadlLine}