"""
Probabilistic Forecasting & Risk Assessment
=========================================
Generate confidence intervals and relative risk levels.

INNOVATIONS FOR COMPETITION:
1. Poisson/Tweedie Analytical Bounds: Instead of computationally heavy bootstrapping,
   we derive prediction intervals mathematically. In count processes, Variance is 
   proportional to the Mean.
2. Relative Risk Thresholds: Risk (LOW, MEDIUM, HIGH) is calibrated against the 
   specific zone's historical percentiles, ensuring fair EWS sensitivity across 
   different geographical topographies.
"""

import numpy as np
import pandas as pd
import logging
from typing import Dict
from scipy import stats

logger = logging.getLogger(__name__)


class ProbabilisticForecaster:
    """Generate probabilistic forecasts and localized risk assessments"""
    
    def __init__(self, historical_data: pd.DataFrame, config: Dict):
        """
        Initialize forecaster
        
        Args:
            historical_data: Full historical dataframe (to compute relative percentiles)
            config: UNCERTAINTY_CONFIG from config.py
        """
        self.history = historical_data
        self.config = config
        self.risk_thresholds = config['risk_thresholds_percentile']
        
        # Pre-calculate historical percentiles per zone
        self.zone_percentiles = self._calculate_historical_percentiles()
        
    def _calculate_historical_percentiles(self) -> Dict:
        """Calculate Q2, Q3, and P90 for each zone based on its own history"""
        logger.info("Calibrating relative risk thresholds for each zone...")
        percentiles = {}
        
        for zone_id in self.history['zone'].unique():
            zone_data = self.history[self.history['zone'] == zone_id]['flood_count']
            # Only consider non-zero months for risk calibration (what is considered a "bad" flood?)
            flood_events = zone_data[zone_data > 0]
            
            if len(flood_events) < 5:
                # Fallback if extremely dry zone
                p_low, p_med, p_high = 10, 50, 100
            else:
                p_low = np.percentile(flood_events, self.risk_thresholds['low'])
                p_med = np.percentile(flood_events, self.risk_thresholds['medium'])
                p_high = np.percentile(flood_events, self.risk_thresholds['high'])
                
            percentiles[zone_id] = {'low': p_low, 'medium': p_med, 'high': p_high}
            
        return percentiles

    def compute_analytical_intervals(self, predictions: np.ndarray, confidence_level: float = 0.90) -> Dict:
        """
        Compute Confidence Intervals using Poisson variance assumption.
        For Poisson, Variance ≈ Mean. Standard Error ≈ sqrt(Mean).
        """
        z_score = stats.norm.ppf(1 - (1 - confidence_level) / 2)
        
        # Calculate bounds
        margin_of_error = z_score * np.sqrt(np.maximum(predictions, 0.1)) # Prevent sqrt(0)
        
        lower_bound = np.maximum(0, np.floor(predictions - margin_of_error))
        upper_bound = np.ceil(predictions + margin_of_error)
        
        return {
            'point_estimate': predictions,
            'lower_bound': lower_bound,
            'upper_bound': upper_bound
        }
    
    def add_uncertainty(self, forecast: Dict) -> Dict:
        """Add analytical confidence intervals to forecast"""
        zone_id = forecast['zone_id']
        logger.info(f"Adding analytical uncertainty bounds for Zone {zone_id}...")
        
        # 90% Confidence Intervals
        ci_count = self.compute_analytical_intervals(forecast['flood_count'], 0.90)
        ci_area = self.compute_analytical_intervals(forecast['total_area'], 0.90)
        
        forecast['uncertainty'] = {
            'flood_count': ci_count,
            'total_area': ci_area
        }
        
        return forecast
    
    def assign_risk_levels(self, forecast: Dict) -> Dict:
        """Assign risk levels based on ZONE-SPECIFIC historical percentiles"""
        zone_id = forecast['zone_id']
        thresholds = self.zone_percentiles.get(zone_id, {'low': 10, 'medium': 50, 'high': 100})
        
        risk_levels_count = []
        
        for count in forecast['flood_count']:
            if count == 0:
                risk = 'SAFE'
            elif count >= thresholds['high']:
                risk = 'HIGH (BAHAYA)'
            elif count >= thresholds['medium']:
                risk = 'MEDIUM (WASPADA)'
            else:
                risk = 'LOW (AMAN)'
                
            risk_levels_count.append(risk)
            
        forecast['risk_levels'] = {
            'flood_count_risk': risk_levels_count
        }
        
        return forecast
    
    @staticmethod
    def create_probabilistic_dataframe(forecast: Dict) -> pd.DataFrame:
        """Convert forecast with uncertainty to DataFrame"""
        records = []
        
        for i, date in enumerate(forecast['dates']):
            unc_count = forecast['uncertainty']['flood_count']
            unc_area = forecast['uncertainty']['total_area']
            
            record = {
                'zone_id': forecast['zone_id'],
                'date': date,
                'forecast_month': pd.to_datetime(date).strftime('%Y-%m'),
                
                # Flood Count
                'flood_count_pred': forecast['flood_count'][i],
                'flood_count_lower_90ci': unc_count['lower_bound'][i],
                'flood_count_upper_90ci': unc_count['upper_bound'][i],
                
                # Total Area
                'total_area_pred': forecast['total_area'][i],
                'total_area_lower_90ci': unc_area['lower_bound'][i],
                'total_area_upper_90ci': unc_area['upper_bound'][i],
                
                # Risk Level
                'risk_level': forecast['risk_levels']['flood_count_risk'][i] 
                    if 'risk_levels' in forecast else 'UNKNOWN',
            }
            records.append(record)
            
        return pd.DataFrame(records)