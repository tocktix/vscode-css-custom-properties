import * as vscode from "vscode";

import CustomPropertyManager from "./CustomPropertyManager";
import {customPropertyFromPosition} from "./customPropertyUtils";

export default class CustomPropertyDefinitionProvider
  implements vscode.DefinitionProvider
{
  manager: CustomPropertyManager;

  constructor(customPropertyManager: CustomPropertyManager) {
    this.manager = customPropertyManager;
  }

  public provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Thenable<vscode.Location[] | null> {
    const list: vscode.Location[] = [];

    const {property} = customPropertyFromPosition(document, position);
    if (property) {
      const definition = this.manager.definitions[property];
      Object.values(definition).forEach((valueObject) => {
        Object.keys(valueObject).forEach((filePath) => {
          const arr = valueObject[filePath];
          arr.forEach(({location}) => {
            list.push(new vscode.Location(vscode.Uri.file(filePath), location));
          });
        });
      });
    }

    return Promise.resolve(list);
  }
}
