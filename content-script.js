// Content Script עיקרי לדיבוב וידאו יוטיוב
class VideoDubber {
  constructor() {
    this.videoElement = null;
    this.recognition = null;
    this.isActive = false;
    this.dubbingButton = null;
    this.settings = {
      targetLanguage: 'he',
      ttsEngine: 'web'
    };
    
    // התחלה של התוסף
    this.init();
  }

  // אתחול התוסף
  async init() {
    console.log('מתחיל אתחול תוסף הדיבוב');
    
    // טעינת הגדרות
    await this.loadSettings();
    
    // המתנה לטעינת העמוד ויצירת כפתור
    this.waitForVideo();
    
    // בדיקת תמיכה בדפדפן
    this.checkBrowserSupport();
  }

  // טעינת הגדרות מאחסון התוסף
  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['targetLanguage', 'ttsEngine']);
      if (result.targetLanguage) this.settings.targetLanguage = result.targetLanguage;
      if (result.ttsEngine) this.settings.ttsEngine = result.ttsEngine;
      console.log('הגדרות נטענו:', this.settings);
    } catch (error) {
      console.error('שגיאה בטעינת הגדרות:', error);
    }
  }

  // בדיקת תמיכה בדפדפן
  checkBrowserSupport() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      this.showError('הדפדפן שלך לא תומך בזיהוי קול. נסה Chrome או Edge.');
      return false;
    }
    
    if (!('speechSynthesis' in window)) {
      this.showError('הדפדפן שלך לא תומך בהקראת טקסט.');
      return false;
    }
    
    return true;
  }

  // המתנה לזיהוי רכיב הוידאו ויצירת כפתור
  waitForVideo() {
    const observer = new MutationObserver(() => {
      this.videoElement = document.querySelector('video');
      if (this.videoElement && !this.dubbingButton) {
        this.createDubbingButton();
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // ניסיון מיידי למצוא וידאו
    this.videoElement = document.querySelector('video');
    if (this.videoElement) {
      this.createDubbingButton();
    }
  }

  // יצירת כפתור הדיבוב
  createDubbingButton() {
    console.log('יוצר כפתור דיבוב');
    
    this.dubbingButton = document.createElement('button');
    this.dubbingButton.innerHTML = '🎤 הפעל דיבוב';
    this.dubbingButton.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      background: #ff0000;
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 25px;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
      font-family: Arial, sans-serif;
      direction: rtl;
    `;

    // הוספת אפקטי hover
    this.dubbingButton.onmouseenter = () => {
      this.dubbingButton.style.transform = 'scale(1.05)';
      this.dubbingButton.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
    };

    this.dubbingButton.onmouseleave = () => {
      this.dubbingButton.style.transform = 'scale(1)';
      this.dubbingButton.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    };

    // טיפול בלחיצה
    this.dubbingButton.onclick = () => this.toggleDubbing();

    document.body.appendChild(this.dubbingButton);
    console.log('כפתור דיבוב נוצר בהצלחה');
  }

  // הפעלה/עצירה של הדיבוב
  async toggleDubbing() {
    if (this.isActive) {
      this.stopDubbing();
    } else {
      await this.startDubbing();
    }
  }

  // התחלת דיבוב
  async startDubbing() {
    console.log('מתחיל דיבוב');
    
    if (!this.checkBrowserSupport()) return;

    try {
      // בקשת הרשאות מיקרופון
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // הגדרת זיהוי קול
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      // טיפול בתוצאות זיהוי הקול
      this.recognition.onresult = (event) => this.handleSpeechResult(event);
      
      // טיפול משופר בשגיאות
      this.recognition.onerror = (event) => {
        console.error('שגיאה בזיהוי קול:', event.error);
        
        switch(event.error) {
          case 'no-speech':
            console.log('לא זוהה דיבור, ממשיך להאזין...');
            // ניסיון חוזר אוטומטי אחרי שגיאת no-speech
            setTimeout(() => {
              if (this.isActive && this.recognition) {
                try {
                  this.recognition.start();
                } catch (e) {
                  console.log('לא ניתן להפעיל מחדש:', e);
                }
              }
            }, 1000);
            break;
          
          case 'not-allowed':
            this.showError('נדרשת הרשאה למיקרופון. אנא אפשר גישה למיקרופון ונסה שוב.');
            this.stopDubbing();
            break;
            
          case 'network':
            this.showError('בעיית רשת. בדוק את החיבור לאינטרנט.');
            break;
            
          case 'audio-capture':
            this.showError('בעיה בקלטת אודיו. בדוק שהמיקרופון עובד.');
            break;
            
          default:
            this.showError(`שגיאה בזיהוי קול: ${event.error}`);
        }
      };
      
      // טיפול בסיום זיהוי קול
      this.recognition.onend = () => {
        console.log('זיהוי קול הסתיים');
        // הפעלה מחדש אוטומטית אם עדיין פעיל
        if (this.isActive) {
          setTimeout(() => {
            try {
              this.recognition.start();
              console.log('מפעיל זיהוי קול מחדש');
            } catch (error) {
              console.error('שגיאה בהפעלה מחדש:', error);
            }
          }, 500);
        }
      };

      // הפעלת זיהוי הקול
      this.recognition.start();
      
      // עדכון מצב הכפתור
      this.isActive = true;
      this.updateButtonState();
      
      console.log('דיבוב הופעל בהצלחה');

    } catch (error) {
      console.error('שגיאה בהפעלת דיבוב:', error);
      if (error.name === 'NotAllowedError') {
        this.showError('נדרשת הרשאה למיקרופון. אנא אפשר גישה למיקרופון בהגדרות הדפדפן.');
      } else {
        this.showError('שגיאה בהפעלת הדיבוב: ' + error.message);
      }
    }
  }

  // עצירת דיבוב
  stopDubbing() {
    console.log('עוצר דיבוב');
    
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
    
    // עצירת הקראה נוכחית
    speechSynthesis.cancel();
    
    // עדכון מצב
    this.isActive = false;
    this.updateButtonState();
    
    console.log('דיבוב נעצר');
  }

  // טיפול בתוצאות זיהוי הקול
  async handleSpeechResult(event) {
    const results = event.results;
    const lastResult = results[results.length - 1];
    
    // עיבוד רק תוצאות סופיות כדי למנוע תרגומים מיותרים
    if (lastResult.isFinal) {
      const transcript = lastResult[0].transcript.trim();
      
      if (transcript.length > 0) {
        console.log('טקסט שזוהה:', transcript);
        
        try {
          // תרגום הטקסט
          const translatedText = await window.freeTranslator.translateWithGoogle(
            transcript, 
            this.settings.targetLanguage
          );
          
          // הקראת הטקסט המתורגם
          this.speakText(translatedText);
          
        } catch (error) {
          console.error('שגיאה בעיבוד הטקסט:', error);
        }
      }
    }
  }

  // הקראת טקסט בקול סינטטי
  speakText(text) {
    console.log('מקריא טקסט:', text);
    
    // עצירת הקראה קודמת
    speechSynthesis.cancel();
    
    // יצירת utterance חדש
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.settings.targetLanguage === 'he' ? 'he-IL' : this.settings.targetLanguage;
    utterance.rate = 0.9; // מהירות מעט איטית יותר לבהירות
    utterance.volume = 0.8;

    // בחירת קול עברי אם קיים
    const voices = speechSynthesis.getVoices();
    const hebrewVoice = voices.find(voice => voice.lang.startsWith('he'));
    if (hebrewVoice) {
      utterance.voice = hebrewVoice;
    }

    // הקראה
    speechSynthesis.speak(utterance);

    // טיפול בשגיאות הקראה
    utterance.onerror = (event) => {
      console.error('שגיאה בהקראת טקסט:', event.error);
    };
  }

  // עדכון מצב הכפתור
  updateButtonState() {
    if (!this.dubbingButton) return;
    
    if (this.isActive) {
      this.dubbingButton.innerHTML = '⏸️ עצור דיבוב';
      this.dubbingButton.style.background = '#00aa00';
    } else {
      this.dubbingButton.innerHTML = '🎤 הפעל דיבוב';
      this.dubbingButton.style.background = '#ff0000';
    }
  }

  // הצגת הודעת שגיאה
  showError(message) {
    console.error('שגיאה:', message);
    
    // יצירת הודעת שגיאה חזותית
    const errorDiv = document.createElement('div');
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 10000;
      background: #ff4444;
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-size: 14px;
      max-width: 300px;
      direction: rtl;
      font-family: Arial, sans-serif;
    `;
    
    document.body.appendChild(errorDiv);
    
    // הסרת ההודעה אחרי 5 שניות
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 5000);
  }
}

// השהיה קצרה והפעלת התוסף
setTimeout(() => {
  console.log('מפעיל תוסף דיבוב יוטיוב');
  window.videoDubber = new VideoDubber();
}, 1000);
