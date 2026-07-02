# test_gemini.py

import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

if not client.api_key:
    raise ValueError("GEMINI_API_KEY not found")


response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Say hello to CareerGenesis"
)

print(response.text)