/**
 * Helper utilities for Code & JSON Detection & Formatting
 */

export function isJSONString(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();
  if (!((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']')))) {
    return false;
  }
  try {
    const parsed = JSON.parse(trimmed);
    return typeof parsed === 'object' && parsed !== null;
  } catch (e) {
    return false;
  }
}

export function formatJSON(str: string): string {
  try {
    const parsed = JSON.parse(str.trim());
    return JSON.stringify(parsed, null, 2);
  } catch (e) {
    return str;
  }
}

export function isCodeSnippet(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  if (isJSONString(str)) return true;

  const codeKeywords = [
    'const ', 'let ', 'var ', 'function', 'import ', 'export ', 'class ', 'def ', 'public ', 'private ',
    'return ', 'interface ', 'type ', 'async ', 'await ', 'if (', 'for (', 'while (', '=>', 'console.log',
    '<html>', '<div', '<script', 'SELECT ', 'INSERT ', 'UPDATE ', 'DELETE ', 'FROM ', 'WHERE '
  ];

  const hasKeywords = codeKeywords.some((kw) => str.includes(kw));
  const hasBrackets = (str.includes('{') && str.includes('}')) || (str.includes('(') && str.includes(')')) || (str.includes(';') && str.includes('\n'));

  return hasKeywords || (str.includes('\n') && hasBrackets);
}

export function detectLanguage(str: string): string {
  if (isJSONString(str)) return 'json';
  if (str.includes('import ') || str.includes('const ') || str.includes('function') || str.includes('=>')) return 'javascript/typescript';
  if (str.includes('def ') || str.includes('import os') || str.includes('print(')) return 'python';
  if (str.includes('<html>') || str.includes('<div') || str.includes('</')) return 'html';
  if (str.includes('SELECT ') || str.includes('FROM ') || str.includes('WHERE ')) return 'sql';
  if (str.includes('#!/bin/') || str.includes('echo ') || str.includes('npm ')) return 'bash/shell';
  return 'code';
}
