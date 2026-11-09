#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/commander/lib/error.js
var require_error = __commonJS({
  "node_modules/commander/lib/error.js"(exports2) {
    var CommanderError2 = class extends Error {
      /**
       * Constructs the CommanderError class
       * @param {number} exitCode suggested exit code which could be used with process.exit
       * @param {string} code an id string representing the error
       * @param {string} message human-readable description of the error
       */
      constructor(exitCode, code, message) {
        super(message);
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
        this.code = code;
        this.exitCode = exitCode;
        this.nestedError = void 0;
      }
    };
    var InvalidArgumentError2 = class extends CommanderError2 {
      /**
       * Constructs the InvalidArgumentError class
       * @param {string} [message] explanation of why argument is invalid
       */
      constructor(message) {
        super(1, "commander.invalidArgument", message);
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
      }
    };
    exports2.CommanderError = CommanderError2;
    exports2.InvalidArgumentError = InvalidArgumentError2;
  }
});

// node_modules/commander/lib/argument.js
var require_argument = __commonJS({
  "node_modules/commander/lib/argument.js"(exports2) {
    var { InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var Argument2 = class {
      /**
       * Initialize a new command argument with the given name and description.
       * The default is that the argument is required, and you can explicitly
       * indicate this with <> around the name. Put [] around the name for an optional argument.
       *
       * @param {string} name
       * @param {string} [description]
       */
      constructor(name, description) {
        this.description = description || "";
        this.variadic = false;
        this.parseArg = void 0;
        this.defaultValue = void 0;
        this.defaultValueDescription = void 0;
        this.argChoices = void 0;
        switch (name[0]) {
          case "<":
            this.required = true;
            this._name = name.slice(1, -1);
            break;
          case "[":
            this.required = false;
            this._name = name.slice(1, -1);
            break;
          default:
            this.required = true;
            this._name = name;
            break;
        }
        if (this._name.length > 3 && this._name.slice(-3) === "...") {
          this.variadic = true;
          this._name = this._name.slice(0, -3);
        }
      }
      /**
       * Return argument name.
       *
       * @return {string}
       */
      name() {
        return this._name;
      }
      /**
       * @package
       */
      _concatValue(value, previous) {
        if (previous === this.defaultValue || !Array.isArray(previous)) {
          return [value];
        }
        return previous.concat(value);
      }
      /**
       * Set the default value, and optionally supply the description to be displayed in the help.
       *
       * @param {*} value
       * @param {string} [description]
       * @return {Argument}
       */
      default(value, description) {
        this.defaultValue = value;
        this.defaultValueDescription = description;
        return this;
      }
      /**
       * Set the custom handler for processing CLI command arguments into argument values.
       *
       * @param {Function} [fn]
       * @return {Argument}
       */
      argParser(fn) {
        this.parseArg = fn;
        return this;
      }
      /**
       * Only allow argument value to be one of choices.
       *
       * @param {string[]} values
       * @return {Argument}
       */
      choices(values) {
        this.argChoices = values.slice();
        this.parseArg = (arg, previous) => {
          if (!this.argChoices.includes(arg)) {
            throw new InvalidArgumentError2(
              `Allowed choices are ${this.argChoices.join(", ")}.`
            );
          }
          if (this.variadic) {
            return this._concatValue(arg, previous);
          }
          return arg;
        };
        return this;
      }
      /**
       * Make argument required.
       *
       * @returns {Argument}
       */
      argRequired() {
        this.required = true;
        return this;
      }
      /**
       * Make argument optional.
       *
       * @returns {Argument}
       */
      argOptional() {
        this.required = false;
        return this;
      }
    };
    function humanReadableArgName(arg) {
      const nameOutput = arg.name() + (arg.variadic === true ? "..." : "");
      return arg.required ? "<" + nameOutput + ">" : "[" + nameOutput + "]";
    }
    exports2.Argument = Argument2;
    exports2.humanReadableArgName = humanReadableArgName;
  }
});

// node_modules/commander/lib/help.js
var require_help = __commonJS({
  "node_modules/commander/lib/help.js"(exports2) {
    var { humanReadableArgName } = require_argument();
    var Help2 = class {
      constructor() {
        this.helpWidth = void 0;
        this.sortSubcommands = false;
        this.sortOptions = false;
        this.showGlobalOptions = false;
      }
      /**
       * Get an array of the visible subcommands. Includes a placeholder for the implicit help command, if there is one.
       *
       * @param {Command} cmd
       * @returns {Command[]}
       */
      visibleCommands(cmd) {
        const visibleCommands = cmd.commands.filter((cmd2) => !cmd2._hidden);
        const helpCommand = cmd._getHelpCommand();
        if (helpCommand && !helpCommand._hidden) {
          visibleCommands.push(helpCommand);
        }
        if (this.sortSubcommands) {
          visibleCommands.sort((a, b) => {
            return a.name().localeCompare(b.name());
          });
        }
        return visibleCommands;
      }
      /**
       * Compare options for sort.
       *
       * @param {Option} a
       * @param {Option} b
       * @returns {number}
       */
      compareOptions(a, b) {
        const getSortKey = (option) => {
          return option.short ? option.short.replace(/^-/, "") : option.long.replace(/^--/, "");
        };
        return getSortKey(a).localeCompare(getSortKey(b));
      }
      /**
       * Get an array of the visible options. Includes a placeholder for the implicit help option, if there is one.
       *
       * @param {Command} cmd
       * @returns {Option[]}
       */
      visibleOptions(cmd) {
        const visibleOptions = cmd.options.filter((option) => !option.hidden);
        const helpOption = cmd._getHelpOption();
        if (helpOption && !helpOption.hidden) {
          const removeShort = helpOption.short && cmd._findOption(helpOption.short);
          const removeLong = helpOption.long && cmd._findOption(helpOption.long);
          if (!removeShort && !removeLong) {
            visibleOptions.push(helpOption);
          } else if (helpOption.long && !removeLong) {
            visibleOptions.push(
              cmd.createOption(helpOption.long, helpOption.description)
            );
          } else if (helpOption.short && !removeShort) {
            visibleOptions.push(
              cmd.createOption(helpOption.short, helpOption.description)
            );
          }
        }
        if (this.sortOptions) {
          visibleOptions.sort(this.compareOptions);
        }
        return visibleOptions;
      }
      /**
       * Get an array of the visible global options. (Not including help.)
       *
       * @param {Command} cmd
       * @returns {Option[]}
       */
      visibleGlobalOptions(cmd) {
        if (!this.showGlobalOptions)
          return [];
        const globalOptions = [];
        for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
          const visibleOptions = ancestorCmd.options.filter(
            (option) => !option.hidden
          );
          globalOptions.push(...visibleOptions);
        }
        if (this.sortOptions) {
          globalOptions.sort(this.compareOptions);
        }
        return globalOptions;
      }
      /**
       * Get an array of the arguments if any have a description.
       *
       * @param {Command} cmd
       * @returns {Argument[]}
       */
      visibleArguments(cmd) {
        if (cmd._argsDescription) {
          cmd.registeredArguments.forEach((argument) => {
            argument.description = argument.description || cmd._argsDescription[argument.name()] || "";
          });
        }
        if (cmd.registeredArguments.find((argument) => argument.description)) {
          return cmd.registeredArguments;
        }
        return [];
      }
      /**
       * Get the command term to show in the list of subcommands.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      subcommandTerm(cmd) {
        const args = cmd.registeredArguments.map((arg) => humanReadableArgName(arg)).join(" ");
        return cmd._name + (cmd._aliases[0] ? "|" + cmd._aliases[0] : "") + (cmd.options.length ? " [options]" : "") + // simplistic check for non-help option
        (args ? " " + args : "");
      }
      /**
       * Get the option term to show in the list of options.
       *
       * @param {Option} option
       * @returns {string}
       */
      optionTerm(option) {
        return option.flags;
      }
      /**
       * Get the argument term to show in the list of arguments.
       *
       * @param {Argument} argument
       * @returns {string}
       */
      argumentTerm(argument) {
        return argument.name();
      }
      /**
       * Get the longest command term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestSubcommandTermLength(cmd, helper) {
        return helper.visibleCommands(cmd).reduce((max, command) => {
          return Math.max(max, helper.subcommandTerm(command).length);
        }, 0);
      }
      /**
       * Get the longest option term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestOptionTermLength(cmd, helper) {
        return helper.visibleOptions(cmd).reduce((max, option) => {
          return Math.max(max, helper.optionTerm(option).length);
        }, 0);
      }
      /**
       * Get the longest global option term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestGlobalOptionTermLength(cmd, helper) {
        return helper.visibleGlobalOptions(cmd).reduce((max, option) => {
          return Math.max(max, helper.optionTerm(option).length);
        }, 0);
      }
      /**
       * Get the longest argument term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestArgumentTermLength(cmd, helper) {
        return helper.visibleArguments(cmd).reduce((max, argument) => {
          return Math.max(max, helper.argumentTerm(argument).length);
        }, 0);
      }
      /**
       * Get the command usage to be displayed at the top of the built-in help.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      commandUsage(cmd) {
        let cmdName = cmd._name;
        if (cmd._aliases[0]) {
          cmdName = cmdName + "|" + cmd._aliases[0];
        }
        let ancestorCmdNames = "";
        for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
          ancestorCmdNames = ancestorCmd.name() + " " + ancestorCmdNames;
        }
        return ancestorCmdNames + cmdName + " " + cmd.usage();
      }
      /**
       * Get the description for the command.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      commandDescription(cmd) {
        return cmd.description();
      }
      /**
       * Get the subcommand summary to show in the list of subcommands.
       * (Fallback to description for backwards compatibility.)
       *
       * @param {Command} cmd
       * @returns {string}
       */
      subcommandDescription(cmd) {
        return cmd.summary() || cmd.description();
      }
      /**
       * Get the option description to show in the list of options.
       *
       * @param {Option} option
       * @return {string}
       */
      optionDescription(option) {
        const extraInfo = [];
        if (option.argChoices) {
          extraInfo.push(
            // use stringify to match the display of the default value
            `choices: ${option.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`
          );
        }
        if (option.defaultValue !== void 0) {
          const showDefault = option.required || option.optional || option.isBoolean() && typeof option.defaultValue === "boolean";
          if (showDefault) {
            extraInfo.push(
              `default: ${option.defaultValueDescription || JSON.stringify(option.defaultValue)}`
            );
          }
        }
        if (option.presetArg !== void 0 && option.optional) {
          extraInfo.push(`preset: ${JSON.stringify(option.presetArg)}`);
        }
        if (option.envVar !== void 0) {
          extraInfo.push(`env: ${option.envVar}`);
        }
        if (extraInfo.length > 0) {
          return `${option.description} (${extraInfo.join(", ")})`;
        }
        return option.description;
      }
      /**
       * Get the argument description to show in the list of arguments.
       *
       * @param {Argument} argument
       * @return {string}
       */
      argumentDescription(argument) {
        const extraInfo = [];
        if (argument.argChoices) {
          extraInfo.push(
            // use stringify to match the display of the default value
            `choices: ${argument.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`
          );
        }
        if (argument.defaultValue !== void 0) {
          extraInfo.push(
            `default: ${argument.defaultValueDescription || JSON.stringify(argument.defaultValue)}`
          );
        }
        if (extraInfo.length > 0) {
          const extraDescripton = `(${extraInfo.join(", ")})`;
          if (argument.description) {
            return `${argument.description} ${extraDescripton}`;
          }
          return extraDescripton;
        }
        return argument.description;
      }
      /**
       * Generate the built-in help text.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {string}
       */
      formatHelp(cmd, helper) {
        const termWidth = helper.padWidth(cmd, helper);
        const helpWidth = helper.helpWidth || 80;
        const itemIndentWidth = 2;
        const itemSeparatorWidth = 2;
        function formatItem(term, description) {
          if (description) {
            const fullText = `${term.padEnd(termWidth + itemSeparatorWidth)}${description}`;
            return helper.wrap(
              fullText,
              helpWidth - itemIndentWidth,
              termWidth + itemSeparatorWidth
            );
          }
          return term;
        }
        function formatList(textArray) {
          return textArray.join("\n").replace(/^/gm, " ".repeat(itemIndentWidth));
        }
        let output = [`Usage: ${helper.commandUsage(cmd)}`, ""];
        const commandDescription = helper.commandDescription(cmd);
        if (commandDescription.length > 0) {
          output = output.concat([
            helper.wrap(commandDescription, helpWidth, 0),
            ""
          ]);
        }
        const argumentList = helper.visibleArguments(cmd).map((argument) => {
          return formatItem(
            helper.argumentTerm(argument),
            helper.argumentDescription(argument)
          );
        });
        if (argumentList.length > 0) {
          output = output.concat(["Arguments:", formatList(argumentList), ""]);
        }
        const optionList = helper.visibleOptions(cmd).map((option) => {
          return formatItem(
            helper.optionTerm(option),
            helper.optionDescription(option)
          );
        });
        if (optionList.length > 0) {
          output = output.concat(["Options:", formatList(optionList), ""]);
        }
        if (this.showGlobalOptions) {
          const globalOptionList = helper.visibleGlobalOptions(cmd).map((option) => {
            return formatItem(
              helper.optionTerm(option),
              helper.optionDescription(option)
            );
          });
          if (globalOptionList.length > 0) {
            output = output.concat([
              "Global Options:",
              formatList(globalOptionList),
              ""
            ]);
          }
        }
        const commandList = helper.visibleCommands(cmd).map((cmd2) => {
          return formatItem(
            helper.subcommandTerm(cmd2),
            helper.subcommandDescription(cmd2)
          );
        });
        if (commandList.length > 0) {
          output = output.concat(["Commands:", formatList(commandList), ""]);
        }
        return output.join("\n");
      }
      /**
       * Calculate the pad width from the maximum term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      padWidth(cmd, helper) {
        return Math.max(
          helper.longestOptionTermLength(cmd, helper),
          helper.longestGlobalOptionTermLength(cmd, helper),
          helper.longestSubcommandTermLength(cmd, helper),
          helper.longestArgumentTermLength(cmd, helper)
        );
      }
      /**
       * Wrap the given string to width characters per line, with lines after the first indented.
       * Do not wrap if insufficient room for wrapping (minColumnWidth), or string is manually formatted.
       *
       * @param {string} str
       * @param {number} width
       * @param {number} indent
       * @param {number} [minColumnWidth=40]
       * @return {string}
       *
       */
      wrap(str, width, indent, minColumnWidth = 40) {
        const indents = " \\f\\t\\v\xA0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF";
        const manualIndent = new RegExp(`[\\n][${indents}]+`);
        if (str.match(manualIndent))
          return str;
        const columnWidth = width - indent;
        if (columnWidth < minColumnWidth)
          return str;
        const leadingStr = str.slice(0, indent);
        const columnText = str.slice(indent).replace("\r\n", "\n");
        const indentString = " ".repeat(indent);
        const zeroWidthSpace = "\u200B";
        const breaks = `\\s${zeroWidthSpace}`;
        const regex = new RegExp(
          `
|.{1,${columnWidth - 1}}([${breaks}]|$)|[^${breaks}]+?([${breaks}]|$)`,
          "g"
        );
        const lines = columnText.match(regex) || [];
        return leadingStr + lines.map((line, i) => {
          if (line === "\n")
            return "";
          return (i > 0 ? indentString : "") + line.trimEnd();
        }).join("\n");
      }
    };
    exports2.Help = Help2;
  }
});

// node_modules/commander/lib/option.js
var require_option = __commonJS({
  "node_modules/commander/lib/option.js"(exports2) {
    var { InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var Option2 = class {
      /**
       * Initialize a new `Option` with the given `flags` and `description`.
       *
       * @param {string} flags
       * @param {string} [description]
       */
      constructor(flags, description) {
        this.flags = flags;
        this.description = description || "";
        this.required = flags.includes("<");
        this.optional = flags.includes("[");
        this.variadic = /\w\.\.\.[>\]]$/.test(flags);
        this.mandatory = false;
        const optionFlags = splitOptionFlags(flags);
        this.short = optionFlags.shortFlag;
        this.long = optionFlags.longFlag;
        this.negate = false;
        if (this.long) {
          this.negate = this.long.startsWith("--no-");
        }
        this.defaultValue = void 0;
        this.defaultValueDescription = void 0;
        this.presetArg = void 0;
        this.envVar = void 0;
        this.parseArg = void 0;
        this.hidden = false;
        this.argChoices = void 0;
        this.conflictsWith = [];
        this.implied = void 0;
      }
      /**
       * Set the default value, and optionally supply the description to be displayed in the help.
       *
       * @param {*} value
       * @param {string} [description]
       * @return {Option}
       */
      default(value, description) {
        this.defaultValue = value;
        this.defaultValueDescription = description;
        return this;
      }
      /**
       * Preset to use when option used without option-argument, especially optional but also boolean and negated.
       * The custom processing (parseArg) is called.
       *
       * @example
       * new Option('--color').default('GREYSCALE').preset('RGB');
       * new Option('--donate [amount]').preset('20').argParser(parseFloat);
       *
       * @param {*} arg
       * @return {Option}
       */
      preset(arg) {
        this.presetArg = arg;
        return this;
      }
      /**
       * Add option name(s) that conflict with this option.
       * An error will be displayed if conflicting options are found during parsing.
       *
       * @example
       * new Option('--rgb').conflicts('cmyk');
       * new Option('--js').conflicts(['ts', 'jsx']);
       *
       * @param {(string | string[])} names
       * @return {Option}
       */
      conflicts(names) {
        this.conflictsWith = this.conflictsWith.concat(names);
        return this;
      }
      /**
       * Specify implied option values for when this option is set and the implied options are not.
       *
       * The custom processing (parseArg) is not called on the implied values.
       *
       * @example
       * program
       *   .addOption(new Option('--log', 'write logging information to file'))
       *   .addOption(new Option('--trace', 'log extra details').implies({ log: 'trace.txt' }));
       *
       * @param {object} impliedOptionValues
       * @return {Option}
       */
      implies(impliedOptionValues) {
        let newImplied = impliedOptionValues;
        if (typeof impliedOptionValues === "string") {
          newImplied = { [impliedOptionValues]: true };
        }
        this.implied = Object.assign(this.implied || {}, newImplied);
        return this;
      }
      /**
       * Set environment variable to check for option value.
       *
       * An environment variable is only used if when processed the current option value is
       * undefined, or the source of the current value is 'default' or 'config' or 'env'.
       *
       * @param {string} name
       * @return {Option}
       */
      env(name) {
        this.envVar = name;
        return this;
      }
      /**
       * Set the custom handler for processing CLI option arguments into option values.
       *
       * @param {Function} [fn]
       * @return {Option}
       */
      argParser(fn) {
        this.parseArg = fn;
        return this;
      }
      /**
       * Whether the option is mandatory and must have a value after parsing.
       *
       * @param {boolean} [mandatory=true]
       * @return {Option}
       */
      makeOptionMandatory(mandatory = true) {
        this.mandatory = !!mandatory;
        return this;
      }
      /**
       * Hide option in help.
       *
       * @param {boolean} [hide=true]
       * @return {Option}
       */
      hideHelp(hide = true) {
        this.hidden = !!hide;
        return this;
      }
      /**
       * @package
       */
      _concatValue(value, previous) {
        if (previous === this.defaultValue || !Array.isArray(previous)) {
          return [value];
        }
        return previous.concat(value);
      }
      /**
       * Only allow option value to be one of choices.
       *
       * @param {string[]} values
       * @return {Option}
       */
      choices(values) {
        this.argChoices = values.slice();
        this.parseArg = (arg, previous) => {
          if (!this.argChoices.includes(arg)) {
            throw new InvalidArgumentError2(
              `Allowed choices are ${this.argChoices.join(", ")}.`
            );
          }
          if (this.variadic) {
            return this._concatValue(arg, previous);
          }
          return arg;
        };
        return this;
      }
      /**
       * Return option name.
       *
       * @return {string}
       */
      name() {
        if (this.long) {
          return this.long.replace(/^--/, "");
        }
        return this.short.replace(/^-/, "");
      }
      /**
       * Return option name, in a camelcase format that can be used
       * as a object attribute key.
       *
       * @return {string}
       */
      attributeName() {
        return camelcase(this.name().replace(/^no-/, ""));
      }
      /**
       * Check if `arg` matches the short or long flag.
       *
       * @param {string} arg
       * @return {boolean}
       * @package
       */
      is(arg) {
        return this.short === arg || this.long === arg;
      }
      /**
       * Return whether a boolean option.
       *
       * Options are one of boolean, negated, required argument, or optional argument.
       *
       * @return {boolean}
       * @package
       */
      isBoolean() {
        return !this.required && !this.optional && !this.negate;
      }
    };
    var DualOptions = class {
      /**
       * @param {Option[]} options
       */
      constructor(options) {
        this.positiveOptions = /* @__PURE__ */ new Map();
        this.negativeOptions = /* @__PURE__ */ new Map();
        this.dualOptions = /* @__PURE__ */ new Set();
        options.forEach((option) => {
          if (option.negate) {
            this.negativeOptions.set(option.attributeName(), option);
          } else {
            this.positiveOptions.set(option.attributeName(), option);
          }
        });
        this.negativeOptions.forEach((value, key) => {
          if (this.positiveOptions.has(key)) {
            this.dualOptions.add(key);
          }
        });
      }
      /**
       * Did the value come from the option, and not from possible matching dual option?
       *
       * @param {*} value
       * @param {Option} option
       * @returns {boolean}
       */
      valueFromOption(value, option) {
        const optionKey = option.attributeName();
        if (!this.dualOptions.has(optionKey))
          return true;
        const preset = this.negativeOptions.get(optionKey).presetArg;
        const negativeValue = preset !== void 0 ? preset : false;
        return option.negate === (negativeValue === value);
      }
    };
    function camelcase(str) {
      return str.split("-").reduce((str2, word) => {
        return str2 + word[0].toUpperCase() + word.slice(1);
      });
    }
    function splitOptionFlags(flags) {
      let shortFlag;
      let longFlag;
      const flagParts = flags.split(/[ |,]+/);
      if (flagParts.length > 1 && !/^[[<]/.test(flagParts[1]))
        shortFlag = flagParts.shift();
      longFlag = flagParts.shift();
      if (!shortFlag && /^-[^-]$/.test(longFlag)) {
        shortFlag = longFlag;
        longFlag = void 0;
      }
      return { shortFlag, longFlag };
    }
    exports2.Option = Option2;
    exports2.DualOptions = DualOptions;
  }
});

// node_modules/commander/lib/suggestSimilar.js
var require_suggestSimilar = __commonJS({
  "node_modules/commander/lib/suggestSimilar.js"(exports2) {
    var maxDistance = 3;
    function editDistance(a, b) {
      if (Math.abs(a.length - b.length) > maxDistance)
        return Math.max(a.length, b.length);
      const d = [];
      for (let i = 0; i <= a.length; i++) {
        d[i] = [i];
      }
      for (let j = 0; j <= b.length; j++) {
        d[0][j] = j;
      }
      for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
          let cost = 1;
          if (a[i - 1] === b[j - 1]) {
            cost = 0;
          } else {
            cost = 1;
          }
          d[i][j] = Math.min(
            d[i - 1][j] + 1,
            // deletion
            d[i][j - 1] + 1,
            // insertion
            d[i - 1][j - 1] + cost
            // substitution
          );
          if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
            d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
          }
        }
      }
      return d[a.length][b.length];
    }
    function suggestSimilar(word, candidates) {
      if (!candidates || candidates.length === 0)
        return "";
      candidates = Array.from(new Set(candidates));
      const searchingOptions = word.startsWith("--");
      if (searchingOptions) {
        word = word.slice(2);
        candidates = candidates.map((candidate) => candidate.slice(2));
      }
      let similar = [];
      let bestDistance = maxDistance;
      const minSimilarity = 0.4;
      candidates.forEach((candidate) => {
        if (candidate.length <= 1)
          return;
        const distance = editDistance(word, candidate);
        const length = Math.max(word.length, candidate.length);
        const similarity = (length - distance) / length;
        if (similarity > minSimilarity) {
          if (distance < bestDistance) {
            bestDistance = distance;
            similar = [candidate];
          } else if (distance === bestDistance) {
            similar.push(candidate);
          }
        }
      });
      similar.sort((a, b) => a.localeCompare(b));
      if (searchingOptions) {
        similar = similar.map((candidate) => `--${candidate}`);
      }
      if (similar.length > 1) {
        return `
(Did you mean one of ${similar.join(", ")}?)`;
      }
      if (similar.length === 1) {
        return `
(Did you mean ${similar[0]}?)`;
      }
      return "";
    }
    exports2.suggestSimilar = suggestSimilar;
  }
});

// node_modules/commander/lib/command.js
var require_command = __commonJS({
  "node_modules/commander/lib/command.js"(exports2) {
    var EventEmitter = require("node:events").EventEmitter;
    var childProcess = require("node:child_process");
    var path = require("node:path");
    var fs = require("node:fs");
    var process2 = require("node:process");
    var { Argument: Argument2, humanReadableArgName } = require_argument();
    var { CommanderError: CommanderError2 } = require_error();
    var { Help: Help2 } = require_help();
    var { Option: Option2, DualOptions } = require_option();
    var { suggestSimilar } = require_suggestSimilar();
    var Command2 = class _Command extends EventEmitter {
      /**
       * Initialize a new `Command`.
       *
       * @param {string} [name]
       */
      constructor(name) {
        super();
        this.commands = [];
        this.options = [];
        this.parent = null;
        this._allowUnknownOption = false;
        this._allowExcessArguments = true;
        this.registeredArguments = [];
        this._args = this.registeredArguments;
        this.args = [];
        this.rawArgs = [];
        this.processedArgs = [];
        this._scriptPath = null;
        this._name = name || "";
        this._optionValues = {};
        this._optionValueSources = {};
        this._storeOptionsAsProperties = false;
        this._actionHandler = null;
        this._executableHandler = false;
        this._executableFile = null;
        this._executableDir = null;
        this._defaultCommandName = null;
        this._exitCallback = null;
        this._aliases = [];
        this._combineFlagAndOptionalValue = true;
        this._description = "";
        this._summary = "";
        this._argsDescription = void 0;
        this._enablePositionalOptions = false;
        this._passThroughOptions = false;
        this._lifeCycleHooks = {};
        this._showHelpAfterError = false;
        this._showSuggestionAfterError = true;
        this._outputConfiguration = {
          writeOut: (str) => process2.stdout.write(str),
          writeErr: (str) => process2.stderr.write(str),
          getOutHelpWidth: () => process2.stdout.isTTY ? process2.stdout.columns : void 0,
          getErrHelpWidth: () => process2.stderr.isTTY ? process2.stderr.columns : void 0,
          outputError: (str, write) => write(str)
        };
        this._hidden = false;
        this._helpOption = void 0;
        this._addImplicitHelpCommand = void 0;
        this._helpCommand = void 0;
        this._helpConfiguration = {};
      }
      /**
       * Copy settings that are useful to have in common across root command and subcommands.
       *
       * (Used internally when adding a command using `.command()` so subcommands inherit parent settings.)
       *
       * @param {Command} sourceCommand
       * @return {Command} `this` command for chaining
       */
      copyInheritedSettings(sourceCommand) {
        this._outputConfiguration = sourceCommand._outputConfiguration;
        this._helpOption = sourceCommand._helpOption;
        this._helpCommand = sourceCommand._helpCommand;
        this._helpConfiguration = sourceCommand._helpConfiguration;
        this._exitCallback = sourceCommand._exitCallback;
        this._storeOptionsAsProperties = sourceCommand._storeOptionsAsProperties;
        this._combineFlagAndOptionalValue = sourceCommand._combineFlagAndOptionalValue;
        this._allowExcessArguments = sourceCommand._allowExcessArguments;
        this._enablePositionalOptions = sourceCommand._enablePositionalOptions;
        this._showHelpAfterError = sourceCommand._showHelpAfterError;
        this._showSuggestionAfterError = sourceCommand._showSuggestionAfterError;
        return this;
      }
      /**
       * @returns {Command[]}
       * @private
       */
      _getCommandAndAncestors() {
        const result = [];
        for (let command = this; command; command = command.parent) {
          result.push(command);
        }
        return result;
      }
      /**
       * Define a command.
       *
       * There are two styles of command: pay attention to where to put the description.
       *
       * @example
       * // Command implemented using action handler (description is supplied separately to `.command`)
       * program
       *   .command('clone <source> [destination]')
       *   .description('clone a repository into a newly created directory')
       *   .action((source, destination) => {
       *     console.log('clone command called');
       *   });
       *
       * // Command implemented using separate executable file (description is second parameter to `.command`)
       * program
       *   .command('start <service>', 'start named service')
       *   .command('stop [service]', 'stop named service, or all if no name supplied');
       *
       * @param {string} nameAndArgs - command name and arguments, args are `<required>` or `[optional]` and last may also be `variadic...`
       * @param {(object | string)} [actionOptsOrExecDesc] - configuration options (for action), or description (for executable)
       * @param {object} [execOpts] - configuration options (for executable)
       * @return {Command} returns new command for action handler, or `this` for executable command
       */
      command(nameAndArgs, actionOptsOrExecDesc, execOpts) {
        let desc = actionOptsOrExecDesc;
        let opts = execOpts;
        if (typeof desc === "object" && desc !== null) {
          opts = desc;
          desc = null;
        }
        opts = opts || {};
        const [, name, args] = nameAndArgs.match(/([^ ]+) *(.*)/);
        const cmd = this.createCommand(name);
        if (desc) {
          cmd.description(desc);
          cmd._executableHandler = true;
        }
        if (opts.isDefault)
          this._defaultCommandName = cmd._name;
        cmd._hidden = !!(opts.noHelp || opts.hidden);
        cmd._executableFile = opts.executableFile || null;
        if (args)
          cmd.arguments(args);
        this._registerCommand(cmd);
        cmd.parent = this;
        cmd.copyInheritedSettings(this);
        if (desc)
          return this;
        return cmd;
      }
      /**
       * Factory routine to create a new unattached command.
       *
       * See .command() for creating an attached subcommand, which uses this routine to
       * create the command. You can override createCommand to customise subcommands.
       *
       * @param {string} [name]
       * @return {Command} new command
       */
      createCommand(name) {
        return new _Command(name);
      }
      /**
       * You can customise the help with a subclass of Help by overriding createHelp,
       * or by overriding Help properties using configureHelp().
       *
       * @return {Help}
       */
      createHelp() {
        return Object.assign(new Help2(), this.configureHelp());
      }
      /**
       * You can customise the help by overriding Help properties using configureHelp(),
       * or with a subclass of Help by overriding createHelp().
       *
       * @param {object} [configuration] - configuration options
       * @return {(Command | object)} `this` command for chaining, or stored configuration
       */
      configureHelp(configuration) {
        if (configuration === void 0)
          return this._helpConfiguration;
        this._helpConfiguration = configuration;
        return this;
      }
      /**
       * The default output goes to stdout and stderr. You can customise this for special
       * applications. You can also customise the display of errors by overriding outputError.
       *
       * The configuration properties are all functions:
       *
       *     // functions to change where being written, stdout and stderr
       *     writeOut(str)
       *     writeErr(str)
       *     // matching functions to specify width for wrapping help
       *     getOutHelpWidth()
       *     getErrHelpWidth()
       *     // functions based on what is being written out
       *     outputError(str, write) // used for displaying errors, and not used for displaying help
       *
       * @param {object} [configuration] - configuration options
       * @return {(Command | object)} `this` command for chaining, or stored configuration
       */
      configureOutput(configuration) {
        if (configuration === void 0)
          return this._outputConfiguration;
        Object.assign(this._outputConfiguration, configuration);
        return this;
      }
      /**
       * Display the help or a custom message after an error occurs.
       *
       * @param {(boolean|string)} [displayHelp]
       * @return {Command} `this` command for chaining
       */
      showHelpAfterError(displayHelp = true) {
        if (typeof displayHelp !== "string")
          displayHelp = !!displayHelp;
        this._showHelpAfterError = displayHelp;
        return this;
      }
      /**
       * Display suggestion of similar commands for unknown commands, or options for unknown options.
       *
       * @param {boolean} [displaySuggestion]
       * @return {Command} `this` command for chaining
       */
      showSuggestionAfterError(displaySuggestion = true) {
        this._showSuggestionAfterError = !!displaySuggestion;
        return this;
      }
      /**
       * Add a prepared subcommand.
       *
       * See .command() for creating an attached subcommand which inherits settings from its parent.
       *
       * @param {Command} cmd - new subcommand
       * @param {object} [opts] - configuration options
       * @return {Command} `this` command for chaining
       */
      addCommand(cmd, opts) {
        if (!cmd._name) {
          throw new Error(`Command passed to .addCommand() must have a name
- specify the name in Command constructor or using .name()`);
        }
        opts = opts || {};
        if (opts.isDefault)
          this._defaultCommandName = cmd._name;
        if (opts.noHelp || opts.hidden)
          cmd._hidden = true;
        this._registerCommand(cmd);
        cmd.parent = this;
        cmd._checkForBrokenPassThrough();
        return this;
      }
      /**
       * Factory routine to create a new unattached argument.
       *
       * See .argument() for creating an attached argument, which uses this routine to
       * create the argument. You can override createArgument to return a custom argument.
       *
       * @param {string} name
       * @param {string} [description]
       * @return {Argument} new argument
       */
      createArgument(name, description) {
        return new Argument2(name, description);
      }
      /**
       * Define argument syntax for command.
       *
       * The default is that the argument is required, and you can explicitly
       * indicate this with <> around the name. Put [] around the name for an optional argument.
       *
       * @example
       * program.argument('<input-file>');
       * program.argument('[output-file]');
       *
       * @param {string} name
       * @param {string} [description]
       * @param {(Function|*)} [fn] - custom argument processing function
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      argument(name, description, fn, defaultValue) {
        const argument = this.createArgument(name, description);
        if (typeof fn === "function") {
          argument.default(defaultValue).argParser(fn);
        } else {
          argument.default(fn);
        }
        this.addArgument(argument);
        return this;
      }
      /**
       * Define argument syntax for command, adding multiple at once (without descriptions).
       *
       * See also .argument().
       *
       * @example
       * program.arguments('<cmd> [env]');
       *
       * @param {string} names
       * @return {Command} `this` command for chaining
       */
      arguments(names) {
        names.trim().split(/ +/).forEach((detail) => {
          this.argument(detail);
        });
        return this;
      }
      /**
       * Define argument syntax for command, adding a prepared argument.
       *
       * @param {Argument} argument
       * @return {Command} `this` command for chaining
       */
      addArgument(argument) {
        const previousArgument = this.registeredArguments.slice(-1)[0];
        if (previousArgument && previousArgument.variadic) {
          throw new Error(
            `only the last argument can be variadic '${previousArgument.name()}'`
          );
        }
        if (argument.required && argument.defaultValue !== void 0 && argument.parseArg === void 0) {
          throw new Error(
            `a default value for a required argument is never used: '${argument.name()}'`
          );
        }
        this.registeredArguments.push(argument);
        return this;
      }
      /**
       * Customise or override default help command. By default a help command is automatically added if your command has subcommands.
       *
       * @example
       *    program.helpCommand('help [cmd]');
       *    program.helpCommand('help [cmd]', 'show help');
       *    program.helpCommand(false); // suppress default help command
       *    program.helpCommand(true); // add help command even if no subcommands
       *
       * @param {string|boolean} enableOrNameAndArgs - enable with custom name and/or arguments, or boolean to override whether added
       * @param {string} [description] - custom description
       * @return {Command} `this` command for chaining
       */
      helpCommand(enableOrNameAndArgs, description) {
        if (typeof enableOrNameAndArgs === "boolean") {
          this._addImplicitHelpCommand = enableOrNameAndArgs;
          return this;
        }
        enableOrNameAndArgs = enableOrNameAndArgs ?? "help [command]";
        const [, helpName, helpArgs] = enableOrNameAndArgs.match(/([^ ]+) *(.*)/);
        const helpDescription = description ?? "display help for command";
        const helpCommand = this.createCommand(helpName);
        helpCommand.helpOption(false);
        if (helpArgs)
          helpCommand.arguments(helpArgs);
        if (helpDescription)
          helpCommand.description(helpDescription);
        this._addImplicitHelpCommand = true;
        this._helpCommand = helpCommand;
        return this;
      }
      /**
       * Add prepared custom help command.
       *
       * @param {(Command|string|boolean)} helpCommand - custom help command, or deprecated enableOrNameAndArgs as for `.helpCommand()`
       * @param {string} [deprecatedDescription] - deprecated custom description used with custom name only
       * @return {Command} `this` command for chaining
       */
      addHelpCommand(helpCommand, deprecatedDescription) {
        if (typeof helpCommand !== "object") {
          this.helpCommand(helpCommand, deprecatedDescription);
          return this;
        }
        this._addImplicitHelpCommand = true;
        this._helpCommand = helpCommand;
        return this;
      }
      /**
       * Lazy create help command.
       *
       * @return {(Command|null)}
       * @package
       */
      _getHelpCommand() {
        const hasImplicitHelpCommand = this._addImplicitHelpCommand ?? (this.commands.length && !this._actionHandler && !this._findCommand("help"));
        if (hasImplicitHelpCommand) {
          if (this._helpCommand === void 0) {
            this.helpCommand(void 0, void 0);
          }
          return this._helpCommand;
        }
        return null;
      }
      /**
       * Add hook for life cycle event.
       *
       * @param {string} event
       * @param {Function} listener
       * @return {Command} `this` command for chaining
       */
      hook(event, listener) {
        const allowedValues = ["preSubcommand", "preAction", "postAction"];
        if (!allowedValues.includes(event)) {
          throw new Error(`Unexpected value for event passed to hook : '${event}'.
Expecting one of '${allowedValues.join("', '")}'`);
        }
        if (this._lifeCycleHooks[event]) {
          this._lifeCycleHooks[event].push(listener);
        } else {
          this._lifeCycleHooks[event] = [listener];
        }
        return this;
      }
      /**
       * Register callback to use as replacement for calling process.exit.
       *
       * @param {Function} [fn] optional callback which will be passed a CommanderError, defaults to throwing
       * @return {Command} `this` command for chaining
       */
      exitOverride(fn) {
        if (fn) {
          this._exitCallback = fn;
        } else {
          this._exitCallback = (err) => {
            if (err.code !== "commander.executeSubCommandAsync") {
              throw err;
            } else {
            }
          };
        }
        return this;
      }
      /**
       * Call process.exit, and _exitCallback if defined.
       *
       * @param {number} exitCode exit code for using with process.exit
       * @param {string} code an id string representing the error
       * @param {string} message human-readable description of the error
       * @return never
       * @private
       */
      _exit(exitCode, code, message) {
        if (this._exitCallback) {
          this._exitCallback(new CommanderError2(exitCode, code, message));
        }
        process2.exit(exitCode);
      }
      /**
       * Register callback `fn` for the command.
       *
       * @example
       * program
       *   .command('serve')
       *   .description('start service')
       *   .action(function() {
       *      // do work here
       *   });
       *
       * @param {Function} fn
       * @return {Command} `this` command for chaining
       */
      action(fn) {
        const listener = (args) => {
          const expectedArgsCount = this.registeredArguments.length;
          const actionArgs = args.slice(0, expectedArgsCount);
          if (this._storeOptionsAsProperties) {
            actionArgs[expectedArgsCount] = this;
          } else {
            actionArgs[expectedArgsCount] = this.opts();
          }
          actionArgs.push(this);
          return fn.apply(this, actionArgs);
        };
        this._actionHandler = listener;
        return this;
      }
      /**
       * Factory routine to create a new unattached option.
       *
       * See .option() for creating an attached option, which uses this routine to
       * create the option. You can override createOption to return a custom option.
       *
       * @param {string} flags
       * @param {string} [description]
       * @return {Option} new option
       */
      createOption(flags, description) {
        return new Option2(flags, description);
      }
      /**
       * Wrap parseArgs to catch 'commander.invalidArgument'.
       *
       * @param {(Option | Argument)} target
       * @param {string} value
       * @param {*} previous
       * @param {string} invalidArgumentMessage
       * @private
       */
      _callParseArg(target, value, previous, invalidArgumentMessage) {
        try {
          return target.parseArg(value, previous);
        } catch (err) {
          if (err.code === "commander.invalidArgument") {
            const message = `${invalidArgumentMessage} ${err.message}`;
            this.error(message, { exitCode: err.exitCode, code: err.code });
          }
          throw err;
        }
      }
      /**
       * Check for option flag conflicts.
       * Register option if no conflicts found, or throw on conflict.
       *
       * @param {Option} option
       * @private
       */
      _registerOption(option) {
        const matchingOption = option.short && this._findOption(option.short) || option.long && this._findOption(option.long);
        if (matchingOption) {
          const matchingFlag = option.long && this._findOption(option.long) ? option.long : option.short;
          throw new Error(`Cannot add option '${option.flags}'${this._name && ` to command '${this._name}'`} due to conflicting flag '${matchingFlag}'
-  already used by option '${matchingOption.flags}'`);
        }
        this.options.push(option);
      }
      /**
       * Check for command name and alias conflicts with existing commands.
       * Register command if no conflicts found, or throw on conflict.
       *
       * @param {Command} command
       * @private
       */
      _registerCommand(command) {
        const knownBy = (cmd) => {
          return [cmd.name()].concat(cmd.aliases());
        };
        const alreadyUsed = knownBy(command).find(
          (name) => this._findCommand(name)
        );
        if (alreadyUsed) {
          const existingCmd = knownBy(this._findCommand(alreadyUsed)).join("|");
          const newCmd = knownBy(command).join("|");
          throw new Error(
            `cannot add command '${newCmd}' as already have command '${existingCmd}'`
          );
        }
        this.commands.push(command);
      }
      /**
       * Add an option.
       *
       * @param {Option} option
       * @return {Command} `this` command for chaining
       */
      addOption(option) {
        this._registerOption(option);
        const oname = option.name();
        const name = option.attributeName();
        if (option.negate) {
          const positiveLongFlag = option.long.replace(/^--no-/, "--");
          if (!this._findOption(positiveLongFlag)) {
            this.setOptionValueWithSource(
              name,
              option.defaultValue === void 0 ? true : option.defaultValue,
              "default"
            );
          }
        } else if (option.defaultValue !== void 0) {
          this.setOptionValueWithSource(name, option.defaultValue, "default");
        }
        const handleOptionValue = (val, invalidValueMessage, valueSource) => {
          if (val == null && option.presetArg !== void 0) {
            val = option.presetArg;
          }
          const oldValue = this.getOptionValue(name);
          if (val !== null && option.parseArg) {
            val = this._callParseArg(option, val, oldValue, invalidValueMessage);
          } else if (val !== null && option.variadic) {
            val = option._concatValue(val, oldValue);
          }
          if (val == null) {
            if (option.negate) {
              val = false;
            } else if (option.isBoolean() || option.optional) {
              val = true;
            } else {
              val = "";
            }
          }
          this.setOptionValueWithSource(name, val, valueSource);
        };
        this.on("option:" + oname, (val) => {
          const invalidValueMessage = `error: option '${option.flags}' argument '${val}' is invalid.`;
          handleOptionValue(val, invalidValueMessage, "cli");
        });
        if (option.envVar) {
          this.on("optionEnv:" + oname, (val) => {
            const invalidValueMessage = `error: option '${option.flags}' value '${val}' from env '${option.envVar}' is invalid.`;
            handleOptionValue(val, invalidValueMessage, "env");
          });
        }
        return this;
      }
      /**
       * Internal implementation shared by .option() and .requiredOption()
       *
       * @return {Command} `this` command for chaining
       * @private
       */
      _optionEx(config, flags, description, fn, defaultValue) {
        if (typeof flags === "object" && flags instanceof Option2) {
          throw new Error(
            "To add an Option object use addOption() instead of option() or requiredOption()"
          );
        }
        const option = this.createOption(flags, description);
        option.makeOptionMandatory(!!config.mandatory);
        if (typeof fn === "function") {
          option.default(defaultValue).argParser(fn);
        } else if (fn instanceof RegExp) {
          const regex = fn;
          fn = (val, def) => {
            const m = regex.exec(val);
            return m ? m[0] : def;
          };
          option.default(defaultValue).argParser(fn);
        } else {
          option.default(fn);
        }
        return this.addOption(option);
      }
      /**
       * Define option with `flags`, `description`, and optional argument parsing function or `defaultValue` or both.
       *
       * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space. A required
       * option-argument is indicated by `<>` and an optional option-argument by `[]`.
       *
       * See the README for more details, and see also addOption() and requiredOption().
       *
       * @example
       * program
       *     .option('-p, --pepper', 'add pepper')
       *     .option('-p, --pizza-type <TYPE>', 'type of pizza') // required option-argument
       *     .option('-c, --cheese [CHEESE]', 'add extra cheese', 'mozzarella') // optional option-argument with default
       *     .option('-t, --tip <VALUE>', 'add tip to purchase cost', parseFloat) // custom parse function
       *
       * @param {string} flags
       * @param {string} [description]
       * @param {(Function|*)} [parseArg] - custom option processing function or default value
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      option(flags, description, parseArg, defaultValue) {
        return this._optionEx({}, flags, description, parseArg, defaultValue);
      }
      /**
       * Add a required option which must have a value after parsing. This usually means
       * the option must be specified on the command line. (Otherwise the same as .option().)
       *
       * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space.
       *
       * @param {string} flags
       * @param {string} [description]
       * @param {(Function|*)} [parseArg] - custom option processing function or default value
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      requiredOption(flags, description, parseArg, defaultValue) {
        return this._optionEx(
          { mandatory: true },
          flags,
          description,
          parseArg,
          defaultValue
        );
      }
      /**
       * Alter parsing of short flags with optional values.
       *
       * @example
       * // for `.option('-f,--flag [value]'):
       * program.combineFlagAndOptionalValue(true);  // `-f80` is treated like `--flag=80`, this is the default behaviour
       * program.combineFlagAndOptionalValue(false) // `-fb` is treated like `-f -b`
       *
       * @param {boolean} [combine] - if `true` or omitted, an optional value can be specified directly after the flag.
       * @return {Command} `this` command for chaining
       */
      combineFlagAndOptionalValue(combine = true) {
        this._combineFlagAndOptionalValue = !!combine;
        return this;
      }
      /**
       * Allow unknown options on the command line.
       *
       * @param {boolean} [allowUnknown] - if `true` or omitted, no error will be thrown for unknown options.
       * @return {Command} `this` command for chaining
       */
      allowUnknownOption(allowUnknown = true) {
        this._allowUnknownOption = !!allowUnknown;
        return this;
      }
      /**
       * Allow excess command-arguments on the command line. Pass false to make excess arguments an error.
       *
       * @param {boolean} [allowExcess] - if `true` or omitted, no error will be thrown for excess arguments.
       * @return {Command} `this` command for chaining
       */
      allowExcessArguments(allowExcess = true) {
        this._allowExcessArguments = !!allowExcess;
        return this;
      }
      /**
       * Enable positional options. Positional means global options are specified before subcommands which lets
       * subcommands reuse the same option names, and also enables subcommands to turn on passThroughOptions.
       * The default behaviour is non-positional and global options may appear anywhere on the command line.
       *
       * @param {boolean} [positional]
       * @return {Command} `this` command for chaining
       */
      enablePositionalOptions(positional = true) {
        this._enablePositionalOptions = !!positional;
        return this;
      }
      /**
       * Pass through options that come after command-arguments rather than treat them as command-options,
       * so actual command-options come before command-arguments. Turning this on for a subcommand requires
       * positional options to have been enabled on the program (parent commands).
       * The default behaviour is non-positional and options may appear before or after command-arguments.
       *
       * @param {boolean} [passThrough] for unknown options.
       * @return {Command} `this` command for chaining
       */
      passThroughOptions(passThrough = true) {
        this._passThroughOptions = !!passThrough;
        this._checkForBrokenPassThrough();
        return this;
      }
      /**
       * @private
       */
      _checkForBrokenPassThrough() {
        if (this.parent && this._passThroughOptions && !this.parent._enablePositionalOptions) {
          throw new Error(
            `passThroughOptions cannot be used for '${this._name}' without turning on enablePositionalOptions for parent command(s)`
          );
        }
      }
      /**
       * Whether to store option values as properties on command object,
       * or store separately (specify false). In both cases the option values can be accessed using .opts().
       *
       * @param {boolean} [storeAsProperties=true]
       * @return {Command} `this` command for chaining
       */
      storeOptionsAsProperties(storeAsProperties = true) {
        if (this.options.length) {
          throw new Error("call .storeOptionsAsProperties() before adding options");
        }
        if (Object.keys(this._optionValues).length) {
          throw new Error(
            "call .storeOptionsAsProperties() before setting option values"
          );
        }
        this._storeOptionsAsProperties = !!storeAsProperties;
        return this;
      }
      /**
       * Retrieve option value.
       *
       * @param {string} key
       * @return {object} value
       */
      getOptionValue(key) {
        if (this._storeOptionsAsProperties) {
          return this[key];
        }
        return this._optionValues[key];
      }
      /**
       * Store option value.
       *
       * @param {string} key
       * @param {object} value
       * @return {Command} `this` command for chaining
       */
      setOptionValue(key, value) {
        return this.setOptionValueWithSource(key, value, void 0);
      }
      /**
       * Store option value and where the value came from.
       *
       * @param {string} key
       * @param {object} value
       * @param {string} source - expected values are default/config/env/cli/implied
       * @return {Command} `this` command for chaining
       */
      setOptionValueWithSource(key, value, source) {
        if (this._storeOptionsAsProperties) {
          this[key] = value;
        } else {
          this._optionValues[key] = value;
        }
        this._optionValueSources[key] = source;
        return this;
      }
      /**
       * Get source of option value.
       * Expected values are default | config | env | cli | implied
       *
       * @param {string} key
       * @return {string}
       */
      getOptionValueSource(key) {
        return this._optionValueSources[key];
      }
      /**
       * Get source of option value. See also .optsWithGlobals().
       * Expected values are default | config | env | cli | implied
       *
       * @param {string} key
       * @return {string}
       */
      getOptionValueSourceWithGlobals(key) {
        let source;
        this._getCommandAndAncestors().forEach((cmd) => {
          if (cmd.getOptionValueSource(key) !== void 0) {
            source = cmd.getOptionValueSource(key);
          }
        });
        return source;
      }
      /**
       * Get user arguments from implied or explicit arguments.
       * Side-effects: set _scriptPath if args included script. Used for default program name, and subcommand searches.
       *
       * @private
       */
      _prepareUserArgs(argv, parseOptions) {
        if (argv !== void 0 && !Array.isArray(argv)) {
          throw new Error("first parameter to parse must be array or undefined");
        }
        parseOptions = parseOptions || {};
        if (argv === void 0 && parseOptions.from === void 0) {
          if (process2.versions?.electron) {
            parseOptions.from = "electron";
          }
          const execArgv = process2.execArgv ?? [];
          if (execArgv.includes("-e") || execArgv.includes("--eval") || execArgv.includes("-p") || execArgv.includes("--print")) {
            parseOptions.from = "eval";
          }
        }
        if (argv === void 0) {
          argv = process2.argv;
        }
        this.rawArgs = argv.slice();
        let userArgs;
        switch (parseOptions.from) {
          case void 0:
          case "node":
            this._scriptPath = argv[1];
            userArgs = argv.slice(2);
            break;
          case "electron":
            if (process2.defaultApp) {
              this._scriptPath = argv[1];
              userArgs = argv.slice(2);
            } else {
              userArgs = argv.slice(1);
            }
            break;
          case "user":
            userArgs = argv.slice(0);
            break;
          case "eval":
            userArgs = argv.slice(1);
            break;
          default:
            throw new Error(
              `unexpected parse option { from: '${parseOptions.from}' }`
            );
        }
        if (!this._name && this._scriptPath)
          this.nameFromFilename(this._scriptPath);
        this._name = this._name || "program";
        return userArgs;
      }
      /**
       * Parse `argv`, setting options and invoking commands when defined.
       *
       * Use parseAsync instead of parse if any of your action handlers are async.
       *
       * Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
       *
       * Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
       * - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
       * - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
       * - `'user'`: just user arguments
       *
       * @example
       * program.parse(); // parse process.argv and auto-detect electron and special node flags
       * program.parse(process.argv); // assume argv[0] is app and argv[1] is script
       * program.parse(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
       *
       * @param {string[]} [argv] - optional, defaults to process.argv
       * @param {object} [parseOptions] - optionally specify style of options with from: node/user/electron
       * @param {string} [parseOptions.from] - where the args are from: 'node', 'user', 'electron'
       * @return {Command} `this` command for chaining
       */
      parse(argv, parseOptions) {
        const userArgs = this._prepareUserArgs(argv, parseOptions);
        this._parseCommand([], userArgs);
        return this;
      }
      /**
       * Parse `argv`, setting options and invoking commands when defined.
       *
       * Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
       *
       * Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
       * - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
       * - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
       * - `'user'`: just user arguments
       *
       * @example
       * await program.parseAsync(); // parse process.argv and auto-detect electron and special node flags
       * await program.parseAsync(process.argv); // assume argv[0] is app and argv[1] is script
       * await program.parseAsync(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
       *
       * @param {string[]} [argv]
       * @param {object} [parseOptions]
       * @param {string} parseOptions.from - where the args are from: 'node', 'user', 'electron'
       * @return {Promise}
       */
      async parseAsync(argv, parseOptions) {
        const userArgs = this._prepareUserArgs(argv, parseOptions);
        await this._parseCommand([], userArgs);
        return this;
      }
      /**
       * Execute a sub-command executable.
       *
       * @private
       */
      _executeSubCommand(subcommand, args) {
        args = args.slice();
        let launchWithNode = false;
        const sourceExt = [".js", ".ts", ".tsx", ".mjs", ".cjs"];
        function findFile(baseDir, baseName) {
          const localBin = path.resolve(baseDir, baseName);
          if (fs.existsSync(localBin))
            return localBin;
          if (sourceExt.includes(path.extname(baseName)))
            return void 0;
          const foundExt = sourceExt.find(
            (ext) => fs.existsSync(`${localBin}${ext}`)
          );
          if (foundExt)
            return `${localBin}${foundExt}`;
          return void 0;
        }
        this._checkForMissingMandatoryOptions();
        this._checkForConflictingOptions();
        let executableFile = subcommand._executableFile || `${this._name}-${subcommand._name}`;
        let executableDir = this._executableDir || "";
        if (this._scriptPath) {
          let resolvedScriptPath;
          try {
            resolvedScriptPath = fs.realpathSync(this._scriptPath);
          } catch (err) {
            resolvedScriptPath = this._scriptPath;
          }
          executableDir = path.resolve(
            path.dirname(resolvedScriptPath),
            executableDir
          );
        }
        if (executableDir) {
          let localFile = findFile(executableDir, executableFile);
          if (!localFile && !subcommand._executableFile && this._scriptPath) {
            const legacyName = path.basename(
              this._scriptPath,
              path.extname(this._scriptPath)
            );
            if (legacyName !== this._name) {
              localFile = findFile(
                executableDir,
                `${legacyName}-${subcommand._name}`
              );
            }
          }
          executableFile = localFile || executableFile;
        }
        launchWithNode = sourceExt.includes(path.extname(executableFile));
        let proc;
        if (process2.platform !== "win32") {
          if (launchWithNode) {
            args.unshift(executableFile);
            args = incrementNodeInspectorPort(process2.execArgv).concat(args);
            proc = childProcess.spawn(process2.argv[0], args, { stdio: "inherit" });
          } else {
            proc = childProcess.spawn(executableFile, args, { stdio: "inherit" });
          }
        } else {
          args.unshift(executableFile);
          args = incrementNodeInspectorPort(process2.execArgv).concat(args);
          proc = childProcess.spawn(process2.execPath, args, { stdio: "inherit" });
        }
        if (!proc.killed) {
          const signals = ["SIGUSR1", "SIGUSR2", "SIGTERM", "SIGINT", "SIGHUP"];
          signals.forEach((signal) => {
            process2.on(signal, () => {
              if (proc.killed === false && proc.exitCode === null) {
                proc.kill(signal);
              }
            });
          });
        }
        const exitCallback = this._exitCallback;
        proc.on("close", (code) => {
          code = code ?? 1;
          if (!exitCallback) {
            process2.exit(code);
          } else {
            exitCallback(
              new CommanderError2(
                code,
                "commander.executeSubCommandAsync",
                "(close)"
              )
            );
          }
        });
        proc.on("error", (err) => {
          if (err.code === "ENOENT") {
            const executableDirMessage = executableDir ? `searched for local subcommand relative to directory '${executableDir}'` : "no directory for search for local subcommand, use .executableDir() to supply a custom directory";
            const executableMissing = `'${executableFile}' does not exist
 - if '${subcommand._name}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${executableDirMessage}`;
            throw new Error(executableMissing);
          } else if (err.code === "EACCES") {
            throw new Error(`'${executableFile}' not executable`);
          }
          if (!exitCallback) {
            process2.exit(1);
          } else {
            const wrappedError = new CommanderError2(
              1,
              "commander.executeSubCommandAsync",
              "(error)"
            );
            wrappedError.nestedError = err;
            exitCallback(wrappedError);
          }
        });
        this.runningCommand = proc;
      }
      /**
       * @private
       */
      _dispatchSubcommand(commandName, operands, unknown) {
        const subCommand = this._findCommand(commandName);
        if (!subCommand)
          this.help({ error: true });
        let promiseChain;
        promiseChain = this._chainOrCallSubCommandHook(
          promiseChain,
          subCommand,
          "preSubcommand"
        );
        promiseChain = this._chainOrCall(promiseChain, () => {
          if (subCommand._executableHandler) {
            this._executeSubCommand(subCommand, operands.concat(unknown));
          } else {
            return subCommand._parseCommand(operands, unknown);
          }
        });
        return promiseChain;
      }
      /**
       * Invoke help directly if possible, or dispatch if necessary.
       * e.g. help foo
       *
       * @private
       */
      _dispatchHelpCommand(subcommandName) {
        if (!subcommandName) {
          this.help();
        }
        const subCommand = this._findCommand(subcommandName);
        if (subCommand && !subCommand._executableHandler) {
          subCommand.help();
        }
        return this._dispatchSubcommand(
          subcommandName,
          [],
          [this._getHelpOption()?.long ?? this._getHelpOption()?.short ?? "--help"]
        );
      }
      /**
       * Check this.args against expected this.registeredArguments.
       *
       * @private
       */
      _checkNumberOfArguments() {
        this.registeredArguments.forEach((arg, i) => {
          if (arg.required && this.args[i] == null) {
            this.missingArgument(arg.name());
          }
        });
        if (this.registeredArguments.length > 0 && this.registeredArguments[this.registeredArguments.length - 1].variadic) {
          return;
        }
        if (this.args.length > this.registeredArguments.length) {
          this._excessArguments(this.args);
        }
      }
      /**
       * Process this.args using this.registeredArguments and save as this.processedArgs!
       *
       * @private
       */
      _processArguments() {
        const myParseArg = (argument, value, previous) => {
          let parsedValue = value;
          if (value !== null && argument.parseArg) {
            const invalidValueMessage = `error: command-argument value '${value}' is invalid for argument '${argument.name()}'.`;
            parsedValue = this._callParseArg(
              argument,
              value,
              previous,
              invalidValueMessage
            );
          }
          return parsedValue;
        };
        this._checkNumberOfArguments();
        const processedArgs = [];
        this.registeredArguments.forEach((declaredArg, index) => {
          let value = declaredArg.defaultValue;
          if (declaredArg.variadic) {
            if (index < this.args.length) {
              value = this.args.slice(index);
              if (declaredArg.parseArg) {
                value = value.reduce((processed, v) => {
                  return myParseArg(declaredArg, v, processed);
                }, declaredArg.defaultValue);
              }
            } else if (value === void 0) {
              value = [];
            }
          } else if (index < this.args.length) {
            value = this.args[index];
            if (declaredArg.parseArg) {
              value = myParseArg(declaredArg, value, declaredArg.defaultValue);
            }
          }
          processedArgs[index] = value;
        });
        this.processedArgs = processedArgs;
      }
      /**
       * Once we have a promise we chain, but call synchronously until then.
       *
       * @param {(Promise|undefined)} promise
       * @param {Function} fn
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCall(promise, fn) {
        if (promise && promise.then && typeof promise.then === "function") {
          return promise.then(() => fn());
        }
        return fn();
      }
      /**
       *
       * @param {(Promise|undefined)} promise
       * @param {string} event
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCallHooks(promise, event) {
        let result = promise;
        const hooks = [];
        this._getCommandAndAncestors().reverse().filter((cmd) => cmd._lifeCycleHooks[event] !== void 0).forEach((hookedCommand) => {
          hookedCommand._lifeCycleHooks[event].forEach((callback) => {
            hooks.push({ hookedCommand, callback });
          });
        });
        if (event === "postAction") {
          hooks.reverse();
        }
        hooks.forEach((hookDetail) => {
          result = this._chainOrCall(result, () => {
            return hookDetail.callback(hookDetail.hookedCommand, this);
          });
        });
        return result;
      }
      /**
       *
       * @param {(Promise|undefined)} promise
       * @param {Command} subCommand
       * @param {string} event
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCallSubCommandHook(promise, subCommand, event) {
        let result = promise;
        if (this._lifeCycleHooks[event] !== void 0) {
          this._lifeCycleHooks[event].forEach((hook) => {
            result = this._chainOrCall(result, () => {
              return hook(this, subCommand);
            });
          });
        }
        return result;
      }
      /**
       * Process arguments in context of this command.
       * Returns action result, in case it is a promise.
       *
       * @private
       */
      _parseCommand(operands, unknown) {
        const parsed = this.parseOptions(unknown);
        this._parseOptionsEnv();
        this._parseOptionsImplied();
        operands = operands.concat(parsed.operands);
        unknown = parsed.unknown;
        this.args = operands.concat(unknown);
        if (operands && this._findCommand(operands[0])) {
          return this._dispatchSubcommand(operands[0], operands.slice(1), unknown);
        }
        if (this._getHelpCommand() && operands[0] === this._getHelpCommand().name()) {
          return this._dispatchHelpCommand(operands[1]);
        }
        if (this._defaultCommandName) {
          this._outputHelpIfRequested(unknown);
          return this._dispatchSubcommand(
            this._defaultCommandName,
            operands,
            unknown
          );
        }
        if (this.commands.length && this.args.length === 0 && !this._actionHandler && !this._defaultCommandName) {
          this.help({ error: true });
        }
        this._outputHelpIfRequested(parsed.unknown);
        this._checkForMissingMandatoryOptions();
        this._checkForConflictingOptions();
        const checkForUnknownOptions = () => {
          if (parsed.unknown.length > 0) {
            this.unknownOption(parsed.unknown[0]);
          }
        };
        const commandEvent = `command:${this.name()}`;
        if (this._actionHandler) {
          checkForUnknownOptions();
          this._processArguments();
          let promiseChain;
          promiseChain = this._chainOrCallHooks(promiseChain, "preAction");
          promiseChain = this._chainOrCall(
            promiseChain,
            () => this._actionHandler(this.processedArgs)
          );
          if (this.parent) {
            promiseChain = this._chainOrCall(promiseChain, () => {
              this.parent.emit(commandEvent, operands, unknown);
            });
          }
          promiseChain = this._chainOrCallHooks(promiseChain, "postAction");
          return promiseChain;
        }
        if (this.parent && this.parent.listenerCount(commandEvent)) {
          checkForUnknownOptions();
          this._processArguments();
          this.parent.emit(commandEvent, operands, unknown);
        } else if (operands.length) {
          if (this._findCommand("*")) {
            return this._dispatchSubcommand("*", operands, unknown);
          }
          if (this.listenerCount("command:*")) {
            this.emit("command:*", operands, unknown);
          } else if (this.commands.length) {
            this.unknownCommand();
          } else {
            checkForUnknownOptions();
            this._processArguments();
          }
        } else if (this.commands.length) {
          checkForUnknownOptions();
          this.help({ error: true });
        } else {
          checkForUnknownOptions();
          this._processArguments();
        }
      }
      /**
       * Find matching command.
       *
       * @private
       * @return {Command | undefined}
       */
      _findCommand(name) {
        if (!name)
          return void 0;
        return this.commands.find(
          (cmd) => cmd._name === name || cmd._aliases.includes(name)
        );
      }
      /**
       * Return an option matching `arg` if any.
       *
       * @param {string} arg
       * @return {Option}
       * @package
       */
      _findOption(arg) {
        return this.options.find((option) => option.is(arg));
      }
      /**
       * Display an error message if a mandatory option does not have a value.
       * Called after checking for help flags in leaf subcommand.
       *
       * @private
       */
      _checkForMissingMandatoryOptions() {
        this._getCommandAndAncestors().forEach((cmd) => {
          cmd.options.forEach((anOption) => {
            if (anOption.mandatory && cmd.getOptionValue(anOption.attributeName()) === void 0) {
              cmd.missingMandatoryOptionValue(anOption);
            }
          });
        });
      }
      /**
       * Display an error message if conflicting options are used together in this.
       *
       * @private
       */
      _checkForConflictingLocalOptions() {
        const definedNonDefaultOptions = this.options.filter((option) => {
          const optionKey = option.attributeName();
          if (this.getOptionValue(optionKey) === void 0) {
            return false;
          }
          return this.getOptionValueSource(optionKey) !== "default";
        });
        const optionsWithConflicting = definedNonDefaultOptions.filter(
          (option) => option.conflictsWith.length > 0
        );
        optionsWithConflicting.forEach((option) => {
          const conflictingAndDefined = definedNonDefaultOptions.find(
            (defined) => option.conflictsWith.includes(defined.attributeName())
          );
          if (conflictingAndDefined) {
            this._conflictingOption(option, conflictingAndDefined);
          }
        });
      }
      /**
       * Display an error message if conflicting options are used together.
       * Called after checking for help flags in leaf subcommand.
       *
       * @private
       */
      _checkForConflictingOptions() {
        this._getCommandAndAncestors().forEach((cmd) => {
          cmd._checkForConflictingLocalOptions();
        });
      }
      /**
       * Parse options from `argv` removing known options,
       * and return argv split into operands and unknown arguments.
       *
       * Examples:
       *
       *     argv => operands, unknown
       *     --known kkk op => [op], []
       *     op --known kkk => [op], []
       *     sub --unknown uuu op => [sub], [--unknown uuu op]
       *     sub -- --unknown uuu op => [sub --unknown uuu op], []
       *
       * @param {string[]} argv
       * @return {{operands: string[], unknown: string[]}}
       */
      parseOptions(argv) {
        const operands = [];
        const unknown = [];
        let dest = operands;
        const args = argv.slice();
        function maybeOption(arg) {
          return arg.length > 1 && arg[0] === "-";
        }
        let activeVariadicOption = null;
        while (args.length) {
          const arg = args.shift();
          if (arg === "--") {
            if (dest === unknown)
              dest.push(arg);
            dest.push(...args);
            break;
          }
          if (activeVariadicOption && !maybeOption(arg)) {
            this.emit(`option:${activeVariadicOption.name()}`, arg);
            continue;
          }
          activeVariadicOption = null;
          if (maybeOption(arg)) {
            const option = this._findOption(arg);
            if (option) {
              if (option.required) {
                const value = args.shift();
                if (value === void 0)
                  this.optionMissingArgument(option);
                this.emit(`option:${option.name()}`, value);
              } else if (option.optional) {
                let value = null;
                if (args.length > 0 && !maybeOption(args[0])) {
                  value = args.shift();
                }
                this.emit(`option:${option.name()}`, value);
              } else {
                this.emit(`option:${option.name()}`);
              }
              activeVariadicOption = option.variadic ? option : null;
              continue;
            }
          }
          if (arg.length > 2 && arg[0] === "-" && arg[1] !== "-") {
            const option = this._findOption(`-${arg[1]}`);
            if (option) {
              if (option.required || option.optional && this._combineFlagAndOptionalValue) {
                this.emit(`option:${option.name()}`, arg.slice(2));
              } else {
                this.emit(`option:${option.name()}`);
                args.unshift(`-${arg.slice(2)}`);
              }
              continue;
            }
          }
          if (/^--[^=]+=/.test(arg)) {
            const index = arg.indexOf("=");
            const option = this._findOption(arg.slice(0, index));
            if (option && (option.required || option.optional)) {
              this.emit(`option:${option.name()}`, arg.slice(index + 1));
              continue;
            }
          }
          if (maybeOption(arg)) {
            dest = unknown;
          }
          if ((this._enablePositionalOptions || this._passThroughOptions) && operands.length === 0 && unknown.length === 0) {
            if (this._findCommand(arg)) {
              operands.push(arg);
              if (args.length > 0)
                unknown.push(...args);
              break;
            } else if (this._getHelpCommand() && arg === this._getHelpCommand().name()) {
              operands.push(arg);
              if (args.length > 0)
                operands.push(...args);
              break;
            } else if (this._defaultCommandName) {
              unknown.push(arg);
              if (args.length > 0)
                unknown.push(...args);
              break;
            }
          }
          if (this._passThroughOptions) {
            dest.push(arg);
            if (args.length > 0)
              dest.push(...args);
            break;
          }
          dest.push(arg);
        }
        return { operands, unknown };
      }
      /**
       * Return an object containing local option values as key-value pairs.
       *
       * @return {object}
       */
      opts() {
        if (this._storeOptionsAsProperties) {
          const result = {};
          const len = this.options.length;
          for (let i = 0; i < len; i++) {
            const key = this.options[i].attributeName();
            result[key] = key === this._versionOptionName ? this._version : this[key];
          }
          return result;
        }
        return this._optionValues;
      }
      /**
       * Return an object containing merged local and global option values as key-value pairs.
       *
       * @return {object}
       */
      optsWithGlobals() {
        return this._getCommandAndAncestors().reduce(
          (combinedOptions, cmd) => Object.assign(combinedOptions, cmd.opts()),
          {}
        );
      }
      /**
       * Display error message and exit (or call exitOverride).
       *
       * @param {string} message
       * @param {object} [errorOptions]
       * @param {string} [errorOptions.code] - an id string representing the error
       * @param {number} [errorOptions.exitCode] - used with process.exit
       */
      error(message, errorOptions) {
        this._outputConfiguration.outputError(
          `${message}
`,
          this._outputConfiguration.writeErr
        );
        if (typeof this._showHelpAfterError === "string") {
          this._outputConfiguration.writeErr(`${this._showHelpAfterError}
`);
        } else if (this._showHelpAfterError) {
          this._outputConfiguration.writeErr("\n");
          this.outputHelp({ error: true });
        }
        const config = errorOptions || {};
        const exitCode = config.exitCode || 1;
        const code = config.code || "commander.error";
        this._exit(exitCode, code, message);
      }
      /**
       * Apply any option related environment variables, if option does
       * not have a value from cli or client code.
       *
       * @private
       */
      _parseOptionsEnv() {
        this.options.forEach((option) => {
          if (option.envVar && option.envVar in process2.env) {
            const optionKey = option.attributeName();
            if (this.getOptionValue(optionKey) === void 0 || ["default", "config", "env"].includes(
              this.getOptionValueSource(optionKey)
            )) {
              if (option.required || option.optional) {
                this.emit(`optionEnv:${option.name()}`, process2.env[option.envVar]);
              } else {
                this.emit(`optionEnv:${option.name()}`);
              }
            }
          }
        });
      }
      /**
       * Apply any implied option values, if option is undefined or default value.
       *
       * @private
       */
      _parseOptionsImplied() {
        const dualHelper = new DualOptions(this.options);
        const hasCustomOptionValue = (optionKey) => {
          return this.getOptionValue(optionKey) !== void 0 && !["default", "implied"].includes(this.getOptionValueSource(optionKey));
        };
        this.options.filter(
          (option) => option.implied !== void 0 && hasCustomOptionValue(option.attributeName()) && dualHelper.valueFromOption(
            this.getOptionValue(option.attributeName()),
            option
          )
        ).forEach((option) => {
          Object.keys(option.implied).filter((impliedKey) => !hasCustomOptionValue(impliedKey)).forEach((impliedKey) => {
            this.setOptionValueWithSource(
              impliedKey,
              option.implied[impliedKey],
              "implied"
            );
          });
        });
      }
      /**
       * Argument `name` is missing.
       *
       * @param {string} name
       * @private
       */
      missingArgument(name) {
        const message = `error: missing required argument '${name}'`;
        this.error(message, { code: "commander.missingArgument" });
      }
      /**
       * `Option` is missing an argument.
       *
       * @param {Option} option
       * @private
       */
      optionMissingArgument(option) {
        const message = `error: option '${option.flags}' argument missing`;
        this.error(message, { code: "commander.optionMissingArgument" });
      }
      /**
       * `Option` does not have a value, and is a mandatory option.
       *
       * @param {Option} option
       * @private
       */
      missingMandatoryOptionValue(option) {
        const message = `error: required option '${option.flags}' not specified`;
        this.error(message, { code: "commander.missingMandatoryOptionValue" });
      }
      /**
       * `Option` conflicts with another option.
       *
       * @param {Option} option
       * @param {Option} conflictingOption
       * @private
       */
      _conflictingOption(option, conflictingOption) {
        const findBestOptionFromValue = (option2) => {
          const optionKey = option2.attributeName();
          const optionValue = this.getOptionValue(optionKey);
          const negativeOption = this.options.find(
            (target) => target.negate && optionKey === target.attributeName()
          );
          const positiveOption = this.options.find(
            (target) => !target.negate && optionKey === target.attributeName()
          );
          if (negativeOption && (negativeOption.presetArg === void 0 && optionValue === false || negativeOption.presetArg !== void 0 && optionValue === negativeOption.presetArg)) {
            return negativeOption;
          }
          return positiveOption || option2;
        };
        const getErrorMessage = (option2) => {
          const bestOption = findBestOptionFromValue(option2);
          const optionKey = bestOption.attributeName();
          const source = this.getOptionValueSource(optionKey);
          if (source === "env") {
            return `environment variable '${bestOption.envVar}'`;
          }
          return `option '${bestOption.flags}'`;
        };
        const message = `error: ${getErrorMessage(option)} cannot be used with ${getErrorMessage(conflictingOption)}`;
        this.error(message, { code: "commander.conflictingOption" });
      }
      /**
       * Unknown option `flag`.
       *
       * @param {string} flag
       * @private
       */
      unknownOption(flag) {
        if (this._allowUnknownOption)
          return;
        let suggestion = "";
        if (flag.startsWith("--") && this._showSuggestionAfterError) {
          let candidateFlags = [];
          let command = this;
          do {
            const moreFlags = command.createHelp().visibleOptions(command).filter((option) => option.long).map((option) => option.long);
            candidateFlags = candidateFlags.concat(moreFlags);
            command = command.parent;
          } while (command && !command._enablePositionalOptions);
          suggestion = suggestSimilar(flag, candidateFlags);
        }
        const message = `error: unknown option '${flag}'${suggestion}`;
        this.error(message, { code: "commander.unknownOption" });
      }
      /**
       * Excess arguments, more than expected.
       *
       * @param {string[]} receivedArgs
       * @private
       */
      _excessArguments(receivedArgs) {
        if (this._allowExcessArguments)
          return;
        const expected = this.registeredArguments.length;
        const s = expected === 1 ? "" : "s";
        const forSubcommand = this.parent ? ` for '${this.name()}'` : "";
        const message = `error: too many arguments${forSubcommand}. Expected ${expected} argument${s} but got ${receivedArgs.length}.`;
        this.error(message, { code: "commander.excessArguments" });
      }
      /**
       * Unknown command.
       *
       * @private
       */
      unknownCommand() {
        const unknownName = this.args[0];
        let suggestion = "";
        if (this._showSuggestionAfterError) {
          const candidateNames = [];
          this.createHelp().visibleCommands(this).forEach((command) => {
            candidateNames.push(command.name());
            if (command.alias())
              candidateNames.push(command.alias());
          });
          suggestion = suggestSimilar(unknownName, candidateNames);
        }
        const message = `error: unknown command '${unknownName}'${suggestion}`;
        this.error(message, { code: "commander.unknownCommand" });
      }
      /**
       * Get or set the program version.
       *
       * This method auto-registers the "-V, --version" option which will print the version number.
       *
       * You can optionally supply the flags and description to override the defaults.
       *
       * @param {string} [str]
       * @param {string} [flags]
       * @param {string} [description]
       * @return {(this | string | undefined)} `this` command for chaining, or version string if no arguments
       */
      version(str, flags, description) {
        if (str === void 0)
          return this._version;
        this._version = str;
        flags = flags || "-V, --version";
        description = description || "output the version number";
        const versionOption = this.createOption(flags, description);
        this._versionOptionName = versionOption.attributeName();
        this._registerOption(versionOption);
        this.on("option:" + versionOption.name(), () => {
          this._outputConfiguration.writeOut(`${str}
`);
          this._exit(0, "commander.version", str);
        });
        return this;
      }
      /**
       * Set the description.
       *
       * @param {string} [str]
       * @param {object} [argsDescription]
       * @return {(string|Command)}
       */
      description(str, argsDescription) {
        if (str === void 0 && argsDescription === void 0)
          return this._description;
        this._description = str;
        if (argsDescription) {
          this._argsDescription = argsDescription;
        }
        return this;
      }
      /**
       * Set the summary. Used when listed as subcommand of parent.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      summary(str) {
        if (str === void 0)
          return this._summary;
        this._summary = str;
        return this;
      }
      /**
       * Set an alias for the command.
       *
       * You may call more than once to add multiple aliases. Only the first alias is shown in the auto-generated help.
       *
       * @param {string} [alias]
       * @return {(string|Command)}
       */
      alias(alias) {
        if (alias === void 0)
          return this._aliases[0];
        let command = this;
        if (this.commands.length !== 0 && this.commands[this.commands.length - 1]._executableHandler) {
          command = this.commands[this.commands.length - 1];
        }
        if (alias === command._name)
          throw new Error("Command alias can't be the same as its name");
        const matchingCommand = this.parent?._findCommand(alias);
        if (matchingCommand) {
          const existingCmd = [matchingCommand.name()].concat(matchingCommand.aliases()).join("|");
          throw new Error(
            `cannot add alias '${alias}' to command '${this.name()}' as already have command '${existingCmd}'`
          );
        }
        command._aliases.push(alias);
        return this;
      }
      /**
       * Set aliases for the command.
       *
       * Only the first alias is shown in the auto-generated help.
       *
       * @param {string[]} [aliases]
       * @return {(string[]|Command)}
       */
      aliases(aliases) {
        if (aliases === void 0)
          return this._aliases;
        aliases.forEach((alias) => this.alias(alias));
        return this;
      }
      /**
       * Set / get the command usage `str`.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      usage(str) {
        if (str === void 0) {
          if (this._usage)
            return this._usage;
          const args = this.registeredArguments.map((arg) => {
            return humanReadableArgName(arg);
          });
          return [].concat(
            this.options.length || this._helpOption !== null ? "[options]" : [],
            this.commands.length ? "[command]" : [],
            this.registeredArguments.length ? args : []
          ).join(" ");
        }
        this._usage = str;
        return this;
      }
      /**
       * Get or set the name of the command.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      name(str) {
        if (str === void 0)
          return this._name;
        this._name = str;
        return this;
      }
      /**
       * Set the name of the command from script filename, such as process.argv[1],
       * or require.main.filename, or __filename.
       *
       * (Used internally and public although not documented in README.)
       *
       * @example
       * program.nameFromFilename(require.main.filename);
       *
       * @param {string} filename
       * @return {Command}
       */
      nameFromFilename(filename) {
        this._name = path.basename(filename, path.extname(filename));
        return this;
      }
      /**
       * Get or set the directory for searching for executable subcommands of this command.
       *
       * @example
       * program.executableDir(__dirname);
       * // or
       * program.executableDir('subcommands');
       *
       * @param {string} [path]
       * @return {(string|null|Command)}
       */
      executableDir(path2) {
        if (path2 === void 0)
          return this._executableDir;
        this._executableDir = path2;
        return this;
      }
      /**
       * Return program help documentation.
       *
       * @param {{ error: boolean }} [contextOptions] - pass {error:true} to wrap for stderr instead of stdout
       * @return {string}
       */
      helpInformation(contextOptions) {
        const helper = this.createHelp();
        if (helper.helpWidth === void 0) {
          helper.helpWidth = contextOptions && contextOptions.error ? this._outputConfiguration.getErrHelpWidth() : this._outputConfiguration.getOutHelpWidth();
        }
        return helper.formatHelp(this, helper);
      }
      /**
       * @private
       */
      _getHelpContext(contextOptions) {
        contextOptions = contextOptions || {};
        const context = { error: !!contextOptions.error };
        let write;
        if (context.error) {
          write = (arg) => this._outputConfiguration.writeErr(arg);
        } else {
          write = (arg) => this._outputConfiguration.writeOut(arg);
        }
        context.write = contextOptions.write || write;
        context.command = this;
        return context;
      }
      /**
       * Output help information for this command.
       *
       * Outputs built-in help, and custom text added using `.addHelpText()`.
       *
       * @param {{ error: boolean } | Function} [contextOptions] - pass {error:true} to write to stderr instead of stdout
       */
      outputHelp(contextOptions) {
        let deprecatedCallback;
        if (typeof contextOptions === "function") {
          deprecatedCallback = contextOptions;
          contextOptions = void 0;
        }
        const context = this._getHelpContext(contextOptions);
        this._getCommandAndAncestors().reverse().forEach((command) => command.emit("beforeAllHelp", context));
        this.emit("beforeHelp", context);
        let helpInformation = this.helpInformation(context);
        if (deprecatedCallback) {
          helpInformation = deprecatedCallback(helpInformation);
          if (typeof helpInformation !== "string" && !Buffer.isBuffer(helpInformation)) {
            throw new Error("outputHelp callback must return a string or a Buffer");
          }
        }
        context.write(helpInformation);
        if (this._getHelpOption()?.long) {
          this.emit(this._getHelpOption().long);
        }
        this.emit("afterHelp", context);
        this._getCommandAndAncestors().forEach(
          (command) => command.emit("afterAllHelp", context)
        );
      }
      /**
       * You can pass in flags and a description to customise the built-in help option.
       * Pass in false to disable the built-in help option.
       *
       * @example
       * program.helpOption('-?, --help' 'show help'); // customise
       * program.helpOption(false); // disable
       *
       * @param {(string | boolean)} flags
       * @param {string} [description]
       * @return {Command} `this` command for chaining
       */
      helpOption(flags, description) {
        if (typeof flags === "boolean") {
          if (flags) {
            this._helpOption = this._helpOption ?? void 0;
          } else {
            this._helpOption = null;
          }
          return this;
        }
        flags = flags ?? "-h, --help";
        description = description ?? "display help for command";
        this._helpOption = this.createOption(flags, description);
        return this;
      }
      /**
       * Lazy create help option.
       * Returns null if has been disabled with .helpOption(false).
       *
       * @returns {(Option | null)} the help option
       * @package
       */
      _getHelpOption() {
        if (this._helpOption === void 0) {
          this.helpOption(void 0, void 0);
        }
        return this._helpOption;
      }
      /**
       * Supply your own option to use for the built-in help option.
       * This is an alternative to using helpOption() to customise the flags and description etc.
       *
       * @param {Option} option
       * @return {Command} `this` command for chaining
       */
      addHelpOption(option) {
        this._helpOption = option;
        return this;
      }
      /**
       * Output help information and exit.
       *
       * Outputs built-in help, and custom text added using `.addHelpText()`.
       *
       * @param {{ error: boolean }} [contextOptions] - pass {error:true} to write to stderr instead of stdout
       */
      help(contextOptions) {
        this.outputHelp(contextOptions);
        let exitCode = process2.exitCode || 0;
        if (exitCode === 0 && contextOptions && typeof contextOptions !== "function" && contextOptions.error) {
          exitCode = 1;
        }
        this._exit(exitCode, "commander.help", "(outputHelp)");
      }
      /**
       * Add additional text to be displayed with the built-in help.
       *
       * Position is 'before' or 'after' to affect just this command,
       * and 'beforeAll' or 'afterAll' to affect this command and all its subcommands.
       *
       * @param {string} position - before or after built-in help
       * @param {(string | Function)} text - string to add, or a function returning a string
       * @return {Command} `this` command for chaining
       */
      addHelpText(position, text) {
        const allowedValues = ["beforeAll", "before", "after", "afterAll"];
        if (!allowedValues.includes(position)) {
          throw new Error(`Unexpected value for position to addHelpText.
Expecting one of '${allowedValues.join("', '")}'`);
        }
        const helpEvent = `${position}Help`;
        this.on(helpEvent, (context) => {
          let helpStr;
          if (typeof text === "function") {
            helpStr = text({ error: context.error, command: context.command });
          } else {
            helpStr = text;
          }
          if (helpStr) {
            context.write(`${helpStr}
`);
          }
        });
        return this;
      }
      /**
       * Output help information if help flags specified
       *
       * @param {Array} args - array of options to search for help flags
       * @private
       */
      _outputHelpIfRequested(args) {
        const helpOption = this._getHelpOption();
        const helpRequested = helpOption && args.find((arg) => helpOption.is(arg));
        if (helpRequested) {
          this.outputHelp();
          this._exit(0, "commander.helpDisplayed", "(outputHelp)");
        }
      }
    };
    function incrementNodeInspectorPort(args) {
      return args.map((arg) => {
        if (!arg.startsWith("--inspect")) {
          return arg;
        }
        let debugOption;
        let debugHost = "127.0.0.1";
        let debugPort = "9229";
        let match;
        if ((match = arg.match(/^(--inspect(-brk)?)$/)) !== null) {
          debugOption = match[1];
        } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null) {
          debugOption = match[1];
          if (/^\d+$/.test(match[3])) {
            debugPort = match[3];
          } else {
            debugHost = match[3];
          }
        } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null) {
          debugOption = match[1];
          debugHost = match[3];
          debugPort = match[4];
        }
        if (debugOption && debugPort !== "0") {
          return `${debugOption}=${debugHost}:${parseInt(debugPort) + 1}`;
        }
        return arg;
      });
    }
    exports2.Command = Command2;
  }
});

// node_modules/commander/index.js
var require_commander = __commonJS({
  "node_modules/commander/index.js"(exports2) {
    var { Argument: Argument2 } = require_argument();
    var { Command: Command2 } = require_command();
    var { CommanderError: CommanderError2, InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var { Help: Help2 } = require_help();
    var { Option: Option2 } = require_option();
    exports2.program = new Command2();
    exports2.createCommand = (name) => new Command2(name);
    exports2.createOption = (flags, description) => new Option2(flags, description);
    exports2.createArgument = (name, description) => new Argument2(name, description);
    exports2.Command = Command2;
    exports2.Option = Option2;
    exports2.Argument = Argument2;
    exports2.Help = Help2;
    exports2.CommanderError = CommanderError2;
    exports2.InvalidArgumentError = InvalidArgumentError2;
    exports2.InvalidOptionArgumentError = InvalidArgumentError2;
  }
});

// node_modules/picocolors/picocolors.js
var require_picocolors = __commonJS({
  "node_modules/picocolors/picocolors.js"(exports2, module2) {
    var p = process || {};
    var argv = p.argv || [];
    var env = p.env || {};
    var isColorSupported = !(!!env.NO_COLOR || argv.includes("--no-color")) && (!!env.FORCE_COLOR || argv.includes("--color") || p.platform === "win32" || (p.stdout || {}).isTTY && env.TERM !== "dumb" || !!env.CI);
    var formatter = (open, close, replace = open) => (input) => {
      let string = "" + input, index = string.indexOf(close, open.length);
      return ~index ? open + replaceClose(string, close, replace, index) + close : open + string + close;
    };
    var replaceClose = (string, close, replace, index) => {
      let result = "", cursor = 0;
      do {
        result += string.substring(cursor, index) + replace;
        cursor = index + close.length;
        index = string.indexOf(close, cursor);
      } while (~index);
      return result + string.substring(cursor);
    };
    var createColors = (enabled = isColorSupported) => {
      let f = enabled ? formatter : () => String;
      return {
        isColorSupported: enabled,
        reset: f("\x1B[0m", "\x1B[0m"),
        bold: f("\x1B[1m", "\x1B[22m", "\x1B[22m\x1B[1m"),
        dim: f("\x1B[2m", "\x1B[22m", "\x1B[22m\x1B[2m"),
        italic: f("\x1B[3m", "\x1B[23m"),
        underline: f("\x1B[4m", "\x1B[24m"),
        inverse: f("\x1B[7m", "\x1B[27m"),
        hidden: f("\x1B[8m", "\x1B[28m"),
        strikethrough: f("\x1B[9m", "\x1B[29m"),
        black: f("\x1B[30m", "\x1B[39m"),
        red: f("\x1B[31m", "\x1B[39m"),
        green: f("\x1B[32m", "\x1B[39m"),
        yellow: f("\x1B[33m", "\x1B[39m"),
        blue: f("\x1B[34m", "\x1B[39m"),
        magenta: f("\x1B[35m", "\x1B[39m"),
        cyan: f("\x1B[36m", "\x1B[39m"),
        white: f("\x1B[37m", "\x1B[39m"),
        gray: f("\x1B[90m", "\x1B[39m"),
        bgBlack: f("\x1B[40m", "\x1B[49m"),
        bgRed: f("\x1B[41m", "\x1B[49m"),
        bgGreen: f("\x1B[42m", "\x1B[49m"),
        bgYellow: f("\x1B[43m", "\x1B[49m"),
        bgBlue: f("\x1B[44m", "\x1B[49m"),
        bgMagenta: f("\x1B[45m", "\x1B[49m"),
        bgCyan: f("\x1B[46m", "\x1B[49m"),
        bgWhite: f("\x1B[47m", "\x1B[49m"),
        blackBright: f("\x1B[90m", "\x1B[39m"),
        redBright: f("\x1B[91m", "\x1B[39m"),
        greenBright: f("\x1B[92m", "\x1B[39m"),
        yellowBright: f("\x1B[93m", "\x1B[39m"),
        blueBright: f("\x1B[94m", "\x1B[39m"),
        magentaBright: f("\x1B[95m", "\x1B[39m"),
        cyanBright: f("\x1B[96m", "\x1B[39m"),
        whiteBright: f("\x1B[97m", "\x1B[39m"),
        bgBlackBright: f("\x1B[100m", "\x1B[49m"),
        bgRedBright: f("\x1B[101m", "\x1B[49m"),
        bgGreenBright: f("\x1B[102m", "\x1B[49m"),
        bgYellowBright: f("\x1B[103m", "\x1B[49m"),
        bgBlueBright: f("\x1B[104m", "\x1B[49m"),
        bgMagentaBright: f("\x1B[105m", "\x1B[49m"),
        bgCyanBright: f("\x1B[106m", "\x1B[49m"),
        bgWhiteBright: f("\x1B[107m", "\x1B[49m")
      };
    };
    module2.exports = createColors();
    module2.exports.createColors = createColors;
  }
});

// node_modules/commander/esm.mjs
var import_index = __toESM(require_commander(), 1);
var {
  program,
  createCommand,
  createArgument,
  createOption,
  CommanderError,
  InvalidArgumentError,
  InvalidOptionArgumentError,
  // deprecated old name
  Command,
  Argument,
  Option,
  Help
} = import_index.default;

// src/pan.ts
var import_node_process3 = require("node:process");

// src/auth.ts
var import_node_process2 = require("node:process");

// src/config.ts
var import_node_fs = require("node:fs");
var import_node_os = require("node:os");
var import_node_path = require("node:path");

// src/errors.ts
var ERRNO_MESSAGES = /* @__PURE__ */ new Map([
  [0, "OK"],
  [-6, "\u8EAB\u4EFD\u9A8C\u8BC1\u5931\u8D25"],
  [-7, "\u8FDC\u7AEF\u6587\u4EF6\u540D\u9519\u8BEF"],
  [-8, "\u6587\u4EF6\u540D\u5DF2\u5B58\u5728"],
  [-9, "\u6587\u4EF6\u4E0D\u5B58\u5728"],
  [-10, "\u4E91\u7AEF\u5BB9\u91CF\u5DF2\u6EE1"],
  [2, "\u53C2\u6570\u9519\u8BEF"],
  [6, "\u4E0D\u5141\u8BB8\u63A5\u5165\u7528\u6237\u6570\u636E"],
  [10, "\u521B\u5EFA\u6587\u4EF6\u5931\u8D25,\u672C\u76EE\u5F55\u5DF2\u5B58\u5728\u540C\u540D\u6587\u4EF6"],
  [12, "\u90E8\u5206\u6587\u4EF6\u5DF2\u5B58\u5728"],
  [105, "\u94FE\u63A5\u9519\u8BEF,\u8BF7\u68C0\u67E5\u5206\u4EAB\u94FE\u63A5\u662F\u5426\u6B63\u786E"],
  [110, "access_token \u5DF2\u5931\u6548,\u8BF7\u91CD\u65B0\u767B\u5F55"],
  [111, "access_token \u5DF2\u8FC7\u671F,\u8BF7\u91CD\u65B0\u767B\u5F55"],
  [2131, "\u8BE5\u5206\u4EAB\u4E0D\u5B58\u5728"],
  [13045, "\u4E0D\u5141\u8BB8\u8F6C\u5B58\u81EA\u5DF1\u7684\u5206\u4EAB(\u6587\u4EF6\u5DF2\u7ECF\u5728\u4F60\u7684\u7F51\u76D8\u4E2D)"],
  [31021, "\u7F51\u7EDC\u9519\u8BEF,\u8BF7\u7A0D\u540E\u91CD\u8BD5"],
  [31023, "\u53C2\u6570\u9519\u8BEF"],
  [31024, "\u6CA1\u6709\u7533\u8BF7\u4E0A\u4F20\u6743\u9650"],
  [31034, "\u8BF7\u6C42\u9891\u7387\u8FC7\u9AD8,\u8BF7\u964D\u4F4E\u901F\u7387\u540E\u91CD\u8BD5"],
  [31062, "\u6587\u4EF6\u540D\u65E0\u6548"],
  [31064, "\u4E0D\u5141\u8BB8\u8BBF\u95EE\u8BE5\u76EE\u5F55"],
  [31066, "\u6587\u4EF6\u4E0D\u5B58\u5728\u6216\u5DF2\u5220\u9664"],
  [31075, "\u540C\u540D\u6587\u4EF6\u5DF2\u5B58\u5728"],
  [31202, "\u6587\u4EF6\u4E0D\u5B58\u5728"],
  [31299, "\u7B2C\u4E00\u4E2A\u5206\u7247\u5927\u5C0F\u4E0D\u6B63\u786E"],
  [31363, "\u5206\u7247\u7F3A\u5931"],
  [31364, "\u5206\u7247\u5927\u5C0F\u8D85\u51FA\u9650\u5236"],
  [31390, "access_token \u5931\u6548\u6216\u6743\u9650\u4E0D\u8DB3,\u8BF7\u91CD\u65B0\u767B\u5F55"],
  [31399, "\u8C03\u7528\u592A\u9891\u7E41,\u8BF7\u7A0D\u540E\u518D\u8BD5"],
  [42e3, "\u670D\u52A1\u5F02\u5E38,\u8BF7\u7A0D\u540E\u518D\u8BD5"],
  [42213, "\u6CA1\u6709\u8BE5\u63A5\u53E3\u6743\u9650,\u8BF7\u786E\u8BA4\u5E94\u7528\u5DF2\u52FE\u9009 netdisk \u6743\u9650"],
  [42214, "\u8C03\u7528\u9891\u7387\u8D85\u9650,\u8BF7\u964D\u4F4E\u8BF7\u6C42\u901F\u7387"]
]);
function mapErrno(errno, fallback) {
  const known = ERRNO_MESSAGES.get(errno);
  if (known)
    return known;
  if (fallback)
    return `${fallback}(errno=${errno})`;
  return `\u767E\u5EA6\u7F51\u76D8\u8FD4\u56DE\u9519\u8BEF(errno=${errno})`;
}
var BaiduError = class extends Error {
  errno;
  endpoint;
  raw;
  constructor(errno, message, opts) {
    super(message);
    this.name = "BaiduError";
    this.errno = errno;
    this.endpoint = opts?.endpoint;
    this.raw = opts?.raw;
  }
};
var AuthError = class extends Error {
  cause;
  constructor(message, cause) {
    super(message);
    this.name = "AuthError";
    this.cause = cause;
  }
};
var ScopeError = class extends Error {
  path;
  scope;
  constructor(path, scope, message) {
    super(
      message ?? `\u8DEF\u5F84 ${path} \u8D85\u51FA\u5F53\u524D\u4F5C\u7528\u57DF(${scope})\u3002\u8BF7\u7528 \`pan.cjs scope\` \u5207\u6362\u6216\u8C03\u6574 \`allowedPaths\`\u3002`
    );
    this.name = "ScopeError";
    this.path = path;
    this.scope = scope;
  }
};
var PolicyError = class extends Error {
  reason;
  constructor(reason, message) {
    super(message ?? reason);
    this.name = "PolicyError";
    this.reason = reason;
  }
};
var ConfigError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "ConfigError";
  }
};
var HttpError = class extends Error {
  status;
  endpoint;
  constructor(status, endpoint, message) {
    super(message ?? `HTTP ${status} from ${endpoint}`);
    this.name = "HttpError";
    this.status = status;
    this.endpoint = endpoint;
  }
};
function formatError(err) {
  if (err instanceof BaiduError) {
    const ep = err.endpoint ? ` [${err.endpoint}]` : "";
    return `${err.message}${ep}`;
  }
  if (err instanceof ScopeError)
    return err.message;
  if (err instanceof PolicyError)
    return `\u7B56\u7565\u62D2\u7EDD: ${err.message}`;
  if (err instanceof AuthError)
    return `\u8BA4\u8BC1\u5931\u8D25: ${err.message}`;
  if (err instanceof ConfigError)
    return `\u914D\u7F6E\u9519\u8BEF: ${err.message}`;
  if (err instanceof HttpError)
    return err.message;
  if (err instanceof Error)
    return err.message;
  return String(err);
}

// src/config.ts
var DEFAULT_CONFIG = {
  scope: "sandbox",
  appName: "myapp",
  allowedPaths: [],
  trash: { retainDays: 7 },
  concurrency: { uploadParts: 4, downloadChunks: 4 },
  version: 1,
  activeProfile: "default"
};
function getConfigDir() {
  const env = process.env.BAIDU_DRIVE_CONFIG_DIR;
  if (env && env.trim().length > 0)
    return (0, import_node_path.resolve)(env);
  if ((0, import_node_os.platform)() === "win32") {
    const appData = process.env.APPDATA;
    if (appData)
      return (0, import_node_path.join)(appData, "baidu-drive-skill");
    return (0, import_node_path.join)((0, import_node_os.homedir)(), "AppData", "Roaming", "baidu-drive-skill");
  }
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg && xdg.trim().length > 0)
    return (0, import_node_path.join)(xdg, "baidu-drive-skill");
  return (0, import_node_path.join)((0, import_node_os.homedir)(), ".config", "baidu-drive-skill");
}
function getConfigPath() {
  return (0, import_node_path.join)(getConfigDir(), "config.json");
}
function getTokenPath(profile) {
  const base = (0, import_node_path.join)(getConfigDir(), profile ? `token.${profile}.json` : "token.json");
  return base;
}
function listProfiles() {
  const dir = getConfigDir();
  if (!(0, import_node_fs.existsSync)(dir))
    return ["default"];
  const files = require("node:fs").readdirSync(dir);
  const profiles = /* @__PURE__ */ new Set(["default"]);
  for (const f of files) {
    const m = f.match(/^token\.(.+)\.json$/);
    if (m)
      profiles.add(m[1]);
  }
  return Array.from(profiles).sort();
}
function ensureConfigDir() {
  const dir = getConfigDir();
  if (!(0, import_node_fs.existsSync)(dir)) {
    (0, import_node_fs.mkdirSync)(dir, { recursive: true, mode: 448 });
  }
}
var TOKEN_PERMS_MASK = 63;
function assertSecurePerms(filePath) {
  if ((0, import_node_os.platform)() === "win32")
    return true;
  if (!(0, import_node_fs.existsSync)(filePath))
    return true;
  try {
    const st = (0, import_node_fs.statSync)(filePath);
    if ((st.mode & TOKEN_PERMS_MASK) !== 0) {
      try {
        (0, import_node_fs.chmodSync)(filePath, 384);
        return false;
      } catch {
        return false;
      }
    }
    return true;
  } catch {
    return true;
  }
}
function isValidScope(v) {
  return v === "sandbox" || v === "full";
}
function validateConfig(raw) {
  if (typeof raw !== "object" || raw === null) {
    throw new ConfigError("config.json \u4E0D\u662F\u5408\u6CD5\u5BF9\u8C61");
  }
  const r = raw;
  const scope = r.scope ?? DEFAULT_CONFIG.scope;
  if (!isValidScope(scope)) {
    throw new ConfigError(`config.json scope \u5B57\u6BB5\u5FC5\u987B\u662F "sandbox" \u6216 "full",\u5B9E\u9645\u4E3A ${String(scope)}`);
  }
  const appName = typeof r.appName === "string" && r.appName.length > 0 ? r.appName : DEFAULT_CONFIG.appName;
  const allowedPaths = Array.isArray(r.allowedPaths) ? r.allowedPaths.filter((x) => typeof x === "string") : DEFAULT_CONFIG.allowedPaths;
  let app;
  if (r.app && typeof r.app === "object") {
    const a = r.app;
    if (typeof a.clientId === "string" && typeof a.clientSecret === "string") {
      app = { clientId: a.clientId, clientSecret: a.clientSecret };
    }
  }
  const trash = r.trash && typeof r.trash === "object" ? r.trash : DEFAULT_CONFIG.trash;
  const concurrency = r.concurrency && typeof r.concurrency === "object" ? r.concurrency : DEFAULT_CONFIG.concurrency;
  return {
    scope,
    appName,
    allowedPaths,
    app,
    trash: {
      retainDays: typeof trash.retainDays === "number" && trash.retainDays > 0 ? trash.retainDays : DEFAULT_CONFIG.trash.retainDays
    },
    concurrency: {
      uploadParts: typeof concurrency.uploadParts === "number" && concurrency.uploadParts > 0 ? concurrency.uploadParts : DEFAULT_CONFIG.concurrency.uploadParts,
      downloadChunks: typeof concurrency.downloadChunks === "number" && concurrency.downloadChunks > 0 ? concurrency.downloadChunks : DEFAULT_CONFIG.concurrency.downloadChunks
    },
    version: typeof r.version === "number" ? r.version : DEFAULT_CONFIG.version,
    activeProfile: typeof r.activeProfile === "string" && r.activeProfile.length > 0 ? r.activeProfile : DEFAULT_CONFIG.activeProfile
  };
}
function loadConfig() {
  const path = getConfigPath();
  const cfg = (0, import_node_fs.existsSync)(path) ? (() => {
    let txt;
    try {
      txt = (0, import_node_fs.readFileSync)(path, "utf-8");
    } catch (e) {
      throw new ConfigError(`\u65E0\u6CD5\u8BFB\u53D6 ${path}: ${e.message}`);
    }
    let raw;
    try {
      raw = JSON.parse(txt);
    } catch (e) {
      throw new ConfigError(`${path} \u4E0D\u662F\u5408\u6CD5 JSON: ${e.message}`);
    }
    return validateConfig(raw);
  })() : { ...DEFAULT_CONFIG };
  const envScope = process.env.BAIDU_DRIVE_SCOPE;
  if (envScope === "sandbox" || envScope === "full") {
    cfg.scope = envScope;
  }
  const envAppName = process.env.BAIDU_DRIVE_APP_NAME;
  if (envAppName && envAppName.trim().length > 0) {
    cfg.appName = envAppName.trim();
  }
  const envAllowed = process.env.BAIDU_DRIVE_ALLOWED_PATHS;
  if (envAllowed) {
    cfg.allowedPaths = envAllowed.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return cfg;
}
function saveConfig(cfg) {
  ensureConfigDir();
  const path = getConfigPath();
  (0, import_node_fs.writeFileSync)(path, JSON.stringify(cfg, null, 2) + "\n", "utf-8");
  if ((0, import_node_os.platform)() !== "win32") {
    try {
      (0, import_node_fs.chmodSync)(path, 384);
    } catch {
    }
  }
}
function validateToken(raw) {
  if (typeof raw !== "object" || raw === null) {
    throw new ConfigError("token.json \u4E0D\u662F\u5408\u6CD5\u5BF9\u8C61,\u8BF7\u91CD\u65B0\u767B\u5F55\u3002");
  }
  const r = raw;
  const access_token = r.access_token;
  if (typeof access_token !== "string" || access_token.length === 0) {
    throw new ConfigError("token.json \u7F3A\u5C11 access_token,\u8BF7\u91CD\u65B0\u767B\u5F55\u3002");
  }
  const expires_at = typeof r.expires_at === "number" ? r.expires_at : 0;
  const obtained_at = typeof r.obtained_at === "number" ? r.obtained_at : Math.floor(Date.now() / 1e3);
  const kind = r.kind === "oob" || r.kind === "manual" ? r.kind : "device";
  const scope = typeof r.scope === "string" ? r.scope : "basic,netdisk";
  const refresh_token = typeof r.refresh_token === "string" ? r.refresh_token : void 0;
  const user_id = typeof r.user_id === "string" ? r.user_id : void 0;
  return { access_token, refresh_token, expires_at, obtained_at, kind, scope, user_id };
}
function loadToken(profile) {
  const path = getTokenPath(profile);
  if (!(0, import_node_fs.existsSync)(path))
    return null;
  assertSecurePerms(path);
  let txt;
  try {
    txt = (0, import_node_fs.readFileSync)(path, "utf-8");
  } catch (e) {
    throw new ConfigError(`\u65E0\u6CD5\u8BFB\u53D6 ${path}: ${e.message}`);
  }
  let raw;
  try {
    raw = JSON.parse(txt);
  } catch (e) {
    throw new ConfigError(`${path} \u4E0D\u662F\u5408\u6CD5 JSON: ${e.message}`);
  }
  return validateToken(raw);
}
function saveToken(t, profile) {
  ensureConfigDir();
  const path = getTokenPath(profile);
  (0, import_node_fs.writeFileSync)(path, JSON.stringify(t, null, 2) + "\n", { encoding: "utf-8", mode: 384 });
  if ((0, import_node_os.platform)() !== "win32") {
    try {
      (0, import_node_fs.chmodSync)(path, 384);
    } catch {
    }
  }
}
function deleteToken(profile) {
  const path = getTokenPath(profile);
  if (!(0, import_node_fs.existsSync)(path))
    return;
  try {
    const overlay = "\0".repeat(64);
    (0, import_node_fs.writeFileSync)(path, overlay, "utf-8");
  } catch {
  }
  try {
    (0, import_node_fs.unlinkSync)(path);
  } catch {
  }
}

// src/ui.ts
var import_node_readline = require("node:readline");
var import_node_process = require("node:process");
var import_picocolors = __toESM(require_picocolors(), 1);
function isAgentEnv() {
  return Boolean(
    process.env.CLAUDE_CODE || process.env.CLAUDECODE || process.env.ANTHROPIC_API_KEY || process.env.MCP_SERVER || process.env.MCP_SERVER_NAME || process.env.AGENT_MODE
  );
}
function colorEnabled() {
  if (process.env.NO_COLOR)
    return false;
  if (process.env.FORCE_COLOR)
    return true;
  return Boolean(import_node_process.stdout.isTTY);
}
var color = {
  red: (s) => colorEnabled() ? import_picocolors.default.red(s) : s,
  green: (s) => colorEnabled() ? import_picocolors.default.green(s) : s,
  yellow: (s) => colorEnabled() ? import_picocolors.default.yellow(s) : s,
  blue: (s) => colorEnabled() ? import_picocolors.default.blue(s) : s,
  cyan: (s) => colorEnabled() ? import_picocolors.default.cyan(s) : s,
  gray: (s) => colorEnabled() ? import_picocolors.default.gray(s) : s,
  bold: (s) => colorEnabled() ? import_picocolors.default.bold(s) : s,
  dim: (s) => colorEnabled() ? import_picocolors.default.dim(s) : s,
  underline: (s) => colorEnabled() ? import_picocolors.default.underline(s) : s
};
function info(msg) {
  import_node_process.stdout.write(msg + "\n");
}
function warn(msg) {
  import_node_process.stderr.write(color.yellow("\u26A0 ") + msg + "\n");
}
function error(msg) {
  import_node_process.stderr.write(color.red("\u2716 ") + msg + "\n");
}
function success(msg) {
  import_node_process.stdout.write(color.green("\u2713 ") + msg + "\n");
}
var SUPPORTS_OSC8 = (() => {
  if (!import_node_process.stdout.isTTY)
    return false;
  if (process.env.TERM_PROGRAM === "Apple_Terminal") {
    return false;
  }
  if (process.env.TERM === "dumb")
    return false;
  return true;
})();
function osc8(text, url) {
  if (SUPPORTS_OSC8) {
    return `\x1B]8;;${url}\x1B\\${text}\x1B]8;;\x1B\\`;
  }
  if (text === url)
    return text;
  return `${text} (${url})`;
}
async function prompt(question) {
  if (!import_node_process.stdin.readable || import_node_process.stdin.destroyed) {
    throw new Error("stdin \u4E0D\u53EF\u8BFB,\u65E0\u6CD5\u8BFB\u53D6\u7528\u6237\u8F93\u5165");
  }
  return new Promise((resolve2) => {
    const rl = (0, import_node_readline.createInterface)({ input: import_node_process.stdin, output: import_node_process.stderr, terminal: import_node_process.stdout.isTTY });
    rl.question(question, (answer) => {
      rl.close();
      resolve2(answer);
    });
  });
}
async function promptHidden(question) {
  if (!import_node_process.stdin.isTTY) {
    return prompt(question);
  }
  return new Promise((resolve2, reject) => {
    import_node_process.stderr.write(question);
    const oldRaw = import_node_process.stdin.isRaw ?? false;
    import_node_process.stdin.setRawMode?.(true);
    import_node_process.stdin.resume();
    import_node_process.stdin.setEncoding("utf8");
    let buf = "";
    const onData = (chunk) => {
      for (const ch of chunk) {
        const code = ch.charCodeAt(0);
        if (code === 13 || code === 10) {
          import_node_process.stdin.removeListener("data", onData);
          import_node_process.stdin.setRawMode?.(oldRaw);
          import_node_process.stdin.pause();
          import_node_process.stderr.write("\n");
          resolve2(buf);
          return;
        } else if (code === 3) {
          import_node_process.stdin.removeListener("data", onData);
          import_node_process.stdin.setRawMode?.(oldRaw);
          import_node_process.stdin.pause();
          import_node_process.stderr.write("\n");
          reject(new Error("\u7528\u6237\u53D6\u6D88(Ctrl-C)"));
          return;
        } else if (code === 127 || code === 8) {
          if (buf.length > 0) {
            buf = buf.slice(0, -1);
            import_node_process.stderr.write("\b \b");
          }
        } else {
          buf += ch;
          import_node_process.stderr.write("*");
        }
      }
    };
    import_node_process.stdin.on("data", onData);
  });
}
async function confirmExactString(expected, question = "\u8BF7\u9010\u5B57\u8F93\u5165\u4EE5\u786E\u8BA4:") {
  const ans = (await prompt(`${question} `)).trimEnd();
  return { ok: ans === expected, given: ans };
}
async function confirmYesNo(question, defaultNo = true) {
  const hint = defaultNo ? "[y/N]" : "[Y/n]";
  const ans = (await prompt(`${question} ${hint} `)).trim().toLowerCase();
  if (ans === "")
    return !defaultNo;
  return ans === "y" || ans === "yes" || ans === "\u662F" || ans === "\u786E\u8BA4";
}
var ProgressBar = class {
  current = 0;
  total;
  label;
  width;
  start = Date.now();
  lastRender = 0;
  rendered = false;
  constructor(opts) {
    this.total = Math.max(1, opts.total);
    this.label = opts.label ?? "";
    this.width = opts.width ?? 30;
  }
  update(current) {
    this.current = Math.min(this.total, current);
    const now = Date.now();
    if (now - this.lastRender < 80 && this.current < this.total)
      return;
    this.lastRender = now;
    this.render();
  }
  add(delta) {
    this.update(this.current + delta);
  }
  done() {
    this.current = this.total;
    this.render();
    if (import_node_process.stdout.isTTY)
      import_node_process.stdout.write("\n");
  }
  render() {
    const pct = this.current / this.total;
    const filled = Math.round(this.width * pct);
    const bar = "\u2588".repeat(filled) + "\u2591".repeat(this.width - filled);
    const speedHuman = this.formatSpeed();
    const out = `${this.label} [${bar}] ${(pct * 100).toFixed(1)}%  ${formatBytes(this.current)} / ${formatBytes(this.total)}  ${speedHuman}`;
    if (import_node_process.stdout.isTTY) {
      import_node_process.stdout.write("\r" + out);
      this.rendered = true;
    } else if (!this.rendered) {
      import_node_process.stdout.write(out + "\n");
      this.rendered = true;
    }
  }
  formatSpeed() {
    const elapsed = (Date.now() - this.start) / 1e3;
    if (elapsed <= 0)
      return "";
    const bps = this.current / elapsed;
    return `${formatBytes(bps)}/s`;
  }
};
function formatBytes(bytes) {
  if (bytes < 0)
    return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}
function formatTime(unix) {
  if (!unix || unix <= 0)
    return "-";
  const d = new Date(unix * 1e3);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// src/auth.ts
var OAUTH_BASE = "https://openapi.baidu.com/oauth/2.0";
var DEVICE_ENDPOINT = `${OAUTH_BASE}/device/code`;
var TOKEN_ENDPOINT = `${OAUTH_BASE}/token`;
var AUTHORIZE_ENDPOINT = `${OAUTH_BASE}/authorize`;
var DEFAULT_SCOPE = "basic,netdisk";
var REFRESH_THRESHOLD_SECONDS = 600;
function resolveCredentials(cfg, opts = {}) {
  const clientId = opts.clientId ?? process.env.BAIDU_DRIVE_APP_ID ?? cfg.app?.clientId;
  const clientSecret = opts.clientSecret ?? process.env.BAIDU_DRIVE_APP_SECRET ?? cfg.app?.clientSecret;
  if (!clientId || !clientSecret) {
    throw new AuthError(
      [
        "\u672A\u627E\u5230 OAuth \u5BA2\u6237\u7AEF\u51ED\u636E\u3002\u8BF7\u6309\u4EE5\u4E0B\u4EFB\u4E00\u65B9\u5F0F\u914D\u7F6E:",
        "  1) \u5728\u767E\u5EA6\u7F51\u76D8\u5F00\u653E\u5E73\u53F0\u6CE8\u518C\u81EA\u6709\u5E94\u7528,\u628A AppKey / SecretKey \u5199\u5165",
        "     config.json \u7684 `app.clientId` \u4E0E `app.clientSecret`",
        "  2) \u8BBE\u7F6E\u73AF\u5883\u53D8\u91CF BAIDU_DRIVE_APP_ID / BAIDU_DRIVE_APP_SECRET",
        "  3) \u6216\u76F4\u63A5 `pan.cjs login --manual`(\u9650\u65F6\u4F53\u9A8C,\u4E0D\u80FD\u81EA\u52A8\u7EED\u671F)",
        "",
        "\u6CE8\u518C\u5730\u5740: https://pan.baidu.com/union/console/applist"
      ].join("\n")
    );
  }
  return { clientId, clientSecret };
}
async function oauthGet(url, params, signal) {
  const usp = new URLSearchParams(params);
  const full = `${url}?${usp.toString()}`;
  let res;
  try {
    res = await fetch(full, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal
    });
  } catch (e) {
    throw new AuthError(`\u8BF7\u6C42 OAuth \u7AEF\u70B9\u5931\u8D25: ${e.message}`, e);
  }
  let bodyTxt = "";
  try {
    bodyTxt = await res.text();
  } catch (e) {
    throw new AuthError(`\u8BFB\u53D6 OAuth \u54CD\u5E94\u5931\u8D25: ${e.message}`);
  }
  let json;
  try {
    json = JSON.parse(bodyTxt);
  } catch {
    json = void 0;
  }
  if (json && typeof json === "object") {
    return json;
  }
  if (!res.ok) {
    throw new AuthError(`OAuth \u7AEF\u70B9\u8FD4\u56DE HTTP ${res.status}: ${bodyTxt.slice(0, 200)}`);
  }
  throw new AuthError(`OAuth \u54CD\u5E94\u4E0D\u662F\u5408\u6CD5 JSON: ${bodyTxt.slice(0, 200)}`);
}
function buildTokenFile(raw, kind) {
  if (!raw.access_token) {
    throw new AuthError(
      raw.error ? `OAuth \u5931\u8D25: ${raw.error}${raw.error_description ? " \u2014 " + raw.error_description : ""}` : "OAuth \u54CD\u5E94\u7F3A\u5C11 access_token"
    );
  }
  const now = Math.floor(Date.now() / 1e3);
  const expiresIn = typeof raw.expires_in === "number" ? raw.expires_in : 0;
  return {
    access_token: raw.access_token,
    refresh_token: raw.refresh_token,
    expires_at: expiresIn > 0 ? now + expiresIn : now + 3600 * 24 * 30,
    obtained_at: now,
    kind,
    scope: raw.scope ?? DEFAULT_SCOPE
  };
}
async function startDeviceCodeFlow(creds) {
  const raw = await oauthGet(DEVICE_ENDPOINT, {
    response_type: "device_code",
    client_id: creds.clientId,
    scope: DEFAULT_SCOPE
  });
  if (raw.error || !raw.device_code || !raw.user_code || !raw.verification_url) {
    throw new AuthError(
      raw.error ? `device code \u7533\u8BF7\u5931\u8D25: ${raw.error}${raw.error_description ? " \u2014 " + raw.error_description : ""}` : "device code \u54CD\u5E94\u4E0D\u5B8C\u6574"
    );
  }
  return {
    device_code: raw.device_code,
    user_code: raw.user_code,
    verification_url: raw.verification_url,
    qrcode_url: raw.qrcode_url,
    expires_in: raw.expires_in ?? 1800,
    interval: raw.interval ?? 5
  };
}
async function pollDeviceToken(creds, device, abortSignal) {
  const start = Date.now();
  let interval = device.interval * 1e3;
  const expiresAt = start + device.expires_in * 1e3;
  for (; ; ) {
    if (Date.now() >= expiresAt) {
      throw new AuthError("\u6388\u6743\u7801\u8D85\u65F6,\u8BF7\u91CD\u65B0\u6267\u884C `pan.cjs login`\u3002");
    }
    if (abortSignal?.aborted) {
      throw new AuthError("\u7528\u6237\u53D6\u6D88\u767B\u5F55");
    }
    await sleep(interval);
    let raw;
    try {
      raw = await oauthGet(TOKEN_ENDPOINT, {
        grant_type: "device_token",
        code: device.device_code,
        client_id: creds.clientId,
        client_secret: creds.clientSecret
      });
    } catch (e) {
      import_node_process2.stderr.write(color.dim(`(\u8F6E\u8BE2\u5931\u8D25,\u7EE7\u7EED\u7B49\u5F85: ${e.message})
`));
      continue;
    }
    if (raw.access_token) {
      const t = buildTokenFile(raw, "device");
      saveToken(t);
      return t;
    }
    const err = raw.error ?? "";
    switch (err) {
      case "authorization_pending":
        break;
      case "slow_down":
        interval = Math.min(interval * 2, 30 * 1e3);
        break;
      case "expired_token":
        throw new AuthError("device_code \u5DF2\u8FC7\u671F,\u8BF7\u91CD\u65B0\u6267\u884C `pan.cjs login`\u3002");
      case "authorization_declined":
      case "access_denied":
        throw new AuthError("\u7528\u6237\u62D2\u7EDD\u4E86\u6388\u6743\u8BF7\u6C42\u3002");
      default:
        if (err) {
          throw new AuthError(`OAuth \u9519\u8BEF: ${err}${raw.error_description ? " \u2014 " + raw.error_description : ""}`);
        }
        break;
    }
  }
}
async function loginDevice(cfg, opts = {}) {
  const creds = resolveCredentials(cfg, opts);
  const dev = await startDeviceCodeFlow(creds);
  info("");
  info(color.bold("\u8BF7\u5728\u6D4F\u89C8\u5668\u6253\u5F00\u4E0B\u9762\u7684\u94FE\u63A5,\u767B\u5F55\u767E\u5EA6\u8D26\u53F7\u5E76\u8F93\u5165\u6388\u6743\u7801:"));
  info("  " + osc8(dev.verification_url, dev.verification_url));
  info("");
  info(color.bold("\u6388\u6743\u7801: ") + color.cyan(dev.user_code));
  if (dev.qrcode_url) {
    info(color.dim("\u6216\u626B\u63CF\u4E8C\u7EF4\u7801: " + dev.qrcode_url));
  }
  info(color.dim(`\u6388\u6743\u7A97\u53E3 ${Math.round(dev.expires_in / 60)} \u5206\u949F\u5185\u6709\u6548\u3002\u7B49\u5F85\u7528\u6237\u6388\u6743...`));
  return pollDeviceToken(creds, dev);
}
function buildOobAuthorizeUrl(creds) {
  const usp = new URLSearchParams({
    response_type: "code",
    client_id: creds.clientId,
    redirect_uri: "oob",
    scope: DEFAULT_SCOPE,
    display: "page"
  });
  return `${AUTHORIZE_ENDPOINT}?${usp.toString()}`;
}
async function exchangeOobCode(creds, code) {
  const trimmed = code.trim();
  if (!/^[0-9a-fA-F]{32,}$/.test(trimmed)) {
    throw new AuthError("\u6388\u6743\u7801\u683C\u5F0F\u9519\u8BEF,\u5E94\u4E3A 32 \u4F4D\u5341\u516D\u8FDB\u5236\u5B57\u7B26\u3002");
  }
  const raw = await oauthGet(TOKEN_ENDPOINT, {
    grant_type: "authorization_code",
    code: trimmed,
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    redirect_uri: "oob"
  });
  const t = buildTokenFile(raw, "oob");
  saveToken(t);
  return t;
}
async function loginManual(rawAccessToken, expiresInSec = 86400, scope = DEFAULT_SCOPE) {
  const tok = rawAccessToken.trim();
  if (tok.length < 10) {
    throw new AuthError("\u7C98\u8D34\u7684 access_token \u770B\u8D77\u6765\u4E0D\u5408\u6CD5(\u8FC7\u77ED)\u3002");
  }
  const now = Math.floor(Date.now() / 1e3);
  const t = {
    access_token: tok,
    expires_at: now + expiresInSec,
    obtained_at: now,
    kind: "manual",
    scope
  };
  saveToken(t);
  return t;
}
async function refreshToken(cfg, current, opts = {}) {
  if (current.kind === "manual") {
    throw new AuthError(
      "manual \u6A21\u5F0F\u4E0B\u7684 access_token \u65E0\u6CD5\u81EA\u52A8\u7EED\u671F\u3002\u8BF7\u91CD\u65B0\u6267\u884C `pan.cjs login --manual` \u7C98\u8D34\u65B0 token\u3002"
    );
  }
  if (!current.refresh_token) {
    throw new AuthError("\u5F53\u524D token \u6CA1\u6709 refresh_token,\u8BF7\u91CD\u65B0\u6267\u884C `pan.cjs login`\u3002");
  }
  const creds = resolveCredentials(cfg, opts);
  const raw = await oauthGet(TOKEN_ENDPOINT, {
    grant_type: "refresh_token",
    refresh_token: current.refresh_token,
    client_id: creds.clientId,
    client_secret: creds.clientSecret
  });
  if (raw.error || !raw.access_token) {
    throw new AuthError(
      raw.error ? `\u5237\u65B0 token \u5931\u8D25: ${raw.error}${raw.error_description ? " \u2014 " + raw.error_description : ""}` : "\u5237\u65B0 token \u5931\u8D25:\u54CD\u5E94\u7F3A\u5C11 access_token"
    );
  }
  const t = buildTokenFile(raw, current.kind);
  saveToken(t);
  return t;
}
async function refreshIfNeeded(cfg, opts = {}) {
  const cur = loadToken();
  if (!cur) {
    throw new AuthError("\u5C1A\u672A\u767B\u5F55\u3002\u8BF7\u8FD0\u884C `pan.cjs login`\u3002");
  }
  const now = Math.floor(Date.now() / 1e3);
  if (cur.expires_at - now > REFRESH_THRESHOLD_SECONDS) {
    return cur;
  }
  if (cur.kind === "manual") {
    if (cur.expires_at <= now) {
      throw new AuthError(
        "manual access_token \u5DF2\u8FC7\u671F,\u8BF7\u8FD0\u884C `pan.cjs login --manual` \u91CD\u65B0\u7C98\u8D34\u3002"
      );
    }
    return cur;
  }
  return refreshToken(cfg, cur, opts);
}
async function getAccessToken(cfg, opts = {}) {
  const t = await refreshIfNeeded(cfg, opts);
  return t.access_token;
}
function logout(profile) {
  deleteToken(profile);
}
function sleep(ms) {
  return new Promise((resolve2) => setTimeout(resolve2, ms));
}

// src/login.ts
var DISCLAIMER = `
${color.bold(color.yellow("\u26A0 \u767B\u5F55\u524D\u8BF7\u9605\u8BFB"))}
\u672C skill \u901A\u8FC7\u767E\u5EA6\u7F51\u76D8 OpenAPI \u64CD\u4F5C\u4F60\u7684\u7F51\u76D8\u3002\u5728\u6267\u884C\u767B\u5F55\u524D\u8BF7\u786E\u8BA4:

  1. \u4F60\u5DF2 ${color.bold("\u5907\u4EFD\u91CD\u8981\u6570\u636E")}\u3002\u672C skill \u5904\u4E8E BETA \u9636\u6BB5,\u4EBA\u4E3A\u64CD\u4F5C\u6216 AI \u8BEF\u5224\u90FD\u53EF\u80FD\u5BFC\u81F4\u6570\u636E\u4E22\u5931\u3002
  2. \u4F60\u4F1A ${color.bold("\u4EBA\u5DE5\u5BA1\u6838\u6BCF\u6761 AI \u6267\u884C\u7684\u547D\u4EE4")},\u5C24\u5176\u662F upload / mv / rename / rm\u3002
  3. \u516C\u5171\u73AF\u5883(\u5171\u4EAB\u673A\u5668\u3001Codespace\u3001\u5BB9\u5668)\u4F7F\u7528\u5B8C\u540E\u8BF7\u8FD0\u884C ${color.cyan("pan.cjs logout")}\u3002
  4. ${color.bold("\u4E25\u7981")} \u628A ~/.config/baidu-drive-skill/token.json \u7684\u5185\u5BB9\u7C98\u8D34\u5230\u4EFB\u4F55\u5BF9\u8BDD\u6216\u65E5\u5FD7\u91CC\u3002
`;
async function runLogin(opts) {
  const cfg = loadConfig();
  const credsOpts = {
    clientId: opts.clientId,
    clientSecret: opts.clientSecret
  };
  const mode = opts.mode ?? "auto";
  if (!opts.skipDisclaimer || isAgentEnv()) {
    if (opts.skipDisclaimer && isAgentEnv()) {
      warn("\u68C0\u6D4B\u5230 Agent \u73AF\u5883,--yes \u88AB\u5FFD\u7565,\u4ECD\u8981\u6C42\u4EBA\u5DE5\u786E\u8BA4\u767B\u5F55\u514D\u8D23\u58F0\u660E\u3002");
    }
    info(DISCLAIMER);
    const ok = (await prompt("\u662F\u5426\u7EE7\u7EED\u767B\u5F55? [y/N] ")).trim().toLowerCase();
    if (ok !== "y" && ok !== "yes") {
      info("\u5DF2\u53D6\u6D88\u767B\u5F55\u3002");
      return;
    }
  }
  const resolvedMode = mode === "auto" ? pickAuto() : mode;
  switch (resolvedMode) {
    case "device":
      await runDeviceLogin(cfg, credsOpts);
      return;
    case "oob":
      await runOobLogin(cfg, credsOpts);
      return;
    case "manual":
      await runManualLogin(opts.token);
      return;
    default:
      throw new AuthError(`\u672A\u77E5\u767B\u5F55\u6A21\u5F0F: ${String(resolvedMode)}`);
  }
}
function pickAuto() {
  return "device";
}
async function runDeviceLogin(cfg, creds) {
  resolveCredentials(cfg, creds);
  info("");
  info(color.bold("=== \u767B\u5F55\u65B9\u5F0F: device code (\u626B\u7801 / \u5728\u7EBF\u6388\u6743) ==="));
  const tok = await loginDevice(cfg, creds);
  success(`\u767B\u5F55\u6210\u529F\u3002token \u6709\u6548\u671F\u81F3: ${formatExpiry(tok.expires_at)}`);
}
async function runOobLogin(cfg, creds) {
  const resolved = resolveCredentials(cfg, creds);
  info("");
  info(color.bold("=== \u767B\u5F55\u65B9\u5F0F: OOB authorization code (\u65E0\u6D4F\u89C8\u5668/SSH \u7528) ==="));
  const url = buildOobAuthorizeUrl(resolved);
  info("1) \u5728\u6D4F\u89C8\u5668\u6253\u5F00\u4E0B\u9762\u7684\u94FE\u63A5,\u767B\u5F55\u767E\u5EA6\u8D26\u53F7\u5E76\u5141\u8BB8\u6388\u6743:");
  info("   " + osc8(url, url));
  info("2) \u6388\u6743\u540E\u9875\u9762\u4F1A\u663E\u793A\u4E00\u4E32 32 \u4F4D\u7684\u6388\u6743\u7801\u3002");
  info("3) \u628A\u6388\u6743\u7801\u7C98\u8D34\u5230\u4E0B\u9762(\u9690\u85CF\u8F93\u5165,Enter \u63D0\u4EA4):");
  const code = await promptHidden("\u6388\u6743\u7801: ");
  if (!code || code.trim().length === 0) {
    warn("\u6388\u6743\u7801\u4E3A\u7A7A,\u5DF2\u53D6\u6D88\u767B\u5F55\u3002");
    return;
  }
  const tok = await exchangeOobCode(resolved, code);
  success(`\u767B\u5F55\u6210\u529F\u3002token \u6709\u6548\u671F\u81F3: ${formatExpiry(tok.expires_at)}`);
}
async function runManualLogin(presetToken) {
  info("");
  info(color.bold("=== \u767B\u5F55\u65B9\u5F0F: manual paste (\u9650\u65F6\u4F53\u9A8C) ==="));
  warn("manual \u6A21\u5F0F\u4E0B\u6CA1\u6709 refresh_token,\u8FC7\u671F\u540E\u5FC5\u987B\u91CD\u65B0\u7C98\u8D34\u3002\u4EC5\u63A8\u8350\u7528\u4E8E\u77ED\u671F\u8BD5\u7528\u3002");
  const token = presetToken ?? await promptHidden("access_token: ");
  if (!token || token.trim().length === 0) {
    warn("access_token \u4E3A\u7A7A,\u5DF2\u53D6\u6D88\u767B\u5F55\u3002");
    return;
  }
  const tok = await loginManual(token);
  success(`\u5DF2\u4FDD\u5B58 manual token,\u8FC7\u671F\u65F6\u95F4 \u2248 ${formatExpiry(tok.expires_at)}(\u65E0\u81EA\u52A8\u7EED\u671F)\u3002`);
}
function formatExpiry(unix) {
  const d = new Date(unix * 1e3);
  return d.toISOString().replace("T", " ").slice(0, 19) + " (UTC)";
}

// src/client.ts
var HOST_XPAN = "https://pan.baidu.com";
var HOST_PCS_UPLOAD = "https://d.pcs.baidu.com";
var DEFAULT_UA = "baidu-drive-pro/0.0.1-alpha";
var DLINK_UA = "pan.baidu.com";
var ENDPOINTS = {
  fileList: "/rest/2.0/xpan/file?method=list",
  fileSearch: "/rest/2.0/xpan/file?method=search",
  fileFilemetas: "/rest/2.0/xpan/multimedia?method=filemetas",
  filePrecreate: "/rest/2.0/xpan/file?method=precreate",
  fileCreate: "/rest/2.0/xpan/file?method=create",
  fileManager: "/rest/2.0/xpan/file?method=filemanager",
  fileDoclist: "/rest/2.0/xpan/file?method=doclist",
  fileImagelist: "/rest/2.0/xpan/file?method=imagelist",
  fileVideolist: "/rest/2.0/xpan/file?method=videolist",
  fileBtlist: "/rest/2.0/xpan/file?method=btlist",
  queryTask: "/rest/2.0/xpan/file?method=query_task",
  shareSet: "/rest/2.0/xpan/share?method=set",
  shareTransfer: "/rest/2.0/xpan/share?method=transfer",
  uinfo: "/rest/2.0/xpan/nas?method=uinfo",
  quota: "/api/quota",
  pcsSuperfile: "/rest/2.0/pcs/superfile2",
  listall: "/rest/2.0/xpan/multimedia?method=listall",
  unisearch: "/xpan/unisearch"
};
var RETRY_HTTP_STATUSES = /* @__PURE__ */ new Set([408, 425, 429, 500, 502, 503, 504]);
var RETRY_ERRNOS = /* @__PURE__ */ new Set([31034, 31399, 42214]);
var MAX_RETRIES = 4;
var BASE_BACKOFF_MS = 500;
function isRetryableError(err) {
  if (err instanceof HttpError && RETRY_HTTP_STATUSES.has(err.status))
    return true;
  if (err instanceof BaiduError && RETRY_ERRNOS.has(err.errno))
    return true;
  if (err instanceof Error && /ETIMEDOUT|ECONNRESET|ENETUNREACH|ENOTFOUND|EAI_AGAIN|fetch failed/i.test(err.message)) {
    return true;
  }
  return false;
}
async function withBackoff(fn, opts = {}) {
  const max = opts.maxRetries ?? MAX_RETRIES;
  const base = opts.baseDelayMs ?? BASE_BACKOFF_MS;
  const shouldRetry = opts.shouldRetry ?? isRetryableError;
  let lastErr;
  for (let attempt = 0; attempt <= max; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (attempt === max || !shouldRetry(e))
        throw e;
      const jitter = Math.random() * base;
      const delay = base * Math.pow(2, attempt) + jitter;
      await sleep2(delay);
    }
  }
  throw lastErr;
}
function sleep2(ms) {
  return new Promise((resolve2) => setTimeout(resolve2, ms));
}
function buildXpanError(body, endpoint) {
  const errno = body.errno;
  if (typeof errno !== "number" || errno === 0)
    return null;
  const msg = mapErrno(errno, body.errmsg);
  return new BaiduError(errno, msg, { endpoint, raw: body });
}
async function readJson(res, endpoint) {
  if (!res.ok) {
    let body = "";
    try {
      body = await res.text();
    } catch {
    }
    throw new HttpError(res.status, endpoint, `${endpoint} HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  let json;
  try {
    json = await res.json();
  } catch (e) {
    throw new HttpError(res.status, endpoint, `${endpoint} \u54CD\u5E94\u4E0D\u662F\u5408\u6CD5 JSON: ${e.message}`);
  }
  return json;
}
async function xpanGet(cfg, endpoint, params = {}, opts = {}, creds) {
  const exec = async () => {
    const url = await buildUrl(cfg, endpoint, params, opts.skipAuth ?? false, creds);
    let res;
    try {
      res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json", "User-Agent": DEFAULT_UA },
        signal: opts.signal
      });
    } catch (e) {
      throw new HttpError(0, endpoint, `\u7F51\u7EDC\u9519\u8BEF: ${e.message}`);
    }
    const body = await readJson(res, endpoint);
    const err = buildXpanError(body, endpoint);
    if (err)
      throw err;
    return body;
  };
  return opts.noRetry ? exec() : withBackoff(exec);
}
async function xpanPostJson(cfg, endpoint, body, queryParams = {}, opts = {}, creds) {
  const exec = async () => {
    const url = await buildUrl(cfg, endpoint, queryParams, opts.skipAuth ?? false, creds);
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": DEFAULT_UA
        },
        body: JSON.stringify(body),
        signal: opts.signal
      });
    } catch (e) {
      throw new HttpError(0, endpoint, `\u7F51\u7EDC\u9519\u8BEF: ${e.message}`);
    }
    const bodyJson = await readJson(res, endpoint);
    const err = buildXpanError(bodyJson, endpoint);
    if (err)
      throw err;
    return bodyJson;
  };
  return opts.noRetry ? exec() : withBackoff(exec);
}
async function xpanPostForm(cfg, endpoint, bodyParams, queryParams = {}, opts = {}, creds) {
  const exec = async () => {
    const url = await buildUrl(cfg, endpoint, queryParams, opts.skipAuth ?? false, creds);
    const form = encodeForm(bodyParams);
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          "User-Agent": DEFAULT_UA
        },
        body: form,
        signal: opts.signal
      });
    } catch (e) {
      throw new HttpError(0, endpoint, `\u7F51\u7EDC\u9519\u8BEF: ${e.message}`);
    }
    const body = await readJson(res, endpoint);
    const err = buildXpanError(body, endpoint);
    if (err)
      throw err;
    return body;
  };
  return opts.noRetry ? exec() : withBackoff(exec);
}
async function pcsUpload(cfg, pp, data, filename, opts = {}, creds) {
  const exec = async () => {
    const token = await getAccessToken(cfg, creds ?? {});
    const usp = new URLSearchParams({
      method: "upload",
      access_token: token,
      type: "tmpfile",
      path: pp.path,
      uploadid: pp.uploadid,
      partseq: String(pp.partseq)
    });
    const url = `${HOST_PCS_UPLOAD}${ENDPOINTS.pcsSuperfile}?${usp.toString()}`;
    const fd = new FormData();
    const blob = new Blob([data]);
    fd.append("file", blob, filename);
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        body: fd,
        headers: { "User-Agent": DEFAULT_UA },
        signal: opts.signal
      });
    } catch (e) {
      throw new HttpError(0, ENDPOINTS.pcsSuperfile, `\u7F51\u7EDC\u9519\u8BEF: ${e.message}`);
    }
    const body = await readJson(res, ENDPOINTS.pcsSuperfile);
    const err = buildXpanError(body, ENDPOINTS.pcsSuperfile);
    if (err)
      throw err;
    return body;
  };
  return opts.noRetry ? exec() : withBackoff(exec);
}
async function dlinkFetch(cfg, dlink, range, opts = {}, creds) {
  const token = await getAccessToken(cfg, creds ?? {});
  const url = `${dlink}${dlink.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token)}`;
  const headers = { "User-Agent": DLINK_UA };
  if (range) {
    headers["Range"] = `bytes=${range.start}-${range.end ?? ""}`;
  }
  let res;
  try {
    res = await fetch(url, { method: "GET", headers, signal: opts.signal, redirect: "follow" });
  } catch (e) {
    throw new HttpError(0, "dlink", `\u4E0B\u8F7D\u5931\u8D25: ${e.message}`);
  }
  if (!res.ok) {
    let body = "";
    try {
      body = await res.text();
    } catch {
    }
    throw new HttpError(res.status, "dlink", `dlink HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  return res;
}
async function buildUrl(cfg, endpoint, params, skipAuth, creds) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === void 0 || v === null)
      continue;
    qs.set(k, String(v));
  }
  if (!skipAuth) {
    const token = await getAccessToken(cfg, creds ?? {});
    qs.set("access_token", token);
  }
  const url = `${HOST_XPAN}${endpoint}${qs.toString().length > 0 ? "&" + qs.toString() : ""}`;
  return url;
}
function encodeForm(params) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === void 0 || v === null)
      continue;
    usp.set(k, String(v));
  }
  return usp.toString();
}

// src/scope.ts
var import_node_path2 = require("node:path");
function normalizePath(input) {
  if (!input || typeof input !== "string") {
    throw new ScopeError(String(input), "unknown", "\u8DEF\u5F84\u4E3A\u7A7A\u6216\u7C7B\u578B\u9519\u8BEF");
  }
  let p = input.trim();
  if (p.includes("\\")) {
    p = p.replace(/\\/g, "/");
  }
  if (p.startsWith("~")) {
    throw new ScopeError(input, "unknown", "\u7981\u6B62\u4F7F\u7528 ~ \u8DEF\u5F84(\u672C\u5730\u5BB6\u76EE\u5F55\u522B\u540D,\u7F51\u76D8\u8DEF\u5F84\u65E0\u610F\u4E49)");
  }
  if (/(^|\/)\.\.($|\/)/.test(p)) {
    throw new ScopeError(input, "unknown", "\u7981\u6B62\u8DEF\u5F84\u7A7F\u8D8A(.. \u6BB5\u4E0D\u5141\u8BB8\u51FA\u73B0\u5728\u7F51\u76D8\u8DEF\u5F84\u4E2D)");
  }
  if (p.includes("\u6211\u7684\u5E94\u7528\u6570\u636E")) {
    throw new ScopeError(
      input,
      "unknown",
      "\u5C55\u793A\u7528\u7684\u4E2D\u6587\u8DEF\u5F84(\u6211\u7684\u5E94\u7528\u6570\u636E/...)\u4E0D\u80FD\u4F5C\u4E3A\u547D\u4EE4\u53C2\u6570,\u8BF7\u6539\u4E3A /apps/<appName>/..."
    );
  }
  if (!p.startsWith("/")) {
    p = "/" + p;
  }
  let normalized = import_node_path2.posix.normalize(p);
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.replace(/\/+$/, "");
  }
  return normalized;
}
function getSandboxRoot(cfg) {
  if (!cfg.appName || cfg.appName.length === 0) {
    throw new ScopeError("", "sandbox", "config.appName \u4E3A\u7A7A,\u8BF7\u8FD0\u884C `pan.cjs scope` \u8BBE\u7F6E");
  }
  return `/apps/${cfg.appName}`;
}
function getScopeRoot(cfg) {
  if (cfg.scope === "sandbox")
    return getSandboxRoot(cfg);
  if (cfg.allowedPaths && cfg.allowedPaths.length > 0)
    return cfg.allowedPaths[0];
  return "/";
}
function assertInScope(input, cfg) {
  const p = normalizePath(input);
  if (cfg.scope === "sandbox") {
    const root = getSandboxRoot(cfg);
    if (p === root || p.startsWith(root + "/"))
      return p;
    throw new ScopeError(
      input,
      "sandbox",
      `\u8DEF\u5F84 ${input} \u8D85\u51FA\u6C99\u76D2(${root}/)\u3002\u5982\u9700\u8BBF\u95EE\u5168\u76D8,\u8BF7\u8FD0\u884C \`pan.cjs scope full\`\u3002`
    );
  }
  if (!cfg.allowedPaths || cfg.allowedPaths.length === 0) {
    return p;
  }
  for (const prefix of cfg.allowedPaths) {
    if (typeof prefix !== "string")
      continue;
    const norm = normalizePath(prefix);
    if (p === norm || p.startsWith(norm + "/"))
      return p;
  }
  throw new ScopeError(
    input,
    "full",
    `\u8DEF\u5F84 ${input} \u4E0D\u5728\u767D\u540D\u5355\u5185(allowedPaths=${cfg.allowedPaths.join(", ")})\u3002`
  );
}
function toDisplayPath(apiPath) {
  const p = normalizePath(apiPath);
  if (p === "/apps" || p.startsWith("/apps/")) {
    return "\u6211\u7684\u5E94\u7528\u6570\u636E" + p.slice("/apps".length);
  }
  return p;
}

// src/fileops.ts
async function ls(cfg, rawPath, opts = {}, creds) {
  const dir = assertInScope(rawPath, cfg);
  const params = {
    dir,
    order: opts.order ?? "time",
    desc: opts.desc ? 1 : 0,
    folder: opts.folderOnly ? 1 : 0,
    start: opts.start ?? 0,
    limit: opts.limit ?? 1e3,
    web: opts.webFormat === false ? 0 : 1
  };
  if (opts.recursion === 1)
    params.recursion = 1;
  try {
    const res = await xpanGet(cfg, ENDPOINTS.fileList, params, {}, creds);
    return res.list ?? [];
  } catch (e) {
    if (e instanceof BaiduError && e.errno === -9 && cfg.scope === "sandbox" && dir === getSandboxRoot(cfg)) {
      throw new BaiduError(
        -9,
        `\u6C99\u76D2\u6839\u76EE\u5F55 ${dir}/ \u5728\u767E\u5EA6\u7F51\u76D8\u540E\u7AEF\u5C1A\u672A\u521B\u5EFA\u3002
\u8FD9\u662F\u65B0\u6CE8\u518C\u81EA\u6709\u5E94\u7528\u7684\u5E38\u89C1\u73B0\u8C61 \u2014\u2014 \u540E\u7AEF\u4E0D\u4F1A\u9884\u5148\u5EFA\u597D,\u9996\u6B21\u4EFB\u610F\u5199\u5165\u64CD\u4F5C\u5373\u53EF\u89E6\u53D1\u61D2\u521B\u5EFA\u3002
\u4F8B\u5982:  pan.cjs mkdir ${dir}/uploads/`,
        { endpoint: e.endpoint, raw: e.raw }
      );
    }
    throw e;
  }
}
async function lsAll(cfg, rawPath, opts = {}, creds) {
  const all = [];
  let start = 0;
  const limit = 1e3;
  for (; ; ) {
    const page = await ls(cfg, rawPath, { ...opts, start, limit }, creds);
    all.push(...page);
    if (page.length < limit)
      break;
    start += limit;
    if (start > 1e5)
      break;
  }
  return all;
}
async function listRecursive(cfg, rawPath, opts = {}, creds) {
  const dir = assertInScope(rawPath, cfg);
  const all = [];
  let cursor = opts.start ?? 0;
  const limit = Math.min(1e3, opts.limit ?? 1e3);
  for (; ; ) {
    const params = {
      path: dir,
      recursion: 1,
      order: opts.order ?? "time",
      desc: opts.desc ? 1 : 0,
      start: cursor,
      limit,
      web: opts.web ?? 0
    };
    if (opts.ctime !== void 0)
      params.ctime = opts.ctime;
    if (opts.mtime !== void 0)
      params.mtime = opts.mtime;
    const res = await xpanGet(cfg, ENDPOINTS.listall, params, {}, creds);
    const page = res.list ?? [];
    all.push(...page);
    if (res.has_more !== 1)
      break;
    cursor = res.cursor ?? cursor + page.length;
    if (all.length > 1e5)
      break;
  }
  return all;
}
async function mkdir(cfg, rawPath, opts = {}, creds) {
  const path = assertInScope(rawPath, cfg);
  try {
    return await xpanPostForm(
      cfg,
      ENDPOINTS.fileCreate,
      {
        path,
        isdir: 1,
        size: 0,
        uploadid: "",
        block_list: "[]",
        rtype: 0
      },
      {},
      {},
      creds
    );
  } catch (e) {
    if (opts.idempotent !== false && isExistsError(e)) {
      return { errno: 0, path, isdir: 1 };
    }
    throw e;
  }
}
function isExistsError(e) {
  if (typeof e !== "object" || e === null)
    return false;
  const errno = e.errno;
  return errno === 10 || errno === -8 || errno === 31075;
}
async function getUserInfo(cfg, creds) {
  const res = await xpanGet(cfg, ENDPOINTS.uinfo, {}, {}, creds);
  return {
    baidu_name: res.baidu_name,
    netdisk_name: res.netdisk_name,
    avatar_url: res.avatar_url,
    vip_type: res.vip_type,
    uk: res.uk
  };
}
async function getQuota(cfg, creds) {
  return xpanGet(
    cfg,
    `${ENDPOINTS.quota}?checkfree=1&checkexpire=1`,
    {},
    {},
    creds
  );
}
async function filemetas(cfg, fs_ids, withDlink = false, creds) {
  const res = await xpanGet(
    cfg,
    ENDPOINTS.fileFilemetas,
    {
      fsids: JSON.stringify(fs_ids),
      dlink: withDlink ? 1 : 0,
      thumb: 0,
      extra: 0
    },
    {},
    creds
  );
  return res.list ?? [];
}
async function statByPath(cfg, rawPath, creds) {
  const path = assertInScope(rawPath, cfg);
  const lastSlash = path.lastIndexOf("/");
  if (lastSlash < 0)
    return null;
  const parent = lastSlash === 0 ? "/" : path.slice(0, lastSlash);
  const name = path.slice(lastSlash + 1);
  const entries = await lsAll(cfg, parent, {}, creds);
  for (const e of entries) {
    if (e.server_filename === name)
      return e;
  }
  return null;
}
var CATEGORY_ENDPOINTS = {
  doc: ENDPOINTS.fileDoclist,
  image: ENDPOINTS.fileImagelist,
  video: ENDPOINTS.fileVideolist,
  bt: ENDPOINTS.fileBtlist
};
async function categoryList(cfg, type, opts = {}, creds) {
  const endpoint = CATEGORY_ENDPOINTS[type];
  const params = {
    dir: opts.dir ?? "/",
    order: opts.order ?? "time",
    desc: opts.desc !== false ? 1 : 0,
    start: opts.start ?? 0,
    limit: Math.min(1e3, opts.limit ?? 100),
    web: 1
  };
  if (opts.recycle)
    params.recycle = 1;
  const res = await xpanGet(cfg, endpoint, params, {}, creds);
  return res.list ?? [];
}
async function search(cfg, opts, creds) {
  const params = {
    key: opts.key,
    dir: opts.dir ?? "/",
    page: opts.page ?? 1,
    num: Math.min(1e3, opts.num ?? 100),
    web: 1
  };
  if (opts.category !== void 0 && opts.category > 0 && opts.category <= 7) {
    params.category = opts.category;
  }
  if (opts.recursion !== false) {
    params.recursion = 1;
  }
  const res = await xpanGet(cfg, ENDPOINTS.fileSearch, params, {}, creds);
  return {
    list: res.list ?? [],
    hasMore: (res.has_more ?? 0) === 1
  };
}
var CATEGORY_NAMES = {
  1: "\u89C6\u9891",
  2: "\u97F3\u9891",
  3: "\u56FE\u7247",
  4: "\u6587\u6863",
  5: "\u5E94\u7528",
  6: "\u5176\u4ED6",
  7: "\u79CD\u5B50"
};
async function semanticSearch(cfg, opts, creds) {
  const body = {
    scene: "mcpserver",
    query: opts.query,
    data: {}
  };
  if (opts.dir)
    body.dir = [opts.dir];
  if (opts.category && opts.category.length > 0)
    body.category = opts.category;
  if (opts.num !== void 0)
    body.num = opts.num;
  if (opts.searchType !== void 0)
    body.search_type = opts.searchType;
  if (opts.sources && opts.sources.length > 0)
    body.sources = opts.sources;
  const res = await xpanPostJson(
    cfg,
    ENDPOINTS.unisearch,
    body,
    {},
    {},
    creds
  );
  return res.list ?? [];
}
function ondupValue(v) {
  if (v === "overwrite")
    return "overwrite";
  if (v === "fail")
    return "fail";
  return "newcopy";
}
async function move(cfg, rawSrc, rawDst, opts = {}, creds) {
  const src = assertInScope(rawSrc, cfg);
  const dst = assertInScope(rawDst, cfg);
  const lastSlash = src.lastIndexOf("/");
  const name = lastSlash >= 0 ? src.slice(lastSlash + 1) : src;
  const destDir = dst.endsWith("/") ? dst : dst.slice(0, dst.lastIndexOf("/") + 1) || "/";
  const newname = dst.endsWith("/") ? name : dst.slice(dst.lastIndexOf("/") + 1);
  const res = await xpanPostForm(
    cfg,
    ENDPOINTS.fileManager,
    {
      filelist: JSON.stringify([
        { path: src, dest: destDir, newname, ondup: ondupValue(opts.ondup) }
      ])
    },
    { opera: "move", async: 0 },
    {},
    creds
  );
  return res.info ?? [];
}
async function copy(cfg, rawSrc, rawDst, opts = {}, creds) {
  const src = assertInScope(rawSrc, cfg);
  const dst = assertInScope(rawDst, cfg);
  const lastSlash = src.lastIndexOf("/");
  const name = lastSlash >= 0 ? src.slice(lastSlash + 1) : src;
  const destDir = dst.endsWith("/") ? dst : dst.slice(0, dst.lastIndexOf("/") + 1) || "/";
  const newname = dst.endsWith("/") ? name : dst.slice(dst.lastIndexOf("/") + 1);
  const res = await xpanPostForm(
    cfg,
    ENDPOINTS.fileManager,
    {
      filelist: JSON.stringify([
        { path: src, dest: destDir, newname, ondup: ondupValue(opts.ondup) }
      ])
    },
    { opera: "copy", async: 0 },
    {},
    creds
  );
  return res.info ?? [];
}
async function rename(cfg, rawPath, newName, creds) {
  const path = assertInScope(rawPath, cfg);
  const lastSlash = path.lastIndexOf("/");
  const parent = lastSlash >= 0 ? path.slice(0, lastSlash + 1) || "/" : "/";
  return move(cfg, path, parent + newName, {}, creds);
}
async function softRm(cfg, rawPath, creds) {
  const path = assertInScope(rawPath, cfg);
  const root = getScopeRoot(cfg);
  if (root === "/") {
    throw new Error(
      "full \u6A21\u5F0F\u4E14\u65E0 allowedPaths \u65F6,\u6CA1\u6709\u660E\u786E\u7684 .trash \u6839\u76EE\u5F55\u3002\u8BF7\u5148 `pan.cjs scope` \u914D\u7F6E allowedPaths,\u6216\u663E\u5F0F `pan.cjs rm --hard`\u3002"
    );
  }
  if (path === root) {
    throw new Error(`\u4E0D\u80FD\u5220\u9664\u5F53\u524D scope \u7684\u6839\u76EE\u5F55:${path}`);
  }
  if (path.startsWith(`${root}/.trash/`) || path === `${root}/.trash`) {
    throw new Error(
      `${path} \u5DF2\u7ECF\u4F4D\u4E8E .trash \u4E2D\u3002\u5982\u8981\u5F7B\u5E95\u6E05\u7406,\u8BF7\u7528 \`pan.cjs trash --gc\`(Week 3)\u6216 \`pan.cjs rm --hard\`\u3002`
    );
  }
  const date = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const trashDir = `${root}/.trash/${date}`;
  await mkdir(cfg, trashDir, { idempotent: true }, creds);
  const lastSlash = path.lastIndexOf("/");
  const name = lastSlash >= 0 ? path.slice(lastSlash + 1) : path;
  const res = await xpanPostForm(
    cfg,
    ENDPOINTS.fileManager,
    {
      filelist: JSON.stringify([
        { path, dest: trashDir, newname: name, ondup: "newcopy" }
      ])
    },
    { opera: "move", async: 0 },
    {},
    creds
  );
  const movedAs = res.info?.[0]?.path ?? `${trashDir}/${name}`;
  return { src: path, trashDir, movedAs };
}
async function hardRm(cfg, rawPaths, creds) {
  if (rawPaths.length === 0) {
    throw new Error("hardRm \u8C03\u7528\u65F6 rawPaths \u4E3A\u7A7A");
  }
  const normalized = rawPaths.map((p) => assertInScope(p, cfg));
  return xpanPostForm(
    cfg,
    ENDPOINTS.fileManager,
    { filelist: JSON.stringify(normalized) },
    { opera: "delete", async: 0 },
    {},
    creds
  );
}
async function queryTask(cfg, taskid, creds) {
  return xpanGet(
    cfg,
    ENDPOINTS.queryTask,
    { taskid, op_type: 1 },
    {},
    creds
  );
}
async function pollTask(cfg, taskid, creds, onProgress) {
  const MAX_RETRIES2 = 60;
  const INTERVAL_MS = 2e3;
  for (let i = 0; i < MAX_RETRIES2; i++) {
    const res = await queryTask(cfg, taskid, creds);
    onProgress?.(res.status ?? -1, i + 1);
    if (res.status === 0 || res.status === 2) {
      return res;
    }
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
  throw new Error(`\u5F02\u6B65\u4EFB\u52A1\u8F6E\u8BE2\u8D85\u65F6(taskid=${taskid}),\u8BF7\u7A0D\u540E\u624B\u52A8\u67E5\u8BE2\u3002`);
}

// src/upload.ts
var import_node_fs2 = require("node:fs");
var import_node_fs3 = require("node:fs");
var import_node_crypto = require("node:crypto");
var import_node_path3 = require("node:path");
var CHUNK_SIZE = 4 * 1024 * 1024;
var SLICE_MD5_SIZE = 256 * 1024;
function getUploadStateDir() {
  return (0, import_node_path3.join)(getConfigDir(), "uploads");
}
function stateFilePath(remotePath) {
  const hash = (0, import_node_crypto.createHash)("sha256").update(remotePath).digest("hex").slice(0, 32);
  return (0, import_node_path3.join)(getUploadStateDir(), `${hash}.json`);
}
async function loadState(remotePath, size, contentMd5) {
  const path = stateFilePath(remotePath);
  if (!(0, import_node_fs2.existsSync)(path))
    return null;
  try {
    const txt = await import_node_fs3.promises.readFile(path, "utf-8");
    const raw = JSON.parse(txt);
    if (raw.path !== remotePath || raw.size !== size || raw.contentMd5 !== contentMd5 || typeof raw.uploadid !== "string" || !Array.isArray(raw.blockMd5s) || !Array.isArray(raw.completed)) {
      return null;
    }
    return {
      path: raw.path,
      size: raw.size,
      contentMd5: raw.contentMd5,
      sliceMd5: typeof raw.sliceMd5 === "string" ? raw.sliceMd5 : "",
      blockMd5s: raw.blockMd5s.filter((x) => typeof x === "string"),
      uploadid: raw.uploadid,
      completed: raw.completed.filter((x) => typeof x === "number"),
      createdAt: typeof raw.createdAt === "number" ? raw.createdAt : 0
    };
  } catch {
    return null;
  }
}
async function saveState(state) {
  const dir = getUploadStateDir();
  if (!(0, import_node_fs2.existsSync)(dir)) {
    (0, import_node_fs2.mkdirSync)(dir, { recursive: true, mode: 448 });
  }
  const path = stateFilePath(state.path);
  await import_node_fs3.promises.writeFile(path, JSON.stringify(state, null, 2) + "\n", { encoding: "utf-8", mode: 384 });
}
async function dropState(remotePath) {
  const path = stateFilePath(remotePath);
  try {
    await import_node_fs3.promises.unlink(path);
  } catch {
  }
}
async function hashFile(localPath, expectedSize) {
  const blockMd5s = [];
  const contentHasher = (0, import_node_crypto.createHash)("md5");
  const sliceHasher = (0, import_node_crypto.createHash)("md5");
  let chunkHasher = (0, import_node_crypto.createHash)("md5");
  let chunkBytes = 0;
  let totalBytes = 0;
  let sliceBytesLeft = SLICE_MD5_SIZE;
  const stream = (0, import_node_fs2.createReadStream)(localPath, { highWaterMark: 64 * 1024 });
  for await (const buf of stream) {
    let offset = 0;
    while (offset < buf.length) {
      const remainingChunk = CHUNK_SIZE - chunkBytes;
      const take = Math.min(remainingChunk, buf.length - offset);
      const slice = buf.subarray(offset, offset + take);
      chunkHasher.update(slice);
      contentHasher.update(slice);
      if (sliceBytesLeft > 0) {
        const sliceTake = Math.min(sliceBytesLeft, slice.length);
        sliceHasher.update(slice.subarray(0, sliceTake));
        sliceBytesLeft -= sliceTake;
      }
      chunkBytes += take;
      totalBytes += take;
      offset += take;
      if (chunkBytes === CHUNK_SIZE) {
        blockMd5s.push(chunkHasher.digest("hex"));
        chunkHasher = (0, import_node_crypto.createHash)("md5");
        chunkBytes = 0;
      }
    }
  }
  if (chunkBytes > 0) {
    blockMd5s.push(chunkHasher.digest("hex"));
  }
  if (blockMd5s.length === 0) {
    blockMd5s.push((0, import_node_crypto.createHash)("md5").digest("hex"));
  }
  if (totalBytes !== expectedSize) {
    throw new Error(
      `\u8BFB\u53D6\u672C\u5730\u6587\u4EF6\u5B57\u8282\u6570(${totalBytes})\u4E0E stat.size(${expectedSize})\u4E0D\u4E00\u81F4,\u6587\u4EF6\u53EF\u80FD\u88AB\u5E76\u53D1\u4FEE\u6539\u3002`
    );
  }
  return {
    blockMd5s,
    contentMd5: contentHasher.digest("hex"),
    sliceMd5: sliceHasher.digest("hex")
  };
}
async function upload(cfg, localPath, remoteRawPath, opts = {}, creds) {
  if (!(0, import_node_fs2.existsSync)(localPath)) {
    throw new Error(`\u672C\u5730\u6587\u4EF6\u4E0D\u5B58\u5728: ${localPath}`);
  }
  const stat = (0, import_node_fs2.statSync)(localPath);
  if (stat.isDirectory()) {
    throw new Error(`upload \u4E0D\u652F\u6301\u76EE\u5F55,\u8BF7\u6309\u6587\u4EF6\u4F20:${localPath}`);
  }
  const remotePath = assertInScope(remoteRawPath, cfg);
  const size = stat.size;
  const rtype = opts.rtype ?? 1;
  const concurrency = Math.max(1, opts.concurrency ?? cfg.concurrency.uploadParts ?? 4);
  const reportProgress = opts.onProgress ?? (() => {
  });
  const { blockMd5s, contentMd5, sliceMd5 } = await hashFile(localPath, size);
  const totalParts = blockMd5s.length;
  let state = opts.noResume ? null : await loadState(remotePath, size, contentMd5);
  let resumed = false;
  if (state && state.uploadid && state.blockMd5s.join(",") === blockMd5s.join(",")) {
    resumed = true;
  } else {
    state = null;
  }
  let uploadid = state?.uploadid;
  let backendBlockList = null;
  let rapidHit = false;
  let rapidInfo;
  if (!uploadid) {
    const pre = await xpanPostForm(
      cfg,
      ENDPOINTS.filePrecreate,
      {
        path: remotePath,
        size,
        isdir: 0,
        autoinit: 1,
        block_list: JSON.stringify(blockMd5s),
        rtype,
        ...opts.forceUpload || size < SLICE_MD5_SIZE ? {} : { "content-md5": contentMd5, "slice-md5": sliceMd5 }
      },
      {},
      {},
      creds
    );
    if (pre.return_type === 2) {
      rapidHit = true;
      rapidInfo = pre.info;
    } else {
      uploadid = pre.uploadid;
      if (!uploadid) {
        throw new BaiduError(
          pre.errno ?? -1,
          "precreate \u672A\u8FD4\u56DE uploadid \u4E5F\u672A\u547D\u4E2D\u79D2\u4F20,\u65E0\u6CD5\u7EE7\u7EED\u4E0A\u4F20",
          { endpoint: ENDPOINTS.filePrecreate, raw: pre }
        );
      }
      if (Array.isArray(pre.block_list) && pre.block_list.length > 0) {
        backendBlockList = pre.block_list;
      }
      state = {
        path: remotePath,
        size,
        contentMd5,
        sliceMd5,
        blockMd5s,
        uploadid,
        completed: [],
        createdAt: Math.floor(Date.now() / 1e3)
      };
      await saveState(state);
    }
  }
  if (rapidHit) {
    const fs_id = rapidInfo?.fs_id ?? 0;
    if (!fs_id) {
      const cr2 = await commit(
        cfg,
        remotePath,
        size,
        "",
        blockMd5s,
        rtype,
        creds
      );
      reportProgress(size, size);
      await dropState(remotePath);
      return {
        fs_id: cr2.fs_id ?? 0,
        remotePath,
        size,
        md5: cr2.md5 ?? rapidInfo?.md5 ?? contentMd5,
        rapid: true,
        parts: 0,
        resumed: false
      };
    }
    reportProgress(size, size);
    await dropState(remotePath);
    return {
      fs_id,
      remotePath,
      size,
      md5: rapidInfo?.md5 ?? contentMd5,
      rapid: true,
      parts: 0,
      resumed: false
    };
  }
  if (!state || !uploadid) {
    throw new Error("\u5185\u90E8\u9519\u8BEF:state \u672A\u521D\u59CB\u5316");
  }
  const completedSet = new Set(state.completed);
  const allSeqs = backendBlockList ?? Array.from({ length: totalParts }, (_, i) => i);
  const todo = allSeqs.filter((seq) => !completedSet.has(seq));
  let doneBytes = state.completed.reduce(
    (acc, seq) => acc + chunkSizeAt(seq, size, totalParts),
    0
  );
  reportProgress(doneBytes, size);
  let cursor = 0;
  let firstError = null;
  const workers = [];
  async function worker() {
    for (; ; ) {
      if (firstError)
        return;
      const i = cursor++;
      if (i >= todo.length)
        return;
      const seq = todo[i];
      try {
        const part = await readPart(localPath, seq, size, totalParts);
        await pcsUpload(
          cfg,
          { path: remotePath, uploadid, partseq: seq },
          part,
          // multipart 字段需要一个 filename,百度对内容不挑剔,固定即可
          `partseq-${seq}`,
          {},
          creds
        );
        if (firstError)
          return;
        state.completed.push(seq);
        doneBytes += part.length;
        reportProgress(doneBytes, size);
        await saveState(state);
      } catch (e) {
        if (!firstError)
          firstError = e;
        return;
      }
    }
  }
  for (let i = 0; i < Math.min(concurrency, todo.length); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  if (firstError)
    throw firstError;
  const cr = await commit(cfg, remotePath, size, uploadid, blockMd5s, rtype, creds);
  await dropState(remotePath);
  reportProgress(size, size);
  return {
    fs_id: cr.fs_id ?? 0,
    remotePath,
    size,
    md5: cr.md5 ?? contentMd5,
    rapid: false,
    parts: todo.length,
    resumed
  };
}
function chunkSizeAt(seq, total, parts) {
  if (parts <= 0)
    return 0;
  const lastSize = total - CHUNK_SIZE * (parts - 1);
  return seq === parts - 1 ? Math.max(0, lastSize) : CHUNK_SIZE;
}
async function readPart(localPath, seq, total, parts) {
  const start = seq * CHUNK_SIZE;
  const size = chunkSizeAt(seq, total, parts);
  if (size === 0)
    return Buffer.alloc(0);
  const stream = (0, import_node_fs2.createReadStream)(localPath, {
    start,
    end: start + size - 1,
    highWaterMark: 64 * 1024
  });
  const chunks = [];
  for await (const c of stream) {
    chunks.push(c);
  }
  return Buffer.concat(chunks, size);
}
async function commit(cfg, remotePath, size, uploadid, blockMd5s, rtype, creds) {
  const body = {
    path: remotePath,
    size,
    isdir: 0,
    block_list: JSON.stringify(blockMd5s),
    rtype
  };
  if (uploadid)
    body.uploadid = uploadid;
  return xpanPostForm(
    cfg,
    ENDPOINTS.fileCreate,
    body,
    {},
    {},
    creds
  );
}

// src/download.ts
var import_node_fs4 = require("node:fs");
var import_node_fs5 = require("node:fs");
var import_node_crypto2 = require("node:crypto");
var import_node_path4 = require("node:path");
var RANGE_THRESHOLD = 50 * 1024 * 1024;
var RANGE_CHUNK_SIZE = 50 * 1024 * 1024;
async function download(cfg, remoteRawPath, localPath, opts = {}, creds) {
  const remotePath = assertInScope(remoteRawPath, cfg);
  const entry = await statByPath(cfg, remotePath, creds);
  if (!entry) {
    throw new Error(`\u8FDC\u7AEF\u6587\u4EF6\u4E0D\u5B58\u5728: ${remotePath}`);
  }
  if (entry.isdir === 1) {
    throw new Error(`download \u4E0D\u652F\u6301\u76EE\u5F55,\u8BF7\u6309\u6587\u4EF6\u4E0B\u8F7D: ${remotePath}`);
  }
  const metas = await filemetas(cfg, [entry.fs_id], true, creds);
  const meta = metas[0];
  if (!meta || !meta.dlink) {
    throw new Error(
      "\u672A\u53D6\u5230 dlink\u3002\u8BF7\u786E\u8BA4\u5E94\u7528\u5DF2\u52FE\u9009 netdisk \u6743\u9650,\u4E14\u5F53\u524D access_token \u6709\u6548\u3002"
    );
  }
  const size = meta.size;
  const concurrency = Math.max(
    1,
    opts.concurrency ?? cfg.concurrency.downloadChunks ?? 4
  );
  const reportProgress = opts.onProgress ?? (() => {
  });
  const verify = opts.verify !== false;
  const dir = (0, import_node_path4.dirname)(localPath);
  if (dir && !(0, import_node_fs4.existsSync)(dir)) {
    await import_node_fs5.promises.mkdir(dir, { recursive: true });
  }
  const tmpPath = `${localPath}.partial`;
  if ((0, import_node_fs4.existsSync)(tmpPath)) {
    await import_node_fs5.promises.unlink(tmpPath);
  }
  const fh = await import_node_fs5.promises.open(tmpPath, "w+");
  let parts = 1;
  try {
    if (size > 0) {
      try {
        await fh.truncate(size);
      } catch (e) {
        throw new Error(
          `\u9884\u5206\u914D\u672C\u5730\u6587\u4EF6 ${tmpPath} \u5931\u8D25(\u78C1\u76D8\u7A7A\u95F4\u4E0D\u8DB3?): ${e.message}`
        );
      }
    }
    if (size === 0) {
      reportProgress(0, 0);
    } else if (size < RANGE_THRESHOLD) {
      reportProgress(0, size);
      await downloadSingle(cfg, meta.dlink, fh, size, reportProgress, creds);
    } else {
      parts = Math.ceil(size / RANGE_CHUNK_SIZE);
      reportProgress(0, size);
      await downloadRanges(
        cfg,
        meta.dlink,
        fh,
        size,
        concurrency,
        parts,
        reportProgress,
        creds
      );
    }
  } finally {
    await fh.close();
  }
  let localMd5;
  if (verify && meta.md5 && size > 0) {
    localMd5 = await md5OfFile(tmpPath);
    if (localMd5.toLowerCase() !== meta.md5.toLowerCase()) {
      try {
        await import_node_fs5.promises.unlink(tmpPath);
      } catch {
      }
      throw new Error(
        `\u4E0B\u8F7D\u5B8C\u6210\u4F46 md5 \u4E0D\u4E00\u81F4(\u672C\u5730 ${localMd5} \u2260 \u670D\u52A1\u7AEF ${meta.md5})\u3002\u5DF2\u5220\u9664 ${tmpPath},\u8BF7\u91CD\u8BD5\u3002`
      );
    }
  }
  await import_node_fs5.promises.rename(tmpPath, localPath);
  return {
    localPath,
    remotePath,
    size,
    serverMd5: meta.md5,
    localMd5,
    parts
  };
}
async function downloadSingle(cfg, dlink, fh, total, reportProgress, creds) {
  const res = await dlinkFetch(cfg, dlink, void 0, {}, creds);
  if (!res.body) {
    throw new Error("dlink \u54CD\u5E94\u6CA1\u6709 body");
  }
  let written = 0;
  for await (const raw of res.body) {
    const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
    await fh.write(chunk, 0, chunk.length, written);
    written += chunk.length;
    reportProgress(written, total);
  }
  if (written !== total) {
    throw new Error(`\u4E0B\u8F7D\u5B57\u8282\u6570\u4E0D\u5339\u914D:\u5199\u5165 ${written} / \u671F\u671B ${total}`);
  }
}
async function downloadRanges(cfg, dlink, fh, total, concurrency, parts, reportProgress, creds) {
  const jobs = [];
  for (let i = 0; i < parts; i++) {
    const start = i * RANGE_CHUNK_SIZE;
    const end = Math.min(total - 1, start + RANGE_CHUNK_SIZE - 1);
    jobs.push({ index: i, start, end });
  }
  let cursor = 0;
  let firstError = null;
  let doneBytes = 0;
  async function worker() {
    for (; ; ) {
      if (firstError)
        return;
      const i = cursor++;
      if (i >= jobs.length)
        return;
      const job = jobs[i];
      try {
        const res = await dlinkFetch(
          cfg,
          dlink,
          { start: job.start, end: job.end },
          {},
          creds
        );
        if (!res.body) {
          throw new Error(`Range ${job.start}-${job.end} \u54CD\u5E94\u6CA1\u6709 body`);
        }
        const expected = job.end - job.start + 1;
        let written = 0;
        for await (const raw of res.body) {
          const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
          if (firstError)
            return;
          await fh.write(chunk, 0, chunk.length, job.start + written);
          written += chunk.length;
          doneBytes += chunk.length;
          reportProgress(doneBytes, total);
        }
        if (written !== expected) {
          throw new Error(
            `\u5206\u7247 ${job.index} \u5B57\u8282\u6570\u4E0D\u5339\u914D:\u5199\u5165 ${written} / \u671F\u671B ${expected}`
          );
        }
      } catch (e) {
        if (!firstError)
          firstError = e;
        return;
      }
    }
  }
  const workers = [];
  for (let i = 0; i < Math.min(concurrency, jobs.length); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  if (firstError)
    throw firstError;
}
async function md5OfFile(path) {
  const hasher = (0, import_node_crypto2.createHash)("md5");
  const fh = await import_node_fs5.promises.open(path, "r");
  try {
    const stream = fh.createReadStream({ highWaterMark: 1024 * 1024 });
    for await (const c of stream) {
      hasher.update(c);
    }
  } finally {
    await fh.close();
  }
  return hasher.digest("hex");
}

// src/delete-policy.ts
var EXACT_CONFIRM_PHRASE = "\u6211\u786E\u8BA4\u6C38\u4E45\u5220\u9664";
var TOKEN_MIN_REMAINING_SEC = 60;
var MAX_BATCH = 100;
async function guardHardDelete(opts) {
  const { cfg, targets } = opts;
  if (!targets || targets.length === 0) {
    throw new PolicyError("targets-empty", "\u786C\u5220\u9664\u8C03\u7528\u672A\u4F20\u5165\u4EFB\u4F55\u76EE\u6807\u3002");
  }
  if (targets.length > MAX_BATCH) {
    throw new PolicyError(
      "too-many",
      `\u5355\u6B21\u786C\u5220\u9664\u9879\u6570 ${targets.length} \u8D85\u8FC7\u4E0A\u9650 ${MAX_BATCH},\u8BF7\u5206\u6279\u6267\u884C\u3002`
    );
  }
  for (const t of targets) {
    if (typeof t.path !== "string" || !t.path.startsWith("/")) {
      throw new PolicyError("bad-path", `\u975E\u6CD5\u76EE\u6807\u8DEF\u5F84:${String(t.path)}`);
    }
    if (t.path.includes("*") || t.path.includes("?")) {
      throw new PolicyError(
        "wildcard-unexpanded",
        `\u8DEF\u5F84\u542B\u901A\u914D\u7B26\u672A\u5C55\u5F00:${t.path}\u3002\u8BF7\u5148 \`pan.cjs ls\` / \`pan.cjs search\` \u5217\u51FA\u518D\u5220\u3002`
      );
    }
  }
  const forbiddenRoots = /* @__PURE__ */ new Set(["/", "/apps"]);
  if (cfg.scope === "sandbox") {
    try {
      forbiddenRoots.add(getSandboxRoot(cfg));
    } catch {
    }
  }
  for (const t of targets) {
    if (forbiddenRoots.has(t.path)) {
      throw new PolicyError(
        "root-path",
        `\u7981\u6B62\u786C\u5220\u9664\u6839\u76EE\u5F55:${t.path}\u3002\u5982\u8981\u6E05\u7A7A,\u8BF7\u9010\u9879\u6307\u5B9A\u5B50\u9879\u3002`
      );
    }
  }
  try {
    const tok = loadToken();
    if (tok) {
      const remaining = tok.expires_at - Math.floor(Date.now() / 1e3);
      if (remaining < TOKEN_MIN_REMAINING_SEC) {
        throw new PolicyError(
          "token-expiring",
          `access_token \u5269\u4F59 ${Math.max(0, remaining)} \u79D2,\u8FC7\u77ED,\u53EF\u80FD\u5BFC\u81F4\u5220\u9664\u4E2D\u9014\u5931\u6548\u3002\u8BF7\u5148 \`pan.cjs status\` \u68C0\u67E5\u5E76\u7EED\u671F / \u91CD\u65B0\u767B\u5F55,\u518D\u5C1D\u8BD5\u786C\u5220\u9664\u3002`
        );
      }
    }
  } catch (e) {
    if (e instanceof PolicyError)
      throw e;
  }
  const agent = isAgentEnv();
  const effectiveYes = opts.yes === true && !agent;
  const skipSoftReoffer = opts.skipSoftReoffer === true && !agent;
  if (agent && opts.yes === true) {
    info(
      color.yellow(
        "\u68C0\u6D4B\u5230 Agent \u73AF\u5883(CLAUDE_CODE / MCP_SERVER / ANTHROPIC_API_KEY \u7B49),--yes \u5DF2\u88AB\u5F3A\u5236\u5FFD\u7565,\u4ECD\u8981\u6C42\u9010\u5B57\u786E\u8BA4\u3002"
      )
    );
  }
  printDeleteList(targets);
  if (effectiveYes) {
    info(
      color.yellow(
        "--yes \u5DF2\u663E\u5F0F\u63D0\u4F9B\u4E14\u975E Agent \u73AF\u5883,\u8DF3\u8FC7 L3 \u9010\u5B57\u786E\u8BA4\u4E0E L4 \u8F6F\u5220\u9664\u63D0\u8BAE\u3002"
      )
    );
    return;
  }
  info("");
  info(color.red(color.bold("\u26A0 \u5373\u5C06\u786C\u5220\u9664\u4EE5\u4E0A\u76EE\u6807,\u64CD\u4F5C \u4E0D \u53EF \u9006\u3002")));
  info(
    `\u5982\u9700\u53D6\u6D88,\u8BF7\u76F4\u63A5\u56DE\u8F66\u6216\u8F93\u5165\u5176\u4ED6\u4EFB\u610F\u5185\u5BB9\u3002
\u786E\u8BA4\u8BF7 ${color.bold("\u9010\u5B57")} \u8F93\u5165:${color.bold(EXACT_CONFIRM_PHRASE)}`
  );
  const r1 = await confirmExactString(EXACT_CONFIRM_PHRASE, "\u9010\u5B57\u786E\u8BA4 >");
  if (!r1.ok) {
    throw new PolicyError(
      "phrase-mismatch",
      `\u9010\u5B57\u786E\u8BA4\u5931\u8D25(\u5FC5\u987B\u4E25\u683C\u8F93\u5165\u300C${EXACT_CONFIRM_PHRASE}\u300D,\u5927\u5C0F\u5199\u3001\u7A7A\u683C\u3001\u53D8\u4F53\u5747\u4E0D\u63A5\u53D7),\u5DF2\u53D6\u6D88\u786C\u5220\u9664\u3002`
    );
  }
  if (!skipSoftReoffer) {
    info("");
    info(
      color.dim(
        "\u6700\u540E\u4E00\u6B21\u63D0\u9192:\u4F60\u4E5F\u53EF\u4EE5\u6539\u7528\u8F6F\u5220\u9664(\u79FB\u52A8\u5230 .trash/<\u65E5\u671F>/),7 \u5929\u5185\u4ECD\u53EF\u6062\u590D\u3002"
      )
    );
    info(color.dim("\u56DE\u8F66 / y \u6539\u8D70\u8F6F\u5220\u9664;\u8F93\u5165 n \u624D\u4F1A\u771F\u6B63\u8C03\u7528 OpenAPI \u6C38\u4E45\u5220\u9664\u3002"));
    const wantsSoft = await confirmYesNo("\u6539\u7528\u8F6F\u5220\u9664?", false);
    if (wantsSoft) {
      throw new PolicyError(
        "user-chose-soft",
        "\u7528\u6237\u5728\u6700\u540E\u4E00\u5173\u9009\u62E9\u6539\u8D70\u8F6F\u5220\u9664\u3002\u8BF7\u6539\u7528 `pan.cjs rm <path>`(\u4E0D\u5E26 --hard)\u3002"
      );
    }
  }
}
function printDeleteList(targets) {
  const totalBytes = targets.reduce((s, t) => s + (t.isdir ? 0 : t.size), 0);
  info(color.bold(`\u5373\u5C06\u6C38\u4E45\u5220\u9664 ${targets.length} \u9879,\u5408\u8BA1 ${formatBytes(totalBytes)}:`));
  const head = targets.slice(0, 5);
  for (const t of head) {
    info("  " + formatTargetLine(t));
  }
  if (targets.length > 5) {
    const remainingBytes = targets.slice(5).reduce((s, t) => s + (t.isdir ? 0 : t.size), 0);
    info(
      color.dim(
        `  ... \u8FD8\u6709 ${targets.length - 5} \u9879\u672A\u5728\u6B64\u5217\u51FA(\u5176\u4E2D\u6587\u4EF6\u90E8\u5206\u5408\u8BA1 ${formatBytes(remainingBytes)})`
      )
    );
  }
}
function formatTargetLine(t) {
  const mtime = color.dim(formatTime(t.mtime));
  if (t.isdir) {
    const childInfo = typeof t.children === "number" ? `(\u5B50\u9879 ${t.children})` : "(\u5B50\u9879\u6570\u672A\u77E5)";
    return `- ${t.path}/  ${color.cyan("\u76EE\u5F55" + childInfo)}  ${mtime}`;
  }
  return `- ${t.path}  ${formatBytes(t.size).padStart(8)}  ${mtime}`;
}

// src/share.ts
async function createShare(cfg, fsids, opts = {}, creds) {
  const body = {
    fid_list: JSON.stringify(fsids),
    period: opts.period ?? 0
  };
  if (opts.pwd !== void 0 && opts.pwd.length > 0) {
    body.pwd = opts.pwd;
  }
  return xpanPostForm(
    cfg,
    ENDPOINTS.shareSet,
    body,
    {},
    {},
    creds
  );
}
async function transferShare(cfg, opts, creds) {
  const body = {
    shareid: opts.shareid,
    uk: opts.uk,
    path: opts.destPath
  };
  if (opts.pwd)
    body.pwd = opts.pwd;
  if (opts.fsids && opts.fsids.length > 0) {
    body.fsids = JSON.stringify(opts.fsids);
  }
  return xpanPostForm(
    cfg,
    ENDPOINTS.shareTransfer,
    body,
    {},
    {},
    creds
  );
}

// src/pan.ts
var VERSION = "0.0.1-alpha.0";
function parseLimit(raw, fallback) {
  if (!raw)
    return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`--limit \u5FC5\u987B\u662F\u6B63\u6574\u6570,\u5B9E\u9645\u4E3A ${raw}`);
  }
  return n;
}
async function runWithErrorHandling(fn) {
  try {
    await fn();
  } catch (e) {
    if (e instanceof AuthError) {
      error(formatError(e));
      import_node_process3.stderr.write(color.dim("\u63D0\u793A:\u8FD0\u884C `pan.cjs login` \u91CD\u65B0\u767B\u5F55\u3002\n"));
    } else if (e instanceof ScopeError || e instanceof PolicyError || e instanceof ConfigError || e instanceof BaiduError || e instanceof HttpError) {
      error(formatError(e));
    } else if (e instanceof Error) {
      error(e.message);
    } else {
      error(String(e));
    }
    (0, import_node_process3.exit)(1);
  }
}
async function cmdStatus(opts) {
  const cfg = loadConfig();
  const profile = cfg.activeProfile ?? "default";
  const tok = loadToken(profile);
  if (!tok) {
    info("\u672A\u767B\u5F55\u3002\u8FD0\u884C " + color.cyan("pan.cjs login") + " \u5B8C\u6210\u767B\u5F55\u3002");
    return;
  }
  const now = Math.floor(Date.now() / 1e3);
  const remaining = tok.expires_at - now;
  const expiryTxt = formatTime(tok.expires_at);
  const expirySuffix = remaining <= 0 ? color.red("(\u5DF2\u8FC7\u671F)") : remaining < 600 ? color.yellow(`(${Math.max(0, Math.floor(remaining / 60))} \u5206\u949F\u540E\u8FC7\u671F)`) : color.dim(`(\u8FD8\u6709 ${Math.floor(remaining / 3600)} \u5C0F\u65F6)`);
  info(color.bold("=== \u767B\u5F55\u72B6\u6001 ==="));
  info(`profile:  ${profile}`);
  info(`\u767B\u5F55\u65B9\u5F0F: ${tok.kind}${tok.kind === "manual" ? color.yellow(" (\u65E0\u81EA\u52A8\u7EED\u671F,\u8FC7\u671F\u9700\u91CD\u65B0\u7C98\u8D34)") : ""}`);
  info(`token \u8FC7\u671F: ${expiryTxt} ${expirySuffix}`);
  info(`scope:    ${tok.scope}`);
  info("");
  info(color.bold("=== \u4F5C\u7528\u57DF ==="));
  const envScope = process.env.BAIDU_DRIVE_SCOPE;
  const envAppName = process.env.BAIDU_DRIVE_APP_NAME;
  const envAllowed = process.env.BAIDU_DRIVE_ALLOWED_PATHS;
  info(`\u5F53\u524D\u6A21\u5F0F: ${cfg.scope}${envScope ? color.yellow(" (\u7531 BAIDU_DRIVE_SCOPE \u8986\u76D6)") : ""}`);
  info(`\u9ED8\u8BA4\u6839:   ${getScopeRoot(cfg)}  ${color.dim("(" + toDisplayPath(getScopeRoot(cfg)) + ")")}`);
  if (cfg.scope === "full" && cfg.allowedPaths.length > 0) {
    info(`\u767D\u540D\u5355:   ${cfg.allowedPaths.join(", ")}${envAllowed ? color.yellow(" (\u7531 BAIDU_DRIVE_ALLOWED_PATHS \u8986\u76D6)") : ""}`);
  }
  if (envAppName) {
    info(`\u5E94\u7528\u540D:   ${cfg.appName} ${color.yellow("(\u7531 BAIDU_DRIVE_APP_NAME \u8986\u76D6)")}`);
  }
  if (cfg.scope === "full") {
    warn("\u5DF2\u5F00\u542F\u5168\u76D8\u6A21\u5F0F,\u6240\u6709\u547D\u4EE4\u5C06\u4F5C\u7528\u4E8E\u6574\u4E2A\u7F51\u76D8,\u8BF7\u5BA1\u614E\u64CD\u4F5C\u3002");
  }
  try {
    const u = await getUserInfo(cfg, opts);
    const q = await getQuota(cfg, opts);
    info("");
    info(color.bold("=== \u8D26\u53F7 ==="));
    info(`\u7528\u6237:     ${u.netdisk_name ?? u.baidu_name ?? "-"}`);
    if (typeof u.vip_type === "number") {
      info(`\u4F1A\u5458:     ${u.vip_type === 0 ? "\u666E\u901A\u7528\u6237" : `VIP${u.vip_type}`}`);
    }
    if (typeof u.uk === "number") {
      info(`uk:       ${u.uk}`);
    }
    if (typeof q.total === "number" && typeof q.used === "number") {
      const pct = q.total > 0 ? (q.used / q.total * 100).toFixed(1) : "0";
      info(`\u5BB9\u91CF:     ${formatBytes(q.used)} / ${formatBytes(q.total)} (${pct}%)`);
    }
  } catch (e) {
    info("");
    warn(`\u65E0\u6CD5\u83B7\u53D6\u8D26\u53F7\u4FE1\u606F: ${formatError(e)}`);
  }
}
async function cmdScope(arg, opts) {
  const cfg = loadConfig();
  const envScope = process.env.BAIDU_DRIVE_SCOPE;
  const envAppName = process.env.BAIDU_DRIVE_APP_NAME;
  const envAllowed = process.env.BAIDU_DRIVE_ALLOWED_PATHS;
  if (opts.print || !arg && !opts.appName) {
    import_node_process3.stdout.write(cfg.scope + "\n");
    if (envScope) {
      warn(`\u6CE8\u610F:BAIDU_DRIVE_SCOPE=${envScope} \u73AF\u5883\u53D8\u91CF\u6B63\u5728\u8986\u76D6 config.json \u7684\u503C\u3002`);
    }
    return;
  }
  const next = { ...cfg };
  if (opts.appName) {
    next.appName = opts.appName;
  }
  if (arg) {
    if (arg !== "sandbox" && arg !== "full") {
      throw new Error(`scope \u53EA\u80FD\u662F sandbox \u6216 full,\u5B9E\u9645\u4E3A: ${arg}`);
    }
    next.scope = arg;
  }
  saveConfig(next);
  const warnings = [];
  if (envScope)
    warnings.push(`BAIDU_DRIVE_SCOPE=${envScope} \u4F1A\u8986\u76D6\u521A\u5199\u5165\u7684 scope,\u5B9E\u9645\u751F\u6548\u4E3A ${envScope}\u3002`);
  if (envAppName && opts.appName)
    warnings.push(`BAIDU_DRIVE_APP_NAME=${envAppName} \u4F1A\u8986\u76D6\u521A\u5199\u5165\u7684 appName\u3002`);
  if (envAllowed && next.scope === "full" && next.allowedPaths.length > 0)
    warnings.push("BAIDU_DRIVE_ALLOWED_PATHS \u4F1A\u8986\u76D6 config.json \u7684\u767D\u540D\u5355\u3002");
  if (next.scope === "full" && next.scope !== cfg.scope) {
    warn("\u5DF2\u5F00\u542F\u5168\u76D8\u6A21\u5F0F \u26A0");
    warn("\u6240\u6709\u547D\u4EE4\u5C06\u4F5C\u7528\u4E8E\u6574\u4E2A\u7F51\u76D8\u3002\u5EFA\u8BAE\u5728 config.json \u8BBE\u7F6E allowedPaths \u9650\u5236\u8303\u56F4\u3002");
  }
  success(
    `\u5DF2\u4FDD\u5B58:scope=${next.scope}, appName=${next.appName}` + (next.scope === "sandbox" ? `, \u6C99\u76D2\u6839=${getScopeRoot(next)}` : "")
  );
  for (const w of warnings)
    warn(w);
}
async function cmdLs(rawPath, opts) {
  const cfg = loadConfig();
  const limit = parseLimit(opts.limit, 1e3);
  const order = opts.order ?? "time";
  let entries;
  if (opts.recursive) {
    entries = await listRecursive(cfg, rawPath, { order, desc: opts.desc, limit }, opts);
  } else if (opts.all) {
    entries = await lsAll(cfg, rawPath, { order, desc: opts.desc, folderOnly: opts.folder }, opts);
  } else {
    entries = await ls(
      cfg,
      rawPath,
      { order, desc: opts.desc, folderOnly: opts.folder, limit },
      opts
    );
  }
  if (opts.json) {
    import_node_process3.stdout.write(JSON.stringify(entries, null, 2) + "\n");
    return;
  }
  if (entries.length === 0) {
    info(color.dim("(\u7A7A\u76EE\u5F55)"));
    return;
  }
  const totalSize = entries.reduce((s, e) => s + (e.isdir ? 0 : e.size), 0);
  const fileCnt = entries.filter((e) => !e.isdir).length;
  const dirCnt = entries.length - fileCnt;
  const widthName = Math.min(
    60,
    Math.max(...entries.map((e) => visibleWidth(e.server_filename + (e.isdir ? "/" : ""))))
  );
  for (const e of entries) {
    const name = e.server_filename + (e.isdir ? "/" : "");
    const sizeStr = e.isdir ? color.dim("       -") : formatBytes(e.size).padStart(8);
    const mtime = formatTime(e.server_mtime);
    const colored = e.isdir ? color.cyan(name) : name;
    import_node_process3.stdout.write(`${padRight(colored, widthName, name)}  ${sizeStr}  ${color.dim(mtime)}
`);
  }
  info("");
  info(
    color.dim(
      `\u5171 ${entries.length} \u9879(${dirCnt} \u76EE\u5F55, ${fileCnt} \u6587\u4EF6, \u5408\u8BA1 ${formatBytes(totalSize)})`
    )
  );
}
async function cmdMkdir(rawPath, opts) {
  const cfg = loadConfig();
  const res = await mkdir(cfg, rawPath, {}, opts);
  success(`\u5DF2\u521B\u5EFA\u76EE\u5F55: ${res.path ?? rawPath}`);
}
async function cmdUpload(localPath, remotePath, opts) {
  const cfg = loadConfig();
  const rtypeNum = opts.rtype === "0" ? 0 : opts.rtype === "1" ? 1 : opts.rtype === "2" ? 2 : opts.rtype === "3" ? 3 : 1;
  let bar;
  const res = await upload(cfg, localPath, remotePath, {
    noResume: opts.noResume,
    rtype: rtypeNum,
    onProgress: (done, total) => {
      if (!bar) {
        bar = new ProgressBar({ total, label: `\u4E0A\u4F20 ${localPath}` });
      }
      bar.update(done);
    }
  }, opts);
  bar?.done();
  if (res.rapid) {
    success(`\u79D2\u4F20\u6210\u529F: ${res.remotePath} (fs_id=${res.fs_id}, md5=${res.md5})`);
  } else {
    success(`\u4E0A\u4F20\u5B8C\u6210: ${res.remotePath} (fs_id=${res.fs_id}, \u5206\u7247=${res.parts}${res.resumed ? ", \u5DF2\u7EED\u4F20" : ""})`);
  }
}
async function cmdDownload(remotePath, localPath, opts) {
  const cfg = loadConfig();
  let bar;
  const res = await download(cfg, remotePath, localPath, {
    onProgress: (done, total) => {
      if (!bar) {
        bar = new ProgressBar({ total, label: `\u4E0B\u8F7D ${remotePath}` });
      }
      bar.update(done);
    }
  }, opts);
  bar?.done();
  success(`\u4E0B\u8F7D\u5B8C\u6210: ${res.localPath} (${formatBytes(res.size)}, ${res.parts} \u4E2A\u5206\u7247${res.localMd5 ? ", md5 OK" : ""})`);
}
async function cmdRm(paths, opts) {
  const cfg = loadConfig();
  if (paths.length === 0) {
    throw new Error("\u672A\u6307\u5B9A\u8981\u5220\u9664\u7684\u8DEF\u5F84");
  }
  if (opts.hard) {
    const targets = [];
    for (const p of paths) {
      const entry = await statByPath(cfg, p, opts);
      if (!entry) {
        throw new Error(`\u8DEF\u5F84\u4E0D\u5B58\u5728,\u65E0\u6CD5\u786C\u5220\u9664: ${p}`);
      }
      targets.push({
        path: entry.path,
        size: entry.size,
        mtime: entry.server_mtime,
        isdir: entry.isdir === 1,
        children: entry.isdir === 1 ? void 0 : void 0
      });
    }
    await guardHardDelete({ cfg, targets, yes: opts.yes });
    const res = await hardRm(cfg, paths, opts);
    const okCount = (res.info ?? []).filter((i) => i.errno === 0 || i.errno === void 0).length;
    success(`\u786C\u5220\u9664\u5B8C\u6210: ${okCount}/${paths.length} \u9879`);
  } else {
    for (const p of paths) {
      const r = await softRm(cfg, p, opts);
      success(`\u5DF2\u8F6F\u5220\u9664: ${r.src} \u2192 ${r.movedAs}`);
    }
  }
}
async function cmdSearch(keyword, opts) {
  const cfg = loadConfig();
  if (opts.semantic || opts.auto) {
    const searchType = opts.semantic ? 1 : 2;
    const categoryArr = opts.category ? opts.category.split(",").map((s) => Number.parseInt(s.trim(), 10)).filter((n) => n >= 1 && n <= 7) : void 0;
    const list = await semanticSearch(cfg, {
      query: keyword,
      dir: opts.dir,
      category: categoryArr,
      num: 500,
      searchType
    }, opts);
    if (opts.json) {
      import_node_process3.stdout.write(JSON.stringify(list, null, 2) + "\n");
      return;
    }
    if (list.length === 0) {
      info(color.dim("(\u672A\u627E\u5230\u5339\u914D\u9879)"));
      return;
    }
    const totalSize2 = list.reduce((s, e) => s + (e.isdir ? 0 : e.size), 0);
    const fileCnt2 = list.filter((e) => e.isdir !== 1).length;
    const dirCnt2 = list.length - fileCnt2;
    const widthName2 = Math.min(
      60,
      Math.max(...list.map((e) => visibleWidth(e.filename + (e.isdir ? "/" : ""))))
    );
    for (const e of list) {
      const name = e.filename + (e.isdir ? "/" : "");
      const sizeStr = e.isdir ? color.dim("       -") : formatBytes(e.size).padStart(8);
      const mtime = formatTime(e.server_mtime);
      const colored = e.isdir ? color.cyan(name) : name;
      const catNum = Number.parseInt(e.category, 10);
      const cat = !Number.isNaN(catNum) && CATEGORY_NAMES[catNum] ? color.dim(`[${CATEGORY_NAMES[catNum]}]`) : "";
      const contentHint = e.content ? color.dim("(\u5185\u5BB9\u5339\u914D)") : "";
      const ocrHint = e.ocr ? color.dim("(OCR\u5339\u914D)") : "";
      import_node_process3.stdout.write(`${padRight(colored, widthName2, name)}  ${sizeStr}  ${color.dim(mtime)}  ${cat} ${contentHint}${ocrHint}
`);
    }
    info("");
    info(
      color.dim(
        `\u5171 ${list.length} \u9879(${dirCnt2} \u76EE\u5F55, ${fileCnt2} \u6587\u4EF6, \u5408\u8BA1 ${formatBytes(totalSize2)})`
      )
    );
    return;
  }
  const categoryNum = opts.category ? Number.parseInt(opts.category, 10) : void 0;
  const res = await search(cfg, {
    key: keyword,
    dir: opts.dir,
    category: categoryNum,
    recursion: true,
    page: 1,
    num: 1e3
  }, opts);
  if (opts.json) {
    import_node_process3.stdout.write(JSON.stringify(res.list, null, 2) + "\n");
    return;
  }
  if (res.list.length === 0) {
    info(color.dim("(\u672A\u627E\u5230\u5339\u914D\u9879)"));
    return;
  }
  const totalSize = res.list.reduce((s, e) => s + (e.isdir ? 0 : e.size), 0);
  const fileCnt = res.list.filter((e) => !e.isdir).length;
  const dirCnt = res.list.length - fileCnt;
  const widthName = Math.min(
    60,
    Math.max(...res.list.map((e) => visibleWidth(e.server_filename + (e.isdir ? "/" : ""))))
  );
  for (const e of res.list) {
    const name = e.server_filename + (e.isdir ? "/" : "");
    const sizeStr = e.isdir ? color.dim("       -") : formatBytes(e.size).padStart(8);
    const mtime = formatTime(e.server_mtime);
    const colored = e.isdir ? color.cyan(name) : name;
    const cat = e.category && CATEGORY_NAMES[e.category] ? color.dim(`[${CATEGORY_NAMES[e.category]}]`) : "";
    import_node_process3.stdout.write(`${padRight(colored, widthName, name)}  ${sizeStr}  ${color.dim(mtime)}  ${cat}
`);
  }
  info("");
  info(
    color.dim(
      `\u5171 ${res.list.length} \u9879(${dirCnt} \u76EE\u5F55, ${fileCnt} \u6587\u4EF6, \u5408\u8BA1 ${formatBytes(totalSize)})`
    )
  );
  if (res.hasMore) {
    warn("\u7ED3\u679C\u8F83\u591A,\u4EC5\u5C55\u793A\u524D 1000 \u6761\u3002\u8BF7\u7528 --json \u83B7\u53D6\u5B8C\u6574\u6570\u636E\u6216\u7F29\u5C0F\u5173\u952E\u8BCD\u3002");
  }
}
async function cmdMv(src, dst, opts) {
  const cfg = loadConfig();
  const ondup = opts.overwrite ? "overwrite" : "newcopy";
  const infoList = await move(cfg, src, dst, { ondup }, opts);
  const ok = infoList.filter((i) => i.errno === 0 || i.errno === void 0).length;
  success(`\u79FB\u52A8\u5B8C\u6210: ${ok}/${infoList.length} \u9879`);
  for (const i of infoList) {
    if (i.path)
      info(`  \u2192 ${i.path}`);
  }
}
async function cmdCp(src, dst, opts) {
  const cfg = loadConfig();
  const ondup = opts.overwrite ? "overwrite" : "newcopy";
  const infoList = await copy(cfg, src, dst, { ondup }, opts);
  const ok = infoList.filter((i) => i.errno === 0 || i.errno === void 0).length;
  success(`\u590D\u5236\u5B8C\u6210: ${ok}/${infoList.length} \u9879`);
  for (const i of infoList) {
    if (i.path)
      info(`  \u2192 ${i.path}`);
  }
}
async function cmdRename(path, newName, opts) {
  const cfg = loadConfig();
  const infoList = await rename(cfg, path, newName, opts);
  const ok = infoList.filter((i) => i.errno === 0 || i.errno === void 0).length;
  success(`\u91CD\u547D\u540D\u5B8C\u6210: ${ok}/${infoList.length} \u9879`);
}
async function cmdShare(rawPath, opts) {
  const cfg = loadConfig();
  const entry = await statByPath(cfg, rawPath, opts);
  if (!entry) {
    throw new Error(`\u8DEF\u5F84\u4E0D\u5B58\u5728: ${rawPath}`);
  }
  const period = opts.days ? Number.parseInt(opts.days, 10) : 0;
  const res = await createShare(cfg, [entry.fs_id], { pwd: opts.pwd, period }, opts);
  if (opts.json) {
    import_node_process3.stdout.write(JSON.stringify(res, null, 2) + "\n");
    return;
  }
  if (res.link || res.shortlink) {
    success("\u5206\u4EAB\u521B\u5EFA\u6210\u529F");
    if (res.link)
      info(`\u94FE\u63A5: ${osc8(res.link, res.link)}`);
    if (res.shortlink)
      info(`\u77ED\u94FE: ${osc8(res.shortlink, res.shortlink)}`);
    if (res.pwd)
      info(`\u5BC6\u7801: ${color.bold(res.pwd)}`);
  } else {
    throw new Error("\u5206\u4EAB\u521B\u5EFA\u5931\u8D25:\u672A\u8FD4\u56DE\u94FE\u63A5");
  }
}
async function cmdTransfer(destPath, opts) {
  const cfg = loadConfig();
  if (!opts.shareid || !opts.uk) {
    throw new Error("\u8F6C\u5B58\u5206\u4EAB\u5FC5\u987B\u63D0\u4F9B --shareid \u548C --uk");
  }
  const shareid = Number.parseInt(opts.shareid, 10);
  const uk = Number.parseInt(opts.uk, 10);
  if (!Number.isFinite(shareid) || !Number.isFinite(uk)) {
    throw new Error("--shareid \u548C --uk \u5FC5\u987B\u662F\u6570\u5B57");
  }
  const fsids = opts.fsids ? opts.fsids.split(",").map((s) => Number.parseInt(s.trim(), 10)).filter(Number.isFinite) : void 0;
  const res = await transferShare(
    cfg,
    { shareid, uk, pwd: opts.pwd, destPath, fsids },
    opts
  );
  success("\u8F6C\u5B58\u5B8C\u6210");
  if (res.extra?.list && res.extra.list.length > 0) {
    for (const item of res.extra.list) {
      if (item.to)
        info(`  \u2192 ${item.to}`);
    }
  }
}
async function cmdCategory(typeStr, opts) {
  const cfg = loadConfig();
  const validTypes = ["doc", "image", "video", "bt"];
  const type = validTypes.find((t) => t === typeStr);
  if (!type) {
    throw new Error(`\u4E0D\u652F\u6301\u7684\u5206\u7C7B\u7C7B\u578B:${typeStr}\u3002\u53EF\u9009:doc | image | video | bt`);
  }
  const entries = await categoryList(cfg, type, {
    dir: opts.dir,
    order: opts.order,
    desc: opts.desc,
    limit: 1e3
  }, opts);
  if (opts.json) {
    import_node_process3.stdout.write(JSON.stringify(entries, null, 2) + "\n");
    return;
  }
  if (entries.length === 0) {
    info(color.dim("(\u65E0\u5185\u5BB9)"));
    return;
  }
  const widthName = Math.min(
    60,
    Math.max(...entries.map((e) => visibleWidth(e.server_filename + (e.isdir ? "/" : ""))))
  );
  for (const e of entries) {
    const name = e.server_filename + (e.isdir ? "/" : "");
    const sizeStr = e.isdir ? color.dim("       -") : formatBytes(e.size).padStart(8);
    const mtime = formatTime(e.server_mtime);
    const colored = e.isdir ? color.cyan(name) : name;
    import_node_process3.stdout.write(`${padRight(colored, widthName, name)}  ${sizeStr}  ${color.dim(mtime)}
`);
  }
  info(color.dim(`\u5171 ${entries.length} \u9879`));
}
async function cmdTask(taskidStr, opts) {
  const cfg = loadConfig();
  const taskid = Number.parseInt(taskidStr, 10);
  if (!Number.isFinite(taskid)) {
    throw new Error(`taskid \u5FC5\u987B\u662F\u6570\u5B57: ${taskidStr}`);
  }
  if (opts.poll) {
    info(`\u5F00\u59CB\u8F6E\u8BE2\u4EFB\u52A1 ${taskid}...`);
    const res2 = await pollTask(cfg, taskid, opts, (status, retry) => {
      const statusText2 = status === 1 ? "\u8FDB\u884C\u4E2D" : status === 0 ? "\u5B8C\u6210" : status === 2 ? "\u5931\u8D25" : "\u672A\u77E5";
      info(`\u7B2C ${retry} \u6B21\u67E5\u8BE2: ${statusText2}`);
    });
    if (res2.status === 0) {
      success(`\u4EFB\u52A1\u5B8C\u6210: ${taskid}`);
    } else if (res2.status === 2) {
      throw new Error(`\u4EFB\u52A1\u5931\u8D25(task_errno=${res2.task_errno})`);
    }
    return;
  }
  const res = await queryTask(cfg, taskid, opts);
  const statusText = res.status === 0 ? "\u5B8C\u6210" : res.status === 1 ? "\u8FDB\u884C\u4E2D" : res.status === 2 ? "\u5931\u8D25" : "\u672A\u77E5";
  info(`\u4EFB\u52A1 ${taskid}: ${statusText}`);
  if (res.list && res.list.length > 0) {
    for (const item of res.list) {
      if (item.path)
        info(`  ${item.path}: result=${item.result}`);
    }
  }
}
async function cmdTrash(opts) {
  const cfg = loadConfig();
  const root = getScopeRoot(cfg);
  const trashDir = `${root}/.trash`;
  if (opts.list || !opts.gc && !opts.restore) {
    try {
      const dates = await ls(cfg, trashDir, {}, opts);
      if (dates.length === 0) {
        info(color.dim(".trash \u4E3A\u7A7A"));
        return;
      }
      for (const d of dates) {
        if (d.isdir !== 1)
          continue;
        const datePath = `${trashDir}/${d.server_filename}`;
        const items = await lsAll(cfg, datePath, {}, opts);
        const size = items.reduce((s, e) => s + (e.isdir ? 0 : e.size), 0);
        info(`${color.cyan(d.server_filename + "/")}: ${items.length} \u9879, \u5408\u8BA1 ${formatBytes(size)}`);
        for (const item of items.slice(0, 20)) {
          const name = item.server_filename + (item.isdir ? "/" : "");
          const sizeStr = item.isdir ? "-" : formatBytes(item.size);
          import_node_process3.stdout.write(`  ${name.padEnd(40)} ${sizeStr}
`);
        }
        if (items.length > 20) {
          import_node_process3.stdout.write(`  ... \u8FD8\u6709 ${items.length - 20} \u9879
`);
        }
      }
    } catch (e) {
      if (e instanceof BaiduError && e.errno === -9) {
        info(color.dim(".trash \u5C1A\u672A\u521B\u5EFA"));
        return;
      }
      throw e;
    }
    return;
  }
  if (opts.restore) {
    const srcPath = assertInScope(opts.restore, cfg);
    if (!srcPath.startsWith(`${trashDir}/`)) {
      throw new Error(`\u6062\u590D\u6E90\u5FC5\u987B\u5728 .trash \u76EE\u5F55\u5185: ${opts.restore}`);
    }
    const dest = opts.to ?? root;
    const infoList = await move(cfg, srcPath, dest, { ondup: "newcopy" }, opts);
    const ok = infoList.filter((i) => i.errno === 0 || i.errno === void 0).length;
    success(`\u6062\u590D\u5B8C\u6210: ${ok}/${infoList.length} \u9879`);
    for (const i of infoList) {
      if (i.path)
        info(`  \u2192 ${i.path}`);
    }
    return;
  }
  if (opts.gc) {
    const cutoff = /* @__PURE__ */ new Date();
    cutoff.setDate(cutoff.getDate() - cfg.trash.retainDays);
    let dates;
    try {
      dates = await ls(cfg, trashDir, {}, opts);
    } catch (e) {
      if (e instanceof BaiduError && e.errno === -9) {
        info(color.dim(".trash \u4E3A\u7A7A,\u65E0\u9700\u6E05\u7406"));
        return;
      }
      throw e;
    }
    const targets = [];
    for (const d of dates) {
      if (d.isdir !== 1)
        continue;
      const dateStr = d.server_filename;
      const dateObj = /* @__PURE__ */ new Date(dateStr + "T00:00:00");
      if (Number.isNaN(dateObj.getTime()) || dateObj >= cutoff)
        continue;
      const datePath = `${trashDir}/${dateStr}`;
      const items = await lsAll(cfg, datePath, {}, opts);
      for (const item of items) {
        targets.push({
          path: item.path,
          size: item.size,
          mtime: item.server_mtime,
          isdir: item.isdir === 1
        });
      }
    }
    if (targets.length === 0) {
      info(color.dim(`\u6CA1\u6709\u8D85\u8FC7 ${cfg.trash.retainDays} \u5929\u7684\u9879\u76EE\u9700\u8981\u6E05\u7406`));
      return;
    }
    info(`\u5373\u5C06\u6E05\u7406 ${targets.length} \u9879(\u8D85\u8FC7 ${cfg.trash.retainDays} \u5929):`);
    for (const t of targets.slice(0, 10)) {
      info(`  ${t.path} (${formatBytes(t.size)})`);
    }
    if (targets.length > 10) {
      info(`  ... \u8FD8\u6709 ${targets.length - 10} \u9879`);
    }
    await guardHardDelete({ cfg, targets, yes: false });
    const paths = targets.map((t) => t.path);
    const BATCH = 100;
    let deleted = 0;
    for (let i = 0; i < paths.length; i += BATCH) {
      const batch = paths.slice(i, i + BATCH);
      const res = await hardRm(cfg, batch, opts);
      const ok = (res.info ?? []).filter((item) => item.errno === 0 || item.errno === void 0).length;
      deleted += ok;
    }
    success(`\u6E05\u7406\u5B8C\u6210: ${deleted}/${targets.length} \u9879`);
    return;
  }
}
async function cmdLogout() {
  const cfg = loadConfig();
  const profile = cfg.activeProfile ?? "default";
  logout(profile);
  success(`\u5DF2\u9000\u51FA\u767B\u5F55,profile "${profile}" \u7684 token \u5DF2\u6E05\u9664\u3002\u5982\u6709\u81EA\u6709\u5E94\u7528\u5BA2\u6237\u7AEF\u5BC6\u94A5\u4ECD\u5B58\u653E\u4E8E config.json,\u8BF7\u6309\u9700\u81EA\u884C\u7BA1\u7406\u3002`);
}
async function cmdProfile(opts) {
  const cfg = loadConfig();
  const current = cfg.activeProfile ?? "default";
  if (opts.switch) {
    const next = opts.switch;
    const nextCfg = { ...cfg, activeProfile: next };
    saveConfig(nextCfg);
    success(`\u5DF2\u5207\u6362 profile:"${next}"`);
    const tok = loadToken(next);
    if (!tok) {
      warn(`profile "${next}" \u5C1A\u672A\u767B\u5F55,\u8FD0\u884C pan.cjs login \u5B8C\u6210\u767B\u5F55\u3002`);
    }
    return;
  }
  if (opts.add) {
    const name = opts.add;
    success(`\u5DF2\u6DFB\u52A0 profile:"${name}",\u5F53\u524D\u4ECD\u4E3A "${current}"\u3002\u8FD0\u884C pan.cjs profile --switch ${name} \u5207\u6362\u3002`);
    return;
  }
  if (opts.remove) {
    const name = opts.remove;
    if (name === "default") {
      throw new Error("\u4E0D\u80FD\u5220\u9664 default profile");
    }
    if (name === current) {
      throw new Error(`\u4E0D\u80FD\u5220\u9664\u5F53\u524D\u6FC0\u6D3B\u7684 profile "${name}",\u8BF7\u5148\u5207\u6362\u5230\u5176\u4ED6 profile\u3002`);
    }
    deleteToken(name);
    success(`\u5DF2\u5220\u9664 profile:"${name}" \u7684 token\u3002`);
    return;
  }
  const profiles = listProfiles();
  info(color.bold("=== Profile \u5217\u8868 ==="));
  for (const p of profiles) {
    const marker = p === current ? color.green(" (\u5F53\u524D)") : "";
    const hasToken = loadToken(p) ? color.dim(" [\u5DF2\u767B\u5F55]") : color.dim(" [\u672A\u767B\u5F55]");
    info(`  ${p}${marker}${hasToken}`);
  }
}
function visibleWidth(s) {
  let w = 0;
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    const isWide = code >= 4352 && code <= 4447 || code >= 11904 && code <= 40959 || code >= 40960 && code <= 42191 || code >= 44032 && code <= 55203 || code >= 63744 && code <= 64255 || code >= 65072 && code <= 65103 || code >= 65280 && code <= 65376 || code >= 65504 && code <= 65510;
    w += isWide ? 2 : 1;
  }
  return w;
}
function padRight(coloredText, targetWidth, plainTextForWidth) {
  const pad = Math.max(0, targetWidth - visibleWidth(plainTextForWidth));
  return coloredText + " ".repeat(pad);
}
function main() {
  const program2 = new Command();
  program2.name("pan.cjs").description("\u767E\u5EA6\u7F51\u76D8\u5F00\u6E90 Skill CLI(\u76F4\u8FDE OpenAPI,\u65E0 binary \u4F9D\u8D56)").version(VERSION).option("--client-id <id>", "OAuth \u81EA\u6709\u5E94\u7528 client_id(\u8986\u76D6 env / config.json)").option("--client-secret <secret>", "OAuth \u81EA\u6709\u5E94\u7528 client_secret(\u8986\u76D6 env / config.json)");
  program2.command("login").description("\u767B\u5F55\u767E\u5EA6\u8D26\u53F7(\u9ED8\u8BA4 device code,\u5931\u8D25\u53EF\u52A0 --oob)").option("--device", "\u4F7F\u7528 device code \u767B\u5F55(\u9ED8\u8BA4)").option("--oob", "\u4F7F\u7528 OOB authorization code(SSH/\u65E0\u6D4F\u89C8\u5668\u573A\u666F)").option("--manual", "\u7C98\u8D34\u9650\u65F6\u4F53\u9A8C access_token(\u65E0\u81EA\u52A8\u7EED\u671F)").option("--token <token>", "manual \u6A21\u5F0F\u4E0B\u76F4\u63A5\u4F20\u5165 token(\u9AD8\u5371,\u4EC5\u81EA\u52A8\u5316\u7528)").option("--yes", "\u8DF3\u8FC7\u514D\u8D23\u58F0\u660E(\u4EC5\u63A8\u8350\u81EA\u52A8\u5316\u6D4B\u8BD5\u4F7F\u7528)").action(async (cmdOpts) => {
    const root = program2.opts();
    const mode = cmdOpts.oob ? "oob" : cmdOpts.manual ? "manual" : cmdOpts.device ? "device" : "auto";
    await runWithErrorHandling(
      () => runLogin({
        mode,
        clientId: root.clientId,
        clientSecret: root.clientSecret,
        token: cmdOpts.token,
        skipDisclaimer: Boolean(cmdOpts.yes)
      })
    );
  });
  program2.command("logout").description("\u9000\u51FA\u767B\u5F55,\u5220\u9664\u5F53\u524D profile \u7684 token").action(async () => {
    await runWithErrorHandling(cmdLogout);
  });
  program2.command("profile").description("\u7BA1\u7406\u591A\u8D26\u53F7 profile").option("--list", "\u5217\u51FA\u6240\u6709 profile(\u9ED8\u8BA4\u884C\u4E3A)").option("--switch <name>", "\u5207\u6362\u5230\u6307\u5B9A profile").option("--add <name>", "\u6DFB\u52A0\u65B0 profile").option("--remove <name>", "\u5220\u9664 profile \u53CA\u5176 token").action(async (cmdOpts) => {
    await runWithErrorHandling(() => cmdProfile(cmdOpts));
  });
  program2.command("status").description("\u663E\u793A\u5F53\u524D\u767B\u5F55\u8D26\u53F7\u3001\u914D\u989D\u3001scope\u3001token \u8FC7\u671F\u65F6\u95F4").action(async () => {
    const root = program2.opts();
    await runWithErrorHandling(() => cmdStatus(root));
  });
  program2.command("scope [mode]").description("\u67E5\u770B\u6216\u5207\u6362\u4F5C\u7528\u57DF(sandbox / full)\u3002\u65E0\u53C2\u6570\u7B49\u540C\u4E8E --print").option("--print", "\u4EC5\u6253\u5370\u5F53\u524D scope").option("--app-name <name>", "\u8BBE\u7F6E\u6C99\u76D2\u6A21\u5F0F\u4E0B\u7684\u5E94\u7528\u540D(=\u6C99\u76D2\u6839 /apps/<name>/)").action(async (mode, cmdOpts) => {
    await runWithErrorHandling(() => cmdScope(mode, cmdOpts));
  });
  program2.command("ls <path>").description("\u5217\u76EE\u5F55(\u6C99\u76D2\u6A21\u5F0F\u4E0B path \u5FC5\u987B\u4EE5 /apps/<your-app>/ \u5F00\u5934)").option("--limit <n>", "\u5355\u9875\u4E0A\u9650(\u9ED8\u8BA4 1000,API \u4E0A\u9650 1000)", "1000").option("--all", "\u81EA\u52A8\u7FFB\u9875\u62C9\u5168\u90E8(\u5927\u76EE\u5F55\u614E\u7528)").option("--recursive", "\u9012\u5F52\u5217\u51FA\u5B50\u76EE\u5F55\u4E0B\u6240\u6709\u6587\u4EF6").option("--json", "\u8F93\u51FA JSON,\u4FBF\u4E8E\u811A\u672C\u6D88\u8D39").option("--desc", "\u5012\u5E8F\u6392\u5217").option("--order <field>", "\u6392\u5E8F\u5B57\u6BB5:name | time | size", "time").option("--folder", "\u4EC5\u663E\u793A\u5B50\u76EE\u5F55").action(async (path, cmdOpts) => {
    const root = program2.opts();
    await runWithErrorHandling(
      () => cmdLs(path, { ...cmdOpts, clientId: root.clientId, clientSecret: root.clientSecret })
    );
  });
  program2.command("mkdir <path>").description("\u65B0\u5EFA\u76EE\u5F55(\u5DF2\u5B58\u5728\u89C6\u4E3A\u6210\u529F,\u5E42\u7B49)").action(async (path) => {
    const root = program2.opts();
    await runWithErrorHandling(() => cmdMkdir(path, root));
  });
  program2.command("upload <local> <remote>").description("\u4E0A\u4F20\u672C\u5730\u6587\u4EF6\u5230\u7F51\u76D8(\u81EA\u52A8\u5206\u7247\u3001\u65AD\u70B9\u7EED\u4F20\u3001\u79D2\u4F20)").option("--no-resume", "\u5173\u95ED\u65AD\u70B9\u7EED\u4F20,\u6BCF\u6B21\u90FD\u4ECE\u5934\u4E0A\u4F20").option("--rtype <n>", "\u51B2\u7A81\u7B56\u7565:0=\u62A5\u9519 1=\u91CD\u547D\u540D(\u9ED8\u8BA4) 2=\u540C\u5927\u5C0F\u79D2\u4F20 3=\u8986\u76D6", "1").action(async (local, remote, cmdOpts) => {
    const root = program2.opts();
    await runWithErrorHandling(
      () => cmdUpload(local, remote, { ...cmdOpts, clientId: root.clientId, clientSecret: root.clientSecret })
    );
  });
  program2.command("download <remote> <local>").description("\u4E0B\u8F7D\u7F51\u76D8\u6587\u4EF6\u5230\u672C\u5730(>50MB \u81EA\u52A8\u5206\u7247\u5E76\u53D1)").action(async (remote, local) => {
    const root = program2.opts();
    await runWithErrorHandling(() => cmdDownload(remote, local, root));
  });
  program2.command("rm <path...>").description("\u5220\u9664\u6587\u4EF6/\u76EE\u5F55(\u9ED8\u8BA4\u8F6F\u5220\u9664\u5230 .trash;--hard \u6C38\u4E45\u5220\u9664)").option("--hard", "\u6C38\u4E45\u5220\u9664(\u8D70\u56DB\u7EA7\u4FDD\u62A4,\u9010\u5B57\u786E\u8BA4\u300C\u6211\u786E\u8BA4\u6C38\u4E45\u5220\u9664\u300D)").option("--yes", "\u975E Agent \u73AF\u5883\u4E0B\u8DF3\u8FC7 L3/L4 \u786E\u8BA4(\u4ECD\u5217\u51FA\u8303\u56F4)").action(async (paths, cmdOpts) => {
    const root = program2.opts();
    await runWithErrorHandling(
      () => cmdRm(paths, { ...cmdOpts, clientId: root.clientId, clientSecret: root.clientSecret })
    );
  });
  program2.command("search <keyword>").description("\u641C\u7D22\u7F51\u76D8\u6587\u4EF6/\u76EE\u5F55").option("--category <n>", "\u5206\u7C7B\u8FC7\u6EE4:1=\u89C6\u9891 2=\u97F3\u9891 3=\u56FE\u7247 4=\u6587\u6863 5=\u5E94\u7528 6=\u5176\u4ED6 7=\u79CD\u5B50(\u8BED\u4E49\u641C\u7D22\u652F\u6301\u591A\u9009,\u9017\u53F7\u5206\u9694)").option("--dir <path>", "\u9650\u5B9A\u641C\u7D22\u8D77\u59CB\u76EE\u5F55").option("--json", "\u8F93\u51FA JSON").option("--semantic", "\u4F7F\u7528\u8BED\u4E49\u641C\u7D22(\u81EA\u7136\u8BED\u8A00\u67E5\u8BE2)").option("--auto", "\u81EA\u52A8\u5224\u65AD\u641C\u7D22\u65B9\u5F0F(5\u5B57\u4EE5\u4E0A\u8BED\u4E49,5\u5B57\u53CA\u4EE5\u4E0B\u5173\u952E\u8BCD)").action(async (keyword, cmdOpts) => {
    const root = program2.opts();
    await runWithErrorHandling(
      () => cmdSearch(keyword, { ...cmdOpts, clientId: root.clientId, clientSecret: root.clientSecret })
    );
  });
  program2.command("mv <src> <dst>").description("\u79FB\u52A8\u6587\u4EF6/\u76EE\u5F55").option("--overwrite", "\u8986\u76D6\u540C\u540D\u6587\u4EF6(\u9ED8\u8BA4\u91CD\u547D\u540D\u52A0\u540E\u7F00)").action(async (src, dst, cmdOpts) => {
    const root = program2.opts();
    await runWithErrorHandling(
      () => cmdMv(src, dst, { ...cmdOpts, clientId: root.clientId, clientSecret: root.clientSecret })
    );
  });
  program2.command("cp <src> <dst>").description("\u590D\u5236\u6587\u4EF6/\u76EE\u5F55").option("--overwrite", "\u8986\u76D6\u540C\u540D\u6587\u4EF6(\u9ED8\u8BA4\u91CD\u547D\u540D\u52A0\u540E\u7F00)").action(async (src, dst, cmdOpts) => {
    const root = program2.opts();
    await runWithErrorHandling(
      () => cmdCp(src, dst, { ...cmdOpts, clientId: root.clientId, clientSecret: root.clientSecret })
    );
  });
  program2.command("rename <path> <newname>").description("\u91CD\u547D\u540D\u6587\u4EF6/\u76EE\u5F55").action(async (path, newname) => {
    const root = program2.opts();
    await runWithErrorHandling(() => cmdRename(path, newname, root));
  });
  program2.command("share <path>").description("\u521B\u5EFA\u5206\u4EAB\u94FE\u63A5").option("--pwd <pwd>", "4\u4F4D\u5206\u4EAB\u5BC6\u7801").option("--days <n>", "\u6709\u6548\u671F\u5929\u6570(0=\u6C38\u4E45)").option("--json", "\u8F93\u51FA JSON").action(async (path, cmdOpts) => {
    const root = program2.opts();
    await runWithErrorHandling(
      () => cmdShare(path, { ...cmdOpts, clientId: root.clientId, clientSecret: root.clientSecret })
    );
  });
  program2.command("transfer <destPath>").description("\u8F6C\u5B58\u4ED6\u4EBA\u5206\u4EAB\u5230\u81EA\u5DF1\u7F51\u76D8").requiredOption("--shareid <id>", "\u5206\u4EAB ID").requiredOption("--uk <uk>", "\u5206\u4EAB\u8005 uk").option("--pwd <pwd>", "\u5206\u4EAB\u5BC6\u7801(\u79C1\u5BC6\u5206\u4EAB\u5FC5\u586B)").option("--fsids <ids>", "\u8981\u8F6C\u5B58\u7684\u6587\u4EF6 fs_id \u5217\u8868,\u9017\u53F7\u5206\u9694(\u4E0D\u4F20\u5219\u5168\u90E8)").action(async (destPath, cmdOpts) => {
    const root = program2.opts();
    await runWithErrorHandling(
      () => cmdTransfer(destPath, { ...cmdOpts, clientId: root.clientId, clientSecret: root.clientSecret })
    );
  });
  program2.command("category <type>").description("\u6309\u5206\u7C7B\u5217\u51FA\u6587\u4EF6:doc | image | video | bt").option("--dir <path>", "\u8D77\u59CB\u76EE\u5F55").option("--json", "\u8F93\u51FA JSON").option("--desc", "\u5012\u5E8F\u6392\u5217(\u9ED8\u8BA4)").option("--order <field>", "\u6392\u5E8F\u5B57\u6BB5:name | time | size", "time").action(async (type, cmdOpts) => {
    const root = program2.opts();
    await runWithErrorHandling(
      () => cmdCategory(type, { ...cmdOpts, clientId: root.clientId, clientSecret: root.clientSecret })
    );
  });
  program2.command("trash").description("\u7BA1\u7406 .trash \u56DE\u6536\u7AD9").option("--gc", "\u6E05\u7406\u8D85\u8FC7\u4FDD\u7559\u671F\u7684\u9879\u76EE").option("--restore <path>", "\u4ECE .trash \u6062\u590D\u6587\u4EF6/\u76EE\u5F55").option("--to <path>", "\u6062\u590D\u7684\u76EE\u6807\u8DEF\u5F84(\u9ED8\u8BA4 scope \u6839\u76EE\u5F55)").option("--list", "\u5217\u51FA .trash \u5185\u5BB9(\u9ED8\u8BA4\u884C\u4E3A)").action(async (cmdOpts) => {
    const root = program2.opts();
    await runWithErrorHandling(
      () => cmdTrash({ ...cmdOpts, clientId: root.clientId, clientSecret: root.clientSecret })
    );
  });
  program2.command("task <taskid>").description("\u67E5\u8BE2\u5F02\u6B65\u4EFB\u52A1\u72B6\u6001").option("--poll", "\u8F6E\u8BE2\u76F4\u5230\u4EFB\u52A1\u5B8C\u6210(\u7EA62\u79D2/\u6B21,\u6700\u591A2\u5206\u949F)").action(async (taskid, cmdOpts) => {
    const root = program2.opts();
    await runWithErrorHandling(
      () => cmdTask(taskid, { ...cmdOpts, clientId: root.clientId, clientSecret: root.clientSecret })
    );
  });
  program2.showHelpAfterError(color.dim("(\u8FD0\u884C pan.cjs --help \u67E5\u770B\u53EF\u7528\u547D\u4EE4)"));
  program2.parseAsync(process.argv).catch((e) => {
    error(formatError(e));
    (0, import_node_process3.exit)(1);
  });
}
main();
