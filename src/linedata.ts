
enum LineDataParseState {
	none,
	key,
	keyEnd,
	valueStart,
	doubleQuotationValue,
	value,
}

class LineDataToken {
	static readonly comment = ';';
	static readonly preProcess = '#';
	static readonly label = '*';
	static readonly command = '@';
	static readonly systemCommand = '&';

	static readonly tab = '\t';
	static readonly empty = ' ';

	static readonly tagSplit = '=';
	static readonly doubleQuotation = '\"';
	static readonly backSlash = '\\';
	static isEmptyOrTab(ch: string): boolean {
		return ch === LineDataToken.empty || ch === LineDataToken.tab;
	}
}

export class LineData {

	line: string;
	linetType: string = "";
	name: string = "";
	keys: string[];
	error: boolean = false;
	dic: Map<string, string | undefined>;

	constructor(line: string) {
		this.linetType = "";
		this.line = line;
		this.dic = new Map<string, string | undefined>();
		this.parse();
		this.keys = [];
		for (const key of this.dic.keys()) {
			this.keys.push(key);
		}
	}

	parse() {
		const text = this.line.trim();
		this.linetType = text.charAt(0);
		const nameEnd = text.indexOf(" ");
		if (nameEnd < 0) {
			this.name = text.substring(1);
			return;
		}
		this.name = text.substring(1, nameEnd);

		let state = LineDataParseState.none;
		let key = "";
		let value = "";
		let prevBackSlash = false;

		for (let i = nameEnd + 1; i < text.length; i++) {
			let c = text.charAt(i);
			switch (state) {
				case LineDataParseState.none:
					if (!LineDataToken.isEmptyOrTab(c)) {
						key += c.toLowerCase();
						state = LineDataParseState.key;
					}
					break;
				case LineDataParseState.key:
				case LineDataParseState.keyEnd:
					if (LineDataToken.isEmptyOrTab(c)) {
						state = LineDataParseState.keyEnd;
					}
					else if (c === LineDataToken.tagSplit) {
						state = LineDataParseState.valueStart;
					}
					else if (state === LineDataParseState.key) {
						key += c.toLowerCase();
					}
					else if (state === LineDataParseState.keyEnd) {
						this.dic.set(key, undefined);
						key = c.toLowerCase();
						state = LineDataParseState.key;
					}
					break;
				case LineDataParseState.valueStart:
					if (!LineDataToken.isEmptyOrTab(c)) {
						if (c === LineDataToken.doubleQuotation) {
							state = LineDataParseState.doubleQuotationValue;
						}
						else {
							state = LineDataParseState.value;
							value += c;
						}
					}
					break;
				case LineDataParseState.value:
				case LineDataParseState.doubleQuotationValue:
					if (prevBackSlash) {
						prevBackSlash = false;
						value += c;
					}
					else if (c === LineDataToken.backSlash) {
						prevBackSlash = true;
					}
					else if ((state === LineDataParseState.value && LineDataToken.isEmptyOrTab(c)) || (state === LineDataParseState.doubleQuotationValue && c === LineDataToken.doubleQuotation)) {
						state = LineDataParseState.none;
						this.dic.set(key, value);
						key = "";
						value = "";
					}
					else {
						value += c;
					}
					break;
			}
		}
		switch (state) {
			case LineDataParseState.key:
			case LineDataParseState.keyEnd:
				if (key.length > 0) {
					this.dic.set(key, undefined);
					key = "";
				}
				break;
			case LineDataParseState.value:
				this.dic.set(key, value);
				key = "";
				value = "";
				break;
			case LineDataParseState.valueStart:
			case LineDataParseState.doubleQuotationValue:
				this.error = true;
			default:
				break;
		}
	}

}