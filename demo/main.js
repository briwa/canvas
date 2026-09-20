const DEMOS = {
  scene: () => import('./scene.js'),
  input: () => import('./input.js'),
  perf: () => import('./perf.js'),
};

const tabs = [...document.querySelectorAll('nav [data-demo]')];
const sections = new Map(
  [...document.querySelectorAll('section[data-demo]')].map((el) => [el.dataset.demo, el]),
);

let current = null;
let stop = null;
let token = 0;

function pick(hash) {
  const name = hash.slice(1);

  return Object.hasOwn(DEMOS, name) ? name : 'scene';
}

async function show(name) {
  if (name === current) return;

  stop?.();
  stop = null;
  current = name;

  const id = ++token;

  for (const tab of tabs) {
    if (tab.dataset.demo === name) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  }

  for (const [key, section] of sections) {
    section.hidden = key !== name;
  }

  const module = await DEMOS[name]();
  if (id !== token) return;

  stop = module.start(sections.get(name)) ?? null;
}

for (const tab of tabs) {
  tab.addEventListener('click', () => {
    location.hash = tab.dataset.demo;
    show(tab.dataset.demo);
  });
}

window.addEventListener('hashchange', () => show(pick(location.hash)));

show(pick(location.hash));
