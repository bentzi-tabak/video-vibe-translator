// Content Script מתוקן לדיבוב וידאו יוטיוב
class VideoDubber {
  constructor() {
    this.videoElement = null;
    this.recognition = null;
    this.isActive = false;
    this.isRecognitionRunning = false;
    this.dubbingButton = null;
    this.restartAttempts = 0;
    this.maxRestartAttempts = 3;
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

  // בדיקת תמיכה בדפדפן משופרת
  checkBrowserSupport() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      this.showError('הדפדפן שלך לא תומך בזיהוי קול. נסה Chrome גרסה 25 ומעלה.');
      return false;
    }
    
    if (!('speechSynthesis' in window)) {
      this.showError('הדפדפן שלך לא תומך בהקראת טקסט.');
      return false;
    }
    
    // בדיקת הרשאות מיקרופון
    navigator.permissions.query({name: 'microphone'}).then((result) => {
      if (result.state === 'denied') {
        this.showError('הרשאת מיקרופון נדחתה. אנא אפשר גישה בהגדרות הדפדפן.');
      }
    }).catch(() => {
      console.log('לא ניתן לבדוק הרשאות מיקרופון');
    });
    
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

    // טיפול בלחיצה עם מניעת קליקים כפולים
    this.dubbingButton.onclick = () => {
      this.dubbingButton.disabled = true;
      setTimeout(() => {
        this.dubbingButton.disabled = false;
      }, 1000);
      this.toggleDubbing();
    };

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

  // התחלת דיבוב משופרת
  async startDubbing() {
    console.log('מתחיל דיבוב');
    
    if (!this.checkBrowserSupport()) return;
    if (this.isActive) return; // מניעת הפעלה כפולה

    try {
      // בקשת הרשאות מיקרופון עם timeout
      const mediaPromise = navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 10000);
      });
      
      await Promise.race([mediaPromise, timeoutPromise]);
      
      // יצירת זיהוי קול חדש
      this.setupSpeechRecognition();
      
      // הפעלת זיהוי הקול
      this.startRecognition();
      
      // עדכון מצב
      this.isActive = true;
      this.restartAttempts = 0;
      this.updateButtonState();
      
      console.log('דיבוב הופעל בהצלחה');

    } catch (error) {
      console.error('שגיאה בהפעלת דיבוב:', error);
      this.handleStartupError(error);
    }
  }

  // הגדרת זיהוי קול משופרת
  setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    // הגדרות בסיסיות
    this.recognition.continuous = true;
    this.recognition.interimResults = false; // שונה ל-false למניעת עיבוד מיותר
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    // טיפול בתוצאות זיהוי הקול
    this.recognition.onresult = (event) => this.handleSpeechResult(event);
    
    // טיפול בהתחלת זיהוי קול
    this.recognition.onstart = () => {
      console.log('זיהוי קול התחיל');
      this.isRecognitionRunning = true;
      this.restartAttempts = 0;
    };
    
    // טיפול משופר בשגיאות
    this.recognition.onerror = (event) => {
      console.error('שגיאה בזיהוי קול:', event.error);
      this.handleRecognitionError(event);
    };
    
    // טיפול בסיום זיהוי קול
    this.recognition.onend = () => {
      console.log('זיהוי קול הסתיים');
      this.isRecognitionRunning = false;
      this.handleRecognitionEnd();
    };

    // טיפול בזיהוי תחילת דיבור
    this.recognition.onspeechstart = () => {
      console.log('זוהה תחילת דיבור');
    };

    // טיפול בזיהוי סיום דיבור
    this.recognition.onspeechend = () => {
      console.log('זוהה סיום דיבור');
    };
  }

  // התחלת זיהוי קול עם מניעת שגיאות
  startRecognition() {
    if (!this.recognition || this.isRecognitionRunning) {
      return;
    }

    try {
      this.recognition.start();
      console.log('מפעיל זיהוי קול');
    } catch (error) {
      console.error('שגיאה בהפעלת זיהוי קול:', error);
      if (error.name === 'InvalidStateError') {
        console.log('זיהוי קול כבר רץ - מתעלמים');
        this.isRecognitionRunning = true;
      }
    }
  }

  // טיפול בשגיאות זיהוי קול משופר
  handleRecognitionError(event) {
    this.isRecognitionRunning = false;
    
    switch(event.error) {
      case 'no-speech':
        console.log('לא זוהה דיבור, ממשיך להאזין...');
        // לא צריך הפעלה מחדש מיידית - onend יטפל בזה
        break;
      
      case 'not-allowed':
        this.showError('נדרשת הרשאה למיקרופון. אנא אפשר גישה למיקרופון ונסה שוב.');
        this.stopDubbing();
        break;
        
      case 'network':
        this.showError('בעיית רשת. בדוק את החיבור לאינטרנט.');
        this.scheduleRestart();
        break;
        
      case 'audio-capture':
        this.showError('בעיה בקלטת אודיו. בדוק שהמיקרופון עובד.');
        this.stopDubbing();
        break;
        
      case 'aborted':
        console.log('זיהוי קול בוטל');
        break;

      case 'language-not-supported':
        this.showError('השפה לא נתמכת. מחליף לאנגלית...');
        this.recognition.lang = 'en-US';
        this.scheduleRestart();
        break;
        
      default:
        this.showError(`שגיאה בזיהוי קול: ${event.error}`);
        this.scheduleRestart();
    }
  }

  // טיפול בסיום זיהוי קול משופר
  handleRecognitionEnd() {
    if (this.isActive && !this.isRecognitionRunning) {
      this.scheduleRestart();
    }
  }

  // תזמון הפעלה מחדש בטוחה
  scheduleRestart() {
    if (!this.isActive || this.restartAttempts >= this.maxRestartAttempts) {
      if (this.restartAttempts >= this.maxRestartAttempts) {
        this.showError('נכשל בהפעלה מחדש מספר רב של פעמים. נסה להפעיל מחדש ידנית.');
        this.stopDubbing();
      }
      return;
    }

    this.restartAttempts++;
    console.log(`מנסה הפעלה מחדש - ניסיון ${this.restartAttempts}/${this.maxRestartAttempts}`);

    // השהיה הולכת וגדלה בין ניסיונות
    const delay = Math.min(1000 * this.restartAttempts, 5000);
    
    setTimeout(() => {
      if (this.isActive && !this.isRecognitionRunning) {
        this.startRecognition();
      }
    }, delay);
  }

  // טיפול בשגיאות התחלה
  handleStartupError(error) {
    if (error.name === 'NotAllowedError' || error.message === 'Timeout') {
      this.showError('נדרשת הרשאה למיקרופון. אנא אפשר גישה למיקרופון בהגדרות הדפדפן.');
    } else if (error.name === 'NotFoundError') {
      this.showError('מיקרופון לא נמצא. בדוק שמיקרופון מחובר למחשב.');
    } else {
      this.showError('שגיאה בהפעלת הדיבוב: ' + error.message);
    }
  }

  // עצירת דיבוב משופרת
  stopDubbing() {
    console.log('עוצר דיבוב');
    
    // עדכון מצב קודם כדי למנוע הפעלה מחדש
    this.isActive = false;
    this.isRecognitionRunning = false;
    this.restartAttempts = 0;
    
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (error) {
        console.log('שגיאה בעצירת זיהוי קול:', error);
      }
      this.recognition = null;
    }
    
    // עצירת הקראה נוכחית
    speechSynthesis.cancel();
    
    // עדכון כפתור
    this.updateButtonState();
    
    console.log('דיבוב נעצר');
  }

  // טיפול בתוצאות זיהוי הקול משופר
  async handleSpeechResult(event) {
    try {
      const results = event.results;
      const lastResult = results[results.length - 1];
      
      if (lastResult.isFinal) {
        const transcript = lastResult[0].transcript.trim();
        
        if (transcript.length > 0) {
          console.log('טקסט שזוהה:', transcript);
          
          // בדיקת רמת ביטחון
          const confidence = lastResult[0].confidence;
          if (confidence && confidence < 0.7) {
            console.log('רמת ביטחון נמוכה:', confidence);
            return;
          }
          
          // תרגום הטקסט (אם הפונקציה קיימת)
          if (window.freeTranslator && window.freeTranslator.translateWithGoogle) {
            const translatedText = await window.freeTranslator.translateWithGoogle(
              transcript, 
              this.settings.targetLanguage
            );
            this.speakText(translatedText);
          } else {
            // אם אין תרגום, הקרא את הטקסט המקורי
            this.speakText(transcript);
          }
        }
      }
    } catch (error) {
      console.error('שגיאה בעיבוד הטקסט:', error);
    }
  }

  // הקראת טקסט בקול סינטטי משופרת
  speakText(text) {
    console.log('מקריא טקסט:', text);
    
    // עצירת הקראה קודמת
    speechSynthesis.cancel();
    
    // המתנה קצרה לוודא עצירה מלאה
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.settings.targetLanguage === 'he' ? 'he-IL' : this.settings.targetLanguage;
      utterance.rate = 0.9;
      utterance.volume = 0.8;
      utterance.pitch = 1.0;

      // בחירת קול מתאים
      const voices = speechSynthesis.getVoices();
      let selectedVoice = null;
      
      if (this.settings.targetLanguage === 'he') {
        selectedVoice = voices.find(voice => voice.lang.startsWith('he'));
      } else {
        selectedVoice = voices.find(voice => voice.lang.startsWith(this.settings.targetLanguage));
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      // טיפול באירועים
      utterance.onstart = () => {
        console.log('התחיל הקראה');
      };

      utterance.onend = () => {
        console.log('הקראה הסתיימה');
      };

      utterance.onerror = (event) => {
        console.error('שגיאה בהקראת טקסט:', event.error);
      };

      // הקראה
      speechSynthesis.speak(utterance);
    }, 100);
  }

  // עדכון מצב הכפתור
  updateButtonState() {
    if (!this.dubbingButton) return;
    
    if (this.isActive) {
      this.dubbingButton.innerHTML = '⏸️ עצור דיבוב';
      this.dubbingButton.style.background = '#00aa00';
      this.dubbingButton.title = 'לחץ לעצירת הדיבוב';
    } else {
      this.dubbingButton.innerHTML = '🎤 הפעל דיבוב';
      this.dubbingButton.style.background = '#ff0000';
      this.dubbingButton.title = 'לחץ להפעלת דיבוב קולי';
    }
  }

  // הצגת הודעת שגיאה משופרת
  showError(message) {
    console.error('שגיאה:', message);
    
    // הסרת הודעות שגיאה קודמות
    const existingErrors = document.querySelectorAll('.dubbing-error');
    existingErrors.forEach(error => error.remove());
    
    // יצירת הודעת שגיאה חזותית
    const errorDiv = document.createElement('div');
    errorDiv.className = 'dubbing-error';
    errorDiv.innerHTML = `
      <span style="margin-right: 8px;">⚠️</span>
      ${message}
      <button onclick="this.parentElement.remove()" style="
        float: left;
        background: none;
        border: none;
        color: white;
        font-size: 16px;
        cursor: pointer;
        margin-left: 10px;
      ">×</button>
    `;
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
      max-width: 350px;
      direction: rtl;
      font-family: Arial, sans-serif;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(errorDiv);
    
    // הסרת ההודעה אחרי 8 שניות
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
          if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
          }
        }, 300);
      }
    }, 8000);
  }
}

// הוספת סגנונות CSS לאנימציות
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// השהיה קצרה והפעלת התוסף
setTimeout(() => {
  console.log('מפעיל תוסף דיבוב יוטיוב מתוקן');
  window.videoDubber = new VideoDubber();
}, 1000);
