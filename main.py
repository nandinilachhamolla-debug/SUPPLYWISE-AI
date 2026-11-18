from pathlib import Path

import pandas as pd

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from matching import match_hotels
from optimization import optimize_offers


BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / "supplier_data.csv"

app = FastAPI(
    title="SUPPLYWISE AI API",
    description=(
        "Intelligent Multi-Supplier Matching and "
        "Offer Optimization Prototype"
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_supplier_data():
    """Load the supplier dataset."""

    if not DATA_FILE.exists():
        raise HTTPException(
            status_code=500,
            detail=f"Supplier dataset not found: {DATA_FILE}",
        )

    try:
        data = pd.read_csv(DATA_FILE)

        required_columns = {
            "supplier",
            "hotel_name",
            "description",
            "room_type",
            "price",
            "cancellation",
            "available",
        }

        missing = required_columns - set(data.columns)

        if missing:
            raise HTTPException(
                status_code=500,
                detail=f"Missing dataset columns: {sorted(missing)}",
            )

        return data.fillna("")

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not read supplier data: {str(exc)}",
        )


@app.get("/")
def home():
    return {
        "message": "Welcome to SUPPLYWISE AI API",
        "version": "1.0.0",
        "documentation": "/docs",
    }


@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "application": "SUPPLYWISE AI",
        "version": "1.0.0",
        "dataset_connected": DATA_FILE.exists(),
        "matching_engine": "RapidFuzz + TF-IDF",
        "optimization_engine": "Weighted Scoring Model",
        "data_mode": "Synthetic demonstration dataset",
    }


@app.get("/api/suppliers")
def get_suppliers():
    data = load_supplier_data()

    records = data.to_dict(orient="records")

    return {
        "total_records": len(records),
        "total_suppliers": int(data["supplier"].nunique()),
        "suppliers": records,
        "data_mode": "Synthetic demonstration dataset",
    }


@app.get("/api/matches")
def get_matches(
    threshold: float = Query(
        default=55,
        ge=0,
        le=100,
        description="Minimum candidate similarity score",
    )
):
    data = load_supplier_data()

    try:
        results = match_hotels(
            data,
            threshold=threshold,
        )

        return {
            "total_matches": len(results),
            "threshold": threshold,
            "matches": results,
            "interpretation": (
                "Similarity scores are candidate matches for "
                "review, not verified property identities."
            ),
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Matching failed: {str(exc)}",
        )


@app.get("/api/optimization")
def get_optimization(
    hotel_name: str = Query(
        ...,
        min_length=1,
        description="Hotel listing to optimize",
    )
):
    data = load_supplier_data()

    selected = data[
        data["hotel_name"].astype(str).str.casefold()
        == hotel_name.strip().casefold()
    ]

    if selected.empty:
        raise HTTPException(
            status_code=404,
            detail=f"Hotel listing not found: {hotel_name}",
        )

    selected_record = selected.iloc[0]

    selected_room = str(selected_record["room_type"]).strip()
    selected_supplier = str(selected_record["supplier"]).strip()

    # Begin with exact-name listings from other suppliers.
    candidate_names = set(
        data.loc[
            data["hotel_name"].astype(str).str.casefold()
            == hotel_name.strip().casefold(),
            "hotel_name",
        ].astype(str)
    )

    # Add directly matched candidate listings.
    candidates = match_hotels(data, threshold=65)

    for match in candidates:
        if (
            match["hotel_a"].casefold() == hotel_name.strip().casefold()
            and match["supplier_a"] == selected_supplier
        ):
            candidate_names.add(match["hotel_b"])

        elif (
            match["hotel_b"].casefold() == hotel_name.strip().casefold()
            and match["supplier_b"] == selected_supplier
        ):
            candidate_names.add(match["hotel_a"])

    # Keep matching room types only.
    related = data[
        data["hotel_name"].astype(str).isin(candidate_names)
        & (
            data["room_type"].astype(str).str.strip()
            == selected_room
        )
    ].copy()

    # Require a different supplier from the selected listing.
    related = related[
        related["supplier"].astype(str).str.strip()
        != selected_supplier
    ]

    # Include the selected listing in the comparison.
    selected_rows = data[
        data["hotel_name"].astype(str).str.casefold()
        == hotel_name.strip().casefold()
    ]

    comparison = pd.concat(
        [selected_rows, related],
        ignore_index=True,
    )

    ranked_offers = optimize_offers(comparison)

    return {
        "selected_hotel": hotel_name,
        "selected_room_type": selected_room,
        "total_offers": len(ranked_offers),
        "ranking_weights": {
            "price": 50,
            "cancellation": 25,
            "availability": 25,
        },
        "ranked_offers": ranked_offers,
        "data_mode": "Synthetic demonstration dataset",
        "note": (
            "Candidate matches are based on similarity and require "
            "manual verification. Only matching room types are "
            "compared; occupancy and other booking conditions "
            "are not validated by this prototype."
        ),
    }
