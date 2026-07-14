import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=api_key)

try:
    model = genai.GenerativeModel('gemini-flash-latest')
    response = model.generate_content("Say 'Gemini API is working!' if you can hear me.")
    print(response.text)
except Exception as e:
    print(f"Error: {str(e)}")
