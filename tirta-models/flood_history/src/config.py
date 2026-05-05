# ============================================================
# POINT-BASED FLOOD RISK FORECASTING - INDONESIA
# ============================================================
# Simplified configuration for predicting flood vulnerability at specific coordinates
# Output: Risk score 1-100, categorized into 4 levels for 3-month ahead forecast

# ============================================================
# STANDALONE VARIABLES
# ============================================================
FORECAST_HORIZON = 3  # Predict 3 months ahead
LOOKBACK_WINDOW = 12  # Use 12 months of historical data
DATA_PATH = 'data/groundsource_2026.parquet'
RANDOM_SEED = 42

# ============================================================
# GEOGRAPHIC BOUNDS (INDONESIA ONLY)
# ============================================================
INDONESIA_BOUNDS = {
    'lat_min': -11,
    'lat_max': 6.0,
    'lon_min': 95,
    'lon_max': 141
}

# ============================================================
# DATA PREPARATION CONFIGURATION
# ============================================================
DATA_CONFIG = {
    'lookback_window': LOOKBACK_WINDOW,
    'forecast_horizon': FORECAST_HORIZON,
    'aggregation': 'monthly',  # Monthly time series
    'test_split': 0.2,  # 80-20 train-test
    'feature_scaling': 'standard',
    'random_state': RANDOM_SEED,
    'min_samples_per_location': 24,  # At least 2 years of data per location
}

# ============================================================
# RISK SCORING & CATEGORIZATION
# ============================================================
# Risk Score: 0-100
# Categories: 4 levels based on score ranges
RISK_CONFIG = {
    'score_min': 0,
    'score_max': 100,
    'categories': {
        'Rendah': {
            'range': [0, 25],
            'color': '#2ca02c',
            'label': 'Tidak Rawan'
        },
        'Sedang': {
            'range': [25, 50],
            'color': '#ffd700',
            'label': 'Cukup Rawan'
        },
        'Tinggi': {
            'range': [50, 75],
            'color': '#ff7f0e',
            'label': 'Rawan'
        },
        'Sangat Tinggi': {
            'range': [75, 100],
            'color': '#d62728',
            'label': 'Sangat Rawan'
        },
    }
}

# ============================================================
# MODEL CONFIGURATIONS - 4 COMPARISON MODELS
# ============================================================
# Main model: XGBoost (fast, reliable)
# Comparison models: SARIMA, Prophet, LSTM

XGBOOST_CONFIG = {
    'model_type': 'xgboost',
    'n_estimators': 100,
    'max_depth': 5,
    'learning_rate': 0.05,
    'subsample': 0.8,
    'colsample_bytree': 0.8,
    'objective': 'reg:squarederror',
    'random_state': RANDOM_SEED,
}

SARIMA_CONFIG = {
    'model_type': 'sarima',
    'order': (1, 1, 1),  # (p, d, q)
    'seasonal_order': (1, 1, 1, 12),  # (P, D, Q, s) - seasonal with 12-month cycle
    'suppress_warnings': True,
}

PROPHET_CONFIG = {
    'model_type': 'prophet',
    'yearly_seasonality': True,
    'weekly_seasonality': False,
    'daily_seasonality': False,
    'interval_width': 0.95,
    'changepoint_prior_scale': 0.05,
}

LSTM_CONFIG = {
    'model_type': 'lstm',
    'seq_length': LOOKBACK_WINDOW,
    'forecast_steps': FORECAST_HORIZON,
    'epochs': 50,
    'batch_size': 16,
    'validation_split': 0.2,
    'units': [64, 32],  # 2 LSTM layers
    'dropout': 0.2,
    'optimizer': 'adam',
    'loss': 'mse',
    'random_state': RANDOM_SEED,
}

MODELS_CONFIG = {
    'xgboost': XGBOOST_CONFIG,
    'sarima': SARIMA_CONFIG,
    'prophet': PROPHET_CONFIG,
    'lstm': LSTM_CONFIG,
    'default_model': 'xgboost',  # Main model for production
}

# ============================================================
# FEATURE ENGINEERING
# ============================================================
FEATURE_CONFIG = {
    'lagged_features': [1, 2, 3, 6],  # Lag 1, 2, 3, 6 months
    'add_cyclical_time': True,  # Sin/cos encoding for month (seasonal pattern)
    'add_trend': True,  # Linear trend
    'add_rolling_stats': True,  # Rolling mean/std for recent behavior
    'rolling_window': [3, 6],  # 3-month and 6-month rolling windows
}

# ============================================================
# OUTPUT & VISUALIZATION
# ============================================================
OUTPUT_CONFIG = {
    'save_models': True,
    'models_path': 'saved_models/',
    'predictions_path': 'predictions/',
    'export_json': True,
    'export_csv': True,
}

VISUALIZATION_CONFIG = {
    'figure_size': (12, 6),
    'style': 'seaborn-v0_8-darkgrid',
    'dpi': 100,
    'save_format': 'png',
}