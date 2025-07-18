"use strict";

const vscode = require("vscode");
const fs = require("fs");

// Enum kiểu JS object
const EolKind = {
    LF: 'LF',
    CRLF: 'CRLF',
    CR: 'CR',
    Unknown: 'Unknown'
};

function getEolInfo(match) {
    switch (match) {
        case '\n':
            return { text: '↓', kind: EolKind.LF };
        case '\r\n':
            return { text: '↵', kind: EolKind.CRLF };
        case '\r':
            return { text: '←', kind: EolKind.CR };
        default:
            return { text: '', kind: EolKind.Unknown };
    }
}

function isFirstLoadUnedited(document) {
    // 1. Chưa có chỉnh sửa nào
    const notDirty = !document.isDirty;

    // 2. Không phải untitled (new file chưa lưu)
    const isSavedFile = document.uri.scheme === 'file';

    // 3. Đã được mở nhưng chưa có event sửa đổi
    return notDirty && isSavedFile;
}

// Hàm kích hoạt extension
function activate(context) {
    const nullDecoration = vscode.window.createTextEditorDecorationType({});
    let activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        updateDecorations();
    }

    vscode.window.onDidChangeActiveTextEditor(function (editor) {
        activeEditor = editor;
        if (editor) {
            updateDecorations();
        }
    }, null, context.subscriptions);

    vscode.workspace.onDidChangeTextDocument(function () {
        updateDecorations();
    }, null, context.subscriptions);

    async function updateDecorations() {
        if (!activeEditor) return;

        // Skip files that are too large
        const totalLines = activeEditor.document.lineCount;
        if (totalLines > 10000) {
            console.warn(`Warning EOL: Skipping decoration, file too large (${totalLines} lines)`);
            return;
        }

        const configuration = vscode.workspace.getConfiguration('warning-eol');
        const colorDefaultEOL = configuration.colorDefaultEOL;
        const colorInconsitentEOL = configuration.colorInconsitentEOL;
        let text = activeEditor.document.getText();
        const regEx = /(\r(?!\n))|(\r?\n)/g;
        if (isFirstLoadUnedited(activeEditor.document))
        {
            try {
                const uri = activeEditor.document.uri;
                const filePath = uri.fsPath;

                // 1. Try to read from file system (fs)
                if (fs.existsSync(filePath)) {
                    const buffer = fs.readFileSync(filePath);
                    text = buffer.toString("utf8");
                } else {
                    // 2. Try to read via vscode.workspace.fs
                    const rawBuffer = await vscode.workspace.fs.readFile(uri);
                    text = Buffer.from(rawBuffer).toString("utf8");
                }

            } catch (err) {
                console.warn("Warning EOL: Failed to read raw file content, falling back to document.getText()", err);
            }
        }

        const newLines = [];
        let match;
        while ((match = regEx.exec(text))) {
            const eolInfo = getEolInfo(match[0]);
            const pos = activeEditor.document.positionAt(match.index);
            const line = activeEditor.document.lineAt(pos.line);
            const decoration = {
                range: new vscode.Range(line.range.end, line.range.end),
                renderOptions: {
                    after: {
                        contentText: eolInfo.text,
                        color: colorDefaultEOL,
                    }
                },
                kind: eolInfo.kind
            };
            newLines.push(decoration);
        }
        const isCRLF = activeEditor.document.eol === vscode.EndOfLine.CRLF;
        let numInconsistentEOL = 0;
        let contentText = '';
        for (let i = 0; i < newLines.length; i++) {
            const line = activeEditor.document.lineAt(i);
            const lineEndPos = new vscode.Position(i, line.text.length);
            newLines[i].range = new vscode.Range(lineEndPos, lineEndPos);
            const kind = newLines[i].kind;
            if ((kind === EolKind.LF && isCRLF) ||
            (kind === EolKind.CRLF && !isCRLF) ||
            (kind === EolKind.CR)) {
                contentText = newLines[i].renderOptions.after.contentText;
                newLines[i].renderOptions.after.color = colorInconsitentEOL;
                numInconsistentEOL++;
            }
        }
        activeEditor.setDecorations(nullDecoration, newLines);

        if (numInconsistentEOL)
        {
            vscode.window.showWarningMessage(`${numInconsistentEOL} Inconsistent EOL ${contentText}`);
        }
    }
}

exports.activate = activate;
