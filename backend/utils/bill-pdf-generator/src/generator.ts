import fs from 'fs';
import path from 'path';
import { Bill } from './types/bill';
import { createPDF } from 'html-pdf'; // Assuming a library for PDF generation

export class PDFGenerator {
    private templatePath: string;

    constructor() {
        this.templatePath = path.join(__dirname, 'templates', 'bill.template.html');
    }

    public generatePDF(billData: Bill): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            fs.readFile(this.templatePath, 'utf8', (err, template) => {
                if (err) {
                    return reject(err);
                }

                const renderedHTML = this.renderTemplate(template, billData);
                createPDF(renderedHTML, {}, (err, buffer) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(buffer);
                });
            });
        });
    }

    private renderTemplate(template: string, billData: Bill): string {
        return template
            .replace('{{id}}', billData.id)
            .replace('{{amount}}', billData.amount.toString())
            .replace('{{date}}', billData.date.toISOString().split('T')[0])
            .replace('{{customerName}}', billData.customerName);
    }

    public savePDF(buffer: Buffer, filePath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            fs.writeFile(filePath, buffer, (err) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }
}