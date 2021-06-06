import { readFileSync } from "fs";
import { dirname, join } from "path";
import { CompletionContext, Position, TextDocument, Uri, CompletionItem, CompletionItemKind } from "vscode";
import { ProjectDefine } from "./define";
import { LineData } from "./linedata";
import { PreProcessor } from "./preprocessor";
import { PreProcessResult } from "./preprocessresult";
import { TagData } from "./tagdata";


export class Project {

	public readonly file: Uri;
	public readonly dir: string;
	public readonly resourceDir: string;
	define: ProjectDefine;

	tagNames: Map<string, CompletionItem[]>;
	tags: Map<string, TagData>;
	preProcessor: PreProcessor;

	constructor(file: Uri) {
		this.file = file;
		this.dir = dirname(file.fsPath);
		const json = readFileSync(file.fsPath).toString();
		this.define = JSON.parse(json) as ProjectDefine;
		this.resourceDir = join(this.dir, this.define.ResourcePath);
		this.tagNames = new Map<string, CompletionItem[]>();
		this.tags = new Map<string, TagData>();
		this.preProcessor = new PreProcessor(file.fsPath, this);
		this.initTags();
	}

	initTags() {
		this.tagNames.set(`@`, []);
		this.tagNames.set(`#`, []);
		this.tagNames.set(`&`, []);
		for (const tag of this.define.Tags) {
			const items = this.tagNames.get(tag.LineType);
			const item = new CompletionItem(tag.Name, CompletionItemKind.Method);
			item.documentation = tag.Description;
			items?.push(item);
			this.tags.set(tag.LineType + tag.Name, new TagData(tag, this));
		}
	}

	async provideCompletionItems(document: TextDocument, position: Position, context: CompletionContext): Promise<CompletionItem[]> {
		const preProcess = await this.preProcessor.run(document.uri.fsPath);
		const line = document.lineAt(position.line);
		const trgChr = context.triggerCharacter;
		switch (trgChr) {
			case '@':
			case '&':
			case '#':
				return this.provideTagStart(preProcess, trgChr, document, position, context);
			case ' ':
				return this.provideTagArgumentKey(preProcess, document, position, context);
			case '=':
				return this.provideTagArgumentValue(preProcess, document, position, context);
		}
		return [];
	}

	provideTagStart(preProcess: PreProcessResult, token: string, document: TextDocument, position: Position, context: CompletionContext): CompletionItem[] {
		const line = document.lineAt(position.line);
		if (line.firstNonWhitespaceCharacterIndex === position.character - 1) {
			const tags = preProcess.getStartTag(token);
			return this.tagNames.get(token)?.concat(tags) ?? tags;
		}
		return [];
	}

	isBetweenDoubleQuotation(line: string, position: Position): boolean {
		let doubleQuotation = false;
		for (let i = 0; i < position.character; i++) {
			const ch = line.charAt(i);
			if (ch === '\\') {
				i++;
				continue;
			}
			if (ch === '\"') {
				doubleQuotation = !doubleQuotation;
			}
		}
		return doubleQuotation;
	}

	isLeftEqual(line: string, position: Position): boolean {
		for (let i = position.character - 2; i >= 0; i--) {
			const ch = line.charAt(i);
			if (ch === ' ') {
				continue;
			}
			return ch === '=';
		}
		return false;
	}

	getTagData(preProcess: PreProcessResult, document: TextDocument, position: Position): [TagData | undefined, LineData | undefined] {
		const line = document.lineAt(position.line);
		if (line.isEmptyOrWhitespace) {
			return [undefined, undefined];
		}
		const tokenIndex = line.firstNonWhitespaceCharacterIndex;
		const token = line.text.charAt(tokenIndex);
		if (token !== '@' && token !== '&' && token !== '&') {
			return [undefined, undefined];
		}
		const nameEndIndex = line.text.indexOf(" ", tokenIndex);
		if (nameEndIndex < tokenIndex) {
			return [undefined, undefined];
		}
		const [tagName, text] = preProcess.replaceTag(line.text.substring(tokenIndex, nameEndIndex), line.text);
		return [this.tags.get(tagName) ?? preProcess.getMacro(tagName), new LineData(text)];
	}

	provideTagArgumentKey(preProcess: PreProcessResult, document: TextDocument, position: Position, context: CompletionContext): CompletionItem[] {
		const line = document.lineAt(position.line);
		const [tag, data] = this.getTagData(preProcess, document, position);
		if (tag === undefined) {
			return [];
		}
		if (this.isBetweenDoubleQuotation(line.text, position)) {
			return [];
		}
		if (this.isLeftEqual(line.text, position)) {
			return [];
		}
		return tag.getArgumentKey(data ?? new LineData(line.text));
	}

	getLeftKey(line: string, position: Position): string | undefined {
		let key = "";
		let i = position.character - 2;
		let hasKey = false;
		for (; i >= 0; i--) {
			const ch = line.charAt(i);
			if (ch === ' ') {
				if (key.length === 0) {
					continue;
				}
				hasKey = true;
				return key;
			}
			if (ch === '=') {
				return undefined;
			}
			if (!hasKey) {
				key = ch + key;
			} else {
				break;
			}
		}
		if (!hasKey) {
			return key;
		}
		return undefined;
	}

	provideTagArgumentValue(preProcess: PreProcessResult, document: TextDocument, position: Position, context: CompletionContext): CompletionItem[] {
		const line = document.lineAt(position.line);
		const [tag, data] = this.getTagData(preProcess, document, position);
		if (tag === undefined || data === undefined) {
			return [];
		}
		if (this.isBetweenDoubleQuotation(line.text, position)) {
			return [];
		}
		const key = this.getLeftKey(line.text, position);
		if (key === undefined) {
			return [];
		}
		const ret = preProcess.getArgumentValue(data, key);
		return ret.concat(tag.getArgumentValues(key));
	}

}
