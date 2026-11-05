// Stateful because terminal escape sequences can arrive across stream chunks.
export function terminalText() {
  let state = 'text';
  return chunk => {
    let output = '';
    for (const char of String(chunk)) {
      if (state === 'escape') { state = char === '[' ? 'csi' : char === ']' ? 'osc' : 'text'; continue; }
      if (state === 'csi') { if (char >= '@' && char <= '~') state = 'text'; continue; }
      if (state === 'osc') { if (char === '\x07') state = 'text'; else if (char === '\x1b') state = 'oscEscape'; continue; }
      if (state === 'oscEscape') { state = char === '\\' ? 'text' : 'osc'; continue; }
      if (char === '\x1b') state = 'escape';
      else if (char === '\n' || char === '\t' || char >= ' ') output += char;
    }
    return output;
  };
}
export async function withDeadline(promise, ms, message, onTimeout = () => {}) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => { onTimeout(); reject(new Error(message)); }, ms);
    })]);
  } finally { clearTimeout(timer); }
}
