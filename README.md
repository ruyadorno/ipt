# iPipeTo [![NPM version](https://badge.fury.io/js/ipt.svg)](https://npmjs.org/package/ipt) [![Build Status](https://travis-ci.org/ruyadorno/ipt.svg?branch=master)](https://travis-ci.org/ruyadorno/ipt)

> Interactive Pipe To


## About

**ipt** (pronounced iPipeTo) introduces the missing cli interactive workflow. It takes any kind of list as an input and uses that list to build an interactive interface to let you select an element from it.

Stop manually dragging your mouse around to copy output data from a terminal, using the **ipt** workflow you can pipe data from a command and select what to copy to clipboard from a convenient visual menu.

Selected data is also output to _stdout_ allowing for easily composing various workflows, just create your custom alias.


## Usage

The default behavior of **ipt** is to allow for the selection of one item from the interactive list, once selected this item will be copied to your clipboard and output to _stdout_.

In the example below we show a menu containing the local directories.

```sh
ls | ipt
```

> **ipt** is the DIY kit for interactive interfaces in the command-line, plug whatever you want in, do something fun with the output!


## Awesome workflow Gallery

```sh
# irm: Selects files to delete from current folder (recommended to use trash instead of rm -rf)
alias irebase="ls | ipt -m -n | xargs rm -rf"

# irebase: Interactive build a list of git commits from log and rebase from selected one
alias irebase="git --no-pager log --oneline | ipt -n | cut -d ' ' -f 1 | xargs -o git rebase -i"
```

Got an awesome alias idea? [Send us a PR to add it to our gallery](https://github.com/ruyadorno/ipt/compare?expand=1)


## Install

Install it easily using **npm**:

```sh
$ npm install -g ipt
```


## Help

```sh
Usage:
  ipt [<path>]

Specify a file <path> or pipe some data from stdin to start interacting.

Options:
  -v --version       Displays app version number
  -h --help          Shows this help message
  -d --debug         Prints original node error messages to stderr on errors
  -e --file-encoding Sets a encoding to open <path> file, defaults to utf8
  -m --multiple      Allows the selection of multiple items
  -s --separator     Defines a separator to be used to split input into items
  -n --no-copy       Do not copy selected item(s) to clipboard
```


## Credits

**iPipeTo** wouldn't be possible if not for the amazing [Inquirer.js](https://github.com/SBoudrias/Inquirer.js) that provides all these sweet interactive interfaces.

[![Ruy Adorno](https://avatars.githubusercontent.com/u/220900?v=3&s=460)](http://ruyadorno.com) |
---|
[Ruy Adorno](http://ruyadorno.com) |

## License

MIT © [Ruy Adorno](http://ruyadorno.com)

