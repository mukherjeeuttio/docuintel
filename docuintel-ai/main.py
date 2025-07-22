from fastapi import FastAPI
from pydantic import BaseModel
from transformers import pipeline
import torch

try:
    summarizer = pipeline("summarization", model="t5-small")
    print("Summarization model loaded successfully.")
except Exception as e:
    summarizer = None
    print(f"CRITICAL: Could not load summarization model: {e}")

try:
    classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
    print("Classification model loaded successfully.")
except Exception as e:
    classifier = None
    print(f"CRITICAL: Could not load classification model: {e}")

class TextRequest(BaseModel):
    text: str

class SummarizeResponse(BaseModel):
    summary: str

class ClassifyResponse(BaseModel):
    classification: str
    confidence: float

app = FastAPI(
    title="DocuIntel AI Service",
    description="Provides fast text summarization and flexible zero-shot classification.",
    version="1.0.2" 
)

@app.get("/")
def read_root():
    return {"message": "Docuintel AI Service v2 is running."}

@app.post("/summarize", response_model=SummarizeResponse)
def summarize_text(request: TextRequest):
    """
    Accepts text and returns a summarized version using a faster model.
    """
    if not summarizer:
        return {"summary": "Summarization model is not available."}
        
    summary_list = summarizer(request.text, max_length=150, min_length=30, truncation=True)
    summary_text = summary_list[0]['summary_text']
    
    return {"summary": summary_text}

@app.post("/classify", response_model=ClassifyResponse)
def classify_text(request: TextRequest):
    """
    Accepts text and classifies it into one of the candidate labels.
    """
    if not classifier:
        return {"classification": "Model not available.", "confidence": 0.0}

    CONFIDENCE_THRESHOLD = 0.35

    candidate_labels = ['invoice', 'legal contract', 'resume', 'meeting notes', 'scientific paper', 'news article', 'fiction', 'study material']
    
    result = classifier(request.text, candidate_labels)
    
    top_label = result['labels'][0]
    top_score = result['scores'][0]

    if top_score >= CONFIDENCE_THRESHOLD:
        final_classification = top_label
        final_confidence= top_score
    else:
        final_classification = 'Unclassified Document'
        final_confidence = top_score
    
    return {
        "classification": final_classification,
        "confidence": final_confidence
    }