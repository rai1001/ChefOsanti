import Papa from 'papaparse'

// Simple wrapper around Papaparse
export function parseCSV(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length > 0) {
                    // Basic format errors
                    // reject(new Error('Formato CSV inválido: ' + results.errors[0].message))
                    // Or just proceed with what we have? Better to resolve with data.
                    // IMPORTANT: We trust the parser's best effort, validation happens on server.
                }
                // Normalize headers to lowercase to help matching
                const data = results.data.map((row: any) => {
                    const newRow: any = {};
                    Object.keys(row).forEach(key => {
                        newRow[key.trim().toLowerCase()] = row[key];
                    });
                    return newRow;
                });
                resolve(data);
            },
            error: (error) => {
                reject(error);
            }
        })
    })
}
