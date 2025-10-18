YouTube Word Translator
A Chrome extension that helps you learn new languages by translating individual words in YouTube subtitles with a simple double-click.
Features

Double-click translation: Click any word in YouTube subtitles to see its English translation
Auto language detection: Automatically detects the subtitle language
Non-intrusive: Only works when video is paused, preserving natural learning
Free: Uses MyMemory API (10,000 words/day limit)
Clean UI: Minimal popup that disappears when video plays

Installation

Download the extension files:

manifest.json
content.js
styles.css


Create a folder and place all three files inside
Load in Chrome:

Open Chrome and go to chrome://extensions/
Enable Developer mode (toggle in top-right corner)
Click Load unpacked
Select your folder


Done! The extension is now active on YouTube

How to Use

Open any YouTube video
Enable subtitles (click CC button)
Pause the video (translation only works when paused)
Double-click any word in the subtitles
See translation appear in a popup
Resume video to dismiss the popup

Supported Languages
The extension automatically detects the subtitle language and translates to English. Supports all major languages including:

Russian, Spanish, French, German, Italian, Portuguese
Japanese, Korean, Chinese, Arabic, Hindi
And 30+ more languages

Technical Details

API: MyMemory Translation API
Rate Limit: 10,000 words per day (free tier)
Privacy: Words are sent to MyMemory for translation
Permissions: Only accesses YouTube pages

Limitations

Only works when video is paused
Requires active subtitles (manual or auto-generated)
Translation quality depends on MyMemory API
10,000 words/day limit (sufficient for normal use)

Troubleshooting
Translation not working?

Make sure video is paused
Check that subtitles are enabled (CC button)
Open Console (F12) to see debug messages

Wrong language detected?

Extension reads YouTube's active subtitle language
Try changing subtitle language in video settings

Popup not appearing?

Refresh the YouTube page
Reload extension at chrome://extensions/

Privacy & Security

Extension only runs on YouTube pages
Translated words are sent to MyMemory API servers
No data is stored locally or collected
Uses HTTPS for all API requests

License
Free to use and modify for personal use.

## Credits

- **Created by**: Shira Troyansky
- **Built with assistance from (aka vibe coded by)**: Claude (Anthropic)
- **Translation API**: MyMemory