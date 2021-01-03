<div align="center">
	<br>
	<br>
	<br>
	<img width="200" src="https://cdn.rawgit.com/ruyadorno/ipt/master/logo.svg" alt="ipt logo">
	<br>
	<br>
	<br>
</div>

# iPipeTo

[![NPM version](https://badge.fury.io/js/ipt.svg)](https://npmjs.org/package/ipt)
[![Build Status](https://travis-ci.org/ruyadorno/ipt.svg?branch=master)](https://travis-ci.org/ruyadorno/ipt)
[![License](http://img.shields.io/badge/license-MIT-blue.svg?style=flat)](https://raw.githubusercontent.com/ruyadorno/ipt/master/LICENSE)
[![Join the chat at https://gitter.im/ipipeto/Lobby](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/ipipeto/Lobby)

> Interactive Pipe To: The Node.js cli interactive workflow

<br />

## Table of Contents

- [About](#about)
- [News](#newspaper-news)
- [Features](#heart_eyes-Features)
	- [Reads from standard input, prints to standard output](#reads-from-standard-input-prints-to-standard-output)
	- [Select multiple items](#select-multiple-items)
	- [Fuzzysearch (autocomplete mode)](#fuzzysearch-autocomplete-mode)
	- [Extract path from result](#extract-path-from-result)
	- [Input prompt](#input-prompt)
	- [Copy to clipboard](#copy-to-clipboard)
	- [Customization](#customization)
	- [Node.js based](#nodejs-based)
- [Examples](#mag_right-examples)
	- [Using Unix pipes to send selected value to next command](#using-unix-pipes-to-send-selected-value-to-next-command)
	- [Using the multiple choices option](#using-the-multiple-choices-option)
	- [Using file as input data](#using-file-as-input-data)
- [Install](#arrow_down-install)
- [Awesome workflows](#sunrise-awesome-workflows)
- [Help](#help)
- [Supported OS Terminals](#supported-os-terminals)
- [Contributing](#contributing)
- [Alternatives](#alternatives)
- [Roadmap](#roadmap)
- [Credits](#credits)
- [License](#license)

<br />

## About

**ipt** (pronounced iPipeTo) introduces the missing cli interactive workflow. It takes any kind of list as an input and uses that list to build an interactive interface to let you select an element from it.

Stop manually dragging your mouse around to copy output data from a terminal, using the **ipt** workflow you can pipe data from a command and select what to copy to clipboard from a convenient visual menu.

Selected data is also output to _stdout_ allowing for easily composing various workflows - Just create your custom alias!

<br />
<br />

<p align="center">
<img alt="demo animation" width="600" src="https://ruyadorno.github.io/svg-demos/ipt-demos/demo.svg" />
</p>

<br />

## :newspaper: News

- **v3.2.0:**
  - Added `-i` option for arbitrary input prompts
- **v3.1.0:**
  - Added `-o` option for ordered multiple choice selection
- **v2.1.0:**
  - Added `-D` option for defining a pre-selected item in the list
- **v2.0.0:**
  - Added `-p` option for extracting path out of selected items
  - Added `-M` option for customizing interface message
  - Added `-0` option for better null char compatibility
  - Added `-S` option for setting number of lines to be displayed
  - Added a proper programmatic API
- **v1.1.0:** Added autocomplete (or fuzzy finder) mode `ipt -a`

<br />

## :heart_eyes: Features

### Reads from standard input, prints to standard output

**iPipeTo** is inspired by the [Unix Pipeline](https://en.wikipedia.org/wiki/Pipeline_\(Unix\)) and is composable with any command line utility you already use and love.

### Select multiple items

The `-m` or `--multiple` flag allows you to select many items out of the interactive list instead of the standard "pick one" behavior.

### Fuzzysearch (autocomplete mode)

Using `-a` or `--autocomplete` option switchs the behavior of the interactive list to that of a fuzzysearch (or autocomplete) where options are narrowed as you type.

### Extract path from result

A convenient option that helps extract file system path values out of the selected item, very useful when manipulating verbose output. Use `-p` or `--extract-path` options.

### Input prompt

Use the `-i` or `--input` option in order to use **ipt** as a simple input prompt, default values can be set using standard input or the `--default` argument.

### Copy to clipboard

The `-c` or `--copy` option allows you to copy the selected item value to clipboard. Makes for useful workflows where you may need that value somewhere else such as out of the terminal or in a manual command to type later.

### Customization

Customize your workflow by defining the separator to be used to generate the list (`-s` or `--separator` options), a custom message to display on the interactive interface (`-M` or `--message`) and much more. Make sure to take a look at the [Help](#help) section to learn about all the available options.

### Default selected items

Use the `-D` or `--default` option to determine which item(s) should be selected by default on the interactive list. The `-P` or `--default-separator` also allows for a custom char to be used to split these items (similar to `-s` option).

### Node.js based

All you need in order to run **ipt** is the [Node.js](https://nodejs.org/en/) runtime and [npm](https://www.npmjs.com/), if you have those you're already all set!

<br />

## :mag_right: Examples

The default behavior of **ipt** is to allow for the selection of one item from the interactive list, once selected this item will be output to _stdout_, you can also use `-c` option to copy the result to your clipboard.


### Using Unix pipes to send selected value to next command

Here we get a simple list of branchs `git branch -a`, pipe into `ipt` and pipe the selected item value to `git checkout` to checkout into the selected branch. `xargs` is needed to get the data from standard input and read it as an argument.

<br />

<p align="center">
<img alt="`git branch -a | ipt | xargs git checkout` selects a branch name from menu and that branch gets checked out by git" width="600" src="https://ruyadorno.github.io/svg-demos/ipt-demos/git-checkout.svg" />
</p>

<br/>
<br/>

### Using the multiple choices option

In the following example we list all the files from the folder `ls` and pipe that list into `ipt` only that this time we use the "multiple" flag `-m` that allows for selecting multiple items from a list. The selected items get piped to `trash` that deletes them.

<br />

<p align="center">
<img alt="`ls | ipt -m | xargs rm` selects multiple items from the menu and deletes them" width="600" src="https://ruyadorno.github.io/svg-demos/ipt-demos/multiple.svg" />
</p>

<br/>
<br/>

**NOTE:** An ordered multiple choice menu is available when using the `-o` OR `--ordered` option

### Using file as input data

You can also read a file as source of input data instead of reading from the standard input, here we read from a `TODO` file and redirect the selected items to be written in a `DONE` file.

<br />

<p align="center">
<img alt="Selects multiple lines from a file and append them to another one" width="600" src="https://ruyadorno.github.io/svg-demos/ipt-demos/input.svg" />
</p>

<br/>
<br/>

## :arrow_down: Install

Available on **npm**:

```sh
npm install -g ipt
```

_Keep in mind that you'll need the latest **Node.js** LTS installed!_

<br />

## :sunrise: Awesome workflows

Showcases some useful predefined workflow scripts for using **iPipeTo**:

- [ntl](https://github.com/ruyadorno/ntl): Interactive cli menu to list/run npm tasks
- [itrash](https://github.com/ruyadorno/itrash): Selects files to delete from current folder
- [git-iadd](https://github.com/ruyadorno/git-iadd): Interactive staging of selected changed files
- [git-ishow](https://github.com/ruyadorno/git-ishow): Choose one git stash item to show
- [npmlist](https://github.com/hankchanocd/npmlist/tree/master): Fuzzy list everything with npm module

Found an awesome workflow idea? Send us a PR to add it here!

<br />

## Help

```sh

Usage:
  ipt [options] [<path>]

Options:
  -0, --null               Uses a null character as separator          [boolean]
  -a, --autocomplete       Starts in autocomplete mode                 [boolean]
  -c, --copy               Copy selected item(s) to clipboard          [boolean]
  -d, --debug              Prints to stderr any internal error         [boolean]
  -D, --default            Select a default choices by their name       [string]
  -P, --default-separator  Separator element for default items          [string]
  -e, --file-encoding      Encoding for file <path>, defaults to utf8   [string]
  -h, --help               Shows this help message                     [boolean]
  -i, --input              Open an interactive input prompt            [boolean]
  -m, --multiple           Allows the selection of multiple items      [boolean]
  -o, --ordered            Selects multiple items in order             [boolean]
  -M, --message            Replaces interface message                   [string]
  -p, --extract-path       Returns only a valid path for each item     [boolean]
  -s, --separator          Separator to to split input into items       [string]
  -S, --size               Amount of lines to display at once           [number]
  -t, --no-trim            Prevents trimming of the result strings     [boolean]
  -u, --unquoted           Force the output to be unquoted             [boolean]
  -v, --version            Show version number                         [boolean]

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

<br />

## Contributing

**Bug fixes / code changes**: Please provide tests covering your changes, update docs accordingly and keep your changes to a single commit.

<br />

## Alternatives

As in any cool idea, **iPipeTo** is not the only available choice, here are some other cool similar tools found in the wild:

- [percol](https://github.com/mooz/percol)
- [sentaku](https://github.com/rcmdnk/sentaku)
- [pick](https://github.com/calleerlandsson/pick)
- [fzf](https://github.com/junegunn/fzf)
- [PathPicker](https://github.com/facebook/PathPicker)
- [smenu](https://github.com/p-gen/smenu)

<br />

## Roadmap

Are you wondering what can you do or how would you start contributing to iPipeTo's future? Take a look at our [Roadmap document](./ROADMAP.md) to find out about what's planned ahead and what currently needs help.

<br />

## Credits

- The **iPipeTo** logo is a kind contribution from [Bruno Magal](https://www.behance.net/brunomagalhaes)

## License

[MIT](LICENSE) © 2021 [Ruy Adorno](http://ruyadorno.com)
