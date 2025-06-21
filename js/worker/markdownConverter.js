// Contains Markdown conversion logic (to Image or PDF) for the Web Worker

self.handleMarkdownConversion = function(file, outputFormat, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                if (!self.marked) {
                    return reject(new Error('Worker: Markdown library (marked.js) not available.'));
                }
                const htmlContent = self.marked.parse(e.target.result);

                if (outputFormat === 'application/pdf') {
                    if (!self.jspdf || !self.jspdf.jsPDF) {
                        return reject(new Error('Worker: PDF generation library (jsPDF) not available.'));
                    }
                    console.log(`Worker: Converting Markdown to PDF for ${file.name}`);
                    const { jsPDF } = self.jspdf;
                    const pdfDoc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
                    const pdfRenderWidthPt = 190 * 2.83465; // 190mm
                    const styledHtmlForPdf = `<div style="width: ${pdfRenderWidthPt}pt; padding: ${10 * 2.83465}pt; font-family: Helvetica, Arial, sans-serif; font-size: 12pt; line-height: 1.5;">${htmlContent}</div>`;

                    pdfDoc.html(styledHtmlForPdf, {
                        callback: function (doc) {
                            try {
                                resolve(doc.output('blob'));
                            } catch (pdfError) {
                                reject(new Error(`Worker: Error generating PDF blob: ${pdfError.message}`));
                            }
                        },
                        x: 10 * 2.83465, y: 10 * 2.83465, autoPaging: 'slice',
                        html2canvas: { scale: 0.75, useCORS: true, logging: false },
                        width: pdfRenderWidthPt, windowWidth: pdfRenderWidthPt / 0.75
                    }).catch(htmlError => reject(new Error(`Worker: pdfDoc.html() method failed: ${htmlError.message}`)));

                } else { // Output is an image (PNG, JPEG, WEBP)
                    if (typeof self.Image === 'undefined') {
                       return reject(new Error('Worker: Image constructor not available for Markdown to Image conversion.'));
                    }
                    if (typeof OffscreenCanvas === 'undefined') {
                        return reject(new Error('Worker: OffscreenCanvas not available, cannot render Markdown to image in worker without it.'));
                    }
                    console.log(`Worker: Converting Markdown to Image (${outputFormat}) for ${file.name}`);
                    const renderWidth = 800;
                    const styledHtml = `<style>body{margin:0;padding:0;font-family:Arial,sans-serif;line-height:1.6;background-color:white;}div#mdrender{width:${renderWidth}px;padding:20px;background-color:white;overflow-wrap:break-word;}h1,h2,h3,h4,h5,h6{margin-top:1em;margin-bottom:0.5em;}p{margin-bottom:1em;}code{background-color:#f0f0f0;padding:0.2em 0.4em;border-radius:3px;}pre{background-color:#f0f0f0;padding:1em;border-radius:3px;overflow-x:auto;}img{max-width:100%;height:auto;}</style><div id="mdrender">${htmlContent}</div>`;
                    const dataUrl = `data:text/html,${encodeURIComponent(styledHtml)}`;
                    const img = new self.Image();

                    img.onload = () => {
                        const canvasWidth = img.width > 0 ? img.width : renderWidth;
                        const canvasHeight = img.height > 0 ? img.height : 600;
                        const renderCanvas = new OffscreenCanvas(canvasWidth, canvasHeight);
                        const ctx = renderCanvas.getContext('2d');
                        if (!ctx) return reject(new Error('Worker: Could not get 2D context for Markdown rendering canvas.'));
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(0, 0, renderCanvas.width, renderCanvas.height);
                        ctx.drawImage(img, 0, 0);

                        if (typeof self.processSourceToBlob !== 'function') {
                             return reject(new Error('Worker: processSourceToBlob utility not found.'));
                        }
                        self.processSourceToBlob(renderCanvas, outputFormat, quality).then(resolve).catch(reject);
                    };
                    img.onerror = () => reject(new Error(`Worker: Failed to load HTML as image for ${file.name}.`));
                    img.src = dataUrl;
                }
            } catch (err) {
                reject(new Error(`Worker: Error processing Markdown ${file.name}: ${err.message}`));
            }
        };
        reader.onerror = () => {
            reject(new Error(`Worker: Failed to read Markdown file ${file.name}`));
        };
        reader.readAsText(file);
    });
};
