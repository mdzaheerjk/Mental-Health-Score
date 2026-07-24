import joblib
import pandas as pd
from typing import Literal
from fastapi import FastAPI

model=joblib.load('Model/Mental_Health_model.pkl')
top_countries=['Other','India','USA','Canada','Australia','UK','Germany','Mexico','Turkey','France']

app=FastAPI()


