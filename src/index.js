"use strict";

const os = require("os");
const cliWidth = require("cli-width");
const inquirer = require("inquirer");
const fuzzysearch = require("fuzzysearch");

/* get actual width of string
 * some text ex. 夢 are 2 characters wide but still 1 character
 * in length.
 */
const stringWidth = require("string-width")

function iPipeTo(
	input,
	{ stdin = process.stdin, stdout = process.stdout, ...options },
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

		let attempts = 0
		while (stringWidth(str) > maxWidth) {
			// trim until shorter than maxWidth
			str = str.substr(0, maxWidth - ++attempts)
		}
		str += "..."
		return str
	}

	function getDefaultChoices(promptType) {
		if (promptType.type === "list") {
			return options.default;
		}

		if (promptType.type === "checkbox") {
			return options.default.split(
				options["default-separator"] || options.separator
			);
		}
	}

	const prompt = inquirer.createPromptModule({
		input: stdin,
		output: stdout
	});

	const opts = {
		name: "stdin",
		message: options.message || "Select an item:",
		pageSize: options.size || null,
		choices: []
			.concat(input)
			.filter(item => item)
			.map(
				item =>
					typeof item === "string"
						? {
								name: trim(item),
								value: item
						  }
						: {
								name: trim(item.name),
								value: item.value
						  }
			)
	};

	if (options.autocomplete) {
		prompt.registerPrompt(
			"autocomplete",
			require("inquirer-autocomplete-prompt-ipt")
		);
	}

	const promptTypes = {
		base: {
			...opts,
			type: "list"
		},
		multiple: {
			...opts,
			type: "checkbox",
			message: options.message || "Select multiple items:"
		},
		autocomplete: {
			...opts,
			type: "autocomplete",
			source: (answer, input) =>
				new Promise(resolve => {
					input = input || "";
					resolve(
						opts.choices.filter(item =>
							fuzzysearch(input.toLowerCase(), item.value.toLowerCase())
						)
					);
				})
		}
	};

	const promptType =
		(options.multiple && promptTypes.multiple) ||
		(options.autocomplete && promptTypes.autocomplete) ||
		promptTypes.base;

	if (options.default) {
		promptType.default = getDefaultChoices(promptType);
	}

	const result = prompt(promptType);

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
		.then(answers => answers.map(formatResult));
}

module.exports = iPipeTo;
