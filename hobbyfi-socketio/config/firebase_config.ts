const admin = require('firebase-admin');
const fs = require('fs');

const firebaseApp = admin.initializeApp({ credential:
    admin.credential.cert(JSON.parse(process.env.firebaseConfig ||
        fs.readFileSync(__dirname + '/../keys/hobbyfi-firebase-adminsdk-o1f83-e1d558ffae.json')))
});

const messaging = firebaseApp.messaging();

module.exports = messaging;