# Conversation and paste-code update

Builder Chat now sends one conversational request instead of invoking the staged website agent. Normal greetings and questions use a conversational system prompt. BYOK conversations do not automatically retry or cycle models. Provider limits still apply; failures leave workspace files unchanged. Legacy build APIs remain available for compatibility but Builder no longer calls them.

Code answers use complete fenced source blocks with explicit relative filenames. Copy remains available. Review & apply files to Work stages those blocks; the existing confirmation applies only supplied file paths and preserves unrelated files. Unclosed fenced code blocks cannot be applied. Generation quality and instruction compliance depend on the selected provider/model; they are not guaranteed to match ChatGPT or Gemini.

Work has Paste code: frontend language detection produces filenames and arranges fenced multi-file responses. It replaces the local workspace only after the explicit Arrange & preview action, with previous files retained in the existing Undo action. Existing project imports/file editing remain available. New projects start with one empty index.html; existing workspaces are preserved. A React entry is detected behind an empty HTML root shell. Supported runtime packages remain React/React DOM; arbitrary dependencies and backend execution remain outside scope.

Conversations created through the new flow persist locally and can be renamed, pinned/unpinned and removed through their sidebar menu. These are browser-local chats, not a new cloud synchronization service. The old sidebar incorrectly listed individual prompts as conversations; that list has been replaced.

Validation: production + SSR build passed; all 52 tests passed, including four new conversation/code arrangement/detection tests. Live provider output was not tested with a real key. Browser UI verification was blocked by the browser URL security policy during this update; no workaround was attempted. No production deployment was performed. Landing page and unrelated page source was not edited.

Local check: http://127.0.0.1:3008/builder/chat and /builder/work . Reload once to load this version. The same existing Vercel project can be updated from this source folder with `npx vercel@latest --prod` when ready.
