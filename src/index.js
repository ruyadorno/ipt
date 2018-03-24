"use strict";

const cliWidth = require("cli-width");
const clipboard = require("clipboardy").write;
const inquirer = require("inquirer");
const fuzzysearch = require("fuzzysearch");

function iPipeTo(
	input,
	{
		stdin = process.stdin,
		stdout = process.stdout,
		sep = require("os").EOL,
		...options
	},
	__prompt
) {
	function formatResult(str) {
		str = str || "";

		if (!options["no-trim"]) {
			str = str.trim();
		}

		if (options.unquoted) {
			return str;
		}

		return str.indexOf(" ") > -1 ? `"${str}"` : str;
	}

	function trim(str) {
		const maxWidth = cliWidth({ defaultWidth: 80, output: stdout }) - 9;
		return str.length > maxWidth ? str.substr(0, maxWidth) + "..." : str;
	}

	const prompt = inquirer.createPromptModule({
		input: stdin,
		output: stdout
	});

	if (options.autocomplete) {
		prompt.registerPrompt(
			"autocomplete",
			require("inquirer-autocomplete-prompt")
		);
	}

	const promptChoices = input
		.split(sep)
		.filter(item => item)
		.map(item => ({
			name: trim(item),
			value: item
		}));
	const promptTypes = {
		base: {
			type: "list",
			name: "stdin",
			message: "Select an item:",
			choices: promptChoices
		},
		multiple: {
			type: "checkbox",
			name: "stdin",
			message: "Select multiple items:",
			choices: promptChoices
		},
		autocomplete: {
			type: "autocomplete",
			name: "stdin",
			message: "Select an item:",
			choices: promptChoices,
			source: (answer, input) =>
				new Promise(resolve => {
					input = input || "";
					resolve(
						promptChoices.filter(item =>
							fuzzysearch(input.toLowerCase(), item.value.toLowerCase())
						)
					);
				})
		}
	};
	const result = prompt(
		(options.multiple && promptTypes.multiple) ||
			(options.autocomplete && promptTypes.autocomplete) ||
			promptTypes.base
	);

	if (__prompt) {
		__prompt.ui = result.ui;
	}

	return result
		.then(answers => [].concat(answers.stdin))
		.then(
			answers =>
				options["extract-path"]
					? Promise.all(answers.map(require("extract-path")))
					: answers
		)
		.then(answers => answers.map(formatResult))
		.then(
			answers =>
				options.copy
					? clipboard(answers.join(sep)).then(() => answers)
					: answers
		);
}

module.exports = iPipeTo;
