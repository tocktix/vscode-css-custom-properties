import * as vscode from "vscode";
import CustomPropertyManager from "./CustomPropertyManager";
import CustomPropertyDefinitionProvider from "./CustomPropertyDefinitionProvider";
import CustomPropertyReferenceProvider from "./CustomPropertyReferenceProvider";
import CustomPropertyCompletionItemProvider from "./CustomPropertyCompletionItemProvider";

export async function activate(context: vscode.ExtensionContext) {
  const customPropertyManager = new CustomPropertyManager();
  await customPropertyManager.initialize();

  const completionProvider = vscode.languages.registerCompletionItemProvider(
    customPropertyManager.languages,
    new CustomPropertyCompletionItemProvider(customPropertyManager),
    "-",
    "-"
  );

  const definitionProvider = vscode.languages.registerDefinitionProvider(
    customPropertyManager.languages,
    new CustomPropertyDefinitionProvider(customPropertyManager)
  );

  const referenceProvider = vscode.languages.registerReferenceProvider(
    customPropertyManager.languages,
    new CustomPropertyReferenceProvider(customPropertyManager)
  );

  context.subscriptions.push(completionProvider);
  context.subscriptions.push(definitionProvider);
  context.subscriptions.push(referenceProvider);
}
