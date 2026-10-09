import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { parseMeta } from '@briwa.dev/sandbox';
import { remarkSandbox, remarkStripHtml, sandboxMarkdownPlugins } from '@briwa.dev/sandbox/remark';
import { highlightCode } from './highlight.js';

const LOCAL = 'canvas-local-build';

function kind(node) {
  return node.type === 'code' ? parseMeta(node.lang, node.meta)?.kind : undefined;
}

function isLibrary(node) {
  return kind(node) === 'external' && node.value.includes('@briwa.dev/canvas');
}

function remarkLocalLibrary({ bundle }) {
  return async (tree) => {
    const index = bundle ? tree.children.findIndex(isLibrary) : -1;
    if (index < 0) return;

    const shown = { type: 'root', children: [tree.children[index]] };
    await remarkSandbox()(shown);

    tree.children.splice(index, 1, shown.children[0], {
      type: 'code',
      lang: 'js',
      meta: `sandbox label=${LOCAL}`,
      value: bundle,
    });
  };
}

function remarkDefaultControl({ control }) {
  return (tree) => {
    for (const node of tree.children) {
      if (kind(node) === 'figure' && !/(^|\s)control=/.test(node.meta ?? '')) node.meta = `${node.meta ?? ''} control=${control}`;
    }
  };
}

function remarkHideLocalLibrary() {
  return (tree) => {
    tree.children = tree.children.filter(
      (node) => !(node.type === 'html' && node.value.includes(`>${LOCAL}<`)),
    );
  };
}

export function createRenderer({ bundle, control = 'autoplay' } = {}) {
  const { remarkPlugins, rehypePlugins } = sandboxMarkdownPlugins({ highlight: highlightCode });

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkStripHtml)
    .use(remarkLocalLibrary, { bundle })
    .use(remarkDefaultControl, { control })
    .use(remarkPlugins.filter((plugin) => plugin !== remarkStripHtml))
    .use(remarkHideLocalLibrary)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypePlugins)
    .use(rehypeStringify, { allowDangerousHtml: true });

  return async (markdown) => String(await processor.process(markdown));
}
