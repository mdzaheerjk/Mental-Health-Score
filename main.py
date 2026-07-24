import joblib
import pandas as pd
from typing import Literal
from fastapi import FastAPI
from pydantic import BaseModel,Field

model=joblib.load('Model/Mental_Health_model.pkl')
top_countries=['Other','India','USA','Canada','Australia','UK','Germany','Mexico','Turkey','France']

app=FastAPI()


class StudenData(BaseModel):
    age   :int=Field(...,ge=10,le=100)
    gender : Literal['Male','Female']
    country :str
    academic_level :Literal['Undergraduate','Graduate','High School']
    most_used_platform :Literal['Facebook','Linkedin','Instagram','Snapchat','Twitter','Youtube','TikTok','LINE','KakaoTalk','VKontakte','WhatsApp','WeChat']
    avg_daily_usage_hours=float=Field(...,ge=0,le=24)
    daily_unlocks : int=Field(...,ge=0)
    study_hours : float=Field(...,ge=0,le=24)
    physical_activity_hours:float=Field(...,ge=0,le=24)
    sleep_hours_per_night:float=Field(...,ge=0,le=24)
    stress_level:Literal['Medium','Low','Very High','High']

class PredictionResponse(BaseModel):
    predicted_mental_health_score:float

@app.get('/')
def greet():
    return {'Welcome to the Mental Health score Guys'}
