import { CompletionItem, CompletionItemKind, SnippetString } from "vscode";

class ArgumentInputType {
	static readonly none = "None";
	static readonly string = "String";
	static readonly enum = "Enum";
	static readonly path = "Path";
	static readonly bool = "Bool";
	static readonly number = "Number";
	static readonly rate = "Rate";
	static readonly millisecond = "MilliSecond";
	static readonly color = "Color";
}

export class ArgumentInput {

	static init: boolean;
	private static emptyInput: ArgumentInput;
	private static boolInput: ArgumentInput;
	private static numberInput: ArgumentInput;
	private static rateInput: ArgumentInput;
	private static millisecondInput: ArgumentInput;

	static getCompletionItem(type: string, opts: string[]): CompletionItem[] {
		this.tryInit();
		switch (type) {
			case ArgumentInputType.bool:
				return this.boolInput.values;
			case ArgumentInputType.number:
				return this.numberInput.values;
			case ArgumentInputType.rate:
				return this.rateInput.values;
			case ArgumentInputType.millisecond:
				return this.millisecondInput.values;
			case ArgumentInputType.enum:
				{
					const input = new ArgumentInput();
					for (const val of opts) {
						input.createItem(val);
					}
					return input.values;
				}
		}
		return this.emptyInput.values;
	}

	private static tryInit() {
		if (this.init) {
			return;
		}
		this.init = true;
		{
			this.emptyInput = new ArgumentInput();
			const item = new CompletionItem(" ", CompletionItemKind.Property);
			item.insertText = new SnippetString("\"$1\"");
			this.emptyInput.pushItem(item);
		}
		{
			this.boolInput = new ArgumentInput();
			this.boolInput.createItem("true");
			this.boolInput.createItem("false");
		}
		{
			this.numberInput = new ArgumentInput();
			this.numberInput.pushItem(...this.emptyInput.values);
			for (const num of ["0", "1", "2", "3", "4", "5", "10", "20", "30", "40", "50", "100", "1000"]) {
				this.numberInput.createItem(num);
			}
		}
		{
			this.rateInput = new ArgumentInput();
			this.rateInput.pushItem(...this.emptyInput.values);
			for (const num of ["0", "1", "0.1", "0.2", "0.3", "0.4", "0.5"]) {
				this.rateInput.createItem(num);
			}
		}
		{
			this.millisecondInput = new ArgumentInput();
			this.millisecondInput.pushItem(...this.emptyInput.values);
			for (const num of ["0", "50", "100", "200", "300", "400", "500", "1000", "1500", "2000"]) {
				this.millisecondInput.createItem(num);
			}
		}
	}

	sort: number = 0;
	values: CompletionItem[] = [];
	private createItem(name: string) {
		const item = new CompletionItem(name, CompletionItemKind.Property);
		item.insertText = "\"" + name + "\"";
		item.sortText = (this.sort++).toString().padStart(8, '0');
		this.values.push(item);
	}

	private pushItem(...items: CompletionItem[]) {
		for (const item of items) {
			item.sortText = (this.sort++).toString().padStart(8, '0');
		}
		this.values.push(...items);
	}

}
