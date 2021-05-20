import * as vscode from "vscode";

export const CUSTOM_PROPERTY_DEFINITION_REGEX = /(--[^:; ]+):/;
export const CUSTOM_PROPERTY_REFERENCE_REGEX = /var\((--[^:;) ]+)\)/;
export const CUSTOM_PROPERTY_REFERENCE_REGEX_G = /var\((--[^:;) ]+)\)/g;

/*
 * Given a position, find any property in question and whether or not it is a reference.
 *  reference:  something: var(--property);
 *  definition: --property: something;
 */
export function customPropertyFromPosition(
  document: vscode.TextDocument,
  position: vscode.Position
): {property: string; isDefinition: boolean; isReference: boolean} {
  const line = document.lineAt(position.line).text;
  const range = document.getWordRangeAtPosition(position);

  // Look 1 char left in string to see if a paren
  const isReference =
    line.charAt(Math.max((range?.start.character || 1) - 1, 0)) === "(";
  const isDefinition = !isReference;
  // -4 for characters "var(" if reference
  const positionAOffset = isReference ? 4 : 0;
  // +1 for character ")" if reference
  const positionBOffset = isReference ? 1 : 0;
  const substr: string = line.substr(
    (range?.start.character || positionAOffset) - positionAOffset,
    (range?.end.character || 0) + positionBOffset
  );
  // finding reference or definition in the substring.
  const match = isReference
    ? substr.match(CUSTOM_PROPERTY_REFERENCE_REGEX)
    : substr.match(CUSTOM_PROPERTY_DEFINITION_REGEX);
  const property = match?.[1] || "";
  return {
    property,
    isDefinition: !!property && isDefinition,
    isReference: !!property && isReference,
  };
}
