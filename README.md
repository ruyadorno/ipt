<div align="center">
	<br>
	<img width="200" src="https://cdn.rawgit.com/ruyadorno/ipt/master/logo.svg" alt="ipt logo">
	<br>
	<br>
	<br>
</div>

# iPipeTo

[![NPM version](https://badge.fury.io/js/ipt.svg)](https://npmjs.org/package/ipt)
[![Build Status](https://travis-ci.org/ruyadorno/ipt.svg?branch=master)](https://travis-ci.org/ruyadorno/ipt)

> Interactive Pipe To: The missing cli interactive workflow

<br />

## Table of Contents

- [About](#about)
- [News](#newspaper-news)
- [Examples](#examples)
	- [Using-pipes-to-send-selected-value-to-next-command](#using-pipes-to-send-selected-value-to-next-command)
	- [Using-the-multiple-choices-option](#using-the-multiple-choices-option)
	- [Using-file-as-input-data](#using-file-as-input-data)
	- [Using-the-copy-to-clipboard-feature](#using-the-copy-to-clipboard-feature)
	- [More](#more)
- [Install](#install)
- [Awesome aliases Gallery](#awesome-aliases-gallery)
- [Setup](#setup)
	- [OSX](#osx)
	- [Linux](#linux)
- [Help](#help)
- [Supported OS Terminals](#supported-os-terminals)
- [Contributing](#contributing)
- [Alternatives](#alternatives)
- [Credits](#credits)
- [License](#license)

<br />

## About

**ipt** (pronounced iPipeTo) introduces the missing cli interactive workflow. It takes any kind of list as an input and uses that list to build an interactive interface to let you select an element from it.

Stop manually dragging your mouse around to copy output data from a terminal, using the **ipt** workflow you can pipe data from a command and select what to copy to clipboard from a convenient visual menu.

Selected data is also output to _stdout_ allowing for easily composing various workflows - Just create your custom alias!


![demo gif](http://i.imgur.com/0tASyP7.gif)

## :newspaper: News

- **v1.1.0:** Added autocomplete (or fuzzy finder) mode `ipt -a`

<br />

## Examples

The default behavior of **ipt** is to allow for the selection of one item from the interactive list, once selected this item will be output to _stdout_, you can also use `-c` option to copy the result to your clipboard.


### Using pipes to send selected value to next command

Here we get a simple list of branchs, pipe into `ipt` and pipe the selected item value to `git checkout` to checkout into the selected branch. `xargs` is needed to get the data from standard input and read it as an argument.

![`git branch -a | ipt | xargs git checkout` selects a branch name from menu and that branch gets checked out by git](http://i.imgur.com/nOPBE4t.gif)


### Using the multiple choices option

In the following example we list all the files from the folder `ls` and pipe that list into `ipt` only that this time we use the "multiple" flag `-m` that allows for selecting multiple items from a list. The selected items get piped to `trash` that deletes them.

![`ls | ipt -m | xargs trash` selects multiple items from the menu and deletes them](http://i.imgur.com/iPYIfPj.gif)


### Using file as input data

You can also read a file as source of input data instead of reading from the standard input, here we read from a TODO file and redirect the selected items to be written in a DONE file.

![`ipt -m TODO >> DONE` selects multiple lines from a file and append them to another one](http://i.imgur.com/9tJSyEi.gif)


### Using the copy to clipboard feature

In the example below we show a menu containing the local directories. The selected choice gets copy to clipboard and we can reuse the selected value later with ctrl/cmd + V.

![`ls | ipt -c` select item from menu and then `cat` followed by `cmd+v`](http://i.imgur.com/rQFtMQY.gif)


---

### More

We just covered some basic examples here, if you want more advanced uses, check our [Gallery](gallery.sh) below.

> **iPipeTo** is the DIY kit for interactive interfaces in the command-line, plug whatever you want in, do something fun with the output!

<br />

## Install

Install it easily using **npm**:

```sh
$ npm install -g ipt
```

_Keep in mind that you'll need the latest **Node.js** LTS installed_

<br />

## [Awesome aliases Gallery](gallery.sh)

Showcases some useful predefined workflow scripts for using **iPipeTo**:

```sh
# irm: Selects files to delete from current folder (recommended to use trash instead of rm -rf)
alias irm="ls | ipt -m | xargs rm -rf"

# irebase: Interactive build a list of git commits from log and rebase from selected one
alias irebase="git --no-pager log --oneline | ipt | cut -d ' ' -f 1 | xargs -o git rebase -i"

# icheckout: Interactive git checkout a commit, similar to irebase
alias icheckout="git --no-pager log --oneline | ipt | cut -d ' ' -f 1 | xargs git checkout"

# iseek: Interactive browse folders, ctrl+c once you're done
function iseek() {
    cd "$(ls -a -d */ .. | ipt)"
    iseek
}

# iadd: Interactive staging of selected changed files (faster than git add --patch)
alias iadd='git status -s | sed s/^...// | ipt -m | xargs git add'

# Choose one git stash to show.
alias ishow="git stash list | ipt --unquoted | cut -d ':' -f 1 | xargs git stash show -u"
```

Got an awesome alias idea? [Send us a PR to add it to our gallery](gallery.sh)

<br />

## Setup

So do you like the previous examples but are not super confident on how to configure these commands? Although I'd really recommend you to take a look at [how to do it yourself](http://askubuntu.com/questions/17536/how-do-i-create-a-permanent-bash-alias), below is a quick script for you to run in your terminal and have all of our [gallery](gallery.sh) scripts at once.


> Do you love all these fancy interactions from the examples above but don't quite follow all this unix jargon? Worry not, in the Awesome Gallery just above we have some common workflow scripts pre configured to be used as simple shell commands. Here's how to get them:

### OSX

```sh
curl -fsSL https://raw.githubusercontent.com/ruyadorno/ipt/master/gallery.sh >> ~/.bash_profile
source ~/.bash_profile
```

### Linux

```sh
curl -fsSL https://raw.githubusercontent.com/ruyadorno/ipt/master/gallery.sh >> ~/.bashrc
source ~/.bashrc
```

<br />

## Help

```sh

Usage:
  ipt [options] [<path>]

Options:
  -a, --autocomplete   Starts in autocomplete mode                     [boolean]
  -c, --copy           Copy selected item(s) to clipboard              [boolean]
  -d, --debug          Prints to stderr any internal error             [boolean]
  -e, --file-encoding  Encoding for file <path>, defaults to utf8       [string]
  -h, --help           Shows this help message                         [boolean]
  -m, --multiple       Allows the selection of multiple items          [boolean]
  -s, --separator      Separator to to split input into items           [string]
  -t, --no-trim        Prevents trimming of the result strings         [boolean]
  -p, --extract-path   Returns only a valid path for each item         [boolean]
  -u, --unquoted       Force the output to be unquoted                 [boolean]
  -v, --version        Show version number                             [boolean]

```

<br />

## Supported OS Terminals

**iPipeTo** should run just fine in any of the [Inquirer.js](https://github.com/SBoudrias/Inquirer.js) supported terminals:

- **Mac OS**:
  - Terminal.app
  - iTerm
- **Linux (Ubuntu, openSUSE, Arch Linux, etc)**:
  - gnome-terminal (Terminal GNOME)
  - konsole
- **Windows**\*:
  - cmd.exe
  - Powershell
  - Cygwin

_\* Feedback wanted to confirm which features are available on a Windows cli_

<br />

## Contributing

**Bug fixes / code changes**: Please provide tests covering your changes, update docs accordingly and keep your changes to a single commit.

<br />

## Alternatives

As in any cool idea, iPipeTo is not the only available choice, here are some other cool implementations found in the wild:

- [percol](https://github.com/mooz/percol) (python)
- [sentaku](https://github.com/rcmdnk/sentaku) (shell script)
- [pick](https://github.com/calleerlandsson/pick) (c)
- [fzf](https://github.com/junegunn/fzf) (golang)
- [PathPicker](https://github.com/facebook/PathPicker) (python)

<br />

## Credits

- **iPipeTo** wouldn't be possible if not for the amazing [Inquirer.js](https://github.com/SBoudrias/Inquirer.js) that provides all these sweet interactive interfaces.

- The **iPipeTo** logo is a kind contribution from [Bruno Magal](http://brunomagal.com/)

## License

[MIT](LICENSE) © 2018 [Ruy Adorno](http://ruyadorno.com)
