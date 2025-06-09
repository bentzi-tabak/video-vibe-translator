
// לוגיקת Popup להגדרות התוסף
class PopupManager {
  constructor() {
    this.init();
  }

  async init() {
    console.log('מאתחל popup הגדרות');
    
    // טעינת הגדרות נוכחיות
    await this.loadCurrentSettings();
    
    // הוספת מאזינים לאירועים
    this.setupEventListeners();
  }

  // טעינת ההגדרות הנוכחיות
  async loadCurrentSettings() {
    try {
      const settings = await chrome.storage.sync.get(['targetLanguage', 'ttsEngine']);
      
      // עדכון רכיבי הממשק
      const targetLangSelect = document.getElementById('target-language');
      const ttsEngineSelect = document.getElementById('tts-engine');
      
      if (settings.targetLanguage) {
        targetLangSelect.value = settings.targetLanguage;
      }
      
      if (settings.ttsEngine) {
        ttsEngineSelect.value = settings.ttsEngine;
      }
      
      console.log('הגדרות נטענו בפופאפ:', settings);
      
    } catch (error) {
      console.error('שגיאה בטעינת הגדרות:', error);
      this.showStatus('שגיאה בטעינת הגדרות', 'error');
    }
  }

  // הוספת מאזינים לאירועים
  setupEventListeners() {
    // כפתור שמירה
    const saveButton = document.getElementById('save-settings');
    saveButton.addEventListener('click', () => this.saveSettings());
    
    // שמירה אוטומטית בשינוי בחירה
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
      select.addEventListener('change', () => this.saveSettings());
    });
  }

  // שמירת הגדרות
  async saveSettings() {
    try {
      const targetLanguage = document.getElementById('target-language').value;
      const ttsEngine = document.getElementById('tts-engine').value;
      
      // שמירה באחסון התוסף
      await chrome.storage.sync.set({
        targetLanguage: targetLanguage,
        ttsEngine: ttsEngine
      });
      
      console.log('הגדרות נשמרו:', { targetLanguage, ttsEngine });
      this.showStatus('הגדרות נשמרו בהצלחה! ✅', 'success');
      
      // עדכון content script אם קיים
      this.notifyContentScript();
      
    } catch (error) {
      console.error('שגיאה בשמירת הגדרות:', error);
      this.showStatus('שגיאה בשמירת הגדרות ❌', 'error');
    }
  }

  // עדכון content script על שינוי הגדרות
  async notifyContentScript() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab && tab.url && tab.url.includes('youtube.com')) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'settingsUpdated'
        }).catch(() => {
          // אין צורך בטיפול - content script אולי לא פעיל
          console.log('Content script לא זמין לעדכון');
        });
      }
    } catch (error) {
      console.log('לא ניתן לעדכן content script:', error);
    }
  }

  // הצגת הודעת סטטוס
  showStatus(message, type = 'success') {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
    statusElement.style.display = 'block';
    
    // הסתרת ההודעה אחרי 3 שניות
    setTimeout(() => {
      statusElement.style.display = 'none';
    }, 3000);
  }
}

// אתחול הפופאפ כשהדף נטען
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});

// טיפול בסגירת פופאפ
window.addEventListener('beforeunload', () => {
  console.log('סוגר popup הגדרות');
});
