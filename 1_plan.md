goal:
Paste a YouTube link and get about five short, transcript-grounded bullets. Ship a fast responsive webpage and a Chrome extension in V1.
User action V1 behavior
Paste or drop a URL and select Generate Accept YouTube watch, share, and Shorts links. Normalize to a video ID, keep the URL in the current view's memory, and show a loading state.
Captions are available Show 1–5 distinct bullets, with five as the target and a maximum of 15 words each. Keep the order of the source.
Captions are missing or empty End the request before calling the LLM. Show an accessible toast saying “Sorry, no transcript is available for this video.”
Click the Chrome toolbar icon Keep the current browser window on the left at 75% of the display work area and open KeyNotes on the right at 25%, where supported. Paste or drop a link to use the same flow.
Repeat a link or close the view Reuse a successful result while its entry lives in that view's memory. Closing, navigating away, or reloading resets the session. Reopening starts blank.

Chrome split. In the action handler, get the work area for the display containing the active window. Compute adjacent rectangles and use chrome.windows.update and chrome.windows.create with a local extension popup. Normalize fullscreen or maximized windows before setting bounds and check the actual bounds afterward. Reuse an existing notes window via the windows API so an idle service-worker restart cannot create duplicates. If Chrome or the OS cannot fit the split, restore the original browser bounds and keep the notes window usable at a supported size. Keep submitted URL and notes state entirely inside the extension document. Window controls · Display API

imporve ui and ux for webpage and extention, minimal, consitent branding.
