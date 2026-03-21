const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

const patches = [
  {
    file: path.join(rootDir, 'node_modules', 'js-md4', 'src', 'md4.js'),
    replacements: [
      {
        from: "return crypto.createHash('md4').update(new Buffer(message)).digest('hex');",
        to: "return crypto.createHash('md4').update(Buffer.from(message)).digest('hex');",
      },
    ],
  },
  {
    file: path.join(rootDir, 'node_modules', 'wkx', 'lib', 'binarywriter.js'),
    replacements: [
      {
        from: '    this.buffer = new Buffer(size);',
        to: '    this.buffer = Buffer.allocUnsafe(size);',
      },
      {
        from: '            var tempBuffer = new Buffer(this.position + size);',
        to: '            var tempBuffer = Buffer.allocUnsafe(this.position + size);',
      },
    ],
  },
];

let touchedFiles = 0;

for (const patch of patches) {
  if (!fs.existsSync(patch.file)) {
    continue;
  }

  let content = fs.readFileSync(patch.file, 'utf8');
  let changed = false;

  for (const replacement of patch.replacements) {
    if (!content.includes(replacement.from)) {
      continue;
    }

    content = content.replace(replacement.from, replacement.to);
    changed = true;
  }

  if (!changed) {
    continue;
  }

  fs.writeFileSync(patch.file, content, 'utf8');
  touchedFiles += 1;
  console.log(`Patched deprecated Buffer usage in ${path.relative(rootDir, patch.file)}`);
}

if (touchedFiles === 0) {
  console.log('No legacy Buffer constructor patches were needed.');
}
