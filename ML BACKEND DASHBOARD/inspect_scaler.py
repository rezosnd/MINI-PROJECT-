import joblib
import os
scaler_path = os.path.join(os.getcwd(), 'models', 'weather_scaler.pkl')
print('scaler_path', scaler_path)
scaler = joblib.load(scaler_path)
print('feature_names_in_', getattr(scaler, 'feature_names_in_', None))
print('n_features_in_', getattr(scaler, 'n_features_in_', None))
