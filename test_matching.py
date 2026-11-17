
import pandas as pd
from app.services.matching import match_hotels

data = pd.read_csv("data/supplier_data.csv")

results = match_hotels(data, threshold=55)

print("\nSUPPLYWISE AI - HOTEL MATCHING RESULTS\n")

for result in results:
    print("----------------------------------")
    print("Hotel A:", result["hotel_a"])
    print("Supplier A:", result["supplier_a"])
    print("Hotel B:", result["hotel_b"])
    print("Supplier B:", result["supplier_b"])
    print("Name similarity:", result["name_similarity"])
    print("Description similarity:",
          result["description_similarity"])
    print("Confidence score:", result["confidence_score"])
    print("Status:", result["match_status"])

print("\nTotal potential matches:", len(results))
