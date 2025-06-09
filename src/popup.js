// טעינת הגדרות נוכחיות
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const result = await chrome.storage.sync.get(['targetLanguage', 'ttsEngine']);
    
    if (result.targetLanguage) {
      document.getElementById('targetLanguage').value = result.targetLanguage;
    }
    
    if (result.ttsEngine) {
      document.getElementById('ttsEngine').value = result.ttsEngine;
    }
  } catch (error) {
    console.error('שגיאה בטעינת הגדרות:', error);
  }
});

// שמירת הגדרות
document.getElementById('saveSettings').addEventListener('click', async () => {
  const targetLanguage = document.getElementById('targetLanguage').value;
  const ttsEngine = document.getElementById('ttsEngine').value;
  
  try {
    await chrome.storage.sync.set({
      targetLanguage,
      ttsEngine
    });
    
    // הצגת הודעת הצלחה
    const status = document.getElementById('status');
    status.textContent = '✅ הגדרות נשמרו בהצלחה!';
    status.className = 'status success';
    status.style.display = 'block';
    
    // הסתרת ההודעה אחרי 2 שניות
    setTimeout(() => {
      status.style.display = 'none';
    }, 2000);
    
  } catch (error) {
    console.error('שגיאה בשמירת הגדרות:', error);
    
    const status = document.getElementById('status');
    status.textContent = '❌ שגיאה בשמירת הגדרות';
    status.className = 'status';
    status.style.backgroundColor = '#f8d7da';
    status.style.color = '#721c24';
    status.style.display = 'block';
  }
});
