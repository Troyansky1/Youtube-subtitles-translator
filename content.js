// Translation popup element
let popup = null;

// Cache detected language per video (in-memory, resets on page refresh)
let cachedLanguage = null;
let currentVideoId = null;

// Manual language override (in-memory, resets on page refresh)
let manualLanguage = null;

// Get current video ID
function getCurrentVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

// Detect language from text using character-based heuristics
async function detectLanguage(text) {
  try {
    // Character set detection - works for most languages
    const hasCyrillic = /[\u0400-\u04FF]/.test(text);
    const hasArabic = /[\u0600-\u06FF]/.test(text);
    const hasHebrew = /[\u0590-\u05FF]/.test(text);
    const hasCJK = /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/.test(text);
    const hasGreek = /[\u0370-\u03FF]/.test(text);
    const hasThai = /[\u0E00-\u0E7F]/.test(text);
    
    // Specific language detection
    if (hasCyrillic) return 'ru'; // Russian (could also be Ukrainian, Bulgarian, etc.)
    if (hasArabic) return 'ar';
    if (hasHebrew) return 'he';
    if (hasGreek) return 'el';
    if (hasThai) return 'th';
    
    // CJK specific detection
    if (hasCJK) {
      if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'ja'; // Japanese (hiragana/katakana)
      if (/[\uAC00-\uD7AF]/.test(text)) return 'ko'; // Korean (hangul)
      return 'zh'; // Chinese
    }
    
    // Latin-based languages with distinctive characters
    const hasGerman = /[äöüßÄÖÜ]/.test(text);
    const hasFrench = /[àâäæçéèêëïîôùûüÿœÀÂÄÆÇÉÈÊËÏÎÔÙÛÜŸŒ]/.test(text);
    const hasSpanish = /[áéíóúñÁÉÍÓÚÑ¿¡]/.test(text);
    const hasPortuguese = /[ãõçÃÕÇ]/.test(text);
    const hasTurkish = /[şğıİŞĞ]/.test(text);
    const hasPolish = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(text);
    const hasCzech = /[čďěňřšťůžČĎĚŇŘŠŤŮŽ]/.test(text);
    const hasVietnamese = /[ăâđêôơưĂÂĐÊÔƠƯ]/.test(text);
    
    if (hasGerman) return 'de';
    if (hasTurkish) return 'tr';
    if (hasPolish) return 'pl';
    if (hasCzech) return 'cs';
    if (hasVietnamese) return 'vi';
    if (hasPortuguese) return 'pt';
    if (hasFrench) return 'fr';
    if (hasSpanish) return 'es';
    
    // Default to English if no distinctive characters found
    return 'en';
  } catch (error) {
    console.error('Language detection error:', error);
    return 'en';
  }
}

// Get YouTube video element
function getVideoElement() {
  return document.querySelector('video');
}

// Get all visible subtitle text
function getVisibleSubtitleText() {
  const subtitleContainers = document.querySelectorAll('.ytp-caption-segment, .caption-visual-line');
  let text = '';
  subtitleContainers.forEach(el => {
    text += ' ' + (el.textContent || '');
  });
  return text.trim();
}
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
  // Method 1: Try to get from ytplayer config (most reliable for auto-translate)
  try {
    // Access the YouTube player's internal state
    const player = document.getElementById('movie_player');
    if (player && typeof player.getOption === 'function') {
      // Try to get caption track info
      const captionModule = player.getOption('captions', 'track');
      if (captionModule && captionModule.languageCode) {
        console.log('Detected from player captions module:', captionModule.languageCode);
        return normalizeLanguageCode(captionModule.languageCode);
      }
      
      // Try to get translation language if auto-translate is active
      const translationLang = player.getOption('captions', 'translationLanguage');
      if (translationLang && translationLang.languageCode) {
        console.log('Detected auto-translate language:', translationLang.languageCode);
        return normalizeLanguageCode(translationLang.languageCode);
      }
    }
  } catch (e) {
    console.log('Could not access player options:', e);
  }
  
  // Method 2: Check caption window lang attribute (works for some cases)
  const captionWindow = document.querySelector('.caption-window');
  if (captionWindow) {
    const lang = captionWindow.getAttribute('lang');
    if (lang && lang !== 'en' && lang !== 'und') {
      console.log('Detected language from caption window:', lang);
      return normalizeLanguageCode(lang);
    }
  }
  
  // Method 3: Check video text tracks
  const video = document.querySelector('video');
  if (video && video.textTracks) {
    for (let i = 0; i < video.textTracks.length; i++) {
      const track = video.textTracks[i];
      if (track.mode === 'showing' && track.language && track.language !== 'und') {
        console.log('Detected language from text track:', track.language);
        return normalizeLanguageCode(track.language);
      }
    }
  }
  
  // Method 4: Parse ytInitialPlayerResponse
  try {
    const ytInitialPlayerResponse = window.ytInitialPlayerResponse;
    if (ytInitialPlayerResponse && ytInitialPlayerResponse.captions) {
      const renderer = ytInitialPlayerResponse.captions.playerCaptionsTracklistRenderer;
      
      // Check for translation languages
      if (renderer && renderer.translationLanguages) {
        const translationLangs = renderer.translationLanguages;
        const selectedTranslation = translationLangs.find(l => l.isSelected);
        if (selectedTranslation && selectedTranslation.languageCode) {
          console.log('Detected auto-translated language from response:', selectedTranslation.languageCode);
          return normalizeLanguageCode(selectedTranslation.languageCode);
        }
      }
      
      // Check caption tracks
      const captionTracks = renderer?.captionTracks;
      if (captionTracks && captionTracks.length > 0) {
        const activeTrack = captionTracks.find(t => t.isTranslatable) || captionTracks[0];
        if (activeTrack && activeTrack.languageCode) {
          console.log('Detected language from caption tracks:', activeTrack.languageCode);
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
  
  // Add language selector icon
  const langButton = document.createElement('button');
  langButton.className = 'yt-translator-lang-button';
  langButton.innerHTML = '🌐';
  langButton.title = 'Change language';
  langButton.onclick = (e) => {
    e.stopPropagation();
    showLanguageSelector(x, y);
  };
  popup.appendChild(langButton);
  
  document.body.appendChild(popup);
  
  return popup;
}

// Show language selector dropdown
function showLanguageSelector(x, y) {
  const selector = document.createElement('div');
  selector.className = 'yt-translator-lang-selector';
  selector.style.left = `${x}px`;
  selector.style.top = `${y + 40}px`;
  
  const languages = [
    { code: 'ru', name: 'Russian' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ar', name: 'Arabic' },
    { code: 'he', name: 'Hebrew' },
    { code: 'tr', name: 'Turkish' },
    { code: 'pl', name: 'Polish' },
    { code: 'nl', name: 'Dutch' },
    { code: 'sv', name: 'Swedish' },
    { code: 'no', name: 'Norwegian' },
    { code: 'da', name: 'Danish' },
    { code: 'fi', name: 'Finnish' },
    { code: 'cs', name: 'Czech' },
    { code: 'uk', name: 'Ukrainian' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'th', name: 'Thai' },
    { code: 'hi', name: 'Hindi' },
    { code: 'id', name: 'Indonesian' }
  ];
  
  languages.forEach(lang => {
    const option = document.createElement('div');
    option.className = 'yt-translator-lang-option';
    option.textContent = lang.name;
    option.onclick = () => {
      manualLanguage = lang.code;
      cachedLanguage = lang.code;
      console.log('Manual language set to:', lang.code);
      document.body.removeChild(selector);
      removePopup();
    };
    selector.appendChild(option);
  });
  
  document.body.appendChild(selector);
  
  // Remove selector when clicking outside
  setTimeout(() => {
    document.addEventListener('click', function removeSelector(e) {
      if (selector.parentNode && !selector.contains(e.target)) {
        document.body.removeChild(selector);
        document.removeEventListener('click', removeSelector);
      }
    });
  }, 100);
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
  
  // Check if we're on a new video
  const videoId = getCurrentVideoId();
  if (videoId !== currentVideoId) {
    currentVideoId = videoId;
    cachedLanguage = null; // Reset cache for new video
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
  
  // Get or detect source language
  let sourceLang = null;
  
  // Priority 1: Manual language (if user set it)
  if (manualLanguage) {
    sourceLang = manualLanguage;
    console.log('Using manual language:', manualLanguage);
  }
  // Priority 2: Cached language (from previous detection this session)
  else if (cachedLanguage) {
    sourceLang = cachedLanguage;
    console.log('Using cached language:', cachedLanguage);
  }
  // Priority 3: Detect language
  else {
    console.log('No manual or cached language, detecting...');
    
    // Try YouTube caption window
    const captionWindow = document.querySelector('.caption-window');
    const captionLang = captionWindow?.getAttribute('lang');
    if (captionLang && captionLang !== 'en' && captionLang !== 'und') {
      sourceLang = normalizeLanguageCode(captionLang);
      console.log('Detected language from YouTube caption window:', sourceLang);
    }
    
    // If YouTube detection failed, default to English and show language selector hint
    if (!sourceLang) {
      console.log('YouTube detection failed, defaulting to English. User can change via 🌐 button.');
      sourceLang = 'en';
    }
    
    // Cache the detected language
    cachedLanguage = sourceLang;
    console.log('Cached language for this session:', cachedLanguage);
  }
  
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