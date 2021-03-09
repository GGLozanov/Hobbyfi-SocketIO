import {Request, Response} from "express";

export default function excludeRoutes(paths: string[], middleware: (req: Request, res: Response, next: () => void) => Response) {
    return function(req: Request, res: Response, next: () => void) {
        console.log(`base url: ${req.url}`)
        console.log(`paths: ${paths}`);
        if (paths.indexOf(req.url) > -1) {
            console.log(`GO TO NEXT EXCETPION`);
            return next();
        } else {
            console.log(`resume normal middleware :mkrmeh:`);
            return middleware(req, res, next);
        }
    };
};