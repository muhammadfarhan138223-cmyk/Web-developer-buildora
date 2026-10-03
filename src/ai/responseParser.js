/**
 * Response parser — extracts file operations from AI responses.
 *
 * Supports:
 *   ```file:path/to/file.ext\n<content>\n```
 *   ```delete:path/to/file.ext\n```
 */

export function parseAIResponse(content) {
  const operations = []
  const summaryMatch = content.match(/##\s*Summary\s*([\s\S]*)$/i)
  const summary = summaryMatch ? summaryMatch[1].trim() : ''

  // Extract file operations
  const fileRegex = /```file:([^\s`]+)(?:\r?\n|[ \t]+)([\s\S]*?)```/g
  let match
  while ((match = fileRegex.exec(content)) !== null) {
    const path = match[1].trim()
    const fileContent = match[2]
    operations.push({ type: 'write', path, content: fileContent })
  }

  // Extract deletions
  const deleteRegex = /```delete:(.+?)```/g
  while ((match = deleteRegex.exec(content)) !== null) {
    const path = match[1].trim()
    operations.push({ type: 'delete', path })
  }

  // Extract the conversational text (everything outside code blocks)
  let textContent = content
    .replace(/```file:[\s\S]*?```/g, '')
    .replace(/```delete:[\s\S]*?```/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .trim()

  // Remove the summary section from text if present
  if (summary) {
    textContent = textContent.replace(/##\s*Summary\s*[\s\S]*$/i, '').trim()
  }

  return {
    operations,
    summary,
    text: textContent,
  }
}
