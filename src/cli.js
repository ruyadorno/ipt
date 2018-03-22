#!/usr/bin/env node

'use strict';

const fs = require('fs');
const {promisify} = require('util');
const getStdin = require('get-stdin');
const reopenTTY = require('reopen-tty');
const argv = require('minimist')(process.argv.slice(2), {
	boolean: [
		'autocomplete',
		'debug',
		'help',
		'multiple',
		'copy',
		'version',
		'no-ttys',
		'extract-path',
		'no-trim'
	],
	alias: {
		a: 'autocomplete',
		d: 'debug',
		e: 'file-encoding',
		h: 'help',
		m: 'multiple',
		c: 'copy',
		s: 'separator',
		t: 'no-trim',
		p: 'extract-path',
		v: 'version'
	}
});

const [filePath] = argv._;

// Exits program execution on ESC or q keypress
process.stdin.on('keypress', (ch, key) => {
	if (key && (key.name === 'escape' || key.name === 'q')) {
		process.exit();
	}
});

function startIpt(input) {
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
	}) :
	getStdin())
	.then(data => startIpt(data))
	.catch(err => {
		error(err, 'Error reading incoming data');
	});
