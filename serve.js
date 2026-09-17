/* serve.js — StagePlanner from this folder, at http://localhost:8000.
 *
 * Google sign-in sends people back to a web address, which a file opened
 * from disk does not have. This gives the folder one, on this computer only.
 * http://localhost:8000 is in Supabase's redirect URLs for that reason.
 *
 *   node serve.js        or double-click "Start StagePlanner.bat"
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;
const ROOT = __dirname;

const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.pdf': 'application/pdf'
};

const server = http.createServer((req, res) => {
    let rel;
    try {
        rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch (e) {
        res.writeHead(400).end('Bad request');
        return;
    }
    if (rel.endsWith('/')) rel += 'index.html';

    // never outside this folder
    const file = path.join(ROOT, path.normalize(rel));
    if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
        res.writeHead(403).end('Forbidden');
        return;
    }

    fs.readFile(file, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
            return;
        }
        res.writeHead(200, {
            'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
            'Cache-Control': 'no-store'      // edits show up on reload
        });
        res.end(data);
    });
});

// localhost only: nobody else on the network can reach it
server.listen(PORT, '127.0.0.1', () => {
    console.log('StagePlanner is running at http://localhost:' + PORT);
    console.log('Keep this window open while you work. Close it to stop.');
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log('Port ' + PORT + ' is already in use. StagePlanner may already be running:');
        console.log('open http://localhost:' + PORT + ' in your browser.');
    } else {
        console.log(err.message);
    }
    process.exitCode = 1;
});
