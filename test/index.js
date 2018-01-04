'use strict';

const fs = require('fs');
const path = require('path');
const {spawn} = require('child_process');

const mock = require('mock-require');
const test = require('ava');
const tempfile = require('tempfile');

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

function testConsoleOutput(t, output, expected) {
	t.is(output.substr(-expected.length), expected);
}

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

test.cb('should run from cli', t => {
	let content = '';
	const run = spawn('node', ['./src/cli.js', './test/fixtures/simpletest', '--no-ttys=true', '-n'], {
		cwd,
		stdio: ['pipe', 'pipe', 'inherit']
	});
	run.stdout.on('data', data => {
		content += data.toString();
	});
	run.on('close', code => {
		t.is(code, 0);
		testConsoleOutput(t, content, 'foo\n');
		t.end();
	});
	run.stdin.write('\n');
	run.stdin.end();
});

test.cb('should run using multiple from cli', t => {
	let content = '';
	const run = spawn('node', ['./src/cli.js', './test/fixtures/simpletest', '--no-ttys=true', '-n', '-m'], {
		cwd,
		stdio: ['pipe', 'pipe', 'inherit']
	});
	run.stdout.on('data', data => {
		content += data.toString();
	});
	run.on('close', code => {
		t.is(code, 0);
		testConsoleOutput(t, content, 'foo\nlorem\n');
		t.end();
	});
	run.stdin.write(' ');
	run.stdin.write('j');
	run.stdin.write('j');
	run.stdin.write(' ');
	run.stdin.write('\n');
	run.stdin.end();
});

test.cb('should run different encoding using --file-encoding option', t => {
	let content = '';
	const run = spawn('node', ['./src/cli.js', './test/fixtures/asciiencode', '--no-ttys=true', '-n', '--file-encoding=ascii'], {
		cwd,
		stdio: ['pipe', 'pipe', 'inherit']
	});
	run.stdout.on('data', data => {
		content += data.toString();
	});
	run.on('close', code => {
		t.is(code, 0);
		testConsoleOutput(t, content, 'foo\n');
		t.end();
	});
	run.stdin.write('\n');
	run.stdin.end();
});

test.cb('should run other different encoding using --file-encoding option', t => {
	let content = '';
	const run = spawn('node', ['./src/cli.js', './test/fixtures/utf16encode', '--no-ttys=true', '-n', '--file-encoding=utf16le'], {
		cwd,
		stdio: ['pipe', 'pipe', 'inherit']
	});
	run.stdout.on('data', data => {
		content += data.toString();
	});
	run.on('close', code => {
		t.is(code, 0);
		testConsoleOutput(t, content, 'lorem\n');
		t.end();
	});
	run.stdin.write('\n');
	run.stdin.end();
});

test.cb('should display help message on --help', t => {
	let content = '';
	const run = spawn('node', ['./src/cli.js', './test/fixtures/simpletest', '--no-ttys=true', '-n', '--help'], {
		cwd,
		stdio: ['pipe', 'pipe', 'inherit']
	});
	run.stdout.on('data', data => {
		content += data.toString();
	});
	run.on('close', code => {
		t.is(code, 0);
		t.is(content, helpMessageOutput);
		t.end();
	});
	run.stdin.end();
});

test.cb('should display help message on empty invocation', t => {
	let content = '';
	const run = spawn('node', ['./src/cli.js'], {
		cwd,
		stdio: ['pipe', 'pipe', 'inherit']
	});
	run.stdout.on('data', data => {
		content += data.toString();
	});
	run.on('close', code => {
		t.is(code, 0);
		t.is(content, helpMessageOutput);
		t.end();
	});
	run.stdin.end();
});

test.cb('should display version on --version', t => {
	let content = '';
	const run = spawn('node', ['./src/cli.js', './test/fixtures/simpletest', '--no-ttys=true', '-n', '--version'], {
		cwd,
		stdio: ['pipe', 'pipe', 'inherit']
	});
	run.stdout.on('data', data => {
		content += data.toString();
	});
	run.on('close', code => {
		t.is(code, 0);
		t.is(content, pkg.version.toString() + '\n');
		t.end();
	});
	run.stdin.end();
});

test.cb('should be able to use custom separators with --separator', t => {
	let content = '';
	const run = spawn('node', ['./src/cli.js', './test/fixtures/test.csv', '--no-ttys=true', '-n', '--separator=,'], {
		cwd,
		stdio: ['pipe', 'pipe', 'inherit']
	});
	run.stdout.on('data', data => {
		content += data.toString();
	});
	run.on('close', code => {
		t.is(code, 0);
		testConsoleOutput(t, content, 'oranges\n');
		t.end();
	});
	run.stdin.write('j');
	run.stdin.write(' ');
	run.stdin.write('\n');
	run.stdin.end();
});

test.cb('should be able to use different separators with --separator', t => {
	let content = '';
	const run = spawn('node', ['./src/cli.js', './test/fixtures/customseparators', '--no-ttys=true', '-n', '--separator=:'], {
		cwd,
		stdio: ['pipe', 'pipe', 'inherit']
	});
	run.stdout.on('data', data => {
		content += data.toString();
	});
	run.on('close', code => {
		t.is(code, 0);
		testConsoleOutput(t, content, 'bar\n');
		t.end();
	});
	run.stdin.write('j');
	run.stdin.write(' ');
	run.stdin.write('\n');
	run.stdin.end();
});

test.cb('should display error if provided file is not found', t => {
	let content = '';
	const run = spawn('node', ['./src/cli.js', './test/fixtures/inexistentfilename', '--no-ttys=true', '-n'], {
		cwd
	});
	run.stderr.on('data', data => {
		content += data.toString();
	});
	run.on('close', code => {
		t.is(code, 1);
		t.is(content, 'Error reading file from path\n');
		t.end();
	});
});

test.cb('should quote result args with white space', t => {
	let content = '';
	const run = spawn('node', ['./src/cli.js', './test/fixtures/white space', '--no-ttys=true', '-n'], {
		cwd
	});
	run.stdout.on('data', data => {
		content += data.toString();
	});
	run.on('close', code => {
		t.is(code, 0);
		testConsoleOutput(t, content, '"white space"\n');
		t.end();
	});
	run.stdin.write('\n');
	run.stdin.end();
});

test.cb('should not quote result args with white space if --unquoted option is given', t => {
	let content = '';
	const run = spawn('node', ['./src/cli.js', './test/fixtures/white space', '--no-ttys=true', '-n', '--unquoted'], {
		cwd
	});
	run.stdout.on('data', data => {
		content += data.toString();
	});
	run.on('close', code => {
		t.is(code, 0);
		testConsoleOutput(t, content, 'white space\n');
		t.end();
	});
	run.stdin.write('\n');
	run.stdin.end();
});

test.cb('should run in autocomplete mode from cli', t => {
	let content = '';
	const run = spawn('node', ['./src/cli.js', './test/fixtures/simpletest', '--no-ttys=true', '-n', '-a'], {
		cwd,
		stdio: ['pipe', 'pipe', 'inherit']
	});
	run.stdout.on('data', data => {
		if (data) {
			content = data.toString();
		}
	});
	run.on('close', code => {
		t.is(code, 0);
		testConsoleOutput(t, content, 'lorem\n');
		t.end();
	});
	run.stdin.write('l');
	run.stdin.write('o');
	run.stdin.write('r');
	run.stdin.write('\n');
	run.stdin.end();
});

