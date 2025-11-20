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
    model = genai.GenerativeModel("gemini-2.5-pro")
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


# ---------- Real-Time Market Price (INR/kg) ----------
import os

DATA_GOV_API_KEY = os.getenv("DATA_GOV_API_KEY")        # get this from https://data.gov.in/ (register -> API key)
DATA_GOV_RESOURCE_ID = os.getenv("DATA_GOV_RESOURCE_ID")  # dataset resource id (open dataset page -> API -> copy resource_id)
# Example dataset page (Agmarknet daily prices) on data.gov.in: "Current daily price of various commodities from various markets (Mandi)". :contentReference[oaicite:3]{index=3}

def query_data_gov_price(product):
    """
    Query data.gov.in Agmarknet dataset for the latest record matching `product`.
    Returns a dict like: {'source':'DATA_GOV', 'price_per_kg': float, 'unit': 'INR/kg', 'market': '...', 'date': 'YYYY-MM-DD'}
    or None if not available / on error.
    """
    if not DATA_GOV_API_KEY or not DATA_GOV_RESOURCE_ID:
        return None

    try:
        # Build request params. data.gov.in API accepts filters like filters[commodity]=<name>
        base = f"https://api.data.gov.in/resource/{DATA_GOV_RESOURCE_ID}"
        params = {
            "api-key": DATA_GOV_API_KEY,
            "format": "json",
            # using commodity filter (field name on resource may vary; try common keys)
            "filters[commodity]": product,
            "limit": 5,
            "offset": 0,
            # sort by date descending if supported
            "sort[price_date]": "desc"
        }

        r = requests.get(base, params=params, timeout=12)
        if r.status_code != 200:
            # try without filters key name (some datasets use 'commodity' or 'Commodity')
            # fallback: try simple search endpoint with q param
            alt_params = {
                "api-key": DATA_GOV_API_KEY,
                "format": "json",
                "q": product,
                "limit": 5
            }
            r = requests.get(base, params=alt_params, timeout=12)
            if r.status_code != 200:
                return None

        payload = r.json()
        records = payload.get("records") or payload.get("result") or payload.get("data") or []
        if not records:
            return None

        # pick the most recent record that has a numeric price
        # dataset fields vary; look for modal_price / modalprice / min_price / max_price etc.
        price = None
        unit = "INR/kg"
        market = None
        date = None

        for rec in records:
            # find common fields robustly
            # some datasets use 'modal_price', 'Modal Price', 'modalprice', etc.
            # We'll try a set of likely keys
            # Also record may include price_unit or quoted unit (e.g., 'Quintal' or 'kg')
            lower_keys = {k.lower(): k for k in rec.keys()}
            def get_field(possible):
                for p in possible:
                    k = lower_keys.get(p.lower())
                    if k and rec.get(k) not in (None, "", "NA"):
                        return rec.get(k)
                return None

            modal = get_field(["modal_price", "modalprice", "modal price", "modal"])
            minp  = get_field(["min_price", "minprice", "min price"])
            maxp  = get_field(["max_price", "maxprice", "max price"])
            unit_field = get_field(["price_unit", "unit", "priceunit"])
            date = get_field(["price_date", "date", "recorded_date", "trade_date"]) or date
            market = get_field(["market", "market_name", "marketname", "marketplace"]) or market

            chosen = modal or ( (float(minp)+float(maxp))/2 if minp and maxp else None ) or minp or maxp
            if chosen:
                # try convert to float (strip commas, rupee symbols)
                s = str(chosen).replace(",", "").replace("Rs.", "").replace("₹", "").strip()
                try:
                    price_value = float(s)
                except Exception:
                    # price may be non-numeric, skip
                    price_value = None
                if price_value:
                    # determine unit: if unit_field contains 'Quintal' -> convert to per kg
                    u = (unit_field or "").lower() if unit_field else ""
                    if "quintal" in u:
                        # price is per quintal (100 kg)
                        price_per_kg = round(price_value / 100.0, 2)
                        unit = "INR/kg"
                    elif "kg" in u or "kilogram" in u:
                        price_per_kg = round(price_value, 2)
                        unit = "INR/kg"
                    elif "ton" in u or "tonne" in u:
                        # per tonne -> divide by 1000
                        price_per_kg = round(price_value / 1000.0, 2)
                        unit = "INR/kg"
                    else:
                        # unknown unit: many Agmarknet records are per Quintal, assume quintal if no unit and value large (>100)
                        if price_value > 1000:
                            price_per_kg = round(price_value / 100.0, 2)
                        else:
                            price_per_kg = round(price_value, 2)
                    return {
                        "source": "DATA_GOV",
                        "price_per_kg": price_per_kg,
                        "raw_price": price_value,
                        "raw_unit": unit_field or "unknown",
                        "unit": unit,
                        "market": market,
                        "date": date
                    }
        return None
    except Exception as e:
        # don't crash server on any errors
        print("DATA_GOV query error:", e)
        return None

@app.route('/market_online', methods=['GET'])
def msp_rate():
    crop = request.args.get('product', '').strip().lower()
    if not crop:
        return jsonify({'error': 'Please provide a crop name'})

    API_KEY = os.getenv("DATA_GOV_API_KEY")
    RESOURCE_ID = "6f655085-856d-4246-a516-5d6b3bebb990"
    url = f"https://api.data.gov.in/resource/{RESOURCE_ID}?api-key={API_KEY}&format=json&limit=100"

    def quintal_to_kg(price_quintal):
        """Convert ₹ per quintal to ₹ per kg (1 quintal = 100 kg)."""
        try:
            return round(float(price_quintal) / 100.0, 2)
        except (TypeError, ValueError):
            return None

    # Static short information for well-known crops
    product_info = {
        "wheat": {
            "desc": "Wheat is a staple cereal grain widely used in breads and rotis.",
            "benefits": "Rich in fiber and protein; aids digestion and heart health.",
            "calories": "3.4 kcal/g"
        },
        "rice": {
            "desc": "Rice is a key energy food and staple in most Indian diets.",
            "benefits": "Provides quick energy and essential carbohydrates.",
            "calories": "3.6 kcal/g"
        },
        "gram": {
            "desc": "Gram (chickpea) is a protein-rich legume used in various dishes.",
            "benefits": "Supports muscle growth and balances blood sugar.",
            "calories": "3.8 kcal/g"
        },
        "mustard": {
            "desc": "Mustard seeds are used for spice, oil extraction, and condiments.",
            "benefits": "Boosts metabolism and contains anti-inflammatory compounds.",
            "calories": "5.0 kcal/g"
        },
        "barley": {
            "desc": "Barley is a nutrient-dense cereal known for its earthy flavor.",
            "benefits": "Lowers cholesterol and promotes gut health.",
            "calories": "3.5 kcal/g"
        }
    }

    try:
        response = requests.get(url, timeout=10)
        data = response.json()
        records = data.get("records", [])

        match = next(
            (r for r in records if crop in r.get("rabi_crop_wise", "").lower()),
            None
        )

        if not match:
            return jsonify({
                "results": [{
                    "title": f"No MSP data found for '{crop}'.",
                    "description": "Try common Rabi crops like Wheat, Gram, Barley, Mustard, etc.",
                    "source": "data.gov.in"
                }]
            })

        msp_2025 = match.get("_2025_26___msp")
        msp_per_kg = quintal_to_kg(msp_2025)

        info = product_info.get(crop, {
            "desc": "An agricultural product widely cultivated across India.",
            "benefits": "Provides essential nutrients and supports human health.",
            "calories": "Varies between 3–5 kcal/g"
        })

        return jsonify({
            "results": [{
                "title": f"{match.get('rabi_crop_wise', crop).title()} — MSP (2025-26)",
                "description": (
                    f"MSP: ₹{msp_2025}/quintal (₹{msp_per_kg}/kg)\n"
                    f"Short Description: {info['desc']}\n"
                    f"Health Benefits: {info['benefits']}\n"
                    f"Calories per gram: {info['calories']}"
                ),
                "price_in_inr_per_kg": f"₹{msp_per_kg}/kg",
                "source": "Government of India (Rajya Sabha)"
            }]
        })

    except Exception as e:
        return jsonify({
            "error": f"Failed to fetch MSP data: {e}"
        })




if __name__ == "__main__":
    app.run(debug=True)
