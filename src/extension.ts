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

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "jito" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const disposable = vscode.commands.registerCommand("jito.jito", async () => {
    // The code you place here will be executed every time your command is executed

    const tmpl = `
"use client"

importPlaceholder

const Jito = () => {
	return <>JitoComponentPlaceholder</>;
};

export default Jito;
			`;

    const gitignoreTmpl = `
# JITO
app/jito/page.tsx
		`;

    const root = vscode.workspace.workspaceFolders![0]!.uri;

    const folder = root.with({ path: posix.join(root.path, "app/jito") });
    const file = root.with({
      path: posix.join(root.path, "app/jito/page.tsx"),
    });
    const gitIgnoreFile = root.with({
      path: posix.join(root.path, ".gitignore"),
    });

    console.log(gitIgnoreFile.path);

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
    const gitIgnoreOldContent = await vscode.workspace.fs.readFile(
      gitIgnoreFile
    );
    const gitIgnoreOldText = new TextDecoder().decode(gitIgnoreOldContent);

    // Define the new content
    const newText = oldText
      .replace("JitoComponentPlaceholder", `<${componentName} />`)
      .replace(
        "importPlaceholder",
        `import { ${componentName} } from "${componentImportPath}"`
      );

    const gitIgnoreNewText = `${gitIgnoreOldText} ${gitignoreTmpl}`;

    // Write the new content to the file
    const newContent = new TextEncoder().encode(newText);
    const gitIgnoreNewContent = new TextEncoder().encode(gitIgnoreNewText);

    await vscode.workspace.fs.writeFile(file, newContent);
    await vscode.workspace.fs.writeFile(gitIgnoreFile, gitIgnoreNewContent);

    vscode.commands.executeCommand("simpleBrowser.show");
    console.log(process.env.VSCODE_BROWSER_TEST);
  });

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
