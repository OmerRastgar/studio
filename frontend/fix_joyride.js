const fs = require('fs');
const path = require('path');

const filePath = path.join('node_modules', 'react-joyride', 'dist', 'index.mjs');
console.log(`Patching ${filePath}...`);

if (!fs.existsSync(filePath)) {
    console.error('File not found!');
    process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// 1. Patch renderReact16 to prevent duplicate createRoot checks
// Check if already patched
if (!content.includes('if (!this.rootNode) { this.rootNode = createRoot(this.node); }')) {
    const originalRender = 'this.rootNode = createRoot(this.node);';
    const patchedRender = 'if (!this.rootNode) { this.rootNode = createRoot(this.node); }';

    if (content.includes(originalRender)) {
        content = content.replace(originalRender, patchedRender);
        console.log('Applied createRoot check patch.');
    } else {
        console.warn('Could not find original createRoot line. It might be different or already matched.');
        // Fallback: check if the pattern is close
    }
} else {
    console.log('createRoot check patch already present.');
}

// 2. Patch componentWillUnmount to unmount the root
// Looking for: componentWillUnmount() {
const cwuStart = 'componentWillUnmount() {';
const cwuPatch = `componentWillUnmount() {
    if (this.rootNode) {
      try {
        this.rootNode.unmount();
      } catch (e) {
        console.warn('Failed to unmount Joyride root:', e);
      }
      this.rootNode = null;
    }
`;

if (!content.includes('this.rootNode.unmount();')) {
    if (content.includes(cwuStart)) {
        content = content.replace(cwuStart, cwuPatch);
        console.log('Applied componentWillUnmount unmount patch.');
    } else {
        console.error('Could not find componentWillUnmount.');
    }
} else {
    console.log('componentWillUnmount patch already present.');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Patch complete.');
