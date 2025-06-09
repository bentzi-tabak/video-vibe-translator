
// Service Worker לתוסף הדיבוב
// טיפול בהודעות בין הרכיבים השונים של התוסף

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background: קיבלתי הודעה', request);
  
  // טיפול בבקשות שונות מה-content script
  if (request.action === 'log') {
    console.log('Content Script Log:', request.data);
  }
  
  // החזרת תגובה אסינכרונית
  sendResponse({success: true});
  return true;
});

// הפעלה ראשונית של התוסף
chrome.runtime.onInstalled.addListener(() => {
  console.log('תוסף הדיבוב הותקן בהצלחה');
  
  // הגדרת ערכי ברירת מחדל
  chrome.storage.sync.set({
    targetLanguage: 'he',
    ttsEngine: 'web',
    isEnabled: false
  });
});
