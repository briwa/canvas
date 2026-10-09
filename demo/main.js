import '@briwa.dev/sandbox/styles';
import './demo.css';

import { mountFigures } from '@briwa.dev/sandbox/client';

import pages from 'virtual:canvas-pages';

mountFigures();

const links = [...document.querySelectorAll('nav [data-page]')];
const rendered = new Set();

function pick(hash) {
  const name = hash.slice(1);

  return Object.hasOwn(pages, name) ? name : 'getting-started';
}

async function show(name) {
  for (const link of links) {
    if (link.dataset.page === name) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }

  for (const section of document.querySelectorAll('section[data-page]')) {
    section.hidden = section.dataset.page !== name;
  }

  if (rendered.has(name)) return;
  rendered.add(name);

  const section = document.querySelector(`section[data-page="${name}"]`);
  section.innerHTML = (await pages[name]()).default;
}

window.addEventListener('hashchange', () => show(pick(location.hash)));

show(pick(location.hash));
