/**
 * Print Optimization Utility for Multi-Device Bill Printing
 * Automatically detects device type and optimizes print settings
 */

class PrintOptimizer {
    constructor() {
        this.deviceType = this.detectDeviceType();
        this.printSettings = this.getPrintSettings();
    }

    /**
     * Detect the type of device being used
     */
    detectDeviceType() {
        const width = window.innerWidth;
        const userAgent = navigator.userAgent.toLowerCase();

        // Check for mobile devices
        const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);

        if (width <= 320) return 'thermal'; // Thermal printer width
        if (width <= 480) return 'mobile';
        if (width <= 768) return 'tablet';
        if (isMobile && width <= 1024) return 'mobile-landscape';
        return 'desktop';
    }

    /**
     * Get optimized print settings based on device type
     */
    getPrintSettings() {
        const settings = {
            thermal: {
                pageSize: '58mm 200mm',
                margin: '2mm',
                fontSize: '6px',
                lineHeight: '1.1',
                hideColumns: ['tax', 'discount'], // Hide complex columns
                maxItems: 20,
                qrSize: '20mm'
            },
            mobile: {
                pageSize: 'A4 portrait',
                margin: '5mm',
                fontSize: '8px',
                lineHeight: '1.2',
                hideColumns: [],
                maxItems: 50,
                qrSize: '15mm'
            },
            tablet: {
                pageSize: 'A4 portrait',
                margin: '8mm',
                fontSize: '9px',
                lineHeight: '1.3',
                hideColumns: [],
                maxItems: 60,
                qrSize: '20mm'
            },
            'mobile-landscape': {
                pageSize: 'A4 landscape',
                margin: '8mm',
                fontSize: '8px',
                lineHeight: '1.2',
                hideColumns: [],
                maxItems: 40,
                qrSize: '18mm'
            },
            desktop: {
                pageSize: 'A4 portrait',
                margin: '10mm',
                fontSize: '10px',
                lineHeight: '1.4',
                hideColumns: [],
                maxItems: 100,
                qrSize: '25mm'
            }
        };

        return settings[this.deviceType] || settings.desktop;
    }

    /**
     * Apply device-specific CSS classes for optimized printing
     */
    optimizeForPrint() {
        const body = document.body;

        // Remove existing print classes
        body.classList.remove('print-thermal', 'print-mobile', 'print-tablet', 'print-desktop', 'print-mobile-landscape');

        // Add appropriate class
        body.classList.add(`print-${this.deviceType}`);

        // Apply dynamic styles
        this.applyDynamicStyles();

        console.log(`Print optimized for: ${this.deviceType}`);
        return this.printSettings;
    }

    /**
     * Apply dynamic styles based on device capabilities
     */
    applyDynamicStyles() {
        const style = document.createElement('style');
        style.id = 'dynamic-print-styles';

        // Remove existing dynamic styles
        const existing = document.getElementById('dynamic-print-styles');
        if (existing) existing.remove();

        const css = `
      @media print {
        body.print-${this.deviceType} {
          font-size: ${this.printSettings.fontSize} !important;
          line-height: ${this.printSettings.lineHeight} !important;
        }
        
        body.print-${this.deviceType} .qr-code {
          width: ${this.printSettings.qrSize} !important;
          height: ${this.printSettings.qrSize} !important;
        }
        
        @page {
          size: ${this.printSettings.pageSize};
          margin: ${this.printSettings.margin};
        }
      }
    `;

        style.textContent = css;
        document.head.appendChild(style);
    }

    /**
     * Hide columns that are not suitable for the current device
     */
    hideUnsuitableColumns() {
        const hideColumns = this.printSettings.hideColumns;

        hideColumns.forEach(columnClass => {
            const elements = document.querySelectorAll(`.${columnClass}-column`);
            elements.forEach(el => {
                el.classList.add('print-hide');
            });
        });
    }

    /**
     * Show print preview with device-specific optimization
     */
    showPrintPreview() {
        this.optimizeForPrint();
        this.hideUnsuitableColumns();

        // Create preview modal
        const previewModal = this.createPreviewModal();
        document.body.appendChild(previewModal);

        return new Promise((resolve, reject) => {
            const printBtn = previewModal.querySelector('.print-confirm');
            const cancelBtn = previewModal.querySelector('.print-cancel');

            printBtn.onclick = () => {
                document.body.removeChild(previewModal);
                this.executePrint();
                resolve(true);
            };

            cancelBtn.onclick = () => {
                document.body.removeChild(previewModal);
                resolve(false);
            };
        });
    }

    /**
     * Create print preview modal
     */
    createPreviewModal() {
        const modal = document.createElement('div');
        modal.className = 'print-preview-modal no-print';
        modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;

        modal.innerHTML = `
      <div style="background: white; padding: 20px; border-radius: 8px; max-width: 400px; text-align: center;">
        <h3>Print Preview</h3>
        <p>Optimized for: <strong>${this.deviceType}</strong></p>
        <p>Page Size: ${this.printSettings.pageSize}</p>
        <p>Font Size: ${this.printSettings.fontSize}</p>
        <div style="margin-top: 20px;">
          <button class="print-confirm" style="background: #4CAF50; color: white; padding: 10px 20px; margin: 5px; border: none; border-radius: 4px; cursor: pointer;">
            Print Now
          </button>
          <button class="print-cancel" style="background: #f44336; color: white; padding: 10px 20px; margin: 5px; border: none; border-radius: 4px; cursor: pointer;">
            Cancel
          </button>
        </div>
      </div>
    `;

        return modal;
    }

    /**
     * Execute the actual print
     */
    executePrint() {
        // Apply final optimizations
        this.optimizeForPrint();
        this.hideUnsuitableColumns();

        // Add print event listeners
        const beforePrint = () => {
            console.log(`Starting print process for ${this.deviceType}`);
        };

        const afterPrint = () => {
            console.log(`Print process completed for ${this.deviceType}`);
            // Clean up print-specific classes
            document.body.classList.remove(`print-${this.deviceType}`);
        };

        window.addEventListener('beforeprint', beforePrint);
        window.addEventListener('afterprint', afterPrint);

        // Trigger print
        window.print();

        // Clean up event listeners
        setTimeout(() => {
            window.removeEventListener('beforeprint', beforePrint);
            window.removeEventListener('afterprint', afterPrint);
        }, 1000);
    }

    /**
     * Get device capabilities for advanced optimization
     */
    getDeviceCapabilities() {
        return {
            deviceType: this.deviceType,
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            pixelRatio: window.devicePixelRatio || 1,
            printSettings: this.printSettings,
            supportedFormats: this.getSupportedFormats()
        };
    }

    /**
     * Get supported print formats for the current device
     */
    getSupportedFormats() {
        const formats = ['A4'];

        if (this.deviceType === 'thermal') {
            formats.push('58mm', '80mm');
        }

        if (this.deviceType !== 'mobile') {
            formats.push('A3', 'Letter');
        }

        return formats;
    }

    /**
     * Static method to quickly optimize and print
     */
    static quickPrint() {
        const optimizer = new PrintOptimizer();
        return optimizer.showPrintPreview();
    }

    /**
     * Static method to get device info
     */
    static getDeviceInfo() {
        const optimizer = new PrintOptimizer();
        return optimizer.getDeviceCapabilities();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PrintOptimizer;
}

// Global access for browser usage
if (typeof window !== 'undefined') {
    window.PrintOptimizer = PrintOptimizer;
}

// Usage examples:
/*
// Basic usage
const printOptimizer = new PrintOptimizer();
printOptimizer.showPrintPreview();

// Quick print
PrintOptimizer.quickPrint();

// Get device info
const deviceInfo = PrintOptimizer.getDeviceInfo();
console.log('Device capabilities:', deviceInfo);

// Manual optimization
const optimizer = new PrintOptimizer();
optimizer.optimizeForPrint();
window.print();
*/
