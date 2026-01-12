
import XLSX from 'xlsx';
import fs from 'fs';

const filename = '2025-PREVISION PLANING M&E (2).xlsx';

try {
    if (!fs.existsSync(filename)) {
        console.error(`File ${filename} not found in current directory.`);
        process.exit(1);
    }
    const workbook = XLSX.readFile(filename);

    workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        // excessive logging but useful
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (json.length > 0) {
            console.log(`Sheet: ${sheetName}`);
            console.log('Row 1 (Headers?):', json[0]);
            console.log('Row 2:', json[1]);
        } else {
            console.log(`Sheet: ${sheetName} is empty.`);
        }
        console.log('-------------------');
    });

} catch (e) {
    console.error(e);
}
