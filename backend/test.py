import requests
import pandas as pd

# Test generate
res = requests.post('http://127.0.0.1:8000/generate-data', json={'n_samples': 200, 'seed': 42})
print('Generate Status:', res.status_code)
dataset = res.json()['data']
df = pd.DataFrame(dataset)
df.to_csv('test.csv', index=False)

# Test train-model
with open('test.csv', 'rb') as f:
    res2 = requests.post('http://127.0.0.1:8000/train-model', files={'file': f}, data={'use_gender': True})
print('Train Status:', res2.status_code)
print('Train Response:', res2.json())

# Test mitigate-bias
with open('test.csv', 'rb') as f:
    res3 = requests.post('http://127.0.0.1:8000/mitigate-bias', files={'file': f}, data={'use_gender': True})
print('Mitigate Status:', res3.status_code)
print('Mitigate Response:', res3.json())
