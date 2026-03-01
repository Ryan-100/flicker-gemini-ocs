import requests
import json
import time
import subprocess

def run_server():
    print("Starting FastAPI server...")
    return subprocess.Popen(["python", "-m", "uvicorn", "backend.main:app", "--reload", "--port", "8000"], 
                            cwd="d:\\CMKL University\\Y2_Sem2\\SEN-203\\Gemini Project")

def test_api():
    base_url = "http://127.0.0.1:8000"
    
    # Wait for server to start
    time.sleep(2)
    
    print("\n--- Testing Science Plan Creation ---")
    plan_data = {
        "astronomer_id": "astronomer_01",
        "target": {
            "name": "M31",
            "ra": "00:42:44.3",
            "dec": "+41:16:09",
            "magnitude": 3.44,
            "object_type": "Galaxy"
        },
        "conditions": {
            "seeing": 0.5,
            "cloud_cover": 20,
            "water_vapor": 10
        },
        "exposure": {
            "exp_time": 300.0,
            "num_exposures": 5,
            "filters": ["V"]
        },
        "data_proc": {
            "image_proc": {
                "color_mode": "B&W",
                "contrast": 50,
                "brightness": 50,
                "saturation": 50
            }
        }
    }
    
    resp = requests.post(f"{base_url}/plans", json=plan_data)
    if resp.status_code == 200:
        plan = resp.json()
        plan_id = plan["id"]
        print(f"Plan created successfully: {plan_id}")
    else:
        print(f"Failed to create plan: {resp.text}")
        return

    print("\n--- Testing Plan Submission ---")
    resp = requests.post(f"{base_url}/plans/{plan_id}/submit", json={"notes": "Special observation request"})
    if resp.status_code == 200:
        print("Plan submitted successfully")
    else:
        print(f"Failed to submit plan: {resp.text}")

    print("\n--- Testing Rejection with Short Comment (Should Fail) ---")
    rejection_data = {
        "approve": False,
        "category": "Scientific Merit Issues",
        "reason": "Too short."
    }
    resp = requests.post(f"{base_url}/plans/{plan_id}/validate", json=rejection_data)
    if resp.status_code == 422:
        print("Rejection correctly failed due to short comment")
    else:
        print(f"Error: Rejection should have failed but got status {resp.status_code}")

    print("\n--- Testing Rejection with Long Comment (Should Pass) ---")
    long_reason = "This plan requires more detailed scientific justification regarding the choice of filters and exposure time for this specific target."
    # Ensure it's >= 50 chars
    print(f"Comment length: {len(long_reason)}")
    rejection_data["reason"] = long_reason
    resp = requests.post(f"{base_url}/plans/{plan_id}/validate", json=rejection_data)
    if resp.status_code == 200:
        print("Rejection successful with valid length comment")
    else:
        print(f"Failed to reject plan: {resp.text}")

    print("\n--- Final Plan Status ---")
    resp = requests.get(f"{base_url}/plans/{plan_id}")
    print(f"Final Status: {resp.json()['status']}")

if __name__ == "__main__":
    server = run_server()
    try:
        test_api()
    finally:
        server.terminate()
        print("\nServer stopped.")
