from flask import Flask
import json

app = Flask(__name__)

@app.route("/antygarb/stats", methods=['POST'])
def receiveClientStats():
    return "OK"