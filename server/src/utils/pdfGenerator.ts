import PDFDocument from 'pdfkit';
import { Response } from 'express';

export const generatePayslipPDF = (employee: any, payroll: any, res: Response) => {
    const doc = new PDFDocument({ margin: 50 });

    // Stream the PDF to the response
    doc.pipe(res);

    // Header
    doc.fillColor("#444444")
       .fontSize(20)
       .text("PAYSLIP", { align: "center", underline: true })
       .moveDown();

    // Company Info
    doc.fontSize(10)
       .text("Unified Employee Management System", { align: "right" })
       .text("Corporate Office, Bangalore", { align: "right" })
       .text("Karnataka, India", { align: "right" })
       .moveDown();

    doc.moveTo(50, 110).lineTo(550, 110).stroke();

    // Employee & Payroll Info
    doc.moveDown();
    const infoY = 130;
    doc.fontSize(10)
       .font("Helvetica-Bold").text("Employee Name:", 50, infoY)
       .font("Helvetica").text(employee.name, 150, infoY)
       .font("Helvetica-Bold").text("Employee ID:", 50, infoY + 20)
       .font("Helvetica").text(employee.id, 150, infoY + 20)
       .font("Helvetica-Bold").text("Department:", 50, infoY + 40)
       .font("Helvetica").text(employee.department, 150, infoY + 40);

    doc.font("Helvetica-Bold").text("Month/Year:", 350, infoY)
       .font("Helvetica").text(`${payroll.month}/${payroll.year}`, 450, infoY)
       .font("Helvetica-Bold").text("Bank Account:", 350, infoY + 20)
       .font("Helvetica").text(payroll.bank_account || "N/A", 450, infoY + 20)
       .font("Helvetica-Bold").text("Tax Regime:", 350, infoY + 40)
       .font("Helvetica").text(payroll.tax_regime || "New", 450, infoY + 40);

    doc.moveDown(3);
    
    // Earnings & Deductions Table
    const tableTop = 230;
    doc.font("Helvetica-Bold");
    doc.text("EARNINGS", 50, tableTop);
    doc.text("AMOUNT", 250, tableTop);
    doc.text("DEDUCTIONS", 350, tableTop);
    doc.text("AMOUNT", 500, tableTop);
    
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    
    doc.font("Helvetica");
    let rowY = tableTop + 30;
    
    // Row 1
    doc.text("Basic Salary", 50, rowY).text(String(payroll.basic_salary), 250, rowY);
    doc.text("Income Tax (TDS)", 350, rowY).text(String(payroll.tds || 0), 500, rowY);
    rowY += 20;

    // Row 2
    doc.text("HRA", 50, rowY).text(String(payroll.hra), 250, rowY);
    doc.text("Provident Fund (PF)", 350, rowY).text(String(payroll.pf_employee || 0), 500, rowY);
    rowY += 20;

    // Row 3
    doc.text("Allowances", 50, rowY).text(String(payroll.allowances), 250, rowY);
    doc.text("Professional Tax", 350, rowY).text(String(payroll.professional_tax || 0), 500, rowY);
    rowY += 20;

    // Row 4
    if (payroll.bonus) {
        doc.text("Bonus", 50, rowY).text(String(payroll.bonus), 250, rowY);
        rowY += 20;
    }

    doc.moveTo(50, rowY + 10).lineTo(550, rowY + 10).stroke();
    rowY += 25;

    // Totals
    doc.font("Helvetica-Bold");
    doc.text("Gross Earnings:", 50, rowY).text(String(payroll.gross_salary || 0), 250, rowY);
    doc.text("Total Deductions:", 350, rowY).text(String(payroll.total_deductions || 0), 500, rowY);
    
    rowY += 40;
    doc.fontSize(14).text("NET SALARY:", 50, rowY);
    doc.fontSize(14).fillColor("#0000CC").text(`INR ${payroll.net_salary}`, 150, rowY);

    // Footer
    doc.moveDown(4);
    doc.fontSize(8).fillColor("#999999").text("This is a computer generated document and does not require a signature.", { align: "center" });

    doc.end();
};

export const getPayslipPDFBuffer = (employee: any, payroll: any): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: any[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // PDF Generation Logic (Same as above)
        doc.fillColor("#444444").fontSize(20).text("PAYSLIP", { align: "center", underline: true }).moveDown();
        doc.fontSize(10).text("Unified Employee Management System", { align: "right" }).text("Corporate Office, Bangalore", { align: "right" }).text("Karnataka, India", { align: "right" }).moveDown();
        doc.moveTo(50, 110).lineTo(550, 110).stroke();
        doc.moveDown();
        const infoY = 130;
        doc.fontSize(10)
           .font("Helvetica-Bold").text("Employee Name:", 50, infoY)
           .font("Helvetica").text(employee.name, 150, infoY)
           .font("Helvetica-Bold").text("Employee ID:", 50, infoY + 20)
           .font("Helvetica").text(employee.id, 150, infoY + 20)
           .font("Helvetica-Bold").text("Department:", 50, infoY + 40)
           .font("Helvetica").text(employee.department, 150, infoY + 40);

        doc.font("Helvetica-Bold").text("Month/Year:", 350, infoY)
           .font("Helvetica").text(`${payroll.month}/${payroll.year}`, 450, infoY)
           .font("Helvetica-Bold").text("Bank Account:", 350, infoY + 20)
           .font("Helvetica").text(payroll.bank_account || "N/A", 450, infoY + 20)
           .font("Helvetica-Bold").text("Tax Regime:", 350, infoY + 40)
           .font("Helvetica").text(payroll.tax_regime || "New", 450, infoY + 40);

        doc.moveDown(3);
        const tableTop = 230;
        doc.font("Helvetica-Bold").text("EARNINGS", 50, tableTop).text("AMOUNT", 250, tableTop).text("DEDUCTIONS", 350, tableTop).text("AMOUNT", 500, tableTop);
        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
        doc.font("Helvetica");
        let rowY = tableTop + 30;
        doc.text("Basic Salary", 50, rowY).text(String(payroll.basic_salary), 250, rowY);
        doc.text("Income Tax (TDS)", 350, rowY).text(String(payroll.tds || 0), 500, rowY);
        rowY += 20;
        doc.text("HRA", 50, rowY).text(String(payroll.hra), 250, rowY);
        doc.text("Provident Fund (PF)", 350, rowY).text(String(payroll.pf_employee || 0), 500, rowY);
        rowY += 20;
        doc.text("Allowances", 50, rowY).text(String(payroll.allowances), 250, rowY);
        doc.text("Professional Tax", 350, rowY).text(String(payroll.professional_tax || 0), 500, rowY);
        rowY += 20;
        doc.moveTo(50, rowY + 10).lineTo(550, rowY + 10).stroke();
        rowY += 25;
        doc.font("Helvetica-Bold").text("Gross Earnings:", 50, rowY).text(String(payroll.gross_salary || 0), 250, rowY);
        doc.text("Total Deductions:", 350, rowY).text(String(payroll.total_deductions || 0), 500, rowY);
        rowY += 40;
        doc.fontSize(14).text("NET SALARY:", 50, rowY);
        doc.fontSize(14).fillColor("#0000CC").text(`INR ${payroll.net_salary}`, 150, rowY);
        doc.moveDown(4);
        doc.fontSize(8).fillColor("#999999").text("This is a computer generated document and does not require a signature.", { align: "center" });

        doc.end();
    });
};

