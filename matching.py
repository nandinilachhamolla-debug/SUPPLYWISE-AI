import re
from itertools import combinations

from rapidfuzz import fuzz
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def normalize_text(value):
    """Normalize text for comparison."""

    if value is None:
        return ""

    value = str(value).lower()
    value = re.sub(r"[^a-z0-9\s]", " ", value)
    value = re.sub(r"\s+", " ", value)

    return value.strip()


def calculate_name_similarity(name_a, name_b):
    """Calculate hotel-name similarity using RapidFuzz."""

    first = normalize_text(name_a)
    second = normalize_text(name_b)

    if not first or not second:
        return 0.0

    return float(fuzz.token_set_ratio(first, second))


def calculate_description_similarity(description_a, description_b):
    """Calculate description similarity using TF-IDF and cosine similarity."""

    first = normalize_text(description_a)
    second = normalize_text(description_b)

    if not first or not second:
        return 0.0

    try:
        vectorizer = TfidfVectorizer(ngram_range=(1, 2))

        vectors = vectorizer.fit_transform([first, second])

        score = cosine_similarity(vectors[0:1], vectors[1:2])[0][0]

        return float(score * 100)

    except ValueError:
        return 0.0


def classify_match(score):
    """Convert a similarity score into a review category."""

    if score >= 85:
        return "High Similarity"

    if score >= 65:
        return "Review"

    return "Low Similarity"


def match_hotels(data, threshold=55):
    """
    Compare listings from different suppliers.

    Final similarity:
        65% hotel-name similarity
        35% description similarity

    The result is a candidate match, not proof of property identity.
    """

    if data is None or len(data) < 2:
        return []

    required_columns = {
        "supplier",
        "hotel_name",
        "description",
    }

    if not required_columns.issubset(data.columns):
        raise ValueError(
            "Supplier data must contain supplier, hotel_name and description."
        )

    results = []

    records = data.to_dict(orient="records")

    for first, second in combinations(records, 2):

        supplier_a = str(first.get("supplier", "")).strip()
        supplier_b = str(second.get("supplier", "")).strip()

        # Compare different suppliers only.
        if supplier_a == supplier_b:
            continue

        hotel_a = str(first.get("hotel_name", ""))
        hotel_b = str(second.get("hotel_name", ""))

        name_score = calculate_name_similarity(
            hotel_a,
            hotel_b,
        )

        description_score = calculate_description_similarity(
            first.get("description", ""),
            second.get("description", ""),
        )

        final_score = (
            0.65 * name_score
            + 0.35 * description_score
        )

        if final_score < threshold:
            continue

        results.append(
            {
                "hotel_a": hotel_a,
                "supplier_a": supplier_a,
                "hotel_b": hotel_b,
                "supplier_b": supplier_b,
                "name_similarity": round(name_score, 2),
                "description_similarity": round(
                    description_score, 2
                ),
                "confidence_score": round(final_score, 2),
                "match_status": classify_match(final_score),
            }
        )

    results.sort(
        key=lambda item: item["confidence_score"],
        reverse=True,
    )

    return results