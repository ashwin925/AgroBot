/* static/script.js
   Fully corrected multilingual UI + continuous chat + online market linkage
   - Ensures translations apply to ALL languages in dropdown
   - Translates soil/climate options (labels) while preserving option values
   - Keeps market_online fetch and other features working
*/

const STORAGE_KEY = 'agroai_chat_history_v4';
const STORAGE_PREFIX = 'agroai_chat_v4::';
let messages = [];

function makeStorageKey(soil, climate) {
  return `${STORAGE_PREFIX}${soil || '__'}::${climate || '__'}`;
}

function loadHistoryForContext(soil, climate) {
  const raw = localStorage.getItem(makeStorageKey(soil, climate));
  if (!raw) {
    messages = [];
    return;
  }
  try {
    const obj = JSON.parse(raw);
    messages = obj.messages || [];
  } catch (e) {
    console.error('Failed to parse history for context', e);
    messages = [];
  }
}

function saveHistoryForContext(soil, climate) {
  localStorage.setItem(makeStorageKey(soil, climate), JSON.stringify({ messages, savedAt: new Date().toISOString() }));
  localStorage.setItem('agroai_last_context', `${soil}::${climate}`);
}

/* ---------- DOM refs ---------- */
const soilSelect = document.getElementById('soil-type');
const climateSelect = document.getElementById('climate');
const queryEl = document.getElementById('query');
const askBtn = document.getElementById('ask-btn');
const chatHistoryEl = document.getElementById('chat-history');
const languageEl = document.getElementById('language');
const exportBtn = document.getElementById('export-btn');
const clearBtn = document.getElementById('clear-btn');
const marketBtn = document.getElementById('market-btn');
const marketCropInput = document.getElementById('market-crop');
const pageTitle = document.querySelector('header h1');
const pageSubtitle = document.querySelector('header p');
const topTip = document.querySelector('.top-tip');
const languageLabel = document.getElementById('language-label');

/* ---------- TRANSLATIONS (UI strings) ---------- */
/* Each language key must match <option value="..."> in the language dropdown */
const TRANSLATIONS = {
  english: {
    title: 'AgroAI Assistant',
    subtitle: 'Your intelligent agricultural guide',
    language_label: 'Language:',
    soil_placeholder: 'Select Soil Type',
    climate_placeholder: 'Select Climate Zone',
    query_placeholder: 'Ask your agricultural question here...',
    market_input_placeholder: 'Enter product name (e.g. cashew)',
    get_advice: 'Get Advice',
    export: 'Export History',
    clear: 'Clear History',
    market_button: 'Online Market Linkage',
    tip: 'Tip: Keep asking follow-ups — the chat will remain continuous.'
  },
  hindi: {
    title: 'AgroAI सहायक',
    subtitle: 'आपका बुद्धिमान कृषि मार्गदर्शक',
    language_label: 'भाषा:',
    soil_placeholder: 'मिट्टी का प्रकार चुनें',
    climate_placeholder: 'जलवायु क्षेत्र चुनें',
    query_placeholder: 'अपना कृषि संबंधी प्रश्न यहाँ पूछें...',
    market_input_placeholder: 'उत्पाद का नाम दर्ज करें (उदा. काजू)',
    get_advice: 'सलाह लें',
    export: 'इतिहास निर्यात',
    clear: 'इतिहास साफ़ करें',
    market_button: 'ऑनलाइन बाज़ार लिंक',
    tip: 'सुझाव: फॉलो-अप पूछें — चैट निरंतर रहेगी।'
  },
  tamil: {
    title: 'AgroAI உதவியாளர்',
    subtitle: 'உங்கள் புத்திசாலி வேளாண் வழிகாட்டி',
    language_label: 'மொழி:',
    soil_placeholder: 'மண் வகையைத் தேர்ந்தெடுக்கவும்',
    climate_placeholder: 'வளிமண்டலத்தைத் தேர்ந்தெடுக்கவும்',
    query_placeholder: 'உங்கள் வேளாண் கேள்வியை இங்கே கேளுங்கள்...',
    market_input_placeholder: 'பொருள் பெயரை உள்ளிடவும் (உதா. கஜு)',
    get_advice: 'ஆலோசனை பெறவும்',
    export: 'வரலாற்றை ஏற்றுமதி செய்',
    clear: 'வரலாற்றை அழி',
    market_button: 'ஆன்லைன் மார்க்கெட் இணைப்பு',
    tip: 'குறிப்பு: தொடர்ச்சியான உரையாடலுக்கு தொடர்ந்து கேளுங்கள்.'
  },
  telugu: {
    title: 'AgroAI సహాయకుడు',
    subtitle: 'మీ తెలివైన వ్యవసాయ మార్గదర్శి',
    language_label: 'భాష:',
    soil_placeholder: 'మట్టి రకాన్ని ఎంచుకోండి',
    climate_placeholder: 'వాతావరణ జోన్ ఎంచుకోండి',
    query_placeholder: 'మీ వ్యవసాయ ప్రశ్నను ఇక్కడ అడగండి...',
    market_input_placeholder: 'ఉత్పత్తి పేరు నమోదు (ఉదా. ఖర్జూర్)',
    get_advice: 'సలహా పొందండి',
    export: 'చరిత్ర ఎగుమతి',
    clear: 'చరిత్ర తొలగించు',
    market_button: 'ఆన్లైన్ మార్కెట్ లింక్',
    tip: 'సూచన: ఫాలో-అప్ అడగండి — చాట్ కొనసాగుతుంది.'
  },
  kannada: {
    title: 'AgroAI ಸಹಾಯಕ',
    subtitle: 'ನಿಮ್ಮ ಬುದ್ಧಿವಂತ ಕೃಷಿ ಮಾರ್ಗದರ್ಶಕ',
    language_label: 'ಭಾಷೆ:',
    soil_placeholder: 'ಮಣ್ಣಿನ ಪ್ರಕಾರ ಆಯ್ಕೆಮಾಡಿ',
    climate_placeholder: 'ವಾತಾವರಣ ವಲಯ ಆಯ್ಕೆಮಾಡಿ',
    query_placeholder: 'ನಿಮ್ಮ ಕೃಷಿ ಪ್ರಶ್ನೆಯನ್ನು ಇಲ್ಲಿ ಕೇಳಿ...',
    market_input_placeholder: 'ಉತ್ಪನ್ನ ಹೆಸರು ನಮೂದಿಸಿ (ಉದಾ. ಕಜು)',
    get_advice: 'ಸಲಹೆ ಪಡೆಯಿ',
    export: 'ಇತಿಹಾಸ ರಫ್ತು',
    clear: 'ಇತಿಹಾಸ ಅಳಿಸಿ',
    market_button: 'ಅನ್ಲೈನ್ ಮಾರುಕಟ್ಟೆ ಲಿಂಕ್',
    tip: 'ಸೂಚನೆ: ಫಾಲೋ-ಅಪ್‌ಗಳನ್ನು ಕೇಳಿ — ಚಾಟ್ ನಿರಂತರವಾಗಿರುತ್ತದೆ.'
  },
  malayalam: {
    title: 'AgroAI സഹായി',
    subtitle: 'നിങ്ങളുടെ ബുദ്ധിമുട്ടുള്ള കാർഷിക മാർഗ്ഗദർശി',
    language_label: 'ഭാഷ:',
    soil_placeholder: 'മണ്ണിന്റെ തരം തിരഞ്ഞെടുക്കുക',
    climate_placeholder: 'കാലാവസ്ഥാ മേഖല തിരഞ്ഞെടുക്കുക',
    query_placeholder: 'നിങ്ങളുടെ കാർഷിക ചോദ്യം ഇവിടെ ചോദിക്കൂ...',
    market_input_placeholder: 'ഉൽപ്പന്നത്തെക്കുറിച്ച് എഴുതി (ഉദാ. കജു)',
    get_advice: 'ഉപദേശം നേടുക',
    export: 'ചരിത്രം എക്സ്പോർട്ട്',
    clear: 'ചരിത്രം നീക്കം ചെയ്യുക',
    market_button: 'ഓൺലൈൻ മാർക്കറ്റ് ലിങ്ക്',
    tip: 'ഇടപെടൽ: ഫോളോ-അപ്പുകൾ ചോദിക്കുക — ചാറ്റ് തുടരും.'
  },
  marathi: {
    title: 'AgroAI सहायक',
    subtitle: 'तुमचा बुद्धिमान कृषी मार्गदर्शक',
    language_label: 'भाषा:',
    soil_placeholder: 'मातीचा प्रकार निवडा',
    climate_placeholder: 'हवामान क्षेत्र निवडा',
    query_placeholder: 'आपला कृषी प्रश्न इथे विचारा...',
    market_input_placeholder: 'उत्पादन नाव प्रविष्ट करा (उदा. काजू)',
    get_advice: 'सल्ला घ्या',
    export: 'इतिहास निर्यात करा',
    clear: 'इतिहास साफ करा',
    market_button: 'ऑनलाइन बाजार लिंक',
    tip: 'टिप: फॉलो-अप प्रश्न विचारत राहा — चॅट सतत राहील.'
  },
  gujarati: {
    title: 'AgroAI સહાયક',
    subtitle: 'તમારો બુદ્ધિમાન કૃષિ માર્ગદર્શક',
    language_label: 'ભાષા:',
    soil_placeholder: 'માટીનો પ્રકાર પસંદ કરો',
    climate_placeholder: 'હવામાન ઝોન પસંદ કરો',
    query_placeholder: 'તમારો કૃષિ પ્રશ્ન અહીં પૂછો...',
    market_input_placeholder: 'ઉત્પાદન નામ દાખલ કરો (ઉદાહરણ: કાજુ)',
    get_advice: 'સલાહ મેળવો',
    export: 'ઇતિહાસ નિકાસ કરો',
    clear: 'ઇતિહાસ સાફ કરો',
    market_button: 'ઓનલાઇન માર્કેટ લિંક',
    tip: 'સૂચન: અનુગામી પ્રશ્નો પૂછો — ચેટ સતત રહેશે.'
  },
  bengali: {
    title: 'AgroAI সহকারী',
    subtitle: 'আপনার বুদ্ধিমান কৃষি গাইড',
    language_label: 'ভাষা:',
    soil_placeholder: 'মাটির ধরন নির্বাচন করুন',
    climate_placeholder: 'আবহাওয়া অঞ্চল নির্বাচন করুন',
    query_placeholder: 'আপনার কৃষি প্রশ্ন এখানে জিজ্ঞাসা করুন...',
    market_input_placeholder: 'পণ্যের নাম লিখুন (উদাহরণ: কাজু)',
    get_advice: 'পরামর্শ পান',
    export: 'ইতিহাস রপ্তানি',
    clear: 'ইতিহাস মুছুন',
    market_button: 'অনলাইন বাজার লিঙ্ক',
    tip: 'টিপ: ফলো-আপ জিজ্ঞাসা করুন — চ্যাট ধারাবাহিক থাকবে।'
  },
  punjabi: {
    title: 'AgroAI ਸਹਾਇਕ',
    subtitle: 'ਤੁਹਾਡਾ ਬੁੱਧਿਮਾਨ ਖੇਤੀਗਾਰੀ ਮਾਰਗਦਰਸ਼ਕ',
    language_label: 'ਭਾਸ਼ਾ:',
    soil_placeholder: 'ਮਿੱਟੀ ਦੀ ਕਿਸਮ ਚੁਣੋ',
    climate_placeholder: 'ਜਲਵਾਯੂ ਖੇਤਰ ਚੁਣੋ',
    query_placeholder: 'ਆਪਣਾ ਖੇਤੀ ਸਵਾਲ ਇੱਥੇ ਪੁਛੋ...',
    market_input_placeholder: 'ਉਤਪਾਦ ਨਾਮ ਦਾਖਲ ਕਰੋ (ਉਦਾਹਰਨ: ਕਾਜੂ)',
    get_advice: 'ਸਲਾਹ ਲਵੋ',
    export: 'ਇਤਿਹਾਸ ਐਕਸਪੋਰਟ',
    clear: 'ਇਤਿਹਾਸ ਹਟਾਓ',
    market_button: 'ਆਨਲਾਈਨ ਮਾਰਕੀਟ ਲਿੰਕ',
    tip: 'ਟਿੱਪ: ਫਾਲੋ-ਅਪ ਪੁੱਛਦੇ ਰਹੋ — ਚੈਟ ਜਾਰੀ ਰਹੇਗੀ।'
  },
  odia: {
    title: 'AgroAI ସହାୟକ',
    subtitle: 'ଆପଣଙ୍କର ବୁଦ୍ଧିମାନ କୃଷି ଗାଇଡ୍',
    language_label: 'ଭାଷା:',
    soil_placeholder: 'ମାଟି ପ୍ରକାର ଚୟନ କରନ୍ତୁ',
    climate_placeholder: 'ଜଳବାୟୁ ଅଞ୍ଚଳ ଚୟନ କରନ୍ତୁ',
    query_placeholder: 'ଆପଣଙ୍କ କୃଷି ପ୍ରଶ୍ନ ଏଠାରେ ପଚାରନ୍ତୁ...',
    market_input_placeholder: 'ପଦାର୍ଥ ନାମ ଲେଖନ୍ତୁ (ଉଦାହରଣ: କାଜୁ)',
    get_advice: 'ପରାମର୍ଶ ନିଅନ୍ତୁ',
    export: 'ଇତିହାସ ଏକ୍ସପୋର୍ଟ',
    clear: 'ଇତିହାସ ମିଟାନ୍ତୁ',
    market_button: 'ଅନଲାଇନ୍ ବଜାର ଲିଙ୍କ',
    tip: 'ସୁଚନା: ଫଲୋ-ଅପ ପ୍ରଶ୍ନ କରନ୍ତୁ — ଚାଟ୍ ଚାଲି ରହିବ।'
  },
  assamese: {
    title: 'AgroAI সহায়ক',
    subtitle: 'আপোনাৰ বুদ্ধিমান কৃষি গাইড',
    language_label: 'ভাষা:',
    soil_placeholder: 'মাটিৰ প্ৰকাৰ বাছনি কৰক',
    climate_placeholder: 'আবহাওয়া অঞ্চল বাছনি কৰক',
    query_placeholder: 'আপোনাৰ কৃষি প্ৰশ্ন ইয়াত সুধক...',
    market_input_placeholder: 'উৎপাদৰ নাম লিখক (উদাহৰণ: কাজু)',
    get_advice: 'পৰামৰ্শ লওক',
    export: 'ইতিহাস ৰপ্তানি',
    clear: 'ইতিহাস মচক',
    market_button: 'অনলাইন বজাৰ লিংক',
    tip: 'টিপ: ফলো-আপ সুধিব — চেট অব্যাহত থাকিব।'
  },
  urdu: {
    title: 'AgroAI معاون',
    subtitle: 'آپ کا ذہین زرعی رہنما',
    language_label: 'زبان:',
    soil_placeholder: 'مٹی کی قسم منتخب کریں',
    climate_placeholder: 'موسمی زون منتخب کریں',
    query_placeholder: 'اپنا زرعی سوال یہاں پوچھیں...',
    market_input_placeholder: 'مصنوع کا نام درج کریں (مثال: کاجو)',
    get_advice: 'مشورہ حاصل کریں',
    export: 'تاریخ برآمد کریں',
    clear: 'تاریخ صاف کریں',
    market_button: 'آن لائن مارکیٹ لنک',
    tip: 'مشورہ: فالو-اپ سوالات پوچھیں — چیٹ برقرار رہے گی۔'
  }
};

/* ---------- Soil/Climate name translations (map by option value) ---------- */
/* Keep values same; only change visible text. Add more as needed. */
const SOIL_NAME_MAP = {
  sandy: {
    english: 'Sandy',
    hindi: 'बालू',
    tamil: 'மணல்',
    telugu: 'ఇసుక',
    kannada: 'ಮಣಸು',
    malayalam: 'മണൽ',
    marathi: 'वालू',
    gujarati: 'વાળું',
    bengali: 'বালু',
    punjabi: 'ਰੇਤੀਲਾ',
    odia: 'ବାଲୁକି',
    assamese: 'বালি',
    urdu: 'ریتلا'
  },
  clay: {
    english: 'Clay',
    hindi: 'चिकनी मिट्टी',
    tamil: 'களிமண்',
    telugu: 'మట్టి',
    kannada: 'ಮಣ್ಣ',
    malayalam: 'മണ്ണ്',
    marathi: 'चिकट माती',
    gujarati: 'ચીની માટી',
    bengali: 'কাদামাটি',
    punjabi: 'ਚਿਕਨ ਮਿੱਟੀ',
    odia: 'ଚିକଣ ମାଟି',
    assamese: 'কলমাটি',
    urdu: 'چکنی مٹی'
  },
  loam: {
    english: 'Loam',
    hindi: 'दोमट',
    tamil: 'இலோமி மண்',
    telugu: 'లోమి',
    kannada: 'ಲಾಗ್',
    malayalam: 'ലോം മണ്ണ്',
    marathi: 'दोंमट',
    gujarati: 'દોમટ',
    bengali: 'দোঁআশ',
    punjabi: 'ਲੋਅਮ',
    odia: 'ଲୋମ୍ ମାଟି',
    assamese: 'লোম মাটি',
    urdu: 'لوم'
  },
  silt: {
    english: 'Silt',
    hindi: 'सिल्ट',
    tamil: 'சிற்று மண்',
    telugu: 'సిల్ట్',
    kannada: 'ಸಿಲ್ಟ್',
    malayalam: 'സിൽട്ട്',
    marathi: 'সলত',
    gujarati: 'સિલ્ટ',
    bengali: 'সিল্ট',
    punjabi: 'ਸਿਲਟ',
    odia: 'ସିଲ୍ଟ',
    assamese: 'সিল্ট',
    urdu: 'سلٹ'
  },
  peat: {
    english: 'Peat',
    hindi: 'पीट',
    tamil: 'பீட் மண்',
    telugu: 'పీట్',
    kannada: 'ಪೀಟ್',
    malayalam: 'പീറ്റ്',
    marathi: 'पीट',
    gujarati: 'પીટ',
    bengali: 'পীদ',
    punjabi: 'ਪੀਟ',
    odia: 'ପିଟ୍',
    assamese: 'পিট',
    urdu: 'پیٹ'
  },
  chalk: {
    english: 'Chalk',
    hindi: 'चाक',
    tamil: 'சாக் மண்',
    telugu: 'చాక్',
    kannada: 'ಚಾಕ್',
    malayalam: 'ചാക്ക്',
    marathi: 'चॉक',
    gujarati: 'ચોક',
    bengali: 'চক',
    punjabi: 'ਚਾਕ',
    odia: 'ଚାକ',
    assamese: 'চক',
    urdu: 'چاک'
  },
  laterite: {
    english: 'Laterite',
    hindi: 'लेटेराइट',
    tamil: 'வேலைட்டைட்',
    telugu: 'లేటరైట్',
    kannada: 'ಲೇಟರೈಟ್',
    malayalam: 'ലേറ്ററൈറ്റിൽ',
    marathi: 'लेटरेट',
    gujarati: 'લેટરાઇટ',
    bengali: 'লেটারাইট',
    punjabi: 'ਲੇਟਰਾਈਟ',
    odia: 'ଲେଟରାଇଟ',
    assamese: 'লেটারাইট',
    urdu: 'لیٹرا ئیٹ'
  },
  saline: {
    english: 'Saline',
    hindi: 'नमकीन',
    tamil: 'உப்புச்செரிவு மண்',
    telugu: 'ఉప్పు నేల',
    kannada: 'ಉಪ್ಪು ಮಣ್ಣು',
    malayalam: 'ഉപ്പുവളർച്ച മണ്ണ്',
    marathi: 'खारी',
    gujarati: 'ખારાશી',
    bengali: 'নোনতা',
    punjabi: 'ਨਮਕੀਨ',
    odia: 'ଲୁଣିଆ',
    assamese: 'নুনীয়া',
    urdu: 'کھارا'
  },
  alluvial: {
    english: 'Alluvial',
    hindi: 'अवैल्वियल',
    tamil: 'நதிநீர் வடிவு மண்',
    telugu: 'అలువియల్',
    kannada: 'ಅಲುವಿಯಲ್',
    malayalam: 'അലൂവിഅൽ',
    marathi: 'अलुवीयल',
    gujarati: 'અલ્યુવિયલ',
    bengali: 'অলুভিয়াল',
    punjabi: 'ਅਲੁਵੀਅਲ',
    odia: 'ଆଲୁଭିୟାଲ',
    assamese: 'অলুভিয়াল',
    urdu: 'الویول'
  },
  black_earth: {
    english: 'Black Earth (Regur)',
    hindi: 'काली जमीन (रिगुर)',
    tamil: 'கருப்பு மண் (ரெகூர்)',
    telugu: 'బ్లాక్ ఎర్త్ (రేగూర్)',
    kannada: 'ಬ್ಲಾಕ್ ಏರ್ಥ್',
    malayalam: 'ബ്ലാക്ക് ഏഥ്',
    marathi: 'ब्लॅक अर्थ',
    gujarati: 'બ્લેક અર્થ',
    bengali: 'ব্ল্যাক আর্থ',
    punjabi: 'ਬਲੈਕ ਅਰਥ',
    odia: 'କଳା ମାଟି',
    assamese: 'ব্লেক আৰ্থ',
    urdu: 'کالی زمین'
  }
};

const CLIMATE_NAME_MAP = {
  tropical: {
    english: 'Tropical',
    hindi: 'उष्णकटिबंधीय',
    tamil: 'வெப்பமண்டல',
    telugu: 'ఉష్ణమండల',
    kannada: 'ಆರಣ್ಯ',
    malayalam: 'ട്രോപിക്കൽ',
    marathi: 'उष्णकटिबंधीय',
    gujarati: 'ઉષ્ણકટિબંધીય',
    bengali: 'উষ্ণমণ্ডলীয়',
    punjabi: 'ਉਸ਼ਣਮੰਡਲ',
    odia: 'ଉଷ୍ଣମଣ୍ଡଳ',
    assamese: 'উষ্ণমণ্ডলীয়',
    urdu: 'گرم خطہ'
  },
  subtropical: {
    english: 'Subtropical',
    hindi: 'उपोष्णकटिबंधीय',
    tamil: 'துணை வெப்பமண்டல',
    telugu: 'సబ్ట్రోపికల్',
    kannada: 'ಉಪ-ಉಷ್ಣ',
    malayalam: 'സബ്-ട്രോപിക്കൽ',
    marathi: 'उप-उष्णकटिबंधीय',
    gujarati: 'સબટ્રોપિકલ',
    bengali: 'উপ-উষ্ণমণ্ডলীয়',
    punjabi: 'ਸਬ-ਟ੍ਰੋਪਿਕਲ',
    odia: 'ସବ୍-ଟ୍ରପିକାଲ୍',
    assamese: 'সাব-ট্রপিকাল',
    urdu: 'ذیلی گرم'
  },
  temperate: {
    english: 'Temperate',
    hindi: 'समशीतोष्ण',
    tamil: 'மிதமான',
    telugu: 'తటస్థ',
    kannada: 'ಸಾಮಾನ್ಯ',
    malayalam: 'ടെംപ്രേറ്റ്',
    marathi: 'समशीतोष्ण',
    gujarati: 'ટેમ્પરેટ',
    bengali: 'মৃদু',
    punjabi: 'ਟੈਮਪਰેટ',
    odia: 'ତାତ୍ତ୍ୱିକ',
    assamese: 'টেম্পাৰেট',
    urdu: 'معتدل'
  },
  arid: {
    english: 'Arid',
    hindi: 'शुष्क',
    tamil: 'உலர்',
    telugu: 'ఎడారి',
    kannada: 'ಬಾಲಿಶುಷ್ಕ',
    malayalam: 'ശുഷ്കം',
    marathi: 'शुष्क',
    gujarati: 'શુષ્ક',
    bengali: 'শুষ্ক',
    punjabi: 'ਸ਼ੁਸ਼ਕ',
    odia: 'ଶୁଷ୍କ',
    assamese: 'শুকনো',
    urdu: 'خشک'
  },
  semi_arid: {
    english: 'Semi-arid',
    hindi: 'अर्ध-शुष्क',
    tamil: 'அரைச் சுறுக்கிய',
    telugu: 'అర్ధ-ఎడారి',
    kannada: 'ಅರ್ಧ-ಶುಷ್ಕ',
    malayalam: 'അർദ്ധ-ശുഷ്കം',
    marathi: 'अर्ध-शुष्क',
    gujarati: 'અર્ધ-શુષ્ક',
    bengali: 'অর্ধ-শুষ্ক',
    punjabi: 'ਅਰਧ-ਸ਼ੁਸ਼ਕ',
    odia: 'ଅର୍ଧ-ଶୁଷ୍କ',
    assamese: 'অর্ধ-শুকনো',
    urdu: 'نیم-خشک'
  },
  montane: {
    english: 'Montane',
    hindi: 'पहाड़ी/मॉन्टेन',
    tamil: 'மலைப்பிரிவு',
    telugu: 'పర్వత',
    kannada: 'ಪರ್ವತೀಯ',
    malayalam: 'പർവത ഇടം',
    marathi: 'पहाडी',
    gujarati: 'પર્વતીય',
    bengali: 'পাহাড়ি',
    punjabi: 'ਪਹਾੜੀ',
    odia: 'ପାହାଡ଼ୀ',
    assamese: 'পাহাৰী',
    urdu: 'پہاڑی'
  },
  coastal: {
    english: 'Coastal',
    hindi: 'तटीय',
    tamil: 'கடற்கரை',
    telugu: 'తీర ప్రాంత',
    kannada: 'ಉಪತಟೀಯ',
    malayalam: 'കടൽത്തീരം',
    marathi: 'किनारी',
    gujarati: 'કાંઠાઇ',
    bengali: 'উপকূলীয়',
    punjabi: 'ਕਿਨਾਰੇ',
    odia: 'କୌଣ୍ଡର',
    assamese: 'উপকূলীয়',
    urdu: 'ساحلی'
  },
  continental: {
    english: 'Continental',
    hindi: 'महाद्वीपीय',
    tamil: 'உலகைப் பின்பற்றி',
    telugu: 'ఖండీయ',
    kannada: 'ಖಂಡೀಯ',
    malayalam: 'ഖണ്ഡീയ',
    marathi: 'खंडीय',
    gujarati: 'ખંડીય',
    bengali: 'মহাদেশীয়',
    punjabi: 'ਤਿਹਾਧੀ',
    odia: 'ମହାଦ୍ୱୀପୀୟ',
    assamese: 'মহাদেশীয়',
    urdu: 'قِیَمی'
  },
  monsoon: {
    english: 'Monsoon',
    hindi: 'मानसून',
    tamil: 'மோன்சூன்',
    telugu: 'మాన్సూన్',
    kannada: 'ಮಾನ್ಸೂನ್',
    malayalam: 'മൺസൂൺ',
    marathi: 'मान्सून',
    gujarati: 'માનસૂન',
    bengali: 'মনসুন',
    punjabi: 'ਮਾਨਸੂਨ',
    odia: 'ମନ୍ସୁନ୍',
    assamese: 'মনসুন',
    urdu: 'مون سون'
  }
};

/* ---------- Helper: translate soil and climate option labels ---------- */
function translateSelectOptions(langKey) {
  // soilSelect options: values correspond to keys in SOIL_NAME_MAP or original descriptive option strings
  Array.from(soilSelect.options).forEach(opt => {
    const key = opt.value;
    if (key === '') {
      // placeholder handled elsewhere
      return;
    }
    if (SOIL_NAME_MAP[key] && SOIL_NAME_MAP[key][langKey]) {
      opt.textContent = SOIL_NAME_MAP[key][langKey];
    } else {
      // fallback: show original value capitalized
      opt.textContent = key.split('_').join(' ').replace(/\b\w/g, c => c.toUpperCase());
    }
  });

  // climateSelect options
  Array.from(climateSelect.options).forEach(opt => {
    const key = opt.value;
    if (key === '') return;
    if (CLIMATE_NAME_MAP[key] && CLIMATE_NAME_MAP[key][langKey]) {
      opt.textContent = CLIMATE_NAME_MAP[key][langKey];
    } else {
      opt.textContent = key.split('_').join(' ').replace(/\b\w/g, c => c.toUpperCase());
    }
  });
}

/* ---------- Apply translations to UI ---------- */
function applyTranslations(langKey) {
  const t = TRANSLATIONS[langKey] || TRANSLATIONS['english'];

  // header & labels
  if (pageTitle) pageTitle.textContent = t.title;
  if (pageSubtitle) pageSubtitle.textContent = t.subtitle; // <-- add this check
  if (languageLabel) languageLabel.textContent = t.language_label;

  // buttons & placeholders
  askBtn.textContent = t.get_advice;
  exportBtn.textContent = t.export;
  clearBtn.textContent = t.clear;
  marketBtn.textContent = t.market_button;
  queryEl.placeholder = t.query_placeholder;
  if (marketCropInput) marketCropInput.placeholder = t.market_input_placeholder;
  if (topTip) topTip.textContent = t.tip;

  // first placeholder options inside selects
  const soilFirst = soilSelect.querySelector('option[value=""]');
  const climateFirst = climateSelect.querySelector('option[value=""]');
  if (soilFirst) soilFirst.textContent = t.soil_placeholder;
  if (climateFirst) climateFirst.textContent = t.climate_placeholder;

  // translate actual options
  translateSelectOptions(langKey);
}


/* ---------- Chat history helpers ---------- */
function loadHistory() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const obj = JSON.parse(raw);
    messages = obj.messages || [];
    renderMessages();
  } catch (e) {
    console.error('Failed to parse history', e);
  }
}
function saveHistory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, savedAt: new Date().toISOString() }));
}
function renderMessages() {
  chatHistoryEl.innerHTML = '';
  messages.forEach(m => addMessageElement(m.role, m.content, m.timestamp));
}
function addMessageElement(role, content, ts) {
  const el = document.createElement('div');
  el.className = `message ${role === 'user' ? 'user-message' : 'bot-message'}`;
  // content may contain HTML for product cards; use innerHTML safely because content comes from our server
  el.innerHTML = content;
  if (ts) {
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = new Date(ts).toLocaleString();
    el.appendChild(meta);
  }
  chatHistoryEl.appendChild(el);
  chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
}
function setLoading(on = true) {
  if (on) addMessageElement('assistant', 'Thinking...');
  else {
    const last = chatHistoryEl.lastElementChild;
    if (last && last.textContent && last.textContent.includes('Thinking')) last.remove();
  }
}

/* ---------- Core: Get Advice (sends language to server) ---------- */
async function getAdvice() {
  const soil = soilSelect.value;
  const climate = climateSelect.value;
  const query = queryEl.value.trim();
  const lang = languageEl.value || 'english';

  if (!query) {
    // inform user in currently selected language if possible
    alert((TRANSLATIONS[lang] && TRANSLATIONS[lang].query_placeholder) ? TRANSLATIONS[lang].query_placeholder : 'Please enter a question.');
    return;
  }

  let usingContext = false;
  if (soil && climate) {
    usingContext = true;
    // operate on per-(soil,climate) chat history
    loadHistoryForContext(soil, climate);

    // ensure a system context message exists
    const contextContent = `Soil: ${soil} | Climate: ${climate}\nPlease always answer user queries taking into account these soil and climate conditions.`;
    if (!messages.length || messages[0].role !== 'system' || messages[0].content !== contextContent) {
      messages.unshift({ role: 'system', content: contextContent, timestamp: new Date().toISOString() });
    }
  } else {
    // general chat: load global history
    loadHistory();
  }

  const userMsg = {
    role: 'user',
    content: `${query}`,
    timestamp: new Date().toISOString()
  };
  messages.push(userMsg);
  if (usingContext) saveHistoryForContext(soil, climate); else saveHistory();
  addMessageElement('user', userMsg.content, userMsg.timestamp);
  setLoading(true);

  try {
    const res = await fetch('/get_advice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        soil_type: soil,
        climate: climate,
        language: lang,
        messages: messages.map(m => ({ role: m.role, content: m.content }))
      })
    });
    const data = await res.json();
    setLoading(false);
    const botMsg = {
      role: 'assistant',
      content: data.response,
      timestamp: data.timestamp || new Date().toISOString()
    };
    messages.push(botMsg);
    saveHistoryForContext(soil, climate);
    addMessageElement('assistant', botMsg.content, botMsg.timestamp);
  } catch (err) {
    console.error(err);
    setLoading(false);
    addMessageElement('assistant', 'Error connecting to server.');
  }
  queryEl.value = '';
}

/* ---------- Online market linkage (calls /market_online) ---------- */
async function getMarketInfo() {
  // The inline market search may have been moved to its own page. Guard against missing elements.
  if (!marketCropInput) {
    addMessageElement('assistant', 'Please use the Market page to search products.');
    return;
  }

  const product = marketCropInput.value.trim();
  const lang = languageEl.value || 'english';
  if (!product) {
    alert((TRANSLATIONS[lang] && TRANSLATIONS[lang].market_input_placeholder) ? TRANSLATIONS[lang].market_input_placeholder : 'Enter a product name.');
    return;
  }

  addMessageElement('assistant', `🔍 Searching online for "${product}"...`);

  try {
    const res = await fetch(`/market_online?product=${encodeURIComponent(product)}`);
    const data = await res.json();
    if (!data.results || data.results.length === 0) {
      addMessageElement('assistant', (TRANSLATIONS[lang] && TRANSLATIONS[lang].market_button) ? 'No online results found.' : 'No online results found.');
      return;
    }

    // build product cards HTML
    const cards = data.results.map(item => {
      const title = escapeHtml(item.title || `${product}`);
      const desc = escapeHtml(item.description || '');
      const link = escapeHtml(item.link || '#');
      const src = escapeHtml(item.source || 'Online');
      return `<div class="product-card">
                <div class="product-card-title">${title}</div>
                <div class="product-card-desc">${desc}</div>
                <div class="product-card-link"><a href="${link}" target="_blank" rel="noopener noreferrer">🛒 Buy on ${src}</a></div>
              </div>`;
    }).join('');

    const content = `<h3>🛍️ Online Results for "${escapeHtml(product)}"</h3>${cards}`;
    const assistantMsg = { role: 'assistant', content, timestamp: new Date().toISOString() };
    messages.push(assistantMsg);
    saveHistory();
    addMessageElement('assistant', content, assistantMsg.timestamp);
  } catch (err) {
    console.error(err);
    addMessageElement('assistant', 'Error fetching online product data.');
  }
}

/* ---------- Utilities ---------- */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function exportHistory() {
  const blob = new Blob([JSON.stringify({ messages }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'agroai_chat_history.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function clearHistory() {
  if (!confirm('Clear chat history?')) return;
  messages = [];
  localStorage.removeItem(STORAGE_KEY);
  chatHistoryEl.innerHTML = '';
}

/* ---------- Event listeners ---------- */
askBtn.addEventListener('click', getAdvice);
exportBtn.addEventListener('click', exportHistory);
clearBtn.addEventListener('click', clearHistory);
if (marketBtn && marketCropInput) marketBtn.addEventListener('click', getMarketInfo);
// If market button is a link (navigates to /market), we don't attach listener so navigation works.
languageEl.addEventListener('change', (e) => {
  const lang = e.target.value;
  applyTranslations(lang);
});

/* ---------- Initialize on load ---------- */
(function init() {
  // Require client-side login before using the app
  const loggedIn = localStorage.getItem('agroai_logged_in') === 'true';
  if (!loggedIn && window.location.pathname !== '/login' && window.location.pathname !== '/register') {
    window.location.href = '/login';
    return;
  }

  // Make sure default language applied and options translated
  const initialLang = languageEl.value || 'english';
  applyTranslations(initialLang);

  // try to load last used context (soil::climate)
  const last = localStorage.getItem('agroai_last_context');
  if (last) {
    const parts = last.split('::');
    if (parts.length === 2) {
      soilSelect.value = parts[0] || '';
      climateSelect.value = parts[1] || '';
      if (soilSelect.value && climateSelect.value) {
        loadHistoryForContext(soilSelect.value, climateSelect.value);
        renderMessages();
      }
    }
  } else {
    // fallback to global history if present
    loadHistory();
  }
})();
