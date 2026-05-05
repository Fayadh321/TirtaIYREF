"""
Feature Engineering for Grid-Based Risk Forecasting
====================================================
Creates features from historical flood risk data for each grid cell
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
import logging
from typing import Tuple, Dict, List

logger = logging.getLogger(__name__)


class FeatureEngineer:
    """Create features for point-based risk forecasting"""
    
    def __init__(self, config: Dict):
        """
        Args:
            config: Feature configuration dict
        """
        self.config = config
        self.feature_scaler = StandardScaler()
        self.feature_columns = []

    def _group_keys(self, df: pd.DataFrame):
        """Prefer grid_id grouping; fallback to coordinates for compatibility."""
        if 'grid_id' in df.columns:
            return ['grid_id']
        return ['lat', 'lon']
    
    def add_lagged_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add lagged risk score features"""
        logger.info("Creating lagged features...")
        
        lags = self.config.get('lagged_features', [1, 2, 3, 6])

        group_keys = self._group_keys(df)
        grouped = df.groupby(group_keys)['risk_score']

        for lag in lags:
            col_name = f'risk_score_lag{lag}'
            df[col_name] = grouped.shift(lag)
            if col_name not in self.feature_columns:
                self.feature_columns.append(col_name)
        
        return df
    
    def add_cyclical_time_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add cyclical encoding of month for seasonality"""
        logger.info("Adding cyclical time features...")
        
        if not self.config.get('add_cyclical_time', False):
            return df
        
        df['month'] = df['date'].dt.month
        
        # Encode month as sin/cos for cyclical nature (Dec=12 is close to Jan=1)
        df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
        df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
        
        self.feature_columns.extend(['month_sin', 'month_cos'])
        
        return df
    
    def add_trend_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add linear trend feature"""
        logger.info("Adding trend features...")
        
        if not self.config.get('add_trend', False):
            return df

        group_keys = self._group_keys(df)
        group_counts = df.groupby(group_keys)['risk_score'].transform('count').clip(lower=1)
        group_pos = df.groupby(group_keys).cumcount()
        df['trend'] = group_pos / group_counts

        if 'trend' not in self.feature_columns:
            self.feature_columns.append('trend')
        return df
    
    def add_rolling_statistics(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add rolling mean and std"""
        logger.info("Adding rolling statistics...")
        
        if not self.config.get('add_rolling_stats', False):
            return df
        
        windows = self.config.get('rolling_window', [3, 6])

        group_keys = self._group_keys(df)
        grouped = df.groupby(group_keys)['risk_score']

        for window in windows:
            mean_col = f'risk_score_rolling_mean_{window}'
            std_col = f'risk_score_rolling_std_{window}'

            df[mean_col] = grouped.transform(
                lambda s: s.rolling(window=window, min_periods=1).mean()
            )
            df[std_col] = grouped.transform(
                lambda s: s.rolling(window=window, min_periods=1).std().fillna(0)
            )

            if mean_col not in self.feature_columns:
                self.feature_columns.append(mean_col)
            if std_col not in self.feature_columns:
                self.feature_columns.append(std_col)
        
        return df
    
    def create_features(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
        """Create all features from time series data"""
        logger.info("Creating features...")
        
        df = df.copy()
        df['date'] = pd.to_datetime(df['date'])
        group_keys = self._group_keys(df)
        df = df.sort_values(group_keys + ['date']).reset_index(drop=True)
        self.feature_columns = []
        
        # Create features in order
        df = self.add_lagged_features(df)
        df = self.add_cyclical_time_features(df)
        df = self.add_trend_features(df)
        df = self.add_rolling_statistics(df)
        
        # Remove rows with NaN (from lag operations)
        df = df.dropna()
        
        logger.info(f"Created {len(self.feature_columns)} features")
        
        return df, self.feature_columns
    
    def scale_features(self, X_train: pd.DataFrame, X_test: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """Scale features using training data statistics"""
        logger.info("Scaling features...")
        
        X_train_scaled = X_train.copy()
        X_test_scaled = X_test.copy()
        
        # Fit scaler on training data
        X_train_scaled[self.feature_columns] = self.feature_scaler.fit_transform(
            X_train[self.feature_columns]
        )
        
        # Apply same scaling to test data
        X_test_scaled[self.feature_columns] = self.feature_scaler.transform(
            X_test[self.feature_columns]
        )
        
        return X_train_scaled, X_test_scaled


def prepare_for_modeling(df: pd.DataFrame, config: Dict) -> Tuple[pd.DataFrame, pd.DataFrame, List[str]]:
    """
    Full pipeline to prepare data for modeling
    
    Returns:
        (X_train, X_test, feature_columns)
    """
    # Create features
    fe = FeatureEngineer(config['FEATURE_CONFIG'])
    df, feature_cols = fe.create_features(df)
    
    # Separate features and target
    X = df[feature_cols].copy()
    y = df['risk_score'].copy()
    
    # Handle missing values
    X = X.fillna(X.mean())
    
    # Scale features
    X_train_scaled, X_test_scaled = fe.scale_features(X, X)  # Will be split later
    
    return X_train_scaled, X_test_scaled, feature_cols