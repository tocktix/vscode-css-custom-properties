import * as vscode from "vscode";

import CustomPropertyManager from "./CustomPropertyManager";

export default class CustomPropertyCompletionItemProvider
  implements vscode.CompletionItemProvider
{
  manager: CustomPropertyManager;

  constructor(customPropertyManager: CustomPropertyManager) {
    this.manager = customPropertyManager;
  }

  public provideCompletionItems(): vscode.CompletionList {
    return new vscode.CompletionList(this.manager.completionItems);
  }
}
