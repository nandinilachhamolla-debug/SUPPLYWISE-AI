import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownUp,
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Database,
  Download,
  Hotel,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  getHealth,
  getMatches,
  getOptimization,
  getSuppliers,
} from "./services/api";

import "./App.css";

const navigation = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "matching", label: "Hotel Matching", icon: Hotel },
  { id: "optimization", label: "Optimization", icon: ArrowDownUp },
  { id: "suppliers", label: "Supplier Data", icon: Database },
];

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

function StatCard({ title, value, subtitle, icon: Icon, tone }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>
        <Icon size={21} />
      </div>
      <div className="stat-content">
        <span className="stat-title">{title}</span>
        <strong>{value}</strong>
        <span className="stat-subtitle">{subtitle}</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const normalized = String(status || "Review").toLowerCase();

  return (
    <span className={`status-badge ${normalized.replace(/\s+/g, "-")}`}>
      {status || "Review"}
    </span>
  );
}

function EmptyState({ message }) {
  return (
    <div className="empty-state">
      <Database size={28} />
      <p>{message}</p>
    </div>
  );
}

function App() {
  const [activePage, setActivePage] = useState("overview");
  const [mobileMenu, setMobileMenu] = useState(false);

  const [health, setHealth] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [optimization, setOptimization] = useState(null);

  const [selectedHotel, setSelectedHotel] = useState("");
  const [search, setSearch] = useState("");
  const [matchSearch, setMatchSearch] = useState("");
  const [threshold, setThreshold] = useState(55);

  const [loading, setLoading] = useState(true);
  const [optimizationLoading, setOptimizationLoading] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const [healthData, supplierData, matchData] = await Promise.all([
        getHealth(),
        getSuppliers(),
        getMatches(threshold),
      ]);

      setHealth(healthData);
      setSuppliers(supplierData.suppliers || []);
      setMatches(matchData.matches || []);

      const firstHotel = supplierData.suppliers?.[0]?.hotel_name;

      if (firstHotel) {
        setSelectedHotel((current) => current || firstHotel);
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to connect to the backend. Check that FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadOptimization = async (hotelName) => {
    if (!hotelName) return;

    setOptimizationLoading(true);

    try {
      const result = await getOptimization(hotelName);
      setOptimization(result);
    } catch (err) {
      setOptimization(null);
      setError(
        err.response?.data?.detail ||
          "Could not load optimization results."
      );
    } finally {
      setOptimizationLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    // Initial dashboard load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedHotel) {
      loadOptimization(selectedHotel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHotel]);

  const supplierNames = useMemo(
    () => [...new Set(suppliers.map((item) => item.supplier))],
    [suppliers]
  );

  const availableOffers = useMemo(
    () => suppliers.filter((item) => String(item.available).toLowerCase() === "true"),
    [suppliers]
  );

  const supplierDistribution = useMemo(
    () =>
      supplierNames.map((name) => ({
        name,
        count: suppliers.filter((item) => item.supplier === name).length,
      })),
    [supplierNames, suppliers]
  );

  const filteredSuppliers = useMemo(() => {
    const query = search.toLowerCase().trim();

    return suppliers.filter((item) =>
      [
        item.hotel_name,
        item.supplier,
        item.room_type,
        item.description,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [suppliers, search]);

  const filteredMatches = useMemo(() => {
    const query = matchSearch.toLowerCase().trim();

    return matches.filter((item) =>
      [
        item.hotel_a,
        item.hotel_b,
        item.supplier_a,
        item.supplier_b,
        item.match_status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [matches, matchSearch]);

  const rankedOffers = optimization?.ranked_offers || [];

  const bestOffer = rankedOffers[0];

  const downloadCSV = () => {
    if (!suppliers.length) return;

    const headers = [
      "Supplier",
      "Hotel",
      "Description",
      "Room Type",
      "Price",
      "Cancellation",
      "Available",
    ];

    const rows = suppliers.map((item) => [
      item.supplier,
      item.hotel_name,
      item.description,
      item.room_type,
      item.price,
      item.cancellation,
      item.available,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "supplywise_supplier_data.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  const pageTitle =
    navigation.find((item) => item.id === activePage)?.label || "Overview";

  const changePage = (page) => {
    setActivePage(page);
    setMobileMenu(false);
  };

  const renderOverview = () => (
    <>
      <div className="welcome-row">
        <div>
          <div className="eyebrow">INTELLIGENCE WORKSPACE</div>
          <h1>Good morning, Team SupplyWise</h1>
          <p>
            Monitor supplier listings, discover potential hotel matches, and
            identify better-value offers.
          </p>
        </div>

        <button className="secondary-button" onClick={loadDashboard}>
          <RefreshCw size={16} />
          Refresh data
        </button>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Supplier Listings"
          value={suppliers.length}
          subtitle="Records in demo dataset"
          icon={Building2}
          tone="blue"
        />

        <StatCard
          title="Suppliers"
          value={supplierNames.length}
          subtitle="Distinct supplier sources"
          icon={Database}
          tone="purple"
        />

        <StatCard
          title="Potential Matches"
          value={matches.length}
          subtitle="Candidate pairs identified"
          icon={Hotel}
          tone="green"
        />

        <StatCard
          title="Available Offers"
          value={availableOffers.length}
          subtitle="Marked available in dataset"
          icon={CheckCircle2}
          tone="orange"
        />
      </div>

      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h3>Supplier Distribution</h3>
              <p>Number of listings by supplier</p>
            </div>
            <span className="panel-icon">
              <BarChart3 size={18} />
            </span>
          </div>

          {supplierDistribution.length ? (
            <div className="chart-area">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={supplierDistribution}
                    dataKey="count"
                    nameKey="name"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={5}
                  >
                    {supplierDistribution.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={["#5b8def", "#9b7bea", "#34b99a", "#e7a34b"][
                          index % 4
                        ]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>

              <div className="chart-legend">
                {supplierDistribution.map((item, index) => (
                  <div className="legend-item" key={item.name}>
                    <span
                      className="legend-dot"
                      style={{
                        background: [
                          "#5b8def",
                          "#9b7bea",
                          "#34b99a",
                          "#e7a34b",
                        ][index % 4],
                      }}
                    />
                    <span>{item.name}</span>
                    <strong>{item.count}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState message="No supplier records available." />
          )}
        </section>

        <section className="panel pipeline-panel">
          <div className="panel-heading">
            <div>
              <h3>Optimization Pipeline</h3>
              <p>How SupplyWise processes listings</p>
            </div>
            <Sparkles size={19} className="purple-text" />
          </div>

          <div className="pipeline-list">
            <div className="pipeline-step">
              <div className="pipeline-number">01</div>
              <div>
                <strong>Supplier Data Ingestion</strong>
                <span>Collect and structure listing records</span>
              </div>
              <CheckCircle2 className="success-text" size={19} />
            </div>

            <div className="pipeline-line" />

            <div className="pipeline-step">
              <div className="pipeline-number">02</div>
              <div>
                <strong>Hotel Similarity Matching</strong>
                <span>Compare names and descriptions</span>
              </div>
              <CheckCircle2 className="success-text" size={19} />
            </div>

            <div className="pipeline-line" />

            <div className="pipeline-step">
              <div className="pipeline-number">03</div>
              <div>
                <strong>Offer Optimization</strong>
                <span>Rank price, cancellation and availability</span>
              </div>
              <CheckCircle2 className="success-text" size={19} />
            </div>

            <div className="pipeline-line" />

            <div className="pipeline-step">
              <div className="pipeline-number">04</div>
              <div>
                <strong>Decision Support</strong>
                <span>Present ranked candidate offers</span>
              </div>
              <Activity className="success-text" size={19} />
            </div>
          </div>
        </section>
      </div>

      <section className="panel table-panel">
        <div className="panel-heading">
          <div>
            <h3>Recent Candidate Matches</h3>
            <p>Potential cross-supplier hotel matches</p>
          </div>

          <button
            className="text-button"
            onClick={() => changePage("matching")}
          >
            View all <ArrowRight size={15} />
          </button>
        </div>

        <MatchTable rows={matches.slice(0, 5)} />
      </section>
    </>
  );

  const renderMatching = () => (
    <>
      <div className="welcome-row">
        <div>
          <div className="eyebrow">ENTITY RESOLUTION ENGINE</div>
          <h1>Hotel Matching</h1>
          <p>
            Discover potentially similar hotel listings across different
            supplier sources.
          </p>
        </div>
      </div>

      <div className="info-banner">
        <ShieldCheck size={20} />
        <div>
          <strong>Similarity is not identity verification</strong>
          <p>
            These scores identify candidate pairs for review. They do not prove
            that two listings represent the same property.
          </p>
        </div>
      </div>

      <section className="panel">
        <div className="toolbar">
          <div className="search-box">
            <Search size={17} />
            <input
              value={matchSearch}
              onChange={(event) => setMatchSearch(event.target.value)}
              placeholder="Search hotel or supplier..."
            />
          </div>

          <label className="threshold-control">
            <SlidersHorizontal size={16} />
            Threshold
            <select
              value={threshold}
              onChange={async (event) => {
                const value = Number(event.target.value);
                setThreshold(value);

                try {
                  const data = await getMatches(value);
                  setMatches(data.matches || []);
                } catch {
                  setError("Could not update the matching threshold.");
                }
              }}
            >
              <option value={40}>40%</option>
              <option value={55}>55%</option>
              <option value={65}>65%</option>
              <option value={75}>75%</option>
              <option value={85}>85%</option>
            </select>
          </label>
        </div>

        <div className="table-heading-row">
          <div>
            <h3>Matching Results</h3>
            <p>{filteredMatches.length} candidate pairs found</p>
          </div>
        </div>

        <MatchTable rows={filteredMatches} />
      </section>
    </>
  );

  const renderOptimization = () => (
    <>
      <div className="welcome-row">
        <div>
          <div className="eyebrow">SMART OFFER RANKING</div>
          <h1>Offer Optimization</h1>
          <p>
            Compare available offers using price, cancellation flexibility and
            availability.
          </p>
        </div>
      </div>

      <section className="panel optimization-selector">
        <div>
          <label htmlFor="hotel-select">Select a hotel listing</label>
          <select
            id="hotel-select"
            value={selectedHotel}
            onChange={(event) => setSelectedHotel(event.target.value)}
          >
            {[...new Set(suppliers.map((item) => item.hotel_name))].map(
              (name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              )
            )}
          </select>
        </div>

        <button
          className="primary-button"
          disabled={!selectedHotel || optimizationLoading}
          onClick={() => loadOptimization(selectedHotel)}
        >
          {optimizationLoading ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <Zap size={16} />
          )}
          Run optimization
        </button>
      </section>

      {optimizationLoading ? (
        <div className="loading-state">
          <LoaderCircle className="spin" size={28} />
          <p>Analyzing supplier offers...</p>
        </div>
      ) : optimization ? (
        <>
          {bestOffer && (
            <div className="best-offer-card">
              <div className="best-offer-icon">
                <Sparkles size={22} />
              </div>

              <div className="best-offer-content">
                <span>HIGHEST SCORING AVAILABLE OFFER</span>
                <h2>{bestOffer.hotel_name}</h2>
                <p>
                  {bestOffer.supplier} · {bestOffer.room_type}
                </p>
              </div>

              <div className="best-offer-price">
                <strong>{money(bestOffer.price)}</strong>
                <span>
                  Score: {Number(bestOffer.final_score).toFixed(2)} / 100
                </span>
              </div>
            </div>
          )}

          <div className="optimization-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Offer Score Comparison</h3>
                  <p>Final weighted score by supplier</p>
                </div>
                <TrendingUp size={19} className="success-text" />
              </div>

              <div className="chart-area">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={rankedOffers}
                    margin={{ top: 10, right: 10, left: -20, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="supplier"
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar
                      dataKey="final_score"
                      name="Final score"
                      radius={[6, 6, 0, 0]}
                      fill="#648ef3"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Scoring Weights</h3>
                  <p>Decision model configuration</p>
                </div>
                <SlidersHorizontal size={19} />
              </div>

              <div className="weight-list">
                {[
                  { name: "Price", value: 50, color: "weight-blue" },
                  {
                    name: "Cancellation",
                    value: 25,
                    color: "weight-purple",
                  },
                  {
                    name: "Availability",
                    value: 25,
                    color: "weight-green",
                  },
                ].map((item) => (
                  <div className="weight-item" key={item.name}>
                    <div className="weight-label">
                      <span>{item.name}</span>
                      <strong>{item.value}%</strong>
                    </div>
                    <div className="weight-track">
                      <div
                        className={item.color}
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="weight-note">
                The highest score represents the best result under these
                configured weights, not a guaranteed best booking.
              </div>
            </section>
          </div>

          <section className="panel table-panel">
            <div className="panel-heading">
              <div>
                <h3>Ranked Supplier Offers</h3>
                <p>Available offers ordered by final score</p>
              </div>
              <StatusBadge status="Ranked" />
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Supplier</th>
                    <th>Hotel</th>
                    <th>Room Type</th>
                    <th>Price</th>
                    <th>Cancellation</th>
                    <th>Final Score</th>
                  </tr>
                </thead>
                <tbody>
                  {rankedOffers.map((offer, index) => (
                    <tr key={`${offer.supplier}-${offer.hotel_name}`}>
                      <td>
                        <span className="rank-number">#{index + 1}</span>
                      </td>
                      <td>{offer.supplier}</td>
                      <td className="hotel-cell">{offer.hotel_name}</td>
                      <td>{offer.room_type}</td>
                      <td className="price-cell">{money(offer.price)}</td>
                      <td>{offer.cancellation}</td>
                      <td>
                        <strong>
                          {Number(offer.final_score).toFixed(2)}
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <EmptyState message="Choose a hotel to view its optimization results." />
      )}
    </>
  );

  const renderSuppliers = () => (
    <>
      <div className="welcome-row">
        <div>
          <div className="eyebrow">DATA MANAGEMENT</div>
          <h1>Supplier Data</h1>
          <p>
            Review the hotel listings currently loaded into the demonstration
            dataset.
          </p>
        </div>

        <button className="secondary-button" onClick={downloadCSV}>
          <Download size={16} />
          Export CSV
        </button>
      </div>

      <div className="info-banner warning-banner">
        <CircleAlert size={20} />
        <div>
          <strong>Demonstration dataset</strong>
          <p>
            The current records are sample data for prototype evaluation.
            They are not live supplier inventory or actual booking offers.
          </p>
        </div>
      </div>

      <section className="panel table-panel">
        <div className="toolbar">
          <div className="search-box">
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search supplier, hotel, room..."
            />
          </div>
          <span className="record-count">
            {filteredSuppliers.length} records
          </span>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Hotel Name</th>
                <th>Room Type</th>
                <th>Price</th>
                <th>Cancellation</th>
                <th>Availability</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map((item, index) => (
                <tr key={`${item.supplier}-${item.hotel_name}-${index}`}>
                  <td>
                    <span className="supplier-pill">{item.supplier}</span>
                  </td>
                  <td className="hotel-cell">{item.hotel_name}</td>
                  <td>{item.room_type}</td>
                  <td className="price-cell">{money(item.price)}</td>
                  <td>{item.cancellation}</td>
                  <td>
                    <StatusBadge
                      status={
                        String(item.available).toLowerCase() === "true"
                          ? "Available"
                          : "Unavailable"
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!filteredSuppliers.length && (
          <EmptyState message="No supplier records match your search." />
        )}
      </section>
    </>
  );

  if (loading) {
    return (
      <div className="full-loading">
        <div className="brand-mark">
          <Zap size={25} />
        </div>
        <h2>SUPPLYWISE AI</h2>
        <p>Connecting to intelligence engine...</p>
        <LoaderCircle className="spin" size={24} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      {mobileMenu && (
        <button
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setMobileMenu(false)}
        />
      )}

      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Zap size={23} />
          </div>
          <div>
            <strong>SUPPLYWISE</strong>
            <span>AI INTELLIGENCE</span>
          </div>
          <button
            className="close-mobile"
            onClick={() => setMobileMenu(false)}
            aria-label="Close menu"
          >
            <X size={19} />
          </button>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <nav className="navigation">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                className={`nav-item ${
                  activePage === item.id ? "nav-active" : ""
                }`}
                onClick={() => changePage(item.id)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
                {activePage === item.id && (
                  <span className="nav-indicator" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="system-card">
            <div className="system-card-top">
              <span className="system-dot" />
              <strong>System status</strong>
            </div>
            <p>
              {health?.status === "healthy"
                ? "Backend connected"
                : "Connection status unknown"}
            </p>
            <span className="system-version">SUPPLYWISE AI · v1.0</span>
          </div>

          <div className="sidebar-footer">
            <div className="avatar">SW</div>
            <div>
              <strong>Project Team</strong>
              <span>Workspace member</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu-button"
              onClick={() => setMobileMenu(true)}
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>
            <div className="breadcrumb">
              <span>Workspace</span>
              <span>/</span>
              <strong>{pageTitle}</strong>
            </div>
          </div>

          <div className="topbar-right">
            <span className="environment-tag">
              <span /> DEMO ENVIRONMENT
            </span>
            <button className="notification-button" aria-label="Notifications">
              <Bell size={19} />
            </button>
          </div>
        </header>

        <div className="page-content">
          {error && (
            <div className="error-banner">
              <CircleAlert size={18} />
              <span>{error}</span>
              <button onClick={() => setError("")} aria-label="Dismiss error">
                <X size={16} />
              </button>
            </div>
          )}

          {activePage === "overview" && renderOverview()}
          {activePage === "matching" && renderMatching()}
          {activePage === "optimization" && renderOptimization()}
          {activePage === "suppliers" && renderSuppliers()}

          <footer className="page-footer">
            <span>SUPPLYWISE AI · Intelligent Multi-Supplier Optimization</span>
            <span>Prototype demonstration · Sample data</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

function MatchTable({ rows }) {
  if (!rows?.length) {
    return <EmptyState message="No candidate matches found." />;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Hotel Listing A</th>
            <th>Supplier</th>
            <th>Hotel Listing B</th>
            <th>Supplier</th>
            <th>Name Score</th>
            <th>Description Score</th>
            <th>Confidence</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((match, index) => (
            <tr key={`${match.hotel_a}-${match.hotel_b}-${index}`}>
              <td className="hotel-cell">{match.hotel_a}</td>
              <td>{match.supplier_a}</td>
              <td className="hotel-cell">{match.hotel_b}</td>
              <td>{match.supplier_b}</td>
              <td>{Number(match.name_similarity).toFixed(1)}%</td>
              <td>{Number(match.description_similarity).toFixed(1)}%</td>
              <td>
                <strong>
                  {Number(match.confidence_score).toFixed(1)}%
                </strong>
              </td>
              <td>
                <StatusBadge status={match.match_status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;