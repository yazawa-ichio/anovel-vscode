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
		vscode.workspace.onDidSaveTextDocument(e => {
			if (e.fileName.endsWith(".anovel")) {
				const project = this.getProject(e.uri);
				project?.preProcessor.delete(e.fileName);
			}
			if (e.fileName === "anovel.json") {
				this.setupProject(e.uri);
			}
		}, null, this.ctx.subscriptions);
		vscode.workspace.onDidChangeTextDocument(e => {
			if (e.document.fileName.endsWith(".anovel")) {
				const project = this.getProject(e.document.uri);
				project?.preProcessor.delete(e.document.fileName);
			}
			if (e.document.fileName === "anovel.json") {
				this.setupProject(e.document.uri);
			}
		}, null, this.ctx.subscriptions);
	}

	setupProject(file: vscode.Uri) {
		for (let i = 0; i < this.projects.length; i++) {
			if (this.projects[i].file.fsPath === file.fsPath) {
				this.projects[i] = new Project(file);
				return;
			}
		}
		this.projects.push(new Project(file));
	}

	getProject(file: vscode.Uri): Project | undefined {
		for (const project of this.projects) {
			if (file.fsPath.startsWith(project.dir)) {
				return project;
			}
		}
		return undefined;
	}

	provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> {
		const project = this.getProject(document.uri);
		if (project !== undefined) {
			return project.provideCompletionItems(document, position, context);
		}
		return [];
	}

}
