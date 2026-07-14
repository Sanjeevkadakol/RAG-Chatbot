import os
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

load_dotenv()

def test_llm():
    try:
        llm = ChatGoogleGenerativeAI(model="gemini-flash-latest", temperature=0.3)
        response = llm.invoke("Hello, are you working?")
        print(f"Response: {response.content}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_llm()
