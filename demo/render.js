import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { remarkSandbox, remarkStripHtml } from '@briwa.dev/sandbox/remark';
import { highlightCode } from '@briwa.dev/sandbox/editor';

const LOCAL = 'canvas-local-build';

function isLibrary(node) {
  return node.type === 'code' && node.lang === 'sandbox=external' && node.value.includes('@briwa.dev/canvas');
}

function remarkLocalLibrary({ bundle }) {
  return async (tree) => {
    const index = bundle ? tree.children.findIndex(isLibrary) : -1;
    if (index < 0) return;

    const shown = { type: 'root', children: [tree.children[index]] };
    await remarkSandbox()(shown);

    tree.children.splice(index, 1, shown.children[0], {
      type: 'code',
      lang: 'sandbox=js',
      meta: `label=${LOCAL}`,
      value: bundle,
    });
  };
}

function remarkDefaultControl({ control }) {
  return (tree) => {
    for (const node of tree.children) {
      const figure = node.type === 'code' && node.lang?.startsWith('sandbox=') && /(^|\s)viz(=|\s|$)/.test(node.meta ?? '');

      if (figure && !/(^|\s)control=/.test(node.meta)) node.meta = `${node.meta} control=${control}`;
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
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkStripHtml)
    .use(remarkLocalLibrary, { bundle })
    .use(remarkDefaultControl, { control })
    .use(remarkSandbox, { highlight: highlightCode })
    .use(remarkHideLocalLibrary)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true });

  return async (markdown) => String(await processor.process(markdown));
}
