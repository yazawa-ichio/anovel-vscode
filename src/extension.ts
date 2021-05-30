// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Anovel } from './anovel';

export function activate(context: vscode.ExtensionContext) {
	// 初期化
	Anovel.init(context);
}

export function deactivate() { }
