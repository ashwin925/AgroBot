from flask import Flask, render_template, request, jsonify
import google.generativeai as genai
from dotenv import load_dotenv
import os
import requests
from datetime import datetime

load_dotenv()
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "dev-secret")

# Gemini config
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    model = genai.GenerativeModel("gemini-2.0-flash-exp")
else:
    model = None

# ----- Extended static data -----
SOIL_TYPES = {
    "sandy": "Light, well-draining soil suitable for root vegetables",
    "clay": "Heavy, nutrient-rich soil good for many crops",
    "loam": "Ideal soil type with good drainage and nutrient retention",
    "silt": "Fertile soil good for vegetable gardening",
    "peat": "Acidic, high-organic matter soil good for some vegetables",
    "chalk": "Alkaline, shallow soil on chalk or limestone; good for some grasses",
    "laterite": "Rich in iron and aluminium — common in tropical regions",
    "saline": "High salt content; needs reclamation for most crops",
    "alluvial": "Highly fertile soils deposited by rivers — widely used for cereals",
    "black_earth": "Regur soil rich in clay; ideal for cotton"
}

CLIMATE_ZONES = {
    "tropical": "Hot and humid year-round",
    "subtropical": "Hot summers and mild winters",
    "temperate": "Moderate temperatures with distinct seasons",
    "arid": "Hot and dry with minimal rainfall",
    "semi_arid": "Low rainfall, more evaporation than precipitation",
    "montane": "Cooler, high-altitude climates",
    "coastal": "Moderate temperatures with sea influence",
    "continental": "High seasonal extremes",
    "monsoon": "Distinct wet and dry monsoon seasons"
}


# ---------- Helpers ----------
def build_system_prompt(language_code):
    """Create a system instruction forcing Gemini to reply in selected language."""
    lc = (language_code or "english").lower()

    lang_prompts = {
        "tamil": "நீங்கள் AgroAI உதவியாளர். எந்த மொழியில் கேள்வி கேட்டாலும், பதில்களை தமிழில் அளிக்கவும்.",
        "hindi": "आप AgroAI सहायक हैं। प्रश्न किसी भी भाषा में हो, उत्तर हमेशा हिंदी में दें।",
        "telugu": "మీరు AgroAI సహాయకుడు. వినియోగదారు ఏ భాషలో అడిగినా, సమాధానాలు ఎప్పుడూ తెలుగులో ఇవ్వండి.",
        "kannada": "ನೀವು AgroAI ಸಹಾಯಕರು. ಯಾವ ಭಾಷೆಯಲ್ಲಾದರೂ ಪ್ರಶ್ನೆ ಬಂದರೂ, ಉತ್ತರವನ್ನು ಕನ್ನಡದಲ್ಲಿ ನೀಡಿ.",
        "malayalam": "നിങ്ങൾ AgroAI സഹായി ആണ്. ചോദ്യം ഏത് ഭാഷയിലായാലും മറുപടി മലയാളത്തിലായിരിക്കും.",
        "marathi": "तुम्ही AgroAI सहाय्यक आहात. कोणत्याही भाषेत प्रश्न असला तरी उत्तर मराठीत द्या.",
        "gujarati": "તમે AgroAI સહાયક છો. પ્રશ્ન કોઈપણ ભાષામાં હોય, ઉત્તર હંમેશા ગુજરાતીમાં આપો.",
        "bengali": "আপনি AgroAI সহকারী। প্রশ্ন যেকোনো ভাষায় হলেও উত্তর বাংলায় দিন।",
        "punjabi": "ਤੁਸੀਂ AgroAI ਸਹਾਇਕ ਹੋ। ਸਵਾਲ ਕਿਸੇ ਵੀ ਭਾਸ਼ਾ ਵਿੱਚ ਹੋਵੇ, ਉੱਤਰ ਪੰਜਾਬੀ ਵਿੱਚ ਦਿਓ।",
        "odia": "ଆପଣ AgroAI ସହାୟକ। ପ୍ରଶ୍ନ କେହି ଭାଷାରେ ହେଉ, ଉତ୍ତର ଓଡ଼ିଆରେ ଦିଅନ୍ତୁ।",
        "assamese": "আপুনি AgroAI সহায়ক। যিকোনো ভাষাত প্ৰশ্ন হ’লেও উত্তৰ অসমীয়া দিব।",
        "urdu": "آپ AgroAI معاون ہیں۔ سوال کسی بھی زبان میں ہو، جواب ہمیشہ اردو میں دیں۔",
    }

    if lc in lang_prompts:
        return lang_prompts[lc]
    return "You are AgroAI, an expert agricultural assistant. No matter the input, always respond in English."


def call_gemini_chat(messages, language="english"):
    """Send conversation and enforce response language."""
    if model is None:
        return "Gemini API key missing. Please configure GOOGLE_API_KEY in .env."

    system_prompt = build_system_prompt(language)
    convo = system_prompt + "\n\n"
    for m in messages:
        role = "User" if m["role"] == "user" else "Assistant"
        convo += f"{role}: {m['content']}\n"

    try:
        resp = model.generate_content(convo)
        return resp.text.strip()
    except Exception as e:
        return f"Error from Gemini: {e}"


# ---------- Routes ----------
@app.route('/')
def home():
    return render_template('index.html', soil_types=SOIL_TYPES, climate_zones=CLIMATE_ZONES)


@app.route('/get_advice', methods=['POST'])
def get_advice():
    data = request.get_json() or {}
    soil = data.get("soil_type")
    climate = data.get("climate")
    language = data.get("language", "english")
    messages = data.get("messages", [])

    if not messages:
        q = data.get("query", "")
        messages = [{"role": "user", "content": f"Soil: {soil}\nClimate: {climate}\nQuery: {q}"}]

    answer = call_gemini_chat(messages, language)
    ts = datetime.utcnow().isoformat() + "Z"
    return jsonify({"response": answer, "timestamp": ts})


# ---------- Online Market Linkage ----------
@app.route('/market_online', methods=['GET'])
def market_online():
    product = request.args.get('product', '')
    if not product:
        return jsonify({'results': []})

    try:
        results = [
            {"title": f"{product} on Amazon", "description": "Available for online purchase", "link": f"https://www.amazon.in/s?k={product}", "source": "Amazon"},
            {"title": f"{product} on Flipkart", "description": "Find the best prices", "link": f"https://www.flipkart.com/search?q={product}", "source": "Flipkart"},
            {"title": f"{product} on BigBasket", "description": "Order now for home delivery", "link": f"https://www.bigbasket.com/ps/?q={product}", "source": "BigBasket"}
        ]
        return jsonify({'results': results})
    except Exception as e:
        print("Error fetching product data:", e)
        return jsonify({'results': [], 'error': str(e)})


if __name__ == "__main__":
    app.run(debug=True)
