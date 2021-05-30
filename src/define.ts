/* eslint-disable @typescript-eslint/naming-convention */

// C#側の定義と同じ物です。

class ProjectDefine {
	Tags!: TagDefine[];
}

class TagDefine {
	Name!: string;
	Symbols!: string;
	LineType!: string;
	Description!: string;
	Arguments!: ArgumentDefine[];
}

class ArgumentDefine {
	Name!: string;
	Description!: string;
	Required!: boolean;
	InputType!: string;
	InputOptions!: string[];
}
