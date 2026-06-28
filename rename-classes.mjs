import fs from 'fs';
import path from 'path';

const map = {
  'bg-canvas': 'bg-background',
  'bg-surface': 'bg-card',
  'bg-surface-hover': 'bg-muted',
  'text-text-primary': 'text-foreground',
  'text-text-secondary': 'text-muted-foreground',
  'text-text-muted': 'text-muted-foreground',
  'border-surface-hover': 'border-border',
  'bg-accent': 'bg-primary',
  'text-accent': 'text-primary',
  'border-accent': 'border-primary',
  'accent-accent': 'accent-primary'
};

function processDir(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      processDir(full);
    } else if (full.endsWith('.astro') || full.endsWith('.ts') || full.endsWith('.css')) {
      let content = fs.readFileSync(full, 'utf8');
      for (const [k, v] of Object.entries(map)) {
        content = content.replace(new RegExp(k, 'g'), v);
      }
      fs.writeFileSync(full, content);
    }
  }
}

processDir('src');
