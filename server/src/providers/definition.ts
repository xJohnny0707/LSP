/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Hvy Industries. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *  "HVY", "HVY Industries" and "Hvy Industries" are trading names of JCKD (UK) Ltd
 *--------------------------------------------------------------------------------------------*/

'use strict';

import { TextDocumentPositionParams, Location, Range } from 'vscode-languageserver';
import { Files } from "../util/Files";

const fs = require('fs');

export class DefinitionProvider {
    private positionInfo: TextDocumentPositionParams;
    private path: string;
    private file: string;
    private pathFile: string;
    private includes: string[]

    constructor(positionInfo: TextDocumentPositionParams, path: string) {
        this.positionInfo = positionInfo;
        this.path = require('path').dirname(path);
        this.file = require('path').basename(path);
        this.pathFile = this.path + "\\" + this.file;
        this.includes = [];
    }

    public findDefinition(): Location | Location[] {
        let word = this.getWordAtPosition();
        if (word == "" || word == null) {
            return null;
        }

        var location: Location;
        var lin;

        this.getIncludesFromFile(this.pathFile);

        this.includes.forEach(include => {
            if (location) return;
            lin = -1;
            var lines = fs.readFileSync(include, { encoding: 'utf8' }).split(/\r\n|\r|\n/gm);

            lines.forEach(element => {
                if (location) return;
                lin++;
                if (element.indexOf("routine") > -1) {
                    var index = element.indexOf(word);
                    if (index < 0) return;
                    location = {
                        uri: Files.getUriFromPath(include),
                        range:
                        {
                            start:
                            {
                                line: lin,
                                character: index
                            },
                            end:
                            {
                                line: lin,
                                character: index + word.length
                            }
                        }
                    }
                }
                return;
            });
        });

        return location;

    }

    private getIncludesFromFile(file) {
        this.includes.push(file);
        var lines = fs.readFileSync(file, { encoding: 'utf8' }).split(/\r\n|\r|\n/gm);

        lines.forEach(element => {
            var index = element.indexOf("&include");
            if (index > -1) {
                index = index + 8;
                var include = element.substring(index, element.length);
                this.getIncludesFromFile(this.path + "\\" +include.trim());
            }
            return;
        });
    }

    private getWordAtPosition(): string {
        // TODO -- find a way to read the text from vscode, instead of from the file
        // this will allow unsaved edits to work here
        var text: string = fs.readFileSync(this.pathFile, { encoding: 'utf8' });
        var lines = text.split(/\r\n|\r|\n/gm);

        let lineNum = this.positionInfo.position.line;
        let charNum = this.positionInfo.position.character;

        var line = lines[lineNum];

        // Handle situation where file has not been saved
        if (line == null) {
            return null;
        }

        var lineStart = line.substring(0, charNum);
        var lineEnd = line.substr(charNum, line.length);

        let startResult = this.stepBackward(lineStart);
        let endResult = this.stepForward(lineEnd);

        return startResult + endResult;
    }

    private stepForward(line) {
        let string = "";

        for (var i = 0; i < line.length; i++) {
            var char = line[i];
            if (/\w/.test(char) || char == "\\") {
                string += char;
            } else {
                i = line.length;
            }
        }

        return string;
    }

    private stepBackward(line) {
        let string = "";

        for (var i = (line.length - 1); i > -1; i--) {
            var char = line[i];
            if (/\w/.test(char) || char == "\\" || char == "$" || char == ">" || char == ":") {
                string = char + string;
            } else {
                i = -1;
            }
        }

        return string;
    }

}