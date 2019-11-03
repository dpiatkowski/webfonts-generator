const { readFileSync } = require('fs');
const { relative } = require('path');
const handlebars = require('handlebars');
const renderCss = require('./renderCss');

handlebars.registerHelper('removePeriods', function (selector) {
	return selector.replace(/\./, '');
});

function renderHtml(options) {
	const source = readFileSync(options.htmlTemplate, 'utf8');
	const template = handlebars.compile(source);

	const htmlFontsPath = relative(options.htmlDest, options.dest);
	// Styles embedded in the html file should use default CSS template and
	// have path to fonts that is relative to html file location.

	const cssOptions = Object.assign({}, options, {
		cssFontPath: htmlFontsPath
	});

	const styles = renderCss(cssOptions);

	const ctx = Object.assign({
		names: options.names,
		fontName: options.fontName,
		styles: styles
	}, options.templateOptions);

	return template(ctx);
}

module.exports = renderHtml
