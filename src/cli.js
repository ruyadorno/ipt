#!/usr/bin/env node

'use strict';

const fs = require('fs');
const {promisify} = require('util');
const getStdin = require('get-stdin');
const reopenTTY = require('reopen-tty');
const yargs = require('yargs');

const {argv} = yargs
	.example('ls | ipt', 'Builds an interactive interface out of current dir items')
	.example('cat $(ls | ipt)', 'Uses cat to print contents of whatever item is selected')
	.example('ipt ./file', 'Builds the interactive list out of a given file')
	.usage('Usage:\n  ipt [options] [<path>]')
	.alias('a', 'autocomplete')
	.describe('a', 'Starts in autocomplete mode')
	.alias('c', 'copy')
	.describe('c', 'Copy selected item(s) to clipboard')
	.alias('d', 'debug')
	.describe('d', 'Prints to stderr any internal error')
	.alias('e', 'file-encoding')
	.describe('e', 'Encoding for file <path>, defaults to utf8')
	.help('h')
	.alias('h', 'help')
	.describe('h', 'Shows this help message')
	.alias('m', 'multiple')
	.describe('m', 'Allows the selection of multiple items')
	.alias('s', 'separator')
	.describe('s', 'Separator to to split input into items')
	.alias('t', 'no-trim')
	.describe('t', 'Prevents trimming of the result strings')
	.alias('p', 'extract-path')
	.describe('p', 'Returns only a valid path for each item')
	.alias('u', 'unquoted')
	.describe('u', 'Force the output to be unquoted')
	.alias('v', 'version')
	.boolean(['a', 'c', 'd', 'h', 'm', 't', 'p', 'u', 'v'])
	.string(['e', 's'])
	.epilog('Visit https://github.com/ruyadorno/ipt for more info');

const [filePath] = argv._;

// Exits program execution on ESC or q keypress
process.stdin.on('keypress', (ch, key) => {
	if (key && (key.name === 'escape' || key.name === 'q')) {
		process.exit();
	}
});

function startIpt(input) {
	if (!input) {
		return yargs.showHelp('log');
	}

	Promise.all([
		promisify(reopenTTY.stdin)(),
		promisify(reopenTTY.stdout)(),
		promisify(reopenTTY.stderr)()
	])
		.then(stdio => {
			const [stdin, stdout, stderr] = stdio;
			const getStdin = () => argv['stdin-tty'] ? fs.createReadStream(argv['stdin-tty']) : stdin;
			require('.')(process, (argv['no-ttys'] ? process : {stdin: getStdin(), stdout, stderr}), console, argv, input, error);
		})
		.catch(err => {
			console.error(argv.debug ? err : 'Error opening tty interaction');
		});
}

function error(e, msg) {
	console.error(argv.debug ? e : msg);
	process.exit(1);
}

(filePath ?
	promisify(fs.readFile)(filePath, {
		encoding: argv['file-encoding'] || 'utf8'
	}) : getStdin())
	.then(startIpt)
	.catch(err => {
		error(err, 'Error reading incoming data');
	});
