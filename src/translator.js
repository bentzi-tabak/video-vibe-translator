// מחלקה לתרגום טקסט
window.freeTranslator = {
  async translateWithGoogle(text, targetLang) {
    try {
      // תרגום באמצעות Google Translate API חינמי
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data && data[0] && data[0][0]) {
        return data[0][0][0];
      }
      
      return text; // החזר טקסט מקורי אם התרגום נכשל
      
    } catch (error) {
      console.error('שגיאה בתרגום:', error);
      return text; // החזר טקסט מקורי אם יש שגיאה
    }
  }
};
