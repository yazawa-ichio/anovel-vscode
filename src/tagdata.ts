import { CompletionItem, CompletionItemKind, SnippetString } from "vscode";
import { LineData } from "./linedata";
import { ArgumentInput, ArgumentInputType } from "./argumentinput";
import { ArgumentDefine, TagDefine } from "./define";
import { Project } from "./project";
import { extname, join } from "path";
import { readdir, readdirSync, statSync } from "fs";


export class TagData {

	define: TagDefine;
	argumentNames: CompletionItem[];
	arguments: Map<string, ArgumentData>;

	constructor(define: TagDefine, project: Project) {
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
			this.arguments.set(attr.Name, new ArgumentData(attr, project));
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
			this.arguments.set(attr.Name, new ArgumentData(attr, project));
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


class ArgumentData {

	static default: ArgumentData = new ArgumentData(undefined, undefined);

	project: Project | undefined;
	define: ArgumentDefine | undefined;
	values: CompletionItem[];

	constructor(define: ArgumentDefine | undefined, project: Project | undefined) {
		this.project = project;
		if (define === undefined) {
			this.values = [];
			const item = new CompletionItem(" ", CompletionItemKind.Property);
			item.insertText = new SnippetString("\"$1\"");
			this.values.push(item); return;
		}
		this.define = define;
		this.values = ArgumentInput.getCompletionItem(define.InputType, define.InputOptions);
	}

	getValues(): CompletionItem[] {
		if (this.project !== undefined && this.define?.InputType === ArgumentInputType.path) {
			return this.getPathValues();
		}
		return this.values;
	}

	getPathValues(): CompletionItem[] {
		const category = this.define?.InputOptions[0];
		const extension = this.define?.InputOptions[1] ?? "*";
		const ret: CompletionItem[] = [];
		for (const path of this.project?.define?.Paths ?? []) {
			if (path.Category === category) {
				const dirRoot = join(this.project?.resourceDir ?? "", path.RootPath);
				for (const file of this.readFiles(dirRoot)) {
					const ext = extname(file);
					if (ext === ".meta") {
						continue;
					}
					const name = file.substring(0, file.length - ext.length);
					if (extension === "*" || extension.indexOf(ext) >= 0) {
						const item = new CompletionItem(name, CompletionItemKind.Property);
						item.insertText = "\"" + name + "\"";
						ret.push(item);
					}
				}
			}
		}
		return this.values.concat(ret);
	}

	readFiles(dir: string): string[] {
		const ret: string[] = [];
		const list = readdirSync(dir, { withFileTypes: true });
		for (const item of list) {
			if (item.isDirectory()) {
				const files = this.readFiles(join(dir, item.name));
				for (const file of files) {
					ret.push(item.name + "/" + file);
				}
			}
			if (item.isFile()) {
				ret.push(item.name);
			}
		}
		return ret;
	}

}