#!/usr/bin/env node

"use strict";

const fs = require("fs");
const os = require("os");
const { promisify } = require("util");
const getStdin = require("get-stdin");
const reopenTTY = require("reopen-tty");
const yargs = require("yargs");

const { argv } = yargs
	.example(
		"ls | ipt",
		"Builds an interactive interface out of current dir items"
	)
	.example(
		"cat $(ls | ipt)",
		"Uses cat to print contents of whatever item is selected"
	)
	.example("ipt ./file", "Builds the interactive list out of a given file")
	.usage("Usage:\n  ipt [options] [<path>]")
	.alias("a", "autocomplete")
	.describe("a", "Starts in autocomplete mode")
	.alias("c", "copy")
	.describe("c", "Copy selected item(s) to clipboard")
	.alias("d", "debug")
	.describe("d", "Prints to stderr any internal error")
	.alias("e", "file-encoding")
	.describe("e", "Encoding for file <path>, defaults to utf8")
	.help("h")
	.alias("h", "help")
	.describe("h", "Shows this help message")
	.alias("m", "multiple")
	.describe("m", "Allows the selection of multiple items")
	.alias("s", "separator")
	.describe("s", "Separator to to split input into items")
	.alias("t", "no-trim")
	.describe("t", "Prevents trimming of the result strings")
	.alias("p", "extract-path")
	.describe("p", "Returns only a valid path for each item")
	.alias("u", "unquoted")
	.describe("u", "Force the output to be unquoted")
	.alias("v", "version")
	.boolean(["a", "c", "d", "h", "m", "t", "p", "u", "v"])
	.string(["e", "s"])
	.epilog("Visit https://github.com/ruyadorno/ipt for more info");

const sep = argv.separator || os.EOL;
const [filePath] = argv._;
let stdin;
let stdout;

function onForcedExit(e) {
	if (argv.debug) {
		console.error(e.toString());
	}
	if (stdin !== process.stdin) {
		stdin.end();
		stdin.destroy();
	}
	if (stdout !== process.stdout) {
		stdout.end();
		stdout.destroy();
	}
	// Release cursor by printing to stderr
	console.warn("\u001B[?25h");
	process.exit(0);
}

function defineHandlers() {
	process.on("SIGINT", onForcedExit);
	process.on("SIGTERM", onForcedExit);
	process.on("error", onForcedExit);
	stdout.on("error", onForcedExit);
	// Exits program execution on ESC
	stdin.on("keypress", (ch, key) => {
		if (key && key.name === "escape") {
			process.exit(0);
		}
	});
}

function error(e, msg) {
	console.error(argv.debug ? e : msg);
	process.exit(1);
}

function end(data) {
	console.log([].concat(data).join(sep));
	process.exit(0);
}

function startIpt(input) {
	if (!input) {
		return yargs.showHelp("log");
	}

	Promise.all([promisify(reopenTTY.stdin)(), promisify(reopenTTY.stdout)()])
		.then(stdio => {
			const [ttyStdin, ttyStdout] = stdio;
			stdin = argv["no-ttys"] ? process.stdin : ttyStdin;
			stdout = argv["no-ttyps"] ? process.stdout : ttyStdout;

			defineHandlers();

			const getStdin = () =>
				argv["stdin-tty"] ? fs.createReadStream(argv["stdin-tty"]) : stdin;
			return require(".")(input, { stdin: getStdin(), stdout, sep, ...argv });
		})
		.then(end)
		.catch(onForcedExit);
}

(filePath
	? promisify(fs.readFile)(filePath, {
			encoding: argv["file-encoding"] || "utf8"
	  })
	: getStdin()
)
	.then(startIpt)
	.catch(err => error(err, "Error reading incoming data"));
