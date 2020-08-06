import * as vscode from 'vscode';
import * as path from 'path';
import { Base64Utils } from './base64utils';
import { Localizer } from './localizer';

export class View {
	private messages: any;
	private style = `
    body {
        background-color: #1e1e1e;
        margin: 0;
        padding: 0 8px;
        width: 99%;
    }
    
    code {
        max-width: 100%;
        word-wrap: break-word;
    }
    
    h1 {
        background-color: #004c8c;
        border-top-left-radius: 4px;
        border-top-right-radius: 4px;
        color: #ffffff;
        padding-bottom: 8px;
        padding-top: 8px;
        text-align: center;
        width: 100%;
    }
    
    h2, h3 {
        text-align: center;
        vertical-align: middle;
        width: 100%;
    }
    
    .content {
        border-top: #909090 solid 1px;
        display: flex;
        justify-content: center;
        margin: 4px;
        padding: 4px 0;
    }
    
    .encoded-content {
        align-items: center;
        display: flex;
        flex-direction: column;
        justify-content: center;
    }
    
    .img-content {
        border-top: #909090 solid 1px;
        margin: 4px;
        padding: 8px 0;
    }
    
    .page-content {
        margin: 0;
        padding: 0;
        width: 100%;
    }
    
    .page-nav {
        display: flex;
        justify-content: space-around;
        align-items: center;
    }
    
    .page-nav > button {
        margin: 0 12px;
    }
    
    .pdf-content {
        border-top: #909090 solid 1px;
        margin-top: 4px;
        padding: 4px 0;
    }
    
    .pdf-navbar {
        background-color: #454545;
        display: flex;
        justify-content: space-between;
        padding: 8px;
    }
    
    .pdf-navbar button {
        background-color: #303030;
        border: #dddddd solid 1px;
        border-radius: 4px;
        color: #dddddd;
        font-weight: bold;
        padding: 4px 8px;
    }
    
    .spacer {
        width: 48px;
    }
    
    .title-bar {
        margin: 0;
        padding: 0;
        width: 100%;
    }
    
    .two-col {
        display: flex;
        justify-content: space-around;
    }
    
    .two-col > * {
        padding: 0 8px;
    }
    
    .two-col > :first-child {
        flex-grow: 2;
    }
    
    .two-col > :last-child {
        flex-grow: 1;
    }
    
    #switchButton {
        background-color: #303030;
        border: #ffffff solid 1px;
        border-radius: 4px;
        color: #ffffff;
        max-width: fit-content;
        margin: 4px;
        padding: 4px;
    }
    `;

	constructor() {
		let localizer = new Localizer();
		this.messages = localizer.getLocalizedMessages();
	}

	public createView(
		extensionRoot: vscode.Uri,
		target: string,
		mimeType: string,
		viewType: string,
		filePath?: string,
	) {
		// Create and show panel
		var webviewPanel = vscode.window.createWebviewPanel('base64viewer', 'Base64 Viewer', vscode.ViewColumn.Two, {});
		webviewPanel.webview.options = {
			enableScripts: true,
		};

		if (viewType === 'decoding') {
			webviewPanel.webview.html = this.initWebviewDecodingContent(
				extensionRoot,
				webviewPanel.webview,
				target,
				mimeType,
			);
		} else if (viewType === 'encoding') {
			webviewPanel.webview.html = this.initWebviewEncodingContent(
				extensionRoot,
				webviewPanel.webview,
				target,
				mimeType,
				filePath || '',
			);
		}
	}

	private initWebviewDecodingContent(
		extensionRoot: vscode.Uri,
		webview: vscode.Webview,
		base64String: string,
		mimeType: string,
	): string {
		const b64u = new Base64Utils();
		const spacer = '  |  ';
		const resolveAsUri = (...p: string[]): vscode.Uri => {
			const uri = vscode.Uri.file(path.join(extensionRoot.path, ...p));
			return webview.asWebviewUri(uri);
		};
		const fileSize = b64u.getFileSize(base64String);

		let head = ``;
		let body = ``;

		if (mimeType === 'application/pdf') {
			head = `
                <!DOCTYPE html>
                <html dir="ltr" mozdisallowselectionprint>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
                        <meta name="google" content="notranslate">
                        <meta http-equiv="X-UA-Compatible" content="IE=edge">
                        <title>${this.messages.general.title}</title>
                        <script src="${resolveAsUri('lib', 'pdfjs-dist', 'pdf.js')}"></script>
                        <style>${this.style}</style>
                    </head>`;
			body = `
                <body>
                    <div class="title-bar">
                        <h1>${this.messages.general.title}</h1>
                    </div>
            
                    <div class="page-content two-col">
                        <div>
                            <h3>${mimeType}  (${fileSize})</h3>
                            <div class="pdf-content">
                                <div class="pdf-navbar">
                                    <div class="spacer"></div>
            
                                    <div class="page-nav">
                                        <button onclick="changePage(loadedPdf, currentPage, 'prev')"><</button>
                                        <span>
                                        ${
											this.messages.pdf.page
										} : <span id="currentPage"></span> / <span id="totalPage"></span>
                                        </span>
                                        <button onclick="changePage(loadedPdf, currentPage, 'next')">></button>
                                    </div>
            
                                    <div class="spacer"></div>
                                </div>
            
                                <canvas id="pdfCanvas"></canvas>
                            </div>
                        </div>
            
                        <div>
                            <div>
                                <h3>${this.messages.pdf.orderedElements.text.title}</h3>
                                <div class="content">
                                    <code id="pdfTextElementsList"></code>
                                </div>
                            </div>
                            <div>
                                <h3>${this.messages.pdf.orderedElements.images.title}</h3>
                                <div class="content" id="pdfImagesList"></div>
                            </div>
                        </div>
                    </div>
            
                    <script>
                        var pdfData = atob('${base64String}');
                        var pdfjsLib = window['pdfjs-dist/build/pdf'];
                        pdfjsLib.GlobalWorkerOptions.workerSrc = '${resolveAsUri(
							'lib',
							'pdfjs-dist',
							'pdf.worker.js',
						)}';
            
                        var loadingTask = pdfjsLib.getDocument({data: pdfData});

                        var loadedPdf;
                        var currentPage;
            
                        loadingTask.promise.then(function(pdf) {
                            loadedPdf = pdf;

                            // Init page navbar
                            var currentPageElement = document.getElementById('currentPage');
                            currentPageElement.innerText = 1;
                            currentPage = 1;
                            var totalPageElement = document.getElementById('totalPage');
                            totalPageElement.innerText = pdf.numPages;
                        
                            // Fetch the first page
                            var pageNumber = 1;
                            renderPage(pdf, pageNumber);
                        
                            // Parsing the pdf page by page
                            parsePdf(pdf);
                        }, function (reason) {
                            // PDF loading error
                            console.error("Error: " + reason);
                        });

                        function changePage(pdf, current, change) {
                            var pageNumber = (change === "prev") ? current - 1 : current + 1;
                        
                            if (pageNumber < 1) {
                                pageNumber = 1;
                            } else if (pageNumber > pdf.numPages) {
                                pageNumber = pdf.numPages;
                            }
                        
                            renderPage(pdf, pageNumber);
                        }
                        
                        function extractImagesInPage(page) {
                            const scale = 1.5;
                            const viewport = page.getViewport({scale: scale});

                            page.getOperatorList().then(function(opList) {
                                var svgGfx = new pdfjsLib.SVGGraphics(page.commonObjs, page.objs);
                                return svgGfx.getSVG(opList, viewport);
                            }).then(function(svg) {
                                var pageSvgString = new XMLSerializer().serializeToString(svg);
                                var cutSvg = pageSvgString.split('<svg:image ');
                                for (var i=0; i < cutSvg.length; i++) {
                                    var recut = cutSvg[i+1].split('/>');
                                    var blob = recut[0].split('href="');
                                    blob = blob[1].split('"');
                                    var svgSrc = blob[0];

                                    var img = document.createElement("IMG");
                                    img.setAttribute('src', svgSrc)
                                    img.setAttribute('width', '80%');
                                    document.getElementById('pdfImagesList').appendChild(img);
                                }
                            });	
                        }
                        
                        function extractTextInPage(page, htmlList) {
                            page.getTextContent().then(function(tokenizedText) {
                                var textElementsList = "";
                                var pageContent = tokenizedText.items.map(token => token.str);
                            
                                pageContent.forEach(function(textElement) {
                                    textElement = textElement.trim();
                                
                                    if (textElement !== '') {
                                        textElementsList = textElementsList + textElement + '${spacer}';
                                    }
                                });

                                htmlList.innerText = htmlList.innerText + textElementsList;
                            });
                        }
                        
                        function parsePdf(pdf) {
                            var pdfTextElementsList = document.getElementById('pdfTextElementsList');
                            for (let i = 0; i < pdf.numPages; i++) {                            
                                pdf.getPage(i + 1).then(function(page) {
                                    extractTextInPage(page, pdfTextElementsList);
                                    extractImagesInPage(page);
                                });				
                            }
                        }
                        
                        function renderPage(pdf, pageNum) {
                            var currentPageElement = document.getElementById('currentPage');
                        
                            pdf.getPage(pageNum).then(function(page) {
                                var scale = 1.5;
                                var viewport = page.getViewport({scale: scale});
                          
                                // Prepare canvas using PDF page dimensions
                                var canvas = document.getElementById('pdfCanvas');
                                var context = canvas.getContext('2d');
                                canvas.height = viewport.height;
                                canvas.width = viewport.width;
                          
                                // Render PDF page into canvas context
                                var renderContext = {
                                    canvasContext: context,
                                    viewport: viewport
                                };
                                var renderTask = page.render(renderContext);
                                renderTask.promise.then(function () {
                                    currentPageElement.innerText = pageNum;
                                    currentPage = pageNum;
                                });
                            });
                        }
                    </script>
                </body>
            </html>`;
		} else if (mimeType.includes('image')) {
			head = `
                <!DOCTYPE html>
                <html dir="ltr" mozdisallowselectionprint>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
                        <meta name="google" content="notranslate">
                        <meta http-equiv="X-UA-Compatible" content="IE=edge">
                        <title>${this.messages.general.title}</title>
                        <style>${this.style}</style>
                    </head>`;
			body = `
                <body>
                    <div class="title-bar">
                        <h1>${this.messages.general.title}</h1>
                    </div>
            
                    <div class="page-content">
                        <h3>${mimeType}  (${fileSize})</h3>
                        <div class="img-content">
                            <img src="data:${mimeType};base64,${base64String}"/>
                        </div>
                    </div>
                </body>
            </html>`;
		} else if (mimeType.includes('text')) {
			head = `
                <!DOCTYPE html>
                <html dir="ltr" mozdisallowselectionprint>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
                        <meta name="google" content="notranslate">
                        <meta http-equiv="X-UA-Compatible" content="IE=edge">
                        <title>${this.messages.general.title}</title>
                        <style>${this.style}</style>
                    </head>`;
			body = `
                <body>
                    <div class="title-bar">
                        <h1>${this.messages.general.title}</h1>
                    </div>
            
                    <div class="page-content">
                        <h3>${mimeType}  (${fileSize})</h3>
                        <div class="content">
                            <code id="code-tag"></code>
                        </div>
                    </div>
                        
                    <script>
                        var text = atob('${base64String}');
                        var codeTag = document.getElementById('code-tag');
                        codeTag.innerText = text;
                    </script>
                </body>
            </html>`;
		} else {
			head = `
                <!DOCTYPE html>
                <html dir="ltr" mozdisallowselectionprint>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
                        <meta name="google" content="notranslate">
                        <meta http-equiv="X-UA-Compatible" content="IE=edge">
                        <title>${this.messages.general.title}</title>
                        <style>${this.style}</style>
                    </head>`;
			body = `
                <body>
                    <div class="title-bar">
                        <h1>${this.messages.general.title}</h1>
                    </div>
            
                    <div class="page-content">
                        <h3>${mimeType}  (${fileSize})</h3>
                        <div class="content">
                            <h2>${this.messages.general.cantDisplayContent}</h2>
                        </div>
                    </div>
                </body>
            </html>`;
		}

		return head + body;
	}

	private initWebviewEncodingContent(
		extensionRoot: vscode.Uri,
		webview: vscode.Webview,
		content: string,
		mimeType: string,
		filePath: string,
	): string {
		const spacer = '  |  ';
		const resolveAsUri = (...p: string[]): vscode.Uri => {
			const uri = vscode.Uri.file(path.join(extensionRoot.path, ...p));
			return webview.asWebviewUri(uri);
		};

		let head = ``;
		let body = ``;

		if (mimeType === 'application/pdf') {
			head = `
                <!DOCTYPE html>
                <html dir="ltr" mozdisallowselectionprint>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
                        <meta name="google" content="notranslate">
                        <meta http-equiv="X-UA-Compatible" content="IE=edge">
                        <title>${this.messages.general.title}</title>
                        <style>${this.style}</style>
                        <script src="${resolveAsUri('lib', 'pdfjs-dist', 'pdf.js')}"></script>
                    </head>`;
			body = `
                <body>
                    <div class="title-bar">
                        <h1>${this.messages.general.title}</h1>
                    </div>
            
                    <div class="page-content">
                        <h3>${filePath}<br/><br/>${mimeType}</h3>
                        <div class="content encoded-content">
                            <button id="switchButton" onclick="switchContent()">${
								this.messages.pdf.orderedElements.text.button
							}</button>
                            <code id="code-tag">${content}</code>
                            <br/>
                            <details id="pdfImagesList">
                                <summary>${this.messages.pdf.orderedElements.images.title}</summary>
                            </details>
                        </div>
                    </div>

                    <script>
                        var displayed = "content";
                        var textElementsList = "";

                        var pdfData = atob('${content}');
                        var pdfjsLib = window['pdfjs-dist/build/pdf'];
                        pdfjsLib.GlobalWorkerOptions.workerSrc = '${resolveAsUri(
							'lib',
							'pdfjs-dist',
							'pdf.worker.js',
						)}';
            
                        var loadingTask = pdfjsLib.getDocument({data: pdfData});
            
                        loadingTask.promise.then(function(pdf) {
                            parsePdf(pdf);                            
                        }, function (reason) {
                            // PDF loading error
                            console.error("Error: " + reason);
                        });
                        
                        function extractImagesInPage(page) {
                            const scale = 1.5;
                            const viewport = page.getViewport({scale: scale});

                            page.getOperatorList().then(function(opList) {
                                var svgGfx = new pdfjsLib.SVGGraphics(page.commonObjs, page.objs);
                                return svgGfx.getSVG(opList, viewport);
                            }).then(function(svg) {
                                var pageSvgString = new XMLSerializer().serializeToString(svg);
                                var cutSvg = pageSvgString.split('<svg:image ');
                                for (var i=0; i < cutSvg.length; i++) {
                                    var recut = cutSvg[i+1].split('/>');
                                    var blob = recut[0].split('href="');
                                    blob = blob[1].split('"');
                                    var svgSrc = blob[0];

                                    var img = document.createElement("IMG");
                                    img.setAttribute('src', svgSrc)
                                    img.setAttribute('width', '80%');
                                    document.getElementById('pdfImagesList').appendChild(img);
                                }
                            });	
                        }
                        
                        function extractTextInPage(page, htmlList) {
                            page.getTextContent().then(function(tokenizedText) {
                                var pageContent = tokenizedText.items.map(token => token.str);
                            
                                pageContent.forEach(function(textElement) {
                                    textElement = textElement.trim();
                                
                                    if (textElement !== '') {
                                        textElementsList = textElementsList + textElement + '${spacer}';
                                    }
                                });
                            });
                        }
                        
                        function parsePdf(pdf) {
                            var pdfTextElementsList = document.getElementById('pdfTextElementsList');
                            for (let i = 0; i < pdf.numPages; i++) {                            
                                pdf.getPage(i + 1).then(function(page) {
                                    extractTextInPage(page, pdfTextElementsList);
                                    extractImagesInPage(page);
                                });				
                            }
                        }

                        function switchContent() {
                            var codeTag = document.getElementById('code-tag');
                            var switchButton = document.getElementById('switchButton');

                            if (displayed === "content") {
                                codeTag.innerText = textElementsList;
                                displayed = "textElementsList";
                                switchButton.innerText = "${this.messages.pdf.encodedString.button}";
                            } else {
                                codeTag.innerText = '${content}';
                                displayed = "content";
                                switchButton.innerText = "${this.messages.pdf.orderedElements.text.button}";
                            }
                        }
                    </script>
                </body>
            </html>`;
		} else {
			head = `
                <!DOCTYPE html>
                <html dir="ltr" mozdisallowselectionprint>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
                        <meta name="google" content="notranslate">
                        <meta http-equiv="X-UA-Compatible" content="IE=edge">
                        <title>${this.messages.general.title}</title>
                        <style>${this.style}</style>
                    </head>`;
			body = `
                <body>
                    <div class="title-bar">
                        <h1>${this.messages.general.title}</h1>
                    </div>
            
                    <div class="page-content">
                        <h3>${filePath}<br/><br/>${mimeType}</h3>
                        <div class="content">
                            <code id="code-tag">${content}</code>
                        </div>
                    </div>
                </body>
            </html>`;
		}

		return head + body;
	}
}
