/**
 * A syntax-only reader of JavaScript/TypeScript source. Nothing is evaluated,
 * type-checked, resolved from disk, or imported from the scanned application.
 * Import and alias facts are *syntactic* hints, NOT proof of SDK semantics.
 */
import ts from 'typescript';
import { extname } from 'node:path';

const SUPPORTED = new Map<string, ts.ScriptKind>([
  ['.js', ts.ScriptKind.JS], ['.mjs', ts.ScriptKind.JS], ['.cjs', ts.ScriptKind.JS],
  ['.jsx', ts.ScriptKind.JSX], ['.ts', ts.ScriptKind.TS], ['.mts', ts.ScriptKind.TS],
  ['.cts', ts.ScriptKind.TS], ['.tsx', ts.ScriptKind.TSX],
]);
const SDK = new Set(['@stellar/stellar-sdk', 'stellar-sdk']);
const ordinal = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;

export interface Position { line: number; column: number }
export interface Location { file: string; start: Position; end: Position }
export interface ImportFact {
  module: '@stellar/stellar-sdk' | 'stellar-sdk';
  syntax: 'esm' | 'commonjs';
  importedName: string;
  localName: string;
  location: Location;
}
export interface AliasFact {
  localName: string;
  /** Dotted identifier path, recorded as syntax only, not resolved semantics. */
  target: string[];
  location: Location;
}
export interface ParseDiagnostic {
  code: 'INVALID_SYNTAX' | 'UNSUPPORTED_EXTENSION' | 'INVALID_SOURCE' | 'SOURCE_TOO_LARGE' | 'DYNAMIC_MODULE';
  file: string;
  location: Location | null;
  message: string;
}
export interface ParsedSource {
  file: string;
  status: 'complete' | 'incomplete';
  syntax: 'js' | 'jsx' | 'ts' | 'tsx' | null;
  imports: ImportFact[];
  aliases: AliasFact[];
  diagnostics: ParseDiagnostic[];
}
const MESSAGES: Record<ParseDiagnostic['code'], string> = {
  INVALID_SYNTAX: 'Source has a syntax error; AST facts may be incomplete.',
  UNSUPPORTED_EXTENSION: 'Source extension is unsupported.',
  INVALID_SOURCE: 'Invalid source path or source text.',
  SOURCE_TOO_LARGE: 'Source exceeds parser character limit.',
  DYNAMIC_MODULE: 'Module name is dynamically constructed and was not resolved.',
};
function validPath(file: string): boolean {
  return typeof file === 'string' && file.length > 0 && file.length <= 1024 &&
    !file.includes('\\') && !file.startsWith('/') &&
    file.split('/').every(s => s !== '' && s !== '.' && s !== '..' && !/[\x00-\x1f\x7f]/.test(s));
}
const syntaxFor = (ext: string): ParsedSource['syntax'] => {
  if (ext === '.jsx') return 'jsx';
  if (ext === '.tsx') return 'tsx';
  if (ext === '.ts' || ext === '.mts' || ext === '.cts') return 'ts';
  return 'js';
};

export function parseSource(file: string, source: string, maxCharacters = 1024 * 1024): ParsedSource {
  if (!validPath(file) || typeof source !== 'string' || !Number.isSafeInteger(maxCharacters) || maxCharacters < 1) {
    throw new TypeError('Invalid parse input');
  }
  const ext = extname(file).toLowerCase();
  const kind = SUPPORTED.get(ext);
  const result: ParsedSource = { file, status: 'complete', syntax: kind === undefined ? null : syntaxFor(ext), imports: [], aliases: [], diagnostics: [] };
  const issue = (code: ParseDiagnostic['code'], location: Location | null): void => {
    result.status = 'incomplete';
    result.diagnostics.push({ code, file, location, message: MESSAGES[code] });
  };
  if (kind === undefined || /\.d\.(ts|mts|cts)$/i.test(file)) { issue('UNSUPPORTED_EXTENSION', null); return result; }
  if (source.length > maxCharacters) { issue('SOURCE_TOO_LARGE', null); return result; }
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
  const location = (node: ts.Node): Location => {
    const start = ast.getLineAndCharacterOfPosition(node.getStart(ast));
    const end = ast.getLineAndCharacterOfPosition(node.getEnd());
    return { file, start: { line: start.line + 1, column: start.character + 1 }, end: { line: end.line + 1, column: end.character + 1 } };
  };
  // createSourceFile exposes parseDiagnostics at runtime; it is not part of the
  // public SourceFile declaration in every supported TS version.
  const syntaxErrors = (ast as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics ?? [];
  for (const err of syntaxErrors) {
    const start = ast.getLineAndCharacterOfPosition(err.start ?? 0);
    const end = ast.getLineAndCharacterOfPosition(Math.min(source.length, (err.start ?? 0) + (err.length ?? 0)));
    issue('INVALID_SYNTAX', { file, start: { line: start.line + 1, column: start.character + 1 }, end: { line: end.line + 1, column: end.character + 1 } });
  }
  // Avoid asserting partial binding facts from parser recovery after malformed input.
  if (syntaxErrors.length) return result;
  const add = (module: string, syntax: ImportFact['syntax'], importedName: string, localName: string, node: ts.Node): void => {
    if (SDK.has(module)) result.imports.push({ module: module as ImportFact['module'], syntax, importedName, localName, location: location(node) });
  };
  const requireModule = (expr: ts.Expression): string | null => {
    if (!ts.isCallExpression(expr) || !ts.isIdentifier(expr.expression) || expr.expression.text !== 'require' || expr.arguments.length !== 1) return null;
    const arg = expr.arguments[0];
    return arg && ts.isStringLiteral(arg) ? arg.text : null;
  };
  const pathOf = (expr: ts.Expression): string[] | null => {
    if (ts.isIdentifier(expr)) return [expr.text];
    if (ts.isPropertyAccessExpression(expr)) {
      const left = pathOf(expr.expression);
      return left ? [...left, expr.name.text] : null;
    }
    return null;
  };
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      if (!ts.isStringLiteral(node.moduleSpecifier)) { issue('DYNAMIC_MODULE', location(node)); }
      else if (!node.importClause?.isTypeOnly) {
        const spec = node.moduleSpecifier.text;
        const clause = node.importClause;
        if (clause) {
          if (clause.name) add(spec, 'esm', 'default', clause.name.text, clause.name);
          const bindings = clause.namedBindings;
          if (bindings && ts.isNamespaceImport(bindings)) add(spec, 'esm', '*', bindings.name.text, bindings.name);
          if (bindings && ts.isNamedImports(bindings)) {
            for (const element of bindings.elements) {
              if (!element.isTypeOnly) add(spec, 'esm', element.propertyName?.text ?? element.name.text, element.name.text, element.name);
            }
          }
        }
      }
    }
    if (ts.isImportEqualsDeclaration(node)) {
      const ref = node.moduleReference;
      if (ts.isExternalModuleReference(ref) && ref.expression && ts.isStringLiteral(ref.expression)) add(ref.expression.text, 'commonjs', '*', node.name.text, node.name);
    }
    if (ts.isVariableDeclaration(node) && node.initializer) {
      const module = requireModule(node.initializer);
      if (module && ts.isIdentifier(node.name)) add(module, 'commonjs', '*', node.name.text, node.name);
      if (module && ts.isObjectBindingPattern(node.name)) {
        for (const el of node.name.elements) {
          if (ts.isIdentifier(el.name)) {
            const key = el.propertyName;
            const imported = key && (ts.isIdentifier(key) || ts.isStringLiteral(key)) ? key.text : el.name.text;
            add(module, 'commonjs', imported, el.name.text, el.name);
          }
        }
      }
      // Aliases are syntax facts: do not assume the referenced identifier is an SDK
      // binding, and do not attempt to handle mutable variables or destructuring.
      if (ts.isIdentifier(node.name) && node.parent && ts.isVariableDeclarationList(node.parent) && (node.parent.flags & ts.NodeFlags.Const)) {
        const target = pathOf(node.initializer);
        if (target) result.aliases.push({ localName: node.name.text, target, location: location(node.name) });
      }
      if (ts.isCallExpression(node.initializer) && ts.isIdentifier(node.initializer.expression) &&
        node.initializer.expression.text === 'require' && node.initializer.arguments.length === 1 &&
        !ts.isStringLiteral(node.initializer.arguments[0]!)) issue('DYNAMIC_MODULE', location(node.initializer));
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments.length > 0 && !ts.isStringLiteral(node.arguments[0]!)) {
      issue('DYNAMIC_MODULE', location(node));
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  const cmpLocation = (a: Location, b: Location): number => a.start.line - b.start.line || a.start.column - b.start.column;
  result.imports.sort((a, b) => cmpLocation(a.location, b.location) || ordinal(a.localName, b.localName));
  result.aliases.sort((a, b) => cmpLocation(a.location, b.location) || ordinal(a.localName, b.localName));
  result.diagnostics.sort((a, b) => (a.location?.start.line ?? 0) - (b.location?.start.line ?? 0) || (a.location?.start.column ?? 0) - (b.location?.start.column ?? 0) || ordinal(a.code, b.code));
  return result;
}
