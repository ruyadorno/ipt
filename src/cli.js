#!/usr/bin/env node

'use strict';

var fs = require('fs');
var getStdin = require('get-stdin');
var ttys = require('ttys');
var argv = require('minimist')(process.argv.slice(2), {
	boolean: ['debug', 'help', 'multiple', 'copy', 'version', 'no-ttys', 'no-trim'],
	alias: {
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
var filePath = argv._[0];

// Exits program execution on ESC or q keypress
process.stdin.on('keypress', function (ch, key) {
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
	}, function (err, data) {
		if (err) {
			error(err, 'Error reading file from path');
		} else {
			startIpt(data);
		}
	});
} else {
	getStdin().then(function (data) {
		startIpt(data);
	}).catch(function (err) {
		error(err, 'Error while reading stdin');
	});
}
