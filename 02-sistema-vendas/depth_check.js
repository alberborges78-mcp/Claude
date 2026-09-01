const fs = require('fs');
const lines = fs.readFileSync('C:/Users/Alecrim/Claude/02-sistema-vendas/script.js', 'utf8').split(/\r?\n/);
let depth = 0;
let out = [];
for (let i = 1459; i < 1740; i++) {
  const line = lines[i] || '';
  for (const ch of line) {
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
  }
  out.push((i + 1) + ' d=' + depth + ' | ' + line);
}
fs.writeFileSync('C:/Users/Alecrim/Claude/02-sistema-vendas/depth_out.txt', out.join('\n'));
console.log('done');
