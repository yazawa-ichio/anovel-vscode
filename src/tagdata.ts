import { CompletionItem, CompletionItemKind, SnippetString } from "vscode";
import { LineData } from "./linedata";
import { ArgumentInput } from "./argumentinput";


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
	attributeNames: CompletionItem[];
	attributes: Map<string, ArgumentData>;

	constructor(define: TagDefine) {
		this.define = define;
		this.attributeNames = [];
		this.attributes = new Map();
		let sort = 0;
		for (const attr of this.define.Arguments) {
			if (!attr.Required) {
				continue;
			}
			const item = new CompletionItem(attr.Name + "(必須)", CompletionItemKind.Property);
			item.insertText = attr.Name;
			item.sortText = (sort++).toString().padStart(8, '0');
			item.documentation = attr.Description;
			this.attributeNames?.push(item);
			this.attributes.set(attr.Name, new ArgumentData(attr));
		}
		for (const attr of this.define.Arguments) {
			if (attr.Required) {
				continue;
			}
			const item = new CompletionItem(attr.Name, CompletionItemKind.Property);
			item.insertText = attr.Name;
			item.sortText = (sort++).toString().padStart(8, '0');
			item.documentation = attr.Description;
			this.attributeNames?.push(item);
			this.attributes.set(attr.Name, new ArgumentData(attr));
		}
	}

	getAttributeKey(data: LineData): CompletionItem[] {
		const items: CompletionItem[] = [];
		for (const item of this.attributeNames) {
			const name = item.insertText?.toString() ?? "";
			if (data.dic.has(name)) {
				continue;
			}
			items.push(item);
		}
		return items;
	}

	getAttributeValues(key: string): CompletionItem[] {
		const attr = this.attributes.get(key) ?? ArgumentData.default;
		return attr.getValues();
	}

}