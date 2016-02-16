'use strict';

// patch stdout to avoid cli-cursor writing hide/show cursor characters
// straight to stdout, we should be able to remove this if we manage
// to change cli-cursor API to accept input/output options
module.exports = function patchCliCursor(p, ttys) {
	var _write;
	if (ttys.stdout !== p.stdout) {
		_write = p.stdout.write;
		p.stdout.write = function (chunk) {
			if (chunk in {
				'\u001b[?25h': 1,
				'\u001b[?25l': 1
			}) {
				try {
					ttys.stdout.write(chunk);
				} catch (e) {}
			} else {
				_write.apply(p.stdout, arguments);
			}
		};
	}
};

