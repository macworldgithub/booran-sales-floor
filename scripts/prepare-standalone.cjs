const { accessSync, cpSync } = require('node:fs');
const path = require('node:path');

const app = path.join(__dirname, '..');
const build = path.join(app, '.next');
const standalone = path.join(build, 'standalone');

accessSync(path.join(standalone, 'server.js'));
cpSync(path.join(app, 'public'), path.join(standalone, 'public'), { recursive: true });
cpSync(path.join(build, 'static'), path.join(standalone, '.next', 'static'), { recursive: true });
