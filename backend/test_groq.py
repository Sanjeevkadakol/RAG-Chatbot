import os
from langchain_groq import ChatGroq
from dotenv import load_dotenv

load_dotenv()

def test_groq():
    try:
        llm = ChatGroq(model_name="llama-3.3-70b-versatile", temperature=0.3)
        response = llm.invoke("Hello, are you working?")
        print(f"Response: {response.content}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_groq()
