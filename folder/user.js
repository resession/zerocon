const bitcoin = require("bitcoinjs-lib")
const fs = require('fs')
// console.log( address, publicKey, regPrivateKey, wifPrivateKey);

function startUser(){
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
            fs.writeFileSync('./user.json', JSON.stringify(user))
            return user
        }
    } else {
        let user = makeUser()
        fs.writeFileSync('./user.json', JSON.stringify(user))
        return user
    }
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