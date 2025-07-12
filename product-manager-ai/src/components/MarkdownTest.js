import React from 'react';
import MarkdownRenderer from './MarkdownRenderer';

const MarkdownTest = () => {
  const sampleMarkdown = `# Sample Markdown Content

This is a **bold text** and this is *italic text*.

## Features

- **Headers**: Multiple levels supported
- **Lists**: Both ordered and unordered
- **Code**: Inline \`code\` and code blocks
- **Links**: [Example link](https://example.com)
- **Tables**: Full table support

### Code Example

\`\`\`javascript
function hello() {
  console.log("Hello, Markdown!");
}
\`\`\`

### Table Example

| Feature | Support | Notes |
|---------|---------|-------|
| Headers | ✅ | All levels |
| Lists | ✅ | Nested too |
| Code | ✅ | Syntax highlighting |
| Tables | ✅ | Full support |

### Blockquote

> This is a blockquote with some important information.

---

### Ordered List

1. First item
2. Second item
3. Third item

### Mixed Content

You can mix **bold**, *italic*, and \`code\` in the same paragraph.

[Learn more about Markdown](https://www.markdownguide.org/)
`;

  return (
    <div className="p-6 bg-slate-900 rounded-lg">
      <h2 className="text-xl font-bold text-white mb-4">Markdown Rendering Test</h2>
      <MarkdownRenderer content={sampleMarkdown} />
    </div>
  );
};

export default MarkdownTest; 