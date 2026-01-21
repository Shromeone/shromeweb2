import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

let cangjieMap = null;

function loadCangjieMap() {
  if (cangjieMap) return cangjieMap;
  console.log("trying to fetch...");
  const filePath = path.resolve('src/lib/data/cangjie.3-base.dict.yaml');
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const data = yaml.load(fileContents);

  cangjieMap = {};
  for (const [code, chars] of Object.entries(data)) {
    if (Array.isArray(chars)) {
      for (const char of chars) {
        cangjieMap[char] = code;
      }
    } else {
      cangjieMap[chars] = code;
    }
  }

  return cangjieMap;
}

export async function GET({ params }) {
  const { char } = params;
  const map = loadCangjieMap();
  const code = map[char];

  if (code) {
    return new Response(JSON.stringify({ code }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } else {
    return new Response(JSON.stringify({ error: 'Character not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
