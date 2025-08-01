import os
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    raise ValueError("GOOGLE_API_KEY not found. Please set it in your .env file.")

genai.configure(api_key=api_key)

class DocumentRequest(BaseModel):
    text: str

class ProcessedResponse(BaseModel):
    summary: str
    classification: str

app = FastAPI(
    title="DocuIntel AI Service (Gemini Pro)",
    description="Provides advanced document processing using Google's Gemini Pro model.",
    version="3.0.0" 
)

def process_document_with_gemini(document_text: str) -> dict:
    """
    Sends the document text to Gemini Pro with a specific prompt
    to get both a summary and a classification.
    """
    candidate_labels = [
        # Original categories
        'Invoice',
        'Legal Contract',
        'Resume',
        'Meeting Notes',
        'Scientific Paper',
        'News Article',
        'Fiction',
        'Study Material',
        'General Document',

        # Administrative & Operational
        'Report',
        'Presentation',
        'Memo',
        'Checklist',
        'Form',
        'Manual / User Guide',
        'Policy Document',
        'SOP (Standard Operating Procedure)',

        # Business & Finance
        'Receipt',
        'Purchase Order',
        'Financial Statement',
        'Business Proposal',
        'Tax Document',

        # Educational & Research
        'Thesis / Dissertation',
        'Lecture Notes',
        'Exam Paper',
        'Assignment',
        'Book Chapter',
        'Whitepaper',

        # Web / Digital Content
        'Blog Post',
        'Email',
        'Web Page Snapshot',
        'Newsletter',
        'Forum Post / Q&A',

        # Miscellaneous / Other
        'Cover Letter',
        'Project Plan',
        'Source Code',
        'Scanned Document',
        'Confidential Document',
        'Legal Notice',
        'Medical Record',
        'Prescription',
        'Advertisement / Brochure',
        'Event Agenda',
        'Personal Notes',
        'Creative Writing',
        'Transcript'
    ]

    prompt = f"""
    You are an intelligent document assistant.

    Please analyze the following document and complete these two tasks:

    1. **Summarize**  
    Provide a concise, professional summary of the document. Use an **abstractive style**, focusing on key ideas, not just copying sentences. Make it clear and easy to understand.

    2. **Classify**  
    Classify the document into the **single most appropriate** category from the list below:  
    {', '.join(candidate_labels)}  
    Only select one label.

    ⚠️ Your response **must** be a valid JSON object with this structure:
    {{
      "summary": "<your summary here>",
      "classification": "<exact label from the list>"
    }}

    Now analyze this document:
    ---
    {document_text}
    ---
    """

    try:
        model = genai.GenerativeModel('gemini-1.5-flash-latest')
        response = model.generate_content(prompt)
        cleaned_response_text = response.text.strip().replace("```json", "").replace("```", "")
        import json
        processed_data = json.loads(cleaned_response_text)
        if "summary" not in processed_data or "classification" not in processed_data:
            raise ValueError("Gemini response did not contain 'summary' or 'classification' keys.")
        return processed_data
    except Exception as e:
        print(f"An error occurred while processing with Gemini: {e}")
        return {
            "summary": "Error processing document with AI.",
            "classification": "Unclassified"
        }

@app.post("/process-document", response_model=ProcessedResponse)
async def process_document_endpoint(request: DocumentRequest):
    """
    Accepts document text and returns a high-quality summary and classification
    from the Gemini Pro model.
    """
    if not request.text or request.text.isspace():
        raise HTTPException(status_code=400, detail="Text content cannot be empty.")

    result = process_document_with_gemini(request.text)
    
    return result

@app.get("/")
def read_root():
    return {"message": "DocuIntel Gemini AI Service is running."}