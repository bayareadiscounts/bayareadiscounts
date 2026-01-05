const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const DATA_DIR = path.join(__dirname, '../src/data');
const NON_PROGRAM_FILES = ['cities.yml', 'groups.yml', 'zipcodes.yml', 'suppressed.yml'];

const categoryFiles = fs.readdirSync(DATA_DIR)
  .filter(f => f.endsWith('.yml') && !NON_PROGRAM_FILES.includes(f));

let totalMapLinks = 0;
let validCoords = 0;

categoryFiles.forEach(file => {
  const content = fs.readFileSync(path.join(DATA_DIR, file), 'utf8');
  const programs = yaml.load(content) || [];
  const withMapLink = programs.filter(p => p.map_link);

  withMapLink.forEach(p => {
    const match = p.map_link.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (match) {
      validCoords++;
    } else {
      console.log('FAILED:', p.map_link);
    }
  });

  if (withMapLink.length > 0) {
    console.log(file + ': ' + withMapLink.length + ' map_links');
  }
  totalMapLinks += withMapLink.length;
});

console.log('Total map_links: ' + totalMapLinks);
console.log('Valid coordinates: ' + validCoords);
