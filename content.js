// Translation popup element
let popup = null;

// Get YouTube video element
function getVideoElement() {
  return document.querySelector('video');
}

// Normalize language codes to 2-letter ISO format for MyMemory API
function normalizeLanguageCode(lang) {
  if (!lang) return 'ru';
  
  // Convert to lowercase and take first 2 characters
  lang = lang.toLowerCase().substring(0, 2);
  
  // Common mappings
  const langMap = {
    'ru': 'ru', 'en': 'en', 'es': 'es', 'fr': 'fr', 'de': 'de',
    'it': 'it', 'pt': 'pt', 'ja': 'ja', 'ko': 'ko', 'zh': 'zh',
    'ar': 'ar', 'hi': 'hi', 'tr': 'tr', 'pl': 'pl', 'uk': 'uk',
    'nl': 'nl', 'sv': 'sv', 'cs': 'cs', 'ro': 'ro', 'vi': 'vi',
    'th': 'th', 'id': 'id', 'he': 'he', 'fa': 'fa', 'da': 'da',
    'fi': 'fi', 'no': 'no', 'hu': 'hu', 'el': 'el', 'bg': 'bg',
    'sr': 'sr', 'sk': 'sk', 'hr': 'hr', 'lt': 'lt', 'lv': 'lv',
    'et': 'et', 'sl': 'sl'
  };
  
  return langMap[lang] || lang;
}

// Detect subtitle language from YouTube
function getSubtitleLanguage() {
  // Method 1: Check caption window lang attribute
  const captionWindow = document.querySelector('.caption-window');
  if (captionWindow) {
    const lang = captionWindow.getAttribute('lang');
    if (lang) {
      console.log('Detected language from caption window:', lang);
      return normalizeLanguageCode(lang);
    }
  }
  
  // Method 2: Check video player text tracks
  const player = document.querySelector('.html5-video-player');
  if (player) {
    const video = player.querySelector('video');
    if (video && video.textTracks) {
      for (let i = 0; i < video.textTracks.length; i++) {
        const track = video.textTracks[i];
        if (track.mode === 'showing' && track.language) {
          console.log('Detected language from text track:', track.language);
          return normalizeLanguageCode(track.language);
        }
      }
    }
  }
  
  // Method 3: Parse from YouTube player data
  try {
    const ytInitialPlayerResponse = window.ytInitialPlayerResponse;
    if (ytInitialPlayerResponse && ytInitialPlayerResponse.captions) {
      const captionTracks = ytInitialPlayerResponse.captions.playerCaptionsTracklistRenderer?.captionTracks;
      if (captionTracks && captionTracks.length > 0) {
        const activeTrack = captionTracks.find(t => t.isTranslatable) || captionTracks[0];
        if (activeTrack && activeTrack.languageCode) {
          console.log('Detected language from ytInitialPlayerResponse:', activeTrack.languageCode);
          return normalizeLanguageCode(activeTrack.languageCode);
        }
      }
    }
  } catch (e) {
    console.log('Could not parse ytInitialPlayerResponse:', e);
  }
  
  // Default fallback
  console.log('Could not detect language, defaulting to Russian');
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
  
  while (start > 0 && !/\s/.test(text[start - 1])) {
    start--;
  }
  
  while (end < text.length && !/\s/.test(text[end])) {
    end++;
  }
  
  const word = text.substring(start, end).trim();
  return word;
}

// Handle double-click on subtitle text
async function handleDoubleClick(e) {
  e.preventDefault();
  e.stopPropagation();
  
  const video = getVideoElement();
  if (!video || !video.paused) {
    return;
  }
  
  const selection = window.getSelection();
  let word = selection.toString().trim();
  
  if (!word || word.split(/\s+/).length > 1) {
    word = getWordAtClick(e.target, e.clientX, e.clientY);
  }
  
  if (!word) {
    let targetEl = e.target;
    let text = targetEl.textContent || targetEl.innerText || '';
    
    const words = text.split(/\s+/).filter(w => w.trim());
    if (words.length === 1) {
      word = words[0];
    }
  }
  
  if (!word) {
    console.log('No word detected');
    return;
  }
  
  word = word.replace(/[.,!?;:"""''()[\]]/g, '').trim();
  if (!word) return;
  
  console.log('Translating word:', word);
  
  const popupEl = createPopup(word, e.pageX + 10, e.pageY + 10);
  
  const sourceLang = getSubtitleLanguage();
  const translation = await translateWord(word, sourceLang, 'en');
  
  console.log('Translation result:', translation);
  
  if (popup) {
    popup.textContent = translation;
  }
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
  const observer = new MutationObserver(() => {
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
  
  document.addEventListener('click', (e) => {
    if (popup && !popup.contains(e.target)) {
      removePopup();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}