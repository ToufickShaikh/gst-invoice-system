# Bill PDF Generator

## Overview
The Bill PDF Generator is a Node.js application that allows users to generate PDF bills from HTML templates. This project provides a simple interface for creating and saving PDF documents based on bill data.

## Features
- Generate PDF bills from a predefined HTML template.
- Save generated PDFs to a specified location.
- Easy integration with other applications.

## Project Structure
```
bill-pdf-generator
├── src
│   ├── index.ts               # Entry point of the application
│   ├── generator.ts           # PDF generation logic
│   ├── templates              # HTML templates for bills
│   │   └── bill.template.html  # Bill HTML template
│   └── types                  # Type definitions
│       └── bill.ts            # Bill data structure
├── package.json               # NPM configuration
├── tsconfig.json              # TypeScript configuration
└── README.md                  # Project documentation
```

## Installation
To install the necessary dependencies, run the following command:

```
npm install
```

## Usage
To generate a PDF bill, you can use the `PDFGenerator` class from the `generator.ts` file. Here is a basic example:

```typescript
import { PDFGenerator } from './generator';
import { Bill } from './types/bill';

const billData: Bill = {
    id: '12345',
    amount: 250.00,
    date: '2023-10-01',
    customerName: 'John Doe'
};

const pdfGenerator = new PDFGenerator();
pdfGenerator.generatePDF(billData);
pdfGenerator.savePDF('path/to/save/bill.pdf');
```

## Contributing
Contributions are welcome! Please feel free to submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for more details.