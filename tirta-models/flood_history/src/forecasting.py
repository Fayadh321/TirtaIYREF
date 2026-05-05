"""
Grid-Based Flood Risk Forecasting
==================================
Predict flood vulnerability on 1km x 1km grid across Indonesia
Output: Risk score (0-100) + Risk category per grid cell
"""

import numpy as np
import pandas as pd
import logging
from typing import Dict, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class RiskCategorizer:
    """Categorize risk score into 4 levels"""
    
    def __init__(self, risk_config: Dict):
        self.risk_config = risk_config
        self.categories_map = {}
        
        # Build mapping from score range to category
        for cat_name, cat_info in risk_config['categories'].items():
            for score in range(int(cat_info['range'][0]), int(cat_info['range'][1]) + 1):
                self.categories_map[score] = {
                    'name': cat_name,
                    'label': cat_info['label'],
                    'color': cat_info['color'],
                    'score_range': cat_info['range']
                }
    
    def categorize(self, risk_score: float) -> Dict:
        """
        Categorize risk score into one of 4 levels
        
        Args:
            risk_score: Score between 0-100
            
        Returns:
            Dict with category info
        """
        risk_score = max(0, min(100, risk_score))  # Ensure in range
        score_int = int(risk_score)
        
        if score_int in self.categories_map:
            return self.categories_map[score_int]
        
        # Default fallback
        if risk_score < 25:
            return {
                'name': 'Rendah',
                'label': 'Tidak Rawan',
                'color': '#2ca02c',
                'score_range': [0, 25]
            }
        elif risk_score < 50:
            return {
                'name': 'Sedang',
                'label': 'Cukup Rawan',
                'color': '#ffd700',
                'score_range': [25, 50]
            }
        elif risk_score < 75:
            return {
                'name': 'Tinggi',
                'label': 'Rawan',
                'color': '#ff7f0e',
                'score_range': [50, 75]
            }
        else:
            return {
                'name': 'Sangat Tinggi',
                'label': 'Sangat Rawan',
                'color': '#d62728',
                'score_range': [75, 100]
            }


class GridRiskForecaster:
    """Forecast flood risk on 1km x 1km grid"""
    
    def __init__(self, model_comparator, feature_engineer, config: Dict):
        """
        Args:
            model_comparator: Trained ModelComparator instance
            feature_engineer: FeatureEngineer instance
            config: Full configuration dict
        """
        self.model_comparator = model_comparator
        self.feature_engineer = feature_engineer
        self.config = config
        self.risk_categorizer = RiskCategorizer(config['RISK_CONFIG'])
    
    def get_grid_history(self, df: pd.DataFrame, grid_id: int, 
                        lookback: int = 12) -> Optional[pd.DataFrame]:
        """
        Get historical data for a specific grid cell
        
        Args:
            df: Full time series dataframe
            grid_id: Grid cell ID
            lookback: Months of history to retrieve
            
        Returns:
            DataFrame with recent history, or None if insufficient data
        """
        grid_data = df[df['grid_id'] == grid_id].copy()
        
        if len(grid_data) == 0:
            logger.warning(f"No data found for grid cell {grid_id}")
            return None
        
        grid_data = grid_data.sort_values('date')
        
        if len(grid_data) < lookback:
            logger.warning(f"Insufficient data in grid {grid_id}: {len(grid_data)} < {lookback}")
            return None
        
        # Get last lookback months
        return grid_data.tail(lookback)
    
    def forecast_3months_grid(self, df: pd.DataFrame, grid_id: int,
                             use_model: str = 'xgboost') -> Dict:
        """
        Forecast risk for next 3 months in specific grid cell
        
        Args:
            df: Full time series dataframe
            grid_id: Grid cell ID
            use_model: Which model to use
            
        Returns:
            Dict with forecast results
        """
        logger.debug(f"Forecasting grid {grid_id} using {use_model}...")
        
        # Get grid history
        grid_history = self.get_grid_history(df, grid_id)
        
        if grid_history is None:
            return {
                'error': f'Insufficient data in grid {grid_id}',
                'grid_id': grid_id
            }
        
        # Get coordinates from grid
        lat = grid_history['lat'].iloc[0]
        lon = grid_history['lon'].iloc[0]
        
        # Create features
        try:
            grid_history_feat, feature_cols = self.feature_engineer.create_features(grid_history)
        except Exception as e:
            logger.error(f"Feature creation failed for grid {grid_id}: {e}")
            return {'error': str(e), 'grid_id': grid_id}
        
        # Get predictions
        try:
            model = self.model_comparator.models.get(use_model)
            if not model:
                return {
                    'error': f'Model {use_model} not available',
                    'grid_id': grid_id
                }

            if use_model in ['sarima', 'prophet']:
                predictions = model.predict(grid_history_feat[feature_cols])
                risk_scores = predictions[-3:] if len(predictions) >= 3 else predictions
            else:
                # Recursive multi-step forecast for tabular models (e.g. XGBoost).
                # This avoids returning the exact same value for month 1/2/3.
                rolling_history = grid_history[['grid_id', 'date', 'risk_score', 'lat', 'lon']].copy()
                rolling_history = rolling_history.sort_values('date').reset_index(drop=True)

                risk_scores = []
                for _ in range(3):
                    next_date = rolling_history['date'].max() + pd.offsets.MonthBegin(1)
                    next_row = rolling_history.iloc[-1].copy()
                    next_row['date'] = next_date
                    # Placeholder; replaced by prediction below.
                    next_row['risk_score'] = rolling_history['risk_score'].iloc[-1]

                    rolling_history = pd.concat(
                        [rolling_history, pd.DataFrame([next_row])],
                        ignore_index=True
                    )

                    step_feat, step_cols = self.feature_engineer.create_features(rolling_history)
                    X_step = step_feat[step_cols].iloc[-1:].values
                    step_pred = float(model.predict(X_step)[0])
                    step_pred = float(np.clip(step_pred, 0, 100))

                    rolling_history.loc[rolling_history.index[-1], 'risk_score'] = step_pred
                    risk_scores.append(step_pred)
        
        except Exception as e:
            logger.error(f"Prediction failed for grid {grid_id}: {e}")
            return {'error': str(e), 'grid_id': grid_id}
        
        # Format output
        forecast_date = datetime.now()
        predictions = []
        
        for month_idx, risk_score in enumerate(risk_scores, 1):
            risk_score = float(risk_score)
            category_info = self.risk_categorizer.categorize(risk_score)
            
            pred_date = forecast_date + timedelta(days=30*month_idx)
            
            predictions.append({
                'month': month_idx,
                'forecast_date': pred_date.isoformat(),
                'risk_score': round(risk_score, 2),
                'category': category_info['name'],
                'label': category_info['label'],
                'color': category_info['color']
            })
        
        result = {
            'grid_id': grid_id,
            'lat': round(lat, 6),
            'lon': round(lon, 6),
            'forecast_date': forecast_date.isoformat(),
            'forecast_horizon': 3,
            'predictions': predictions,
            'model_used': use_model,
            'average_risk': round(np.mean(risk_scores), 2),
            'highest_risk_month': int(np.argmax(risk_scores)) + 1,
            'highest_risk_score': round(float(np.max(risk_scores)), 2),
        }
        
        return result
    
    def forecast_all_grids(self, df: pd.DataFrame, use_model: str = 'xgboost',
                          skip_errors: bool = True,
                          min_total_flood_count: int = 1) -> pd.DataFrame:
        """
        Forecast for all grid cells with sufficient data
        
        Args:
            df: Full time series dataframe
            use_model: Model to use
            skip_errors: Continue if some grids fail
            
        Returns:
            DataFrame with forecasts for all grids
        """
        logger.info(f"Forecasting all grid cells with {use_model}...")
        
        if 'flood_count' in df.columns and min_total_flood_count > 0:
            total_per_grid = df.groupby('grid_id')['flood_count'].sum()
            grid_ids = total_per_grid[total_per_grid >= min_total_flood_count].index.values
            logger.info(
                f"Filtered to active grids: {len(grid_ids)} "
                f"(min_total_flood_count={min_total_flood_count})"
            )
        else:
            grid_ids = df['grid_id'].unique()
        logger.info(f"Processing {len(grid_ids)} grid cells...")
        
        all_forecasts = []
        success_count = 0
        error_count = 0
        
        for grid_id in grid_ids:
            try:
                forecast = self.forecast_3months_grid(df, grid_id, use_model)
                
                if 'error' not in forecast:
                    all_forecasts.append(forecast)
                    success_count += 1
                else:
                    error_count += 1
                    if not skip_errors:
                        logger.error(f"Grid {grid_id}: {forecast['error']}")
            
            except Exception as e:
                error_count += 1
                if not skip_errors:
                    logger.error(f"Grid {grid_id}: {e}")
        
        logger.info(f"Completed: {success_count} successful, {error_count} errors")
        
        # Create output dataframe
        output_data = []
        for forecast in all_forecasts:
            # Use first month as representative forecast
            first_pred = forecast['predictions'][0]
            
            output_data.append({
                'grid_id': forecast['grid_id'],
                'lat': forecast['lat'],
                'lon': forecast['lon'],
                'risk_score_month1': first_pred['risk_score'],
                'risk_score_month2': forecast['predictions'][1]['risk_score'],
                'risk_score_month3': forecast['predictions'][2]['risk_score'],
                'average_risk': forecast['average_risk'],
                'highest_risk_month': forecast['highest_risk_month'],
                'highest_risk_score': forecast['highest_risk_score'],
                'category_month1': first_pred['label'],
            })
        
        result_df = pd.DataFrame(output_data)
        logger.info(f"Generated forecasts for {len(result_df)} grid cells")
        
        return result_df
    
    def compare_models_grid(self, df: pd.DataFrame, grid_id: int) -> Dict:
        """
        Compare all models for a specific grid cell
        
        Returns:
            Dict with predictions from each model
        """
        logger.info(f"Comparing models for grid {grid_id}...")
        
        results = {
            'grid_id': grid_id,
            'forecast_date': datetime.now().isoformat(),
            'models': {}
        }
        
        for model_name in self.model_comparator.models.keys():
            result = self.forecast_3months_grid(df, grid_id, use_model=model_name)
            if 'error' not in result:
                results['models'][model_name] = result
        
        # Summary statistics
        if results['models']:
            avg_risks = [m['average_risk'] for m in results['models'].values()]
            results['summary'] = {
                'avg_risk_across_models': round(np.mean(avg_risks), 2),
                'min_risk': round(np.min(avg_risks), 2),
                'max_risk': round(np.max(avg_risks), 2),
            }
        
        return results


def get_risk_category_summary() -> Dict:
    """Return summary of risk categories"""
    return {
        'Rendah': {
            'label': 'Tidak Rawan',
            'label_id': 'Rendah',
            'range': '0-25',
            'color': '#2ca02c',
            'description': 'Risiko banjir sangat rendah'
        },
        'Sedang': {
            'label': 'Cukup Rawan',
            'label_id': 'Sedang',
            'range': '25-50',
            'color': '#ffd700',
            'description': 'Risiko banjir sedang'
        },
        'Tinggi': {
            'label': 'Rawan',
            'label_id': 'Tinggi',
            'range': '50-75',
            'color': '#ff7f0e',
            'description': 'Risiko banjir tinggi'
        },
        'Sangat Tinggi': {
            'label': 'Sangat Rawan',
            'label_id': 'Sangat Tinggi',
            'range': '75-100',
            'color': '#d62728',
            'description': 'Risiko banjir sangat tinggi'
        }
    }