import * as vscode from "vscode";
import * as path from "path";
import * as css from "css";

import {CUSTOM_PROPERTY_REFERENCE_REGEX_G} from "./customPropertyUtils";
import {TextDecoder} from "util";

const textDecoder = new TextDecoder("utf-8");

type CustomPropertyMetadata = {
  file: string;
  location: vscode.Range;
  selectors: string[];
  media: string;
};

type CustomPropertyValueLocations = {
  [cssPropertyValue: string]: {
    [filePath: string]: CustomPropertyMetadata[];
  };
};

type CustomPropertyManagerItems = {
  [customProperty: string]: vscode.CompletionItem;
};
type CustomPropertyManagerDefinitions = {
  [customProperty: string]: CustomPropertyValueLocations;
};
type CustomPropertyManagerReferences = {
  [customProperty: string]: CustomPropertyValueLocations;
};

export default class CustomPropertyManager {
  completionItems: vscode.CompletionItem[] = [];
  config: vscode.WorkspaceConfiguration;
  definitions: CustomPropertyManagerDefinitions = {};
  items: CustomPropertyManagerItems = {};
  languages: vscode.DocumentSelector;
  path: string = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
  pathToProperties: {[filePath: string]: string[]} = {};
  references: CustomPropertyManagerReferences = {};

  constructor() {
    this.config = vscode.workspace.getConfiguration("cssCustomProperties");
    const defaultLanguages: vscode.DocumentSelector = [];
    this.languages = defaultLanguages;
    if (this.config.has("languages")) {
      this.languages = this.config.get("languages") || defaultLanguages;
    }
  }

  /*
   * Load all workspace files and set watcher;
   */
  public async initialize() {
    const fileGlobPatterns = (this.config.get("files") || []) as string[];
    const loadUrisPromises: Thenable<vscode.Uri[]>[] = [];
    fileGlobPatterns.forEach((fileGlobPattern) => {
      loadUrisPromises.push(vscode.workspace.findFiles(fileGlobPattern));
      const watcher = vscode.workspace.createFileSystemWatcher(fileGlobPattern);
      const onWatcherEvent = async (uri: vscode.Uri) => {
        await this.processUri(uri);
        this.processItems();
      };
      watcher.onDidDelete(onWatcherEvent.bind(this));
      watcher.onDidChange(onWatcherEvent.bind(this));
      watcher.onDidCreate(onWatcherEvent.bind(this));
    });

    const globMatchedUris = await Promise.all(loadUrisPromises);
    const processUriPromises: Promise<void>[] = [];
    globMatchedUris.forEach((uris) => {
      uris.forEach((uri) => processUriPromises.push(this.processUri(uri)));
    });
    await Promise.all(processUriPromises);

    this.processItems();
  }

  /*
   * Check the property and value of a CSS declaration for definitions and references.
   */
  private processDeclaration(
    declaration: css.Declaration,
    metadata: CustomPropertyMetadata,
    filePath: string
  ) {
    const {type, property, value, position} = declaration;

    if (!value || type !== "declaration" || !property) {
      return;
    }

    /*
     * Finding property definitions.
     * We only want to add defined properties as completion items.
     */
    if (property.startsWith("--")) {
      this.items[property] =
        this.items[property] ||
        new vscode.CompletionItem(property, vscode.CompletionItemKind.Variable);
      this.items[property].insertText = property;

      this.definitions[property] = this.definitions[property] || {};
      this.definitions[property][value] =
        this.definitions[property][value] || {};
      this.definitions[property][value][filePath] =
        this.definitions[property][value][filePath] || [];

      const start = position?.start || {};
      const line = (start.line || 1) - 1;
      const column = (start.column || 1) - 1;
      metadata.location = new vscode.Range(
        line,
        column,
        line,
        column + property.length
      );

      this.definitions[property][value][filePath].push({...metadata});
      this.pathToProperties[filePath].push(property);
    }

    /*
     * Finding _all_ references in the value.
     *   Value can be across multiple lines and contain multiple references.
     *   We need to find the relative line, and all custom properties.
     */
    const lines = value.split("\n");
    lines.forEach((line, relLine) => {
      let exec;
      const regex = CUSTOM_PROPERTY_REFERENCE_REGEX_G;
      while ((exec = regex.exec(line)) !== null) {
        const prop = exec[1];
        this.references[prop] = this.references[prop] || {
          details: {},
        };

        this.references[prop][value] = this.references[prop][value] || {};
        this.references[prop][value][filePath] =
          this.references[prop][value][filePath] || [];

        const offsetA = relLine === 0 ? property.length + 1 : 0;
        const offsetB = relLine === 0 ? property.length + 2 : 0;
        const positionA = offsetA + regex.lastIndex - exec[1].length;
        const positionB = offsetB + regex.lastIndex - 1;
        const start = position?.start || {};
        const line = (start.line || 1) - 1 + relLine;
        const column = relLine === 0 ? (start.column || 1) - 1 : 0;
        const extraA = relLine === 0 ? 0 : -1;
        metadata.location = new vscode.Range(
          line,
          column + positionA + extraA,
          line,
          column + positionB
        );

        this.references[prop][value][filePath].push({...metadata});
        if (!this.pathToProperties[filePath].includes(prop)) {
          this.pathToProperties[filePath].push(prop);
        }
      }
    });
  }

  /*
   * For each rule, process its individual declarations.
   */
  private processDeclarations(
    declarations?: css.Declaration[],
    filePath = "",
    selectors: string[] = [],
    media = ""
  ) {
    if (!declarations || !filePath) {
      return;
    }
    const file = path.basename(filePath);
    const initialMetadata = {
      file,
      location: new vscode.Range(0, 0, 0, 0),
      selectors,
      media,
    };
    declarations.forEach((declaration: css.Declaration) =>
      this.processDeclaration(declaration, initialMetadata, filePath)
    );
  }

  /*
   * For each Uri, parse it as CSS and process its rules.
   */
  private async processUri(uri: vscode.Uri): Promise<void> {
    this.resetUriData(uri);

    const file = await vscode.workspace.fs.readFile(uri);
    const text = textDecoder.decode(file);
    const {path} = uri;

    const cssParsed = css.parse(text);
    cssParsed.stylesheet?.rules.forEach((rule) => {
      if (rule.type === "media") {
        const {rules, media} = rule as css.Media;
        rules?.forEach(({declarations, selectors}: css.Rule) =>
          this.processDeclarations(declarations, path, selectors, media)
        );
      } else if (rule.type === "rule") {
        const {declarations, selectors} = rule as css.Rule;
        this.processDeclarations(declarations, path, selectors);
      } else if (rule.type === "comment") {
        // nada
      }
    });
  }

  /*
   * Clears out the completion items array.
   * Rebuilds them based on the current definitions state.
   */
  private processItems() {
    this.completionItems.splice(0, this.completionItems.length);
    Object.keys(this.definitions).forEach((property) => {
      const definition = this.definitions[property];
      const item = this.items[property];
      const values = Object.keys(definition).sort();
      const files: {[k: string]: 1} = {};
      const defCount = values.reduce((prev, curr) => {
        Object.keys(definition[curr]).forEach((file) => (files[file] = 1));
        return Object.keys(definition[curr]).length + prev;
      }, 0);
      const fileCount = Object.keys(files).length;
      item.documentation = new vscode.MarkdownString(
        `**${defCount}** definition${
          defCount === 1 ? "" : "s"
        } in **${fileCount}** file${
          fileCount === 1 ? "" : "s"
        }\n\n${values.join(", ")}`
      );
      this.completionItems.push(item);
    });
  }

  /*
   * Wiping memory of a specific Uri.
   * Clears out the definitions, references, and resets the pathToProperties mapping.
   */
  private resetUriData(uri: vscode.Uri) {
    const {path} = uri;

    this.pathToProperties[path]?.forEach((property) => {
      Object.keys(this.definitions[property]).forEach((value) => {
        if (this.definitions[property][value][path]) {
          delete this.definitions[property][value][path];
          if (!Object.keys(this.definitions[property][value]).length) {
            delete this.definitions[property][value];
          }
        }
      });
      Object.keys(this.references[property]).forEach((value) => {
        if (this.references[property][value][path]) {
          delete this.references[property][value][path];
          if (!Object.keys(this.references[property][value]).length) {
            delete this.references[property][value];
          }
        }
      });
    });
    this.pathToProperties[path] = [];
  }
}
