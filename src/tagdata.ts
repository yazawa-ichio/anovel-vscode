import { CompletionItem, CompletionItemKind, SnippetString } from "vscode";
import { LineData } from "./linedata";
import { ArgumentInput } from "./argumentinput";
import { ArgumentDefine, TagDefine } from "./define";

class ArgumentData {

	static default: ArgumentData = new ArgumentData(undefined);

	values: CompletionItem[];

	constructor(define: ArgumentDefine | undefined) {
		if (define === undefined) {
			this.values = [];
			const item = new CompletionItem(" ", CompletionItemKind.Property);
			item.insertText = new SnippetString("\"$1\"");
			this.values.push(item); return;
		}
		this.values = ArgumentInput.getCompletionItem(define.InputType, define.InputOptions);
	}

	getValues(): CompletionItem[] {
		return this.values;
	}

}

export class TagData {

	define: TagDefine;
	argumentNames: CompletionItem[];
	arguments: Map<string, ArgumentData>;

	constructor(define: TagDefine) {
		this.define = define;
		this.argumentNames = [];
		this.arguments = new Map();
		let sort = 0;
		const set = new Set<string>();
		for (const attr of this.define.Arguments) {
			if (!attr.Required) {
				continue;
			}
			if (set.has(attr.Name)) {
				continue;
			}
			set.add(attr.Name);
			const item = new CompletionItem(attr.Name + "(必須)", CompletionItemKind.Property);
			item.insertText = attr.Name;
			item.sortText = (sort++).toString().padStart(8, '0');
			item.documentation = attr.Description;
			this.argumentNames?.push(item);
			this.arguments.set(attr.Name, new ArgumentData(attr));
		}
		for (const attr of this.define.Arguments) {
			if (attr.Required) {
				continue;
			}
			if (set.has(attr.Name)) {
				continue;
			}
			set.add(attr.Name);
			const item = new CompletionItem(attr.Name, CompletionItemKind.Property);
			item.insertText = attr.Name;
			item.sortText = (sort++).toString().padStart(8, '0');
			item.documentation = attr.Description;
			this.argumentNames?.push(item);
			this.arguments.set(attr.Name, new ArgumentData(attr));
		}
	}

	getArgumentKey(data: LineData): CompletionItem[] {
		const items: CompletionItem[] = [];
		for (const item of this.argumentNames) {
			const name = item.insertText?.toString() ?? "";
			if (data.dic.has(name)) {
				continue;
			}
			items.push(item);
		}
		return items;
	}

	getArgumentValues(key: string): CompletionItem[] {
		const attr = this.arguments.get(key) ?? ArgumentData.default;
		return attr.getValues();
	}

}