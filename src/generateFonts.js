var { createReadStream } = require('fs')
var _ = require('underscore')
var Q = require('q')

var svgicons2svgfont = require('svgicons2svgfont')
var svg2ttf = require('svg2ttf')
var ttf2woff = require('ttf2woff')
var ttf2woff2 = require('ttf2woff2')
var ttf2eot = require('ttf2eot')

/**
 * Generators for files of different font types.
 *
 * Generators have following properties:
 * [deps] {array.<string>} Names of font types that will be generated before current
 *		and passed to generator function.
 * fn {function(options, ...depsFonts, done)} Generator function with following arguments:
 *	 options {object} Options passed to 'generateFonts' function.
 *	 ...depsFonts Fonts listed in deps.
 *	 done {function(err, font)} Callback that takes error or null and generated font.
 */
var generators = {
	svg: {
		deps: [],
		fn: function (options, done) {
			var font = new Buffer(0)
			var svgOptions = _.pick(options,
				'fontName', 'fontHeight', 'descent', 'normalize', 'round'
			)

			if (options.formatOptions['svg']) {
				svgOptions = Object.assign(svgOptions, options.formatOptions['svg']);
			}

			svgOptions.log = function () { }

			const fontStream = svgicons2svgfont(svgOptions)
				.on('data', function (data) {
					font = Buffer.concat([font, data])
				})
				.on('end', function () {
					done(null, font.toString())
				});

			options.files.forEach((file, idx) => {
				const name = options.names[idx];
				const unicode = String.fromCharCode(options.codepoints[name]);

				let ligature = '';
				for (var i = 0; i < name.length; i++) {
					ligature += String.fromCharCode(name.charCodeAt(i));
				}

				const glyph = createReadStream(file);

				glyph.metadata = {
					name: name,
					unicode: [unicode, ligature],
				};

				fontStream.write(glyph);
			});

			fontStream.end();
		}
	},

	ttf: {
		deps: ['svg'],
		fn: function (options, svgFont, done) {
			let font = svg2ttf(svgFont, options.formatOptions['ttf']);
			font = new Buffer(font.buffer);
			done(null, font);
		}
	},

	woff: {
		deps: ['ttf'],
		fn: function (options, ttfFont, done) {
			let font = ttf2woff(new Uint8Array(ttfFont), options.formatOptions['woff']);
			font = new Buffer(font.buffer);
			done(null, font);
		}
	},

	woff2: {
		deps: ['ttf'],
		fn: function (options, ttfFont, done) {
			let font = ttf2woff2(new Uint8Array(ttfFont), options.formatOptions['woff2']);
			font = new Buffer(font.buffer);
			done(null, font);
		}
	},

	eot: {
		deps: ['ttf'],
		fn: function (options, ttfFont, done) {
			let font = ttf2eot(new Uint8Array(ttfFont), options.formatOptions['eot']);
			font = new Buffer(font.buffer);
			done(null, font);
		}
	}
}

/**
 * @returns Promise
 */
function generateFonts(options) {
	const genTasks = {};

	/**
	 * First, creates tasks for dependent font types.
	 * Then creates task for specified font type and chains it to dependencies promises.
	 * If some task already exists, it reuses it.
	 */
	var makeGenTask = function (type) {
		if (genTasks[type]) {
			return genTasks[type];
		}

		var generator = generators[type];

		const depsTasks = generator.deps.map(makeGenTask);

		var task = Q.all(depsTasks).then(function (depsFonts) {
			var args = [options].concat(depsFonts)
			return Q.nfapply(generator.fn, args)
		});

		genTasks[type] = task;

		return task;
	}

	// Create all needed generate and write tasks.
	for (var i in options.types) {
		var type = options.types[i];
		makeGenTask(type);
	}

	return Q.all(Object.values(genTasks)).then(function (results) {
		return _.object(Object.keys(genTasks), results);
	});
};

module.exports = generateFonts;
