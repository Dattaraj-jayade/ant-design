import '@testing-library/jest-dom';

import { toHaveNoViolations } from 'jest-axe';
import format, { plugins } from 'pretty-format';

import { defaultConfig } from '../components/theme/internal';

// Not use dynamic hashed for test env since version will change hash dynamically.
defaultConfig.hashed = false;

if (process.env.LIB_DIR === 'dist') {
  jest.mock('antd', () => jest.requireActual('../dist/antd'));
} else if (process.env.LIB_DIR === 'dist-min') {
  jest.mock('antd', () => jest.requireActual('../dist/antd.min'));
} else if (process.env.LIB_DIR === 'es') {
  jest.mock('antd', () => jest.requireActual('../es'));
  jest.mock('../es/theme/internal', () => {
    const esTheme = jest.requireActual('../es/theme/internal');
    if (esTheme.defaultConfig) {
      esTheme.defaultConfig.hashed = false;
    }

    return esTheme;
  });
}

function cleanup(node: HTMLElement) {
  const childList = Array.from(node.childNodes);
  node.innerHTML = '';
  childList.forEach((child) => {
    if (!(child instanceof Text)) {
      node.appendChild(cleanup(child as any));
    } else if (child.textContent) {
      node.appendChild(child);
    }
  });
  return node;
}

function formatHTML(nodes: any) {
  let cloneNodes: any;
  if (Array.isArray(nodes) || nodes instanceof HTMLCollection || nodes instanceof NodeList) {
    cloneNodes = Array.from(nodes).map((node) => cleanup(node.cloneNode(true) as any));
  } else {
    cloneNodes = cleanup(nodes.cloneNode(true));
  }

  const htmlContent = format(cloneNodes, {
    plugins: [plugins.DOMCollection, plugins.DOMElement],
  });

  const filtered = htmlContent
    .split(/[\n\r]+/)
    .filter((line) => line.trim())
    .map((line) => line.replace(/\s+$/, ''))
    .join('\n');

  return filtered;
}

/**
 * React 17 & 18 will have different behavior in some special cases:
 *
 * React 17:
 *
 * ```html
 * <span> Hello World </span>
 * ```
 *
 * React 18:
 *
 * ```html
 * <span> Hello World </span>
 * ```
 *
 * These diff is nothing important in front end but will break in snapshot diff.
 */
expect.addSnapshotSerializer({
  test: (element) =>
    typeof HTMLElement !== 'undefined' &&
    (element instanceof HTMLElement ||
      element instanceof DocumentFragment ||
      element instanceof HTMLCollection ||
      (Array.isArray(element) && element[0] instanceof HTMLElement)),
  print: (element) => formatHTML(element),
});

/** Demo Test only accept render as SSR to make sure align with both `server` & `client` side */
expect.addSnapshotSerializer({
  test: () => true,
  print: (element) => {
    const htmlContent = format(element, { plugins: [plugins.DOMElement] });
    const filtered = htmlContent
      .split('\n')
      .filter((line) => line.trim())
      .join('\n');
    return filtered;
  },
});

expect.extend(toHaveNoViolations);
