const jwt = require('jsonwebtoken');
const fs = require('fs');

import {Request, Response} from "express";

module.exports = (req: Request, res: Response, next) => {
    if(!req.get('Authorization') || !req.accepts('application/json')) {
        return res.status(404).send('Invalid request! Missing Authorization header or incorrect MIME Accept type!');
    }

    // TODO: Check JWT request param and status code for any irregularities
    // TODO: Check FB auth if JWT fail

    next();
};