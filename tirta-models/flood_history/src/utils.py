"""
Utility Functions
=================
Helper functions for common tasks and aggregations
"""

import json
import pickle
import logging
from pathlib import Path
from typing import Dict, Any

logger = logging.getLogger(__name__)


def setup_logging(log_file: str = 'flood_prediction.log'):
    """Setup logging configuration"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler()
        ]
    )


def save_model(model: Any, path: str):
    """Save model to pickle file"""
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'wb') as f:
        pickle.dump(model, f)
    logger.info(f"[OK] Model saved: {path}")


def load_model(path: str) -> Any:
    """Load model from pickle file"""
    with open(path, 'rb') as f:
        model = pickle.load(f)
    logger.info(f"[OK] Model loaded: {path}")
    return model


def save_forecast_json(forecast: Dict, path: str):
    """Save forecast to JSON"""
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    
    # Convert numpy arrays to lists for JSON serialization
    forecast_json = _convert_numpy(forecast)
    
    with open(path, 'w') as f:
        json.dump(forecast_json, f, indent=2, default=str)
    logger.info(f"[OK] Forecast saved: {path}")


def _convert_numpy(obj):
    """Convert numpy arrays to lists for JSON serialization"""
    if isinstance(obj, dict):
        return {k: _convert_numpy(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_convert_numpy(item) for item in obj]
    elif hasattr(obj, 'tolist'):  # numpy array
        return obj.tolist()
    elif hasattr(obj, 'isoformat'):  # datetime
        return obj.isoformat()
    else:
        return obj


def create_output_dir(path: str):
    """Create output directory"""
    Path(path).mkdir(parents=True, exist_ok=True)
    logger.info(f"[OK] Output directory created: {path}")


def get_zone_summary(all_forecasts: Dict) -> Dict:
    """Generate summary statistics for all zones based on new Horizon (3 Months)"""
    summary = {}
    
    for zone_id, forecast in all_forecasts.items():
        count_preds = forecast['flood_count']
        area_preds = forecast['total_area']
        
        # Amankan pengecekan string dengan 'in' (karena sekarang teksnya 'HIGH (BAHAYA)')
        high_risk_count = 0
        if 'risk_levels' in forecast and 'flood_count_risk' in forecast['risk_levels']:
            high_risk_count = sum(1 for r in forecast['risk_levels']['flood_count_risk'] if 'HIGH' in str(r))
            
        summary[zone_id] = {
            'avg_flood_count': float(count_preds.mean()),
            'max_flood_count': float(count_preds.max()),
            'min_flood_count': float(count_preds.min()),
            'total_area_forecast': float(area_preds.sum()),  # REVISI: Bukan 12m lagi
            'high_risk_months': int(high_risk_count),
        }
    
    return summary