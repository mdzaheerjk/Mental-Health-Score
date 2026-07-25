import os
import joblib
import pandas as pd
from typing import Literal
from fastapi import FastAPI
from pydantic import BaseModel, Field
from fastapi.responses import FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(BASE_DIR, 'Mental_Health_model.pkl')
model = joblib.load(MODEL_PATH)

top_countries = ['Other', 'India', 'USA', 'Canada', 'Australia', 'UK', 'Germany', 'Mexico', 'Turkey', 'France']

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class StudentData(BaseModel):
    age: int = Field(..., ge=10, le=100)
    gender: Literal['Male', 'Female']
    country: str
    academic_level: Literal['Undergraduate', 'Graduate', 'High School']
    most_used_platform: Literal['Facebook', 'LinkedIn', 'Instagram', 'Snapchat', 'Twitter', 'YouTube', 'TikTok', 'LINE', 'KakaoTalk', 'VKontakte', 'WhatsApp', 'WeChat']
    purpose_of_use: Literal['Networking', 'Education', 'Entertainment', 'News']
    avg_daily_usage_hours: float = Field(..., ge=0, le=24)
    daily_unlocks: int = Field(..., ge=0)
    study_hours: float = Field(..., ge=0, le=24)
    physical_activity_hours: float = Field(..., ge=0, le=24)
    sleep_hours_per_night: float = Field(..., ge=0, le=24)
    stress_level: Literal['Medium', 'Low', 'Very High', 'High']

class PredictionResponse(BaseModel):
    predicted_mental_health_score: float

# Route for rendering UI Form layout page
@app.get('/')
def serve_ui():
    return FileResponse(os.path.join(BASE_DIR, 'index.html'))

# Route for serving style sheet text directly to browser cache
@app.get('/style.css')
def serve_css():
    return Response(content=open(os.path.join(BASE_DIR, 'style.css'), 'r').read(), media_type='text/css')

# Route for serving your JavaScript execution file logic
@app.get('/script.js')
def serve_js():
    return Response(content=open(os.path.join(BASE_DIR, 'script.js'), 'r').read(), media_type='application/javascript')

@app.post('/predict', response_model=PredictionResponse)
def predict(data: StudentData):
    country_group = data.country if data.country in top_countries else "Other"

    input_row = pd.DataFrame([{
        'Age': data.age,
        'Gender': data.gender,
        'Academic_Level': data.academic_level,
        'Most_Used_Platform': data.most_used_platform,
        'Purpose_Of_Use': data.purpose_of_use,
        'Avg_Daily_Usage_Hours': data.avg_daily_usage_hours,
        'Daily_Unlocks': data.daily_unlocks,
        'Study_Hours': data.study_hours,
        'Physical_Activity_Hours': data.physical_activity_hours,
        'Sleep_Hours_Per_Night': data.sleep_hours_per_night,
        'Stress_Level': data.stress_level,
        'Grouped_country': country_group
    }])

    prediction = model.predict(input_row)
    scalar_prediction = prediction[0] if hasattr(prediction, "__len__") else prediction
    return PredictionResponse(predicted_mental_health_score=round(float(scalar_prediction), 2))
