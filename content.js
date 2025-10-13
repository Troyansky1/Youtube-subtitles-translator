// Translation popup element
let popup = null;

// Get YouTube video element
function getVideoElement() {
  return document.querySelector('video');
}

// Detect subtitle language from YouTube
function getSubtitleLanguage() {
  const ytPlayer = document.querySelector('.html5-video-player');
  if (!ytPlayer) return 'ru'; // Default to Russian
  
  // Try to get current subtitle track
  const subtitleBtn = document.querySelector('.ytp-subtitles-button');
  // For now, default to Russian. Could be enhanced to read actual subtitle language
  return 'ru';
}

// Create translation popup
function createPopup(text, x, y) {
  removePopup();
  
  popup = document.createElement('div');
  popup.className = 'yt-word-translator-popup';
  popup.textContent = 'Translating...';
  popup.style.left = `${x}px`;
  popup.style.top = `${y}px`;
  
  document.body.appendChild(popup);
  
  return popup;
}

// Remove popup
function removePopup() {
  if (popup && popup.parentNode) {
    popup.parentNode.removeChild(popup);
    popup = null;
  }
}

// Translate word using MyMemory API
async function translateWord(word, sourceLang, targetLang) {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=${sourceLang}|${targetLang}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.responseStatus === 200 && data.responseData) {
      return data.responseData.translatedText;
    }
    return 'Translation unavailable';
  } catch (error) {
    console.error('Translation error:', error);
    return 'Translation failed';
  }
}

// Get word at click position using range and offset
function getWordAtClick(element, clientX, clientY) {
  // Try to get precise position using caretPositionFromPoint or caretRangeFromPoint
  let range;
  if (document.caretPositionFromPoint) {
    const position = document.caretPositionFromPoint(clientX, clientY);
    if (position) {
      range = document.createRange();
      range.setStart(position.offsetNode, position.offset);
      range.setEnd(position.offsetNode, position.offset);
    }
  } else if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(clientX, clientY);
  }
  
  if (!range) return null;
  
  const textNode = range.startContainer;
  if (textNode.nodeType !== Node.TEXT_NODE) return null;
  
  const text = textNode.textContent;
  const offset = range.startOffset;
  
  // Find word boundaries around the offset
  let start = offset;
  let end = offset;
  
  // Find start of word
  while (start > 0 && !/\s/.test(text[start - 1])) {
    start--;
  }
  
  // Find end of word
  while (end < text.length && !/\s/.test(text[end])) {
    end++;
  }
  
  const word = text.substring(start, end).trim();
  return word;
}

// Handle double-click on subtitle text
async function handleDoubleClick(e) {
  // Prevent YouTube's default behavior
  e.preventDefault();
  e.stopPropagation();
  
  // Check if video is paused
  const video = getVideoElement();
  if (!video || !video.paused) {
    return; // Only allow translation when video is paused
  }
  
  // Try to get selected word first (most reliable)
  const selection = window.getSelection();
  let word = selection.toString().trim();
  
  // If selection is empty or multiple words, try click position detection
  if (!word || word.split(/\s+/).length > 1) {
    word = getWordAtClick(e.target, e.clientX, e.clientY);
  }
  
  // Fallback: if still no word, get text from smallest clicked element
  if (!word) {
    let targetEl = e.target;
    let text = targetEl.textContent || targetEl.innerText || '';
    
    // If the element contains only one word, use it
    const words = text.split(/\s+/).filter(w => w.trim());
    if (words.length === 1) {
      word = words[0];
    }
  }
  
  if (!word) {
    console.log('No word detected');
    return;
  }
  
  // Clean up word (remove punctuation)
  word = word.replace(/[.,!?;:"""''()[\]]/g, '').trim();
  if (!word) return;
  
  console.log('Translating word:', word);
  
  // Create popup at click position
  const popupEl = createPopup(word, e.pageX + 10, e.pageY + 10);
  
  // Get translation
  const sourceLang = getSubtitleLanguage();
  const translation = await translateWord(word, sourceLang, 'en');
  
  console.log('Translation result:', translation);
  
  if (popup) {
    popup.textContent = translation;
  }
}

// Get word at specific position in text
function getWordAtPosition(element, x, y) {
  const text = element.textContent;
  const words = text.split(/\s+/);
  
  // Simple heuristic: return clicked text if it's a single word element
  if (words.length === 1) {
    return text.trim();
  }
  
  // For multi-word elements, try to get selection or return empty
  return '';
}

// Listen for video play to remove popup
function setupVideoListener() {
  const video = getVideoElement();
  if (video) {
    video.addEventListener('play', removePopup);
    video.addEventListener('seeked', removePopup);
  }
}

// Find and setup subtitle container
function setupSubtitleListener() {
  // YouTube subtitles container
  const observer = new MutationObserver(() => {
    // Try multiple subtitle selectors
    const subtitleSelectors = [
      '.ytp-caption-window-container',
      '.caption-window',
      '.ytp-caption-segment'
    ];
    
    for (const selector of subtitleSelectors) {
      const subtitleContainer = document.querySelector(selector);
      
      if (subtitleContainer && !subtitleContainer.dataset.translatorActive) {
        console.log('Found subtitle container:', selector);
        subtitleContainer.dataset.translatorActive = 'true';
        subtitleContainer.addEventListener('dblclick', handleDoubleClick, true);
        
        // Also add to all child elements
        subtitleContainer.querySelectorAll('*').forEach(el => {
          if (!el.dataset.translatorActive) {
            el.dataset.translatorActive = 'true';
            el.addEventListener('dblclick', handleDoubleClick, true);
          }
        });
      }
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Also try to attach immediately if already exists
  const subtitleContainer = document.querySelector('.ytp-caption-window-container');
  if (subtitleContainer && !subtitleContainer.dataset.translatorActive) {
    console.log('Immediate attach to subtitles');
    subtitleContainer.dataset.translatorActive = 'true';
    subtitleContainer.addEventListener('dblclick', handleDoubleClick, true);
  }
}

// Initialize
function init() {
  setupVideoListener();
  setupSubtitleListener();
  
  // Remove popup when clicking outside
  document.addEventListener('click', (e) => {
    if (popup && !popup.contains(e.target)) {
      removePopup();
    }
  });
}

// Wait for page to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}