// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { posix, relative, parse, join } from "path";

function removeFileExtension(filePath: string): string {
  const parsedPath = parse(filePath);

  // Modify the base name to remove the extension
  const newName = parsedPath.name; // This is the file name without extension
  const newPath = join(parsedPath.dir, newName);

  return newPath;
}

let GLOBAL_FLAGS = {
  JITO_IGNORED: false,
  BROWSER_OPEN: false,
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

const generateJitoPage = async (root: vscode.Uri) => {
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
  const userTextSelection = vscode.window.activeTextEditor?.selection;
  const componentName =
    vscode.window.activeTextEditor?.document.getText(userTextSelection);
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

const openBrowser = async () => {
  if (GLOBAL_FLAGS.BROWSER_OPEN) {
    return;
  }

  vscode.commands.executeCommand("simpleBrowser.show");

  GLOBAL_FLAGS.BROWSER_OPEN = true;
};

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "jito" is now active!');

  const disposable = vscode.commands.registerCommand("jito.jito", async () => {
    const root = vscode.workspace.workspaceFolders![0]!.uri;

    generateJitoPage(root);
    updateGitIgnoreFile(root);

    openBrowser();
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
