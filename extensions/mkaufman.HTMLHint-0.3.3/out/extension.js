"use strict";
const path = require('path');
const vscode_1 = require('vscode');
const vscode_languageclient_1 = require('vscode-languageclient');
function activate(context) {
    // We need to go one level up since an extension compile the js code into
    // the output folder.
    let serverModulePath = path.join(__dirname, '..', 'server', 'server.js');
    let debugOptions = { execArgv: ["--nolazy", "--debug=6004"] };
    let serverOptions = {
        run: { module: serverModulePath },
        debug: { module: serverModulePath, options: debugOptions }
    };
    let clientOptions = {
        documentSelector: ['html', 'htm'],
        synchronize: {
            configurationSection: 'htmlhint',
            fileEvents: vscode_1.workspace.createFileSystemWatcher('**/.htmlhintrc')
        }
    };
    let forceDebug = false;
    let client = new vscode_languageclient_1.LanguageClient('HTML-hint', serverOptions, clientOptions, forceDebug);
    context.subscriptions.push(new vscode_languageclient_1.SettingMonitor(client, 'htmlhint.enable').start());
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map