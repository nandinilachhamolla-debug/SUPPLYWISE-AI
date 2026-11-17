
import pandas as pd

from app.services.optimization import optimize_offers

data = pd.read_csv("data/supplier_data.csv")

# Demonstration: compare the three Taj Krishna offers.
taj_offers = data[
    data["hotel_name"].isin([
        "Taj Krishna Hyderabad",
        "Taj Krishna Hotel",
        "Krishna Taj Hyderabad"
    ])
]

results = optimize_offers(taj_offers.to_dict("records"))

print("\nSUPPLYWISE AI - OPTIMIZED OFFERS\n")

for offer in results:
    print("--------------------------------")
    print("Rank:", offer["rank"])
    print("Hotel:", offer["hotel_name"])
    print("Supplier:", offer["supplier"])
    print("Room:", offer["room_type"])
    print("Price: Rs.", offer["price"])
    print("Cancellation:", offer["cancellation"])
    print("Price score:", offer["price_score"])
    print("Cancellation score:", offer["cancellation_score"])
    print("Final score:", offer["final_score"])

if results:
    print("\nBEST VALUE OFFER:")
    print(results[0]["hotel_name"])
    print("Supplier:", results[0]["supplier"])
    print("Final score:", results[0]["final_score"])
else:
    print("No eligible offers found.")
