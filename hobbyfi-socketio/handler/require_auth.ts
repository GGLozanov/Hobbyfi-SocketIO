const jwt = require('jsonwebtoken');
const fs = require('fs');
const https = require('https');
const url = require('url');

import { Request, Response } from "express";

module.exports = (req: Request, res: Response, next) => {
    const token = req.get('Authorization');
    if(!token || !req.accepts('application/json')) {
        return res.status(404).send('Invalid request! Missing Authorization header or incorrect MIME Accept type!');
    }

    try {
        let payload = jwt.verify(token, fs.readFileSync('../keys/public.pem'), { algorithms: ['RS256'] });

        if(!payload || !payload.user_id) {
            return res.status(401).send('Invalid JWT token payload sent in Authorization header!');
        }

        res.locals.userId = payload.user_id;
        next();
    } catch(err) {
        switch(err.name) {
            case 'TokenExpiredError': {
                return res.status(401).send('JWT sent in Authorization header is expired!');
            }
            case 'JsonWebTokenError': {
                https.get(`https://graph.facebook.com/v10.0/debug_token?input_token=${token}`, res => {
                    console.log('statusCode for facebook GET:', res.statusCode);
                    console.log('headers for facebook GET:', res.headers);

                    let output = '';

                    res.on('data', (data) => {
                        output += data;
                    });

                    res.on('end', () => {
                        const objOutput = JSON.parse(output);
                        res.locals.userId = parseInt(objOutput.data.user_id);

                        next();
                    });
                }).on('error', error => {
                    return res.status(401).send(`Failed check for Facebook token! JWT may be malformed or an invalid/expired 
                        Facebook token may have been passed! ${error}`);
                }).end();
                break;
            }
            default: return res.status(400).send('Invalid JWT token sent in Authorization header!');
        }
    }
};