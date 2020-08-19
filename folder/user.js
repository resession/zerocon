const bitcoin = require("bitcoinjs-lib")
const fs = require('fs')
const SHA1 = require('sha1')
// console.log( address, publicKey, regPrivateKey, wifPrivateKey);

function startUser(){
    clearKeysFunc()
    if(fs.existsSync('./user.json')){
        try {
            let user = JSON.parse(fs.readFileSync('./user.json'))
            // if(typeof(user) !== 'object' || !user.id.address || !user.id.pubkey|| !user.id.regPrivateKey || !user.id.wifPrivateKey || !user.announced){
            //     user = makeUser()
            //     fs.writeFileSync('./user.json', JSON.stringify(user))
            //     return user
            // } else {
            //     return user
            // }
            return user
        } catch(error) {
            let user = makeUser()
            let hash = makeHash(user.address)
            fs.writeFileSync('./login.json', JSON.stringify({password: hash}))
            fs.writeFileSync('./user.json', JSON.stringify({address: user.address, login: SHA1(user.address + hash)}))
            fs.writeFileSync('./keys.json', JSON.stringify(user))
            clearKeysSetFunc()
            return user
        }
    } else {
        let user = makeUser()
        let hash = makeHash(user.address)
        fs.writeFileSync('./login.json', JSON.stringify({password: hash}))
        fs.writeFileSync('./user.json', JSON.stringify({address: user.address, login: SHA1(user.address + hash)}))
        fs.writeFileSync('./keys.json', JSON.stringify(user))
        clearKeysSetFunc()
        return user
    }
}

function makeHash(address){
    return SHA1(address + Date.now())
}

function clearKeysFunc(){
    try {
        fs.unlinkSync('./keys.json')
        fs.unlinkSync('./login.json')
    } catch (error) {
        console.log('clearKeysFunc error\n', error)
    }
}

function clearKeysSetFunc(){
    let check = setTimeout(() => {
        try {
            fs.unlinkSync('./keys.json')
            fs.unlinkSync('./login.json')
            clearTimeout(check)
        } catch (error) {
            console.log('clearKeysFunc error\n', error)
        }
    }, 900000)
}

function makeUser(){
    const keyPair = bitcoin.ECPair.makeRandom()
    let address = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey }).address
    let publicKey = keyPair.publicKey.toString('hex')
    let regPrivateKey = keyPair.privateKey.toString('hex')
    let wifPrivateKey = keyPair.toWIF()
    return {address, publicKey, regPrivateKey, wifPrivateKey}
}

module.exports = {startUser};