const { readdirSync } = require('fs');
const { join } = require('path');
const webfontsGenerator = require('../src/index');

const SRC = join(__dirname, 'src');

const FILES = readdirSync(SRC).map(file => join(SRC, file));

const OPTIONS = {
	dest: join(__dirname, '..', 'temp'),
	files: FILES,
	fontName: 'fontName',
	types: ['svg', 'ttf', 'woff', 'woff2', 'eot'],
	html: true
};

webfontsGenerator(OPTIONS, function (error) {
	if (error) {
		console.log('Fail!', error);
	} else {
		console.log('Done!');
	}
});
