'use strict';

const os = require('os');

const clipboard = require('clipboardy').write;
const inquirer = require('inquirer');
const fuzzysearch = require('fuzzysearch');

module.exports = function (p, ttys, log, options, input, error) {
	const sep = options.separator || os.EOL;

	function end(data) {
		if (!Array.isArray(data)) {
			data = [data];
		}
		log.info(data.join(os.EOL));
		p.exit(0);
	}

	function formatResult(str) {
		str = str || '';

		if (!options['no-trim']) {
			str = str.trim();
		}

		if (options.unquoted) {
			return str;
		}

		return str.indexOf(' ') > -1 ? `"${str}"` : str;
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
		log.warn('\u001B[?25h');
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

		const promptChoices = input.split(sep)
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
			.then(answers => [].concat(answers.stdin))
			.then(answers => options['extract-path'] ? Promise.all(answers.map(require('extract-path'))) : answers)
			.then(answers => answers.map(formatResult))
			.then(answers => options.copy ? clipboard(answers.join(sep)).then(end) : end(answers))
			.catch(console.log);
		return result.ui;
	}

	try {
		return showList();
	} catch (err) {
		error(err, 'An error occurred while building the interactive interface');
	}
};

