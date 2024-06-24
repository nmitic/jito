import * as vscode from "vscode";
import path, { posix, relative } from "path";
import { removeFileExtension } from "./utils";
import { readFileSync } from "fs";
import * as ts from "typescript";

let GLOBAL_FLAGS = {
  JITO_IGNORED: false,
};

const updateGitIgnoreFile = async (root: vscode.Uri) => {
  console.log(GLOBAL_FLAGS);
  if (GLOBAL_FLAGS.JITO_IGNORED) {
    return;
  }

  const gitignoreTmpl = `
# JITO
app/jito/page.tsx
		`;

  const gitIgnoreFile = root.with({
    path: posix.join(root.path, ".gitignore"),
  });

  const gitIgnoreOldContent = await vscode.workspace.fs.readFile(gitIgnoreFile);
  const gitIgnoreOldText = new TextDecoder().decode(gitIgnoreOldContent);
  const gitIgnoreNewText = `${gitIgnoreOldText} ${gitignoreTmpl}`;

  const gitIgnoreNewContent = new TextEncoder().encode(gitIgnoreNewText);

  await vscode.workspace.fs.writeFile(gitIgnoreFile, gitIgnoreNewContent);

  GLOBAL_FLAGS.JITO_IGNORED = true;
};

function getAllComponentName(node: ts.Node): string[] {
  const componentNames: string[] = [];

  function isJSXElement(node: ts.Node): boolean {
    return ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node);
  }

  function containsJSX(node: ts.Node): boolean {
    let contains = false;
    function visit(n: ts.Node) {
      if (isJSXElement(n)) {
        contains = true;
      }
      ts.forEachChild(n, visit);
    }
    visit(node);
    return contains;
  }

  function visit(node: ts.Node) {
    // Check for variable declarations (const/let/var)
    if (
      ts.isVariableStatement(node) &&
      node.declarationList.declarations.length > 0
    ) {
      node.declarationList.declarations.forEach((declaration) => {
        if (
          ts.isVariableDeclaration(declaration) &&
          declaration.name &&
          ts.isIdentifier(declaration.name)
        ) {
          if (
            declaration.initializer &&
            (ts.isArrowFunction(declaration.initializer) ||
              ts.isFunctionExpression(declaration.initializer))
          ) {
            const func = declaration.initializer;
            if (containsJSX(func)) {
              componentNames.push(declaration.name.text);
            }
          }
        }
      });
    }

    // Check for function declarations
    if (ts.isFunctionDeclaration(node)) {
      if (node.name && ts.isIdentifier(node.name)) {
        if (containsJSX(node)) {
          componentNames.push(node.name.text);
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(node);

  return componentNames;
}

const generateJitoPage = async (componentName: string) => {
  const root = vscode.workspace.workspaceFolders![0]!.uri;

  const tmpl = `
"use client"

importPlaceholder

const Jito = () => {
	return <>JitoComponentPlaceholder</>;
};

export default Jito;
			`;

  const folder = root.with({ path: posix.join(root.path, "app/jito") });
  const file = root.with({
    path: posix.join(root.path, "app/jito/page.tsx"),
  });

  const componentFilePath = vscode.window.activeTextEditor?.document.uri
    .path as string;

  const componentImportPath = removeFileExtension(
    relative(folder.path, componentFilePath)
  );

  await vscode.workspace.fs.createDirectory(folder);
  await vscode.workspace.fs.writeFile(file, Buffer.from(tmpl));

  // Read the current content of the file
  const oldContent = await vscode.workspace.fs.readFile(file);
  const oldText = new TextDecoder().decode(oldContent);

  // Define the new content
  const newText = oldText
    .replace("JitoComponentPlaceholder", `<${componentName} />`)
    .replace(
      "importPlaceholder",
      `import { ${componentName} } from "${componentImportPath}"`
    );

  // Write the new content to the file
  const newContent = new TextEncoder().encode(newText);

  await vscode.workspace.fs.writeFile(file, newContent);
};

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "jitoo" is now active!');

  const setup = vscode.commands.registerCommand("jito.setup", async () => {
    function getAst(filePath: string) {
      // Read the file content
      const fileContent = readFileSync(filePath, "utf8");

      // Parse the file content to generate the AST
      const sourceFile = ts.createSourceFile(
        filePath,
        fileContent,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX
      );

      return sourceFile;
    }

    const filePath = path.join(
      vscode.window.activeTextEditor?.document.uri.fsPath as string
    );
    const ast = getAst(filePath);

    const allComponentNames = getAllComponentName(ast);

    console.log(allComponentNames);

    const selectedOption = await vscode.window.showQuickPick(
      allComponentNames,
      {
        placeHolder: "Select an option",
      }
    );

    if (selectedOption) {
      generateJitoPage(selectedOption);
    }
  });

  const preview = vscode.commands.registerCommand("jito.preview", () => {
    const panel = vscode.window.createWebviewPanel(
      "jitoWebView",
      "Jito Component Preview",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
      }
    );
    const htmlPath = path.join(context.extensionPath, "src", "preview.html");
    const htmlContent = readFileSync(htmlPath, "utf8");
    // And set its HTML content
    panel.webview.html = htmlContent;
  });

  const jito = vscode.commands.registerCommand("jito.start", async () => {
    await vscode.commands.executeCommand("jito.setup");
    await vscode.commands.executeCommand("jito.preview");
  });

  context.subscriptions.push(setup, preview, jito);
}

export function deactivate() {}
