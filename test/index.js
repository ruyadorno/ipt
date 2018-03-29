"use strict";

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const mock = require("mock-require");
const test = require("ava");
const tempfile = require("tempfile");
const template = require("lodash.template");

// Mock clipboard on CI builds
let clipboard = {
	value: ""
};
clipboard.write = val => {
	clipboard.value = val;
	return Promise.resolve();
};
clipboard.read = () => Promise.resolve(clipboard.value);
if (process.env.TRAVISTEST || process.env.APPVEYOR) {
	mock("clipboardy", clipboard);
} else {
	clipboard = require("clipboardy");
}

const ipt = require("../src");
const pkg = require("../package.json");

// Mocked deps
const sep = require("os").EOL;
const cwd = process.cwd();
const helpMessageOutput = fs
	.readFileSync(path.join(__dirname, "fixtures", "help"), { encoding: "utf8" })
	.replace(/\\n/, sep)
	.trim();

// Mocks some context
test.beforeEach(t => {
	const stdin = tempfile();
	const ttyStdin = tempfile();
	fs.writeFileSync(stdin, "");
	fs.writeFileSync(ttyStdin, "");
	t.context.opts = {
		sep,
		stdin: fs.createReadStream(ttyStdin),
		stdout: fs.createWriteStream(tempfile())
	};
	t.context.prompt = {};
});

test.afterEach(t => {
	t.context.p = null;
});

const key = {
	down: [null, { name: "down" }],
	space: [null, { name: "space" }],
	l: ["l"],
	i: ["i"],
	p: ["p"],
	s: ["s"],
	u: ["u"],
	m: ["m"]
};

const unit = ({ input, output, actions = [], opts = {} }) => t => {
	const prompt = ipt(
		input,
		{ ...t.context.opts, ...opts },
		t.context.prompt
	).then(result => {
		t.deepEqual(result, output);
	});
	actions.forEach(i =>
		t.context.prompt.ui.rl.input.emit.apply(
			t.context.prompt.ui.rl.input,
			["keypress"].concat(i)
		)
	);
	const rl =
		actions[0] && actions[0][0]
			? t.context.prompt.ui.rl.input
			: t.context.prompt.ui.rl;
	rl.emit("line");
	return prompt;
};

test(
	"should build and select items from a basic list",
	unit({
		input: `foo${sep}bar`,
		output: ["foo"]
	})
);

test(
	"should build and select an item from a single item list",
	unit({
		input: "foo",
		output: ["foo"],
		actions: [key.down]
	})
);

test("should print error message when encounter problems", t => {
	return t.throws(() => ipt(Buffer.from("jjj"), t.context.opts), TypeError);
});

test(
	"should use separator option to build a basic list",
	unit({
		input: "foo:bar",
		output: ["foo"],
		opts: {
			sep: ":"
		}
	})
);

test(
	"should use weird separator option to build a long list",
	unit({
		input:
			"foo-:™£:-bar-:™£:-lorem-:™£:-ipsum-:™£:-dolor-:™£:-sit-:™£:-amet-:™£:-now",
		output: ["ipsum"],
		actions: [key.down, key.down, key.down],
		opts: {
			sep: "-:™£:-"
		}
	})
);

test(
	"should be able to use multiple items mode and select many",
	unit({
		input: `foo${sep}bar${sep}lorem${sep}ipsum`,
		output: ["foo", "lorem"],
		actions: [key.space, key.down, key.down, key.space],
		opts: {
			multiple: true
		}
	})
);

test(
	"should trim each outputed line",
	unit({
		input: `  foo${sep}  bar${sep}  lorem${sep}  ipsum`,
		output: ["foo", "lorem"],
		actions: [key.space, key.down, key.down, key.space],
		opts: {
			multiple: true
		}
	})
);

test(
	"should not trim result when using option",
	unit({
		input: `  foo${sep}  bar${sep}  lorem${sep}  ipsum`,
		output: ['"  foo"', '"  lorem"'],
		actions: [key.space, key.down, key.down, key.space],
		opts: {
			multiple: true,
			"no-trim": true
		}
	})
);

test(
	"should be able to use autocomplete interface",
	unit({
		input: `foo${sep}bar${sep}lorem${sep}ipsum`,
		output: ["lorem"],
		actions: [key.l],
		opts: {
			autocomplete: true
		}
	})
);

test(
	"should be able to use autocomplete interface case insensitive",
	unit({
		input: `foo${sep}bar${sep}LOREM${sep}ipsum`,
		output: ["LOREM"],
		actions: [key.l],
		opts: {
			autocomplete: true
		}
	})
);

test(
	"should be able to use autocomplete interface typing complete word",
	unit({
		input: `foo${sep}bar${sep}LOREM${sep}ipsum`,
		output: ["ipsum"],
		actions: [key.i, key.p, key.s, key.u, key.m],
		opts: {
			autocomplete: true
		}
	})
);

test(
	"should be able to retrieve a valid path from an input",
	unit({
		input: `?? foo${sep}?? bar${sep}M package.json`,
		output: ["package.json"],
		actions: [key.down, key.down],
		opts: {
			"extract-path": true
		}
	})
);

test(
	"should not be able to retrieve an invalid path from an input",
	unit({
		input: `?? foo${sep}?? bar${sep}M package.json`,
		output: [""],
		opts: {
			"extract-path": true
		}
	})
);

test.serial("should copy selected item to clipboard on --copy option", t => {
	const prompt = ipt(
		`foo${sep}bar`,
		{ ...t.context.opts, copy: true },
		t.context.prompt
	)
		.then(clipboard.read)
		.then(data => {
			t.is(data, "foo");
		});
	t.context.prompt.ui.rl.emit("line");
	return prompt;
});

test.serial(
	"should output correct item when using clipboard",
	unit({
		input: `foo${sep}bar`,
		output: ["foo"],
		opts: {
			copy: true
		}
	})
);

test.serial("should never copy items if copy option is not active", t => {
	return clipboard
		.write("ipt is so cool")
		.then(() => {
			const prompt = ipt(`foo${sep}bar`, t.context.opts, t.context.prompt);
			t.context.prompt.ui.rl.emit("line");
			return prompt;
		})
		.then(() => clipboard.read())
		.then(data => {
			t.is(data, "ipt is so cool");
		});
});

// Disables clipboard cli test on travis
if (!process.env.TRAVISTEST && !process.env.APPVEYOR) {
	test.serial.cb("should copy to clipboard from cli", t => {
		const stdinfile = tempfile();
		const stdin = fs.createWriteStream(stdinfile);
		const runner = exec(
			`node ${path.join("src", "cli.js")} ${path.join(
				"test",
				"fixtures",
				"clipboard"
			)} --stdin-tty=${stdinfile} --copy --unquoted`,
			{ cwd },
			err => {
				if (err) {
					t.fail(err);
					t.end();
				} else {
					clipboard.read().then(data => {
						t.is(data, "ipt is awesome");
						t.end();
					});
				}
			}
		);
		stdin.write(sep);
		runner.stdin.end();
		stdin.end();
	});
}

// --- cli integration tests

const cli = ({ cmd, input = [], output, error }) => t => {
	const stdinfile = tempfile();
	const stdin = fs.createWriteStream(stdinfile);
	const runner = exec(
		template(cmd)({ stdin: stdinfile }),
		{ cwd },
		(err, stdout, stderr) => {
			if (err) {
				t.is(error, stderr.trim());
				t.end();
			} else {
				t.is(output, String(stdout).trim());
				t.end();
			}
		}
	);
	input.forEach(i => stdin.write(i));
	runner.stdin.end();
	stdin.end();
};

test.cb(
	"should be able to pipe data from stdin",
	cli({
		cmd: `echo "banana,peach,apple" | node ${path.join(
			"src",
			"cli.js"
		)} --stdin-tty=<%= stdin %> -s , --debug`,
		input: ["j", sep],
		output: "peach"
	})
);

test.cb(
	"should run in autocomplete mode from cli",
	cli({
		cmd: `node ${path.join("src", "cli.js")} ${path.join(
			"test",
			"fixtures",
			"simpletest"
		)} --stdin-tty=<%= stdin %> -n -a --debug`,
		input: ["l", "o", "r", sep],
		output: "lorem"
	})
);

test.cb(
	"should not quote result args with white space if --unquoted option is given",
	cli({
		cmd: `node ${path.join("src", "cli.js")} "${path.join(
			"test",
			"fixtures",
			"white space"
		)}" --stdin-tty=<%= stdin %> -n --unquoted --debug`,
		input: [sep],
		output: "white space"
	})
);

test.cb(
	"should quote result args with white space",
	cli({
		cmd: `node ${path.join("src", "cli.js")} "${path.join(
			"test",
			"fixtures",
			"white space"
		)}" --stdin-tty=<%= stdin %> n --debug`,
		input: [sep],
		output: '"white space"'
	})
);

test.cb(
	"should display error if provided file is not found",
	cli({
		cmd: `node ${path.join("src", "cli.js")} ${path.join(
			"test",
			"fixtures",
			"inexistentfilename"
		)}`,
		error: "Error reading incoming data"
	})
);

test.cb(
	"should be able to use custom separators with --separator",
	cli({
		cmd: `node ${path.join("src", "cli.js")} ${path.join(
			"test",
			"fixtures",
			"test.csv"
		)} --stdin-tty=<%= stdin %> -n --separator=, --debug`,
		input: ["j", " ", "\n"],
		output: "oranges"
	})
);

test.cb(
	"should display version on --version",
	cli({
		cmd: `node ${path.join("src", "cli.js")} ${path.join(
			"test",
			"fixtures",
			"simpletest"
		)} --stdin-tty=<%= stdin %> -n --version --debug`,
		output: pkg.version.toString()
	})
);

test.cb(
	"should display help message on empty invocation",
	cli({
		cmd: `node ${path.join("src", "cli.js")}`,
		output: helpMessageOutput
	})
);

test.cb(
	"should display help message on --help",
	cli({
		cmd: `node ${path.join("src", "cli.js")} --help`,
		output: helpMessageOutput
	})
);

test.cb(
	"should read utf16 encode using --file-encoding option",
	cli({
		cmd: `node ${path.join("src", "cli.js")} ${path.join(
			"test",
			"fixtures",
			"utf16encode"
		)} --file-encoding=utf16le --stdin-tty=<%= stdin %>`,
		input: [sep],
		output: "lorem"
	})
);

test.cb(
	"should read ascii encode using --file-encoding option",
	cli({
		cmd: `node ${path.join("src", "cli.js")} ${path.join(
			"test",
			"fixtures",
			"asciiencode"
		)} --file-encoding=ascii --stdin-tty=<%= stdin %>`,
		input: [sep],
		output: "foo"
	})
);

test.cb(
	"should run using multiple from cli",
	cli({
		cmd: `node ${path.join("src", "cli.js")} ${path.join(
			"test",
			"fixtures",
			"simpletest"
		)} --stdin-tty=<%= stdin %> -m`,
		input: [" ", "j", "j", " ", sep],
		output: `foo${sep}lorem`
	})
);

test.cb(
	"should run from cli using default platform separator",
	process.platform === "win32"
		? cli({
				cmd: `node ${path.join("src", "cli.js")} ${path.join(
					"test",
					"fixtures",
					"crlf"
				)} --stdin-tty=<%= stdin %>`,
				input: [sep],
				output: "a"
		  })
		: cli({
				cmd: `node ${path.join("src", "cli.js")} ${path.join(
					"test",
					"fixtures",
					"simpletest"
				)} --stdin-tty=<%= stdin %>`,
				input: [sep],
				output: "foo"
		  })
);

test.cb(
	"should get valid paths if using -p option",
	cli({
		cmd: `node ${path.join("src", "cli.js")} ${path.join(
			"test",
			"fixtures",
			"files"
		)} -p --stdin-tty=<%= stdin %>`,
		input: ["k", "\n"],
		output: "README.md"
	})
);
