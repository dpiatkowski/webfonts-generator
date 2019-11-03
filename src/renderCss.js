const { createHash } = require('crypto');
const { readFileSync } = require('fs');
const { compile } = require('handlebars');
const { EOL } = require('os');
const urlJoin = require('url-join');

/** Caclulates hash based on options and source SVG files */
function calcHash(options) {
	const hash = createHash('md5');
	options.files.forEach(file => {
		hash.update(readFileSync(file, 'utf8'));
	});
	hash.update(JSON.stringify(options));
	return hash.digest('hex');
}

function makeUrls(options) {
	const hash = calcHash(options);
	const baseUrl = options.cssFontsUrl && options.cssFontsUrl.replace(/\\/g, '/');
	const result = {};

	for (let type of options.types) {
		const fontName = options.fontName + '.' + type + '?' + hash;
		const url = baseUrl ? urlJoin(baseUrl, fontName) : fontName;

		result[type] = url;
	}

	return result;
}

function buildSrcForType(type, url, fontName) {
	switch (type) {
		case 'eot':
			return `url("${url}?#iefix") format("embedded-opentype")`;
		case 'woff2':
			return `url("${url}") format("woff2")`;
		case 'woff':
			return `url("${url}") format("woff")`;
		case 'ttf':
			return `url("${url}") format("truetype")`;
		case 'svg':
			return `url("${url}#${fontName}") format("svg")`;
	}
}

var makeSrc = function (options, urls) {
	// Order used types according to 'options.order'.
	const existingTypes = options.order.filter(type => options.types.indexOf(type) !== -1);

	return existingTypes.map(type => buildSrcForType(type, urls[type], options.fontName)).join(',' + EOL);
}

function makeCtx(options, urls) {
	// Transform codepoints to hex strings
	const codePoints = {};

	for (let [codepoint, name] of Object.entries(options.codepoints)) {
		codePoints[codepoint] = name.toString(16);
	}

	return Object.assign({
		fontName: options.fontName,
		src: makeSrc(options, urls),
		codepoints: codePoints,
	}, options.templateOptions);
}

function renderCss(options, urls) {
	if (typeof urls === 'undefined') {
		urls = makeUrls(options);
	}

	const ctx = makeCtx(options, urls);
	const source = readFileSync(options.cssTemplate, 'utf8');
	const template = compile(source);

	return template(ctx);
}

module.exports = renderCss;
