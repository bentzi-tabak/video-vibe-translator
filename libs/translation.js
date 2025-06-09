
// מחלקה לתרגום טקסט באמצעות Google Translate API החינמי
class FreeTranslator {
  constructor() {
    this.cache = new Map(); // קאש לתרגומים שכבר בוצעו
    this.lastRequestTime = 0;
    this.minRequestInterval = 500; // מרווח מינימלי בין בקשות (מילישניות)
  }

  // פונקציה עיקרית לתרגום טקסט
  async translateWithGoogle(text, targetLang = 'he') {
    // בדיקת קאש קודם
    const cacheKey = `${text}_${targetLang}`;
    if (this.cache.has(cacheKey)) {
      console.log('מחזיר תרגום מהקאש:', text);
      return this.cache.get(cacheKey);
    }

    try {
      // יישום debounce - המתנה בין בקשות
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.minRequestInterval) {
        await this.sleep(this.minRequestInterval - timeSinceLastRequest);
      }
      this.lastRequestTime = Date.now();

      // יצירת URL לבקשת תרגום
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
      
      console.log('שולח בקשת תרגום:', text);
      
      // שליחת בקשה ל-Google Translate
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`שגיאת HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      // חילוץ הטקסט המתורגם
      if (data && data[0] && data[0][0] && data[0][0][0]) {
        const translatedText = data[0][0][0];
        
        // שמירה בקאש
        this.cache.set(cacheKey, translatedText);
        
        // ניקוי קאש אם הוא גדול מדי
        if (this.cache.size > 100) {
          const firstKey = this.cache.keys().next().value;
          this.cache.delete(firstKey);
        }
        
        console.log('תרגום הושלם:', translatedText);
        return translatedText;
      } else {
        throw new Error('פורמט תגובה לא צפוי מ-Google Translate');
      }

    } catch (error) {
      console.error('שגיאה בתרגום:', error);
      
      // fallback - החזרת הטקסט המקורי במקרה של שגיאה
      return `[שגיאת תרגום] ${text}`;
    }
  }

  // פונקציית עזר להמתנה
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ניקוי קאש
  clearCache() {
    this.cache.clear();
    console.log('קאש התרגומים נוקה');
  }
}

// יצירת instance גלובלי
window.freeTranslator = new FreeTranslator();
