import { readFileSync } from "fs";
import { dirname, join } from "path";
import { workspace } from "vscode";
import { ProjectDefine } from "./define";
import { LineData, LineDataToken } from "./linedata";
import { PreProcessResult } from "./preprocessresult";

export class PreProcessor {
	private projectPath: string;
	private projectRoot: string;
	private define: ProjectDefine;
	private cache: Map<string, PreProcessResult>;

	constructor(projectPath: string, define: ProjectDefine) {
		this.projectPath = projectPath;
		this.projectRoot = dirname(projectPath);
		this.define = define;
		this.cache = new Map();
	}

	async run(path: string): Promise<PreProcessResult> {
		const fullPath = path;
		let result = this.cache.get(fullPath);
		if (result !== undefined) {
			return result;
		}
		result = new PreProcessResult(fullPath);
		this.cache.set(path, result);
		const text = (await workspace.openTextDocument(path))?.getText() ?? readFileSync(path).toString();
		const lines = text.split("\n").map(x => x.trim());

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (line.charAt(0) !== LineDataToken.preProcess) {
				continue;
			}
			const data = new LineData(line);
			if (data.name === "import") {
				const importPath = data.dic.get("path");
				if (importPath !== undefined) {
					result.import(await this.run(join(this.projectRoot, importPath)));
				}
				continue;
			}
			if (data.name === "macro") {
				i = this.addMacro(result, data, lines, i);
				continue;
			}
			this.tryAddReplaceTag(result, data);
			this.tryAddArgumentValue(result, data);
		}
		return result;
	}

	private addMacro(result: PreProcessResult, data: LineData, lines: string[], i: number): number {
		const name = data.dic.get("name") ?? "";
		const macroKeys: string[] = [];
		for (; i < lines.length; i++) {
			const macroLine = new LineData(lines[i]);
			if (macroLine.name === "endmacro") {
				break;
			}
			macroLine.dic.forEach((value) => {
				if (value !== undefined && value.startsWith("%") && value.endsWith("%")) {
					macroKeys.push(value.substring(1, value.length - 1));
				}
			});
		}
		result.addMacro(name, macroKeys);
		return i;
	}

	private tryAddReplaceTag(result: PreProcessResult, data: LineData) {
		for (const replaceTag of this.define.CompletionItem.ReplaceTag) {
			if (replaceTag.LineType === data.lineType && replaceTag.RegisterTag === data.name) {
				let replaceKey = replaceTag.Key ?? "";
				let replace = replaceTag.Replace ?? "";
				let secondaryKey = replaceTag.SecondaryKey ?? "";
				let secondaryKeyValue = replaceTag.SecondaryKeyValue ?? "";
				let label = replaceTag.Label ?? "";
				for (const [key, value] of data.dic) {
					if (value !== undefined) {
						replaceKey = replaceKey.replace("{" + key + "}", value);
						replace = replace.replace("{" + key + "}", value);
						secondaryKey = secondaryKey.replace("{" + key + "}", value);
						secondaryKeyValue = secondaryKeyValue.replace("{" + key + "}", value);
						label = label.replace("{" + key + "}", value);
					}
				}
				result.addReplaceTag(replaceKey, replace, secondaryKey, secondaryKeyValue, label);
			}
		}
	}

	private tryAddArgumentValue(result: PreProcessResult, data: LineData) {
		for (const argumentValue of this.define.CompletionItem.ArgumentValue) {
			if (argumentValue.LineType === data.lineType && argumentValue.RegisterTag === data.name) {
				const tag = argumentValue.TargetTag ?? "";
				const argument = argumentValue.Argument ?? "";
				let argValue = argumentValue.Value ?? "";
				let secondaryKey = argumentValue.SecondaryKey ?? "";
				let secondaryKeyValue = argumentValue.SecondaryKeyValue ?? "";
				for (const [key, value] of data.dic) {
					if (value !== undefined) {
						argValue = argValue.replace("{" + key + "}", value);
						secondaryKey = secondaryKey.replace("{" + key + "}", value);
						secondaryKeyValue = secondaryKeyValue.replace("{" + key + "}", value);
					}
				}
				if (argValue !== undefined) {
					result.addArgumentValue(tag, argument, argValue, secondaryKey, secondaryKeyValue);
				}
			}
		}
	}

	delete(path: string) {
		const keys: string[] = [];
		this.cache.forEach((value, key) => {
			if (value.fullPath === path) {
				keys.push(key);
			}
			for (const dep of value.depend) {
				if (dep.fullPath === path) {
					keys.push(key);
				}
			}
		});
		for (const key of keys) {
			this.cache.delete(key);
		}
	}

}
