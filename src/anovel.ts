import { readFileSync } from 'fs';
import { dirname } from 'path';
import * as vscode from 'vscode';
import { Project } from './project';

const aovelDocument: vscode.DocumentSelector = { scheme: 'file', language: 'anovel' };

export class Anovel implements vscode.CompletionItemProvider {

	static init(ctx: vscode.ExtensionContext) {
		new Anovel(ctx);
	}

	private projects: Project[] = [];

	constructor(private ctx: vscode.ExtensionContext) {
		this.setup();
	}

	async setup() {
		const files = await vscode.workspace.findFiles("anovel.json");
		for (const file of files) {
			this.setupProject(file);
		}
		this.ctx.subscriptions.push(vscode.languages.registerCompletionItemProvider(aovelDocument, this, '@', '&', '#', ' ', '='));
		vscode.workspace.onDidChangeTextDocument(e => {
			const doc = e.document;
			if (e.contentChanges.length === 0) {
				return;
			}
			if (doc.fileName.endsWith(".anovel")) {
				// TODO　マクロ再読み込み
			}
			if (doc.fileName === "anovel.json") {
				this.setupProject(doc.uri);
			}
		}, null, this.ctx.subscriptions);
	}

	setupProject(file: vscode.Uri) {
		for (let i = 0; i < this.projects.length; i++) {
			if (this.projects[i].file === file) {
				this.projects[i] = new Project(file);
				return;
			}
		}
		this.projects.push(new Project(file));
	}

	getProject(file: vscode.Uri): Project | null {
		for (const project of this.projects) {
			if (file.fsPath.startsWith(project.dir)) {
				return project;
			}
		}
		return null;
	}

	provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> {
		const project = this.getProject(document.uri);
		if (project !== null) {
			return project.provideCompletionItems(document, position, context);
		}
		return [];
	}

}
