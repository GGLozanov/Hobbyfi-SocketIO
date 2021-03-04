
const app = require('express')();
const http = require('http').createServer(app);
export const io = require('socket.io')(http);

const formUrlEncodedParser = app.urlencoded({ extended: true });

app.use(formUrlEncodedParser);

app.all('*', require('../handler/require_auth'));

app.post('/receive_server_message', (req, res) => {
    if(!req.is('urlencoded') || !req.body.type) {
        return res.status(400).send('Invalid encoding or missing server message type!');
    }

    const content = req.body;
    console.log('message received from server: ' + content.msg);

    // res.end('ok');
});

http.listen(3000, () => {
    console.log(`listening on ${http.address}`);
});

exports.configHttp = http;
exports.routedApp = app;