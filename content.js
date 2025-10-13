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

// Handle double-click on subtitle text
async function handleDoubleClick(e) {
  // Check if video is paused
  const video = getVideoElement();
  if (!video || !video.paused) {
    return; // Only allow translation when video is paused
  }
  
  // Get the double-clicked word
  const selection = window.getSelection();
  let word = selection.toString().trim();
  
  // If no selection, try to get word at click position
  if (!word && e.target.textContent) {
    word = getWordAtPosition(e.target, e.clientX, e.clientY);
  }
  
  if (!word) return;
  
  // Clean up word (remove punctuation)
  word = word.replace(/[.,!?;:"""''()]/g, '').trim();
  if (!word) return;
  
  // Create popup at click position
  const popupEl = createPopup(word, e.pageX + 10, e.pageY + 10);
  
  // Get translation
  const sourceLang = getSubtitleLanguage();
  const translation = await translateWord(word, sourceLang, 'en');
  
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
    const subtitleContainer = document.querySelector('.ytp-caption-window-container');
    
    if (subtitleContainer && !subtitleContainer.dataset.translatorActive) {
      subtitleContainer.dataset.translatorActive = 'true';
      subtitleContainer.addEventListener('dblclick', handleDoubleClick);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Also try to attach immediately if already exists
  const subtitleContainer = document.querySelector('.ytp-caption-window-container');
  if (subtitleContainer && !subtitleContainer.dataset.translatorActive) {
    subtitleContainer.dataset.translatorActive = 'true';
    subtitleContainer.addEventListener('dblclick', handleDoubleClick);
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