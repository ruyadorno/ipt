import fs from 'fs';
import test from 'ava';
import tempfile from 'tempfile';
import {spawn} from 'child_process';
import {copy, paste} from 'copy-paste';
import ipt from '../src';
import pkg from '../package.json';

// Mocked deps
const noop = function () {};
const obj = Object.freeze({});
const cwd = process.cwd();
const helpMessageOutput = '\nUsage:\n  ipt [<path>]\n\nSpecify a file <path> or pipe some data from stdin to start interacting.\n\nOptions:\n  -v --version       Displays app version number\n  -h --help          Shows this help message\n  -d --debug         Prints original node error messages to stderr on errors\n  -e --file-encoding Sets a encoding to open <path> file, defaults to utf8\n  -m --multiple      Allows the selection of multiple items\n  -s --separator     Defines a separator to be used to split input into items\n  -c --copy          Copy selected item(s) to clipboard\n  --unquoted         Force the output to be unquoted\n\n';

function getConsoleOutput(str) {
	const inquirerReleaseOutputCode = '\u001b[?25h';
	return str.split(inquirerReleaseOutputCode)[1];
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
			t.is(msg.slice(0, 23), '\nUsage:\n  ipt [<path>]\n');
			t.end();
		}
	}, obj);
});

test.cb('should display help message on help option', t => {
	ipt(t.context.p, t.context.ttys, {
		info: msg => {
			t.is(msg.slice(0, 23), '\nUsage:\n  ipt [<path>]\n');
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
	ipt(t.context.p, t.context.ttys, {info: noop}, obj, new Buffer('jjj'), (e, msg) => {
		t.is(msg, 'An error occurred while building the interactive interface');
		t.end();
	});
});

test.cb('should print original error message when debug option', t => {
	ipt(t.context.p, t.context.ttys, {info: noop}, Object.assign({}, obj, {debug: true}), new Buffer('jjj'), e => {
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

// Disables clipboard tests on travis, pretty sure we can not test it there
if (!process.env.TRAVISTEST) {
	test.serial.cb('should copy selected item to clipboard on --copy option', t => {
		const prompt = ipt(t.context.p, t.context.ttys, {
			info: () => {
				paste((err, data) => {
					if (err) {
						t.fail(err);
					}
					t.is(data, 'foo');
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
		copy('ipt is so cool', err => {
			if (err) {
				t.fail(err);
			}
			const prompt = ipt(t.context.p, t.context.ttys, {
				info: msg => {
					t.is(msg, 'foo');
					paste((err, data) => {
						if (err) {
							t.fail(err);
						}
						t.is(data, 'ipt is so cool');
						t.end();
					});
				}
			}, obj, 'foo\nbar');
			prompt.rl.emit('line');
		});
	});

	test.serial.cb('should copy to clipboard from cli', t => {
		let content = '';
		let run = spawn('node', ['../src/cli.js', './fixtures/clipboard', '--no-ttys=true', '--copy', '--unquoted'], {
			cwd: cwd
		});
		run.stdout.on('data', data => {
			content += data.toString();
		});
		run.on('close', code => {
			t.is(code, 0);
			paste((err, data) => {
				if (err) {
					t.fail(err);
				}
				t.is(data, 'ipt is awesome');
				t.end();
			});
		});
		run.stdin.write('\n');
	});
}

// --- cli integration tests

test.cb('should run from cli', t => {
	let content = '';
	let run = spawn('node', ['../src/cli.js', './fixtures/simpletest', '--no-ttys=true', '-n'], {
		cwd: cwd,
		stdio: ['pipe', 'pipe', 'inherit']
	});
	run.stdout.on('data', data => {
		content += data.toString();
	});
	run.on('close', code => {
		t.is(code, 0);
		t.is(getConsoleOutput(content), 'foo\n');
		t.end();
	});
	run.stdin.write('\n');
	run.stdin.end();
});

test.cb('should run using multiple from cli', t => {
	let content = '';
	let run = spawn('node', ['../src/cli.js', './fixtures/simpletest', '--no-ttys=true', '-n', '-m'], {
		cwd: cwd,
		stdio: ['pipe', 'pipe', 'inherit']
	});
	run.stdout.on('data', data => {
		content += data.toString();
	});
	run.on('close', code => {
		t.is(code, 0);
		t.is(getConsoleOutput(content), 'foo\nlorem\n');
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
	let run = spawn('node', ['../src/cli.js', './fixtures/asciiencode', '--no-ttys=true', '-n', '--file-encoding=ascii'], {
		cwd: cwd,
		stdio: ['pipe', 'pipe', 'inherit']
	});
	run.stdout.on('data', data => {
		content += data.toString();
	});
	run.on('close', code => {
		t.is(code, 0);
		t.is(getConsoleOutput(content), 'foo\n');
		t.end();
	});
	run.stdin.write('\n');
	run.stdin.end();
});

test.cb('should run other different encoding using --file-encoding option', t => {
	let content = '';
	let run = spawn('node', ['../src/cli.js', './fixtures/utf16encode', '--no-ttys=true', '-n', '--file-encoding=utf16le'], {
		cwd: cwd,
		stdio: ['pipe', 'pipe', 'inherit']
	});
	run.stdout.on('data', data => {
		content += data.toString();
	});
	run.on('close', code => {
		t.is(code, 0);
		t.is(getConsoleOutput(content), 'lorem\n');
		t.end();
	});
	run.stdin.write('\n');
	run.stdin.end();
});

test.cb('should display help message on --help', t => {
	let content = '';
	let run = spawn('node', ['../src/cli.js', './fixtures/simpletest', '--no-ttys=true', '-n', '--help'], {
		cwd: cwd,
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
	let run = spawn('node', ['../src/cli.js'], {
		cwd: cwd,
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
	let run = spawn('node', ['../src/cli.js', './fixtures/simpletest', '--no-ttys=true', '-n', '--version'], {
		cwd: cwd,
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
	let run = spawn('node', ['../src/cli.js', './fixtures/test.csv', '--no-ttys=true', '-n', '--separator=,'], {
		cwd: cwd,
		stdio: ['pipe', 'pipe', 'inherit']
	});
	run.stdout.on('data', data => {
		content += data.toString();
	});
	run.on('close', code => {
		t.is(code, 0);
		t.is(getConsoleOutput(content), 'oranges\n');
		t.end();
	});
	run.stdin.write('j');
	run.stdin.write(' ');
	run.stdin.write('\n');
	run.stdin.end();
});

test.cb('should be able to use different separators with --separator', t => {
	let content = '';
	let run = spawn('node', ['../src/cli.js', './fixtures/customseparators', '--no-ttys=true', '-n', '--separator=:'], {
		cwd: cwd,
		stdio: ['pipe', 'pipe', 'inherit']
	});
	run.stdout.on('data', data => {
		content += data.toString();
	});
	run.on('close', code => {
		t.is(code, 0);
		t.is(getConsoleOutput(content), 'bar\n');
		t.end();
	});
	run.stdin.write('j');
	run.stdin.write(' ');
	run.stdin.write('\n');
	run.stdin.end();
});

test.cb('should display error if provided file is not found', t => {
	let content = '';
	let run = spawn('node', ['../src/cli.js', './fixtures/inexistentfilename', '--no-ttys=true', '-n'], {
		cwd: cwd
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
	let run = spawn('node', ['../src/cli.js', './fixtures/white space', '--no-ttys=true', '-n'], {
		cwd: cwd
	});
	run.stdout.on('data', data => {
		content += data.toString();
	});
	run.on('close', code => {
		t.is(code, 0);
		t.is(getConsoleOutput(content), '"white space"\n');
		t.end();
	});
	run.stdin.write('\n');
	run.stdin.end();
});

test.cb('should not quote result args with white space if --unquoted option is given', t => {
	let content = '';
	let run = spawn('node', ['../src/cli.js', './fixtures/white space', '--no-ttys=true', '-n', '--unquoted'], {
		cwd: cwd
	});
	run.stdout.on('data', data => {
		content += data.toString();
	});
	run.on('close', code => {
		t.is(code, 0);
		t.is(getConsoleOutput(content), 'white space\n');
		t.end();
	});
	run.stdin.write('\n');
	run.stdin.end();
});
