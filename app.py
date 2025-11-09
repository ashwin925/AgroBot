from flask import Flask, render_template, request, jsonify
import google.generativeai as genai
from dotenv import load_dotenv
import os
from datetime import datetime

# ----------------------------------------------------------
#  CONFIG
# ----------------------------------------------------------
load_dotenv()
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "dev-key")

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# Preload model (Gemini-1.5-flash is fast + multilingual)
model = genai.GenerativeModel("gemini-2.5-flash")

# ----------------------------------------------------------
#  STATIC DATA
# ----------------------------------------------------------
SOIL_TYPES = {
    'sandy': 'Light, well-draining soil suitable for root vegetables',
    'clay': 'Heavy, nutrient-rich soil good for many crops',
    'loam': 'Ideal soil with good drainage and nutrient retention',
    'silt': 'Fertile soil good for vegetable gardening'
}

CLIMATE_ZONES = {
    'tropical': 'Hot and humid year-round',
    'subtropical': 'Hot summers and mild winters',
    'temperate': 'Moderate temperatures with distinct seasons',
    'arid': 'Hot and dry with minimal rainfall'
}

SAMPLE_MARKET = {
    'rice': {'price_per_kg': 25.0, 'link': 'https://example.com/market/rice'},
    'wheat': {'price_per_kg': 22.5, 'link': 'https://example.com/market/wheat'},
    'cotton': {'price_per_kg': 120.0, 'link': 'https://example.com/market/cotton'},
    'banana': {'price_per_kg': 18.0, 'link': 'https://example.com/market/banana'},
    'mango': {'price_per_kg': 60.0, 'link': 'https://example.com/market/mango'},
}

# ----------------------------------------------------------
#  CHAT HANDLER
# ----------------------------------------------------------
def call_gemini_chat(messages, language=None):
    """Send full conversation to Gemini and return assistant reply."""
    try:
        # Build conversation text for Gemini (it accepts one prompt string)
        convo_text = ""
        for msg in messages:
            prefix = "User:" if msg["role"] == "user" else "Assistant:"
            convo_text += f"{prefix} {msg['content']}\n"

        if language and language.lower() in ["tamil", "ta", "தமிழ்"]:
            system_prompt = (
                "நீங்கள் AgroAI உதவியாளர். எல்லா பதில்களையும் தமிழில் வழங்கவும். "
                "விவசாயம் மற்றும் சந்தை தொடர்பான தெளிவான, நடைமுறை விளக்கங்களைத் தாருங்கள்.\n"
            )
        else:
            system_prompt = (
                "You are AgroAI, a helpful agricultural assistant. "
                "Give clear, practical farming and market advice.\n"
            )

        full_prompt = system_prompt + convo_text

        response = model.generate_content(full_prompt)
        return response.text.strip()
    except Exception as e:
        return f"Error from Gemini: {e}"

# ----------------------------------------------------------
#  ROUTES
# ----------------------------------------------------------
@app.route('/')
def home():
    return render_template('index.html', soil_types=SOIL_TYPES, climate_zones=CLIMATE_ZONES)

@app.route('/get_advice', methods=['POST'])
def get_advice():
    data = request.get_json()
    soil_type = data.get('soil_type')
    climate = data.get('climate')
    language = data.get('language', 'english')
    messages = data.get('messages')

    if not messages:
        query = data.get('query', '')
        msg = f"Soil Type: {soil_type}\nClimate: {climate}\nQuery: {query}"
        messages = [{"role": "user", "content": msg}]

    answer = call_gemini_chat(messages, language)
    ts = datetime.utcnow().isoformat() + 'Z'
    return jsonify({'response': answer, 'timestamp': ts})

@app.route('/market', methods=['GET'])
def market():
    crop = request.args.get('crop', '').strip().lower()
    if not crop:
        return jsonify({'error': 'Please provide crop parameter, e.g. ?crop=rice'}), 400

    info = SAMPLE_MARKET.get(crop)
    if not info:
        return jsonify({
            'crop': crop,
            'message': f"No static data for '{crop}'. Try searching a mandi portal.",
            'suggested_link': f'https://www.google.com/search?q={crop}+market+price'
        })
    return jsonify({'crop': crop, 'price_per_kg': info['price_per_kg'], 'link': info['link']})

if __name__ == '__main__':
    app.run(debug=True)
