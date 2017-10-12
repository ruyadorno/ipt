'use strict';

var os = require('os');

var clipboard = require('copy-paste').copy;
var inquirer = require('inquirer');
var pkg = require('../package');
var patchCliCursor = require('./patch-cli-cursor');

module.exports = function ipt(p, ttys, log, options, input, error) {
	function printHelp() {
		log.info(
			'\nUsage:\n  ipt [<path>]\n' +
			'\nSpecify a file <path> or pipe some data from stdin to start interacting.\n' +
			'\nOptions:\n' +
			'  -v --version       Displays app version number\n' +
			'  -h --help          Shows this help message\n' +
			'  -d --debug         Prints original node error messages to stderr on errors\n' +
			'  -e --file-encoding Sets a encoding to open <path> file, defaults to utf8\n' +
			'  -m --multiple      Allows the selection of multiple items\n' +
			'  -s --separator     Defines a separator to be used to split input into items\n' +
			'  -c --copy          Copy selected item(s) to clipboard\n' +
			'  -t --no-trim       Prevents trimming of the result strings\n' +
			'  --unquoted         Force the output to be unquoted\n'
		);
		p.exit(0);
	}

	function printVersion() {
		log.info(pkg.version);
		p.exit(0);
	}

	function end(data) {
		if (!Array.isArray(data)) {
			data = [data];
		}
		log.info(data.join(os.EOL));
		p.exit(0);
	}

	function formatResult(str) {
		if (!options['no-trim']) {
			str = str.trim();
		}

		if (options.unquoted) {
			return str;
		}

		return str.indexOf(' ') >= 0 ? '"' + str + '"' : str;
	}

	function onPrompt(answer) {
		var result = typeof answer.stdin === 'string' ?
			formatResult(answer.stdin) :
			answer.stdin.map(formatResult);

		if (options.copy) {
			try {
				clipboard(result, end.bind(null, result));
			} catch (e) {
				if (options.debug) {
					log.warn(e.toString());
				}
				end(result);
			}
		} else {
			end(result);
		}
	}

	function onForcedExit(e) {
		if (options.debug) {
			log.error(e.toString());
		}
		if (ttys.stdin !== p.stdin) {
			ttys.stdin.end();
			ttys.stdin.destroy();
		}
		if (ttys.stdout !== p.stdout) {
			ttys.stdout.end();
			ttys.stdout.destroy();
		}
		// release cursor by printing to sdterr
		log.warn('\u001b[?25h');
		p.exit(0);
	}

	function defineErrorHandlers() {
		p.on('SIGINT', onForcedExit);
		p.on('SIGTERM', onForcedExit);
		p.on('error', onForcedExit);
		ttys.stdout.on('error', onForcedExit);
	}

	function showList() {
		patchCliCursor(p, ttys);
		defineErrorHandlers();

		var prompt = inquirer.createPromptModule({
			input: ttys.stdin,
			output: ttys.stdout
		});
		var promptChoices = input.split(options.separator || os.EOL)
			.filter(function (item) {
				return item;
			})
			// truncate displaying of anything greater than 80 chars
			// keep in mind that inquirer interface takes some room
			.map(function (item) {
				return {
					name: item.length > 71 ? item.substr(0, 71) + '...' : item,
					value: item
				};
			});
		var promptTypes = {
			base: {
				type: 'list',
				name: 'stdin',
				message: 'Select an item:',
				choices: promptChoices
			},
			multiple: {
				type: 'checkbox',
				name: 'stdin',
				message: 'Select multiple items:',
				choices: promptChoices
			}
		};
		var result = prompt(
			options.multiple ? promptTypes.multiple : promptTypes.base
		);
		result
			.then(onPrompt)
			.catch(onForcedExit);
		return result.ui;
	}

	if (options.help) {
		printHelp();
	} else if (options.version) {
		printVersion();
	} else if (!input) {
		printHelp();
	} else {
		try {
			return showList();
		} catch (err) {
			error(err, 'An error occurred while building the interactive interface');
		}
	}
};

