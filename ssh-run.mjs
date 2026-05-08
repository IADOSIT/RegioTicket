// SSH runner usando ssh2
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Client } = require('ssh2');

const HOST = '74.208.149.7';
const USER = 'root';
const PASS = '9v6CvLJw95GM';

const COMMANDS = process.argv.slice(2).join(' ');

const conn = new Client();
conn.on('ready', () => {
  conn.exec(COMMANDS, (err, stream) => {
    if (err) { console.error(err); process.exit(1); }
    stream.on('close', (code) => {
      conn.end();
      process.exit(code);
    });
    stream.stdout.pipe(process.stdout);
    stream.stderr.pipe(process.stderr);
  });
}).connect({ host: HOST, port: 22, username: USER, password: PASS, readyTimeout: 15000 });
