'use strict';

var os = require('os');

var clipboard = require('copy-paste').copy;
var inquirer = require('inquirer');
var patchCliCursor = require('./patch-cli-cursor');

module.exports = function ipt(p, ttys, log, options, input) {
	function end(data) {
		if (!Array.isArray(data)) {
			data = [data];
		}
		log.info(data.join(os.EOL));
		p.exit(0);
	}

	function onPrompt(answer) {
		if (options.copy) {
			try {
				clipboard(answer.stdin, end.bind(null, answer.stdin));
			} catch (e) {
				if (options.debug) {
					log.warn(e.toString());
				}
				end(answer.stdin);
			}
		} else {
			end(answer.stdin);
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
		return prompt(
			options.multiple ? promptTypes.multiple : promptTypes.base,
			onPrompt
		);
	}

	if (!input) {
		throw new Error('Input is missing');
	} else {
		try {
			return showList();
		} catch (err) {
			var err2 = new Error('An error occurred while building the interactive interface');
			err2.subError = err;
			throw err2;
		}
	}
};

