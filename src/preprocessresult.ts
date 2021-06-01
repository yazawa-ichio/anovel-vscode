import { CompletionItem, CompletionItemKind } from "vscode";
import { TagDefine, ArgumentDefine } from "./define";
import { LineData, LineDataToken } from "./linedata";
import { TagData } from "./tagdata";


class Macro {
	name: string;
	keys: string[];
	constructor(name: string, keys: string[]) {
		this.name = name;
		this.keys = keys;
	}
}

class ReplaceTag {
	key: string;
	replace: string;
	secondaryKey: string;
	secondaryKeyValue: string;
	constructor(key: string, replace: string, secondaryKey: string, secondaryKeyValue: string) {
		this.key = key.trim();
		this.replace = replace.trimRight() + " ";
		this.secondaryKey = secondaryKey;
		this.secondaryKeyValue = secondaryKeyValue;
	}
}

class ArgumentValue {
	tag: string;
	key: string;
	value: string;
	secondaryKey: string;
	secondaryKeyValue: string;
	completionItem: CompletionItem;
	constructor(tag: string, key: string, value: string, secondaryKey: string, secondaryKeyValue: string) {
		this.tag = tag;
		this.key = key;
		this.value = value;
		this.secondaryKey = secondaryKey;
		this.secondaryKeyValue = secondaryKeyValue;
		this.completionItem = new CompletionItem(value, CompletionItemKind.Property);
		this.completionItem.insertText = "\"" + value + "\"";
	}
}

export class PreProcessResult {

	fullPath: string;
	private macroData: Macro[];
	private replaceTagData: ReplaceTag[];
	depend: PreProcessResult[];
	private tagCompletionItems: Map<string, CompletionItem[]>;
	private argumentValues: Map<string, Map<string, ArgumentValue[]>>;
	private macroTagData: Map<string, TagData>;

	constructor(fullPath: string) {
		this.fullPath = fullPath;
		this.macroData = [];
		this.replaceTagData = [];
		this.depend = [];
		this.tagCompletionItems = new Map();
		this.tagCompletionItems.set(LineDataToken.command, []);
		this.tagCompletionItems.set(LineDataToken.systemCommand, []);
		this.tagCompletionItems.set(LineDataToken.preProcess, []);
		this.argumentValues = new Map();
		this.macroTagData = new Map();
	}

	addMacro(name: string, keys: string[]) {
		const macro = new Macro(name, keys);
		this.macroData.push(macro);
		const tag = new CompletionItem(macro.name, CompletionItemKind.Method);
		this.tagCompletionItems.get(LineDataToken.command)?.push(tag);
		const args: CompletionItem[] = [];
		for (const key of macro.keys) {
			const item = new CompletionItem(key, CompletionItemKind.Property);
			args.push(item);
		}

		const define = new TagDefine();
		define.LineType = LineDataToken.command;
		define.Name = macro.name;
		define.Arguments = [];
		for (var key of macro.keys) {
			const arg = new ArgumentDefine();
			arg.Name = key;
			arg.InputOptions = [];
			arg.InputType = "None";
			define.Arguments.push(arg);
		}
		this.macroTagData.set(LineDataToken.command + macro.name, new TagData(define));
	}

	addReplaceTag(key: string, replace: string, secondaryKey: string, secondaryKeyValue: string, label: string) {
		const replaceTag = new ReplaceTag(key, replace, secondaryKey, secondaryKeyValue);
		this.replaceTagData.push(replaceTag);
		const token = replaceTag.key.charAt(0);
		const name = replaceTag.key.substring(1);
		if (label.length === 0) {
			label = name;
		}
		const item = new CompletionItem(label, CompletionItemKind.Method);
		item.insertText = name;
		this.tagCompletionItems.get(token)?.push(item);
	}

	addArgumentValue(tagName: string, key: string, value: string, secondaryKey: string, secondaryKeyValue: string) {
		const argumentValue = new ArgumentValue(tagName, key, value, secondaryKey, secondaryKeyValue);
		let tag = this.argumentValues.get(argumentValue.tag);
		if (tag === undefined) {
			tag = new Map();
			this.argumentValues.set(argumentValue.tag, tag);
		}
		let args = tag.get(argumentValue.key);
		if (args === undefined) {
			args = [];
			tag.set(argumentValue.key, args);
		}
		args.push(argumentValue);
	}

	import(result: PreProcessResult) {
		this.depend.push(result);
	}

	private getAllDepend(): PreProcessResult[] {
		const ret = new Set<PreProcessResult>();
		this.getAllDependImpl(ret);
		return Array.from(ret);
	}

	private getAllDependImpl(ret: Set<PreProcessResult>) {
		if (ret.has(this)) {
			return;
		}
		ret.add(this);
		for (const dep of this.depend) {
			dep.getAllDependImpl(ret);
		}
	}

	getStartTag(token: string): CompletionItem[] {
		// TODO:キャッシュする
		const tags: CompletionItem[] = [];
		const set = new Set<string>();
		for (var dep of this.getAllDepend()) {
			const items = dep.tagCompletionItems.get(token);
			if (items === undefined) {
				continue;
			}
			for (const item of items) {
				if (!set.has(item.label)) {
					set.add(item.label);
					tags.push(item);
				}
			}
		}
		return tags;
	}

	replaceTag(tagName: string, text: string): [string, string] {
		const data = text.length > 0 ? new LineData(text) : undefined;
		for (var dep of this.getAllDepend()) {
			for (const tag of dep.replaceTagData) {
				// セカンダリーを優先する
				if (tag.secondaryKey.length === 0 || !this.hasSecondaryKey(data, tag.secondaryKey, tag.secondaryKeyValue)) {
					continue;
				}
				if (tag.key === tagName) {
					// TODO:もう少し真面目に置き換える
					text = text.replace(tag.key, tag.replace);
					const data = new LineData(text);
					return [data.lineType + data.name, text];
				}
			}
		}
		for (var dep of this.getAllDepend()) {
			for (const tag of dep.replaceTagData) {
				if (tag.secondaryKey.length > 0) {
					continue;
				}
				if (tag.key === tagName) {
					// TODO:もう少し真面目に置き換える
					text = text.replace(tag.key, tag.replace + " ");
					const data = new LineData(text);
					return [data.lineType + data.name, text];
				}
			}
		}
		return [tagName, text];
	}

	getMacro(tagName: string): TagData | undefined {
		for (var dep of this.getAllDepend()) {
			const tag = dep.macroTagData.get(tagName);
			if (tag !== undefined) {
				return tag;
			}
		}
		return undefined;
	}

	getArgumentValue(data: LineData, key: string): CompletionItem[] {
		const ret: CompletionItem[] = [];
		const set = new Set<string>();
		for (var dep of this.getAllDepend()) {
			const tag = dep.argumentValues.get(data.name);
			if (tag === undefined) {
				continue;
			}
			const args = tag.get(key);
			if (args === undefined) {
				continue;
			}
			for (const arg of args) {
				if (arg.secondaryKey.length > 0 && !this.hasSecondaryKey(data, arg.secondaryKey, arg.secondaryKeyValue)) {
					continue;
				}
				if (!set.has(arg.completionItem.label)) {
					set.add(arg.completionItem.label);
					ret.push(arg.completionItem);
				}
			}
		}
		return ret;
	}

	private hasSecondaryKey(data: LineData | undefined, secondaryKey: string, secondaryKeyValue: string): boolean {
		if (data === undefined) {
			return false;
		}
		if (secondaryKeyValue.length === 0) {
			return data.dic.has(secondaryKey);
		}
		return data.dic.get(secondaryKey) === secondaryKeyValue;
	}

}
