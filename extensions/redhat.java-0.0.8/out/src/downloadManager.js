"use strict";
const https = require("https");
const fs = require("fs");
const vscode = require("vscode");
const path = require("path");
const url_1 = require("url");
const HttpProxyAgent = require('http-proxy-agent');
const HttpsProxyAgent = require('https-proxy-agent');
const tmp = require('tmp');
const decompress = require('decompress');
const progress = require('progress-stream');
let downloadProgressItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, Number.MIN_VALUE);
function closeDownloadProgressItem() {
    downloadProgressItem.hide();
    downloadProgressItem.dispose();
}
function download(urlString, proxy, strictSSL) {
    let url = url_1.parse(urlString);
    const agent = getProxyAgent(url, proxy, strictSSL);
    let options = {
        host: url.host,
        port: url.port ? parseInt(url.port) : (url.protocol === 'https:' ? 443 : 80),
        path: url.path,
        agent: agent,
        rejectUnauthorized: strictSSL
    };
    return new Promise((resolve, reject) => {
        let request = https.get(options, res => {
            // handle redirection
            if (res.statusCode === 302) {
                return download(res.headers.location).then(is => resolve(is)).catch(err => reject(err));
            }
            else if (res.statusCode !== 200) {
                return reject(Error(`Download failed with code ${res.statusCode}.`));
            }
            let len = parseInt(res.headers['content-length'], 10);
            let progressStream = progress({
                length: len,
                time: 500
            });
            downloadProgressItem.text = 'Completing Java installation';
            downloadProgressItem.show();
            progressStream.on('progress', function (progressData) {
                downloadProgressItem.text = 'Completing Java installation ' + Number.parseInt(progressData.percentage) + '%';
            });
            return resolve(res.pipe(progressStream));
        });
        request.setTimeout(30000, () => { request.abort(); });
        return request;
    });
}
function getSystemProxyURL(requestURL) {
    if (requestURL.protocol === 'http:') {
        return process.env.HTTP_PROXY || process.env.http_proxy || null;
    }
    else if (requestURL.protocol === 'https:') {
        return process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy || null;
    }
    return null;
}
function getProxyAgent(requestURL, proxy, strictSSL) {
    const proxyURL = proxy || getSystemProxyURL(requestURL);
    if (!proxyURL) {
        return null;
    }
    const proxyEndpoint = url_1.parse(proxyURL);
    if (!/^https?:$/.test(proxyEndpoint.protocol)) {
        return null;
    }
    const opts = {
        host: proxyEndpoint.hostname,
        port: Number(proxyEndpoint.port),
        auth: proxyEndpoint.auth,
        rejectUnauthorized: strictSSL
    };
    return requestURL.protocol === 'http:' ? new HttpProxyAgent(opts) : new HttpsProxyAgent(opts);
}
function downloadAndInstallServer() {
    return new Promise((resolve, reject) => {
        const config = vscode.workspace.getConfiguration();
        const proxy = config.get('http.proxy');
        const strictSSL = config.get('http.proxyStrictSSL', true);
        const SERVER_FOLDER = path.resolve(__dirname, '../../server/');
        // const SERVER_ARCHIVE = "https://dl.bintray.com/gorkem/java-language-server/java-server-1.0.0-201609020048.tar.gz";
        // Always use HTTPS download for http adresses may not work over proxies.
        const SERVER_ARCHIVE = 'https://download.jboss.org/jbosstools/static/vscode/java-server-1.0.0-201612221813.tar.gz';
        return download(SERVER_ARCHIVE, proxy, strictSSL).then(is => {
            tmp.file((err, tmpPath, fd, cleanupCallback) => {
                const out = fs.createWriteStream(null, { fd: fd });
                // handle errors
                out.once('error', err => {
                    closeDownloadProgressItem();
                    reject(err);
                });
                is.once('error', err => {
                    closeDownloadProgressItem();
                    reject(err);
                });
                out.once('finish', () => {
                    decompress(tmpPath, SERVER_FOLDER).then(files => {
                        closeDownloadProgressItem();
                        return resolve(true);
                    }).catch(err => {
                        closeDownloadProgressItem();
                        return reject(err);
                    });
                });
                is.pipe(out);
            });
        }).catch(err => {
            console.log(err);
        });
    });
}
exports.downloadAndInstallServer = downloadAndInstallServer;
//# sourceMappingURL=downloadManager.js.map