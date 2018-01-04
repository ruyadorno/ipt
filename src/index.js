'use strict';

const os = require('os');

const clipboard = require('copy-paste').copy;
const inquirer = require('inquirer');
const fuzzysearch = require('fuzzysearch');
const pkg = require('../package');

module.exports = function (p, ttys, log, options, input, error) {
	function printHelp() {
		log.info(
			'\nUsage:\n  ipt [options] [<path>]\n' +
			'\nSpecify a file <path> or pipe some data from stdin to start interacting.\n' +
			'\nOptions:\n' +
			'  -v --version       Displays app version number\n' +
			'  -h --help          Shows this help message\n' +
			'  -a --autocomplete  Starts interactive selection in autocomplete mode\n' +
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
		const result = typeof answer.stdin === 'string' ?
			formatResult(answer.stdin) :
			answer.stdin.map(formatResult);

		if (options.copy) {
			try {
				clipboard(result, end.bind(null, result));
			} catch (err) {
				if (options.debug) {
					log.warn(err.toString());
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
		// Release cursor by printing to sdterr
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
		defineErrorHandlers();

		const prompt = inquirer.createPromptModule({
			input: ttys.stdin,
			output: ttys.stdout
		});

		if (options.autocomplete) {
			prompt.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));
		}

		const promptChoices = input.split(options.separator || os.EOL)
			.filter(item => item)
			// Truncate displaying of anything greater than 80 chars
			// Keep in mind that inquirer interface takes some room
			.map(item => ({
				name: item.length > 71 ? item.substr(0, 71) + '...' : item,
				value: item
			}));
		const promptTypes = {
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
			},
			autocomplete: {
				type: 'autocomplete',
				name: 'stdin',
				message: 'Select an item:',
				choices: promptChoices,
				source: (answer, input) => new Promise(resolve => {
					input = input || '';
					resolve(promptChoices.filter(item => fuzzysearch(input.toLowerCase(), item.value.toLowerCase())));
				})
			}
		};
		const result = prompt(
			(options.multiple && promptTypes.multiple) ||
			(options.autocomplete && promptTypes.autocomplete) ||
			promptTypes.base
		);
		result
			.then(onPrompt)
			.catch(onForcedExit);
		return result.ui;
	}

	const showHelp = options.help || !input;

	if (options.version) {
		printVersion();
	} else if (showHelp) {
		printHelp();
	} else {
		try {
			return showList();
		} catch (err) {
			error(err, 'An error occurred while building the interactive interface');
		}
	}
};

