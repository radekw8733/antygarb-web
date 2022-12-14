from flask import Flask
import json

app = Flask(__name__)
app.secret_key = b'\xd7\xd8\xd0\x8f\x1a\xee9\xf1O~\xca\x88&X|\x05'

@app.route("/antygarb/stats", methods=['POST'])
def receiveClientStats():
    return "OK"