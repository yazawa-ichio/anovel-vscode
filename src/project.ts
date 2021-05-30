import { readFileSync } from "fs";
import { dirname } from "path";
import { CompletionContext, Position, TextDocument, Uri, CompletionItem, CompletionItemKind } from "vscode";
import { LineData } from "./linedata";
import { TagData } from "./tagdata";


export class Project {

	public readonly file: Uri;
	public readonly dir: string;
	define: ProjectDefine;

	tagNames: Map<string, CompletionItem[]>;
	tags: Map<string, TagData>;

	constructor(file: Uri) {
		this.file = file;
		this.dir = dirname(file.fsPath);
		const json = readFileSync(file.fsPath).toString();
		this.define = JSON.parse(json) as ProjectDefine;
		this.tagNames = new Map<string, CompletionItem[]>();
		this.tags = new Map<string, TagData>();
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
			this.tags.set(tag.LineType + tag.Name, new TagData(tag));
		}
	}

	provideCompletionItems(document: TextDocument, position: Position, context: CompletionContext): CompletionItem[] {
		const line = document.lineAt(position.line);
		const trgChr = context.triggerCharacter;
		switch (trgChr) {
			case '@':
			case '&':
			case '#':
				return this.provideStartTag(trgChr, document, position, context);
			case ' ':
				return this.provideTagAttributeKey(document, position, context);
			case '=':
				return this.provideTagAttributeValue(document, position, context);
		}
		return [];
	}

	provideStartTag(token: string, document: TextDocument, position: Position, context: CompletionContext): CompletionItem[] {
		const line = document.lineAt(position.line);
		if (line.firstNonWhitespaceCharacterIndex === position.character - 1) {
			return this.tagNames.get(token) ?? [];
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

	getTagData(document: TextDocument, position: Position): TagData | undefined {
		const line = document.lineAt(position.line);
		if (line.isEmptyOrWhitespace) {
			return undefined;
		}
		const tokenIndex = line.firstNonWhitespaceCharacterIndex;
		const token = line.text.charAt(tokenIndex);
		if (token !== '@' && token !== '&' && token !== '&') {
			return undefined;
		}
		const nameEndIndex = line.text.indexOf(" ", tokenIndex);
		if (nameEndIndex < tokenIndex) {
			return undefined;
		}
		const tagName = line.text.substring(tokenIndex, nameEndIndex);
		return this.tags.get(tagName);
	}

	provideTagAttributeKey(document: TextDocument, position: Position, context: CompletionContext): CompletionItem[] {
		const line = document.lineAt(position.line);
		const tag = this.getTagData(document, position);
		if (tag === undefined) {
			return [];
		}
		if (this.isBetweenDoubleQuotation(line.text, position)) {
			return [];
		}
		if (this.isLeftEqual(line.text, position)) {
			return [];
		}
		return tag.getAttributeKey(new LineData(line.text));
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

	provideTagAttributeValue(document: TextDocument, position: Position, context: CompletionContext): CompletionItem[] {
		const line = document.lineAt(position.line);
		const tag = this.getTagData(document, position);
		if (tag === undefined) {
			return [];
		}
		if (this.isBetweenDoubleQuotation(line.text, position)) {
			return [];
		}
		const key = this.getLeftKey(line.text, position);
		if (key === undefined) {
			return [];
		}
		return tag.getAttributeValues(key) || [];
	}

}
