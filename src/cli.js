#!/usr/bin/env node

'use strict';

const fs = require('fs');
const getStdin = require('get-stdin');
const ttys = require('ttys');
const argv = require('minimist')(process.argv.slice(2), {
	boolean: [
		'autocomplete',
		'debug',
		'help',
		'multiple',
		'copy',
		'version',
		'no-ttys',
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
		v: 'version'
	}
});

const filePath = argv._[0];

// Exits program execution on ESC or q keypress
process.stdin.on('keypress', (ch, key) => {
	if (key && (key.name === 'escape' || key.name === 'q')) {
		process.exit();
	}
});

function startIpt(input) {
	require('./')(process, (argv['no-ttys'] ? process : ttys), console, argv, input, error);
}

function error(e, msg) {
	console.error(argv.debug ? e : msg);
	process.exit(1);
}

if (filePath) {
	fs.readFile(filePath, {
		encoding: argv['file-encoding'] || 'utf8'
	}, (err, data) => {
		if (err) {
			error(err, 'Error reading file from path');
		} else {
			startIpt(data);
		}
	});
} else {
	getStdin().then(data => {
		startIpt(data);
	}).catch(err => {
		error(err, 'Error while reading stdin');
	});
}
