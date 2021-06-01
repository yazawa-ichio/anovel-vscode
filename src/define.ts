/* eslint-disable @typescript-eslint/naming-convention */

// C#側の定義と同じ物です。

export class ProjectDefine {
	Tags!: TagDefine[];
	CompletionItem!: CompletionItemDefine;
}

export class TagDefine {
	Name!: string;
	Symbols!: string;
	LineType!: string;
	Description!: string;
	Arguments!: ArgumentDefine[];
}

export class ArgumentDefine {
	Name!: string;
	Description!: string;
	Required!: boolean;
	InputType!: string;
	InputOptions!: string[];
}

export class CompletionItemDefine {
	ReplaceTag!: ReplaceTagDefine[];
	ArgumentValue!: ArgumentValueDefine[];
}

export class ReplaceTagDefine {
	LineType!: string;
	RegisterTag!: string;
	Key!: string;
	Replace!: string;
	SecondaryKey!: string;
	SecondaryKeyValue!: string;
	Label!: string;
}

export class ArgumentValueDefine {
	LineType!: string;
	RegisterTag!: string;
	TargetTag!: string;
	Argument!: string;
	Value!: string;
	SecondaryKey!: string;
	SecondaryKeyValue!: string;
}