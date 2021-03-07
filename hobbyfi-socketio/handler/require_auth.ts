import http from "node:http";

const jwt = require('jsonwebtoken');
const fs = require('fs');
const https = require('https');

import { Request, Response } from "express";
const URL = require('url').URL;

export default (req: Request, res: Response, next: () => void) => {
    const token = req.get('Authorization');
    if(!token || !req.accepts('application/x-www-form-urlencoded')) {
        return res.status(404).send('Invalid request! Missing Authorization header or incorrect MIME Accept type!');
    }

    try {
        let payload = jwt.verify(token, fs.readFileSync(__dirname + '/../keys/public.pem').toString(), { algorithms: ['RS256'] });

        if(!payload || !payload.userId ||
                fs.readFileSync(__dirname + '/../keys/server_host.txt').toString() != payload.iss) {
            return res.status(406).send('Invalid JWT token payload sent in Authorization header! May not have originated from server!');
        }

        res.locals.userId = payload.userId;
        next();
    } catch(err) {
        switch(err.name) {
            case 'TokenExpiredError': {
                return res.status(401).send('JWT sent in Authorization header is expired!');
            }
            case 'JsonWebTokenError': {
                const requestUrl = new URL(`https://graph.facebook.com/v10.0/debug_token?input_token=${token}
                    &access_token=${fs.readFileSync(__dirname + '/../keys/fb_app_id.txt').toString()}|${fs.readFileSync(__dirname + '/../keys/fb_app_secret.txt').toString()}`);

                https.get(requestUrl, (result: http.IncomingMessage) => {
                    console.log('statusCode for facebook GET:', result.statusCode);
                    console.log('headers for facebook GET:', result.headers);

                    let output = '';

                    result.on('data', (data) => {
                        output += data;
                    });

                    result.on('end', () => {
                        const objOutput = JSON.parse(output);

                        if(objOutput.error) {
                            return res.status(400).send(`Failed check for Facebook token! Facebook token request may have been misconfigured!`);
                        } else if(objOutput.data.error) {
                            return res.status(401).send(`Failed check for Facebook token! Facebook token may have not been correct 
                                or malformed JWT may have been passed! ${objOutput.data.error.toString()}`);
                        }

                        res.locals.userId = parseInt(objOutput.data.user_id);
                        next();
                    });
                }).on('error', (error: Error) => {
                    return res.status(401).send(`Failed check for Facebook token! JWT may be malformed or an invalid/expired 
                        Facebook token may have been passed! ${error}`);
                }).end();
                break;
            }
            default: return res.status(400).send('Invalid JWT token sent in Authorization header!');
        }
    }
};