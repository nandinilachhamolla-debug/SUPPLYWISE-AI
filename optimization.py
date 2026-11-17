
import pandas as pd


def optimize_offers(offers):
    """
    Rank equivalent hotel offers using:
    Price         : 50%
    Cancellation  : 25%
    Availability  : 25%
    """

    df = pd.DataFrame(offers).copy()

    required = [
        "supplier",
        "hotel_name",
        "room_type",
        "price",
        "cancellation",
        "available"
    ]

    for column in required:
        if column not in df.columns:
            raise ValueError(f"Missing column: {column}")

    if df.empty:
        return []

    df["price"] = pd.to_numeric(df["price"], errors="coerce")
    df = df.dropna(subset=["price"])
    df = df[df["price"] > 0]

    if df.empty:
        return []

    # Only available offers can be recommended
    df["available"] = (
        df["available"].astype(str).str.lower() == "true"
    )
    df = df[df["available"]]

    if df.empty:
        return []

    # Compare prices within the supplied equivalent offers
    lowest_price = df["price"].min()

    df["price_score"] = (
        lowest_price / df["price"] * 100
    )

    # Cancellation score
    def cancellation_score(policy):
        policy = str(policy).lower()

        if "free" in policy:
            return 100
        elif "refundable" in policy:
            return 75
        else:
            return 40

    df["cancellation_score"] = (
        df["cancellation"].apply(cancellation_score)
    )

    # All offers remaining are available
    df["availability_score"] = 100

    # Weighted final score
    df["final_score"] = (
        df["price_score"] * 0.50
        + df["cancellation_score"] * 0.25
        + df["availability_score"] * 0.25
    )

    df = df.sort_values(
        by="final_score",
        ascending=False
    )

    results = []

    for rank, (_, row) in enumerate(df.iterrows(), start=1):
        results.append({
            "rank": rank,
            "supplier": row["supplier"],
            "hotel_name": row["hotel_name"],
            "room_type": row["room_type"],
            "price": float(row["price"]),
            "cancellation": row["cancellation"],
            "price_score": round(row["price_score"], 2),
            "cancellation_score": row["cancellation_score"],
            "availability_score": row["availability_score"],
            "final_score": round(row["final_score"], 2)
        })

    return results
