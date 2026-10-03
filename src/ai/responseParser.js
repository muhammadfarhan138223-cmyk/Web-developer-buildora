/**
 * Response parser — extracts file operations from AI responses.
 *
 * Supports:
 *   ```file:path/to/file.ext\n<content>\n```
 *   ```delete:path/to/file.ext\n```
 *
 * Tolerant of weaker models: a file block whose closing fence is missing is
 * NOT written (its content is unreliable) and is reported in `malformed`
 * so the UI can retry instead of silently showing the old preview.
 */

const OPENER = /```(file|delete):([^\s`]+)/g

export function parseAIResponse(content = '') {
  const operations = []
  const malformed = []
  const opens = [...content.matchAll(OPENER)]
  let textContent = ''
  let cursor = 0

  for (let i = 0; i < opens.length; i += 1) {
    const open = opens[i]
    const kind = open[1]
    const path = open[2].trim()
    const bodyStart = open.index + open[0].length
    const nextOpenAt = i + 1 < opens.length ? opens[i + 1].index : content.length

    // Prose before this block
    textContent += content.slice(cursor, open.index)

    const closeAt = content.indexOf('```', bodyStart)
    const closed = closeAt !== -1 && closeAt < nextOpenAt

    if (closed) {
      if (kind === 'file') {
        const body = content.slice(bodyStart, closeAt).replace(/^[ \t]*\r?\n/, '')
        operations.push({ type: 'write', path, content: body })
      } else {
        operations.push({ type: 'delete', path })
      }
      cursor = closeAt + 3
    } else {
      // Unclosed block: drop it from the chat text and report it.
      if (kind === 'file') malformed.push(path)
      cursor = nextOpenAt
    }
  }
  textContent += content.slice(cursor)

  // Strip any other generic code fences from the chat text
  textContent = textContent.replace(/```[\s\S]*?```/g, '').trim()

  const summaryMatch = textContent.match(/##\s*Summary\s*([\s\S]*)$/i)
  const summary = summaryMatch ? summaryMatch[1].trim() : ''
  if (summary) textContent = textContent.replace(/##\s*Summary\s*[\s\S]*$/i, '').trim()

  return { operations, summary, text: textContent, malformed }
}
