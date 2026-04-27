from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import pandas as pd
import io
import time

from data_generator import generate_dataset, save_dataset
from model import train_model, mitigate_bias, predict_single
from fairness import evaluate_fairness
from explainability import compute_shap_values

app = FastAPI(title="FairLoan AI API")

# MOCK: Google Cloud BigQuery Logging
def log_to_bigquery(prediction_data: dict):
    """
    Mock function to simulate streaming data to BigQuery.
    In production, use google-cloud-bigquery library:
    client = bigquery.Client()
    table_id = "your-project.dataset.predictions"
    client.insert_rows_json(table_id, [prediction_data])
    """
    print(f"☁️ [GCP BigQuery Logged] Prediction ID: {prediction_data.get('timestamp')}")
    # time.sleep(0.1) # Simulate network call


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerateDataRequest(BaseModel):
    n_samples: int = 200
    seed: int = 42

class LoanApplicant(BaseModel):
    income: float = 50000
    age: int = 30
    gender: str = "Male"
    credit_score: int = 650
    loan_amount: float = 100000
    employment_years: int = 5
    use_gender: bool = False

@app.post("/generate-data")
def api_generate_data(req: GenerateDataRequest):
    df = generate_dataset(req.n_samples, req.seed)
    df_json = df.to_dict(orient="records")
    return {"status": "success", "data": df_json}

@app.post("/profile-data")
async def api_profile_data(file: UploadFile = File(...)):
    """Analyze dataset for quality faults and potential bias indicators."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Invalid file format. Upload CSV.")
    
    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read CSV: {e}")

    try:
        # 1. Missing Values
        missing_values = df.isnull().sum().to_dict()
        
        # 2. Class Imbalance (Target)
        target_col = 'loan_approved' if 'loan_approved' in df.columns else None
        target_dist = df[target_col].value_counts(normalize=True).to_dict() if target_col else {}
        
        # 3. Sensitive Attribute Distribution
        sensitive_col = 'gender' if 'gender' in df.columns else None
        sensitive_dist = df[sensitive_col].value_counts(normalize=True).to_dict() if sensitive_col else {}
        
        # 4. Suggestions / Fault Detection
        suggestions = []
        if any(v > 0 for v in missing_values.values()):
            suggestions.append({
                "type": "warning",
                "message": "Dataset contains missing values. These may lead to biased outcomes if not handled correctly."
            })
        
        if sensitive_col:
            dist = df[sensitive_col].value_counts(normalize=True)
            if dist.max() > 0.7:
                suggestions.append({
                    "type": "critical",
                    "message": f"Significant imbalance detected in '{sensitive_col}'. One group represents over 70% of the data, which may lead to skewed results."
                })
        
        if target_col:
            dist = df[target_col].value_counts(normalize=True)
            if dist.min() < 0.2:
                suggestions.append({
                    "type": "warning",
                    "message": "The target variable is highly imbalanced. The model might struggle to learn fair representation for the minority class."
                })

        # 5. Summary Statistics for outlier detection
        summary = df.describe().to_dict()

        return {
            "columns": list(df.columns),
            "row_count": len(df),
            "missing_values": missing_values,
            "target_distribution": target_dist,
            "sensitive_distribution": sensitive_dist,
            "suggestions": suggestions,
            "summary": summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/train-model")
async def api_train_model(file: UploadFile = File(...), use_gender: bool = Form(False)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Invalid file format. Upload CSV.")
    
    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read CSV: {e}")
    
    try:
        model, x_test, y_test, sensitive = train_model(df, use_gender)
        y_pred = model.predict(x_test)
        
        fairness_results = evaluate_fairness(y_test, y_pred, sensitive)
        
        # Compute SHAP global importance
        try:
            shap_results = compute_shap_values(model, x_test)
            shap_importance = shap_results.get("global_importance", [])
        except Exception:
            shap_importance = []
        
        return {
            **fairness_results,
            "features_used": list(x_test.columns),
            "shap_importance": shap_importance,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-bias")
async def api_analyze_bias(file: UploadFile = File(...), use_gender: bool = Form(False)):
    # This might be redundant if train-model also returns bias, 
    # but the instructions requested this explicitly.
    return await api_train_model(file, use_gender)

@app.post("/mitigate-bias")
async def api_mitigate_bias(file: UploadFile = File(...), use_gender: bool = Form(False)):
    """Train baseline and mitigated models and return fairness comparison."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Invalid file format. Upload CSV.")
    
    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read CSV: {e}")
    
    try:
        (
            mitigator,
            x_test,
            y_test,
            sensitive,
            y_pred_baseline,
            y_pred_mitigated,
        ) = mitigate_bias(df, use_gender)

        before_metrics = evaluate_fairness(y_test, y_pred_baseline, sensitive)
        after_metrics = evaluate_fairness(y_test, y_pred_mitigated, sensitive)

        comparison = {
            "before": {
                "accuracy": before_metrics["accuracy"],
                "female_rate": before_metrics["female_rate"],
                "male_rate": before_metrics["male_rate"],
                "bias_diff": before_metrics["bias_diff"],
            },
            "after": {
                "accuracy": after_metrics["accuracy"],
                "female_rate": after_metrics["female_rate"],
                "male_rate": after_metrics["male_rate"],
                "bias_diff": after_metrics["bias_diff"],
            },
        }

        fairness_improved = after_metrics["bias_diff"] < before_metrics["bias_diff"]
        accuracy_delta = after_metrics["accuracy"] - before_metrics["accuracy"]

        return {
            **comparison,
            **after_metrics,
            "isMitigated": True,
            "mitigation_method": "ExponentiatedGradient",
            "fairness_constraint": "demographic_parity",
            "fairness_improved": fairness_improved,
            "accuracy_delta": accuracy_delta,
            "features_used": list(x_test.columns),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict-loan")
def api_predict_loan(applicant: LoanApplicant, background_tasks: BackgroundTasks):
    """Predict loan approval for an individual applicant using the training dataset."""
    try:
        # Generate training dataset
        df = generate_dataset(500, seed=42)
        
        applicant_dict = {
            "income": applicant.income,
            "age": applicant.age,
            "gender": applicant.gender,
            "credit_score": applicant.credit_score,
            "loan_amount": applicant.loan_amount,
            "employment_years": applicant.employment_years,
        }
        
        prediction = predict_single(df, applicant_dict, applicant.use_gender)
        
        # Also compute SHAP explanation for this applicant
        from model import _validate_input, _prepare_features
        from sklearn.linear_model import LogisticRegression
        
        _validate_input(df)
        data, features, target, sensitive, feature_cols = _prepare_features(df, applicant.use_gender)
        
        lr_model = LogisticRegression(solver="liblinear", random_state=42)
        lr_model.fit(features, target)
        
        # Build applicant feature vector
        applicant_features = {}
        for col in feature_cols:
            if col == "gender":
                applicant_features[col] = 1 if applicant.gender == "Male" else 0
            else:
                applicant_features[col] = applicant_dict.get(col, 0)
        
        applicant_df = pd.DataFrame([applicant_features])
        
        shap_results = compute_shap_values(lr_model, features, applicant_df)
        
        # Log to BigQuery in background
        bq_data = {
            "timestamp": time.time(),
            "features": applicant_dict,
            "approved": prediction["approved"],
            "probability": prediction["probability_approved"],
        }
        background_tasks.add_task(log_to_bigquery, bq_data)

        return {
            **prediction,
            "shap": shap_results,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/batch-predict")
async def api_batch_predict(file: UploadFile = File(...), use_gender: bool = Form(False)):
    """Run batch prediction on an uploaded CSV of applicants."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Invalid file format. Upload CSV.")
    
    content = await file.read()
    try:
        new_df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read CSV: {e}")
    
    try:
        # Generate training dataset
        df_train = generate_dataset(500, seed=42)
        from model import _validate_input, _prepare_features
        from sklearn.linear_model import LogisticRegression
        
        _validate_input(df_train)
        data, features, target, sensitive, feature_cols = _prepare_features(df_train, use_gender)
        
        lr_model = LogisticRegression(solver="liblinear", random_state=42)
        lr_model.fit(features, target)
        
        results = []
        for index, row in new_df.iterrows():
            applicant_dict = row.to_dict()
            applicant_features = {}
            for col in feature_cols:
                if col == "gender":
                    val = str(applicant_dict.get("gender", "Male")).strip()
                    applicant_features[col] = 1 if val.lower() in ['male', '1', '1.0'] else 0
                else:
                    applicant_features[col] = applicant_dict.get(col, 0)
            
            applicant_df = pd.DataFrame([applicant_features])
            probability = lr_model.predict_proba(applicant_df)[0]
            prediction = lr_model.predict(applicant_df)[0]
            
            # Format result
            res = {
                "id": str(applicant_dict.get("id", index + 1)),
                "income": applicant_dict.get("income", 0),
                "credit_score": applicant_dict.get("credit_score", 0),
                "loan_amount": applicant_dict.get("loan_amount", 0),
                "probability": float(probability[1]),
                "approved": bool(prediction)
            }
            results.append(res)
            
        return {"status": "success", "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
