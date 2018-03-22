'use strict';

const fs = require('fs');
const path = require('path');
const {exec, spawn} = require('child_process');

const mock = require('mock-require');
const test = require('ava');
const tempfile = require('tempfile');
const template = require('lodash.template');

// Mock clipboard on CI builds
let clipboard = {
	value: ''
};
clipboard.write = val => {
	clipboard.value = val;
	return Promise.resolve();
};
clipboard.read = () => Promise.resolve(clipboard.value);
if (process.env.TRAVISTEST) {
	mock('clipboardy', clipboard);
} else {
	clipboard = require('clipboardy');
}

const ipt = require('../src');
const pkg = require('../package.json');

// Mocked deps
const noop = function () {};
const obj = Object.freeze({});
const cwd = process.cwd();
const helpMessageOutput = fs.readFileSync(path.join(__dirname, 'fixtures', 'help'), {encoding: 'utf8'});

// Mocks some context
test.beforeEach(t => {
	const stdin = tempfile();
	const ttyStdin = tempfile();
	fs.writeFileSync(stdin, '');
	fs.writeFileSync(ttyStdin, '');
	t.context.p = {
		on: noop,
		exit: noop,
		stdin: fs.createReadStream(stdin),
		stdout: fs.createWriteStream(tempfile()),
		stderr: fs.createWriteStream(tempfile())
	};
	t.context.ttys = {
		stdin: fs.createReadStream(ttyStdin),
		stdout: fs.createWriteStream(tempfile())
	};
});

test.afterEach(t => {
	t.context.p = null;
	t.context.ttys = null;
});

test.cb('should display help message if no input provided', t => {
	ipt(t.context.p, t.context.ttys, {
		info: msg => {
			t.is(msg.slice(0, 33), '\nUsage:\n  ipt [options] [<path>]\n');
			t.end();
		}
	}, obj);
});

test.cb('should display help message on help option', t => {
	ipt(t.context.p, t.context.ttys, {
		info: msg => {
			t.is(msg.slice(0, 33), '\nUsage:\n  ipt [options] [<path>]\n');
			t.end();
		}
	}, Object.assign({}, obj, {help: true}));
});

test.cb('should display version number', t => {
	ipt(t.context.p, t.context.ttys, {
		info: msg => {
			t.is(msg, pkg.version.toString());
			t.end();
		}
	}, Object.assign({}, {version: true}));
});

test.cb('should build and select items from a basic list', t => {
	const prompt = ipt(t.context.p, t.context.ttys, {
		info: msg => {
			t.is(msg, 'foo');
			t.end();
		}
	}, obj, 'foo\nbar');
	prompt.rl.emit('line');
});

test.cb('should build and select an item from a signle item list', t => {
	const prompt = ipt(t.context.p, t.context.ttys, {
		info: msg => {
			t.is(msg, 'foo');
			t.end();
		}
	}, obj, 'foo');
	prompt.rl.input.emit('keypress', null, {name: 'down'});
	prompt.rl.emit('line');
});

test.cb('should successful exit on basic usage', t => {
	const p = Object.assign({}, t.context.p, {
		exit: code => {
			t.is(code, 0);
			t.end();
		}
	});
	const prompt = ipt(p, t.context.ttys, {info: noop}, obj, 'foo\nbar', noop);
	prompt.rl.emit('line');
});

test.cb('should print error message when encounter problems', t => {
	ipt(t.context.p, t.context.ttys, {info: noop}, obj, Buffer.from('jjj'), (e, msg) => {
		t.is(msg, 'An error occurred while building the interactive interface');
		t.end();
	});
});

test.cb('should print original error message when debug option', t => {
	ipt(t.context.p, t.context.ttys, {info: noop}, Object.assign({}, obj, {debug: true}), Buffer.from('jjj'), e => {
		t.is(e.name, 'TypeError');
		t.end();
	});
});

test.cb('should use separator option to build a basic list', t => {
	const prompt = ipt(t.context.p, t.context.ttys, {
		info: msg => {
			t.is(msg, 'foo');
			t.end();
		}
	}, Object.assign({}, obj, {separator: ':'}), 'foo:bar');
	prompt.rl.emit('line');
});

test.cb('should use weird separator option to build a long list', t => {
	const prompt = ipt(t.context.p, t.context.ttys, {
		info: msg => {
			t.is(msg, 'ipsum');
			t.end();
		}
	}, Object.assign({}, obj, {separator: '-:™£:-'}), 'foo-:™£:-bar-:™£:-lorem-:™£:-ipsum-:™£:-dolor-:™£:-sit-:™£:-amet-:™£:-now');
	prompt.rl.input.emit('keypress', null, {name: 'down'});
	prompt.rl.input.emit('keypress', null, {name: 'down'});
	prompt.rl.input.emit('keypress', null, {name: 'down'});
	prompt.rl.emit('line');
});

test.cb('should be able to use multiple items mode and select many', t => {
	const prompt = ipt(t.context.p, t.context.ttys, {
		info: msg => {
			t.is(msg, 'foo\nlorem');
			t.end();
		}
	}, Object.assign({}, obj, {multiple: true}), 'foo\nbar\nlorem\nipsum');
	prompt.rl.input.emit('keypress', ' ', {name: 'space'});
	prompt.rl.input.emit('keypress', null, {name: 'down'});
	prompt.rl.input.emit('keypress', null, {name: 'down'});
	prompt.rl.input.emit('keypress', ' ', {name: 'space'});
	prompt.rl.emit('line');
});

test.cb('should trim each outputed line', t => {
	const prompt = ipt(t.context.p, t.context.ttys, {
		info: msg => {
			t.is(msg, 'foo\nlorem');
			t.end();
		}
	}, Object.assign({}, obj, {multiple: true}), '  foo\n  bar\n  lorem\n  ipsum');
	prompt.rl.input.emit('keypress', ' ', {name: 'space'});
	prompt.rl.input.emit('keypress', null, {name: 'down'});
	prompt.rl.input.emit('keypress', null, {name: 'down'});
	prompt.rl.input.emit('keypress', ' ', {name: 'space'});
	prompt.rl.emit('line');
});

test.cb('should not trim result when using option', t => {
	const prompt = ipt(t.context.p, t.context.ttys, {
		info: msg => {
			t.is(msg, '"  foo"\n"  lorem"');
			t.end();
		}
	}, Object.assign({}, obj, {multiple: true, 'no-trim': true}), '  foo\n  bar\n  lorem\n  ipsum'); // eslint-disable-line quote-props
	prompt.rl.input.emit('keypress', ' ', {name: 'space'});
	prompt.rl.input.emit('keypress', null, {name: 'down'});
	prompt.rl.input.emit('keypress', null, {name: 'down'});
	prompt.rl.input.emit('keypress', ' ', {name: 'space'});
	prompt.rl.emit('line');
});

test.cb('should be able to use autocomplete interface', t => {
	const prompt = ipt(t.context.p, t.context.ttys, {
		info: msg => {
			t.is(msg, 'lorem');
			t.end();
		}
	}, Object.assign({}, obj, {autocomplete: true}), 'foo\nbar\nlorem\nipsum');
	prompt.rl.input.emit('keypress', 'l');
});

test.cb('should be able to use autocomplete interface case insensitive', t => {
	const prompt = ipt(t.context.p, t.context.ttys, {
		info: msg => {
			t.is(msg, 'LOREM');
			t.end();
		}
	}, Object.assign({}, obj, {autocomplete: true}), 'foo\nbar\nLOREM\nipsum');
	prompt.rl.input.emit('keypress', 'l');
});

test.cb('should be able to use autocomplete interface typing complete word', t => {
	const prompt = ipt(t.context.p, t.context.ttys, {
		info: msg => {
			t.is(msg, 'ipsum');
			t.end();
		}
	}, Object.assign({}, obj, {autocomplete: true}), 'foo\nbar\nLOREM\nipsum');
	prompt.rl.input.emit('keypress', 'i');
	prompt.rl.input.emit('keypress', 'p');
	prompt.rl.input.emit('keypress', 's');
	prompt.rl.input.emit('keypress', 'u');
	prompt.rl.input.emit('keypress', 'm');
});

test.cb('should be able to retrieve a valid path from an input', t => {
	const prompt = ipt(t.context.p, t.context.ttys, {
		error: console.log,
		info: msg => {
			t.is(msg, 'package.json');
			t.end();
		}
	}, Object.assign({}, obj, {'extract-path': true, debug: true}), '?? foo\n?? bar\nM package.json');
	prompt.rl.input.emit('keypress', null, {name: 'down'});
	prompt.rl.input.emit('keypress', null, {name: 'down'});
	prompt.rl.emit('line');
});

test.cb('should not be able to retrieve an invalid path from an input', t => {
	const prompt = ipt(t.context.p, t.context.ttys, {
		error: console.log,
		info: msg => {
			t.is(msg, '');
			t.end();
		}
	}, Object.assign({}, obj, {'extract-path': true, debug: true}), '?? foo\n?? bar\nM package.json');
	prompt.rl.emit('line');
});

test.serial.cb('should copy selected item to clipboard on --copy option', t => {
	const prompt = ipt(t.context.p, t.context.ttys, {
		info: () => {
			clipboard.read()
				.then(data => {
					t.is(data, 'foo');
					t.end();
				})
				.catch(err => {
					t.fail(err);
					t.end();
				});
		}
	}, {copy: true}, 'foo\nbar');
	prompt.rl.emit('line');
});

test.serial.cb('should output correct item when using clipboard', t => {
	const prompt = ipt(t.context.p, t.context.ttys, {
		info: msg => {
			t.is(msg, 'foo');
			t.end();
		}
	}, {}, 'foo\nbar');
	prompt.rl.emit('line');
});

test.serial.cb('should never copy items if copy option is not active', t => {
	clipboard.write('ipt is so cool')
		.then(() => {
			const prompt = ipt(t.context.p, t.context.ttys, {
				info: msg => {
					t.is(msg, 'foo');
					clipboard.read()
						.then(data => {
							t.is(data, 'ipt is so cool');
							t.end();
						})
						.catch(err => {
							t.fail(err);
							t.end();
						});
				}
			}, obj, 'foo\nbar');
			prompt.rl.emit('line');
		})
		.catch(err => {
			t.fail(err);
			t.end();
		});
});

// Disables clipboard cli test on travis
if (!process.env.TRAVISTEST) {
	test.serial.cb('should copy to clipboard from cli', t => {
		const run = spawn('node', ['./src/cli.js', './test/fixtures/clipboard', '--no-ttys=true', '--copy', '--unquoted'], {
			cwd
		});
		run.on('close', code => {
			t.is(code, 0);
			clipboard.read()
				.then(data => {
					t.is(data, 'ipt is awesome');
					t.end();
				})
				.catch(err => {
					t.fail(err);
					t.end();
				});
		});
		run.stdin.write('\n');
	});
}

// --- cli integration tests

const cli = ({cmd, input = [], output, error}) => t => {
	const stdinfile = tempfile();
	const stdin = fs.createWriteStream(stdinfile);
	const runner = exec(template(cmd)({stdin: stdinfile}), {cwd}, (err, stdout, stderr) => {
		if (err) {
			t.is(error, stderr);
			t.end();
		} else {
			t.is(output, stdout);
			t.end();
		}
	});
	input.forEach(i => stdin.write(i));
	runner.stdin.end();
	stdin.end();
};

test.cb('should be able to pipe data from stdin', cli({
	cmd: 'echo "banana,peach,apple" | ./src/cli.js --stdin-tty=<%= stdin %> -s , --debug',
	input: ['j', '\n'],
	output: 'peach\n'
}));

test.cb('should run in autocomplete mode from cli', cli({
	cmd: 'node ./src/cli.js ./test/fixtures/simpletest --stdin-tty=<%= stdin %> -n -a --debug',
	input: ['l', 'o', 'r', '\n'],
	output: 'lorem\n'
}));

test.cb('should not quote result args with white space if --unquoted option is given', cli({
	cmd: 'node ./src/cli.js "./test/fixtures/white space" --stdin-tty=<%= stdin %> -n --unquoted --debug',
	input: ['\n'],
	output: 'white space\n'
}));

test.cb('should quote result args with white space', cli({
	cmd: 'node ./src/cli.js "./test/fixtures/white space" --stdin-tty=<%= stdin %> n --debug',
	input: ['\n'],
	output: '"white space"\n'
}));

test.cb('should display error if provided file is not found', cli({
	cmd: 'node ./src/cli.js ./test/fixtures/inexistentfilename -n',
	error: 'Error reading incoming data\n'
}));

test.cb('should be able to use different separators with --separator', cli({
	cmd: 'node ./src/cli.js ./test/fixtures/customseparators --stdin-tty=<%= stdin %> -n --separator=: --debug',
	input: ['j', ' ', '\n'],
	output: 'bar\n'
}));

test.cb('should be able to use custom separators with --separator', cli({
	cmd: 'node ./src/cli.js ./test/fixtures/test.csv --stdin-tty=<%= stdin %> -n --separator=, --debug',
	input: ['j', ' ', '\n'],
	output: 'oranges\n'
}));

test.cb('should display version on --version', cli({
	cmd: 'node ./src/cli.js ./test/fixtures/simpletest --stdin-tty=<%= stdin %> -n --version --debug',
	output: pkg.version.toString() + '\n'
}));

test.cb('should display help message on empty invocation', cli({
	cmd: 'node ./src/cli.js',
	output: helpMessageOutput
}));

test.cb('should display help message on --help', cli({
	cmd: 'node ./src/cli.js --help',
	output: helpMessageOutput
}));

test.cb('should run other different encoding using --file-encoding option', cli({
	cmd: 'node ./src/cli.js ./test/fixtures/utf16encode --file-encoding=utf16le --stdin-tty=<%= stdin %>',
	input: ['\n'],
	output: 'lorem\n'
}));

test.cb('should run different encoding using --file-encoding option', cli({
	cmd: 'node ./src/cli.js ./test/fixtures/asciiencode --file-encoding=ascii --stdin-tty=<%= stdin %>',
	input: ['\n'],
	output: 'foo\n'
}));

test.cb('should run using multiple from cli', cli({
	cmd: 'node ./src/cli.js ./test/fixtures/simpletest --stdin-tty=<%= stdin %> -m',
	input: [' ', 'j', 'j', ' ', '\n'],
	output: 'foo\nlorem\n'
}));

test.cb('should run from cli', cli({
	cmd: 'node ./src/cli.js ./test/fixtures/simpletest --stdin-tty=<%= stdin %>',
	input: ['\n'],
	output: 'foo\n'
}));

test.cb('should get valid paths if using -p option', cli({
	cmd: 'ls | node ./src/cli.js -p --stdin-tty=<%= stdin %>',
	input: ['k', '\n'],
	output: 'test\n'
}));
