#!/usr/bin/env node

import fs from 'fs';
import csv from 'csv-parser';
import { Readable } from 'stream';

/**
 * Converts a Google Sheet to JSON
 * Usage: node scripts/convert-sheet.js <sheet-url> [output-file]
 *
 * Sheet URL format: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit#gid=SHEET_GID
 * Or just the ID: SPREADSHEET_ID
 * Make sure the sheet is publicly viewable
 */

async function convertSheetToJson(sheetUrl = "https://docs.google.com/spreadsheets/d/1ThyasiEibcSzzE2N-64GR_O5DYE-_LHvPhFzvz_FLuk/edit?gid=0#gid=0", outputFile = 'src/routes/cangjie-practice/questions.json') {
  try {
    // Extract spreadsheet ID from URL
    let spreadsheetId = sheetUrl;
    if (sheetUrl.includes('docs.google.com')) {
      const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) {
        throw new Error('Invalid Google Sheets URL format');
      }
      spreadsheetId = match[1];
    }

    // Extract sheet GID if provided (default to 0)
    let gid = '0';
    if (sheetUrl.includes('gid=')) {
      const gidMatch = sheetUrl.match(/gid=(\d+)/);
      if (gidMatch) {
        gid = gidMatch[1];
      }
    }

    // Construct CSV export URL
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;

    console.log(`Fetching data from: ${csvUrl}`);

    // Fetch CSV data
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
    }

    const csvText = await response.text();

    // Parse CSV to JSON
    const results = [];
    const stream = Readable.from(csvText);

    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (data) => {
          // Clean and validate data
          const entry = {
            english: data.english?.trim() || '',
            chinese: data.chinese?.trim() || '',
            category: data.category?.trim() || ''
          };

          // Skip empty rows
          if (entry.english || entry.chinese || entry.category) {
            results.push(entry);
          }
        })
        .on('end', () => {
          resolve();
        })
        .on('error', (error) => {
          reject(error);
        });
    });

    // Write to JSON file
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`Converted ${results.length} entries to ${outputFile}`);

  } catch (error) {
    console.error('Error converting sheet:', error.message);
    process.exit(1);
  }
}

// CLI interface
const args = process.argv.slice(2);
if (args.length < 1 || args[0] === '--help' || args[0] === '-h') {
  console.log('Converts a Google Sheet to JSON format');
  console.log('');
  console.log('Usage: node scripts/convert-sheet.js <sheet-url> [output-file]');
  console.log('');
  console.log('Arguments:');
  console.log('  sheet-url    Google Sheet URL or ID (sheet must be publicly viewable)');
  console.log('  output-file  Output JSON file (default: questions.json)');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/convert-sheet.js https://docs.google.com/spreadsheets/d/1234567890/edit');
  console.log('  node scripts/convert-sheet.js 1234567890/edit#gid=0 custom-questions.json');
  console.log('');
  console.log('Note: Make sure your Google Sheet is shared with "Anyone with the link can view"');
  process.exit(0);
}

const sheetUrl = args[0];
const outputFile = args[1] || 'questions.json';

convertSheetToJson(sheetUrl, outputFile);
