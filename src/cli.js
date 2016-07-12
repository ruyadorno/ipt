#!/usr/bin/env node

'use strict';

var fs = require('fs');
var getStdin = require('get-stdin');
var os = require('os');

var yargs = require('yargs')
	.help()
	.version()
	.usage('\nUsage:\n  ipt [<path>] Specify a file <path> or pipe some data from stdin to start interacting.')
	.options({
		'debug': {
			boolean: true,
			alias: 'd',
			description: 'Prints original node error messages to stderr on errors'
		},
		'multiple': {
			boolean: true,
			alias: 'm',
			description: 'Allows the selection of multiple items'
		},
		'copy': {
			boolean: true,
			alias: 'c',
			description: 'Copy selected item(s) to clipboard'
		},
		'separator': {
			string: true,
			alias: 's',
			description: 'Defines a separator to be used to split input into items'
		},
		'file-encoding': {
			string: true,
			alias: 'e',
			description: 'Sets a encoding to open <path> file, defaults to utf8'
		},
		'ttys': {
			boolean: true,
			default: os.platform() !== 'win32',
			description: 'Use tty instead of process'
		}
	});
var argv = yargs.argv;

var filePath = argv._[0];

function startIpt(input) {
	if (!input) {
		yargs.showHelp();
		process.exit(1);
	}
	try {
		require('./')(process, (argv.ttys ? require('ttys') : process), console, argv, input);
	} catch (err) {
		error(err, err.message);
	}
}

function error(e, msg) {
	console.error(argv.debug ? e : msg);
	process.exit(1);
}

if (filePath) {
	fs.readFile(filePath, {
		encoding: argv.fileEncoding || 'utf8'
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

