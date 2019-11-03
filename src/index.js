var { writeFileSync } = require('fs');
var { sync } = require('mkdirp');
var path = require('path');
var generateFonts = require('./generateFonts');
var renderCss = require('./renderCss');
var renderHtml = require('./renderHtml');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

const TEMPLATES = {
	css: path.join(TEMPLATES_DIR, 'css.hbs'),
	scss: path.join(TEMPLATES_DIR, 'scss.hbs'),
	html: path.join(TEMPLATES_DIR, 'html.hbs'),
};

const DEFAULT_TEMPLATE_OPTIONS = {
	baseSelector: '.icon',
	classPrefix: 'icon-',
};

const DEFAULT_OPTIONS = {
	writeFiles: true,
	fontName: 'iconfont',
	css: true,
	cssTemplate: TEMPLATES.css,
	html: false,
	htmlTemplate: TEMPLATES.html,
	types: ['eot', 'woff', 'woff2'],
	order: ['eot', 'woff2', 'woff', 'ttf', 'svg'],
	rename: function (file) {
		return path.basename(file, path.extname(file))
	},
	formatOptions: {},
	/**
	 * Unicode Private Use Area start.
	 * http://en.wikipedia.org/wiki/Private_Use_(Unicode)
	 */
	startCodepoint: 0xF101,
	normalize: true,
};

const webfont = function (options, done) {
	if (options.cssFontsPath) {
		console.log('Option "cssFontsPath" is deprecated. Use "cssFontsUrl" instead.');
		options.cssFontsUrl = options.cssFontsPath;
	}

	options = Object.assign({}, DEFAULT_OPTIONS, options);

	if (options.dest === undefined) {
		return done(new Error('"options.dest" is undefined.'));
	}

	if (options.files === undefined) {
		return done(new Error('"options.files" is undefined.'));
	}

	if (!options.files.length) {
		return done(new Error('"options.files" is empty.'));
	}

	// We modify codepoints later, so we can't use same object from default options.
	if (options.codepoints === undefined) {
		options.codepoints = {}
	}

	options.names = options.files.map(options.rename);

	if (options.cssDest === undefined) {
		options.cssDest = path.join(options.dest, options.fontName + '.css');
	}

	if (options.htmlDest === undefined) {
		options.htmlDest = path.join(options.dest, options.fontName + '.html');
	}

	// Warn about using deprecated template options.
	for (var key in options.templateOptions) {
		var value = options.templateOptions[key];
		if (key === "baseClass") {
			console.warn("[webfont-generator] Using deprecated templateOptions 'baseClass'. Use 'baseSelector' instead.");
			options.templateOptions.baseSelector = "." + value;
			delete options.templateOptions.baseClass;
			break;
		}
	}

	options.templateOptions = Object.assign({}, DEFAULT_TEMPLATE_OPTIONS, options.templateOptions);

	// Generates codepoints starting from `options.startCodepoint`,
	// skipping codepoints explicitly specified in `options.codepoints`
	var currentCodepoint = options.startCodepoint;
	var codepointsValues = Object.values(options.codepoints);

	function getNextCodepoint() {
		while (codepointsValues.includes(currentCodepoint)) {
			currentCodepoint++;
		}
		var res = currentCodepoint;
		currentCodepoint++;
		return res;
	}

	for (let name of options.names) {
		if (!options.codepoints[name]) {
			options.codepoints[name] = getNextCodepoint();
		}
	}

	// TODO output
	generateFonts(options)
		.then(function (result) {
			if (options.writeFiles) {
				writeResult(result, options);
			}

			result.generateCss = function (urls) {
				return renderCss(options, urls);
			}
			done(null, result)
		})
		.catch(function (err) { done(err) })
}

function writeFile(content, dest) {
	sync(path.dirname(dest))
	writeFileSync(dest, content);
}

function writeResult(fonts, options) {
	for (let [type, content] of Object.entries(fonts)) {
		const filepath = path.join(options.dest, options.fontName + '.' + type);
		writeFile(content, filepath);
	}

	if (options.css) {
		const css = renderCss(options);
		writeFile(css, options.cssDest);
	}

	if (options.html) {
		const html = renderHtml(options);
		writeFile(html, options.htmlDest);
	}
}

webfont.templates = TEMPLATES;

module.exports = webfont;
